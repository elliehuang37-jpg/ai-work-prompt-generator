import {generatePrompt} from './engine.js';
const $=id=>document.getElementById(id);
let data,selected,department='all',expanded=false,hasResult=false;
$('custom').disabled=true;
$('example').disabled=true;
$('fill-example').disabled=true;
const custom={id:'custom',departmentId:'custom',title:'自訂工作任務',scenario:'描述你的工作，由共通任務架構整理需求',role:'企業工作分析與專業溝通顧問',outputType:'plan',questions:[{id:'q1',label:'希望交付什麼形式的成果？',hint:'例如：企劃表、溝通稿、檢查表。'},{id:'q2',label:'怎樣算是完成得好？',hint:'例如：主管能據此做決定、同仁能直接執行。'}],deliverableSpec:['符合目的的具體工作成果','清楚的交付格式與必要依據','可執行的下一步'],qualityChecks:['確認成果回應使用者實際目的','避免泛用建議，具體說明如何使用成果'],templateVersion:'1.0'};
function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function markStale(){if(hasResult){$('stale').hidden=false;$('copy').disabled=true;$('copy-status').textContent='請按「產生我的提示詞」更新後再複製。';}}
function renderDepartments(){ $('departments').replaceChildren();for(const d of [{id:'all',name:'全部'},...data.departments]){const b=make('button','dept'+(department===d.id?' active':''),d.name);b.type='button';b.setAttribute('aria-pressed',String(department===d.id));b.onclick=()=>{department=d.id;expanded=false;renderDepartments();renderTasks();};$('departments').append(b);}}
function renderTasks(){
 const q=$('search').value.trim().toLowerCase();
 let matches=data.tasks.filter(t=>(department==='all'||t.departmentId===department)&&(!q||(t.keywords+' '+data.departments.find(d=>d.id===t.departmentId).name).toLowerCase().includes(q)));
 if(department==='all'&&!q){const featured=['E01','M08','T04','S05','P04','O05'];matches=[...featured.map(id=>data.tasks.find(t=>t.id===id)),...matches.filter(t=>!featured.includes(t.id))];}
 const limit=expanded?matches.length:6;
 $('count').textContent=`${q?'找到':'共'} ${matches.length} 項任務${selected?.id==='custom'?' · 已選自訂任務':''}`;
 $('task-grid').replaceChildren();
 for(const t of matches.slice(0,limit)){
  const entry=make('article','task-entry');
  const b=make('button','task-card'+(selected?.id===t.id?' active':''));
  b.type='button';b.setAttribute('aria-pressed',String(selected?.id===t.id));
  const top=make('div','task-top');
  top.append(make('span','',data.departments.find(d=>d.id===t.departmentId).name+' / '+t.id),make('i','',selected?.id===t.id?'✓':'↗'));
  b.append(top,make('strong','',t.title),make('p','',t.scenario));
  b.onclick=()=>selectTask(t,true);
  const exampleButton=make('button','task-example','帶入範例 ↗');
  exampleButton.type='button';exampleButton.setAttribute('aria-label',`帶入「${t.title}」範例`);
  exampleButton.onclick=()=>fillExample(t);
  entry.append(b,exampleButton);$('task-grid').append(entry);
 }
 if(!matches.length)$('task-grid').append(make('p','no-results','找不到相符任務。換個關鍵字，或選「自訂任務」描述你的工作。'));
 $('expand').hidden=matches.length<=6;
 $('expand').textContent=expanded?'收起任務 ↑':`查看全部 ${matches.length} 項任務 ↓`;
 $('expand').setAttribute('aria-expanded',String(expanded));
}
function selectTask(task,scroll=false){selected=task;$('selected-task').replaceChildren(make('small','','目前選擇的工作'),make('strong','',task.title));$('example-status').textContent='';$('questions').replaceChildren();for(const q of task.questions){const label=make('label','',q.label);label.htmlFor=q.id;const input=make('textarea');input.id=q.id;input.rows=2;input.maxLength=5000;input.placeholder=q.hint;input.addEventListener('input',markStale);$('questions').append(label,input);}$('mode-hint').textContent=task.outputType==='image'?'純圖片工具不一定能追問；重要的主體、文字與比例，建議先補完整。':'這段要求會一起放進提示詞，讓接收的 AI 知道下一步。';renderTasks();markStale();if(scroll){$('brief-title').scrollIntoView({block:'start',behavior:'smooth'});$('goal').focus({preventScroll:true});}}
function fillExample(task){
 const sample=task.example||{
  goal:'讓跨部門同仁依檢查表完成工作坊籌備',
  description:'【虛構操作範例】請整理一份 30 人企業工作坊籌備檢查表，涵蓋講師、教材、設備、報名通知與當日報到。',
  audience:'課務與行銷合作窗口',answers:{q1:'用表格呈現工作項目、建議負責角色、期限、完成標準與備案。',q2:'同仁能看懂下一步，且每件事都有交付與檢查方式。'},
  source:'虛構示範：活動距今四週，課務與行銷各一位同仁支援，確切日期與預算待確認。',
  constraints:'繁體中文、精簡且能直接執行；未知事項標示待確認。',mode:'draft'
 };
 selectTask(task);
 for(const id of ['goal','description','audience','source','constraints','mode']){
  $(id).value=sample[id];$(id).setCustomValidity('');
 }
 for(const q of task.questions)$(q.id).value=sample.answers[q.id]||'';
 $('extras').open=true;
 $('example-status').textContent=`已帶入「${task.title}」範例。內容為虛構示範，可直接修改，再按「產生我的提示詞」。`;
 markStale();$('brief-title').scrollIntoView({block:'start',behavior:'smooth'});$('goal').focus({preventScroll:true});
}
function request(){return {goal:$('goal').value,description:$('description').value,audience:$('audience').value,source:$('source').value,constraints:$('constraints').value,mode:$('mode').value,answers:Object.fromEntries(selected.questions.map(q=>[q.id,$(q.id).value]))};}
function fitOutput(){const e=$('output');e.style.height='auto';e.style.height=(e.scrollHeight+4)+'px';}
$('prompt-form').addEventListener('submit',e=>{e.preventDefault();for(const id of ['goal','description']){const el=$(id);el.setCustomValidity(el.value.trim()?'':'請填寫這個欄位，讓提示詞有明確的工作方向。');if(!el.reportValidity())return;}const result=generatePrompt(selected,request());$('empty').hidden=true;$('result-content').hidden=false;$('output').value=result.text;$('result-meta').textContent=`${selected.title} · ${result.text.length.toLocaleString()} 字`;$('missing').replaceChildren();for(const item of result.missing.length?result.missing:['欄位已填妥；貼到 AI 工具後，仍可依回覆補上必要細節。'])$('missing').append(make('li','',item));hasResult=true;$('stale').hidden=true;$('copy').disabled=false;$('copy-status').textContent='已產生完整提示詞，可複製到 AI 工具。';fitOutput();$('result-title').focus({preventScroll:true});$('result-title').scrollIntoView({behavior:'smooth',block:'start'});});
for(const id of ['goal','description','audience','source','constraints','mode'])$(id).addEventListener('input',()=>{$(id).setCustomValidity?.('');markStale();});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('output').value);$('copy-status').textContent='已複製。貼到 AI 工具後，記得補上來源檔案。';$('copy').textContent='已複製 ✓';setTimeout(()=>$('copy').textContent='複製提示詞',2200);}catch{$('output').focus();$('output').select();$('copy-status').textContent='瀏覽器未允許自動複製，已選取文字。請按 Ctrl+C（Mac：⌘C），手機請長按複製。';}};
$('search').oninput=()=>{expanded=false;renderTasks();};$('expand').onclick=()=>{expanded=!expanded;renderTasks();};$('custom').onclick=()=>selectTask(custom,true);$('edit').onclick=()=>{$('goal').focus();$('brief-title').scrollIntoView({behavior:'smooth'});};
$('reset').onclick=()=>{if(!confirm('確定清除目前需求與提示詞，重新開始？'))return;$('prompt-form').reset();for(const id of ['goal','description'])$(id).setCustomValidity('');hasResult=false;$('empty').hidden=false;$('result-content').hidden=true;$('output').value='';$('search').value='';department='all';expanded=false;renderDepartments();selectTask(data.tasks.find(t=>t.id==='E01'));$('goal').focus();};
$('example').onclick=()=>fillExample(selected);
$('fill-example').onclick=()=>fillExample(selected);
window.addEventListener('resize',()=>{if(hasResult)fitOutput();});
try{const r=await fetch('catalog.json');if(!r.ok)throw Error('catalog unavailable');data=await r.json();renderDepartments();selectTask(data.tasks.find(t=>t.id==='E01'));$('generate').disabled=false;}catch(error){$('load-error').hidden=false;$('count').textContent='暫時無法載入任務庫';$('custom').disabled=true;$('example').disabled=true;console.error(error);}
if(selected){$('custom').disabled=false;$('example').disabled=false;$('fill-example').disabled=false;}
