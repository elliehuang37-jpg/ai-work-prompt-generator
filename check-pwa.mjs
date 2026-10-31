import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const dist = new URL('./dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', dist), 'utf8'));
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
for (const icon of [...manifest.icons, {src:'icons/apple-touch-icon.png',sizes:'180x180'}]) {
  const png = await readFile(new URL(icon.src, dist));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const [width,height] = icon.sizes.split('x').map(Number);
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
}
const source = await readFile(new URL('sw.js', dist), 'utf8');
const html = await readFile(new URL('index.html', dist), 'utf8');

async function exercise(path, failDownload = false) {
  const base = new URL(`https://example.test${path}`);
  const listeners = new Map();
  const storage = new Map([['another-app-v1',new Map()]]);
  const prefix = 'work-prompt-studio-' + encodeURIComponent(path) + '-';
  storage.set(prefix+'old',new Map());
  let claimed = false, skipped = false, networkCalls = 0;
  const caches = {
    keys:async()=>[...storage.keys()],
    delete:async key=>storage.delete(key),
    open:async key=>{
      if (!storage.has(key)) storage.set(key,new Map());
      const entries=storage.get(key);
      return {
        addAll:async requests=>{
          const resolved=await Promise.all(requests.map(async request=>{
            const url=new URL(request.url);
            if (failDownload && url.pathname.endsWith('catalog.json')) throw Error('download interrupted');
            const file=url.pathname.slice(base.pathname.length)||'index.html';
            return [url.href,new Response(await readFile(new URL(file,dist)))];
          }));
          for (const [url,response] of resolved) entries.set(url,response);
        },
        match:async(request,options={})=>{
          const url=new URL(typeof request==='string'?request:request.url);
          for (const [key,response] of entries) {
            const cached=new URL(key);
            if (options.ignoreSearch ? cached.origin+cached.pathname===url.origin+url.pathname : key===url.href) return response.clone();
          }
        }
      };
    }
  };
  vm.runInNewContext(source,{
    self:{location:{href:new URL('sw.js',base).href},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{skipped=true;},addEventListener:(type,fn)=>listeners.set(type,fn)},
    caches,URL,Request,
    fetch:async()=>{networkCalls++;throw Error('OFFLINE');}
  });
  const dispatch=async type=>{
    let completion;
    listeners.get(type)({waitUntil:promise=>{completion=promise;}});
    await completion;
  };
  if (failDownload) {
    await assert.rejects(dispatch('install'),/interrupted/);
    assert(!storage.has(prefix+'pwa-1'),'failed installation must discard incomplete cache');
    assert(storage.has(prefix+'old'),'failed installation preserves existing cache');
    return;
  }
  await dispatch('install');
  assert.equal(skipped,false,'new worker must wait for user-controlled update');
  const entries=storage.get(prefix+'pwa-1');
  // Every HTML resource, module import and fetched catalog must exist offline.
  const resources=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]).filter(url=>url!=='./');
  for (const file of ['app.js','engine.js','quality.js']) {
    const js=await readFile(new URL(file,dist),'utf8');
    resources.push(...[...js.matchAll(/(?:from\s+|fetch\()'([^']+)'/g)].map(match=>match[1]));
  }
  for (const resource of resources) {
    assert(entries.has(new URL(resource,base).href),`missing shell asset ${resource}`);
  }
  await dispatch('activate');
  assert(claimed);
  assert(storage.has('another-app-v1'));
  assert(!storage.has(prefix+'old'));
  async function offline(url, mode) {
    let response;
    listeners.get('fetch')({request:{url:new URL(url,base).href,method:'GET',mode},respondWith:promise=>{response=promise;}});
    return await response;
  }
  const page=await offline('./?source=homescreen','navigate');
  assert((await page.text()).includes('id="pwa-title"'));
  for (const [url] of entries) assert.equal((await offline(url)).status,200);
  const catalog=await (await offline('catalog.json?v=2.1')).json();
  assert.equal(catalog.tasks.length,200);
  assert.equal(networkCalls,0,'cached app must work with network unavailable');
  let intercepted=false;
  listeners.get('fetch')({request:{url:'https://external.test/private',method:'GET'},respondWith:()=>{intercepted=true;}});
  listeners.get('fetch')({request:{url:new URL('submit',base).href,method:'POST'},respondWith:()=>{intercepted=true;}});
  assert.equal(intercepted,false);
  listeners.get('message')({data:{type:'SKIP_WAITING'}});
  assert(skipped);
  console.log(`PASS ${path}: ${entries.size} cached resources, 200 offline tasks, isolated cache cleanup, manual update.`);
}
await exercise('/ai-work-prompt-generator/');
await exercise('/');
await exercise('/ai-work-prompt-generator/',true);
console.log('PASS manifest, PNG dimensions, failed-download rollback, external/POST exclusions.');
