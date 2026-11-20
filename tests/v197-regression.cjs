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

test('Tannenbaum shows one recent-throw row with the app symbols and the newest seven throws per team',()=>{
 const {render}=treeFixture(),history=[
  {team:'T2',number:8,type:'manual-restore'},
  {team:'T2',number:'gosse',type:'penalty-gosse'},
  {team:'T1',number:5,type:'strike-own'},
  {team:'T2',number:5,specialType:'kranz'},
  {team:'T1',number:2,type:'enemy-strike'},
  {team:'T2',number:9,specialType:'9er'},
  {team:'T1',number:4,type:'restore'},
  ...Array.from({length:5},()=>({team:'T2',number:1,type:'strike-own'})),
 ];
 const {document}=parseHTML(render({history}));
 const rows=document.querySelectorAll('.tree-history');
 assert.equal(rows.length,1);
 assert.equal(rows[0].previousElementSibling.className,'tree-table-v138');
 const lanes=[...rows[0].children];
 assert.deepEqual(lanes.map(lane=>lane.dataset.team),['T2','T1']);
 assert.deepEqual([...lanes[0].querySelectorAll('.tree-history-throw')].map(chip=>chip.textContent),['💀','👑','🎯','1 ✅','1 ✅','1 ✅','1 ✅']);
 assert.deepEqual([...lanes[1].querySelectorAll('.tree-history-throw')].map(chip=>chip.textContent),['5 ✅','2 ⚠️','4 ↩️']);
 assert.deepEqual(lanes.map(lane=>lane.querySelector('.tree-history-name').textContent),['TV','Wand']);
 assert.deepEqual([...rows[0].querySelectorAll('.tree-history-latest')].map(chip=>chip.textContent),['💀','5 ✅']);
 const oneTeam=parseHTML(render({history:history.filter(entry=>entry.team==='T1')})).document;
 assert.equal(oneTeam.querySelector('.tree-history-empty').getAttribute('aria-label'),'Noch keine Würfe');
 history.splice(1,1);
 assert.equal(parseHTML(render({history})).document.querySelector('.tree-history-throw').textContent,'👑');
 assert(!parseHTML(render({})).document.querySelector('.tree-history'));
});

test('Tannenbaum table fills the stage below the scores and above the throw history and refits on resize',()=>{
 const html=read('dashboard.html');
 const fitSource=html.slice(html.indexOf('function fitTvBoard('),html.indexOf("if(typeof ResizeObserver!=='undefined')"));
 const table={style:{},get offsetHeight(){return Math.max(Number.parseFloat(this.style.minHeight)||0,540);}};
 let otherHeight=160;
 const board={style:{},dataset:{},scrollWidth:850,get scrollHeight(){return table.offsetHeight+otherHeight;},querySelector:selector=>selector==='.tree-table-v138'?table:null};
 const area={clientWidth:1000,clientHeight:940,querySelector:selector=>selector==='.tv-board'?board:null};
 const fit=new Function('document','getComputedStyle','let fitInProgress=false;'+fitSource+';return fitTvBoard;')(
  {getElementById:()=>area},()=>({paddingTop:'10px',paddingBottom:'10px',paddingLeft:'10px',paddingRight:'10px'})
 );
 fit();
 assert.equal(board.style.zoom,'1');
 assert.equal(table.style.minHeight,'757px');
 otherHeight=112;
 fit();
 assert.equal(table.style.minHeight,'805px');
 area.clientHeight=500;
 fit();
 const zoom=Number(board.style.zoom);
 assert(zoom<1);
 assert(board.scrollHeight*zoom<=477);
 assert(board.scrollHeight*zoom>=475);
});

