/* Einstellungen gehören zum Club; die gespeicherte Anordnung wirkt sofort am TV. */
(() => {
 const M=window.KCDashboardLayout;let draft=null,stamp='',busy=false;
 const host=()=>document.getElementById('dashboard-layout-settings');
 const slotNames={'left-top':'Links oben','left-bottom':'Links unten','right-top':'Rechts oben','right-bottom':'Rechts unten'};
 function preview(r){const box=document.createElement('div');box.className='dashboard-layout-preview';box.setAttribute('aria-label','Vorschau der Dashboard-Anordnung');for(const [side,items] of [['left',r.left],['stage',['Spielfeld']],['right',r.right]]){if(!items.length)continue;const column=document.createElement('div');column.className='dashboard-preview-'+side;for(const key of items){const item=document.createElement('span');item.textContent=M.labels[key]||key;column.append(item);}box.append(column);}return box;}
 function draw(){
  const box=host();if(!box||!draft)return;const r=M.resolve(draft);draft=r.settings;box.replaceChildren();
  const title=document.createElement('h3');title.textContent='Dashboard-Anordnung';const help=document.createElement('p');help.textContent=r.count===2?'Beide Anzeigen stehen links. Wähle ihre Reihenfolge.':r.count===1?'Eine Anzeige füllt die gesamte Höhe auf der gewählten Seite.':r.count===3?'Auf einer Seite stehen zwei Anzeigen, auf der anderen eine über die volle Höhe.':r.count===0?'Alle Anzeigen ausgeblendet: Das Spielfeld nutzt die gesamte Breite.':'Vier Anzeigen: zwei je Seite. Die Standardanordnung lässt sich jederzeit wiederherstellen.';box.append(title,help);
  const rows=document.createElement('div');rows.className='dashboard-layout-options';
  for(const key of ['fines','drinks','gutters','seating']){
   const row=document.createElement('div');row.className='dashboard-layout-option';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.id='dashboard-show-'+key;check.checked=draft.panels[key].enabled;check.disabled=busy;check.onchange=()=>{draft.panels[key].enabled=check.checked;draw();};label.append(check,document.createTextNode(M.labels[key]));row.append(label);
   const select=document.createElement('select');select.id='dashboard-position-'+key;select.setAttribute('aria-label','Position '+M.labels[key]);select.disabled=busy||!check.checked;select.hidden=!check.checked;
   const positions=r.count===1?['left-top','right-top']:r.count===2?['left-top','left-bottom']:M.slots;
   for(const slot of positions){const option=document.createElement('option');option.value=slot;option.textContent=r.count===1?(slot.startsWith('left')?'Links · volle Höhe':'Rechts · volle Höhe'):slotNames[slot];option.selected=slot===draft.panels[key].position;select.append(option);}select.value=draft.panels[key].position;select.onchange=()=>{draft=M.move(draft,key,select.value);draw();};row.append(select);rows.append(row);
  }box.append(rows,preview(r));
  const actions=document.createElement('div');actions.className='dashboard-layout-actions';const reset=document.createElement('button');reset.type='button';reset.className='secondary-btn';reset.textContent='Standard wiederherstellen';reset.disabled=busy;reset.onclick=()=>{draft=M.defaults();draw();};const save=document.createElement('button');save.type='button';save.className='primary-btn';save.id='dashboard-layout-save';save.textContent=busy?'Wird gespeichert …':'💾 Dashboard-Anordnung speichern';save.disabled=busy;save.onclick=store;actions.append(reset,save);const status=document.createElement('p');status.id='dashboard-layout-status';status.setAttribute('role','status');box.append(actions,status);
 }
 function render(){const box=host();if(!box)return;const value=typeof dashboardSettings==='undefined'?null:dashboardSettings,next=String(typeof ACTIVE_CLUB==='undefined'?'':ACTIVE_CLUB)+'|'+JSON.stringify(value);if(next===stamp&&draft)return;stamp=next;draft=M.resolve(value).settings;draw();}
 async function store(){
  if(busy||!ACTIVE_CLUB)return false;if(!navigator.onLine){document.getElementById('dashboard-layout-status').textContent='Zum Übertragen der Anordnung bitte verbinden.';return false;}
  const before=dashboardSettings,club=ACTIVE_CLUB;dashboardSettings=M.resolve(draft).settings;busy=true;draw();
  try{persistState();if(!(await saveToFirestore(false)))throw Error('Anordnung konnte nicht bestätigt werden.');if(ACTIVE_CLUB===club){stamp='';render();document.getElementById('dashboard-layout-status').textContent='Gespeichert · wird auf dem Dashboard übernommen.';}return true;}
  catch(error){if(ACTIVE_CLUB===club){dashboardSettings=window.KCSharedSync?.server?.dashboardSettings??before;document.getElementById('dashboard-layout-status').textContent=error.message;}return false;}
  finally{busy=false;stamp='';const message=document.getElementById('dashboard-layout-status')?.textContent;render();if(ACTIVE_CLUB===club)document.getElementById('dashboard-layout-status').textContent=message||'';}
 }
 window.KCDashboardSettingsApp=Object.freeze({render,save:store});render();
})();
