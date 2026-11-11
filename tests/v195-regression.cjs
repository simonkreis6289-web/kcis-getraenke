const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const source=read('tests/v186-regression.cjs'),ua=source.indexOf('function ui(){'),ub=source.indexOf("\ntest('actual 7er HTML",ua);
const helpers=new Function('require','__dirname',source.slice(0,source.indexOf('\ntest('))+source.slice(ua,ub)+';return {g,view,ctx,evening,start,step,roll,req,server,ui};')(require,__dirname);
const {g,view,ctx,evening,start,step,roll,req,server,ui}=helpers;
const config=(target=100,baseCents=500)=>({target,baseCents,rules:[]});

test('the first target throw immediately ends the game and books all remaining-point fees',()=>{
 const s=start('hindernis',config(),['A','B','C']);s.scores={A:91,B:77,C:40};s.bookings=[{id:'previous',personName:'A',amountCents:35,reason:'Hindernislauf · Hindernis 11'}];
 const out=step(s,'throw',{kind:'pins',pins:9});
 assert(out.state.finished);assert(!out.state.active);assert.deepEqual(out.state.winners,['A']);assert.equal(out.state.index,0);
 assert.deepEqual(out.state.scores,{A:100,B:77,C:40});assert.deepEqual(out.effect.moneyAdded.map(x=>[x.personName,x.amountCents]),[['B',115],['C',300]]);
 assert.equal(out.state.bookings[0].amountCents,35);assert.equal(out.effect.added[0].type,'9er');
 assert.throws(()=>roll(out.state,9),/beendet/);assert.throws(()=>step(out.state,'finish'),/beendet/);
});

test('overshooting the target and reaching it on a doubled throw also end immediately',()=>{
 for(const [score,pins,double] of [[99,4,false],[95,3,true]]){
  const s=start('hindernis',config(),['A','B','C']);s.index=1;s.scores.B=score;s.double.B=double;
  const out=step(s,'throw',{kind:'pins',pins});assert(out.state.finished);assert.deepEqual(out.state.winners,['B']);assert.equal(out.state.index,1);assert.equal(out.state.scores.C,0);
 }
});

test('winning throw, statistics and settlement are atomic and retries cannot double-book',async()=>{
 const s=start('hindernis',config());s.scores={A:91,B:77};const store=server({hindernisState:s}),request=req(s,'throw',{kind:'pins',pins:9});
 store.fail(true);await assert.rejects(()=>store.api.transactIndividualGame('club',request),/Network/);assert.equal(store.root().hindernisState.finished,false);assert.equal(store.root().individualGameLedger,undefined);
 store.fail(false);const first=await store.api.transactIndividualGame('club',request);const again=await store.api.transactIndividualGame('club',request);
 assert(first.state.finished);assert(again.repeat);assert.equal(store.root().individualGameLedger.length,1);assert.equal(store.root().individualGameLedger[0].amountCents,115);
 assert.equal(store.root().penaltyStatsLog.length,1);assert.equal(store.person('B').strafen.special,1);
 assert.equal(store.root().persons.find(p=>p.name==='B').individualChargeCents,115);
 await assert.rejects(()=>store.api.transactIndividualGame('club',req(first.state,'throw',{kind:'pins',pins:1})),/beendet/);
});

test('a legacy final-round state can finish immediately and cannot accept another throw',()=>{
 const s=start('hindernis',config());s.scores={A:100,B:77};s.finalRound=2;s.index=1;
 assert.throws(()=>roll(s,9),/erreicht/);const out=step(s,'finish');assert(out.state.finished);assert.equal(out.effect.moneyAdded[0].amountCents,115);
});

test('cash hurdles accept individual cent amounts and use them for labels and undo',()=>{
 const c=g.defaults();c.rules.forEach(r=>r.enabled=r.id==='pay11');c.rules.find(r=>r.id==='pay11').value=75;
 assert(g.validSettings(c));assert.equal(g.ruleLabel(c.rules.find(r=>r.id==='pay11')),'75 Cent in die Kasse');
 const s=start('hindernis',c);s.scores.A=10;const out=step(s,'throw',{kind:'pins',pins:1});assert.equal(out.effect.moneyAdded[0].amountCents,75);
 const undo=step(out.state,'undo');assert.deepEqual(undo.effect.moneyRemoved,[out.effect.moneyAdded[0].id]);assert.equal(undo.state.bookings.length,0);
 c.rules.find(r=>r.id==='pay11').value=125;assert.equal(g.ruleLabel(c.rules.find(r=>r.id==='pay11')),'1,25 € in die Kasse');
 for(const value of [-1,10001,.5,NaN]){c.rules.find(r=>r.id==='pay11').value=value;assert(!g.validSettings(c));}
});

test('random generation honors an explicit count and uses unique valid point numbers',()=>{
 for(const target of [20,30,50,90,500])for(const count of [1,4,9,17]){
  const rules=g.randomRules(target,count),c={target,baseCents:500,rules};assert(g.validSettings(c));assert.equal(rules.length,count);
  assert.equal(new Set(rules.map(r=>r.id)).size,count);assert.equal(new Set(rules.map(r=>r.from)).size,count);assert(rules.every(r=>r.from>0&&r.to<target&&r.enabled));
 }
 for(const count of [0,18,2.5,NaN])assert.throws(()=>g.randomRules(90,count),/Anzahl/);
});

