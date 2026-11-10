const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const previous=read('tests/v187-regression.cjs'),fixture=new Function('require','__dirname',previous.slice(0,previous.indexOf("test('every start"))+';return fixture;')(require,__dirname);
const fixed=['tannenbaum','darts','tor','sichern'];
function start(f,key){if(key==='sichern')f.document.getElementById('sichern-mode').value='team';return f.c[{tannenbaum:'startTannenbaumSetup',darts:'startDartsGame',tor:'startTorGame',sichern:'startSichernGame'}[key]]();}
function teams(c,key){const s=c.gameSetupState(key);return plain(['tor','sichern'].includes(key)?s.teams:s.participantTeams);}

test('side-vs-side games always use current group assignments, ignoring stale random drafts and seat changes',()=>{
 for(const key of fixed){const f=fixture(),c=f.c;if(key==='sichern')f.document.getElementById('sichern-mode').value='team';
  c.gameSetupDraft(key).teams=[['C','A'],['Gast','B','D']];f.people.find(p=>p.name==='A').tisch='T2';f.people.find(p=>p.name==='D').tisch='T1';c.seatingOrder.reverse();
  const expected={T1:['D','B'],T2:['Gast','A','C']};assert.deepEqual(plain(c.gameSetupTeamMap(key)),expected,key);c.gameSetupDrawTeams(key);assert.deepEqual(plain(c.gameSetupTeamMap(key)),expected,key+' draw ignored');
  const {document}=parseHTML(c.gameSetupMarkup(key));assert(!document.querySelector('[onclick^="gameSetupDrawTeams("]'),key);assert(document.documentElement.textContent.includes('Einteilung aus „Gruppen“'));
  start(f,key);assert(c.gameSetupState(key).active,key);assert.deepEqual(teams(c,key),expected,key+' actual start');
 }
});

test('unassigned guests and empty groups stay unassigned and block all four starts without replacing game state',()=>{
 for(const key of fixed)for(const kind of ['unassigned','empty']){const f=fixture(),c=f.c;if(key==='sichern')f.document.getElementById('sichern-mode').value='team';
  if(kind==='unassigned')f.people.find(p=>p.name==='Gast').tisch='';else for(const p of f.people)p.tisch='T1';
  const before=plain(c.gameSetupState(key));let warning;c.showToast=text=>warning=text;const groups=plain(c.gameSetupTeamMap(key));
  if(kind==='unassigned'){assert(!Object.values(groups).flat().includes('Gast'));assert(c.gameSetupMarkup(key).includes('Bitte zuerst unter'));}else assert.equal(groups.T2.length,0);
  start(f,key);assert.deepEqual(plain(c.gameSetupState(key)),before,key);assert(warning.includes('Gruppen'),key);
 }
});

test('Sichern restarts from current groups and frozen game teams remain stable during a running round',()=>{
 const f=fixture(),c=f.c;start(f,'sichern');const before=teams(c,'sichern');f.people.find(p=>p.name==='A').tisch='T2';assert.deepEqual(teams(c,'sichern'),before);start(f,'sichern');assert.deepEqual(teams(c,'sichern'),{T1:['B'],T2:['C','A','Gast','D']});
 for(const key of ['tannenbaum','darts']){const f=fixture(),c=f.c;start(f,key);const names=plain(c.gameTeamNames(key,'T1'));f.people.find(p=>p.name==='A').tisch='T2';assert.deepEqual(plain(c.gameTeamNames(key,'T1')),names,key);}
});

test('both pair games still allow manual pairings and a random draw including an unassigned guest',()=>{
 for(const key of ['sechstage','gluecksspirale']){const f=fixture(),c=f.c;f.people.find(p=>p.name==='Gast').tisch='';c.gameSetupToggle(key,true);c.gameSetupMove(key,1,1);assert.deepEqual(plain(c.gameSetupTeams(key)),[['C','Gast'],['A','B'],['D']]);
  assert(c.gameSetupMarkup(key).includes('Teams auslosen'));c.gameSetupDrawTeams(key);const teams=plain(c.gameSetupTeams(key));assert.equal(teams.flat().length,5);assert.equal(new Set(teams.flat()).size,5);assert(teams.every(t=>t.length<=2));assert.equal(teams.filter(t=>t.length===1).length,1);
 }
});

function treeFixture(){const source=read('dashboard.html'),a=source.indexOf('function renderTree('),b=source.indexOf('\nfunction renderLottery(',a),base={1:1,2:2,3:3,4:4,5:5,6:4,7:3,8:2,9:1};
 const env={state:{TANNENBAUM_BASE:base,groupSettings:{T1:{name:'Wand'},T2:{name:'TV'}}},seatingLive:null,safe:x=>String(x),numeric:x=>Number(x)||0,dashboardTeamColor:t=>t==='T1'?'#111':'#d62828',fmt:new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'})};
 const render=new Function('env','with(env){'+source.slice(a,b)+';return renderTree;}')(env);return {base,render};}

test('Tannenbaum dashboard shows the real count instead of long strike lists above 15',()=>{
 const {base,render}=treeFixture(),s={teams:{T1:{remaining:{...base},strikes:Array.from({length:37},()=>({number:5,amount:.5}))},T2:{remaining:{...base},strikes:Array.from({length:21},()=>({number:5,amount:.5}))}}};
 const {document}=parseHTML(render(s)),row=[...document.querySelectorAll('.tree-row')].find(r=>r.querySelector('.tree-number').textContent==='5'),strikes=['T1','T2'].map(k=>row.querySelector('[data-team='+k+'] .tree-strikes'));assert.equal(strikes[0].querySelector('.tree-strikes-count').textContent,'37');assert.equal(strikes[1].querySelector('.tree-strikes-count').textContent,'21');assert.equal(strikes[0].getAttribute('aria-label'),'37 Striche');assert.equal(row.querySelectorAll('.tree-strike').length,0);
 s.teams.T1.strikes.pop();const next=parseHTML(render(s)).document;assert.equal(next.querySelector('[data-team=T1] .tree-strikes-count').textContent,'36');
 const css=read('css/dashboard-tannenbaum.css');assert.match(css,/\.tree-v138 \.tree-strikes\{[^}]*overflow:visible/);assert(read('dashboard.html').includes('css/dashboard-tannenbaum.css?v='));
});

test('remaining numbers start at the center for both teams and winner rendering stays intact',()=>{
 const {base,render}=treeFixture(),s={teams:{T1:{remaining:{...base,5:2}},T2:{remaining:{...base,5:3}}}},doc=parseHTML(render(s)).document,row=[...doc.querySelectorAll('.tree-row')].find(r=>r.querySelector('.tree-number').textContent==='5');
 for(const [selector,count] of [['[data-team=T1] .tree-side',2],['[data-team=T2] .tree-side',3]]){const balls=[...row.querySelectorAll(selector+' .tree-ball')];assert.equal(balls.length,5);balls.forEach((ball,i)=>assert.equal(ball.classList.contains('crossed'),i>=count));}
 const css=read('css/dashboard-tannenbaum.css');assert.match(css,/\.tree-side-left\{flex-direction:row-reverse/);assert.match(css,/\.tree-side-right\{flex-direction:row/);
 s.teams.T1.remaining=Object.fromEntries(Object.keys(base).map(n=>[n,0]));const won=parseHTML(render(s)).document;assert(won.querySelector('.tree-win'));assert.equal(won.querySelectorAll('[data-team=T1] .tree-ball').length,0);
});
