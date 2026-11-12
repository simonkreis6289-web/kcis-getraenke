/* Kranz bleibt eine Wurfart; sein Spielwert wird separat gespeichert. */
(() => {
  const keys=['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt'];
  const choices=[1,2,3,4,5,6,7,8,9,12];
  function valid(rule,key){return !!rule&&(rule.mode==='choose'||rule.mode==='target'&&key==='guterschnitt'||rule.mode==='fixed'&&Number.isInteger(rule.value)&&rule.value>=0&&rule.value<=100);}
  function fromConfig(config,fallback=8){return config?.kranzMode==='choose'?{mode:'choose'}:config?.kranzMode==='target'?{mode:'target'}:{mode:'fixed',value:Number.isInteger(config?.kranzValue)?config.kranzValue:fallback};}
  function configured(root,key){
    if(!keys.includes(key))throw Error('Unbekanntes Spiel');
    const saved=root?.extraGameSettings?.kranzRules?.[key];if(valid(saved,key))return {...saved};
    if(key==='siebener')return fromConfig(root?.siebenerSettings);
    if(['sechstage','gluecksspirale','bergundtal','ballermann','lattenzaun','guterschnitt'].includes(key))return fromConfig(root?.extraGameSettings?.[key]);
    if(key==='blackjack')return {mode:'fixed',value:8};
    if(key==='tannenbaum')return {mode:'choose'};
    if(key==='darts')return {mode:'fixed',value:root?.dartsState?.valueMap?.kranz??root?.dartsSettings?.kranz??50};
    if(key==='haushoch'||key==='haustief')return {mode:'fixed',value:root?.hausnummerSettings?.[key==='haushoch'?'hoch':'tief']?.kranz??(key==='haushoch'?12:0)};
    return {mode:'fixed',value:12};
  }
  function existing(key,state,root={}){
    if(valid(state?.kranzRule,key))return {...state.kranzRule};
    if(state?.config?.kranzMode)return fromConfig(state.config);
    if(key==='siebener')return fromConfig(state?.config?.seven);
    if(['sechstage','gluecksspirale','blackjack'].includes(key))return {mode:'fixed',value:state?.kranzValue??8};
    // Alte Partien behalten ihre bisherige Wertung bis zum nächsten Start.
    return configured({...root,extraGameSettings:{}},key);
  }
  function resolve(rule,selected,target){
    if(rule?.mode==='choose'){if(!choices.includes(selected))throw Error('Kranzwert wählen: 1–9 oder 12.');return selected;}
    if(rule?.mode==='target'){if(!Number.isInteger(target)||target<1||target>9)throw Error('Keine gültige Zielzahl für den Kranz.');return target;}
    if(!valid(rule,''))throw Error('Ungültige Kranzwertung.');return rule.value;
  }
  function label(rule){return rule?.mode==='choose'?'Kranz (Wert wählen)':rule?.mode==='target'?'Kranz (aktuelle Zielzahl)':'Kranz ('+rule.value+')';}
  function startRequest(root,key,request){return {...request,kranzRule:configured(root,key)};}
  window.KCKranzPolicy=Object.freeze({keys,choices,valid,configured,existing,resolve,label,startRequest});
})();
