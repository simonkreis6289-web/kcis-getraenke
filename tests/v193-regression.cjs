const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseHTML}=require('linkedom'),{parse}=require('cssom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const fixtureSource=read('tests/v191-regression.cjs');
const fixture=new Function('require','__dirname',fixtureSource.slice(0,fixtureSource.indexOf('\nconst event='))+';return soundFixture;')(require,__dirname);
const now=Date.now(),evening='2026-11-09T18:00:00Z';
const event=(id,type)=>({id,type,thrower:'Hucke',createdAt:new Date(now).toISOString(),eveningStartedAt:evening});
const feed=(f,logs)=>f.audio.feed({currentEveningStartedAt:evening,penaltyStatsLog:logs},'club',now);

test('the large countdown overlays the event block and cannot create an extra header grid row',()=>{
 const {document}=parseHTML(read('dashboard.html')),timer=document.getElementById('tv-countdown');
 assert(timer.parentElement.classList.contains('kc-next-events'));
 const rules=[...parse(read('css/dashboard-header.css')).cssRules];
 const box=rules.find(r=>r.selectorText==='.dashboard-header #tv-countdown');
 assert.equal(box.style.getPropertyValue('position'),'absolute');assert.equal(box.style.getPropertyValue('pointer-events'),'none');
 assert.equal(box.style.getPropertyValue('bottom'),'auto');
 const digits=rules.find(r=>r.selectorText==='.dashboard-header #tv-countdown .timer-time');
 assert(digits.style.getPropertyValue('font-size').includes('56px'));assert(digits.style.getPropertyValue('font-size').includes('84px'));
});

test('new 9er, Kranz and through throws use the same real bowling recording; gutters use the Zonk',async()=>{
 const f=fixture();await f.audio.toggle();feed(f,[]);f.oscillators.length=0;
 const logs=[];
 for(const [index,type] of ['9er','kranz','durchgeworfen','gosse'].entries()){
  f.contexts[0].currentTime+=4;logs.push(event(String(index),type));feed(f,logs);
  assert.equal(f.oscillators.length,index+1);assert.equal(f.oscillators.at(-1).buffer.url,type==='gosse'?'sounds/zonk.mp3':'sounds/bowling-strike.mp3');
 }
 feed(f,logs.slice().reverse());assert.equal(f.oscillators.length,4);
});

test('no tick at 11 seconds; each of the last ten seconds ticks once, even across repeated renders',async()=>{
 const f=fixture();await f.audio.toggle();f.oscillators.length=0;f.audio.timer(false,false,0,now);
 f.audio.timer(true,true,11,now);assert.equal(f.oscillators.length,0);
 for(let n=10;n>=1;n--){f.audio.timer(true,true,n,now+(11-n)*1000);f.audio.timer(true,true,n,now+(11-n)*1000+250);}
 assert.equal(f.oscillators.length,10);assert(f.oscillators.every(n=>n.type==='square'));
 f.audio.timer(true,true,0,now+11000);f.audio.timer(true,true,0,now+11250);assert.equal(f.oscillators.length,16);
});

test('muting during a slow sample load prevents deferred playback and does not turn sound back on',async()=>{
 const releases=[],f=fixture({fetcher:url=>new Promise(resolve=>releases.push(()=>resolve({ok:true,arrayBuffer:async()=>url})))});
 const enabling=f.audio.toggle();feed(f,[]);feed(f,[event('pending','9er')]);await f.audio.toggle();
 releases.forEach(resolve=>resolve());await enabling;await Promise.resolve();await Promise.resolve();
 assert.equal(f.oscillators.filter(n=>n.kind==='sample').length,0);
 assert.equal(f.document.getElementById('dashboard-sound-toggle').getAttribute('aria-pressed'),'false');
});

test('a missing sample gives feedback while the countdown works, and re-enabling retries failed files',async()=>{
 const f=fixture({fetcher:async()=>({ok:false,status:404})});await f.audio.toggle();
 assert(f.document.getElementById('dashboard-sound-status').textContent.includes('nicht geladen'));
 const count=f.oscillators.length;f.audio.timer(false,false,0,now);f.audio.timer(true,true,10,now);
 assert.equal(f.oscillators.length,count+1);
 await f.audio.toggle();f.c.fetch=async url=>({ok:true,arrayBuffer:async()=>url});await f.audio.toggle();
 assert.equal(f.document.getElementById('dashboard-sound-status').textContent,'Ton eingeschaltet · 45 %');
 f.audio.test('nine');assert.equal(f.oscillators.at(-1).buffer.url,'sounds/bowling-strike.mp3');
});

test('local MP3 files are bundled, documented, and cached for an offline dashboard',()=>{
 for(const name of ['bowling-strike','zonk']){
  const bytes=fs.readFileSync(path.join(__dirname,'..','sounds',name+'.mp3'));
  assert(bytes.length>1000);assert(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255);
  assert(read('sw.js').includes('./sounds/'+name+'.mp3'));
 }
 assert(read('sounds/README.md').includes('CC0'));assert(read('sounds/README.md').includes('514385'));
 assert(!read('getraenke-abrechnung.html').includes('dashboard-sounds.js'));
});
