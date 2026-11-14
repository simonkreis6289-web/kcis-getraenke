/* Nur die Anzeige drehen: gespeicherte Teilnehmer und Eingabeindizes bleiben unverändert. */
(() => {
  function order(players,current,{running=false,name=p=>typeof p==='string'?p:p.name,unavailable=()=>false}={}){
    const waiting=players.filter(p=>!unavailable(p)),done=players.filter(unavailable);
    const index=running?waiting.findIndex(p=>name(p)===current):-1;
    return [...(index>0?[...waiting.slice(index),...waiting.slice(0,index)]:waiting),...done];
  }
  window.KCPlayerRows=Object.freeze({order});
})();
