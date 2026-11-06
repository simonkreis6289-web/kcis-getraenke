/* Calendar dates use UTC arithmetic; stored times are local Europe/Berlin. */
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
    if(saved?.schema===2&&KCBirthdays.parse(saved.anchorDate)&&Number.isInteger(saved.intervalWeeks)&&saved.intervalWeeks>=1&&saved.intervalWeeks<=52&&/^([01]\d|2[0-3]):[0-5]\d$/.test(saved.time||'')){
      return {...clone(saved),intervalDays:saved.intervalWeeks*7,weekday:new Date(timestamp(saved.anchorDate)).getUTCDay(),issuedDates:[...new Set((saved.issuedDates||[]).filter(date=>KCBirthdays.parse(date)))].sort()};
    }
    return {schema:1,anchorDate:friday(saved?.anchorDate)?saved.anchorDate:chooseAnchor(events,today),intervalDays:28,time:'20:00',
      issuedDates:[...new Set((Array.isArray(saved?.issuedDates)?saved.issuedDates:[]).filter(date=>KCBirthdays.parse(date)))].sort()};
  }
  function seriesKey(series){return series.id?'kegeln-'+series.id:'kegeln-4w';}
  function nearestSlot(value,anchor,days=28){
    const time=timestamp(value),start=timestamp(anchor);if(!Number.isFinite(time)||!Number.isFinite(start))return '';
    const index=Math.round((time-start)/(days*DAY));if(index<0)return '';
    const slot=start+index*days*DAY;
    // Adopt existing holiday exceptions within a week, preserving their actual date/time.
    return Math.abs(slot-time)<=Math.min(7,days/2)*DAY?dateAt(slot):'';
  }
  function plan(events=[],saved=null,today=KCBirthdays.today()){
    const end=through(today),result=clone(events),series=seriesFor(result,saved,today),issued=new Set(series.issuedDates);
    const days=series.intervalDays,key=seriesKey(series);
    for(const event of result)if(event.seriesKey===key&&KCBirthdays.parse(event.seriesDate))issued.add(event.seriesDate);
    const candidates=result.filter(e=>e.type==='kegeln'&&!e.seriesDate&&KCBirthdays.parse(e.date))
      .sort((a,b)=>{
        const aSlot=nearestSlot(a.date,series.anchorDate,days),bSlot=nearestSlot(b.date,series.anchorDate,days);
        return (aSlot?Math.abs(timestamp(a.date)-timestamp(aSlot)):Infinity)-(bSlot?Math.abs(timestamp(b.date)-timestamp(bSlot)):Infinity)||String(a.id).localeCompare(String(b.id));
      });
    for(const event of candidates){
      const slot=nearestSlot(event.date,series.anchorDate,days);
      if(slot&&!issued.has(slot)){event.seriesKey=key;event.seriesDate=slot;event.eventRevision=(Number(event.eventRevision)||0)+1;issued.add(slot);}
    }
    const start=timestamp(series.anchorDate),first=Math.max(0,Math.ceil((timestamp(today)-start)/(days*DAY)));
    for(let index=first;start+index*days*DAY<=timestamp(end);index++){
      const slot=dateAt(start+index*days*DAY);if(issued.has(slot))continue;
      result.push({id:'kc_series_'+(series.id?series.id+'_':'')+slot,type:'kegeln',date:slot,time:series.time,note:'',seriesKey:key,seriesDate:slot,eventRevision:1});issued.add(slot);
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
    if(request.action==='reconfigure'){
      if(request.id&&series.lastRequestId===request.id)return {clubTermine:events,clubKegelSerie:series};
      if((Number(state.calendarRevision)||0)!==request.expectedRevision)throw new Error('Kalender wurde inzwischen geändert. Bitte die aktuellen Termine laden und erneut speichern.');
      const config=request.config||{};
      if(typeof request.id!=='string'||!/^kc_schedule_[a-zA-Z0-9_-]{1,100}$/.test(request.id))throw new Error('Ungültige Serienkennung');
      if(!Number.isInteger(config.intervalWeeks)||config.intervalWeeks<1||config.intervalWeeks>52||!Number.isInteger(config.weekday)||config.weekday<0||config.weekday>6||!KCBirthdays.parse(config.anchorDate)||config.anchorDate<today||new Date(timestamp(config.anchorDate)).getUTCDay()!==config.weekday||!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.time||''))throw new Error('Rhythmus, Wochentag, ersten Termin ab heute und Uhrzeit gültig eingeben.');
      events=events.filter(event=>event.type!=='kegeln'||!KCBirthdays.parse(event.date)||event.date<today);
      series={schema:2,id:request.id,lastRequestId:request.id,anchorDate:config.anchorDate,intervalWeeks:config.intervalWeeks,intervalDays:config.intervalWeeks*7,weekday:config.weekday,time:config.time,issuedDates:[]};
      const next=plan(events,series,today);return {clubTermine:next.events,clubKegelSerie:next.series};
    }
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
        const slot=existing.seriesKey===seriesKey(series)?existing.seriesDate:(!existing.seriesDate&&existing.type==='kegeln'?nearestSlot(existing.date,series.anchorDate,series.intervalDays):'');
        if(slot){series.issuedDates=[...new Set([...series.issuedDates,slot])];existing.seriesKey=seriesKey(series);existing.seriesDate=slot;}
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
  window.KCKegelCalendar=Object.freeze({timestamp,friday,through,chooseAnchor,nearestSlot,plan,perform,seriesFor});
})();
