/* Sechs-Tage-Rennen: Zweierteams, vier Würfe je Tag, sechs Tage. */
(() => {
  const clone=value=>JSON.parse(JSON.stringify(value));
  function empty(){return {id:'',revision:0,active:false,finished:false,readyToFinish:false,teams:[],rounds:[],roundIndex:0,teamIndex:0,turn:{wood:0,standing:9,used:[0,0],playerIndex:0},scores:{},history:[],commands:[],receipts:[],winners:[],bonus:false,startedAt:'',eveningStartedAt:''};}
  function nextTurn(){return {wood:0,standing:9,used:[0,0],playerIndex:0};}
  function team(state){return state.teams[state.teamIndex]||null;}
  function thrower(state){return team(state)?.players[state.turn.playerIndex]||'';}
  function quota(team){return team.players.length===1?4:2;}
  function loserGroups(state){
    const groups=[],losers=state.teams.filter(t=>!state.winners.includes(t.id)).slice().sort((a,b)=>(state.scores[a.id]||0)-(state.scores[b.id]||0));
    for(const t of losers){const score=state.scores[t.id]||0,last=groups[groups.length-1];if(last?.score===score)last.teamIds.push(t.id);else groups.push({score,teamIds:[t.id]});}
    return groups;
  }
  function scores(state){
    const values=Object.fromEntries(state.teams.map(t=>[t.id,0]));
    for(const round of state.rounds)for(const t of state.teams)values[t.id]+=round.complete?(round.points[t.id]||0):(round.wood[t.id]||0)*round.day;
    if(state.active&&!state.readyToFinish&&team(state))values[team(state).id]+=state.turn.wood*(state.roundIndex+1);
    return values;
  }
  function takeThrow(state,entry){
    const current=team(state),turn=state.turn,index=current.players.indexOf(entry.name);
    if(index<0||turn.used[index]>=quota(current))throw new Error('Jeder Partner hat genau zwei Würfe pro Tag; ein Einzelteam hat vier');
    let pins=entry.pins;
    if(entry.kind==='kranz'){if(turn.standing!==9)throw new Error('Kranz ist nur ins volle Bild möglich');pins=state.kranzValue??8;}
    else if(entry.kind==='gosse'||entry.kind==='miss')pins=0;
    else if(entry.kind!=='pins'||!Number.isInteger(pins)||pins<1||pins>turn.standing)throw new Error('Bitte nur die tatsächlich gefallenen, noch stehenden Kegel eingeben');
    turn.wood+=pins;turn.used[index]++;turn.standing=entry.kind==='kranz'&&state.kranzReset?9:turn.standing-pins;
    const recorded={...entry,pins,day:state.roundIndex+1,teamId:current.id};state.history.push(recorded);
    if(turn.used[0]+turn.used[1]===4){
      const round=state.rounds[state.roundIndex];round.wood[current.id]=turn.wood;
      if(state.teamIndex===state.teams.length-1){
        const best=Math.max(...Object.values(round.wood));round.complete=true;round.bonusWinners=state.bonus?state.teams.filter(t=>round.wood[t.id]===best).map(t=>t.id):[];
        round.points=Object.fromEntries(state.teams.map(t=>[t.id,(round.wood[t.id]+(round.bonusWinners.includes(t.id)?2:0))*round.day]));
        state.roundIndex++;state.teamIndex=0;
        if(state.roundIndex===6)state.readyToFinish=true;
        else state.rounds.push({day:state.roundIndex+1,wood:{},points:{},complete:false,bonusWinners:[]});
      }else state.teamIndex++;
      state.turn=nextTurn();
    }else{
      if(turn.standing===0)turn.standing=9;
      const other=1-index;turn.playerIndex=current.players.length===1?0:turn.used[other]<2?other:index;
    }
    state.scores=scores(state);return recorded;
  }
  function start(teams,bonus,id,now,evening,kranzValue,kranzReset=false){
    if(kranzValue!==undefined&&(!Number.isInteger(kranzValue)||kranzValue<1||kranzValue>12))throw Error('Kranzwert: 1 bis 12 Holz');
    if(!Array.isArray(teams)||teams.length<2||teams.length>8)throw new Error('Bitte zwei bis acht Teams bilden');
    const names=teams.flatMap(t=>t.players||[]);
    if(names.length<3||teams.some(t=>!Array.isArray(t.players)||![1,2].includes(t.players.length))||teams.filter(t=>t.players.length===1).length!==names.length%2||names.some(name=>typeof name!=='string'||!name.trim())||new Set(names.map(name=>name.trim().toLocaleLowerCase('de-DE'))).size!==names.length)throw new Error('Zweierteams bilden; bei ungerader Anzahl genau ein Einzelteam. Niemand darf doppelt spielen.');
    return {...empty(),id,active:true,...(kranzValue!==undefined?{kranzValue}:{}),kranzReset,teams:teams.map((t,i)=>({id:'R'+(i+1),name:'Team '+(i+1),players:t.players.slice()})),bonus:!!bonus,startedAt:now,eveningStartedAt:evening,rounds:[{day:1,wood:{},points:{},complete:false,bonusWinners:[]}]};
  }
  function command(previous,request,context){
    const before=previous||empty(),now=context.now;
    if(typeof request.opId!=='string'||!/^six_[a-zA-Z0-9_-]{1,100}$/.test(request.opId))throw new Error('Ungültige Spielaktion');
    if((before.commands||[]).includes(request.opId))return {state:clone(before),repeat:true};
    if((Number(before.revision)||0)!==request.expectedRevision)throw new Error('Spielstand wurde inzwischen geändert. Bitte aktualisieren.');
    let state=clone(before);
    if(request.action==='start'){
      if(before.active)throw new Error('Das aktuelle Rennen zuerst beenden oder abbrechen');
      if(typeof request.raceId!=='string'||!/^race_[a-zA-Z0-9_-]{1,100}$/.test(request.raceId))throw new Error('Ungültige Rennkennung');
      state=start(request.teams,request.bonus,request.raceId,now,context.eveningStartedAt,request.kranzValue??8,true);
      Object.assign(state,{gameFineFrozen:true,onTop:request.onTop===true,gameFineOnTop:request.onTop===true});
      const active=new Set(context.people.filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly).map(p=>p.name));
      if(state.teams.some(t=>t.players.some(name=>!active.has(name))))throw new Error('Teilnehmer sind nicht mehr aktiv. Bitte Auswahl aktualisieren.');
    }else{
      if(request.raceId!==state.id)throw new Error('Das Rennen wurde inzwischen gewechselt');
      if(request.action==='reset'){state=empty();state.eveningStartedAt=context.eveningStartedAt;}
      else{
        if(!state.active||state.finished)throw new Error('Dieses Rennen ist bereits beendet');
        if(request.action==='select'){
          if(state.readyToFinish||!Number.isInteger(request.playerIndex)||request.playerIndex<0||request.playerIndex>=team(state).players.length||state.turn.used[request.playerIndex]>=quota(team(state)))throw new Error(team(state).players.length===1?'Ein Einzelteam darf höchstens viermal werfen':'Jeder Partner darf höchstens zweimal werfen');
          state.turn.playerIndex=request.playerIndex;
        }else if(request.action==='throw'){
          if(state.readyToFinish)throw new Error('Alle sechs Tage sind gespielt');
          const name=thrower(state),person=context.people.find(p=>p.name===name);
          if(!person?.present||person.left||person.inactive||person.isDrinksOnly)throw new Error('Der Werfer ist nicht mehr aktiv');
          takeThrow(state,{id:request.opId,name,kind:request.kind,pins:Number(request.pins),at:now});
        }else if(request.action==='undo'){
          if(!state.history.length)throw new Error('Noch kein Wurf zum Zurücknehmen');
          const removed=state.history.pop(),history=state.history;
          const rebuilt=start(state.teams,state.bonus,state.id,state.startedAt,state.eveningStartedAt,state.kranzValue,state.kranzReset);
          for(const entry of history)takeThrow(rebuilt,entry);
          if(team(rebuilt)?.id===removed.teamId)rebuilt.turn.playerIndex=team(rebuilt).players.indexOf(removed.name);
          state={...state,...rebuilt};
        }else if(request.action==='finish'){
          if(!state.readyToFinish)throw new Error('Erst alle sechs Tage spielen');
          const best=Math.max(...Object.values(state.scores));state.winners=state.teams.filter(t=>state.scores[t.id]===best).map(t=>t.id);state.finished=true;state.active=false;
        }else throw new Error('Unbekannte Spielaktion');
      }
    }
    state.revision=(Number(before.revision)||0)+1;state.commands=[...(before.commands||[]),request.opId].slice(-512);state.receipts=(before.receipts||[]).slice(-63);state.scores=scores(state);
    return {state,repeat:false};
  }
  function effects(before,state,request,context){
    const changes=[],added=[],removed=[];
    if(request.action==='throw'){
      const entry=state.history[state.history.length-1],kind=entry.kind==='gosse'?'gosse':entry.kind==='kranz'?'kranz':entry.pins===9?'9er':'';
      if(kind){
        const key=context.catalog.find(s=>kind==='gosse'?/gosse|pudel/i.test(s.label):/9er|kranz|durchgeworfen/i.test(s.label))?.key;
        if(!key)throw new Error('Strafenart '+kind+' fehlt');
        const names=kind==='gosse'?[entry.name]:context.people.filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly&&p.name!==entry.name).map(p=>p.name);
        for(const personName of names)changes.push({personName,key,delta:1});
        const statId='sixdays_'+state.id+'_'+entry.id;entry.statId=statId;
        added.push({id:statId,sixDaysRaceId:state.id,type:kind,thrower:entry.name,punished:names,eveningStartedAt:state.eveningStartedAt,eventDate:context.now.slice(0,10),createdAt:context.now,club:context.club});
      }
      entry.penalties=clone(changes);
    }else if(request.action==='undo'){
      const last=before.history[before.history.length-1];for(const change of last.penalties||[])changes.push({...change,delta:-change.delta});if(last.statId)removed.push(last.statId);
    }else if(request.action==='finish'){
      const groups=loserGroups(state);
      for(let i=0;i<Math.min(3,groups.length);i++){
        const rank=i+1,key=context.catalog.find(s=>new RegExp('^'+rank+'\\.?\\s*verlierer(?:\\b|\\s|$)','i').test(String(s.label||'').trim())||(rank===1&&/erster verlierer/i.test(s.label)))?.key;
        if(!key)throw new Error('Strafe „'+rank+'. Verlierer“ fehlt');
        for(const id of groups[i].teamIds)for(const personName of state.teams.find(t=>t.id===id).players)changes.push({personName,key,delta:1});
      }
      state.teamLoserGroups=groups;
      state.finishPenalties=clone(changes);
    }
    return {changes,added,removed};
  }
  window.KCSixDays=Object.freeze({empty,team,thrower,scores,command,effects,quota,loserGroups});
})();

function sixEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const SIX_COLORS=['#1976b8','#cc3b3b','#25834c','#9058bd','#a66b10','#168b93','#c04380','#526675'];
function renderSixDaysBoard(state){
  const s=state,teams=s.teams||[];if(!teams.length)return '';
  const values=s.scores||{},maximum=Math.max(1,...Object.values(values));
  const sorted=teams.slice().sort((a,b)=>(values[b.id]||0)-(values[a.id]||0));
  const current=KCSixDays.team(s),player=KCSixDays.thrower(s);
  const winners=teams.filter(t=>(s.winners||[]).includes(t.id));
  const headline=s.finished?'🏆 '+winners.map(t=>t.name+' ('+t.players.join(' / ')+')').join(' · '):s.readyToFinish?'🏁 Sechs Tage gespielt – Rennen abschließen':'Tag '+(s.roundIndex+1)+' von 6 · Multiplikator ×'+(s.roundIndex+1);
  const tracks=sorted.map(t=>{const index=teams.findIndex(team=>team.id===t.id),points=Number(values[t.id])||0,rank=sorted.findIndex(other=>(values[other.id]||0)===points)+1,loserRank=(s.teamLoserGroups||[]).findIndex(g=>g.teamIds.includes(t.id));return '<div class="six-track '+(s.active&&!s.readyToFinish&&current?.id===t.id?'six-current':'')+'" style="--six-color:'+SIX_COLORS[index%SIX_COLORS.length]+'"><div class="six-track-label"><strong>'+rank+'. '+sixEscape(t.name)+'</strong><b>'+points+' Punkte</b></div><small>'+t.players.map(sixEscape).join(' · ')+(t.players.length===1?' · Einzelteam':'')+'</small>'+(loserRank>=0&&loserRank<3?'<span class="six-loser-label">'+(loserRank+1)+'. Verlierer +1</span>':'')+'<div class="six-track-road" aria-hidden="true"><i style="width:'+Math.max(0,Math.min(100,points/maximum*100))+'%"></i><span style="left:clamp(0px,calc('+Math.max(0,Math.min(100,points/maximum*100))+'% - 28px),calc(100% - 28px))">🚴</span></div></div>';}).join('');
  const table=teams.map(t=>'<tr><th scope="row">'+sixEscape(t.name)+'</th>'+Array.from({length:6},(_,index)=>{const round=s.rounds[index];let value='—';if(round?.complete)value=round.points[t.id]+'<small>'+round.wood[t.id]+' Holz'+(round.bonusWinners.includes(t.id)?' +2 Bonus':'')+' ×'+(index+1)+'</small>';else if(round&&round.wood[t.id]!=null)value=(round.wood[t.id]*(index+1))+'<small>vorläufig</small>';else if(index===s.roundIndex&&s.active&&!s.readyToFinish&&current?.id===t.id)value=(s.turn.wood*(index+1))+'<small>offen</small>';return '<td>'+value+'</td>';}).join('')+'<td><strong>'+(values[t.id]||0)+'</strong></td></tr>').join('');
  return '<div class="six-race-board"><div class="six-race-headline">'+sixEscape(headline)+'</div>'+(s.active&&!s.readyToFinish?'<div class="six-turnline">🎳 '+sixEscape(current?.name)+' · <strong>'+sixEscape(player)+'</strong> am Wurf<small>'+(s.turn.used[0]+s.turn.used[1])+' von 4 Würfen · '+s.turn.standing+' Kegel stehen</small></div>':'')+'<div class="six-tracks">'+tracks+'</div><p class="six-chart-note">Balken vergleichen die aktuellen Gesamtpunkte. '+(s.bonus?'Tagessiegerbonus eingeschaltet.':'Ohne Tagessiegerbonus.')+'</p><div class="six-score-scroller"><table class="six-score-table"><thead><tr><th>Team</th>'+Array.from({length:6},(_,i)=>'<th>Tag '+(i+1)+'<small>×'+(i+1)+'</small></th>').join('')+'<th>Gesamt</th></tr></thead><tbody>'+table+'</tbody></table></div></div>';
}
