/* Startbestätigung vor dem Auslosen / ersten Wurf; kein Warten auf den TV. */
(() => {
 let pending=null,approved=null,backdrop=null;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function close(){backdrop?.remove();backdrop=null;}
 function cancel(){close();document.querySelector('.start-review-return')?.remove();pending=null;}
 function key(button){
  const action=(button.getAttribute('onclick')||'').trim(),map={startTannenbaumSetup:'tannenbaum',startDartsGame:'darts',startLotterieGame:'lotterie',startTiberiusGame:'tiberius',startMenschGame:'mensch',startPlusminusGame:'plusminus',startSichernGame:'sichern',startFuchsjagdGame:'fuchsjagd',startTorGame:'tor',startSechsGame:'sechstage'};
  const name=/^([a-zA-Z]+)\(/.exec(action)?.[1];if(map[name])return map[name];
  if(name==='startHausGame')return action.includes("'hoch'")?'haushoch':'haustief';
  if(['startTableGame','indStart'].includes(name))return /^\w+\(['"]([a-z]+)['"]/.exec(action)?.[1]||'';
  return '';
 }
 function settings(key){
  const rows=[],r=window.KCKranzPolicy?.configured(getFirestoreState(),key);
  if(r)rows.push(['Kranz',r.mode==='choose'?'Wert beim Wurf wählen':r.mode==='target'?'Aktuelle Zielzahl':String(r.value)+' Holz']);
  const panel=document.querySelector('[data-game-property="'+key+'"]');
  for(const el of panel?.querySelectorAll('input,select')||[]){
   if((el.closest('label')?.hidden||el.closest('.kc-kranz-legacy'))||el.id.startsWith('kranz-rule-'))continue;
   const clone=el.closest('label')?.cloneNode(true);clone?.querySelectorAll('input,select,button').forEach(e=>e.remove());const label=clone?.textContent.trim();
   if(!label||rows.some(([name])=>name===label)||el.type==='checkbox')continue;
   const value=el.tagName==='SELECT'?el.selectedOptions?.[0]?.textContent||el.value:el.value;if(value)rows.push([label,value]);
   if(rows.length>=9)break;
  }
  const target=document.getElementById('tab-'+key);
  for(const el of target?.querySelectorAll('.gs-start-card input,.sichern-setup input,.sichern-setup select,#sechs-bonus,#darts-start-input')||[]){
   if(el.type==='checkbox'){if(el.id==='sechs-bonus')rows.push(['Tagessiegerbonus',el.checked?'An':'Aus']);continue;}
   const label=el.closest('label')?.textContent.trim().replace(/\s+/g,' ');if(label&&!rows.some(([n])=>n===label))rows.push([label,el.tagName==='SELECT'?el.selectedOptions?.[0]?.textContent||el.value:el.value]);
  }
  const top=target?.querySelector('[data-game-ontop] input,input[id$="-ontop"],input[id$="-on-top"]');rows.push(['OnTop',window.KCGameOptionsApp?.selected(key)?'An':'Aus']);
  rows.push(['Mitspieler',String(typeof gameSetupNames==='function'?gameSetupNames(key).length:0)]);return rows;
 }
 function show(){
  if(!pending)return;close();document.querySelector('.start-review-return')?.remove();
  const p=pending;backdrop=document.createElement('div');backdrop.className='modal-overlay';
  const modal=document.createElement('section');modal.className='modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','start-review-title');
  modal.innerHTML='<h3 id="start-review-title">🎳 '+esc(KCGameFinePolicy.titles[p.key]||p.key)+'</h3><p>'+esc(window.KCGameOverview?.catalog.find(g=>g.key===p.key)?.desc||'')+'</p><p>Mit diesen Einstellungen starten:</p><dl class="start-review-list">'+settings(p.key).map(([l,v])=>'<div><dt>'+esc(l)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl><div class="modal-actions"><button type="button" data-cancel class="secondary-btn">Abbrechen</button><button type="button" data-edit class="secondary-btn">✏️ Einstellungen bearbeiten</button><button type="button" data-start class="primary-btn">▶ Spiel starten</button></div>';
  if(p.key==='hochsprung'&&typeof extraConfig==='function'&&!extraConfig('hochsprung').targets.length)modal.querySelector('[data-start]').disabled=true;
  modal.querySelector('[data-cancel]').onclick=cancel;
  modal.querySelector('[data-edit]').onclick=()=>{close();showSideTab('spiele','spiele-einstellungen');showGameProperty(p.key);const back=document.createElement('button');back.type='button';back.className='primary-btn start-review-return';back.textContent='✓ Zurück zum Spielstart';back.onclick=()=>{showSideTab('spiele',p.key);show();};document.body.append(back);};
  modal.querySelector('[data-start]').onclick=()=>{if(ACTIVE_CLUB!==p.club||currentEveningStartedAt!==p.evening){cancel();showToast('Kegelabend wurde geändert. Bitte erneut starten.','error');return;}close();pending=null;approved=p.button;try{p.button.click();}finally{approved=null;}};
  backdrop.onclick=e=>{if(e.target===backdrop)cancel();};backdrop.onkeydown=e=>{if(e.key==='Escape')cancel();if(e.key==='Tab'){const all=[...modal.querySelectorAll('button')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};backdrop.append(modal);document.body.append(backdrop);modal.querySelector('[data-start]').focus();
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('button[onclick]');if(!button||button===approved||button.disabled)return;
  const game=key(button);if(!game||gameSetupState(game)?.active||window.KCSharedSync&&!KCSharedSync.ready)return;
  event.preventDefault();event.stopImmediatePropagation();pending={key:game,button,club:ACTIVE_CLUB,evening:currentEveningStartedAt};show();
 },true);
 window.KCStartReview=Object.freeze({cancel,settings,key});
})();
