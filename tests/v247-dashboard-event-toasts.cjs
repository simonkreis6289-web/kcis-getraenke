const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(path.join(__dirname,'../js/dashboard-event-toasts.js'),'utf8');
function setup(){
 const {document}=parseHTML('<html><body><main class="dashboard"><div class="stage"></div><section class="side left"><div data-active-panel="drinks"><article id="dashboard-panel-drinks"></article></div></section><footer class="dashboard-footer"></footer></main></body></html>');
 document.querySelector('.stage').getBoundingClientRect=()=>({left:150,width:700});
 document.querySelector('main').getBoundingClientRect=()=>({width:1200,right:1200,bottom:800});
 document.querySelector('footer').getBoundingClientRect=()=>({top:750});
 document.getElementById('dashboard-panel-drinks').getBoundingClientRect=()=>({left:8,top:60,width:200,height:310});
 const timers=new Map();let id=0;const now=Date.now();
 const context={document,Date,console,innerWidth:1200,innerHeight:800,requestAnimationFrame:fn=>fn(),setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key)};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 return {document,now,tool:context.KCClubToasts,advance(){const [key,task]=timers.entries().next().value||[];if(task){timers.delete(key);task.fn();}},get box(){return document.getElementById('dashboard-club-event-toast');},get booking(){return document.getElementById('dashboard-station-booking');},get delay(){return [...timers.values()][0]?.ms;}};
}
const person=(name,extra={})=>({name,present:false,left:false,rounds:[],strafen:{},...extra});
test('person toast avatar prefers stored photo, falls back to initials for guests',()=>{
 const f=setup(),photo='data:image/png;base64,iVBORw0KGgo=';
 const people=[person('Simon Kreis',{avatarData:photo}),person('Gast Spieler',{isGuest:true})];
 const root={persons:people};
 assert.equal(f.tool.avatar(root,'Simon Kreis').querySelector('img').getAttribute('src'),photo);
 assert.equal(f.tool.avatar(root,'Gast Spieler').querySelector('img'),null);
 assert.equal(f.tool.avatar(root,'Gast Spieler').textContent,'GS');
});
test('attendance changes generate new welcome and goodbye toasts but never replay initial state',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-1',persons:[person('Max Beispiel')]};
 f.tool.feed(root,'club',f.now);assert.equal(f.box,null);
 root.persons=[person('Max Beispiel',{present:true})];
 f.tool.feed(root,'club',f.now);assert.match(f.box.textContent,/Willkommen/);assert.match(f.box.textContent,/Max Beispiel/);
 f.advance();f.advance();
 root.persons=[person('Max Beispiel',{present:true,left:true})];f.tool.feed(root,'club',f.now);
 assert.match(f.box.textContent,/Bis bald/);
 f.tool.feed(root,'club',f.now); // unchanged state: no second goodbye
 f.advance();f.advance();assert(f.box.hidden);
});
test('only confirmed personal rounds make Prost; changes to team drinks do not',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-1',persons:[person('Karl',{present:true})],teamDrinks:{}};
 f.tool.feed(root,'club',f.now);
 root.teamDrinks={T1:{bier:2}};f.tool.feed(root,'club',f.now);assert.equal(f.box,null);
 root.persons[0].rounds=[{id:'round-1',reason:'Geburtstag',createdAt:new Date(f.now).toISOString()}];
 f.tool.feed(root,'club',f.now);assert.match(f.box.textContent,/Prost/);assert.match(f.box.textContent,/Karl/);
});
test('1st to 3rd loser ranks are detected from saved penalty counters',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-1',STRAFEN:[{key:'v1',label:'1. Verlierer'},{key:'v2',label:'2. Verlierer'},{key:'v3',label:'3. Verlierer'}],persons:[person('A',{present:true,strafen:{v1:0}}),person('B',{present:true,strafen:{v2:0}}),person('C',{present:true,strafen:{v3:0}})]};
 f.tool.feed(root,'club',f.now);
 root.persons[0].strafen.v1=1;root.persons[1].strafen.v2=1;root.persons[2].strafen.v3=1;
 f.tool.feed(root,'club',f.now);assert.match(f.box.textContent,/1\. Verlierer/);
 f.advance();f.advance();assert.match(f.box.textContent,/2\. Verlierer/);
 f.advance();f.advance();assert.match(f.box.textContent,/3\. Verlierer/);
});
test('recorded team loss produces team toast and does not count as personal round',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-1',persons:[person('Karl',{present:true})],strafenHistory:[]};
 f.tool.feed(root,'club',f.now);
 root.strafenHistory=[{type:'teamspiel_strafe',spieltyp:'Tor',loser:'T1',teamName:'Wand',members:['Karl'],date:new Date(f.now).toISOString()}];
 f.tool.feed(root,'club',f.now);assert.match(f.box.textContent,/Verliererteam/);assert.match(f.box.textContent,/Wand/);
});
test('new evening resets baselines so old arrival and rounds never replay',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-1',persons:[person('Karl',{present:true})]};
 f.tool.feed(root,'club',f.now);
 root.currentEveningStartedAt='evening-2';root.persons=[person('Karl',{present:true,rounds:[{id:'old',createdAt:new Date(f.now).toISOString()}]})];
 f.tool.feed(root,'club',f.now);assert.equal(f.box,null);
});


