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
  function group(key,state,{motionOnly=false,turn=state.history?.length}={}){
    return ' data-player-rows="'+escape(key)+'" data-player-game="'+escape(state.id||state.startedAt||'')+'"'+
      (Number.isInteger(turn)?' data-player-turn="'+turn+'"':'')+(motionOnly?' data-player-motion-only':'');
  }

  function createMotion({schedule=setTimeout,cancel=clearTimeout,reduced=()=>false}={}){
    const views=new Map(),same=(a,b)=>a.length===b.length&&a.every((key,i)=>key===b[i]);
    function place(parent,rows,keys){
      for(let i=0;i<keys.length;i++){
        const element=rows.get(keys[i]),at=parent.children[i];
        if(element!==at)parent.insertBefore(element,at||null);
      }
    }
    function move(view){
      view.timer=null;
      const {parent,rows,keys}=view;
      if(!parent.isConnected)return;
      const first=new Map(keys.map(key=>[key,rows.get(key).getBoundingClientRect()]));
      const focused=parent.contains(document.activeElement)?document.activeElement:null;
      place(parent,rows,keys);
      if(focused&&document.activeElement!==focused)focused.focus({preventScroll:true});
      const movements=keys.map(key=>[rows.get(key),first.get(key)]).map(([element,before])=>{
        const after=element.getBoundingClientRect();
        return {element,x:before.left-after.left,y:before.top-after.top};
      });
      for(const {element,x,y} of movements){
        if(Math.abs(x)+Math.abs(y)<1||typeof element.animate!=='function')continue;
        const start={transform:'translate('+x+'px,'+y+'px)'};
        const end={transform:'translate(0,0)'};
        const path=y< -35?[start,{transform:'translate('+Math.min(12,Math.abs(y)/6)+'px,'+(y*.36)+'px)',offset:.62},end]:[start,end];
        element.animate(path,{duration:420,easing:'cubic-bezier(.22,.61,.36,1)'});
      }
    }
    return function update(parent){
      const key=parent.dataset.playerRows,previous=views.get(key);
      const rows=new Map([...parent.children].map(element=>[element.dataset.playerRow,element]));
      if(rows.has(undefined)||rows.size!==parent.children.length){cancel(previous?.timer);views.delete(key);return;}
      const keys=[...rows.keys()],game=parent.dataset.playerGame,turn=parent.dataset.playerTurn;
      const visible=!!parent.getClientRects().length&&!reduced();
      const stable=previous?.game===game&&keys.length===previous.keys.length&&keys.every(name=>previous.rows.has(name));
      const shown=stable?previous.shown:keys;
      const view={parent,rows,keys,shown,game,turn,signature:new Map(keys.map(name=>[name,
        [...rows.get(name).children].slice(1).map(cell=>cell.textContent).join('\u0000')]))};
      views.set(key,view);
      if(!stable||!visible||same(keys,shown)){cancel(previous?.timer);view.shown=keys;return;}
      const motionOnly=parent.hasAttribute('data-player-motion-only');
      const booked=turn!==undefined&&previous.turn!==undefined
        ? Number(turn)>Number(previous.turn)
        : keys.some(name=>previous.signature.get(name)!==view.signature.get(name));
      const continuing=previous.timer!=null&&turn===previous.turn;
      cancel(previous.timer);
      if(!motionOnly&&!booked&&!continuing){view.shown=keys;return;}
      place(parent,rows,shown);
      const release=()=>{
        if(views.get(key)!==view)return;
        view.shown=keys;
        move(view);
      };
      view.releaseAt=continuing?previous.releaseAt:Date.now()+(motionOnly?0:680);
      view.timer=schedule(release,Math.max(0,view.releaseAt-Date.now()));
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

  window.KCPlayerRows=Object.freeze({order,row,group,score,createMotion,createCounters});
  if(typeof document==='undefined'||!document.body||typeof MutationObserver!=='function')return;
  const selector='[data-player-rows]';
  const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const update=createMotion({reduced});
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
