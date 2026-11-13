/* Zahlen zentrieren, Textspalten links lassen; auch für nachgerenderte Spieltabellen. */
(() => {
 const numeric=/^[\s\d.,+−–\-:;/%€×x()=*·]+$/u;
 const pending=new Set();let frame=0;
 function classify(table){for(const cell of table.querySelectorAll('td,th')){
  const text=cell.textContent.trim(),primary=cell.querySelector('strong')?.textContent.trim(),isNumber=!!text&&numeric.test(text)||!!primary&&numeric.test(primary)||!!cell.querySelector('.counter,.counter-val,.penalty-counter');
  cell.classList.toggle('kc-numeric-cell',isNumber);
  cell.classList.toggle('kc-text-cell',!isNumber&&cell.tagName==='TD'&&!cell.querySelector('input,button,select'));
 }}
 function flush(){frame=0;for(const table of pending)if(table.isConnected!==false)classify(table);pending.clear();}
 function schedule(){if(!frame)frame=requestAnimationFrame(flush);}
 for(const table of document.querySelectorAll('table'))classify(table);
 if(typeof MutationObserver==='function')new MutationObserver(records=>{
  for(const r of records){const target=r.target.nodeType===1?r.target:r.target.parentElement,table=target?.closest?.('table');if(table)pending.add(table);
   for(const node of r.addedNodes||[])if(node.nodeType===1){if(node.tagName==='TABLE')pending.add(node);for(const table of node.querySelectorAll('table'))pending.add(table);}
  }if(pending.size)schedule();
 }).observe(document.body,{subtree:true,childList:true,characterData:true});
 window.KCTableAlignment=Object.freeze({classify,flush});
})();
