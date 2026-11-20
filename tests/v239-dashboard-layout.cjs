const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function ui(html='dashboard.html'){const {document}=parseHTML(read(html)),c={document,Intl,Date,console,requestAnimationFrame:()=>1,setInterval:()=>1,setTimeout:()=>1,clearTimeout(){},addEventListener(){}};c.window=c;vm.createContext(c);for(const f of ['birthdays','dashboard-layout'])vm.runInContext(read('js/'+f+'.js'),c);return c;}
const c=ui(),M=c.KCDashboardLayout;
const source=read('tests/v230-player-rows.cjs'),{app,tv,fullApp}=new Function('require','__dirname',source.slice(0,source.indexOf('const keys='))+';return {app,tv,fullApp};')(require,__dirname);
function selection(enabled){const s=M.defaults();for(const key of M.keys)s.panels[key].enabled=enabled.includes(key);return s;}
test('all sixteen selections preserve default placement and allow shared positions',()=>{
 assert.deepEqual(copy(M.resolve(null).left),['drinks','fines']);assert.deepEqual(copy(M.resolve(null).right),['gutters','seating']);
 for(let mask=0;mask<16;mask++){const enabled=M.keys.filter((_,i)=>mask&(1<<i)),s=selection(enabled),before=copy(s),r=M.resolve(s);assert.equal(r.count,enabled.length);assert.equal(r.left.length+r.right.length,enabled.length);assert.equal(new Set([...r.left,...r.right]).size,enabled.length);if(enabled.length===2){assert.equal(r.left.length,2);assert.equal(r.right.length,0);}if(enabled.length===3)assert.deepEqual([r.left.length,r.right.length].sort(),[1,2]);assert.deepEqual(copy(s),before);}
 assert.deepEqual(copy(M.normalize({tableWidth:{left:8,right:26}}).tableWidth),{left:10,right:26});
 const one=selection(['seating']);one.panels.seating.position='right-bottom';assert.deepEqual(copy(M.resolve(one).right),['seating']);assert.equal(M.resolve(one).left.length,0);
 const swapped=M.move(M.defaults(),'seating','left-top');assert.equal(swapped.panels.drinks.position,'left-top');assert.equal(swapped.panels.seating.position,'left-top');
 const broken={panels:{drinks:{enabled:true,position:'nope'},fines:{enabled:true,position:'left-top'}}};const fixed=M.resolve(broken);assert.deepEqual(copy(fixed.groups['left-top']),['drinks','fines']);
});
test('TV moves the original panels and expands the stage and single side without duplicating or deleting contents',()=>{
 const f=ui();vm.runInContext(read('js/dashboard-layout-tv.js'),f);const T=f.KCDashboardLayoutTV,panels=Object.fromEntries(M.keys.map(k=>[k,f.document.getElementById('dashboard-panel-'+k)]));panels.drinks.dataset.marker='retained';T.apply(null);assert.deepEqual([...f.document.querySelector('.side.left').querySelectorAll('.panel')].map(x=>x.id),['dashboard-panel-drinks','dashboard-panel-fines']);
 let s=selection(['seating']);s.panels.seating.position='right-top';T.apply(s);assert(f.document.querySelector('.side.left').hidden);assert(!f.document.querySelector('.side.right').hidden);assert.equal(f.document.querySelector('.stage').style.gridColumn,'1');assert(f.document.querySelector('.side.right').style.gridTemplateRows==='minmax(0,1fr)');
 s=selection(['gutters','fines']);s=M.move(s,'fines','left-bottom');s=M.move(s,'gutters','left-top');T.apply(s);assert(f.document.querySelector('.side.right').hidden);assert.deepEqual([...f.document.querySelector('.side.left').querySelectorAll('.panel')].map(x=>x.id),['dashboard-panel-gutters','dashboard-panel-fines']);
 T.apply({tableHeight:{left:65,right:30}});
 assert.equal(f.document.querySelector('.side.left').style.gridTemplateRows,'minmax(0,65fr) minmax(0,35fr)');
 assert.equal(f.document.querySelector('.side.right').style.gridTemplateRows,'minmax(0,30fr) minmax(0,70fr)');
 T.apply(selection(['drinks','gutters','seating']));assert(f.document.querySelector('.side.left').style.gridTemplateRows==='minmax(0,1fr)');assert(f.document.querySelector('.side.right').style.gridTemplateRows==='minmax(0,50fr) minmax(0,50fr)');T.apply(selection([]));assert.equal(f.document.querySelector('main').style.gridTemplateColumns,'minmax(0,1fr)');T.apply({tableWidth:{left:14,right:23}});assert.equal(f.document.querySelector('main').style.gridTemplateColumns,'minmax(0,14%) minmax(0,1fr) minmax(0,23%)');T.apply(null);for(const key of M.keys)assert.equal(f.document.getElementById('dashboard-panel-'+key),panels[key]);assert.equal(panels.drinks.dataset.marker,'retained');
});
test('real app saves panel choices and ordering, reloads them and keeps them on a new evening',{timeout:60000},async()=>{
 const a=await app();const box=a.document.getElementById('dashboard-layout-settings');assert(box);assert.equal(box.querySelectorAll('[id^="dashboard-show-"]').length,4);for(const check of box.querySelectorAll('[id^="dashboard-show-"]'))assert(check.checked);
 assert.deepEqual(copy(M.normalize(null).playerRows),{holdSeconds:1.5,moveSeconds:0.8});
 assert.deepEqual(copy(M.normalize({playerRows:{holdSeconds:17,moveSeconds:-1}}).playerRows),{holdSeconds:10,moveSeconds:0});
 for(const [key,value] of [['hold','2.4'],['move','1.1']]){
  const field=a.document.getElementById('game-row-'+key+'-seconds');
  field.value=value;field.oninput();
 }
 assert.deepEqual(copy(M.normalize(null).lottoAnimations),{hit:1.6,miss:2.1});
 assert.deepEqual(copy(M.lottoAnimations({hit:-1,miss:14})),{hit:0,miss:10});
 for(const [key,value] of [['hit','2.4'],['miss','0']]){
  const field=a.document.getElementById('dashboard-lotto-animation-'+key);
  field.value=value;field.oninput();
 }
 assert.deepEqual(copy(M.menschPopup({seconds:50,color:'invalid'})),{seconds:30,color:'#ffd36a'});
 for(const [key,value] of [['seconds','4'],['color','#19447a']]){
  const field=a.document.getElementById('dashboard-mensch-popup-'+key);
  field.value=value;field.oninput();
 }
 for(const [id,value] of [['dashboard-table-height-left','67'],['dashboard-table-height-right','35'],['dashboard-station-seconds','8'],['dashboard-abschreibung-pause','3.2']]){
  const field=a.document.getElementById(id);
  field.value=value;field.oninput();
 }
 const check=a.document.getElementById('dashboard-show-drinks');check.checked=false;check.onchange();const select=a.document.getElementById('dashboard-position-seating');for(const option of select.querySelectorAll('option'))if(option.value==='left-top')option.setAttribute('selected','');else option.removeAttribute('selected');select.onchange();const counters=people=>people.map(p=>({name:p.name,drinks:p.drinks,strafen:p.strafen,paid:p.paid,freeStrafen:p.freeStrafen,rounds:p.rounds,boughtThrows:p.boughtThrows})),people=copy(counters(a.db.root().persons));assert(await a.c.KCDashboardSettingsApp.save());assert(await a.c.KCSharedSync.waitForUpload());assert.equal(a.db.root().dashboardSettings.panels.drinks.enabled,false);assert.equal(a.db.root().dashboardSettings.panels.seating.position,'left-top');assert.deepEqual(counters(a.db.root().persons),people);assert.deepEqual(copy(a.db.root().dashboardSettings.playerRows),{holdSeconds:2.4,moveSeconds:1.1});
 assert.deepEqual(copy(a.db.root().dashboardSettings.lottoAnimations),{hit:2.4,miss:0});
 assert.deepEqual(copy(a.db.root().dashboardSettings.menschPopup),{seconds:4,color:'#19447a'});
 assert.deepEqual(copy(a.db.root().dashboardSettings.tableHeight),{left:67,right:35});
 assert.equal(a.db.root().dashboardSettings.eventToasts.stationSeconds,8);
 assert.equal(a.db.root().dashboardSettings.abschreibungPause,3.2);
 const b=fullApp(a.db);await b.select();assert.equal(b.document.getElementById('dashboard-lotto-animation-hit').value,'2.4');assert.equal(b.document.getElementById('dashboard-show-drinks').checked,false);assert.equal(b.document.getElementById('game-row-hold-seconds').value,'2.4');assert.equal(b.document.getElementById('game-row-move-seconds').value,'1.1');assert.equal(b.document.getElementById('dashboard-position-seating').value,'left-top');const saved=copy(b.db?.root?.()?.dashboardSettings||a.db.root().dashboardSettings);assert(await b.c.startNewKegelabend());assert(await b.c.KCSharedSync.waitForUpload());assert.deepEqual(a.db.root().dashboardSettings,saved);
});
test('ticker birthday window ends at the next bowling date, includes every matching birthday, and does not stop at an earlier tour',()=>{
 const now=new Date('2026-11-16T12:00:00Z'),root={persons:Array.from({length:5},(_,i)=>({name:'P'+i,birthDate:'1990-11-'+(20+i)})).concat([{name:'Outside',birthDate:'1990-11-28'},{name:'Today',birthDate:'1990-11-16'}]),clubTermine:[{type:'kegeln',date:'2026-11-27',time:'20:00',note:'Schrottwichteln'},{type:'tour',date:'2026-11-18',endDate:'2026-11-19',note:'Tour'}]};const next=M.upcoming(root,now);assert.equal(next.birthdays.length,6);assert(!next.birthdays.some(x=>x.note==='Outside'));assert.equal(next.kegeln.date,'2026-11-27');assert.equal(next.tour.date,'2026-11-18');
 const f=ui();vm.runInContext(read('js/dashboard-layout-tv.js'),f);f.KCDashboardLayoutTV.ticker(root,now);const track=f.document.getElementById('dashboard-ticker-track');assert.equal(track.children.length,2);assert.equal(f.document.querySelectorAll('#kc-next-birthdays').length,1);assert.deepEqual([...track.firstElementChild.children].map(x=>x.id),['kc-next-birthdays','kc-next-tour','kc-next-kegeln']);assert(track.textContent.includes('P4'));assert(!track.textContent.includes('Outside'));assert(track.textContent.includes('Schrottwichteln'));const child=track.firstElementChild;f.KCDashboardLayoutTV.ticker({...root,persons:root.persons.map(p=>({...p,drinks:{beer:4}}))},now);assert.equal(track.firstElementChild,child,'bookings never restart the ticker');
});
test('current-player model covers the game families and distinguishes named team turns from free team throws',()=>{
 const f=ui();for(const file of ['games/extra-core','games/table-games-core','games/sechstage-core'])vm.runInContext(read('js/'+file+'.js'),f);const T=f.KCDashboardLayout.turn,root={currentEveningStartedAt:'now',persons:[{name:'A',tisch:'T1'},{name:'B',tisch:'T2'}]},base={active:true,finished:false,eveningStartedAt:'now',players:['A','B'],playerOrder:['A','B'],currentPlayerIndex:1,index:1};
 for(const key of ['mensch','plusminus','haushoch','haustief','siebener','hindernis','bergundtal','lattenzaun','guterschnitt','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend'])assert.equal(T(root,key,{...base,gameKey:key}).name,'B',key);
 assert.equal(T(root,'lotterie',{...base,columns:[1,2],throws:{A:[4,null],B:[null,null]}}).name,'B');assert.equal(T(root,'tiberius',{...base,throws:[{}]}).name,'B');assert.equal(T(root,'fuchsjagd',{...base,phase:'hunt',fox:'A',hunters:['B'],hunterIndex:0}).name,'B');
 for(const key of ['darts','tannenbaum','tor']){const s={...base,currentTeam:'T2',current:'T2',participantTeams:{T2:['B']}};assert.equal(T(root,key,s).name,'');assert.equal(T(root,key,s).team,'T2');assert.deepEqual(copy(T(root,key,s).members),['B']);}
 assert.equal(T(root,'parteienspiel',{...base,gameKey:'parteienspiel',partyAlternating:true,teamOrder:['T1','T2'],participantTeams:{T1:['A','C'],T2:['B','D']},round:1}).name,'B');assert.equal(T(root,'ballermann',{...base,gameKey:'ballermann',phase:1,teamOrder:['T1','T2'],participantTeams:{T1:['A'],T2:['B']},teamIndexes:{T2:0}}).name,'B');
 assert.equal(T(root,'sichern',{...base,mode:'team',order:['T1'],currentIndex:0,teams:{T1:['A','B']},teamTurns:{T1:1}}).name,'B');
 assert.equal(T(root,'sechstage',{...base,teams:[{id:'G1',players:['A','B']}],teamIndex:0,turn:{playerIndex:1}}).name,'B');assert.equal(T(root,'gluecksspirale',{...base,gameKey:'gluecksspirale',teams:[{players:['A','B']}],currentIndex:0,turn:{playerIndex:1}}).name,'B');assert.equal(T(root,'blackjack',{...base,gameKey:'blackjack',currentIndex:1,phase:'wood',stopped:[],cardValues:{}}).name,'B');
 for(const changed of [{finished:true},{active:false},{eveningStartedAt:'old'},{readyToFinish:true}])assert.equal(T(root,'mensch',{...base,...changed}).name,'');
});
test('the actual dashboard highlights the next person and the whole free-throw team, then clears finished-game markings',{timeout:60000},async()=>{
 const a=await app();a.run("seatingOrder=['A','B','C','D',...Array(12).fill('')];persistState()");await a.c.startMenschGameFinal('A');assert(await a.c.KCSharedSync.waitForUpload());const d=tv(a.db);
 for(const file of ['dashboard-layout','dashboard-layout-tv']){vm.runInContext(read('js/'+file+'.js'),d.c);Object.assign(d.c,d.c.window);}d.c.window.dashboardTest.paint();
 const active=()=>[...d.document.querySelectorAll('.tv-seat.is-current-thrower')].map(x=>x.dataset.seatName);assert.deepEqual(active(),['A']);await a.c.applyMenschThrow(1);assert(await a.c.KCSharedSync.waitForUpload());d.update();assert.deepEqual(active(),['B']);
 await a.c.startDartsGame();assert(await a.c.KCSharedSync.waitForUpload());d.update();assert.equal(active().length,0);assert.deepEqual([...d.document.querySelectorAll('.tv-seat.is-current-team')].map(x=>x.dataset.seatName).sort(),['A','C']);assert(d.document.querySelector('.is-current-team').getAttribute('aria-label').includes('Mannschaft am Wurf'));
 d.c.KCDashboardLayoutTV.highlight(a.db.root(),'darts',{...a.db.root().dartsState,active:false});assert.equal(d.document.querySelectorAll('.is-current-team,.is-current-thrower').length,0);
});
test('layout choices travel in the direct tablet display frame without changing its base state',()=>{
 const f=ui();f.crypto=require('node:crypto').webcrypto;vm.runInContext(read('js/dashboard-link.js'),f);const settings=selection(['fines','seating']),root={currentEveningStartedAt:'now',eveningResetRevision:2,persons:[],dashboardSettings:settings},before=copy(root),project=f.KCDashboardLink.project(root);assert.deepEqual(copy(project.dashboardSettings),copy(settings));const frame={sequence:3,clock:{time:100},state:project,baseEvening:'now'},merged=f.KCDashboardLink.reconcile(root,frame);assert.deepEqual(copy(merged.dashboardSettings),copy(settings));assert.deepEqual(copy(root),before);
});
test('footer keeps all three existing controls while the header retains only a connection dot next to its clock',()=>{
 const f=ui(),doc=f.document;for(const id of ['fullscreen-btn','dashboard-sound-toggle'])assert(doc.getElementById(id).closest('.dashboard-footer'));assert(doc.querySelector('.dashboard-footer .header-details'));assert.equal(doc.querySelector('.dashboard-header .header-status'),null);assert(doc.getElementById('indicator').parentElement.contains(doc.getElementById('clock')));assert(doc.querySelector('.dashboard-header #tv-countdown'));assert(!doc.querySelector('.dashboard-header .header-actions'));assert.equal(doc.querySelectorAll('#connection').length,1);
});
test('ticker safely handles year rollover, ongoing tours, empty calendars and untrusted notes',()=>{
 const now=new Date('2026-12-30T12:00:00Z'),root={persons:[{name:'New Year <img>',birthDate:'1990-01-01'},{name:'Later',birthDate:'1990-01-05'}],clubTermine:[{type:'tour',date:'2026-12-29',endDate:'2027-01-02',note:'<script>Tour</script>'},{type:'kegeln',date:'2027-01-03',time:'20:00'}]},up=M.upcoming(root,now);assert.deepEqual(copy(up.birthdays.map(x=>x.note)),['New Year <img>']);assert.equal(up.tour.date,'2026-12-29');const f=ui();vm.runInContext(read('js/dashboard-layout-tv.js'),f);f.KCDashboardLayoutTV.ticker(root,now);assert(!f.document.querySelector('#dashboard-ticker script,#dashboard-ticker img'));assert(f.document.getElementById('dashboard-ticker').textContent.includes('<script>Tour</script>'));f.KCDashboardLayoutTV.ticker({},now);assert(f.document.getElementById('dashboard-ticker').textContent.includes('Noch kein nächster Kegeltermin'));
});

