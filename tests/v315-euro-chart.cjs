const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function fixture(){
 const src=read('tests/v224-games.cjs');
 const f=new Function('require','__dirname',src.slice(0,src.indexOf("test('Parteienspiel"))+';return {c,start,roll,step};')(require,__dirname);
 vm.runInContext(read('js/player-colors.js'),f.c);
 f.view=(s,dashboard=true)=>parseHTML(f.c.renderExtraGameBoard(s,{dashboard,playerColor:name=>name==='A'?'#fde100':'#004d9d'})).document;
 return f;
}
test('Euro board shares a narrower table with colored account columns, clamps debts at zero and keeps the scale fixed',()=>{
 const f=fixture();let s=f.start('dreieuro',{throws:3});
 const first=f.view(s),initial=Number(first.querySelector('[data-euro-player="A"]').dataset.euroPercent);
 s=f.roll(s,5).state;
 const tv=f.view(s),app=f.view(s,false),column=tv.querySelector('[data-euro-player="A"]');
 assert(tv.querySelector('.euro-game-layout>.ind-table-scroll'));assert(tv.querySelector('.euro-game-layout>.euro-chart'));
 assert.equal(tv.querySelectorAll('.euro-chart li').length,2);assert(app.querySelector('.euro-chart'));
 assert.equal(column.style.background,'#fde100');assert(Number(column.dataset.euroPercent)>initial);
 assert.equal(tv.querySelector('.euro-tv-last').style.getPropertyValue('--euro-last-color'),'#fde100');
 assert.match(tv.querySelector('.euro-chart-value').textContent,/3,50/);
 s=f.roll(s,9).state;
 assert.equal(f.view(s).querySelector('.euro-tv-last').style.getPropertyValue('--euro-last-color'),'#004d9d');
 let low=f.start('dreieuro',{startCents:0,throws:2});low=f.roll(low,9).state;
 const zero=f.view(low).querySelector('[data-euro-player="A"]');
 assert.equal(zero.dataset.euroPercent,'0');assert.match(zero.closest('li').textContent,/0,00/);
});
test('Euro columns animate rises, falls and undo, preserve animation progress across repaint, and stop for reduced motion',()=>{
 const f=fixture();let s=f.start('dreieuro',{throws:3});
 const before=f.view(s).querySelector('.euro-chart');s=f.roll(s,5).state;
 const chart=f.view(s).querySelector('.euro-chart');f.c.animateEuroChart(before,chart,1000);
 const changed=chart.querySelector('[data-euro-player="A"]');assert(changed.classList.contains('euro-chart-moving'));
 assert(parseFloat(changed.style.getPropertyValue('--euro-from'))<Number(changed.dataset.euroPercent));
 const repaint=f.view(s).querySelector('.euro-chart');f.c.animateEuroChart(chart,repaint,1250);
 assert.equal(repaint.querySelector('[data-euro-player="A"]').style.getPropertyValue('--euro-delay'),'-250ms');
 const settled=f.view(s).querySelector('.euro-chart');f.c.animateEuroChart(repaint,settled,1900);
 assert.equal(settled.querySelector('.euro-chart-moving'),null);
 const undo=f.step(s,'undo').state,back=f.view(undo).querySelector('.euro-chart');f.c.animateEuroChart(settled,back,2000);
 assert(parseFloat(back.querySelector('[data-euro-player="A"]').style.getPropertyValue('--euro-from'))>Number(back.querySelector('[data-euro-player="A"]').dataset.euroPercent));
 s=f.roll(s,9).state;const lower=f.view(s).querySelector('.euro-chart');f.c.animateEuroChart(settled,lower,3000);
 assert(lower.querySelector('[data-euro-player="B"]').classList.contains('euro-chart-moving'));
 f.c.matchMedia=()=>({matches:true});const reduced=f.view(undo).querySelector('.euro-chart');f.c.animateEuroChart(lower,reduced,4000);assert.equal(reduced.querySelector('.euro-chart-moving'),null);
});
test('Gosse, Kranz and pending throws align like numbers while names and descriptions retain text alignment',()=>{
 const {document}=parseHTML('<html><body><table><tr><th>Kegler</th><th>Wurf 1</th></tr><tr><th>Marco</th><td><strong>G</strong><small>+0,50 €</small></td><td>K(8)</td><td>Gosse</td><td>🎳 Kranz (12)</td><td>—</td><td>Runde Bier</td></tr></table></body></html>');
 const c={document};c.window=c;vm.createContext(c);vm.runInContext(read('js/table-alignment.js'),c);
 const cells=[...document.querySelectorAll('td')];
 for(const cell of cells.slice(0,-1)){assert(cell.classList.contains('kc-numeric-cell'),cell.textContent);assert(!cell.classList.contains('kc-text-cell'));}
 assert(cells.at(-1).classList.contains('kc-text-cell'));
});
test('gutter typography follows real panel width and row height while count badges preserve the tally and leader',()=>{
 const {document}=parseHTML('<html><body><div id="gutters"><div class="listrow"><span class="name">A</span><span class="value">18 ×</span></div><div class="listrow"><span class="name">B</span><span class="value">0 ×</span></div></div></body></html>');
 const box=document.getElementById('gutters');let width=240,height=200;box.getBoundingClientRect=()=>({width,height});
 const events={},c={document,addEventListener:(key,fn)=>events[key]=fn};c.window=c;
 const html=read('dashboard.html'),code=html.slice(html.indexOf('function decorateGutterRows('),html.indexOf('let confirmedState='));
 vm.createContext(c);vm.runInContext("const $=id=>document.getElementById(id);"+code,c);
 c.decorateGutterRows([{name:'A',count:18},{name:'B',count:0}],['A']);
 const narrow=parseFloat(box.style.getPropertyValue('--gutter-font'));width=480;events.resize();
 const wide=parseFloat(box.style.getPropertyValue('--gutter-font'));assert(wide>narrow);
 height=48;events.resize();assert(parseFloat(box.style.getPropertyValue('--gutter-font'))<wide);
 const rows=box.querySelectorAll('.listrow');assert.equal(rows[0].querySelectorAll('.gutter-tally>span').length,15);
 assert.equal(rows[0].querySelector('.gutter-count').textContent,'18 ×');assert.equal(rows[0].querySelector('.gutter-count').getAttribute('aria-label'),'18 Gossen');
 assert(rows[0].classList.contains('gutter-leader'));assert(rows[1].querySelector('.gutter-count').classList.contains('is-empty'));
});
test('the subtle starter marker follows the original starter rather than the moving first row',()=>{
 const f=fixture();vm.runInContext(read('js/game-player-rows.js'),f.c);
 const state={id:'game',players:['B','A'],index:1},before=JSON.stringify(state),rows=f.c.KCPlayerRows;
 const {document}=parseHTML('<html><body><table><tbody'+rows.group('dreieuro',state)+'><tr'+rows.row('A')+'><th>A</th></tr><tr'+rows.row('B')+'><th>B</th></tr></tbody></table></body></html>');
 f.c.document=document;const body=document.querySelector('tbody');rows.markStarter(body);
 assert.equal(body.querySelector('.player-start-marker').closest('tr').dataset.playerRow,'B');
 body.prepend(body.lastElementChild);rows.markStarter(body);
 assert.equal(body.querySelectorAll('.player-start-marker').length,1);assert.equal(body.querySelector('.player-start-marker').getAttribute('aria-label'),'Startspieler');
 assert.equal(body.querySelector('th').textContent,'B');assert.equal(JSON.stringify(state),before);
 assert.equal(rows.starter({players:['A','B'],startIndex:1}),'B');
 assert.equal(rows.starter({partyAlternating:true,teamOrder:['T2','T1'],participantTeams:{T1:['A'],T2:['B']},players:['A','B']}),'B');
 body.dataset.playerStarter='A';rows.markStarter(body);
 assert.equal(body.querySelector('.player-start-marker').closest('tr').dataset.playerRow,'A');
});
