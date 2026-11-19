(() => {
  const timer=window.KCGameStopwatch;
  let key='',element=null;
  const saving=new Set();

  function gameClock(gameKey,game){
    if(!game?.active||game.finished||game.eveningStartedAt&&game.eveningStartedAt!==currentEveningStartedAt)return null;
    if(gameKey==='tannenbaum'&&teamStopwatchActive)return {running:teamStopwatchRunning,mode:'team',started:teamStopwatchRunning||teamCountdownRemainingBefore<teamCountdownDuration};
    if(gameKey==='ballermann'){
      if(!game.timer)return null;
      return {running:game.timer.running,mode:'ball',started:game.timer.endsAt>0,expired:game.timer.running&&window.KCExtraGames.remaining(game)===0};
    }
    const watch=timer.clock(gameKey,game,teamStopwatchActive);
    return watch&&!watch.finished?{running:watch.runningSince!==null,watch}:null;
  }
  function renderButton(button,gameKey,game){
    if(!button)return;
    const clock=gameClock(gameKey,game);
    const text=clock&&!clock.running?(clock.mode&&!clock.started?'▶ Zeit starten':'▶ Weiter'):'⏸ Spiel pausieren';
    if(button.textContent!==text)button.textContent=text;
    button.disabled=!clock||!!clock.expired||saving.has(gameKey)||!!(window.KCSharedSync&&!window.KCSharedSync.ready);
    button.setAttribute('aria-pressed',String(!!clock&&!clock.running&&(!clock.mode||clock.started)));
  }
  function render(){
    if(!key||!element)return;
    const game=gameSetupState(key);
    const valid=game&&(!game.eveningStartedAt||game.eveningStartedAt===currentEveningStartedAt);
    timer.paint(element,valid?timer.clock(key,game,teamStopwatchActive):null);
    renderButton(document.querySelector('[data-game-pause="'+key+'"]'),key,game);
  }
  function show(gameKey){
    key=GAME_SETUP_KEYS.includes(gameKey)?gameKey:'';
    const panel=key?document.getElementById('tab-'+key):null;
    if(!panel){element=null;return;}
    element=panel.querySelector('.game-stopwatch');
    if(!element){
      element=document.createElement('div');
      element.className='game-stopwatch game-stopwatch-app';
      element.setAttribute('role','group');
      element.setAttribute('aria-label','Stoppuhr');
      element.innerHTML='<span aria-hidden="true">⏱</span><span data-stopwatch-label></span><time></time>';
      const header=panel.querySelector(':scope > .game-title-with-actions,:scope > .tg-page-title,:scope > .six-page-title,:scope > .section-title');
      if(header?.parentNode===panel)header.after(element);
      else panel.prepend(element);
    }
    render();
  }
  async function change(gameKey){
    const game=gameSetupState(gameKey),clock=gameClock(gameKey,game);
    if(saving.has(gameKey)||!clock||clock.expired)return;
    saving.add(gameKey);
    render();
    try{
      if(clock.mode==='team')await (clock.running?pauseTeamStopwatch():startTeamStopwatch());
      else if(clock.mode==='ball')await indAction(gameKey,clock.running?'pause':'timerStart');
      else await window.firestoreApi.setGameStopwatch(getClubFirestoreId(ACTIVE_CLUB),{
        gameKey,gameId:timer.identity(game),eveningStartedAt:currentEveningStartedAt||'',
        runningSince:clock.watch.runningSince,elapsedMs:clock.watch.elapsedMs
      });
    }catch(error){
      showToast(error.message,'error');
    }finally{
      saving.delete(gameKey);
      render();
    }
  }
  function attach(toolbar,next,gameKey,game){
    let button=toolbar.querySelector('[data-game-pause]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='game-next-button game-pause-button';
      button.dataset.gamePause=gameKey;
      button.onclick=()=>change(gameKey);
      toolbar.insertBefore(button,next);
    }
    renderButton(button,gameKey,game);
  }
  window.KCGameStopwatchApp=Object.freeze({show,render,attach});
  setInterval(render,250);
})();