test('Dashboard settings, club documents and general settings have separate navigation',async()=>{
 const a=await app(),d=a.document;
 a.c.showSideTab('verwaltung','dashboard');
 assert(!d.getElementById('tab-dashboard').classList.contains('hidden'));
 assert(d.getElementById('tab-info').classList.contains('hidden'));
 assert(d.getElementById('tab-dashboard').contains(d.getElementById('kc-dashboard-link')));
 const sections=[...d.querySelectorAll('#dashboard-layout-settings [data-dashboard-section]')];
 assert.deepEqual(sections.map(x=>x.dataset.dashboardSection),['layout','player-rows','ticker','notifications','football','connection']);
 a.c.showSideTab('verwaltung','info');
 assert(d.getElementById('tab-dashboard').classList.contains('hidden'));
 a.c.KCClubContentApp.infoTab('penalties');
 assert(!d.getElementById('club-info-penalties').hidden);
 assert(d.getElementById('club-info-statutes').hidden);
 a.c.showSideTab('verwaltung','einstellungen');
 assert.equal(d.querySelectorAll('#tab-einstellungen > .kc-general-setting').length,6);
});

test('finished game board renders persistent booked loser ranks and the obstacle track places every player',()=>{
 const f=ui();
 for(const file of ['game-results','games/individual-view'])vm.runInContext(read('js/'+file+'.js'),f);
 const ranking=[{rank:1,names:['Anna & Ben','Cora']},{rank:2,team:'Wand',names:['Dani']},{rank:3,names:['Edda']}];
 const game={id:'match-new',finished:true};
 const history=[{gameKey:'poker',gameId:'match-old',ranking:[{rank:1,names:['Old']}]},{gameKey:'poker',gameId:'match-new',ranking}];
 const root=f.document.createElement('div');
 root.innerHTML=f.KCGameResults.dashboardMarkup(f.KCGameResults.dashboardRanking('poker',game,history,{}));
 assert.match(root.textContent,/🥇 1\. VerliererAnna & Ben · Cora/);
 assert.match(root.textContent,/🥈 2\. VerliererWand · Dani/);
 assert.match(root.textContent,/🥉 3\. VerliererEdda/);
 assert(!root.textContent.includes('Old'));
 assert.equal(f.KCGameResults.dashboardRanking('poker',{...game,finished:false},history,{}).length,0);
 root.innerHTML=f.renderHurdleTrack({
  config:{target:40,rules:[{enabled:true,from:20,to:22},{enabled:true,from:8,to:8},{enabled:false,from:15,to:15}]},
  active:true,players:['Start','Am Zug','Im Ziel'],scores:{Start:2,'Am Zug':21,'Im Ziel':40}
 },'Am Zug');
 const stations=[...root.querySelectorAll('.hurdle-track li')];
 const runners=[...root.querySelectorAll('.hurdle-runners')];
 assert.equal(stations.length,4);
 assert.match(runners[0].textContent,/Start 2/);
 assert.match(stations[2].textContent,/20–22/);
 assert.equal(runners[1].querySelector('.hurdle-current strong').textContent,'Am Zug');
 assert.match(runners[2].textContent,/Im Ziel 40/);
});

