/* Die Anzeige darf sich drehen, ohne die gespeicherte Wurfreihenfolge zu ändern. */
(() => {
  function order(players,current,{running=false,name=p=>typeof p==='string'?p:p.name,unavailable=()=>false}={}){
    const waiting=players.filter(p=>!unavailable(p)),done=players.filter(unavailable);
    const index=running?waiting.findIndex(p=>name(p)===current):-1;
    return [...(index>0?[...waiting.slice(index),...waiting.slice(0,index)]:waiting),...done];
  }

  const escape=value=>String(value).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]));
  const row=name=>' data-player-row="'+escape(name)+'"';
  const score=(name,metric='score')=>' data-tv-score="'+escape(JSON.stringify([name,metric]))+'"';
  function starter(state){
    if(state.gameKey==='gluecksspirale')return state.teams?.[0]?.id||'';
    const first=state.partyAlternating?state.participantTeams?.[state.teamOrder?.[0]]?.[0]:null;
    const player=first||state.startPlayer||state.starter||state.playerOrder?.[0]||state.order?.[0]||state.players?.[state.startIndex||0];
    return typeof player==='string'?player:player?.name||'';
  }
  function group(key,state,{motionOnly=false,simpleMotion=false,turn=state.history?.length}={}){
    return ' data-player-rows="'+escape(key)+'" data-player-game="'+escape(state.id||state.startedAt||'')+'"'+
      ' data-player-starter="'+escape(starter(state))+'" data-player-start-label="'+(state.mode==='team'||key==='gluecksspirale'?'Startteam':'Startspieler')+'"'+
      (Number.isInteger(turn)?' data-player-turn="'+turn+'"':'')+(motionOnly?' data-player-motion-only':'')+
      (simpleMotion?' data-player-simple-motion':'');
  }
  function markStarter(parent){
    for(const row of parent.children){
      const selected=!!parent.dataset.playerStarter&&row.dataset.playerRow===parent.dataset.playerStarter;
      const old=row.querySelector('.player-start-marker');
      if(!selected){old?.remove();continue;}
      if(old)continue;
      const label=row.querySelector('.abschreibung-name strong,.extra-fence-name strong,.sichern-card-top>strong,.tg-spiral-team-top>strong')||row.querySelector('th,td')||row.firstElementChild;
      if(!label)continue;
      const badge=document.createElement('span');badge.className='player-start-marker';badge.title=parent.dataset.playerStartLabel||'Startspieler';badge.setAttribute('aria-label',badge.title);label.append(badge);
    }
  }

  const timings=settings=>window.KCDashboardLayout?.playerRows(settings?.playerRows)||{holdSeconds:1.5,moveSeconds:0.8};
  let tvSettings;
  function configure(settings){tvSettings=settings;}

  function createMotion({schedule=setTimeout,cancel=clearTimeout,reduced=()=>false,timing=()=>timings(),now=()=>Date.now()}={}){
    const views=new Map(),same=(a,b)=>a.length===b.length&&a.every((key,i)=>key===b[i]);
    function place(parent,rows,keys){
      for(let i=0;i<keys.length;i++){
        const element=rows.get(keys[i]),at=parent.children[i];
        if(element!==at)parent.insertBefore(element,at||null);
      }
    }
    function play(view){
      const {movement,rows}=view;
      if(!movement)return;
      const elapsed=Math.max(0,now()-movement.startedAt);
      if(elapsed>=movement.duration)return;
      for(const [key,path] of movement.paths){
        const element=rows.get(key);
        if(typeof element.animate!=='function')continue;
        const animation=element.animate(path,{duration:movement.duration,easing:'cubic-bezier(.45,0,.35,1)'});
        if(animation&&elapsed)animation.currentTime=elapsed;
      }
    }
    function move(view,duration){
      view.timer=null;
      const {parent,rows,keys}=view;
      if(!parent.isConnected)return;
      const first=duration>0?new Map(keys.map(key=>[key,rows.get(key).getBoundingClientRect()])):null;
      const focused=parent.contains(document.activeElement)?document.activeElement:null;
      place(parent,rows,keys);
      if(focused&&document.activeElement!==focused)focused.focus({preventScroll:true});
      if(!first)return;
      const paths=new Map(),simple=parent.hasAttribute('data-player-simple-motion');
      for(const key of keys){
        const before=first.get(key),after=rows.get(key).getBoundingClientRect();
        const x=before.left-after.left,y=before.top-after.top;
        if(Math.abs(x)+Math.abs(y)<1)continue;
        const start={transform:'translate('+x+'px,'+y+'px)'};
        const end={transform:'translate(0,0)'};
        paths.set(key,!simple&&y< -35?[start,{transform:'translate('+Math.min(12,Math.abs(y)/6)+'px,'+(y*.5)+'px)',offset:.5},end]:[start,end]);
      }
      view.movement={paths,duration,startedAt:now()};
      play(view);
    }
    function showGains(view,previous,stable){
      cancel(previous?.gainTimer);
      if(!view.gainNodes.size)return;
      const forward=stable&&Number(view.turn)>Number(previous.turn);
      const sameTurn=stable&&view.turn===previous.turn;
      const visible=[];
      for(const [name,node] of view.gainNodes){
        const delta=view.counts.get(name)-previous?.counts.get(name);
        if(forward&&delta>0)view.gains.set(name,{delta,until:now()+1300});
        else if(sameTurn&&delta===0&&previous.gains.has(name))view.gains.set(name,previous.gains.get(name));
        const gain=view.gains.get(name);
        if(!gain||gain.until<=now())continue;
        node.textContent='+'+gain.delta;
        node.hidden=false;
        visible.push([node,gain.until]);
      }
      const expire=()=>{
        const at=now();
        for(const [node,until] of visible)if(until<=at)node.hidden=true;
        const upcoming=visible.filter(([,until])=>until>at);
        if(upcoming.length)view.gainTimer=schedule(expire,Math.min(...upcoming.map(([,until])=>until))-at);
      };
      expire();
    }
    return function update(parent){
      markStarter(parent);
      const key=parent.dataset.playerRows,previous=views.get(key);
      const rows=new Map([...parent.children].map(element=>[element.dataset.playerRow,element]));
      if(rows.has(undefined)||rows.size!==parent.children.length){cancel(previous?.timer);cancel(previous?.gainTimer);views.delete(key);return;}
      const keys=[...rows.keys()],game=parent.dataset.playerGame,turn=parent.dataset.playerTurn;
      const visible=!!parent.getClientRects().length&&!reduced();
      const stable=previous?.game===game&&keys.length===previous.keys.length&&keys.every(name=>previous.rows.has(name));
      const shown=stable?previous.shown:keys;
      const view={parent,rows,keys,shown,game,turn,signature:new Map(keys.map(name=>[name,
        [...rows.get(name).children].slice(1).map(cell=>cell.textContent).join('\u0000')])),
        gainNodes:new Map(),counts:new Map(),gains:new Map()};
      views.set(key,view);
      if(key==='pfaelzer'){
        for(const [name,element] of rows){
          const node=element.querySelector('[data-pfaelzer-gain]');
          if(node){view.gainNodes.set(name,node);view.counts.set(name,Number(node.dataset.pfaelzerGain));}
        }
        showGains(view,previous,stable&&!!parent.getClientRects().length);
      }
      if(!stable||!visible||same(keys,shown)){
        cancel(previous?.timer);
        view.shown=keys;
        if(stable&&visible&&turn===previous.turn&&parent!==previous.parent){
          view.movement=previous.movement;
          play(view);
        }
        return;
      }
      const motionOnly=parent.hasAttribute('data-player-motion-only');
      const booked=turn!==undefined&&previous.turn!==undefined
        ? Number(turn)>Number(previous.turn)
        : keys.some(name=>previous.signature.get(name)!==view.signature.get(name));
      const continuing=previous.timer!=null&&turn===previous.turn;
      cancel(previous.timer);
      if(!motionOnly&&!booked&&!continuing){view.shown=keys;return;}
      const {holdSeconds,moveSeconds}=timing();
      place(parent,rows,shown);
      const release=()=>{
        if(views.get(key)!==view)return;
        view.shown=keys;
        move(view,parent.hasAttribute('data-player-simple-motion')?Math.min(moveSeconds*1000,220):moveSeconds*1000);
      };
      view.releaseAt=continuing?previous.releaseAt:now()+(motionOnly?0:holdSeconds*1000+Math.max(0,Number(parent.dataset.playerExtraHold)||0));
      view.timer=schedule(release,Math.max(0,view.releaseAt-now()));
    };
  }

  function createCounters({request=fn=>window.requestAnimationFrame(fn),now=()=>performance.now(),reduced=()=>false}={}){
    let previousGame=null,values=new Map();
    return function update(board){
      const game=board.dataset.scoreGame,previous=game===previousGame?values:new Map();
      previousGame=game;
      values=new Map();
      for(const node of board.querySelectorAll('[data-tv-score]')){
        const text=node.firstChild,key=node.dataset.tvScore;
        if(text?.nodeType!==3||node.childNodes.length!==1)continue;
        const match=/^(-?\d+)(?:,(\d{1,2}))?(.*)$/.exec(text.data);
        if(!match||!/^\s*(?:Holz|Punkte|Pkt\.|Latten|Tore|€|\/\s*\d+)?\s*$/.test(match[3]))continue;
        const [,whole,fraction,suffix]=match;
        const target=Number(fraction?whole+'.'+fraction:whole);
        if(!Number.isFinite(target))continue;
        const old=previous.get(key),at=now(),duration=440;
        const value={target,from:target,since:at,shown:target,node};
        values.set(key,value);
        if(!old||reduced()||!board.getClientRects().length)continue;
        if(old.target===target){
          value.from=old.from;value.since=old.since;
        }else value.from=old.shown;
        if(value.from===target||at>=value.since+duration)continue;
        const finalText=text.data,decimals=fraction?.length||0;
        const paint=()=>{
          if(values.get(key)!==value||!node.isConnected)return;
          const ratio=Math.min(1,Math.max(0,(now()-value.since)/duration));
          value.shown=ratio===1?target:value.from+(target-value.from)*ratio;
          text.data=ratio===1?finalText:value.shown.toFixed(decimals).replace('.',',')+suffix;
          if(ratio<1)request(paint);
        };
        paint();
      }
    };
  }

  window.KCPlayerRows=Object.freeze({order,row,group,score,starter,markStarter,createMotion,createCounters,configure,timings});
  if(typeof document==='undefined'||!document.body||typeof MutationObserver!=='function')return;
  const selector='[data-player-rows]';
  const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const update=createMotion({reduced,timing:()=>timings(typeof dashboardSettings==='undefined'?tvSettings:dashboardSettings)});
  const counters=createCounters({reduced});
  new MutationObserver(records=>{
    let dashboard=null;
    for(const record of records)for(const node of record.addedNodes){
      if(node.nodeType!==1||!node.isConnected)continue;
      if(node.matches(selector))update(node);
      for(const parent of node.querySelectorAll(selector))update(parent);
      if(record.target.id==='game-body')dashboard=record.target;
    }
    if(dashboard)counters(dashboard);
  }).observe(document.body,{childList:true,subtree:true});
})();
