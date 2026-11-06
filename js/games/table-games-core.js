/* Gemeinsame, transaktional gespeicherte Spielmechanik für 17+4 und Glücksspirale. */
(() => {
  const copy=value=>JSON.parse(JSON.stringify(value));
  const keys=['blackjack','gluecksspirale'];
  const validPerson=p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly;
  const normalize=name=>name.trim().toLocaleLowerCase('de-DE');
  function empty(gameKey){return {gameKey,rulesVersion:gameKey==='blackjack'?2:1,id:'',revision:0,active:false,finished:false,readyToFinish:false,eveningStartedAt:'',startedAt:'',players:[],teams:[],currentIndex:0,round:1,turn:{pins:[],playerIndex:0},target:50,cards:gameKey==='blackjack',cardValues:{},wood:{},stopped:[],scores:{},rounds:[],finalRound:0,winners:[],history:[],commands:[],receipts:[]};}
  function cardTotal(wood,card){return card==='A'?wood+(wood+11<=21?11:1):wood+Number(card||0);}
  function blackjackPhase(s){return s.finished?'finished':s.currentIndex<s.players.length?'throwing':s.players.some(name=>!Object.hasOwn(s.cardValues,name))?'cards':'ready';}
  function currentName(s){return s.gameKey==='blackjack'?(blackjackPhase(s)==='cards'?s.players.find(name=>!Object.hasOwn(s.cardValues,name)):s.players[s.currentIndex])||'':s.teams[s.currentIndex]?.players[s.turn.playerIndex]||'';}
  function loserGroups(s){
    const values=totals(s),losers=s.players.filter(name=>!s.winners.includes(name)),groups=[];
    losers.sort((a,b)=>{
      const bustA=values[a]>21,bustB=values[b]>21;
      if(bustA!==bustB)return bustA?-1:1;
      return bustA?values[b]-values[a]:values[a]-values[b];
    });
    for(const name of losers){const score=values[name];if(groups[groups.length-1]?.score===score)groups[groups.length-1].names.push(name);else groups.push({score,names:[name]});}
    return groups;
  }
  function participants(s){return s.gameKey==='blackjack'?s.players:s.teams.flatMap(t=>t.players);}
  function totals(s){if(s.gameKey==='gluecksspirale')return {...s.scores};return Object.fromEntries(s.players.map(name=>[name,cardTotal(s.wood[name]||0,(Object.hasOwn(s.cardValues,name)?s.cardValues[name]:0))]));}
  function initialize(request,context){
    const k=request.gameKey,s=empty(k),names=k==='blackjack'?request.players:request.teams?.flatMap(t=>t.players||[]);
    if(!keys.includes(k)||!Array.isArray(names)||names.length<2||names.length>16||names.some(n=>typeof n!=='string'||!n.trim())||new Set(names.map(normalize)).size!==names.length)throw Error('Bitte 2 bis 16 unterschiedliche aktive Kegler auswählen');
    const active=new Set(context.people.filter(validPerson).map(p=>p.name));
    if(names.some(n=>!active.has(n)))throw Error('Teilnehmer sind nicht mehr aktiv. Auswahl aktualisieren.');
    if(k==='gluecksspirale'){
      if(!Array.isArray(request.teams)||request.teams.length<2||request.teams.length>8||request.teams.some(t=>t.players?.length!==2))throw Error('Bitte zwei bis acht Zweierteams bilden');
      if(!Number.isInteger(request.target)||request.target<10||request.target>1000)throw Error('Ziel muss zwischen 10 und 1000 Holz liegen');
      s.teams=request.teams.map((t,i)=>({id:'G'+(i+1),name:'Team '+(i+1),players:t.players.slice()}));s.target=request.target;s.scores=Object.fromEntries(s.teams.map(t=>[t.id,0]));
      s.rounds=[{round:1,wood:{}}];
    }else{s.players=names.slice();s.cards=true;s.wood=Object.fromEntries(names.map(n=>[n,0]));}
    return {...s,id:request.gameId,active:true,startedAt:context.now,eveningStartedAt:context.eveningStartedAt};
  }
  function advanceSolo(s){s.currentIndex++;}
  function play(s,entry){
    if(s.gameKey==='blackjack'){
      const phase=blackjackPhase(s),name=currentName(s);
      if(entry.action==='card'){
        if(phase!=='cards')throw Error('Zuerst müssen alle Spieler Stopp sagen; erst danach Karten aufdecken');
        if(!name||Object.hasOwn(s.cardValues,name)||!['A',2,3,4,7,8,9,10].includes(entry.value))throw Error('Bitte einen gültigen Kartenwert eingeben');
        Object.defineProperty(s.cardValues,name,{value:entry.value,writable:true,enumerable:true,configurable:true});
        s.readyToFinish=s.players.every(player=>Object.hasOwn(s.cardValues,player));
      }else{
        if(phase!=='throwing')throw Error('Alle Spieler haben gestoppt. Jetzt die Karten aufdecken.');
        if(entry.action==='throw')s.wood[name]+=entry.pins;
        else if(entry.action==='stand'){s.stopped.push(name);advanceSolo(s);}else throw Error('Ungültige Aktion');
      }
      s.scores=totals(s);
    }else{
      if(entry.action!=='throw')throw Error('Ungültige Aktion');
      const team=s.teams[s.currentIndex],round=s.rounds[s.rounds.length-1];
      s.scores[team.id]+=entry.pins;round.wood[team.id]=(round.wood[team.id]||0)+entry.pins;s.turn.pins.push(entry.pins);
      if(s.scores[team.id]>=s.target&&!s.finalRound)s.finalRound=s.round;
      if(s.turn.pins.length===1)s.turn.playerIndex=1;
      else{
        const again=s.turn.pins[0]+s.turn.pins[1]>=13;s.turn={pins:[],playerIndex:0};
        if(!again){
          s.currentIndex++;
          if(s.currentIndex===s.teams.length){
            if(s.finalRound)s.readyToFinish=true;
            else{s.currentIndex=0;s.round++;s.rounds.push({round:s.round,wood:{}});}
          }
        }
      }
    }
    s.history.push(entry);
  }
  function command(previous,request,context){
    if(!keys.includes(request.gameKey))throw Error('Unbekanntes Spiel');
    const before=previous||empty(request.gameKey);
    if(typeof request.opId!=='string'||!/^table_[a-zA-Z0-9_-]{1,100}$/.test(request.opId))throw Error('Ungültige Spielaktion');
    if((before.commands||[]).includes(request.opId))return {state:copy(before),repeat:true};
    if((Number(before.revision)||0)!==request.expectedRevision)throw Error('Spielstand wurde inzwischen geändert. Bitte Serverstand laden.');
    let s=copy(before);
    if(request.action==='start'){
      if(s.active)throw Error('Das laufende Spiel zuerst abschließen oder abbrechen');
      if(typeof request.gameId!=='string'||!/^game_[a-zA-Z0-9_-]{1,100}$/.test(request.gameId))throw Error('Ungültige Spielkennung');
      s=initialize(request,context);
    }else{
      if(!s.id||s.id!==request.gameId)throw Error('Das Spiel wurde inzwischen gewechselt');
      if(s.gameKey==='blackjack'&&s.rulesVersion!==2&&request.action!=='reset')throw Error('Die Regeln wurden geändert. Bitte ein neues 17+4 vorbereiten; bisherige Buchungen bleiben erhalten.');
      if(request.action==='reset'){s=empty(request.gameKey);s.eveningStartedAt=context.eveningStartedAt;}
      else{
        if(!s.active||s.finished)throw Error('Dieses Spiel ist bereits beendet');
        if(request.action==='finish'){
          if(!s.readyToFinish)throw Error('Zuerst die Runde zu Ende spielen');
          const values=totals(s);
          if(s.gameKey==='blackjack'){
            const valid=s.players.filter(n=>values[n]<=21),best=valid.length?Math.max(...valid.map(n=>values[n])):null;
            s.winners=valid.filter(n=>values[n]===best);
          }else{const best=Math.max(...Object.values(values));s.winners=s.teams.filter(t=>values[t.id]===best).map(t=>t.id);}
          s.finished=true;s.active=false;
        }else if(request.action==='undo'){
          if(!s.history.length)throw Error('Noch keine Aktion zum Zurücknehmen');
          const history=s.history.slice(0,-1);
          const rebuilt=initialize({gameKey:s.gameKey,gameId:s.id,players:s.players,teams:s.teams,target:s.target,cards:s.cards},{...context,people:participants(s).map(name=>({name,present:true})),now:s.startedAt,eveningStartedAt:s.eveningStartedAt});
          for(const entry of history)play(rebuilt,entry);
          s=rebuilt;
        }else{
          if(s.readyToFinish)throw Error('Die Runde ist beendet. Abschließen oder letzte Aktion zurücknehmen.');
          const name=currentName(s),person=context.people.find(p=>p.name===name);
          if(request.action==='throw'&&(!person||!validPerson(person)))throw Error('Der Werfer ist nicht mehr aktiv');
          const entry={id:request.opId,action:request.action,name,at:context.now,round:s.round,teamId:s.teams[s.currentIndex]?.id||''};
          if(request.action==='throw'){
            if(!['pins','kranz','gosse','miss'].includes(request.kind))throw Error('Ungültiger Wurf');
            const pins=request.kind==='kranz'?8:['gosse','miss'].includes(request.kind)?0:Number(request.pins);
            if(!Number.isInteger(pins)||pins<0||pins>9||(request.kind==='pins'&&pins<1))throw Error('Bitte 1 bis 9 Holz, Gosse, Vorbei oder Kranz eingeben');
            Object.assign(entry,{kind:request.kind,pins});
          }else if(request.action==='card')entry.value=request.value;
          else if(request.action!=='stand'||s.gameKey!=='blackjack')throw Error('Ungültige Spielaktion');
          if(s.history.length>=1000)throw Error('Maximale Spiellänge erreicht. Spiel abbrechen und neu starten.');
          play(s,entry);
        }
      }
    }
    s.revision=(Number(before.revision)||0)+1;s.commands=[...(before.commands||[]),request.opId].slice(-2048);s.receipts=(before.receipts||[]).slice(-63);
    return {state:s,repeat:false};
  }
  function effects(before,s,request,context){
    const changes=[],added=[],removed=[];
    if(request.action==='throw'){
      const e=s.history[s.history.length-1],type=e.kind==='kranz'?'kranz':e.kind==='gosse'?'gosse':e.pins===9?'9er':'';
      if(type){
        const key=context.catalog.find(item=>type==='gosse'?/gosse|pudel/i.test(item.label):/9er|kranz|durchgeworfen/i.test(item.label))?.key;
        if(!key)throw Error('Strafenart '+type+' fehlt');
        const names=type==='gosse'?[e.name]:context.people.filter(p=>validPerson(p)&&p.name!==e.name).map(p=>p.name);
        for(const personName of names)changes.push({personName,key,delta:1});
        e.statId='tablegames_'+s.id+'_'+e.id;
        added.push({id:e.statId,tableGameId:s.id,tableGameKey:s.gameKey,type,thrower:e.name,punished:names,eveningStartedAt:s.eveningStartedAt,eventDate:context.now.slice(0,10),createdAt:context.now,club:context.club});
      }
      e.penalties=copy(changes);
    }else if(request.action==='card'&&s.gameKey==='blackjack'){
      const e=s.history[s.history.length-1];
      if(totals(s)[e.name]>21){
        const key=context.catalog.find(item=>/^(1\.?\s*verlierer)$|erster verlierer/i.test(String(item.label||'').trim()))?.key;
        if(!key)throw Error('Strafe „1. Verlierer“ fehlt');
        changes.push({personName:e.name,key,delta:1});e.bustPenalty=true;
      }
      e.penalties=copy(changes);
    }else if(request.action==='undo'){
      const e=before.history[before.history.length-1];for(const change of e.penalties||[])changes.push({...change,delta:-change.delta});if(e.statId)removed.push(e.statId);
    }else if(request.action==='finish'){
      if(s.gameKey==='gluecksspirale'){
        const names=s.teams.filter(t=>!s.winners.includes(t.id)).flatMap(t=>t.players);
        if(names.length){const key=context.catalog.find(item=>/^(1\.?\s*verlierer)$|erster verlierer/i.test(String(item.label||'').trim()))?.key;if(!key)throw Error('Strafe „1. Verlierer“ fehlt');for(const personName of names)changes.push({personName,key,delta:1});}
      }else{
        const groups=loserGroups(s);
        for(let i=0;i<Math.min(3,groups.length);i++){
          const rank=i+1,key=context.catalog.find(item=>new RegExp('^'+rank+'\\.?\\s*verlierer$','i').test(String(item.label||'').trim())||(rank===1&&/erster verlierer/i.test(item.label)))?.key;
          if(!key)throw Error('Strafe „'+rank+'. Verlierer“ fehlt');
          for(const personName of groups[i].names)changes.push({personName,key,delta:1});
        }
        s.loserGroups=groups;
      }
      s.finishPenalties=copy(changes);
    }
    return {changes,added,removed};
  }
  window.KCTableGames=Object.freeze({empty,command,effects,totals,currentName,participants,cardTotal,blackjackPhase,loserGroups});
})();
function tableEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderTableGameBoard(s){
  if(!s?.id)return '';
  const spiral=s.gameKey==='gluecksspirale',values=KCTableGames.totals(s),phase=spiral?'throwing':KCTableGames.blackjackPhase(s);
  const winners=spiral?s.teams.filter(t=>s.winners.includes(t.id)).map(t=>t.name+' ('+t.players.join(' / ')+')'):s.winners;
  const head=s.finished?(winners.length?'🏆 '+winners.join(' · '):'Alle überworfen – kein Sieger'):s.readyToFinish?'🏁 Runde beendet – Spiel abschließen':spiral?'Runde '+s.round+(s.finalRound?' · Letzte Runde':''):phase==='cards'?'🃏 Alle haben gestoppt – Karten aufdecken':'Spieler '+(s.currentIndex+1)+' von '+s.players.length;
  const turn=s.active&&!s.readyToFinish?'<div class="tg-turn">'+(!spiral&&phase==='cards'?'🃏 Karte für ':'🎳 ')+'<strong>'+tableEscape(KCTableGames.currentName(s))+'</strong>'+(!spiral&&phase==='cards'?' eintragen':' am Wurf')+(spiral?'<small>'+tableEscape(s.teams[s.currentIndex].name)+' · Wurfpaar: '+(s.turn.pins.length?s.turn.pins[0]+' + …':'noch offen')+' · Ziel '+s.target+' Holz</small>':'')+'</div>':'';
  const rows=spiral?s.teams.map((t,i)=>'<tr class="'+(s.active&&!s.readyToFinish&&s.currentIndex===i?'tg-current':'')+'"><th scope="row">'+tableEscape(t.name)+'<small>'+t.players.map(tableEscape).join(' / ')+'</small></th><td><strong>'+values[t.id]+'</strong> / '+s.target+'</td><td><div class="tg-progress" role="progressbar" aria-label="'+tableEscape(t.name)+'" aria-valuemin="0" aria-valuemax="'+s.target+'" aria-valuenow="'+Math.min(s.target,values[t.id])+'"><span style="width:'+Math.min(100,values[t.id]/s.target*100)+'%"></span></div></td></tr>').join(''):
    s.players.map(name=>{
      const known=Object.hasOwn(s.cardValues,name),legacy=!s.cards&&s.finished;
      const card=known?(s.cardValues[name]==='A'?'Ass (1/11)':s.cardValues[name]):'🂠';
      const score=known||legacy?values[name]+(values[name]>21?' · Über 21':values[name]===21?' 🎯':''):'🔒';
      const rank=(s.loserGroups||[]).findIndex(g=>g.names.includes(name));
      const fines=[...(s.history.some(e=>e.action==='card'&&e.name===name&&e.bustPenalty)?['Über 21: 1. Verlierer +1']:[]),...(s.finished&&rank>=0&&rank<3?['Platzierung: '+(rank+1)+'. Verlierer +1']:[])];
      return '<tr class="'+(s.active&&!s.readyToFinish&&name===KCTableGames.currentName(s)?'tg-current':'')+'"><th scope="row">'+tableEscape(name)+'</th><td>'+card+'</td><td>'+(s.wood[name]||0)+'</td><td>'+score+'</td><td>'+(s.stopped.includes(name)?(known||legacy?'✓ Fertig':'✓ Stopp'):'…')+'</td><td>'+fines.map(tableEscape).join('<br>')+'</td></tr>';
    }).join('');
  const roundTable=spiral?'<div class="tg-rounds"><table><thead><tr><th>Team</th>'+s.rounds.map(r=>'<th>R'+r.round+'</th>').join('')+'</tr></thead><tbody>'+s.teams.map(t=>'<tr><th scope="row">'+tableEscape(t.name)+'</th>'+s.rounds.map(r=>'<td>'+(r.wood[t.id]??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'';
  return '<div class="tg-board"><h3>'+tableEscape(head)+'</h3>'+turn+'<div class="tg-table-scroll"><table><thead><tr>'+(spiral?'<th>Team</th><th>Holz</th><th>Fortschritt</th>':'<th>Name</th><th>Karte</th><th>Holz</th><th>Gesamt</th><th>Status</th><th>Gebuchte Strafen</th>')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+roundTable+'</div>';
}
