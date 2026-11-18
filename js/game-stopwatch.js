/* Spielzeit als gespeicherte Abschnitte. Beim Anzeigen wird nur der laufende Abschnitt berechnet. */
(() => {
  const now=()=>Math.floor(window.KCSharedClock?.now()??Date.now());
  const identity=game=>game?.id||game?.startedAt||'';
  const start=at=>({elapsedMs:0,runningSince:at,finished:false,resumeOnUndo:false});
  const excluded=(key,countdown)=>key==='ballermann'||key==='tannenbaum'&&countdown;
  function clock(key,game,countdown=false){
    if(!game||!game.active&&!game.finished||excluded(key,countdown))return null;
    if(Object.hasOwn(game,'stopwatch'))return game.stopwatch;
    const startedAt=Date.parse(game.startedAt);
    return game.active&&!game.finished&&Number.isFinite(startedAt)?start(startedAt):null;
  }
  function elapsed(watch,at=now()){
    return watch.elapsedMs+(watch.runningSince===null?0:Math.max(0,at-watch.runningSince));
  }
  function format(ms){
    const seconds=Math.floor(ms/1000),hours=Math.floor(seconds/3600);
    return [ ...(hours?[hours]:[]), Math.floor(seconds/60)%60, seconds%60 ].map(n=>String(n).padStart(2,'0')).join(':');
  }
  function finish(watch,at){
    return watch.finished?watch:{elapsedMs:elapsed(watch,at),runningSince:null,finished:true,resumeOnUndo:watch.runningSince!==null};
  }
  function advance(key,before,next,{at=now(),countdown=false,newRound=false}={}){
    if(newRound)return next.active?excluded(key,countdown)?null:start(at):undefined;
    const previous=clock(key,before,countdown);
    if(!previous)return before&&Object.hasOwn(before,'stopwatch')?null:undefined;
    if(next.finished)return finish(previous,at);
    if(!next.active)return null;
    if(previous.finished)return {...previous,finished:false,runningSince:previous.resumeOnUndo?at:null,resumeOnUndo:false};
    return previous;
  }
  function updateLegacy(key,current,after,at=now()){
    const stateKey=key+'State',before=current[stateKey],next=after[stateKey];
    if(!next)return after;
    const newRound=next.active&&(identity(next)!==identity(before)||!before?.active&&!before?.finished);
    const watch=advance(key,before,next,{at,countdown:after.teamStopwatchActive,newRound});
    const out=watch===undefined?after:{...after,[stateKey]:{...next,stopwatch:watch}};
    // Einige ältere Spiele legen ihr Ergebnis ab und setzen das Spielfeld im selben Schritt zurück.
    const source=watch||clock(key,before,after.teamStopwatchActive);
    if(!source)return out;
    const ids=new Set((current.strafenHistory||[]).map(entry=>entry.id));
    const completed=(after.strafenHistory||[]).filter(entry=>!ids.has(entry.id)&&(entry.gameKey||entry.type)===key);
    if(!completed.length)return out;
    const durationMs=finish(source,at).elapsedMs,closures=new Set(completed.map(entry=>entry.id));
    const attach=entry=>closures.has(entry.id)?{...entry,durationMs}:entry;
    return {...out,strafenHistory:after.strafenHistory.map(attach)};
  }
  function toggle(key,game,countdown,request,at=now()){
    const watch=clock(key,game,countdown);
    if(!game?.active||game.finished||!watch||watch.finished||identity(game)!==request.gameId||
       watch.runningSince!==request.runningSince||watch.elapsedMs!==request.elapsedMs){
      throw Error('Die Stoppuhr wurde inzwischen geändert. Bitte erneut versuchen.');
    }
    return watch.runningSince===null?{...watch,runningSince:at}:{...watch,runningSince:null,elapsedMs:elapsed(watch,at)};
  }
  function paint(element,watch,at=now()){
    if(!element)return;
    element.hidden=!watch;
    if(!watch)return;
    const status=watch.finished?'Spieldauer':watch.runningSince===null?'Pausiert':'Spielzeit';
    const label=element.querySelector('[data-stopwatch-label]'),time=element.querySelector('time');
    const text=format(elapsed(watch,at));
    if(label.textContent!==status)label.textContent=status;
    if(time.textContent!==text)time.textContent=text;
    element.classList.toggle('is-paused',!watch.finished&&watch.runningSince===null);
  }
  window.KCGameStopwatch=Object.freeze({now,identity,clock,elapsed,format,advance,updateLegacy,toggle,paint});
})();