test('all-random resets positions, disabled flags and count to a sensible density',()=>{
 for(const [target,expected] of [[20,4],[50,9],[90,17],[500,17]]){
  const c={target,baseCents:350,rules:g.makeRules(target)};c.rules.forEach(r=>r.enabled=false);
  const next=g.randomizeEvents(c,()=>.7);assert.equal(next.rules.length,expected);assert(next.rules.every(r=>r.enabled));assert(g.validSettings(next));assert.equal(next.baseCents,350);
 }
});

test('custom cash amounts survive rerandomization, even if their hurdle temporarily disappears',()=>{
 const c=g.defaults();c.rules.find(r=>r.id==='pay11').value=75;
 let next=g.rebuildSettings(c,30,1,()=>.999);assert.equal(next.payAmounts.pay11,75);
 next=g.rebuildSettings(next,90,17,()=>.3);assert.equal(next.rules.find(r=>r.id==='pay11').value,75);
 const shifted=g.shiftRule(next,1,1);assert(g.validSettings(shifted));assert.equal(shifted.rules.find(r=>r.id==='pay11').value,75);
});

test('settings save exact amounts and custom points, reject overlap, and freeze running-game settings',async()=>{
 const f=ui(),c=f.c,doc=f.document;
 const fee=doc.querySelector('[data-hurdle-amount="2"]');fee.value='0.75';assert(c.indSetRuleAmount(2,fee.value));
 assert(c.indSetRulePoint(2,'from','12'));assert.equal(doc.querySelector('[data-hurdle-to="2"]').value,'12');
 assert(!c.indSetRulePoint(2,'from','17'));assert(!c.indSetRulePoint(2,'from','90'));
 assert(await c.saveHurdleSettings());assert.equal(c.hindernisSettings.rules.find(r=>r.id==='pay11').from,12);assert.equal(c.hindernisSettings.rules.find(r=>r.id==='pay11').value,75);
 await c.indStart('hindernis');const frozen=copy(c.hindernisState.config);
 doc.getElementById('hurdle-count').value='5';c.indRebuildRules();assert.equal(doc.querySelectorAll('[data-hurdle-from]').length,5);assert(await c.saveHurdleSettings());
 assert.equal(c.hindernisSettings.rules.length,5);assert.deepEqual(copy(c.hindernisState.config),frozen);
});

test('random settings choose a healthy count; invalid money and point input cannot silently save old values',async()=>{
 const f=ui(),c=f.c,doc=f.document;
 doc.querySelector('[data-hurdle-amount="2"]').value='0.001';assert.equal(await c.saveHurdleSettings(),false);
 doc.querySelector('[data-hurdle-amount="2"]').value='0.20';doc.querySelector('[data-hurdle-from="2"]').value='';assert.equal(await c.saveHurdleSettings(),false);
 doc.getElementById('hurdle-target').value='30';c.indRandomizeEvents();assert.equal(Number(doc.getElementById('hurdle-count').value),g.recommendedCount(30));assert(await c.saveHurdleSettings());
 assert(g.validSettings(copy(c.hindernisSettings)));
});

test('both app and dashboard standings show accumulated cash hurdles and the automatic final settlement',()=>{
 const c=g.defaults();c.rules.forEach(r=>r.enabled=r.id==='pay11');c.rules.find(r=>r.id==='pay11').value=75;
 let s=start('hindernis',c);s.scores.A=10;s=roll(s,1);let doc=parseHTML(view.renderIndividualBoard(s)).document;
 assert(doc.querySelector('thead').textContent.includes('Strafen'));assert.equal(doc.querySelector('.ind-penalty').textContent,'0,75 €');
 s.index=0;s.scores.A=89;s.scores.B=70;const out=step(s,'throw',{kind:'pins',pins:1});doc=parseHTML(view.renderIndividualBoard(out.state)).document;
 const rows=[...doc.querySelector('.ind-hurdle-split table tbody').children];assert.equal(rows[0].querySelector('.ind-penalty').textContent,'0,75 €');assert.equal(rows[1].querySelector('.ind-penalty').textContent,'0,23 €');
 assert(doc.documentElement.textContent.includes('🏆 A'));assert(!doc.querySelector('.ind-turn'));assert(read('dashboard.html').includes('renderIndividualBoard(data)'));
});

test('hurdle charges are one summed item per member/evening, including multiple games, and undo lowers it',()=>{
 const app=read('js/app.js'),a=app.indexOf('function getMissingGameCharges('),b=app.indexOf('\nfunction calcNormalStrafenRaw',a);
 const entry=(id,cents,extra={})=>({id,personName:'A',amountCents:cents,reason:'Hindernislauf · Hindernis 11',eveningStartedAt:evening,...extra});
 const ledger=[entry('one',20,{gameId:'first'}),entry('two',30,{gameId:'second'}),entry('end',115,{reason:'Hindernislauf · Endabrechnung'}),entry('seven',40,{reason:'7er-Spiel · Abweichungen'}),entry('otherperson',500,{personName:'B'}),entry('old',600,{eveningStartedAt:'old'})];
 const env={strafenHistory:[],individualGameLedger:ledger,currentEveningStartedAt:evening};
 const charges=new Function('env','with(env){'+app.slice(a,b)+';return getMissingGameCharges;}')(env);
 const original=JSON.stringify(ledger),first=charges({name:'A',freeStrafen:[]});assert.equal(first.length,2);assert.equal(first[0].reason,'Hindernislauf');assert.equal(first[0].amount,1.65);assert(!first[0].onTop);assert.equal(first[1].amount,.4);assert.equal(JSON.stringify(ledger),original);
 env.individualGameLedger=ledger.filter(x=>x.id!=='two');assert.equal(charges({name:'A'})[0].amount,1.35);
 assert(read('js/strafe-pdf.js').includes('...getMissingGameCharges(person)'));
});