test('Mensch pins hop through every field, reflect at 36 and return to Start on a collision',()=>{
 const source=read('dashboard.html');
 const code=source.slice(source.indexOf('const menschColors='),source.indexOf('function renderDartsBoard('));
 const env={window:{},activeNames:names=>names,safe:String};
 const {menschHopFields,menschPawnOrigins,animateMenschPawns,renderMenschBoard}=new Function('env','with(env){'+code+
  ';return {menschHopFields,menschPawnOrigins,animateMenschPawns,renderMenschBoard};}')(env);
 assert.deepEqual(menschHopFields(0,4,4),[1,2,3,4]);
 assert.deepEqual(menschHopFields(33,33,6),[34,35,36,35,34,33]);
 const base={active:true,playerOrder:['Simon','Peter'],currentIndex:0,scores:{Simon:1,Peter:4},throws:{Simon:[],Peter:[]}};
 const {document}=parseHTML('<main><div id="game-body"></div></main>');
 const body=document.getElementById('game-body');body.dataset.scoreGame='same-game';
 body.innerHTML=renderMenschBoard(base);
 assert.equal(body.querySelector('[data-mensch-player=Simon]').style.getPropertyValue('--mensch-player-color'),'#ffd326');
 assert.equal(body.querySelector('.mensch-active-field').dataset.menschPosition,'1');
 const seedRects=()=>{
  for(const item of body.querySelectorAll('.mensch-field,.mensch-pawn')){
   const field=Number(item.closest('[data-mensch-position]').dataset.menschPosition);
   item.getBoundingClientRect=()=>({left:field*40,top:0,width:20,height:20});
  }
 };
 seedRects();
 assert.equal(menschPawnOrigins(body,base,'same-game'),null);
 const thrown={...base,currentIndex:1,scores:{Simon:4,Peter:0},throws:{...base.throws,Simon:[{pins:3}]}};
 const origins=menschPawnOrigins(body,thrown,'same-game');
 body.innerHTML=renderMenschBoard(thrown);seedRects();
 assert.equal(body.querySelector('.mensch-active-field').dataset.menschPosition,'0');
 const calls=new Map();
 for(const pawn of body.querySelectorAll('.mensch-pawn'))pawn.animate=(frames,options)=>calls.set(pawn.dataset.menschPlayer,{frames,options});
 animateMenschPawns(body.querySelector('.mensch-tv-board'),origins,thrown);
 const moves=calls.get('Simon'),knockout=calls.get('Peter');
 assert.deepEqual(moves.frames.filter((_,index)=>index%2===0).map(frame=>frame.transform),[
  'translate(-120px,0px) rotate(0deg)','translate(-80px,0px) rotate(0deg)','translate(-40px,0px) rotate(0deg)','translate(0px,0px) rotate(0deg)'
 ]);
 assert.equal(knockout.options.delay,moves.options.duration);
 assert.equal(knockout.frames.length,3);
 assert.equal(menschPawnOrigins(body,base,'same-game'),null);
});

test('Mensch TV expands the equal-field grid to the available height and refits after a resize',()=>{
 const html=read('dashboard.html'),css=read('css/dashboard-mensch.css');
 assert.match(css,/grid-template-columns:repeat\(10,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:repeat\(10,minmax\(2rem,1fr\)\)/);
 const fitSource=html.slice(html.indexOf('function fitTvBoard('),html.indexOf("if(typeof ResizeObserver!=='undefined')"));
 const track={style:{},get offsetHeight(){return Math.max(Number.parseFloat(this.style.height)||0,480);}};
 const board={style:{},dataset:{},scrollWidth:850,get scrollHeight(){return track.offsetHeight+28;},querySelector:selector=>selector==='.mensch-track'?track:null};
 const area={clientWidth:1000,clientHeight:880,querySelector:selector=>selector==='.tv-board'?board:null};
 const fit=new Function('document','getComputedStyle','let fitInProgress=false;'+fitSource+';return fitTvBoard;')(
  {getElementById:()=>area},()=>({paddingTop:'10px',paddingBottom:'10px',paddingLeft:'10px',paddingRight:'10px'})
 );
 fit();assert.equal(track.style.height,'829px');assert.equal(board.style.zoom,'1');
 area.clientHeight=650;fit();assert.equal(track.style.height,'599px');assert.equal(board.style.zoom,'1');
 area.clientHeight=420;fit();assert(Number(board.style.zoom)<1);
 assert(board.scrollHeight*Number(board.style.zoom)<=397);
});
