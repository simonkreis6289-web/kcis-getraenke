/* Structured club penalty rules. Legacy prose is read without changing stored data. */
(() => {
  const copy=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }
  [c]));
  const fields=['offence','amount','note'];
  const id=()=> 'pt_'+crypto.randomUUID();
  function valid(table){
    if(table?.schema!==1||!Array.isArray(table.groups)||table.groups.length>50)return false;
    const ids=new Set();
    let count=0,size=0;
    function identity(value){
      if(typeof value!=='string'||!/^pt_[a-zA-Z0-9_-]{1,120}$/.test(value)||ids.has(value))return false;
      ids.add(value);
      return true;
    }
    for(const group of table.groups){
      if(!identity(group?.id)||typeof group.title!=='string'||!group.title.trim()||group.title.length>160||!Array.isArray(group.rows))return false;
      size+=group.title.length;
      for(const row of group.rows){
        if(!identity(row?.id)||!fields.every(k=>typeof row[k]==='string'&&row[k].length<=10000)||!row.offence.trim())return false;
        count++;
        size+=fields.reduce((n,k)=>n+row[k].length,0);
      }
    }
    return count<=500&&size<=100000;
  }
  function parse(text){
    const groups=[];
    let group=null,last=null;
    function section(title){
      group={
        id:'pt_group_'+groups.length,title,rows:[]
      };
      groups.push(group);
      last=null;
    }
    for(const raw of String(text||'').split(/\r?\n/)){
      let line=raw.trim();
      if(!line)continue;
      if(/^(?:Strafentabelle des Kegelclubs|Hier können die geltenden Strafen, Beträge und Erläuterungen eingetragen werden\.)$/.test(line))continue;
      if(/^(?:§\s*\d+|#{1,3}\s)/.test(line)){
        section(line.replace(/^#{1,3}\s+/,''));
        continue;
      }
      const isNote=/^(?:[-–=]>|→)/.test(line)||/^\s/.test(raw)&&!/^\s*[•*+–-]\s/.test(raw);
      if(isNote&&last){
        last.note+=(last.note?'\n':'')+line.replace(/^(?:[-–=]>|→)\s*/, '');
        continue;
      }
      line=line.replace(/^(?:[•*+–-]|\d+[.)])\s+/, '');
      if(!group)section('Strafen');
      let offence=line,amount='';
      const colon=line.indexOf(':');
      if(colon>=0){
        offence=line.slice(0,colon).trim();
        amount=line.slice(colon+1).trim();
      }
      else{
        const money=line.match(/\s+(\d+(?:[.,]\d{1,2})?\s*€(?:\s.*)?)$/);
        if(money){
          offence=line.slice(0,money.index).trim();
          amount=money[1];
        }
      }
      last={
        id:'pt_row_'+groups.length+'_'+group.rows.length,offence:offence||line,amount,note:''
      };
      group.rows.push(last);
    }
    return {
      schema:1,groups
    };
  }
  function normalize(table){
    return {
      schema:1,groups:table.groups.map(g=>({
        id:g.id,title:g.title,rows:g.rows.map(r=>({
          id:r.id,...Object.fromEntries(fields.map(k=>[k,r[k]]))
        }))
      }))
    };
  }
  function value(data){
    return valid(data?.table)?normalize(data.table):parse(data?.text||'');
  }
  function text(table){
    return table.groups.map(g=>g.title+'\n'+g.rows.map(r=>'• '+r.offence+(r.amount?': '+r.amount:'')+(r.note?'\n'+r.note.split('\n').map(n=>'\t→ '+n).join('\n'):'')).join('\n')).join('\n\n');
  }
  function markup(table,{columns=false,leftGroup}={}){
    if(!table?.groups?.some(g=>g.rows.length))return '<p class="club-content-empty">Noch keine Strafen eingetragen. Über „Strafentabelle bearbeiten“ Abschnitte und Einträge anlegen.</p>';
    const section=g=>'<section class="penalty-table-section"><h3>'+esc(g.title)+'</h3><table class="penalty-rules-table"><caption class="penalty-sr-only">'+esc(g.title)+'</caption><colgroup><col class="pt-offence"><col class="pt-amount"><col class="pt-note"></colgroup><thead><tr><th scope="col">Vergehen / Anlass</th><th scope="col">Betrag / Einsatz</th><th scope="col">Hinweise</th></tr></thead><tbody>'+g.rows.map(r=>'<tr'+(r.continued?' class="pt-continued"':'')+'><th scope="row">'+(r.continued?'<small>Fortsetzung</small>':'')+esc(r.offence)+'</th><td class="pt-value">'+esc(r.amount)+'</td><td class="pt-explanation">'+esc(r.note)+'</td></tr>').join('')+'</tbody></table></section>';
    const groups=table.groups.filter(g=>g.rows.length);
    if(!columns)return '<div class="penalty-table-document">'+groups.map(section).join('')+'</div>';
    const left=leftGroup||table.groups.find(g=>/geldstraf/i.test(g.title))?.id||table.groups[0]?.id;
    return '<div class="penalty-table-document penalty-dashboard-columns"><div class="pt-column pt-money-column">'+groups.filter(g=>g.id===left).map(section).join('')+'</div><div class="pt-column pt-other-column">'+groups.filter(g=>g.id!==left).map(section).join('')+'</div></div>';
  }
  function pages(table,fits,options={}){
    const result=[];
    let page={
      schema:1,groups:[]
    };
    const append=(target,group,row)=>{
      const next=copy(target);
      let found=next.groups.at(-1);
      if(found?.id!==group.id){
        found={
          id:group.id,title:group.title,rows:[]
        };
        next.groups.push(found);
      }
      found.rows.push(copy(row));
      return next;
    };
    const finish=()=>{
      if(page.groups.length)result.push(page);
      page={
        schema:1,groups:[]
      };
    };
    for(const group of table.groups||[])for(const original of group.rows||[]){
      let row=copy(original);
      while(row){
        const candidate=append(page,group,row);
        if(fits(markup(candidate,options))){
          page=candidate;
          row=null;
          continue;
        }
        if(page.groups.length){
          finish();
          continue;
        }
        const maximum=Math.max(...fields.map(k=>row[k].length));
        let lo=1,hi=Math.max(1,maximum);
        const prefix=(value,n)=>{
          let end=Math.max(1,n);
          if(/[\uD800-\uDBFF]/.test(value[end-1]||'')&&/[\uDC00-\uDFFF]/.test(value[end]||''))end=end===1?2:end-1;
          return value.slice(0,end);
        };
        const fragment=n=>({
          ...row,...Object.fromEntries(fields.map(k=>[k,prefix(row[k],Math.ceil(row[k].length*n/maximum))]))
        });
        while(lo<hi){
          const mid=Math.ceil((lo+hi)/2);
          if(fits(markup(append(page,group,fragment(mid)),options)))lo=mid;
          else hi=mid-1;
        }
        const part=fragment(lo);
        page=append(page,group,part);
        finish();
        const rest={
          ...row,continued:true,...Object.fromEntries(fields.map(k=>[k,row[k].slice(part[k].length)]))
        };
        row=fields.some(k=>rest[k])?rest:null;
      }
    }
    finish();
    return result.length?result:[{
      schema:1,groups:[]
    }
    ];
  }
  function editor(root,{
    onInput
  }
  ={}){
    let table={
      schema:1,groups:[]
    },busy=false,undo=[];
    const footer=root.querySelector('.club-editor-footer');
    footer?.remove();
    root.replaceChildren();
    root.classList.remove('club-statutes-editor');
    root.classList.add('penalty-table-editor');
    const tools=document.createElement('div');
    tools.className='penalty-editor-tools';
    tools.innerHTML='<p>Je Strafe eine Zeile. Geldbeträge und Getränkeeinsätze können frei eingetragen werden.</p><div><button type="button" data-pt-action="undo">↶ Rückgängig</button><button type="button" data-pt-action="group">+ Abschnitt</button></div>';
    const body=document.createElement('div');
    body.className='penalty-editor-body';
    root.append(tools,body);
    if(footer)root.append(footer);
    function controls(){
      for(const input of root.querySelectorAll('[data-pt-field]'))input.disabled=busy;
      for(const button of root.querySelectorAll('[data-pt-action]'))button.disabled=busy||button.dataset.ptAction==='undo'&&!undo.length;
    }
    function field(row,key,label,group){
      return '<textarea rows="'+(key==='note'?2:1)+'" data-pt-field="'+key+'" data-pt-group="'+esc(group.id)+'" data-pt-row="'+esc(row.id)+'" aria-label="'+label+'" placeholder="'+(key==='amount'?'z. B. 1,00 € / 1 Runde Bier':key==='note'?'Optional':'Vergehen / Anlass')+'">'+esc(row[key])+'</textarea>';
    }
    function paint(){
      body.innerHTML=table.groups.map(g=>'<section class="penalty-editor-group"><div class="penalty-editor-group-heading"><label>Abschnitt<input data-pt-field="title" data-pt-group="'+esc(g.id)+'" value="'+esc(g.title)+'" aria-label="Abschnittsname"></label><button type="button" data-pt-action="remove-group" data-pt-group="'+esc(g.id)+'" aria-label="Abschnitt entfernen">Abschnitt entfernen</button></div><div class="penalty-editor-table-wrap"><table class="penalty-rules-table"><colgroup><col class="pt-offence"><col class="pt-amount"><col class="pt-note"><col style="width:44px"></colgroup><thead><tr><th scope="col">Vergehen / Anlass</th><th scope="col">Betrag / Einsatz</th><th scope="col">Hinweise</th><th scope="col"><span class="penalty-sr-only">Aktionen</span></th></tr></thead><tbody>'+g.rows.map(r=>'<tr><td>'+field(r,'offence','Vergehen / Anlass',g)+'</td><td>'+field(r,'amount','Betrag / Einsatz',g)+'</td><td>'+field(r,'note','Hinweise',g)+'</td><td><button type="button" class="pt-remove-row" data-pt-action="remove-row" data-pt-group="'+esc(g.id)+'" data-pt-row="'+esc(r.id)+'" aria-label="Strafe entfernen">×</button></td></tr>').join('')+'</tbody></table></div><button type="button" data-pt-action="row" data-pt-group="'+esc(g.id)+'">+ Strafe</button></section>').join('')||'<p class="club-content-empty">Lege den ersten Abschnitt an, zum Beispiel „Geldstrafen“.</p>';
      controls();
    }
    root.addEventListener('input',event=>{
      const target=event.target.closest('[data-pt-field]');
      if(!target||busy)return;
      const group=table.groups.find(g=>g.id===target.dataset.ptGroup);
      if(!group)return;
      const row=target.dataset.ptRow?group.rows.find(r=>r.id===target.dataset.ptRow):group;
      if(row){
        row[target.dataset.ptField]=target.value;
        onInput?.();
      }
    });
    root.addEventListener('click',event=>{
      const button=event.target.closest('[data-pt-action]');
      if(!button||busy||button.disabled)return;
      const action=button.dataset.ptAction;
      if(action==='undo'){
        table=undo.pop()||table;
      }
      else{
        undo.push(copy(table));
        undo=undo.slice(-40);
        const group=table.groups.find(g=>g.id===button.dataset.ptGroup);
        if(action==='group')table.groups.push({
          id:id(),title:'Neuer Abschnitt',rows:[]
        });
        if(action==='row'&&group)group.rows.push({
          id:id(),offence:'',amount:'',note:''
        });
        if(action==='remove-group')table.groups=table.groups.filter(g=>g.id!==button.dataset.ptGroup);
        if(action==='remove-row'&&group)group.rows=group.rows.filter(r=>r.id!==button.dataset.ptRow);
      }
      paint();
      onInput?.();
      if(action==='row')body.querySelector('[data-pt-row="'+table.groups.find(g=>g.id===button.dataset.ptGroup)?.rows.at(-1)?.id+'"]')?.focus();
      if(action==='group')body.querySelector('[data-pt-group="'+table.groups.at(-1)?.id+'"]')?.focus();
    });
    return {
      open(value){
        table=copy(value);
        undo=[];
        paint();
      },get table(){
        return copy(table);
      },get text(){
        return text(table);
      },setBusy(value){
        busy=value;
        controls();
      },focus(){
        body.querySelector('[data-pt-field]')?.focus();
      },schedule(){}
    };
  }
  window.KCPenaltyTable=Object.freeze({
    valid,normalize,parse,value,text,markup,pages,editor
  });
})();
