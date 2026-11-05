/* Calendar dates use UTC arithmetic; stored times remain local 20:00 (Europe/Berlin). */
(() => {
  const DAY=86400000,clone=value=>JSON.parse(JSON.stringify(value));
  function timestamp(value){const p=KCBirthdays.parse(value);if(!p)return NaN;const d=new Date(0);d.setUTCFullYear(p.year,p.month-1,p.day);d.setUTCHours(12,0,0,0);return d.getTime();}
  function dateAt(value){return new Date(value).toISOString().slice(0,10);}
  function friday(value){return Number.isFinite(timestamp(value))&&new Date(timestamp(value)).getUTCDay()===5;}
  function through(today){
    const p=KCBirthdays.parse(today);if(!p)throw new Error('Ungültiges Kalenderdatum');
    return KCBirthdays.parse((p.year+1)+'-'+today.slice(5))?(p.year+1)+'-'+today.slice(5):(p.year+1)+'-02-28';
  }
  function chooseAnchor(events,today){
    const dates=events.filter(e=>e.type==='kegeln'&&friday(e.date)).map(e=>e.date).sort();
    return dates.find(date=>date>=today)||dates[dates.length-1]||'2026-11-27';
  }
  function seriesFor(events,saved,today){
    return {schema:1,anchorDate:friday(saved?.anchorDate)?saved.anchorDate:chooseAnchor(events,today),intervalDays:28,time:'20:00',
      issuedDates:[...new Set((Array.isArray(saved?.issuedDates)?saved.issuedDates:[]).filter(date=>KCBirthdays.parse(date)))].sort()};
  }
  function nearestSlot(value,anchor){
    const time=timestamp(value),start=timestamp(anchor);if(!Number.isFinite(time)||!Number.isFinite(start))return '';
    const index=Math.round((time-start)/(28*DAY));if(index<0)return '';
    const slot=start+index*28*DAY;
    // Adopt existing holiday exceptions within a week, preserving their actual date/time.
    return Math.abs(slot-time)<=7*DAY?dateAt(slot):'';
  }
  function plan(events=[],saved=null,today=KCBirthdays.today()){
    const end=through(today),result=clone(events),series=seriesFor(result,saved,today),issued=new Set(series.issuedDates);
    for(const event of result)if(event.seriesKey==='kegeln-4w'&&KCBirthdays.parse(event.seriesDate))issued.add(event.seriesDate);
    const candidates=result.filter(e=>e.type==='kegeln'&&!e.seriesDate&&KCBirthdays.parse(e.date))
      .sort((a,b)=>{
        const aSlot=nearestSlot(a.date,series.anchorDate),bSlot=nearestSlot(b.date,series.anchorDate);
        return (aSlot?Math.abs(timestamp(a.date)-timestamp(aSlot)):Infinity)-(bSlot?Math.abs(timestamp(b.date)-timestamp(bSlot)):Infinity)||String(a.id).localeCompare(String(b.id));
      });
    for(const event of candidates){
      const slot=nearestSlot(event.date,series.anchorDate);
      if(slot&&!issued.has(slot)){event.seriesKey='kegeln-4w';event.seriesDate=slot;event.eventRevision=(Number(event.eventRevision)||0)+1;issued.add(slot);}
    }
    const start=timestamp(series.anchorDate),first=Math.max(0,Math.ceil((timestamp(today)-start)/(28*DAY)));
    for(let index=first;start+index*28*DAY<=timestamp(end);index++){
      const slot=dateAt(start+index*28*DAY);if(issued.has(slot))continue;
      result.push({id:'kc_series_'+slot,type:'kegeln',date:slot,time:'20:00',note:'',seriesKey:'kegeln-4w',seriesDate:slot,eventRevision:1});issued.add(slot);
    }
    series.issuedDates=[...issued].sort();
    return {events:result,series};
  }
  function validateEvent(event,types){
    if(!types.includes(event.type)||event.type==='geburtstag')throw new Error('Bitte eine gültige Terminart auswählen');
    if(!KCBirthdays.parse(event.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time||''))throw new Error('Bitte ein gültiges Datum und eine Uhrzeit eingeben');
    if(String(event.note||'').length>500)throw new Error('Bemerkung darf höchstens 500 Zeichen enthalten');
  }
  function perform(state={},request={}){
    const today=request.today||KCBirthdays.today();through(today);
    let events=clone(Array.isArray(state.clubTermine)?state.clubTermine:[]),series=seriesFor(events,state.clubKegelSerie,today);
    if(request.action!=='ensure'){
      const index=events.findIndex(event=>event.id===request.id),existing=events[index];
      const types=[...new Set(['kegeln','tour',...(state.clubTerminGruende||[]).map(type=>type.id),...(existing?[existing.type]:[])])];
      if(request.action==='add'){
        if(typeof request.id!=='string'||!/^kc_manual_[a-zA-Z0-9_-]+$/.test(request.id))throw new Error('Ungültige Termin-ID');
        const next={id:request.id,type:request.event?.type,date:request.event?.date,time:request.event?.time,note:String(request.event?.note||'').trim(),eventRevision:1};validateEvent(next,types);
        if(existing){if(['type','date','time','note'].some(key=>existing[key]!==next[key]))throw new Error('Termin wurde bereits gespeichert. Bitte erneut öffnen.');}
        else{
          if(events.some(e=>e.type===next.type&&e.date===next.date&&e.time===next.time))throw new Error('Für diesen Zeitpunkt ist bereits ein Termin dieser Art vorhanden');
          events.push(next);
        }
      }else if(request.action==='edit'||request.action==='delete'){
        if(!existing)throw new Error('Termin wurde inzwischen gelöscht. Bitte aktualisieren.');
        if((Number(existing.eventRevision)||0)!==request.expectedRevision)throw new Error('Termin wurde inzwischen geändert. Bitte erneut öffnen.');
        const slot=existing.seriesDate||(existing.type==='kegeln'?nearestSlot(existing.date,series.anchorDate):'');
        if(slot){series.issuedDates=[...new Set([...series.issuedDates,slot])];existing.seriesKey='kegeln-4w';existing.seriesDate=slot;}
        if(request.action==='delete')events.splice(index,1);
        else{
          const next={...existing,type:request.event?.type,date:request.event?.date,time:request.event?.time,note:String(request.event?.note||'').trim(),eventRevision:(Number(existing.eventRevision)||0)+1};
          validateEvent(next,types);events[index]=next;
        }
      }else throw new Error('Unbekannte Kalenderaktion');
    }
    const next=plan(events,series,today);
    return {clubTermine:next.events,clubKegelSerie:next.series};
  }
  window.KCKegelCalendar=Object.freeze({timestamp,friday,through,chooseAnchor,nearestSlot,plan,perform});
})();
