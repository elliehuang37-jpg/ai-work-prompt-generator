import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generatePrompt} from './dist/engine.js';
const data=JSON.parse(await readFile(new URL('./dist/catalog.json',import.meta.url),'utf8'));
assert.equal(data.tasks.length,160);assert.equal(new Set(data.tasks.map(x=>x.id)).size,160);
for(const d of data.departments)assert.equal(data.tasks.filter(x=>x.departmentId===d.id).length,20);
for(const t of data.tasks){assert.equal(t.questions.length,2);assert.ok(t.deliverableSpec.length);const r=generatePrompt(t,{goal:'做出能採取行動的成果',description:'保留原文 <script>alert(1)</script>\n與換行',audience:'',answers:{},source:'',constraints:'',mode:'ask'});assert.ok(r.text.includes('<script>alert(1)</script>\n與換行'));assert.ok(r.text.includes('【輸出格式】'));assert.equal(r.missing.length,4);for(const item of t.deliverableSpec)assert.ok(r.text.includes(item));}
const task=data.tasks.find(x=>x.id==='E01');const base={goal:'核准改善方案',description:'15 分鐘簡報',audience:'總經理',answers:{q1:'需要決定預算',q2:'10 頁'},source:'已知事實',constraints:'繁體中文',mode:'ask'};
const ask=generatePrompt(task,base);assert.equal(ask.missing.length,0);assert.ok(ask.text.includes('等待我回答'));assert.ok(ask.text.includes('10 頁'));
const updated=generatePrompt(task,{...base,answers:{...base.answers,q2:'6 頁'},mode:'draft'});assert.ok(updated.text.includes('6 頁'));assert.ok(!updated.text.includes('10 頁'));assert.ok(updated.text.includes('先交付可用初稿'));
const image=generatePrompt(data.tasks.find(x=>x.id==='M08'),base);assert.ok(image.text.includes('構圖'));assert.ok(image.text.includes('QR code'));assert.notEqual(image.text,ask.text);
console.log('PASS: 160 templates, 8 × 20 counts, task outputs, missing fields, input preservation, updated conditions, ask/draft modes, slides/image differences.');
assert.equal(new Set(data.tasks.map(t=>t.example.description)).size,160);
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
console.log('PASS: all 160 task-specific examples include complete fields, distinct scenarios, matching question answers and usable generated prompts.');
