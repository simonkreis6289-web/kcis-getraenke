const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(path.join(__dirname,'../js/dashboard-toast-stack.js'),'utf8');
function fixture(viewport=800){
 const {document}=parseHTML('<html><body><footer class="dashboard-footer"></footer></body></html>');
 const listeners={},c={document,innerHeight:viewport,addEventListener:(key,fn)=>listeners[key]=fn};
 document.querySelector('footer').getBoundingClientRect=()=>({top:c.innerHeight-40});
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 function card(size){
  const box=document.createElement('div');box.className='dashboard-throw-popup';box.hidden=true;
  box.getBoundingClientRect=()=>({height:box.hidden?0:size});document.body.append(box);
  return box;
 }
 const bottom=box=>parseFloat(box.style.getPropertyValue('--toast-stack-bottom'));
 return {c,stack:c.KCToastStack,card,bottom,resize:()=>listeners.resize()};
}
test('mixed toast heights stack above older cards and close the gap after one disappears',()=>{
 const f=fixture(),older=f.card(110),second=f.card(140),third=f.card(90);
 for(const box of [older,second,third])f.stack.present(box,()=>{});
 assert.equal(f.bottom(older),72);
 assert.equal(f.bottom(second),72+110+12);
 assert.equal(f.bottom(third),72+110+12+140+12);
 second.hidden=true;f.stack.release(second);
 assert.equal(f.bottom(third),72+110+12);
 assert.equal(third.hidden,false);
});
test('when the viewport is full, the next toast starts its display time only after space becomes free',()=>{
 const f=fixture(400),first=f.card(200),second=f.card(200),started=[];
 f.stack.present(first,()=>started.push('first'));
 f.stack.present(second,()=>started.push('second'));
 assert.deepEqual(started,['first']);assert(second.hidden);
 first.hidden=true;f.stack.release(first);
 assert.deepEqual(started,['first','second']);assert(!second.hidden);
 assert.equal(f.bottom(second),58);
});
test('resizing admits waiting cards and cancelling a waiting card prevents it from appearing',()=>{
 const f=fixture(400),first=f.card(180),cancelled=f.card(180),next=f.card(180),started=[];
 f.stack.present(first,()=>{});
 f.stack.present(cancelled,()=>started.push('cancelled'));f.stack.release(cancelled);
 f.stack.present(next,()=>started.push('next'));
 assert(next.hidden);f.c.innerHeight=800;f.resize();
 assert.deepEqual(started,['next']);assert(cancelled.hidden);assert(!next.hidden);
 assert.equal(f.bottom(next),72+180+12);
});
