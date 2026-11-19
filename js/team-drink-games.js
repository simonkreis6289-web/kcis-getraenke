/* Gemeinsamer Katalog für Getränkerunden von Seiten und tatsächlich ausgelosten Paaren. */
(()=>{
 const norm=s=>String(s||'').toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]/gu,'');
 function list(catalog,custom=[]){const known=new Map(catalog.flatMap(g=>[[norm(g.title),g],[norm(g.key),g]])),out=catalog.filter(g=>window.KCGameOverview.category(g.key)!=='solo').map(g=>({...g,category:window.KCGameOverview.category(g.key)}));for(const name of custom)if(!known.has(norm(name))&&!out.some(g=>norm(g.title)===norm(name)))out.push({key:'custom_'+norm(name),title:name,category:'sides'});return out.sort((a,b)=>a.title.localeCompare(b.title,'de'));}
 function teams(game,state,people,label){
  const active=p=>p&&p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly;
  if(game?.category==='pairs'){
   let lineups=state?.teams||[];
   if(game.key==='swingerclub'&&state?.id){
    // While new partners are being chosen, pairs still contains the previous round's teams.
    const round=state.phase==='pairs'?state.round-1:state.round;
    lineups=(state.pairs||[]).map((pair,index)=>({id:'r'+round+'-t'+(index+1),players:pair.names}));
   }
   return lineups.map(team=>{
    const names=team.players||[],members=names.map(n=>people.find(p=>p.name===n)).filter(active);
    return {id:'pair:'+state.id+':'+team.id,label:names.join(' + '),members,
      available:!!state.id&&names.length>0&&members.length===names.length,gameId:state.id,teamId:team.id};
   });
  }
  return ['T1','T2'].map(id=>{const members=people.filter(p=>active(p)&&p.tisch===id);return {id,label:label(id),members,available:!!members.length};});
 }
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.KCTeamDrinkGames=Object.freeze({list,teams,escape});
})();
