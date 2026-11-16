const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const source=read('tests/v230-player-rows.cjs'),{app,tv,fullApp}=new Function('require','__dirname',source.slice(0,source.indexOf('const keys='))+';return {app,tv,fullApp};')(require,__dirname);
test('fences form complete five-packs plus a partial last pack without losing filled or empty slats',{timeout:60000},async()=>{
 const a=await app();await a.c.indStart('lattenzaun');const before=copy(a.c.indGet('lattenzaun'));
 for(const slats of [1,4,5,6,21,35,50]){
  const state={...copy(before),config:{...before.config,slats},scores:{...before.scores,A:Math.min(7,slats)}};
  const doc=parseHTML(a.c.renderExtraGameBoard(state)).document,row=doc.querySelector('.extra-fence-row'),groups=[...row.querySelectorAll('.extra-fence-group')];
  assert.equal(groups.length,Math.ceil(slats/5));assert.equal(row.querySelectorAll('.extra-fence i').length,slats);assert.equal(row.querySelectorAll('i.filled').length,Math.min(7,slats));assert(groups.every(g=>g.children.length>=1&&g.children.length<=5));assert(groups.slice(0,-1).every(g=>g.children.length===5));assert.equal(groups.at(-1).children.length,slats%5||5);assert.equal(row.children.length,4);assert.equal(doc.querySelector('.extra-fence-heading h2').textContent,'🪵 Lattenzaun');assert(doc.querySelector('.extra-fence-next').textContent.includes('A'));
 }
 assert.deepEqual(copy(a.c.indGet('lattenzaun')),before);
 const legacy={...copy(before),config:{...before.config}};delete legacy.config.slatColor;assert(a.c.KCExtraGames.validSettings('lattenzaun',legacy.config));const unsafe='red;--x:url(https://bad.test)';assert(!a.c.KCExtraGames.validSettings('lattenzaun',{...legacy.config,slatColor:unsafe}));legacy.config.slatColor=unsafe;const html=a.c.renderExtraGameBoard(legacy,{slatColor:unsafe});assert(!html.includes('bad.test'));assert(html.includes('--fence-color:#bc7949'));
});
test('selected slat color updates the active app and TV immediately, persists after reload, and leaves game values untouched',{timeout:60000},async()=>{
 const a=await app();await a.c.indStart('lattenzaun');await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:4});await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:6});assert(await a.c.KCSharedSync.waitForUpload());const d=tv(a.db),before=copy(a.db.root()),input=a.document.getElementById('extra-lattenzaun-slatColor');assert.equal(input.type,'color');input.value='#1263ab';assert(await a.c.saveExtraSettings('lattenzaun'));assert(await a.c.KCSharedSync.waitForUpload());d.update();
 for(const doc of [a.document,d.document]){assert.equal(doc.querySelector('.extra-fences').style.getPropertyValue('--fence-color'),'#1263ab');assert.equal(doc.querySelector('.extra-fence-last b').textContent,'6 Holz');assert(doc.querySelector('.extra-fence-next').textContent.includes('C'));assert.equal(doc.querySelectorAll('.extra-fence-last').length,1);}
 assert.equal(a.db.root().extraGameSettings.lattenzaun.slatColor,'#1263ab');assert.deepEqual(a.db.root().lattenzaunState,before.lattenzaunState);assert.deepEqual(a.db.root().persons,before.persons);
 const b=fullApp(a.db);await b.select();assert.equal(b.document.getElementById('extra-lattenzaun-slatColor').value,'#1263ab');assert.equal(b.document.querySelector('.extra-fences').style.getPropertyValue('--fence-color'),'#1263ab');
});
