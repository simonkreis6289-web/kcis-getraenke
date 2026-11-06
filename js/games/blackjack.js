window.KCGameModules=window.KCGameModules||{};
window.KCGameModules.blackjack={id:'blackjack',title:'17 + 4 / Blackjack',ready:true};
function startBlackjackGame(){return startTableGame('blackjack');}
function renderBlackjackGame(){return renderTableGame('blackjack');}

let blackjackSettingsBusy=false;
function renderBlackjackSettings(){
  const panel=document.getElementById('blackjack-settings-fields');if(!panel)return;
  const settings=getBlackjackCardSettings(),key=ACTIVE_CLUB+'|'+JSON.stringify(settings),inputs=[...panel.querySelectorAll('input')];
  if(panel.dataset.club!==String(ACTIVE_CLUB)){
    inputs.forEach(input=>input.removeAttribute('aria-invalid'));
    document.getElementById('blackjack-settings-status').textContent='';
  }
  if(panel.dataset.loadedKey!==key&&(panel.dataset.club!==String(ACTIVE_CLUB)||!inputs.includes(document.activeElement))){
    for(const field of ['jack','queen','king'])document.getElementById('blackjack-value-'+field).value=settings[field];
    document.getElementById('blackjack-value-ace').value=settings.ace[0];
    document.getElementById('blackjack-ace-dual').checked=settings.ace.length===2;
    document.getElementById('blackjack-value-ace-second').value=settings.ace[1]??11;
    panel.dataset.loadedKey=key;panel.dataset.club=String(ACTIVE_CLUB);
  }
  inputs.forEach(input=>input.disabled=blackjackSettingsBusy);
  toggleBlackjackAceMode();
  document.getElementById('blackjack-settings-save').disabled=blackjackSettingsBusy;
}
function toggleBlackjackAceMode(){
  const enabled=document.getElementById('blackjack-ace-dual')?.checked,input=document.getElementById('blackjack-value-ace-second');
  if(input)input.disabled=blackjackSettingsBusy||!enabled;
}
async function saveBlackjackSettings(){
  if(blackjackSettingsBusy||!ACTIVE_CLUB)return false;
  const status=document.getElementById('blackjack-settings-status'),fields=['jack','queen','king','ace','ace-second'],inputs=Object.fromEntries(fields.map(field=>[field,document.getElementById('blackjack-value-'+field)])),dual=document.getElementById('blackjack-ace-dual').checked;
  const active=fields.filter(field=>field!=='ace-second'||dual),invalid=active.filter(field=>!/^\d+$/.test(inputs[field].value)||Number(inputs[field].value)>21);
  const settings={jack:Number(inputs.jack.value),queen:Number(inputs.queen.value),king:Number(inputs.king.value),ace:[Number(inputs.ace.value),...(dual?[Number(inputs['ace-second'].value)]:[])]};
  fields.forEach(field=>inputs[field].removeAttribute('aria-invalid'));
  if(invalid.length||!KCTableGames.validCardSettings(settings)){
    invalid.forEach(field=>inputs[field].setAttribute('aria-invalid','true'));
    if(!invalid.length)inputs['ace-second'].setAttribute('aria-invalid','true');
    status.textContent='Ganze Zahlen von 0 bis 21 eingeben; zwei Ass-Werte müssen unterschiedlich sein.';
    showToast(status.textContent,'error');return false;
  }
  const club=ACTIVE_CLUB;blackjackSettingsBusy=true;blackjackSettings=KCTableGames.cardSettings(settings);persistState();renderTableGames();status.textContent='Kartenwerte werden gespeichert …';
  try{
    const saved=navigator.onLine&&typeof saveToFirestore==='function'?await saveToFirestore(false):false;
    if(ACTIVE_CLUB!==club)return saved;
    status.textContent=saved?'Gespeichert. Die Werte gelten ab dem nächsten Spielstart.':'Lokal gespeichert. Cloud-Speicherung noch ausstehend.';
    showToast(status.textContent,saved?'success':'error');return saved;
  }catch(error){
    if(ACTIVE_CLUB===club){status.textContent='Lokal gespeichert. Cloud-Speicherung fehlgeschlagen.';showToast(status.textContent,'error');}
    return false;
  }finally{blackjackSettingsBusy=false;renderBlackjackSettings();}
}
