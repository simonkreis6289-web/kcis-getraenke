const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const html=fs.readFileSync('dashboard.html','utf8'),css=fs.readFileSync('css/extra-games.css','utf8');
const functionSource=html.slice(html.indexOf('function renderHausBoard('),html.indexOf('function houseOrigins('));
const fitSource=html.slice(html.indexOf('function fitHausBoard('),html.indexOf('function fitTvBoard('));
const c={state:{},safe:String,dashboardPlayerAttr:n=>' data-dashboard-player="'+n+'"'};vm.createContext(c);vm.runInContext(functionSource,c);
const players=['Peter','Daniel','Marcel','Simon','Alex','Julian','David','Marco','Totti','Nico','Artur','Marius','Alexander','Manuel','Sid','Gast'];
function sample(count,finished){const names=players.slice(0,count);return {finished,playerOrder:names,currentPlayerIndex:1,rows:Object.fromEntries(names.map((n,i)=>[n,[{value:i===0?2:9},{value:9},{value:i===0?12:8}]])),history:[{assigned:[{name:names.at(-1),rank:1}]}]};}
test('Hausnummer has exactly six explicitly placed cells and excludes the generic player-colour pseudo-element',()=>{
 const {parseHTML}=require('linkedom');
 for(const mode of ['hoch','tief'])for(const finished of [false,true]){
  const doc=parseHTML(c.renderHausBoard(sample(7,finished),mode)).document;
  assert.equal(doc.querySelector('.haus-score-columns').children.length,6);
  for(const row of doc.querySelectorAll('.haus-score-row'))assert.deepEqual(Array.from(row.children,x=>x.className.split(' ')[0]),['haus-position','haus-player','haus-digit','haus-digit','haus-digit','haus-total']);
 }
 assert.match(css,/background:linear-gradient\(140deg,#f5f8fc,#eaf0f7\);color:#17334e/);
 assert.match(css,/#game-body \.haus-score-row\[data-dashboard-player\]::before\{content:none;display:none\}/);
 assert.match(css,/\.haus-score-row>\.haus-total\{grid-column:6;grid-row:1\}/);
});
const chromium=process.env.CHROMIUM_PATH||['chromium','chromium-browser','google-chrome'].find(cmd=>spawnSync(cmd,['--version'],{timeout:5000}).status===0);
test('real browser: headings, names, digits and totals align on one row at TV sizes with 7 or 16 players',{skip:!chromium&&'Chromium not installed',timeout:60000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kcis-house-'));
 try{
  const baseStyles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
  const links=[...html.matchAll(/<link[^>]+href="(css\/[^"?]+)[^"]*"[^>]*>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
  const sections=[];
  for(const [w,h,count,mode,finished] of [[1260,820,7,'hoch',true],[850,480,16,'hoch',true],[720,480,7,'tief',true],[480,410,16,'tief',false]]){
   sections.push('<section id="game-body" class="has-haus-board stage-body" style="width:'+w+'px;height:'+h+'px;flex:none">'+c.renderHausBoard(sample(count,finished),mode)+'</section>');
  }
  const fixture='<!doctype html><meta charset="utf-8"><style>'+baseStyles+'\n'+links+'</style>'+sections.join('')+'<script>'+fitSource+`
  const errors=[];for(const board of document.querySelectorAll('.haus-sport-board')){
   fitHausBoard(board);
   const header=[...board.querySelector('.haus-score-columns').children].map(el=>el.getBoundingClientRect());
   for(const row of board.querySelectorAll('.haus-score-row')){
    const r=row.getBoundingClientRect(),cells=[...row.children],rects=cells.map(el=>el.getBoundingClientRect());
    if(getComputedStyle(row,'::before').display!=='none')errors.push('pseudo-element');
    for(let i=0;i<6;i++){
     if(Math.abs(rects[i].left-header[i].left)>1||Math.abs(rects[i].right-header[i].right)>1)errors.push('column '+i+' not aligned');
     if(rects[i].top<r.top-1||rects[i].bottom>r.bottom+1)errors.push('outside row '+i);
    }
    const total=cells[5];if(total.scrollWidth>total.clientWidth+1||total.scrollHeight>total.clientHeight+1)errors.push('clipped total');
   }
  }
  document.body.setAttribute('data-layout-errors',JSON.stringify(errors));
  </script>`;
  const file=path.join(dir,'layout.html');fs.writeFileSync(file,fixture);
  if(process.env.PLAYWRIGHT_MODULE){
   const browser=await require(process.env.PLAYWRIGHT_MODULE).chromium.launch({executablePath:chromium,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process']});
   try{const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.setContent(fixture);const errors=await page.getAttribute('body','data-layout-errors');assert.deepEqual(JSON.parse(errors),[]);}finally{await browser.close();}
   return;
  }
  const run=spawnSync(chromium,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--window-size=1920,1080','--user-data-dir='+path.join(dir,'profile'),'--dump-dom','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:10*1024*1024});
  assert.equal(run.status,0,run.stderr);const {parseHTML}=require('linkedom'),doc=parseHTML(run.stdout).document;
  assert.deepEqual(JSON.parse(doc.body.getAttribute('data-layout-errors')),[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('personal TV leaderboard fills the available height with readable light-background rows and reserves a dark total footer',()=>{
 const styles=fs.readFileSync('css/evening-counters.css','utf8');
 assert.match(styles,/#dashboard-panel-personal #dashboard-personal-throws\{display:block;flex:1 1 auto;min-height:0/);
 assert.match(styles,/#dashboard-panel-personal \.kc-personal-table\{[^}]*height:var\(--personal-table-height,auto\);[^}]*color:#18334c/);
 assert.match(styles,/#dashboard-panel-personal \.kc-personal-table tfoot th,[^{}]+\{background:#233b56;color:#fff/);
});
test('real browser: personal table fills the panel for one, seven and sixteen players',{skip:!chromium&&'Chromium not installed',timeout:60000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kcis-personal-'));
 try{
  const baseStyles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
  const links=[...html.matchAll(/<link[^>]+href="(css\/[^"?]+)[^"]*"[^>]*>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
  const scripts=['js/evening-counters.js','js/evening-counter-view.js','js/player-colors.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
  const fixture='<!doctype html><meta charset="utf-8"><style>'+baseStyles+'\n'+links+'</style><article class="panel" id="dashboard-panel-personal" style="width:320px;height:850px"><h2>Spielerstatistik</h2><div class="contents" id="dashboard-personal-throws"></div><p class="kc-personal-hint">Es werden ausschließlich Würfe mit eindeutiger Spielerzuordnung berücksichtigt. Teamwürfe ohne festen Werfer sind nicht enthalten.</p></article><script>'+scripts+`
   const errors=[],panel=document.getElementById('dashboard-panel-personal'),host=document.getElementById('dashboard-personal-throws');
   const check=(count,height)=>{
    panel.style.height=height+'px';
    const people=Array.from({length:count},(_,i)=>({name:'Spieler '+(i+1),playerColor:'#224466',present:true}));
    const value={schema:1,partial:true,rows:people.map((p,i)=>({name:p.name,nines:1,wreaths:i,pins:9+i*8}))};
    KCPersonalThrowsView.tv(value,people,()=>{const avatar=document.createElement('span');avatar.className='seat-avatar';avatar.textContent='S';return avatar;});
    const rows=[...host.querySelectorAll('tbody tr')];if(rows.length!==count)errors.push('missing rows');
    for(const r of rows){if(count>1&&Math.abs(r.getBoundingClientRect().height-rows[0].getBoundingClientRect().height)>2)errors.push('unequal rows');if(getComputedStyle(r.querySelector('th')).color!=='rgb(24, 51, 76)')errors.push('low contrast');}
    if(host.scrollHeight>host.clientHeight+2)errors.push('table clipped '+count+' '+host.scrollHeight+'>'+host.clientHeight+' row='+rows[0]?.getBoundingClientRect().height+' font='+getComputedStyle(host.querySelector('table')).fontSize);
    const footer=host.querySelector('tfoot');if(footer.getBoundingClientRect().bottom<host.getBoundingClientRect().bottom-55)errors.push('table does not fill available height '+count);if(footer.getBoundingClientRect().height>42)errors.push('oversized total');if(footer.getBoundingClientRect().bottom>host.getBoundingClientRect().bottom)errors.push('missing total '+count+' '+footer.getBoundingClientRect().bottom+'>'+host.getBoundingClientRect().bottom);
    if(getComputedStyle(footer.querySelector('th')).backgroundColor!=='rgb(35, 59, 86)')errors.push('total style');
   };
   check(1,850);check(7,850);check(16,480);document.body.setAttribute('data-layout-errors',JSON.stringify(errors));
   </script>`;
  if(process.env.PLAYWRIGHT_MODULE){
   const browser=await require(process.env.PLAYWRIGHT_MODULE).chromium.launch({executablePath:chromium,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process']});
   try{const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.setContent(fixture);assert.deepEqual(JSON.parse(await page.getAttribute('body','data-layout-errors')),[]);}finally{await browser.close();}
   return;
  }
  const file=path.join(dir,'layout.html');fs.writeFileSync(file,fixture);
  const run=spawnSync(chromium,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--window-size=1920,1080','--user-data-dir='+path.join(dir,'profile'),'--dump-dom','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:10*1024*1024});
  assert.equal(run.status,0,run.stderr);const {parseHTML}=require('linkedom'),doc=parseHTML(run.stdout).document;
  assert.deepEqual(JSON.parse(doc.body.getAttribute('data-layout-errors')),[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
