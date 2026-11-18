(() => {
  const timer=window.KCGameStopwatch;
  let key='',element=null,saving=false;
  function current(){
    const game=key&&gameSetupState(key);
    if(!game||game.eveningStartedAt&&game.eveningStartedAt!==currentEveningStartedAt)return null;
    return game;
  }
  function render(){
    if(!element)return;
    const watch=timer.clock(key,current(),teamStopwatchActive);
    timer.paint(element,watch);
    const button=element.querySelector('button');
    button.hidden=!watch||watch.finished;
    if(watch&&!watch.finished){
      const text=watch.runningSince===null?'▶ Fortsetzen':'⏸ Pause';
      if(button.textContent!==text)button.textContent=text;
      button.disabled=saving;
    }
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
      element.innerHTML='<span aria-hidden="true">⏱</span><span data-stopwatch-label></span><time></time><button type="button"></button>';
      element.querySelector('button').onclick=change;
      const header=panel.querySelector('.tg-page-title,.six-page-title,.section-title');
      if(header?.parentNode===panel)header.after(element);
      else panel.prepend(element);
    }
    render();
  }
  async function change(){
    const game=current(),watch=timer.clock(key,game,teamStopwatchActive);
    if(saving||!watch||watch.finished)return;
    saving=true;
    render();
    try{
      await window.firestoreApi.setGameStopwatch(getClubFirestoreId(ACTIVE_CLUB),{
        gameKey:key,gameId:timer.identity(game),eveningStartedAt:currentEveningStartedAt||'',
        runningSince:watch.runningSince,elapsedMs:watch.elapsedMs
      });
    }catch(error){
      showToast(error.message,'error');
    }finally{
      saving=false;
      render();
    }
  }
  window.KCGameStopwatchApp=Object.freeze({show,render});
  setInterval(render,250);
})();
