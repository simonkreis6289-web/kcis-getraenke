window.KCGameModules=window.KCGameModules||{};window.KCGameModules.guterschnitt={id:'guterschnitt',ready:true};
/* Der gute Schnitt: Vorgaben werden mit jeder Partie eingefroren. */
function renderGoodCutSettings(){
 const root=document.getElementById('goodcut-targets');if(!root||root.contains(document.activeElement))return;
 const c=extraConfig('guterschnitt');document.getElementById('goodcut-count').value=c.targets.length;
 root.innerHTML=c.targets.map((n,i)=>'<label class="game-settings-field">Ziel '+(i+1)+'<input type="number" min="1" max="9" value="'+n+'" data-goodcut-target></label>').join('');
 document.getElementById('goodcut-kranz-mode').value=c.kranzMode;document.getElementById('goodcut-kranz-value').value=c.kranzValue;goodCutKranzMode();
}
function goodCutKranzMode(){const mode=document.getElementById('goodcut-kranz-mode').value;document.getElementById('goodcut-kranz-fixed').hidden=mode!=='fixed';}
function goodCutCount(){const n=Number(document.getElementById('goodcut-count').value);if(!Number.isInteger(n)||n<1||n>50)return;const old=[...document.querySelectorAll('[data-goodcut-target]')].map(x=>Number(x.value));document.getElementById('goodcut-targets').innerHTML=Array.from({length:n},(_,i)=>'<label class="game-settings-field">Ziel '+(i+1)+'<input type="number" min="1" max="9" value="'+(old[i]||KCExtraGames.defaults('guterschnitt').targets[i%9])+'" data-goodcut-target></label>').join('');}
async function saveGoodCutSettings(){
 if(extraSettingsBusy||!ACTIVE_CLUB)return false;
 const targets=[...document.querySelectorAll('[data-goodcut-target]')].map(x=>Number(x.value)),kranzMode=document.getElementById('goodcut-kranz-mode').value,enteredKranzValue=Number(document.getElementById('goodcut-kranz-value').value),kranzValue=kranzMode==='fixed'||Number.isInteger(enteredKranzValue)&&enteredKranzValue>=1&&enteredKranzValue<=12?enteredKranzValue:8,config={...KCExtraGames.defaults('guterschnitt'),targets,kranzMode,kranzValue};
 if(!KCExtraGames.validSettings('guterschnitt',config)){showToast('Bitte 1 bis 50 Zielzahlen von 1 bis 9 und einen gültigen Kranzwert von 1 bis 12 eingeben.','error');return false;}
 const club=ACTIVE_CLUB;extraGameSettings={...extraGameSettings,guterschnitt:config};extraSettingsBusy=true;persistState();
 try{const saved=navigator.onLine&&await saveToFirestore(false);if(ACTIVE_CLUB===club)showToast(saved?'Zahlenfolge und Kranzwertung für neue Spiele gespeichert.':'Lokal gespeichert; Cloud-Abgleich ausstehend.',saved?'success':'error');return saved;}
 catch(error){if(ACTIVE_CLUB===club)showToast('Lokal gespeichert; Cloud-Abgleich fehlgeschlagen.','error');return false;}
 finally{extraSettingsBusy=false;}
}
