const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const previous=read('tests/v230-player-rows.cjs'),{app,tv,fullApp}=new Function('require','__dirname',previous.slice(0,previous.indexOf('const keys='))+';return {app,tv,fullApp};')(require,__dirname);
async function lottery(){const a=await app();a.run('lotterieState.columnCount=2;lotterieState.columns=[1,2]');a.document.getElementById('lotterie-column-count').value='2';return a;}
test('Lattenzaun uses four aligned cells with grouped fences and a single latest throw in its header in app and TV',{timeout:60000},async()=>{
 const a=await app();a.run('extraGameSettings.lattenzaun.slats=35');await a.c.indStart('lattenzaun');await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:4});await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:6});assert(await a.c.KCSharedSync.waitForUpload());const d=tv(a.db),before=JSON.stringify(a.db.root());
 for(const doc of [a.document,d.document]){
  const rows=[...doc.querySelectorAll('.extra-fence-row')];assert.equal(rows.length,4);
  for(const row of rows){assert.equal(row.children.length,4);assert(row.children[0].classList.contains('extra-fence-name'));assert(row.children[1].classList.contains('extra-fence'));assert.equal(row.children[1].querySelectorAll('i').length,35);assert.equal(row.children[1].style.getPropertyValue('--fence-slats'),'35');assert(row.children[2].classList.contains('extra-fence-count'));assert(row.children[3].classList.contains('extra-fence-price'));}
  assert.equal(rows[0].querySelector('.extra-fence-name').textContent,'B');assert.equal(doc.querySelector('.extra-fence-heading .extra-fence-last b').textContent,'6 Holz');assert.equal(doc.querySelectorAll('.extra-fence-last').length,1);assert(doc.querySelector('.extra-fence-next').textContent.includes('C'));assert(!doc.querySelector('.extra-fence-row .extra-fence-last'));
  const charged=rows.find(r=>r.querySelector('.extra-fence-name').textContent==='A');assert.equal(charged.querySelectorAll('.extra-fence i.filled').length,2);assert.equal(charged.querySelector('.extra-fence-count b').textContent,'2 / 35');assert.equal(charged.querySelector('.extra-fence-price').textContent,'0,20 €');
 }
 a.c.renderIndividualGame('lattenzaun');d.update();assert.equal(JSON.stringify(a.db.root()),before,'rendering never changes slats or prices');
});
test('Lotterie has an explicit draw button, starts with its chosen player, and cancellation does not start a game',{timeout:60000},async()=>{
 const a=await lottery(),button=a.document.getElementById('lotterie-draw-start-btn');assert.equal(button.getAttribute('onclick'),'startLotterieGame(true)');assert.equal(a.c.KCStartReview.key(button),'lotterie');
 await a.c.startLotterieGame(true);assert(a.run('soloStartDrawState.open'));assert(!a.run('lotterieState.active'));a.c.closeSoloStartDraw();assert(!a.run('lotterieState.active'));
 await a.c.startLotterieGame(true);const drawn=a.run('soloStartDrawState.players[2]');a.run('soloStartDrawState.selected=soloStartDrawState.players[2]');await a.c.confirmSoloStartDraw();assert(await a.c.KCSharedSync.waitForUpload());assert.equal(a.run('lotterieState.startPlayer'),drawn);assert.equal(a.c.getLotteriePlayers()[0].name,drawn);assert.equal(a.db.root().lotterieState.startPlayer,drawn);
 assert(!a.document.querySelector('#tab-lotterie>.game-input-panel'));assert(a.document.querySelector('#lotterie-board button[onclick^="openLotterieThrowModal("]'));assert(a.document.querySelector('#tab-lotterie [data-abort-game]'));
});
test('second and subsequent Lotterie cell inputs retain the numeric keypad and book only the selected cells',{timeout:60000},async()=>{
 const a=await lottery();await a.c.startLotterieGameFinal('A');
 for(const [name,col,value] of [['A',0,4],['B',0,6],['A',1,3]]){
  a.c.openLotterieThrowModal(name,col);const modal=a.document.getElementById('lotterie-throw-modal');assert(!modal.classList.contains('hidden'));assert.equal(modal.querySelectorAll('.game-pinpad').length,1);assert.equal(modal.querySelectorAll('.game-pinpad-numbers button').length,10);assert.equal(modal.querySelectorAll('.game-pinpad-specials button').length,2);
  await modal.querySelector('[data-pin="'+value+'"]').onclick();assert(await a.c.KCSharedSync.waitForUpload());assert.equal(a.db.root().lotterieState.throws[name][col],value);assert(!a.document.querySelector('#tab-lotterie>.game-input-panel'));
 }
 assert.equal(a.db.root().lotterieState.throws.B[1],null);
});
test('repeated Darts and Tannenbaum dialogs also rebuild a single clean keypad',{timeout:60000},async()=>{
 const a=await app();await a.c.startDartsGame();for(const [open,id] of [['openDartsThrowModal','darts-throw-modal'],['openTannenbaumThrowModal','tannenbaum-throw-modal']])for(let i=0;i<3;i++){
  a.c[open]('T1');const modal=a.document.getElementById(id);assert.equal(modal.querySelectorAll('.game-pinpad').length,1,open+' '+i);assert.equal(modal.querySelectorAll('.game-pinpad-numbers button').length,10);assert.equal(modal.querySelectorAll('.game-pinpad-specials button').length,2);
 }
});
test('arithmetic signs sit between the five throw columns in app and TV while each field keeps its own input target',{timeout:60000},async()=>{
 const a=await app();await a.c.startPlusminusGame();a.c.choosePlusminusSlot(2);await a.c.applyPlusminusThrow(7);assert(await a.c.KCSharedSync.waitForUpload());const d=tv(a.db);
 for(const doc of [a.document,d.document]){
  const table=doc.querySelector('.plusminus-table,.tv-plusminus');assert(table);
  assert.deepEqual([...table.querySelectorAll('thead th')].map(x=>x.textContent),['Spieler','①','+','②','−','③','×','④','÷','⑤','Ergebnis']);
  const first=table.querySelector('tbody tr');assert.equal(first.children.length,11);assert.deepEqual([...first.querySelectorAll('.pm-operator')].map(x=>x.textContent),['+','−','×','÷']);
  const player=[...table.querySelectorAll('tbody tr')].find(r=>r.firstElementChild.textContent==='A');assert.equal(player.children[5].textContent,'7');
 }
 a.c.choosePlusminusSlot(4);await a.c.applyPlusminusThrow(6);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(a.db.root().plusminusState.rows.B[4].value,6);assert.equal(a.db.root().plusminusState.rows.A[2].value,7);
});
test('1000 supports per-round forward, reverse and free placement with custom Gosse/Kranz digits, then undo restores the pending choice',()=>{
 const source=read('tests/v226-games.cjs'),{game,core}=new Function('require','__dirname',source.slice(0,source.indexOf("test('Poker"))+';return {game,core};')(require,__dirname);
 const g=game('tausend',{roundModes:['forward','reverse','free'],gutterValue:8,kranzValue:0});
 for(const pins of [4,6,3,1,2,3,4,6,3,1,1,1])g.roll(pins);
 assert.deepEqual(Array.from(g.state.results.A,r=>r.value),[463,364]);assert.equal(g.state.round,3);
 g.roll(0,'gosse');assert.equal(g.state.turn[0].pins,8);assert.equal(g.state.history.at(-1).kind,'gosse');g.roll(0,'kranz');assert.equal(g.state.turn[1].pins,0);g.roll(2);assert(g.state.pendingArrange);g.run('arrange',{order:[2,0,1]});assert.equal(g.state.results.A[2].value,280);
 for(const pins of [3,2,1])g.roll(pins);g.run('arrange',{order:[0,1,2]});assert(g.state.finished);g.run('undo');assert(g.state.pendingArrange);assert.equal(g.state.turn.length,3);assert.deepEqual(Array.from(g.state.config.roundModes),['forward','reverse','free']);
 for(const modes of [[],['wrong'],Array(10).fill('free')])assert(!core.KCRoundGames.validSettings('tausend',{...core.KCRoundGames.defaults('tausend'),roundModes:modes}));
 const old={rounds:6,gutterValue:9,kranzMode:'fixed',kranzValue:8,target:1000};assert.equal(core.KCRoundGames.thousandMode(old,4),'free');assert.equal(core.KCRoundGames.thousandMode(old,5),'reverse');assert.equal(core.KCRoundGames.thousandMode(old,6),'forward');
});
test('1000 settings save each round mode and both digit values across upload/reload without changing a running game',{timeout:60000},async()=>{
 const a=await app(),select=(doc,id,value)=>{for(const option of doc.getElementById(id).querySelectorAll('option'))if(option.value===value)option.setAttribute('selected','');else option.removeAttribute('selected');};
 a.document.getElementById('round-tausend-gutterValue').value='8';for(const [i,mode] of ['forward','reverse','free'].entries())select(a.document,'round-tausend-mode-'+i,mode);
 select(a.document,'kranz-rule-tausend','0');await a.c.KCKranzUI.save('tausend');assert(await a.c.saveRoundSettings('tausend'));await a.c.indStart('tausend');
 assert.deepEqual(Array.from(a.c.indGet('tausend').config.roundModes),['forward','reverse','free']);assert.equal(a.c.indGet('tausend').config.gutterValue,8);assert.equal(a.c.indGet('tausend').kranzRule.value,0);
 await a.c.extraThrow('tausend','gosse');await a.c.extraThrow('tausend','kranz');await a.c.indAction('tausend','throw',{kind:'pins',pins:2});assert(await a.c.KCSharedSync.waitForUpload());assert.equal(a.db.root().tausendState.results.A[0].value,802);
 const b=fullApp(a.db);await b.select();assert.equal(b.document.getElementById('round-tausend-gutterValue').value,'8');assert.equal(b.document.getElementById('round-tausend-mode-0').value,'forward');assert.equal(b.document.getElementById('round-tausend-mode-2').value,'free');assert.equal(b.c.indGet('tausend').kranzRule.value,0);
 select(b.document,'round-tausend-mode-0','free');assert(await b.c.saveRoundSettings('tausend'));assert.equal(b.c.indGet('tausend').config.roundModes[0],'forward','active game keeps the frozen mode');assert.equal(b.run('extraGameSettings.tausend.roundModes[0]'),'free');
 b.document.getElementById('round-tausend-rounds').value='9';b.c.roundThousandModesChanged();assert.equal(b.document.querySelectorAll('#round-tausend-modes select').length,9);assert.equal(b.document.getElementById('round-tausend-mode-0').value,'free');
});