test('TV hurdles show player names at occupied positions, matching the colored score rows',()=>{
 const f=ui();
 for(const file of ['kranz-policy','games/individual-core','games/individual-view'])vm.runInContext(read('js/'+file+'.js'),f);
 const s=f.KCIndividual.empty('hindernis');
 Object.assign(s,{id:'indgame_preview',active:true,players:['Daniel','Peter','Cora','Mara','Nico'],scores:{Daniel:12,Peter:0,Cora:17,Mara:17,Nico:0},history:[...['Daniel','Peter','Cora','Mara'].map(name=>({name,action:'throw'})),{name:'Nico',action:'next'}],config:{target:24,baseCents:100,rules:[
  {id:'start',from:0,to:0,kind:'start',enabled:true},
  {id:'pause',from:15,to:15,kind:'skip',enabled:true},
  {id:'pay11',from:17,to:18,kind:'pay',value:100,enabled:true},
  {id:'pay35',from:22,to:22,kind:'pay',value:100,enabled:true},
  {id:'leader',from:23,to:23,kind:'leader',enabled:false}
 ]},bookings:[{personName:'Peter',amountCents:100}],events:[{name:'Peter',point:17,text:'1,00 € in die Kasse'}]});
 const root=f.document.createElement('div');root.innerHTML=f.renderIndividualBoard(s,{dashboard:true});
 assert.deepEqual([...root.querySelector('.ind-hurdle-split').children].map(x=>x.className),['hurdle-circuit','hurdle-scores','hurdle-rules']);
 const header=root.querySelector('.hurdle-tv-header'),fitArea=root.querySelector('.hurdle-tv-fit');
 assert.match(header.querySelector('h2').textContent,/Hindernislauf/);
 assert.equal(header.querySelector('.hurdle-turn-score strong').textContent,'12');
 const cards=[...header.querySelectorAll('.hurdle-throw-card')];
 assert.equal(cards[0].querySelector('.hurdle-throw-card-top strong').textContent,'+3 Pkt.');
 assert.match(cards[0].textContent,/Feld 15.*3 Holz/);
 const far=f.document.createElement('div');
 far.innerHTML=f.renderIndividualBoard({...s,scores:{...s.scores,Daniel:1}},{dashboard:true});
 assert.match(far.querySelector('.hurdle-throw-card').textContent,/\+14 Pkt.*Feld 15.*Außer Wurfreichweite/);
 assert.equal(header.nextElementSibling,fitArea);
 assert.equal(fitArea.dataset.hurdleGame,s.id);
 assert.equal(fitArea.querySelector('h2,.ind-turn'),null);
 const marks=[...root.querySelectorAll('.hurdle-circuit-mark')];
 assert.deepEqual(marks.map(m=>Number(m.dataset.score)),[0,12,15,17,22,24]);
 assert.deepEqual(marks.filter(m=>m.classList.contains('hurdle-circuit-milestone')).map(m=>Number(m.dataset.progress)),[0,.25,.5,.75,1]);
 assert.equal(Number(marks[1].dataset.progress),.2);
 assert.equal(marks[1].querySelector('.hurdle-circuit-players strong').textContent,'12');
 assert.match(marks[0].textContent,/Start0 Pkt/);
 assert.match(marks[5].textContent,/Ziel24 Pkt/);
 assert.equal(marks[3].querySelectorAll('.hurdle-player-dot').length,2);
 assert.equal(marks[3].querySelector('.hurdle-circuit-players strong'),null);
 const trackPlayers=[...root.querySelectorAll('.hurdle-circuit-player')];
 assert.deepEqual(trackPlayers.map(player=>player.textContent),['Peter','Daniel','Cora','Mara']);
 assert.deepEqual([...marks[3].querySelectorAll('.hurdle-circuit-player')].map(player=>player.textContent),['Cora','Mara']);
 assert.equal(root.querySelector('.hurdle-dot-current').closest('.hurdle-circuit-player').textContent,'Daniel');
 const rows=[...root.querySelectorAll('.hurdle-scores tbody tr')];
 assert.equal(rows[0].getAttribute('aria-current'),'true');
 assert.equal(rows[0].querySelector('th').textContent,'Daniel');
 const rowColors=new Map(rows.map(row=>[row.querySelector('th').textContent,row.querySelector('.hurdle-player-dot').getAttribute('style')]));
 assert.equal(new Set(rowColors.values()).size,s.players.length);
 for(const player of trackPlayers)assert.equal(player.querySelector('.hurdle-player-dot').getAttribute('style'),rowColors.get(player.textContent));
 const track=root.querySelector('.hurdle-circuit'),rail=track.querySelector('.hurdle-circuit-rail');
 Object.defineProperties(rail,{offsetWidth:{value:702,configurable:true},offsetHeight:{value:271,configurable:true},offsetLeft:{value:62},offsetTop:{value:26}});
 for(const players of track.querySelectorAll('.hurdle-circuit-players')){
  Object.defineProperties(players,{offsetWidth:{value:60,configurable:true},offsetHeight:{value:18}});
 }
 f.layoutHurdleCircuit(track);
 assert.deepEqual(marks.map(m=>m.dataset.side),['left','left','top','top','top','right']);
 assert.deepEqual([marks[0].style.left,marks[0].style.top],['63px','297px']);
 assert.deepEqual([marks[1].style.left,marks[1].style.top],['63px','49px']);
 assert.deepEqual([marks.at(-1).style.left,marks.at(-1).style.top],['763px','297px']);
 assert.match(header.querySelector('.ind-turn').textContent,/Daniel.*12 Pkt./);
 assert.match(header.querySelector('.hurdle-next-throws').textContent,/Feld 15.*3 Holz.*Feld 17.*5 Holz.*Ziel 24.*👑/);
 assert.deepEqual([...root.querySelectorAll('.ind-rule-reachable th')].map(x=>x.textContent),['15','17–18']);
 assert.match(root.querySelectorAll('.hurdle-scores .ind-penalty')[1].querySelector('strong').textContent,/1,00/);
 assert.match(root.querySelector('.hurdle-penalty-preview').textContent,/^\+0,50/);
 assert.match(track.querySelector('[data-range-start]').getAttribute('d'),/^M.+ L.+/);
 assert.equal(root.querySelectorAll('.ind-event').length,0);
 // At narrow widths, labels over the top keep their anchors and use separate lanes.
 Object.defineProperties(rail,{
  offsetWidth:{value:382,configurable:true},offsetHeight:{value:101,configurable:true}
 });
 const firstTop=marks[1].querySelector('.hurdle-circuit-players'),secondTop=marks[3].querySelector('.hurdle-circuit-players');
 for(const players of [firstTop,secondTop])Object.defineProperty(players,'offsetWidth',{value:200,configurable:true});
 f.layoutHurdleCircuit(track);
 assert.deepEqual([marks[1].dataset.side,marks[3].dataset.side],['top','top']);
 assert.deepEqual([firstTop.style.getPropertyValue('--drop'),secondTop.style.getPropertyValue('--drop')],['0px','22px']);
 assert.equal(track.parentElement.style.getPropertyValue('--hurdle-top-space'),'86px');
 assert.equal(firstTop.querySelector('.hurdle-circuit-player').textContent,'Daniel');
 s.double.Daniel=true;
 const twice=f.hurdleThrowPreview(s,'Daniel');
 assert.equal(twice.hits.has('pause'),false);
 assert.deepEqual(Array.from(twice.hits.get('pay35')),['5 Holz']);
 s.double.Daniel=false;
 s.subtract.Daniel=true;
 assert.equal(f.hurdleThrowPreview(s,'Daniel').hits.size,1,'Kranz with subtraction can reach zero');
});

