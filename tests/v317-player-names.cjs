const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=name=>fs.readFileSync(name,'utf8');
function fixture(html){
 const {document,window}=parseHTML('<html><body>'+html+'</body></html>');
 const c={document,persons:[{name:'Alexander',gameAlias:'Alex'},{name:'Alexander Schmidt'},{name:'Simon',gameAlias:'BVB'}],MutationObserver:window.MutationObserver};c.window=c;
 vm.createContext(c);vm.runInContext(read('js/player-names.js'),c);
 return {c,document,api:c.KCPlayerNames};
}
test('game aliases are display-only across every game and seating; accounting and member names remain unchanged',()=>{
 const keys=['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend','abschreibung','lottokoenig','tageskurs','swingerclub','sitzordnung'];
 const f=fixture(keys.map(key=>'<section id="tab-'+key+'"><button data-player-row="Alexander" onclick="choose(\'Alexander\')">Alexander · Simon</button></section>').join('')+'<aside id="drinks">Alexander</aside><aside id="fines">Alexander</aside><aside id="members">Alexander</aside>');
 for(const key of keys){
  const button=f.document.querySelector('#tab-'+key+' button');
  assert.equal(button.textContent,'Alex · BVB',key);
  assert.equal(button.dataset.playerRow,'Alexander');assert.equal(button.getAttribute('onclick'),"choose('Alexander')");
 }
 for(const id of ['drinks','fines','members'])assert.equal(f.document.getElementById(id).textContent,'Alexander');
 assert.equal(f.c.persons[0].name,'Alexander');
});
test('aliases can change or be cleared without chaining aliases or changing longer names',()=>{
 const f=fixture('<div id="game-body">Alexander · Simon · Alexander Schmidt · Alexanders · <input value="Alexander"></div>'),root=f.document.getElementById('game-body');
 assert.equal(root.textContent,'Alex · BVB · Alexander Schmidt · Alexanders · ');
 f.c.persons[0].gameAlias='Simon';f.api.refresh();
 assert.equal(root.textContent,'Simon · BVB · Alexander Schmidt · Alexanders · ');
 f.c.persons[0].gameAlias='';f.api.refresh();
 assert.equal(root.textContent,'Alexander · BVB · Alexander Schmidt · Alexanders · ');
 assert.equal(root.querySelector('input').value,'Alexander');
 f.c.persons[0].gameAlias='<img src=x onerror=bad()>';f.api.refresh();
 assert(root.textContent.includes('<img'));assert.equal(root.querySelector('img'),null);
});
test('new game rows and text changes get aliases automatically; dashboard receives its explicit roster',async()=>{
 const f=fixture('<div id="game-body"></div><div id="dashboard-seating"></div>');
 f.api.configure([{name:'Alexander',gameAlias:'Al'}]);
 f.document.getElementById('game-body').innerHTML='<b data-player-row="Alexander">Alexander</b>';
 f.document.getElementById('dashboard-seating').textContent='Platz 3 · Alexander';
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.document.querySelector('b').textContent,'Al');
 assert.equal(f.document.getElementById('dashboard-seating').textContent,'Platz 3 · Al');
 f.document.querySelector('b').textContent='Letzter Wurf · Alexander · 3 Holz';
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.document.querySelector('b').textContent,'Letzter Wurf · Al · 3 Holz');
});
test('all player column colors use a very light opaque fill and the exact player border color',()=>{
 const w={};new Function('window',read('js/player-colors.js'))(w);
 for(const color of ['#fde100','#004d9d','#785646','#bf374d']){
  const style=w.KCPlayerColors.chartStyle(color);
  assert(style.includes('--player-chart-color:'+color));
  const fill=style.match(/--player-chart-fill:#([a-f0-9]{6})/)[1];
  for(let i=0;i<6;i+=2)assert(parseInt(fill.slice(i,i+2),16)>=230);
 }
});
