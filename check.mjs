import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generatePrompt} from './dist/engine.js';
const data=JSON.parse(await readFile(new URL('./dist/catalog.json',import.meta.url),'utf8'));
assert.equal(data.tasks.length,200);assert.equal(data.departments.length,10);assert.equal(new Set(data.tasks.map(x=>x.id)).size,200);
for(const d of data.departments)assert.equal(data.tasks.filter(x=>x.departmentId===d.id).length,20);
for(const t of data.tasks){assert.equal(t.questions.length,2);assert.ok(t.deliverableSpec.length);const r=generatePrompt(t,{goal:'做出能採取行動的成果',description:'保留原文 <script>alert(1)</script>\n與換行',audience:'',answers:{},source:'',constraints:'',mode:'ask'});assert.ok(r.text.includes('<script>alert(1)</script>\n與換行'));assert.ok(r.text.includes('【輸出格式】'));assert.equal(r.missing.length,4);for(const item of t.deliverableSpec)assert.ok(r.text.includes(item));}
const task=data.tasks.find(x=>x.id==='E01');const base={goal:'核准改善方案',description:'15 分鐘簡報',audience:'總經理',answers:{q1:'需要決定預算',q2:'10 頁'},source:'已知事實',constraints:'繁體中文',mode:'ask'};
const ask=generatePrompt(task,base);assert.equal(ask.missing.length,0);assert.ok(ask.text.includes('等待我回答'));assert.ok(ask.text.includes('10 頁'));
const updated=generatePrompt(task,{...base,answers:{...base.answers,q2:'6 頁'},mode:'draft'});assert.ok(updated.text.includes('6 頁'));assert.ok(!updated.text.includes('10 頁'));assert.ok(updated.text.includes('先交付可用初稿'));
const image=generatePrompt(data.tasks.find(x=>x.id==='M08'),base);assert.ok(image.text.includes('構圖'));assert.ok(image.text.includes('QR code'));assert.notEqual(image.text,ask.text);
console.log('PASS: 200 templates, 10 × 20 counts, task outputs, missing fields, input preservation, updated conditions, ask/draft modes, slides/image differences.');
assert.equal(new Set(data.tasks.map(t=>t.example.description)).size,200);
for(const t of data.tasks){
 const sample=t.example;
 for(const key of ['goal','description','audience','source','constraints','mode'])assert.ok(sample[key]?.trim(),`${t.id}: missing ${key}`);
 for(const q of t.questions)assert.ok(sample.answers[q.id]?.trim(),`${t.id}: missing answer ${q.id}`);
 assert.ok(sample.description.includes('虛構操作範例'));
 const result=generatePrompt(t,sample);
 assert.equal(result.missing.length,0,t.id);
 assert.ok(result.text.includes(sample.goal),t.id);
 assert.ok(result.text.includes(sample.answers.q1),t.id);
 assert.ok(result.text.includes(sample.answers.q2),t.id);
}
console.log('PASS: all 200 task-specific examples include complete fields, distinct scenarios, matching question answers and usable generated prompts.');
// 驗證生成內容真的要求原始材料、工作方法及外部驗收，並保留使用者邊界。
for(const t of data.tasks){
 const sample=t.example;
 assert.ok(sample.successCriteria?.trim(),t.id);
 assert.ok(sample.availableTools?.trim(),t.id);
 const result=generatePrompt(t,sample);
 assert.equal(result.qualityVersion,'2.0');
 assert.ok(result.text.includes(sample.successCriteria),t.id);
 assert.ok(result.text.includes(sample.availableTools),t.id);
 assert.ok(result.text.includes('不以專業口吻代替'),t.id);
 assert.ok(result.text.includes('【專業方法與原始材料】'),t.id);
 assert.ok(result.text.includes('【外部驗證與完成標準】'),t.id);
 assert.ok(result.text.includes('尚未驗證'),t.id);
 assert.ok(result.text.includes('不擅自增加專案'),t.id);
 if(sample.assumption)assert.ok(result.text.includes(sample.assumption),t.id);
}
const constrained=generatePrompt(task,{...base,successCriteria:'主管在 15 分鐘內選出一個方案',availableTools:'只有試算表，沒有瀏覽器',assumption:'業績差距可能源自轉換率下降'}).text;
assert.ok(constrained.includes('主管在 15 分鐘內選出一個方案'));
assert.ok(constrained.includes('只有試算表，沒有瀏覽器'));
assert.ok(constrained.includes('可能推翻這個假設的證據'));
assert.ok(constrained.includes('不擅自安裝'));
assert.ok(constrained.includes('可測試替代方案'));
const samples=Object.fromEntries(['E01','M08','S14','T04','S05','P04'].map(id=>{const t=data.tasks.find(x=>x.id===id);return [id,generatePrompt(t,t.example).text];}));
assert.ok(samples.E01.includes('成本與取捨'));
assert.ok(samples.M08.includes('文字逐字正確性'));
assert.ok(samples.S14.includes('可重算的公式'));
assert.ok(samples.T04.includes('工作轉移'));
assert.ok(samples.S05.includes('不預告保證轉換率'));
assert.ok(samples.P04.includes('空資料、失敗與權限'));
// 舊版呼叫及自訂任務仍可使用，不強迫新增欄位。
assert.ok(generatePrompt({...task,id:'custom',departmentId:'custom',outputType:'plan'},base).text.includes('建議的驗收規準'));
console.log('PASS: all 200 upgraded prompts carry outcome, methods, raw evidence, external validation and scope limits.');
const taskPrompt=id=>{const t=data.tasks.find(t=>t.id===id);return generatePrompt(t,t.example).text;};
for(const t of data.tasks.filter(t=>['F','D'].includes(t.departmentId))){
 const prompt=generatePrompt(t,t.example).text;
 assert.ok(prompt.includes(t.questions[0].label)&&prompt.includes(t.questions[1].label),t.id);
 assert.ok(prompt.includes(t.example.answers.q1)&&prompt.includes(t.example.answers.q2),t.id);
 assert.ok(prompt.includes(t.example.successCriteria),t.id);
}
assert.ok(taskPrompt('F01').includes('增量淨營收－增量商品變動成本－活動投入'));
assert.ok(taskPrompt('F01').includes('ROAS'));
assert.ok(taskPrompt('F02').includes('逐頁'));
assert.ok(taskPrompt('F03').includes('資產＝負債＋權益'));
assert.ok(taskPrompt('F04').includes('預算為零'));
assert.ok(taskPrompt('F10').includes('未兌現票據'));
assert.ok(taskPrompt('F11').includes('關帳'));
assert.ok(taskPrompt('F16').includes('XNPV/XIRR'));
assert.ok(taskPrompt('F20').includes('相對工作日'));
assert.ok(taskPrompt('D06').includes('ROAS 不等於 ROI'));
assert.ok(taskPrompt('D08').includes('分母'));
assert.ok(taskPrompt('D13').includes('二次扣退款'));
assert.ok(taskPrompt('D18').includes('樣本不足'));
assert.ok(taskPrompt('D20').includes('不要求假評'));
console.log('PASS: 40 finance/ecommerce scenarios, ROI/ROAS, report linkage, monthly close, NPV timing, denominator and refund controls. These are prompt-content checks, not model-generated calculation tests.');