test('the dense hurdle board fits the available width and height as one block',()=>{
 const html=read('dashboard.html');
 const fit=new Function('getComputedStyle','layoutHurdleCircuit',html.slice(html.indexOf('function fitHurdleBoard'),html.indexOf('function fitTvBoard'))+';return fitHurdleBoard;')(()=>({paddingLeft:'9px',paddingRight:'9px',paddingTop:'8px',paddingBottom:'8px'}),track=>assert.equal(track,'course'));
 const board={style:{},dataset:{},offsetHeight:950,querySelector:()=> 'course'};
 const area={clientWidth:900,clientHeight:620,dataset:{hurdleGame:'indgame_preview'}},memory={};
 fit(area,board,memory);
 const zoom=Number(board.style.zoom);
 assert(zoom<1&&board.offsetHeight*zoom<=602);
 assert(Math.abs(parseFloat(board.style.width)*zoom-880)<0.01);
 assert(Math.abs(parseFloat(board.style.minHeight)*zoom-602)<0.01);
 const next={style:{},dataset:{},offsetHeight:700,querySelector:board.querySelector};
 fit(area,next,memory);
 assert.equal(next.style.zoom,board.style.zoom,'a shorter throw preview must not enlarge the board');
 fit({...area,clientHeight:850},next,memory);
 assert.equal(next.style.zoom,'1','the board fits again when the viewport changes');
 fit(area,board,memory);
 fit({...area,dataset:{hurdleGame:'indgame_next'}},{...next,offsetHeight:500},memory);
 assert.equal(memory.scale,1,'a new game can use the available space again');
 assert.match(read('css/individual-games.css'),/\.ind-hurdle-tv \.ind-table-scroll\s*\{\s*overflow: visible/);
});

test('dashboard indicator stays blue on a direct link independently of Firebase confirmation',()=>{
 const f=ui(),src=read('dashboard.html');
 vm.runInContext("const $=id=>document.getElementById(id);let tvDirect=true;"+src.slice(src.indexOf('function status('),src.indexOf('let lastReceived=')),f);
 f.status('Cloudbestätigung ausstehend');
 const dot=f.document.getElementById('indicator');
 assert(dot.classList.contains('direct'));
 assert.equal(dot.getAttribute('aria-label'),'Tablet direkt · Cloudbestätigung ausstehend');
 vm.runInContext('tvDirect=false',f);
 f.status('TV über Firebase verbunden',true);assert(dot.classList.contains('ok'));
 f.status('Gerätestand · Serverbestätigung ausstehend',false,true);assert(dot.classList.contains('pending'));
 f.status('Keine Internetverbindung');assert.equal(dot.className,'dot');
});