test('toast background picks configured category color and uses legible foreground',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-colors',dashboardSettings:{eventToasts:{seconds:4,colors:{arrival:'#152030',departure:'#e9f0fb',round:'#ffee88',loser:'#aa1133',teamLoss:'#224488'}}},persons:[person('Karl',{present:false})],strafenHistory:[]};
 f.tool.feed(root,'club',f.now);
 root.persons=[person('Karl',{present:true})];f.tool.feed(root,'club',f.now);
 assert.equal(f.box.style.background,'#152030');assert.equal(f.box.style.color,'#ffffff');
 f.advance();f.advance();root.persons=[person('Karl',{present:true,left:true})];f.tool.feed(root,'club',f.now);
 assert.equal(f.box.style.background,'#e9f0fb');assert.equal(f.box.style.color,'#13243d');
});
test('invalid persisted toast colors cannot become CSS properties',()=>{
 const f=setup(),root={currentEveningStartedAt:'evening-badcolor',dashboardSettings:{eventToasts:{colors:{arrival:'red; display:none'}}},persons:[person('Karl')]};
 f.tool.feed(root,'club',f.now);root.persons=[person('Karl',{present:true})];f.tool.feed(root,'club',f.now);
 assert.equal(f.box.style.background,'#40cf88');
});

test('confirmed KC Theke bookings use the drinks panel or the lower-right fallback without replaying',()=>{
 const f=setup(),evening='evening-1',panel=f.document.getElementById('dashboard-panel-drinks');
 const event=id=>({id,evening,at:new Date(f.now).toISOString(),name:'A',description:'A · 1 × Bier',
  items:[{name:'A',drink:'Bier',quantity:1,cents:235},{name:'B',drink:'Wasser',quantity:2,cents:300}]});
 const root={currentEveningStartedAt:evening,persons:[person('A',{present:true})],stationEvents:[event('station_old')],
  dashboardSettings:{eventToasts:{station:true,seconds:0,stationSeconds:7,colors:{station:'#aa1133'}}}};
 f.tool.feed(root,'club',f.now);assert.equal(f.booking,null);
 root.persons[0].rounds=[{id:'station_round',createdAt:new Date(f.now).toISOString()}];
 f.tool.feed(root,'club',f.now);assert.equal(f.box,null);
 root.stationEvents.push(event('station_round'));
 f.tool.feed(root,'club',f.now);assert.equal(f.box,null);
 assert.deepEqual([...f.booking.querySelectorAll('li')].map(row=>row.textContent.replace(/\s/g,' ')),['A1 × Bier2,35 €','B2 × Wasser3,00 €']);
 assert.match(f.booking.querySelector('.station-booking-total').textContent,/5,35/);
 assert.equal(f.booking.firstChild.style.background,'#aa1133');assert.equal(f.delay,7360);
 assert.equal(f.booking.style.left,'8px');assert.equal(f.booking.style.top,'60px');assert.equal(f.booking.style.width,'200px');assert.equal(f.booking.style.height,'310px');
 assert(f.booking.classList.contains('station-from-left'));
 panel.parentElement.dataset.activePanel='fines';
 f.tool.positionStation();
 assert.equal(f.booking.style.left,'912px');assert.equal(f.booking.style.top,'342px');assert.equal(f.booking.style.height,'400px');
 assert(!f.booking.classList.contains('station-from-left'));
 f.tool.feed(root,'club',f.now);f.advance();assert(!f.booking.classList.contains('station-booking-visible'));f.advance();assert.equal(f.booking,null);
 root.dashboardSettings.eventToasts.station=false;
 root.stationEvents.push(event('station_disabled'));
 f.tool.feed(root,'club',f.now);assert.equal(f.booking,null);
 root.dashboardSettings.eventToasts.station=true;f.tool.feed(root,'club',f.now);assert.equal(f.booking,null);
});
