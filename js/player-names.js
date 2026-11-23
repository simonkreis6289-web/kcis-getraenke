/* Spielnamen sind reine Darstellung; IDs, Spielstände und Buchungen behalten den Mitgliedsnamen. */
(()=>{
 const keys=['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend','abschreibung','lottokoenig','tageskurs','swingerclub'];
 const selector=['#game-body','#dashboard-seating','#tab-sitzordnung','#seating-choice-modal','#solo-start-draw-modal','#coinflip-modal','#table-assignment-modal','#sechs-assignment-modal','#kranz-modal','#assign-modal','#dashboard-throw-popup','#dashboard-club-event-toast.is-loser','#dashboard-club-event-toast.is-team-loss','#tv-starter-draw','.mensch-knockout-popup',...keys.flatMap(key=>['#tab-'+key,'#'+key+'-throw-modal','#'+key+'-penalty-player-modal','#'+key+'-thrower-modal','#'+key+'-hit-modal'])].join(',');
 const originals=new WeakMap();
 let supplied=null;
 const roster=()=>supplied||(typeof persons!=='undefined'?persons:[]);
 const clean=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,40):'';
 function display(name,people=roster()){
  return clean(people.find(person=>person.name===name)?.gameAlias)||String(name??'');
 }
 const word=char=>!!char&&(/[0-9_]/.test(char)||char.toLocaleLowerCase()!==char.toLocaleUpperCase());
 function formatter(people){
  const names=new Map(people.filter(p=>p.name).map(p=>[p.name,display(p.name,people)]));
  const namesWithAlias=[...names].filter(([name,alias])=>name!==alias);
  if(!namesWithAlias.length)return text=>text;
  // Include unchanged names too: an alias must never replace a part of a longer member name.
  const pattern=new RegExp([...names.keys()].sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  return text=>text.replace(pattern,(name,index,whole)=>word(whole[index-1])||word(whole[index+name.length])?name:names.get(name));
 }
 function apply(root,people=roster()){
  if(!root)return;
  const format=formatter(people);
  function visit(node){
   if(node.nodeType===3){
    const old=originals.get(node),source=old&&node.data===old.shown?old.source:node.data,shown=format(source);
    originals.set(node,{source,shown});if(node.data!==shown)node.data=shown;
    return;
   }
   if(node.nodeType!==1||node.matches('script,style,input,textarea,[contenteditable]'))return;
   for(const child of [...node.childNodes])visit(child);
  }
  visit(root);
 }
 function refresh(people=roster()){
  if(typeof document==='undefined')return;
  for(const root of document.querySelectorAll(selector))apply(root,people);
 }
 function configure(people){supplied=people;refresh();}
 window.KCPlayerNames=Object.freeze({display,clean,apply,refresh,configure,selector});
 if(typeof document==='undefined'||!document.body||typeof MutationObserver!=='function')return;
 new MutationObserver(records=>{
  const roots=new Set();
  for(const record of records){
   const parent=record.target.nodeType===1?record.target:record.target.parentElement;
   const scope=parent?.closest(selector);if(scope)roots.add(scope);
   for(const node of record.addedNodes||[]){
    const element=node.nodeType===1?node:node.parentElement,scope=element?.closest(selector);
    if(scope)roots.add(scope);
    if(node.nodeType===1)for(const root of node.querySelectorAll(selector))roots.add(root);
   }
  }
  for(const root of roots)if(root.isConnected)apply(root);
 }).observe(document.body,{subtree:true,childList:true,characterData:true});
 refresh();
})();
