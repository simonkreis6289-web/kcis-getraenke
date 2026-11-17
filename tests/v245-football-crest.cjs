const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
test('football toast uses scoring-team crest and full dashboard width, demo follows same path',async()=>{
 const {document}=parseHTML('<main class="dashboard"><div class="stage"></div></main>');
 let timer=0;const setTimeoutMock=(fn)=>++timer;
 const ctx={document,console,Date,Event:class Event{constructor(type){this.type=type;}},setTimeout:setTimeoutMock,clearTimeout(){},setInterval:()=>1,requestAnimationFrame:fn=>fn(),AbortController,
  fetch:async url=>({ok:true,json:async()=>url.includes('getavailableteams')?[{teamName:'Borussia Dortmund',teamIconUrl:'https://example.org/bvb.png'},{teamName:'FC Schalke 04',teamIconUrl:'https://example.org/s04.png'}]:[]}),
  addEventListener(){},dispatchEvent(){}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/football-live.js'),'utf8'),ctx);
 const live=ctx.KCFootballLive;
 const baseline={bl1:false,bl2:false,goalToastSeconds:5,demo:{active:true,id:'check1',league:'bl1',home:0,away:0}};
 live.configure(baseline);
 await new Promise(resolve=>setImmediate(resolve));
 live.configure({...baseline,demo:{...baseline.demo,home:1}});
 let box=document.getElementById('dashboard-football-toast');
 assert(box,'scoring should create toast');
 assert.equal(box.style.left,'50%');
 assert.equal(box.style.width,'calc(100vw - 32px)');
 assert.match(box.textContent,/Borussia Dortmund/);
 assert.equal(box.querySelector('img')?.getAttribute('src'),'https://example.org/bvb.png');
 live.configure({...baseline,demo:{...baseline.demo,home:1,away:1}});
 box=document.getElementById('dashboard-football-toast');
 assert.match(box.textContent,/FC Schalke 04/);
 assert.equal(box.querySelector('img')?.getAttribute('src'),'https://example.org/s04.png');
 live.configure({...baseline,demo:null});
 assert(!live.ticker().some(item=>item[0]==='football-demo'));
});
