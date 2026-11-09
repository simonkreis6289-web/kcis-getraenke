const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),source=read('tests/v197-regression.cjs'),a=source.indexOf('function treeFixture()'),b=source.indexOf("\ntest('Tannenbaum dashboard",a),treeFixture=new Function('read',source.slice(a,b)+';return treeFixture;')(read);
test('both teams show 0, up to 15 individual strikes, then an exact growing count next to the boxes',()=>{
 const {base,render}=treeFixture();for(const count of [0,1,5,10,14,15,16,17,31,99,100,321]){
  const side={remaining:{...base},strikes:Array.from({length:count},()=>({number:5,amount:.5}))},doc=parseHTML(render({teams:{T1:side,T2:side}})).document,row=[...doc.querySelectorAll('.tree-row')].find(r=>r.querySelector('.tree-number').textContent==='5');
  for(const lane of row.querySelectorAll('.tree-lane')){const strikes=lane.querySelector('.tree-strikes');assert.equal(strikes.getAttribute('aria-label'),count+' Striche');assert.equal(strikes.querySelectorAll('.tree-strike').length,count<=15?count:0);assert.equal(strikes.textContent,String(count>15?count:count===0?0:''));assert(lane.querySelector('.tree-side'));assert.equal(strikes.previousElementSibling.classList.contains('tree-side'),true);}
 }
});
test('undo across the threshold restores 15 marks without losing the total or the red styling',()=>{
 const {base,render}=treeFixture(),side={remaining:{...base},strikes:Array.from({length:16},()=>({number:5,amount:.5}))};let doc=parseHTML(render({teams:{T1:side}})).document;assert.equal(doc.querySelector('.tree-strikes-count').textContent,'16');side.strikes.pop();doc=parseHTML(render({teams:{T1:side}})).document;assert.equal(doc.querySelectorAll('.tree-strike').length,15);assert.equal(doc.querySelectorAll('.tree-strikes-count').length,0);
 const css=read('css/dashboard-tannenbaum.css');assert.match(css,/color:#d62828/);assert.match(css,/grid-template-columns:repeat\(5,3px\)/);
});
