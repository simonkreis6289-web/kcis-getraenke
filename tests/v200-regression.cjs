const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),source=read('tests/v197-regression.cjs'),a=source.indexOf('function treeFixture()'),b=source.indexOf("\ntest('Tannenbaum dashboard",a),treeFixture=new Function('read',source.slice(a,b)+';return treeFixture;')(read);
test('both number lanes reserve the widest original or restored row, regardless of crossed-out boxes',()=>{
 const {base,render}=treeFixture();for(const [left,right,expected] of [[0,0,5],[5,5,5],[7,5,7],[2,9,9]]){
  const state={teams:{T1:{remaining:{...base,5:left}},T2:{remaining:{...base,5:right}}}},doc=parseHTML(render(state)).document,board=doc.querySelector('.tree-v138');assert.equal(board.dataset.treeSlots,String(expected));assert.equal(board.style.getPropertyValue('--tree-slots'),String(expected));const row=[...doc.querySelectorAll('.tree-row')].find(r=>r.querySelector('.tree-number').textContent==='5');assert.equal(row.querySelectorAll('[data-team=T1] .tree-ball').length,Math.max(5,left));assert.equal(row.querySelectorAll('[data-team=T2] .tree-ball').length,Math.max(5,right));
 }
});
test('custom starting trees also reserve sufficient slots and preserve exact strike counts',()=>{
 const {base,render}=treeFixture();base[4]=8;const state={teams:{T1:{remaining:{...base},strikes:Array.from({length:15},()=>({number:4,amount:.4}))},T2:{remaining:{...base},strikes:Array.from({length:16},()=>({number:4,amount:.4}))}}},doc=parseHTML(render(state)).document;assert.equal(doc.querySelector('.tree-v138').dataset.treeSlots,'8');assert.equal(doc.querySelectorAll('.tree-strike').length,15);assert.equal(doc.querySelector('.tree-strikes-count').textContent,'16');
});
