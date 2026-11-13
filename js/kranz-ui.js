/* Gemeinsame Spieleinstellung und kompakte Wertauswahl für alle Kranzwürfe. */
(() => {
  const P=window.KCKranzPolicy;
  let pending=null,saving=false;
  const root=()=>typeof getFirestoreState==='function'?getFirestoreState():{};
  function state(key){
    if(['haushoch','haustief'].includes(key))return hausState(key==='haushoch'?'hoch':'tief');
    if(['sechstage','blackjack','gluecksspirale'].includes(key))return key==='sechstage'?sechstageState:key==='blackjack'?blackjackState:gluecksspiraleState;
    if(['siebener','hindernis',...(window.KCExtraGames?.keys||[])].includes(key))return indGet(key);
    // Klassische Skripte deklarieren die Zustände mit let, nicht als window-Feld.
    return ({tannenbaum:()=>tannenbaumState,darts:()=>dartsState,lotterie:()=>lotterieState,tiberius:()=>tiberiusState,mensch:()=>menschState,plusminus:()=>plusminusState,sichern:()=>sichernState,fuchsjagd:()=>fuchsjagdState,tor:()=>torState})[key]?.();
  }
  function rule(key,s=state(key)){return P.existing(key,s,root());}
  function freeze(key,beforeRoot){
    const s=state(key),before=beforeRoot?.[key+'State'];
    if(s?.active&&(!before?.active||s.startedAt!==before.startedAt))s.kranzRule=P.configured(beforeRoot||root(),key);
  }
  function cancel(){if(pending)pending.done(null);}
  async function select(key,s=state(key)){
    const r=rule(key,s);if(r.mode!=='choose')return P.resolve(r,undefined,s?.config?.targets?.[s.scores?.[KCExtraGames.current(s)]],key);
    if(pending)return null;
    const stamp=JSON.stringify(s),club=ACTIVE_CLUB,evening=currentEveningStartedAt,focus=document.activeElement;
    return new Promise(resolve=>{
      const backdrop=document.createElement('div');backdrop.className='kc-kranz-backdrop';
      const modal=document.createElement('section');modal.className='kc-kranz-dialog';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','kc-kranz-heading');
      const heading=document.createElement('h3');heading.id='kc-kranz-heading';heading.textContent='👑 Kranzwert wählen';modal.append(heading);
      const hint=document.createElement('p');hint.textContent=window.KCGameFinePolicy?.titles?.[key]||key;modal.append(hint);
      const grid=document.createElement('div');grid.className='kc-kranz-choices';
      const done=value=>{
        backdrop.remove();pending=null;focus?.focus?.();
        if(value!==null&&(ACTIVE_CLUB!==club||currentEveningStartedAt!==evening||JSON.stringify(state(key))!==stamp)){showToast('Spielstand geändert. Kranz bitte erneut eingeben.','error');resolve(null);return;}
        resolve(value);
      };
      for(const n of P.values(key)){const b=document.createElement('button');b.type='button';b.className='kranz-value-btn';b.setAttribute('aria-label',n+' zählen');b.innerHTML='<strong>'+n+'</strong>';b.onclick=()=>done(n);grid.append(b);}
      modal.append(grid);const stop=document.createElement('button');stop.type='button';stop.className='secondary-btn';stop.textContent='Abbrechen';stop.onclick=cancel;modal.append(stop);backdrop.append(modal);document.body.append(backdrop);
      pending={done};backdrop.onclick=e=>{if(e.target===backdrop)cancel();};backdrop.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cancel();}if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button')],first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};grid.firstElementChild?.focus();
    });
  }
  function hideOldEditors(){
    for(const id of ['sechstage-kranz-setting','gluecksspirale-kranz-setting','seven-kranz-mode','seven-kranz-value','goodcut-kranz-mode','goodcut-kranz-value','haus-hoch-kranz','haus-tief-kranz',...['bergundtal','ballermann','lattenzaun'].flatMap(k=>['extra-'+k+'-kranzMode','extra-'+k+'-kranzValue'])]){
      const el=document.getElementById(id);if(el){const label=el.closest('label');if(label){label.hidden=true;label.classList.add('kc-kranz-legacy');}}
    }
    // Darts baut die Wertetabelle erst beim Rendern auf.
    document.getElementById('darts-value-kranz')?.closest('.darts-setting-card')?.classList.add('kc-kranz-legacy');
    for(const key of ['sechstage','gluecksspirale'])document.querySelector('[onclick="saveRaceKranz(\''+key+'\')"]')?.classList.add('kc-kranz-legacy');
  }
  function render(){
    const tabs=document.getElementById('game-properties-tabs'),container=document.querySelector('.game-settings-grid');if(!tabs||!container)return;
    const data=root(),titles=window.KCGameFinePolicy?.titles||{};
    for(const key of P.keys){
      let panel=document.querySelector('[data-game-property="'+key+'"]');
      if(!panel){panel=document.createElement('section');panel.id='game-property-'+key;panel.className='game-settings-card';panel.dataset.gameProperty=key;panel.hidden=true;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','game-property-tab-'+key);const h=document.createElement('h3');h.textContent=titles[key]||key;panel.append(h);container.append(panel);const tab=document.createElement('button');tab.type='button';tab.id='game-property-tab-'+key;tab.dataset.gamePropertyTab=key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);tab.setAttribute('aria-selected','false');tab.tabIndex=-1;tab.textContent=(window.KCGameOverview?.catalog.find(g=>g.key===key)?.icon||'🎳')+' '+(titles[key]||key);tab.onclick=()=>showGameProperty(key);tabs.append(tab);}
      let select=document.getElementById('kranz-rule-'+key);
      if(!select){const box=document.createElement('div');box.className='kc-kranz-setting';const label=document.createElement('label');label.className='game-settings-field';label.textContent='👑 Kranzwertung';select=document.createElement('select');select.id='kranz-rule-'+key;select.onchange=()=>save(key);label.append(select);const note=document.createElement('small');note.textContent=key==='tor'?'Gilt für die Wurfanzeige. Abräumen zählt weiterhin ein Tor.':'Gilt ab dem nächsten Spielstart. Frei wählbar öffnet beim Kranz die Wertauswahl.';box.append(label,note);const header=panel.querySelector(':scope > header,:scope > h3');if(header)header.after(box);else panel.prepend(box);}
      const r=P.configured(data,key),value=r.mode==='fixed'?String(r.value):r.mode;
      if(document.activeElement!==select){select.replaceChildren();for(const [v,text] of [...(key==='tausend'?Array.from({length:10},(_,i)=>[String(i),String(i)]):[['8','8'],['12','12']]),['choose','Frei wählbar · bei jedem Kranz auswählen'],...(key==='guterschnitt'?[['target','Automatisch aktuelle Zielzahl treffen']]:[]),...(key!=='tausend'&&!['8','12'].includes(value)&&r.mode==='fixed'?[[value,'Bisheriger fester Wert: '+value]]:[])]){const opt=document.createElement('option');opt.value=v;opt.textContent=text;opt.selected=v===value;select.append(opt);}select.value=value;}
      select.disabled=saving;
    }
    hideOldEditors();
  }
  async function save(key){
    if(saving)return;const el=document.getElementById('kranz-rule-'+key),v=el.value,r=v==='choose'||v==='target'?{mode:v}:{mode:'fixed',value:Number(v)};
    if(!P.valid(r,key))return;const previous=extraGameSettings,club=ACTIVE_CLUB;saving=true;
    extraGameSettings={...extraGameSettings,kranzRules:{...extraGameSettings.kranzRules,[key]:r}};render();persistState();
    try{if(!(await saveToFirestore(false)))throw Error('Kranzwertung konnte nicht bestätigt werden.');showToast('Kranzwertung für neue Spiele gespeichert.','success');}
    catch(error){if(ACTIVE_CLUB===club){extraGameSettings=window.KCSharedSync?.server?.extraGameSettings||previous;el.value=String(P.configured(root(),key).mode==='fixed'?P.configured(root(),key).value:P.configured(root(),key).mode);}showToast(error.message,'error');}
    finally{saving=false;render();}
  }
  window.KCKranzUI=Object.freeze({state,rule,freeze,select,render,save,cancel,label:(key,s)=>P.label(rule(key,s))});
})();
