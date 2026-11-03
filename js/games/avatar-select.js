/* V137: gemeinsame Avatar-Auswahl für Spieler-Selects in Spiel-Dialogen. */
(() => {
  const ids = ['tannenbaum-penalty-player-select','darts-penalty-player-select',
    'tiberius-thrower-select','tiberius-hit-person-select','fuchs-select'];
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sync(select) {
    const grid = document.getElementById(select.id+'-avatars');
    if (!grid) return;
    const options = [...select.options].filter(o => o.value && !o.disabled && !o.hidden);
    const signature = options.map(o => o.value+':'+o.textContent).join('|');
    if (grid.dataset.signature !== signature) {
      grid.dataset.signature = signature;
      grid.replaceChildren();
      for (const option of options) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'kc-avatar-option';
        const person = typeof persons !== 'undefined' ? persons.find(p=>p.name===option.value) : null;
        const avatar = document.createElement('span'); avatar.className='kc-avatar-image';
        const img = document.createElement('img');
        img.alt=''; img.loading='lazy';
        const names = person?.name || option.value;
        if (person?.isGuest) {
          avatar.textContent = names.trim().split(/\s+/).map(part => part[0] || '').join('').toUpperCase().slice(0, 2);
        } else {
          img.src='bilder/'+names.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'')+'.jpg';
          img.onerror=()=>{img.style.display='none';avatar.textContent=names.trim().split(/\s+/).map(part=>part[0]||'').join('').toUpperCase().slice(0,2);};
          avatar.append(img);
        }
        const label=document.createElement('span');label.textContent=option.textContent;
        button.append(avatar,label);
        button.onclick=()=>{
          select.value=option.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
          sync(select);
        };
        grid.append(button);
      }
    }
    for (const button of grid.children) {
      const index=[...grid.children].indexOf(button);
      const selected=options[index]?.value===select.value;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    }
  }
  function setup(select) {
    if (select.dataset.kcAvatarReady) return;
    select.dataset.kcAvatarReady='true';
    const grid=document.createElement('div');grid.id=select.id+'-avatars';grid.className='kc-avatar-picker';
    select.insertAdjacentElement('afterend',grid);
    select.classList.add('kc-avatar-original-select');
    new MutationObserver(()=>sync(select)).observe(select,{childList:true,subtree:true,attributes:true});
    select.addEventListener('change',()=>sync(select));
    sync(select);
  }
  function refresh() {for(const id of ids){const el=document.getElementById(id);if(el){setup(el);sync(el);}}}
  document.addEventListener('DOMContentLoaded',()=>{refresh();
    const root=document.body;
    new MutationObserver(()=>refresh()).observe(root,{childList:true,subtree:true});
  });
})();
