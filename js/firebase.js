import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  getDocs,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyClS5Mby1bZ39Olgra0bEvV273_c5FRTck",
  authDomain: "kegelclub-invaliden-schwadron.firebaseapp.com",
  projectId: "kegelclub-invaliden-schwadron",
  storageBucket: "kegelclub-invaliden-schwadron.firebasestorage.app",
  messagingSenderId: "1013015505267",
  appId: "1:1013015505267:web:6cc65bae12a4337cd8fd06",
  measurementId: "G-F4T56N61BF"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ─────────────────────────────────────────────
// GENERISCHE LIVE-SPIELE: HILFSFUNKTIONEN
// ─────────────────────────────────────────────
function cleanLiveGameValue(value) {
  if (value === undefined) {
    return null;
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item =>
      cleanLiveGameValue(item)
    );
  }

  if (
    value instanceof Date ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return value;
  }

  const cleaned = {};

  Object.entries(value).forEach(
    ([key, item]) => {
      if (
        item === undefined ||
        typeof item === 'function'
      ) {
        return;
      }

      cleaned[key] =
        cleanLiveGameValue(item);
    }
  );

  return cleaned;
}

function normalizeLiveGameKey(gameKey) {
  const normalized =
    String(gameKey || '')
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );

  if (!normalized) {
    throw new Error(
      'Spielschlüssel fehlt'
    );
  }

  return normalized;
}

function extractLegacyLiveGameState(data) {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return {};
  }

  if (
    data.state &&
    typeof data.state === 'object'
  ) {
    return cleanLiveGameValue(
      data.state
    );
  }

  /*
   * Übergang für bestehende Dokumente,
   * bei denen der Spielstand noch direkt
   * auf Dokumentebene liegt.
   */
  const legacyState = {
    ...data
  };

  delete legacyState.gameKey;
  delete legacyState.revision;
  delete legacyState.updatedClientId;
  delete legacyState.updatedClientAt;
  delete legacyState.updatedAt;
  delete legacyState.createdAt;

  return cleanLiveGameValue(
    legacyState
  );
}

function normalizeLiveGameDocument(
  gameKey,
  data
) {
  if (!data) {
    return null;
  }

  return {
    gameKey:
      data.gameKey ||
      normalizeLiveGameKey(
        gameKey
      ),

    state:
      extractLegacyLiveGameState(
        data
      ),

    revision:
      Math.max(
        0,
        parseInt(
          data.revision || 0,
          10
        ) || 0
      ),

    updatedClientId:
      String(
        data.updatedClientId || ''
      ),

    updatedClientAt:
      Number(
        data.updatedClientAt || 0
      ) || 0,

    updatedAt:
      data.updatedAt || null,

    createdAt:
      data.createdAt || null
  };
}

const sharedTransport=window.KCSharedTransport?.create({db,doc,runTransaction,getDocFromServer,serverTimestamp,core:window.KCSharedCore,policy:window.KCGameFinePolicy});
async function runSharedTransaction(clubId,context,_db,handler){return sharedTransport?sharedTransport.transaction(clubId,context,handler):runTransaction(_db,handler);}
async function runSharedSet(clubId,context,ref,value,options){if(!sharedTransport)return setDoc(ref,value,options);return sharedTransport.transaction(clubId,context,async tx=>{await tx.get(ref);tx.set(ref,value,options);});}
async function runSharedDelete(clubId,context,ref){if(!sharedTransport)return deleteDoc(ref);return sharedTransport.transaction(clubId,context,async tx=>{await tx.get(ref);tx.delete(ref);});}
window.firestoreApi = {

  // ─────────────────────────────────────────────
  // GESAMTZUSTAND
  // ─────────────────────────────────────────────

  async initializeSharedState(clubId,defaults,opId){if(!sharedTransport)throw Error('Synchronisierung nicht geladen');return sharedTransport.initialize(clubId,defaults,opId);},
  async commitSharedChanges(clubId,request,context){if(!sharedTransport)throw Error('Synchronisierung nicht geladen');return sharedTransport.changes(clubId,request,context);},
  async getSharedReceipt(clubId,opId){const snap=await getDocFromServer(doc(db,'clubs',clubId,'syncCommands',opId));return snap.exists()?snap.data():null;},
  subscribeClubList(onData,onError){return onSnapshot(collection(db,'clubs'),snap=>onData(snap.docs.map(item=>({id:item.id,...item.data()}))),onError);},
  async loadClubState(clubId) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "state",
      "current"
    );

    const snap = await (typeof getDocFromServer==='function'?getDocFromServer:getDoc)(ref);

    return snap.exists()
      ? snap.data()
      : null;
  },


  async startNewEvening(clubId,request={}, syncContext = null) {
    if(!clubId||!/^evening_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||'')||!request.payload||!Number.isFinite(Date.parse(request.payload.currentEveningStartedAt)))throw Error('Ungültiger Kegelabend');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async tx=>{
      const snap=await tx.get(ref),current=snap.exists()?snap.data():{};
      if(current.eveningResetOp===request.opId)return {eveningStartedAt:current.currentEveningStartedAt,state:current};
      if(String(current.currentEveningStartedAt||'')!==String(request.expectedEvening||''))throw Error('Der Kegelabend wurde inzwischen gewechselt. Bitte neu laden.');
      const payload=JSON.parse(JSON.stringify(request.payload)),evening=payload.currentEveningStartedAt,keys=Object.keys(window.KCGameFinePolicy.titles);
      const next={...payload,...current};
      for(const key of ['currentEveningStartedAt','seatingOrder','spiele','selectedLoser','teamDrinks','bahnTimerStart','bahnTimerRunning','teamStopwatchActive','teamStopwatchRunning','teamStopwatchStart','teamCountdownDuration','teamCountdownRemainingBefore'])if(payload[key]!==undefined)next[key]=payload[key];
      const gameDocs=[];for(const key of keys){const target=doc(db,'clubs',clubId,'liveGames',key),old=await tx.get(target);gameDocs.push({key,target,revision:Number(old.exists()?old.data().revision:0)||0});}
      const seatingRef=doc(db,'clubs',clubId,'live','seating');await tx.get(seatingRef);
      const roster=new Map();for(const p of (current.syncProtocol?(current.persons||[]):[...(payload.persons||[]),...(current.persons||[])]))roster.set(String(p.name).trim().toLocaleLowerCase('de'),p);
      const people=[];for(const p of roster.values()){
        const target=doc(db,'clubs',clubId,'livePersons',this.getLivePersonId(p.name)),old=await tx.get(target),live=old.exists()?old.data():{};
        const person={...p,present:false,attendanceStatus:'unknown',tisch:'',left:false,leftAt:'',arrivalTime:'',leftEarlyAt:'',paid:0,boughtThrows:0,teamExtra:0,roundExtra:0,rounds:[],freeStrafen:[],tannenbaumCharges:[],individualChargeCents:0,strafTotal:0,gameFineBase:{otherNormalCents:0,otherTopCents:0,kingCents:0},drinks:Object.fromEntries((next.DRINKS||[]).map(x=>[x.key,0])),strafen:Object.fromEntries((next.STRAFEN||[]).map(x=>[x.key,0]))};
        people.push({target,person,previous:{...p,...live}});
      }
      // Archivieren vor dem Reset, aus den im selben Vorgang gelesenen Live-Zählern.
      if(window.KCPenaltyStats){
        const oldPeople=people.map(x=>x.previous),attendees=oldPeople.filter(p=>!p.isDrinksOnly&&(p.present||p.left)).map(p=>p.name),oldEvening=current.currentEveningStartedAt||request.expectedEvening;
        const data=window.KCPenaltyStats.build({people:oldPeople,catalog:next.STRAFEN||[],logs:current.penaltyStatsLog||[],eveningStartedAt:oldEvening}),session=data.sessions.find(x=>x.key===data.currentKey);
        const history=new Map();for(const entry of [...(payload.kegelAbende||[]),...(current.kegelAbende||[])])history.set(entry.id||entry.eveningStartedAt||entry.date,entry);
        if(attendees.length){const entry={id:'stats_evening_'+encodeURIComponent(data.currentKey),date:window.KCPenaltyStats.date(oldEvening)||window.KCPenaltyStats.date(new Date().toISOString()),eveningStartedAt:oldEvening||null,attendees,statsPeople:session?.people||[],updatedAt:new Date().toISOString()};history.set(entry.id,entry);}
        next.kegelAbende=[...history.values()];
      }
      Object.assign(next,{persons:people.map(x=>x.person),currentEveningStartedAt:evening,eveningResetOp:request.opId,eveningResetRevision:(Number(current.eveningResetRevision)||0)+1,dashboardActiveGame:null,dashboardDraw:null,dashboardRandomDraw:null,dashboardRules:null,seatingOrder:Array(16).fill(''),dashboardGameOverview:{open:true,revision:(Number(current.dashboardGameOverview?.revision)||0)+1},dashboardCashView:null,dashboardClubContent:null,individualGameLedger:[],individualGameRevision:0,strafenHistory:[]});
      for(const item of gameDocs){
        const seed=window.KCExtraGames?.keys.includes(item.key)?window.KCExtraGames.empty(item.key):['siebener','hindernis'].includes(item.key)?window.KCIndividual.empty(item.key):['blackjack','gluecksspirale'].includes(item.key)?window.KCTableGames.empty(item.key):item.key==='sechstage'?window.KCSixDays.empty():payload[item.key+'State']||{};
        const value={...seed,active:false,finished:false,id:'',eveningStartedAt:evening,revision:0};next[item.key+'State']=value;tx.set(item.target,{gameKey:item.key,state:value,eveningStartedAt:evening,revision:item.revision+1,updatedClientAt:Date.now(),updatedClientId:'evening-reset',updatedAt:serverTimestamp()});
      }
      tx.set(seatingRef,{seatingOrder:Array(16).fill(''),groupSettings:next.groupSettings||{},eveningStartedAt:evening,updatedAt:serverTimestamp()});
      for(const item of people)tx.set(item.target,{...item.person,eveningStartedAt:evening,updatedAt:serverTimestamp()});
      tx.set(ref,next);return {eveningStartedAt:evening,state:next};
    });
  },
  async saveClubState(clubId, payload = {}, syncContext = null) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "state",
      "current"
    );

    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},next={...payload};
      if(current.syncProtocol)throw Error('Vollständige lokale Stände dürfen nicht mehr hochgeladen werden. Bitte neu laden.');
      if(current.eveningResetRevision&&payload.currentEveningStartedAt!==current.currentEveningStartedAt)throw Error('Der Kegelabend wurde inzwischen gewechselt. Bitte neu laden.');
      if(current.dashboardRules?.revision)next.dashboardRules=current.dashboardRules;else delete next.dashboardRules;
      for(const key of ['dashboardCashView','cashStandingOrders','dashboardClubContent','dashboardGameOverview','dashboardRandomDraw']){if(current[key]?.revision)next[key]=current[key];else delete next[key];}
      if(current.gameOptionsRevision){next.gameOptions=current.gameOptions;next.gameOptionsRevision=current.gameOptionsRevision;next.gameOptionsCommands=current.gameOptionsCommands||[];}
      if(current.gameFineSettingsRevision){next.gameFineSettings=current.gameFineSettings||{};next.gameFineSettingsRevision=current.gameFineSettingsRevision;next.gameFineSettingsCommands=current.gameFineSettingsCommands||[];}
      if(current.penaltyStatsSettings?.revision)next.penaltyStatsSettings=current.penaltyStatsSettings;
      const gameFields=['sechstageState','blackjackState','gluecksspiraleState','siebenerState','hindernisState','bergundtalState','ballermannState','lattenzaunState','guterschnittState'];
      const savedEveningId=current.currentEveningStartedAt||gameFields.map(key=>current[key]?.eveningStartedAt).find(Boolean)||'';
      const requestedEvening=Date.parse(payload.currentEveningStartedAt||''),savedEvening=Date.parse(savedEveningId);
      if(gameFields.some(key=>current[key]?.revision)&&(!Number.isFinite(requestedEvening)||requestedEvening<=savedEvening)){
        next.currentEveningStartedAt=savedEveningId;
        next.individualGameLedger=current.individualGameLedger||[];next.individualGameRevision=Number(current.individualGameRevision)||0;
        if(Number(payload.individualGameRevision||0)<Number(current.individualGameRevision||0))next.dashboardActiveGame=current.dashboardActiveGame;
        if(Array.isArray(next.persons))next.persons=next.persons.map(person=>{
          const cents=next.individualGameLedger.filter(x=>x.eveningStartedAt===savedEveningId&&String(x.personName).trim().toLocaleLowerCase('de')===String(person.name).trim().toLocaleLowerCase('de')).reduce((sum,x)=>sum+x.amountCents,0);
          return window.KCGameFinePolicy?{...person,individualChargeCents:cents}:{...person,strafTotal:Math.round(((Number(person.strafTotal)||0)-(Number(person.individualChargeCents)||0)/100+cents/100)*100)/100,individualChargeCents:cents};
        });
        for(const key of gameFields)if(current[key]?.revision)next[key]=current[key];
        const incoming=Array.isArray(payload.penaltyStatsLog)?payload.penaltyStatsLog:(current.penaltyStatsLog||[]);
        const owned=entry=>entry.sixDaysRaceId||entry.tableGameId||entry.individualGameId;
        next.penaltyStatsLog=[...incoming.filter(entry=>!owned(entry)),...(current.penaltyStatsLog||[]).filter(owned)];
      }
      if(current.currentEveningStartedAt===next.currentEveningStartedAt&&Array.isArray(current.strafenHistory)){
        next.strafenHistory=[...(current.strafenHistory.filter(e=>e.serverGameResult)),...(Array.isArray(payload.strafenHistory)?payload.strafenHistory:current.strafenHistory).filter(e=>!e.serverGameResult)];
      }
      const managed=current.clubCalendarData?.calendarRevision?current.clubCalendarData:current;
      let calendar=null;
      if(Number(managed.calendarRevision)>0){
        // General state uploads must never restore stale/moved/deleted calendar entries.
        const proposed=Array.isArray(payload.clubTermine)?payload.clubTermine:[];
        const events=(managed.clubTermine||[]).map(event=>{
          const claim=event.type==='geburtstag'&&!event.memberBirthdayName?proposed.find(p=>p.id===event.id&&p.type==='geburtstag'&&p.memberBirthdayName):null;
          return claim?{...event,memberBirthdayName:claim.memberBirthdayName}:event;
        });
        const revision=Number(managed.calendarRevision)+(JSON.stringify(events)!==JSON.stringify(managed.clubTermine||[])?1:0);
        calendar={clubTermine:events,clubKegelSerie:managed.clubKegelSerie||null,calendarRevision:revision};
        Object.assign(next,calendar,{clubCalendarData:calendar});
      }
      if(window.KCGameFinePolicy&&Array.isArray(next.persons)){
        // Live-Zähler sind maßgeblich: ein verzögerter Gesamtupload darf eine
        // gerade gebuchte Spielstrafe auch in der Dashboard-Summe nicht verlieren.
        if(current.currentEveningStartedAt===next.currentEveningStartedAt){
          const people=[];
          for(const person of next.persons){const live=await transaction.get(doc(db,'clubs',clubId,'livePersons',this.getLivePersonId(person.name)));people.push(live.exists()?{...person,strafen:live.data().strafen||person.strafen}:person);}
          next.persons=people;
        }
        next.persons=window.KCGameFinePolicy.applyTotals(next.persons,{...current,...next},current);
      }
      transaction.set(ref,{...next,updatedAt:serverTimestamp()},{merge:true});
      return calendar;
    });
  },

  async updateClubCalendar(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCKegelCalendar)throw new Error('Kalenderzugriff nicht verfügbar');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{};
      const managed=current.clubCalendarData?.calendarRevision?{...current,...current.clubCalendarData}:current;
      const base=!Array.isArray(managed.clubTermine)&&!managed.calendarRevision&&Array.isArray(request.bootstrapEvents)?{...managed,clubTermine:request.bootstrapEvents}:managed;
      const next=window.KCKegelCalendar.perform(base,request);
      const changed=!managed.calendarRevision||JSON.stringify(next.clubTermine)!==JSON.stringify(managed.clubTermine||[])||JSON.stringify(next.clubKegelSerie)!==JSON.stringify(managed.clubKegelSerie||null);
      const revision=(Number(managed.calendarRevision)||0)+(changed?1:0);
      const calendar={...next,calendarRevision:revision};
      const repair=!current.clubCalendarData||JSON.stringify(current.clubTermine)!==JSON.stringify(next.clubTermine)||JSON.stringify(current.clubKegelSerie)!==JSON.stringify(next.clubKegelSerie)||current.calendarRevision!==revision;
      if(changed||repair)transaction.set(ref,{...calendar,clubCalendarData:calendar,updatedAt:serverTimestamp()},{merge:true});
      return calendar;
    });
  },

  async setDashboardGameOverview(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCGameOverview||typeof request.open!=='boolean'||!Number.isSafeInteger(request.expectedRevision)||!/^overview_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||''))throw Error('Ungültige Spielübersicht.');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},before=current.dashboardGameOverview||{};
      if((before.commands||[]).includes(request.opId))return before;
      if(Number(before.revision||0)!==request.expectedRevision)throw Error('Spielübersicht wurde inzwischen geändert. Bitte erneut versuchen.');
      const value={open:request.open,gameStamp:window.KCGameOverview.context(current).gameStamp,revision:Number(before.revision||0)+1,commands:[...(before.commands||[]),request.opId].slice(-128)};
      const updates={dashboardGameOverview:value,updatedAt:serverTimestamp()};
      if(value.open)for(const key of ['dashboardCashView','dashboardRules','dashboardClubContent'])if(current[key]?.open)updates[key]={...current[key],open:false,revision:Number(current[key].revision||0)+1};
      transaction.set(ref,updates,{merge:true});return value;
    });
  },

  async updateGameOptions(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCGameOptions?.valid(request.options)||!/^options_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||'')||!Number.isSafeInteger(request.expectedRevision))throw Error('Ungültige Spieleinstellungen.');
    const ref=doc(db,'clubs',clubId,'state','current');return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{};if((current.gameOptionsCommands||[]).includes(request.opId))return {options:current.gameOptions,revision:current.gameOptionsRevision};
      if(Number(current.gameOptionsRevision||0)!==request.expectedRevision)throw Error('Spieleinstellungen wurden inzwischen geändert. Bitte erneut versuchen.');
      const options=window.KCGameOptions.value(request.options),revision=Number(current.gameOptionsRevision||0)+1;transaction.set(ref,{gameOptions:options,gameOptionsRevision:revision,gameOptionsCommands:[...(current.gameOptionsCommands||[]),request.opId].slice(-128),updatedAt:serverTimestamp()},{merge:true});return {options,revision};
    });
  },
  async drawRandomGame(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCGameOptions||!['draw','close'].includes(request.action)||!/^gamedraw_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||''))throw Error('Ungültige Spielauslosung.');
    const ref=doc(db,'clubs',clubId,'state','current');return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},old=current.dashboardRandomDraw;
      if(request.action==='close'){if(old?.id===request.drawId)transaction.set(ref,{dashboardRandomDraw:{...old,closed:true,revision:Number(old.revision||0)+1},updatedAt:serverTimestamp()},{merge:true});return null;}
      if(old?.id===request.opId)return old;
      if(Number(current.gameOptionsRevision||0)!==request.expectedRevision||String(current.currentEveningStartedAt||'')!==String(request.eveningStartedAt||''))throw Error('Einstellungen oder Kegelabend wurden inzwischen geändert. Bitte erneut versuchen.');
      const pool=window.KCGameOptions.pool(current.gameOptions),winner=window.KCGameOptions.pick(current.gameOptions),label=g=>g.icon+' '+g.title;
      const draw={id:request.opId,kind:'game',title:'🎲 Zufälliges Kegelspiel',frames:pool.map(label),winner:label(winner),winnerKey:winner.key,startedAt:Date.now(),steps:26,interval:110,revision:Number(old?.revision||0)+1,closed:false};
      const update={dashboardRandomDraw:draw,updatedAt:serverTimestamp()};for(const key of ['dashboardCashView','dashboardRules','dashboardClubContent'])if(current[key]?.open)update[key]={...current[key],open:false,revision:Number(current[key].revision||0)+1};transaction.set(ref,update,{merge:true});return draw;
    });
  },

  async updateGameFineSettings(clubId,request={}, syncContext = null) {
    const policy=window.KCGameFinePolicy;
    if(!clubId||!policy||!Object.hasOwn(policy.titles,request.gameKey)||typeof request.onTop!=='boolean'||!/^fine_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||''))throw Error('Ungültige OnTop-Einstellung.');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{};
      if((current.gameFineSettingsCommands||[]).includes(request.opId))return {gameFineSettings:current.gameFineSettings||{},gameFineSettingsRevision:current.gameFineSettingsRevision||0};
      const settings={...(current.gameFineSettings||{}),[request.gameKey]:request.onTop},revision=Number(current.gameFineSettingsRevision||0)+1,people=[];
      for(const person of current.persons||[]){const live=await transaction.get(doc(db,'clubs',clubId,'livePersons',this.getLivePersonId(person.name)));people.push(live.exists()?{...person,strafen:live.data().strafen||person.strafen}:person);}
      const value={gameFineSettings:settings,gameFineSettingsRevision:revision};
      const finalPeople=policy.applyTotals(people,{...current,...value},current);
      transaction.set(ref,{...value,persons:finalPeople,gameFineSettingsCommands:[...(current.gameFineSettingsCommands||[]),request.opId].slice(-128),updatedAt:serverTimestamp()},{merge:true});
      return value;
    });
  },

  subscribeClubContent(clubId,kind,onChange,onError) {
    if(!clubId||!['notes','statutes','penalties'].includes(kind))throw Error('Ungültige Clubunterlage.');
    return onSnapshot(doc(db,'clubs',clubId,'documents',kind),snap=>onChange(snap.exists()?snap.data():null),onError);
  },

  async updateClubContent(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCClubContent||!['notes','statutes','penalties'].includes(request.kind))throw Error('Clubunterlagen nicht verfügbar.');
    const ref=doc(db,'clubs',clubId,'documents',request.kind);
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),before=snap.exists()?snap.data():null;
      const value=window.KCClubContent.change(request.kind,before,request);
      if(value!==before)transaction.set(ref,{...value,updatedAt:serverTimestamp()});
      return value;
    });
  },

  async setClubContentDashboard(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCClubContent)throw Error('Dashboard-Steuerung nicht verfügbar.');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},before=current.dashboardClubContent||null;
      const value=window.KCClubContent.view(before,request);if(value===before)return value;
      const updates={dashboardClubContent:value,updatedAt:serverTimestamp()};
      if(request.action==='open')for(const key of ['dashboardCashView','dashboardRules','dashboardGameOverview'])if(current[key]?.open)updates[key]={...current[key],open:false,revision:Number(current[key].revision||0)+1};
      transaction.set(ref,updates,{merge:true});return value;
    });
  },

  async setCashDashboardView(clubId,request={}, syncContext = null) {
    if(!clubId||typeof request.open!=='boolean'||!/^cash_[a-zA-Z0-9_-]{1,100}$/.test(request.opId)||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)throw Error('Ungültige Abrechnungsanzeige');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},before=current.dashboardCashView||{};
      if((before.commands||[]).includes(request.opId))return before;
      if(Number(before.revision||0)!==request.expectedRevision)throw Error('Dashboard-Ansicht wurde inzwischen geändert. Bitte erneut versuchen.');
      const value={open:request.open,revision:Number(before.revision||0)+1,commands:[...(before.commands||[]),request.opId].slice(-128)};
      const updates={dashboardCashView:value,updatedAt:serverTimestamp()};if(value.open)for(const key of ['dashboardClubContent','dashboardGameOverview', 'dashboardRules'])if(current[key]?.open)updates[key]={...current[key],open:false,revision:Number(current[key].revision||0)+1};
      transaction.set(ref,updates,{merge:true});return value;
    });
  },

  async updateCashStandingOrders(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCCashOverview||!['upsert','delete'].includes(request.action)||!/^cash_[a-zA-Z0-9_-]{1,100}$/.test(request.opId)||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)throw Error('Ungültiger Dauerauftrag');
    if(request.action==='upsert'&&!window.KCCashOverview.validOrder(request.order))throw Error('Ungültiger Dauerauftrag');
    if(request.action==='delete'&&!/^standing_[a-zA-Z0-9_-]{1,100}$/.test(request.id))throw Error('Ungültiger Dauerauftrag');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},before=current.cashStandingOrders||{};
      if((before.commands||[]).includes(request.opId))return before;
      if(Number(before.revision||0)!==request.expectedRevision)throw Error('Daueraufträge wurden inzwischen geändert. Bitte erneut versuchen.');
      let orders=(before.orders||[]).slice();
      if(request.action==='delete')orders=orders.filter(o=>o.id!==request.id);
      else{
        const {id,personName,amountCents,interval,startDate,endDate=''}=request.order;
        if(!(current.persons||[]).some(p=>p.name===personName&&!p.isGuest&&!p.isDrinksOnly))throw Error('Bitte ein vorhandenes Mitglied auswählen.');
        if(orders.some(o=>o.id!==id&&window.KCCashOverview.key(o.personName)===window.KCCashOverview.key(personName)))throw Error('Für dieses Mitglied besteht bereits ein Dauerauftrag.');
        orders=orders.filter(o=>o.id!==id);orders.push({id,personName,amountCents,interval,startDate,endDate});
      }
      if(orders.length>200)throw Error('Zu viele Daueraufträge.');
      const value={orders,revision:Number(before.revision||0)+1,commands:[...(before.commands||[]),request.opId].slice(-128)};
      transaction.set(ref,{cashStandingOrders:value,updatedAt:serverTimestamp()},{merge:true});return value;
    });
  },

  async setDashboardRules(clubId,request={}, syncContext = null) {
    if(!clubId||!['open','close'].includes(request.action)||!['sechstage','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt'].includes(request.gameKey)||typeof request.token!=='string'||!/^rules_session_[a-zA-Z0-9_-]{1,100}$/.test(request.token)||typeof request.opId!=='string'||!/^rules_[a-zA-Z0-9_-]{1,100}$/.test(request.opId))throw new Error('Ungültige Regelanzeige');
    if(request.rulesConfig!==undefined&&!(request.gameKey==='hindernis'&&window.KCIndividual?.validSettings(request.rulesConfig)||request.gameKey==='siebener'&&window.KCIndividual?.validSevenSettings(request.rulesConfig)||window.KCExtraGames?.keys.includes(request.gameKey)&&window.KCExtraGames.validSettings(request.gameKey,request.rulesConfig)))throw new Error('Ungültige Spielregeln');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},before=current.dashboardRules||{};
      if((before.commands||[]).includes(request.opId))return before;
      // A close from an older popup must not dismiss a newer controller's rules.
      if(request.action==='close'&&(!before.open||before.token!==request.token||before.gameKey!==request.gameKey))return before;
      const value={schema:1,open:request.action==='open',gameKey:request.gameKey,...(['hindernis','siebener','bergundtal','ballermann','lattenzaun','guterschnitt'].includes(request.gameKey)&&request.rulesConfig?{rulesConfig:JSON.parse(JSON.stringify(request.rulesConfig))}:{}),token:request.token,revision:(Number(before.revision)||0)+1,commands:[...(before.commands||[]),request.opId].slice(-128)};
      const updates={dashboardRules:value,updatedAt:serverTimestamp()};if(value.open)for(const key of ['dashboardClubContent','dashboardGameOverview', 'dashboardCashView'])if(current[key]?.open)updates[key]={...current[key],open:false,revision:Number(current[key].revision||0)+1};
      transaction.set(ref,updates,{merge:true});return value;
    });
  },

  async updatePenaltyStatsSettings(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCPenaltyStats)throw new Error('Statistikzugriff nicht verfügbar');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{},previous=current.penaltyStatsSettings;
      if(typeof request.id!=='string'||!/^stats_[a-zA-Z0-9_-]{1,100}$/.test(request.id))throw new Error('Ungültige Statistikaktion');
      if(previous?.lastRequestId===request.id)return previous;
      if((Number(previous?.revision)||0)!==request.expectedRevision)throw new Error('Statistikstart wurde inzwischen geändert. Bitte die aktuellen Daten laden.');
      if(!['date','now'].includes(request.mode)||request.mode==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(request.startDate||''))throw new Error('Gültigen Starttermin wählen');
      const now=new Date().toISOString(),people=[];
      if(request.mode==='now')for(const person of current.persons||[]){
        const live=await transaction.get(doc(db,'clubs',clubId,'livePersons',this.getLivePersonId(person.name)));
        people.push(live.exists()?{...person,...live.data(),name:person.name}:person);
      }
      const data=window.KCPenaltyStats.build({people,catalog:current.STRAFEN||[],evenings:current.kegelAbende||[],logs:current.penaltyStatsLog||[],eveningStartedAt:current.currentEveningStartedAt||''});
      const settings={schema:1,mode:request.mode,startDate:request.mode==='date'?request.startDate:window.KCPenaltyStats.date(now),startAt:request.mode==='now'?now:null,baseline:request.mode==='now'?window.KCPenaltyStats.baseline(data):null,revision:(Number(previous?.revision)||0)+1,lastRequestId:request.id};
      if(request.mode==='date'&&window.KCPenaltyStats.date(request.startDate)!==request.startDate)throw new Error('Gültigen Starttermin wählen');
      transaction.set(ref,{penaltyStatsSettings:settings,updatedAt:serverTimestamp()},{merge:true});return settings;
    });
  },

  async transactSechsGame(clubId,request={}, syncContext = null) {
    if(!clubId||!window.KCSixDays)throw new Error('Rennspiel ist noch nicht verfügbar');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{};
      const existingEvening=String(current.currentEveningStartedAt||current.sechstageState?.eveningStartedAt||'');
      const repeatedInitialStart=request.action==='start'&&!request.eveningStartedAt&&current.sechstageState?.eveningStartedAt===existingEvening&&current.sechstageState?.commands?.includes(request.opId);
      if(String(request.eveningStartedAt||'')!==existingEvening&&!repeatedInitialStart)throw new Error('Der Kegelabend wurde inzwischen gewechselt');
      const now=new Date(request.now||Date.now()).toISOString(),evening=existingEvening||now;
      const before=current.sechstageState?.eveningStartedAt===existingEvening?current.sechstageState:window.KCSixDays.empty();
      const context={people:Array.isArray(current.persons)?current.persons:[],catalog:current.STRAFEN||[],now,eveningStartedAt:evening,club:request.clubName||clubId};
      if(request.action==='start')request={...request,onTop:request.onTop===true&&window.KCGameOptions?.eligible(current.gameOptions,'sechstage')===true};
      const result=window.KCSixDays.command(before,request,context),next=result.state;
      const effect=result.repeat?{changes:[],added:[],removed:[]}:window.KCSixDays.effects(before,next,request,context);
      const receipt=result.repeat?(next.receipts||[]).find(item=>item.id===request.opId):null;
      const affected=result.repeat?(receipt?.changes||[]):effect.changes;
      const groups=new Map();
      for(const change of affected){
        const id=this.getLivePersonId(change.personName);
        if(!groups.has(id))groups.set(id,{name:change.personName,changes:[]});groups.get(id).changes.push(change);
      }
      const loaded=[];
      for(const [id,group] of groups){
        const personRef=doc(db,'clubs',clubId,'livePersons',id),personSnap=await transaction.get(personRef);
        const fallback=context.people.find(person=>person.name===group.name)||{};
        loaded.push({...group,ref:personRef,current:personSnap.exists()?personSnap.data():fallback,exists:personSnap.exists()});
      }
      const counters=[];
      let finalStats=current.penaltyStatsLog||[];
      for(const group of loaded){
        const values={...(group.current.strafen||{})};
        for(const change of group.changes){
          const value=Number(values[change.key]||0)+(result.repeat?0:change.delta);
          if(!Number.isSafeInteger(value)||value<0)throw new Error('Strafzähler wurde inzwischen geändert. Rückgängig nicht möglich.');
          values[change.key]=value;counters.push({personName:group.name,category:'strafen',key:change.key,value});
        }
        group.finalValues=values;
        if(!result.repeat)transaction.set(group.ref,{
          ...(!group.exists?{present:!!group.current.present,isGuest:!!group.current.isGuest,left:!!group.current.left,drinks:{...(group.current.drinks||{})}}:{}),
          name:group.name,strafen:values,updatedAt:serverTimestamp()
        },{merge:true});
      }
      const resultHistory=window.KCGameResults?.append(current.strafenHistory,'sechstage',next,{now,groups:current.groupSettings||{},server:true,catalog:current.STRAFEN||[]})||current.strafenHistory||[];
      if(!result.repeat){
        next.receipts=[...(next.receipts||[]),{id:request.opId,changes:effect.changes}].slice(-64);
        const removed=new Set(effect.removed);finalStats=[...(current.penaltyStatsLog||[]).filter(entry=>!removed.has(entry.id)),...effect.added];
        const finePeople=window.KCGameFinePolicy?window.KCGameFinePolicy.applyTotals((current.persons||[]).map(p=>{const live=loaded.find(g=>g.name===p.name);return live?{...p,strafen:live.finalValues}:p;}),{...current,sechstageState:next,strafenHistory:resultHistory,currentEveningStartedAt:evening},current):null;
        transaction.set(ref,{sechstageState:next,...(finePeople?{persons:finePeople}:{}),currentEveningStartedAt:evening,dashboardActiveGame:'sechstage',penaltyStatsLog:finalStats,strafenHistory:resultHistory,updatedAt:serverTimestamp()},{merge:true});
      }
      return {gameResultsHistory:resultHistory.filter(e=>e.serverGameResult),state:next,eveningStartedAt:existingEvening||next.eveningStartedAt,counters,added:effect.added,removed:effect.removed,gameStats:finalStats.filter(entry=>entry.sixDaysRaceId),repeat:result.repeat};
    });
  },

  async transactTableGame(clubId,request={}, syncContext = null) {
    const gameKey=request.gameKey;if(!['blackjack','gluecksspirale'].includes(gameKey))throw new Error('Unbekanntes Spiel');
    const stateKey=gameKey+'State';
    if(!clubId||!window.KCTableGames)throw new Error('Spiel ist noch nicht verfügbar');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{};
      const existingEvening=String(current.currentEveningStartedAt||current[stateKey]?.eveningStartedAt||'');
      const repeatedInitialStart=request.action==='start'&&!request.eveningStartedAt&&current[stateKey]?.eveningStartedAt===existingEvening&&current[stateKey]?.commands?.includes(request.opId);
      if(String(request.eveningStartedAt||'')!==existingEvening&&!repeatedInitialStart)throw new Error('Der Kegelabend wurde inzwischen gewechselt');
      const now=new Date(request.now||Date.now()).toISOString(),evening=existingEvening||now;
      const before=current[stateKey]?.eveningStartedAt===existingEvening?current[stateKey]:window.KCTableGames.empty(gameKey);
      const context={people:Array.isArray(current.persons)?current.persons:[],catalog:current.STRAFEN||[],now,eveningStartedAt:evening,club:request.clubName||clubId};
      let result,effect;
      if(request.action==='start')request={...request,onTop:request.onTop===true&&window.KCGameOptions?.eligible(current.gameOptions,request.gameKey)===true};
      try{result=window.KCTableGames.command(before,request,context);effect=result.repeat?{changes:[],added:[],removed:[]}:window.KCTableGames.effects(before,result.state,request,context);}catch(error){error.code='table-game-rejected';throw error;}
      const next=result.state;if(request.action==='start')Object.assign(next,{gameFineFrozen:true,onTop:request.onTop===true,gameFineOnTop:request.onTop===true});if(next.gameFineFrozen)for(const row of effect.moneyAdded||[])Object.assign(row,{gameFineFrozen:true,onTop:next.onTop===true});
      const receipt=result.repeat?(next.receipts||[]).find(item=>item.id===request.opId):null;
      const affected=result.repeat?(receipt?.changes||[]):effect.changes;
      const groups=new Map();
      for(const change of affected){
        const id=this.getLivePersonId(change.personName);
        if(!groups.has(id))groups.set(id,{name:change.personName,changes:[]});groups.get(id).changes.push(change);
      }
      const loaded=[];
      for(const [id,group] of groups){
        const personRef=doc(db,'clubs',clubId,'livePersons',id),personSnap=await transaction.get(personRef);
        const fallback=context.people.find(person=>person.name===group.name)||{};
        loaded.push({...group,ref:personRef,current:personSnap.exists()?personSnap.data():fallback,exists:personSnap.exists()});
      }
      const counters=[];
      let finalStats=current.penaltyStatsLog||[];
      for(const group of loaded){
        const values={...(group.current.strafen||{})};
        for(const change of group.changes){
          const value=Number(values[change.key]||0)+(result.repeat?0:change.delta);
          if(!Number.isSafeInteger(value)||value<0)throw new Error('Strafzähler wurde inzwischen geändert. Rückgängig nicht möglich.');
          values[change.key]=value;counters.push({personName:group.name,category:'strafen',key:change.key,value});
        }
        group.finalValues=values;
        if(!result.repeat)transaction.set(group.ref,{
          ...(!group.exists?{present:!!group.current.present,isGuest:!!group.current.isGuest,left:!!group.current.left,drinks:{...(group.current.drinks||{})}}:{}),
          name:group.name,strafen:values,updatedAt:serverTimestamp()
        },{merge:true});
      }
      const resultHistory=window.KCGameResults?.append(current.strafenHistory,gameKey,next,{now,groups:current.groupSettings||{},server:true,catalog:current.STRAFEN||[]})||current.strafenHistory||[];
      if(!result.repeat){
        next.receipts=[...(next.receipts||[]),{id:request.opId,changes:effect.changes}].slice(-64);
        const removed=new Set(effect.removed);finalStats=[...(current.penaltyStatsLog||[]).filter(entry=>!removed.has(entry.id)),...effect.added];
        const finePeople=window.KCGameFinePolicy?window.KCGameFinePolicy.applyTotals((current.persons||[]).map(p=>{const live=loaded.find(g=>g.name===p.name);return live?{...p,strafen:live.finalValues}:p;}),{...current,[stateKey]:next,strafenHistory:resultHistory,currentEveningStartedAt:evening},current):null;
        transaction.set(ref,{[stateKey]:next,...(finePeople?{persons:finePeople}:{}),currentEveningStartedAt:evening,dashboardActiveGame:gameKey,penaltyStatsLog:finalStats,strafenHistory:resultHistory,updatedAt:serverTimestamp()},{merge:true});
      }
      return {gameResultsHistory:resultHistory.filter(e=>e.serverGameResult),state:next,eveningStartedAt:existingEvening||next.eveningStartedAt,counters,added:effect.added,removed:effect.removed,gameStats:finalStats.filter(entry=>entry.tableGameId),repeat:result.repeat};
    });
  },
  async transactIndividualGame(clubId,request={}, syncContext = null) {
    const gameKey=request.gameKey;if(!['siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt'].includes(gameKey))throw new Error('Unbekanntes Spiel');
    const stateKey=gameKey+'State',core=['siebener','hindernis'].includes(gameKey)?window.KCIndividual:window.KCExtraGames;
    if(!clubId||!core)throw new Error('Spiel ist noch nicht verfügbar');
    const ref=doc(db,'clubs',clubId,'state','current');
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const snap=await transaction.get(ref),current=snap.exists()?snap.data():{};
      const existingEvening=String(current.currentEveningStartedAt||current[stateKey]?.eveningStartedAt||'');
      const repeatedInitialStart=request.action==='start'&&!request.eveningStartedAt&&current[stateKey]?.eveningStartedAt===existingEvening&&current[stateKey]?.commands?.includes(request.opId);
      if(String(request.eveningStartedAt||'')!==existingEvening&&!repeatedInitialStart)throw new Error('Der Kegelabend wurde inzwischen gewechselt');
      const now=new Date(core===window.KCExtraGames?Date.now():request.now||Date.now()).toISOString(),evening=existingEvening||now;
      const before=current[stateKey]?.eveningStartedAt===existingEvening?current[stateKey]:core.empty(gameKey);
      const context={people:Array.isArray(current.persons)?current.persons:[],catalog:current.STRAFEN||[],now,eveningStartedAt:evening,club:request.clubName||clubId,groups:current.groupSettings||{}};
      let result,effect;
      if(request.action==='start')request={...request,onTop:request.onTop===true&&window.KCGameOptions?.eligible(current.gameOptions,gameKey)===true};
      try{result=core.command(before,request,context);effect=result.repeat?{changes:[],added:[],removed:[]}:core.effects(before,result.state,request,context);}catch(error){error.code='individual-game-rejected';throw error;}
      const next=result.state;if(request.action==='start')Object.assign(next,{gameFineFrozen:true,onTop:request.onTop===true,gameFineOnTop:request.onTop===true});if(next.gameFineFrozen)for(const row of effect.moneyAdded||[])Object.assign(row,{gameFineFrozen:true,onTop:next.onTop===true});
      const receipt=result.repeat?(next.receipts||[]).find(item=>item.id===request.opId):null;
      const affected=result.repeat?(receipt?.changes||[]):effect.changes;
      const groups=new Map();
      for(const change of affected){
        const id=this.getLivePersonId(change.personName);
        if(!groups.has(id))groups.set(id,{name:change.personName,changes:[]});groups.get(id).changes.push(change);
      }
      const loaded=[];
      for(const [id,group] of groups){
        const personRef=doc(db,'clubs',clubId,'livePersons',id),personSnap=await transaction.get(personRef);
        const fallback=context.people.find(person=>person.name===group.name)||{};
        loaded.push({...group,ref:personRef,current:personSnap.exists()?personSnap.data():fallback,exists:personSnap.exists()});
      }
      const counters=[];
      let finalStats=current.penaltyStatsLog||[];
      for(const group of loaded){
        const values={...(group.current.strafen||{})};
        for(const change of group.changes){
          const value=Number(values[change.key]||0)+(result.repeat?0:change.delta);
          if(!Number.isSafeInteger(value)||value<0)throw new Error('Strafzähler wurde inzwischen geändert. Rückgängig nicht möglich.');
          values[change.key]=value;counters.push({personName:group.name,category:'strafen',key:change.key,value});
        }
        group.finalValues=values;
        if(!result.repeat)transaction.set(group.ref,{
          ...(!group.exists?{present:!!group.current.present,isGuest:!!group.current.isGuest,left:!!group.current.left,drinks:{...(group.current.drinks||{})}}:{}),
          name:group.name,strafen:values,updatedAt:serverTimestamp()
        },{merge:true});
      }
      const keptHistory=request.action==='undo'&&before.finished&&!next.finished?(current.strafenHistory||[]).filter(e=>e.id!==('game_result_'+gameKey+'_'+before.id)):current.strafenHistory;
      const resultHistory=window.KCGameResults?.append(keptHistory,gameKey,next,{now,groups:current.groupSettings||{},server:true,catalog:current.STRAFEN||[]})||current.strafenHistory||[];
      if(!result.repeat){
        next.receipts=[...(next.receipts||[]),{id:request.opId,changes:effect.changes}].slice(-64);
        const removed=new Set(effect.removed);finalStats=[...(current.penaltyStatsLog||[]).filter(entry=>!removed.has(entry.id)),...effect.added];
        const removedMoney=new Set(effect.moneyRemoved),ledger=[...(current.individualGameLedger||[]).filter(x=>!removedMoney.has(x.id)),...effect.moneyAdded];
        let people=(current.persons||[]).map(person=>{
          const cents=ledger.filter(x=>x.eveningStartedAt===evening&&String(x.personName).trim().toLocaleLowerCase('de')===String(person.name).trim().toLocaleLowerCase('de')).reduce((sum,x)=>sum+x.amountCents,0);
          const live=loaded.find(g=>g.name===person.name);return window.KCGameFinePolicy?{...person,...(live?{strafen:live.finalValues}:{}),individualChargeCents:cents}:{...person,strafTotal:Math.round(((Number(person.strafTotal)||0)-(Number(person.individualChargeCents)||0)/100+cents/100)*100)/100,individualChargeCents:cents};
        });
        if(window.KCGameFinePolicy)people=window.KCGameFinePolicy.applyTotals(people,{...current,[stateKey]:next,individualGameLedger:ledger,currentEveningStartedAt:evening,strafenHistory:resultHistory},current);
        transaction.set(ref,{[stateKey]:next,persons:people,individualGameLedger:ledger,individualGameRevision:(Number(current.individualGameRevision)||0)+1,currentEveningStartedAt:evening,dashboardActiveGame:gameKey,penaltyStatsLog:finalStats,strafenHistory:resultHistory,updatedAt:serverTimestamp()},{merge:true});
      }
      return {gameResultsHistory:resultHistory.filter(e=>e.serverGameResult),state:next,eveningStartedAt:existingEvening||next.eveningStartedAt,counters,added:effect.added,removed:effect.removed,ledger:result.repeat?(current.individualGameLedger||[]):[...(current.individualGameLedger||[]).filter(x=>!new Set(effect.moneyRemoved).has(x.id)),...effect.moneyAdded],individualGameRevision:(Number(current.individualGameRevision)||0)+(result.repeat?0:1),gameStats:finalStats.filter(entry=>entry.individualGameId),repeat:result.repeat};
    });
  },

  getLiveGameRef(
    clubId,
    gameKey
  ) {
    if (!clubId) {
      throw new Error(
        'Club-ID fehlt'
      );
    }

    const normalizedGameKey =
      normalizeLiveGameKey(
        gameKey
      );

    return doc(
      db,
      'clubs',
      clubId,
      'liveGames',
      normalizedGameKey
    );
  },


  async loadLiveGameState(
    clubId,
    gameKey
  ) {
    const gameRef =
      this.getLiveGameRef(
        clubId,
        gameKey
      );

    const snapshot =
      await getDoc(
        gameRef
      );

    if (!snapshot.exists()) {
      return null;
    }

    return normalizeLiveGameDocument(
      gameKey,
      snapshot.data()
    );
  },


  async saveLiveGameState(
    clubId,
    gameKey,
    state = {},
    metadata = {}
  , syncContext = null) {
    const normalizedGameKey =
      normalizeLiveGameKey(
        gameKey
      );

    const gameRef =
      this.getLiveGameRef(
        clubId,
        normalizedGameKey
      );

    const cleanState =
      cleanLiveGameValue(
        state || {}
      );

    const updatedClientId =
      String(
        metadata.updatedClientId ||
        ''
      );

    const updatedClientAt =
      Number(
        metadata.updatedClientAt ||
        Date.now()
      ) || Date.now();

    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
      db,
      async transaction => {
        const rootSnap=await transaction.get(doc(db,'clubs',clubId,'state','current')),root=rootSnap.exists()?rootSnap.data():{};
        if(root.eveningResetRevision&&metadata.eveningStartedAt!==root.currentEveningStartedAt)throw Error('Der Kegelabend wurde inzwischen gewechselt');
        const snapshot =
          await transaction.get(
            gameRef
          );

        const currentData =
          snapshot.exists()
            ? snapshot.data()
            : {};

        const previousRevision =
          Math.max(
            0,
            parseInt(
              currentData.revision ||
              0,
              10
            ) || 0
          );

        const nextRevision =
          previousRevision + 1;

        const documentData = {
          gameKey:
            normalizedGameKey,

          state:
            cleanState,

          revision:
            nextRevision,

          updatedClientId,

          updatedClientAt,

          updatedAt:
            serverTimestamp()
        };

        if (!snapshot.exists()) {
          documentData.createdAt =
            serverTimestamp();
        }

        transaction.set(
          gameRef,
          documentData
        );

        return {
          gameKey:
            normalizedGameKey,

          state:
            cleanState,

          revision:
            nextRevision,

          updatedClientId,

          updatedClientAt
        };
      }
    );
  },


  subscribeToLiveGameState(
    clubId,
    gameKey,
    onData,
    onError
  ) {
    if (
      typeof onData !==
      'function'
    ) {
      throw new Error(
        'Live-Spiel-Callback fehlt'
      );
    }

    const gameRef =
      this.getLiveGameRef(
        clubId,
        gameKey
      );

    return onSnapshot(
      gameRef,

      snapshot => {
        if (!snapshot.exists()) {
          onData(null);
          return;
        }

        onData(
          normalizeLiveGameDocument(
            gameKey,
            snapshot.data()
          )
        );
      },

      error => {
        console.error(
          `Live-Spiel "${gameKey}" konnte nicht abonniert werden:`,
          error
        );

        if (
          typeof onError ===
          'function'
        ) {
          onError(error);
        }
      }
    );
  },


  async resetLiveGameState(
    clubId,
    gameKey,
    initialState = {},
    metadata = {}
  , syncContext = null) {
    return (window.KCSharedSync?.originalApi||this).saveLiveGameState.call(this,
      clubId,
      gameKey,
      initialState,
      {
        ...metadata,

        updatedClientAt:
          Number(
            metadata.updatedClientAt ||
            Date.now()
          ) || Date.now()
      },
      syncContext
    );
  },


  async deleteLiveGameState(
    clubId,
    gameKey
  , syncContext = null) {
    const gameRef =
      this.getLiveGameRef(
        clubId,
        gameKey
      );

    await (typeof runSharedDelete==='function'?runSharedDelete.bind(null,clubId,syncContext):deleteDoc)(
      gameRef
    );

    return true;
  },


  async runLiveGameTransaction(
    clubId,
    gameKey,
    transactionHandler,
    metadata = {}
  , syncContext = null) {
    if (
      typeof transactionHandler !==
      'function'
    ) {
      throw new Error(
        'Transaktionsfunktion fehlt'
      );
    }

    const normalizedGameKey =
      normalizeLiveGameKey(
        gameKey
      );

    const gameRef =
      this.getLiveGameRef(
        clubId,
        normalizedGameKey
      );

    const updatedClientId =
      String(
        metadata.updatedClientId ||
        ''
      );

    const requestedClientAt =
      Number(
        metadata.updatedClientAt ||
        Date.now()
      ) || Date.now();

    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
      db,
      async transaction => {
        const rootSnap=await transaction.get(doc(db,'clubs',clubId,'state','current')),root=rootSnap.exists()?rootSnap.data():{};
        if(root.eveningResetRevision&&metadata.eveningStartedAt!==root.currentEveningStartedAt)throw Error('Der Kegelabend wurde inzwischen gewechselt');
        const snapshot =
          await transaction.get(
            gameRef
          );

        const rawDocument =
          snapshot.exists()
            ? snapshot.data()
            : {};

        const normalizedDocument =
          snapshot.exists()
            ? normalizeLiveGameDocument(
                normalizedGameKey,
                rawDocument
              )
            : {
                gameKey:
                  normalizedGameKey,

                state: {},

                revision: 0,

                updatedClientId: '',

                updatedClientAt: 0,

                updatedAt: null,

                createdAt: null
              };

        const handlerResult =
          await transactionHandler({
            gameKey:
              normalizedGameKey,

            state:
              cleanLiveGameValue(
                normalizedDocument.state ||
                {}
              ),

            revision:
              normalizedDocument.revision,

            document:
              normalizedDocument,

            exists:
              snapshot.exists()
          });

        if (
          !handlerResult ||
          handlerResult.abort
        ) {
          return {
            committed: false,

            reason:
              handlerResult?.reason ||
              'aborted',

            state:
              normalizedDocument.state,

            revision:
              normalizedDocument.revision,

            result:
              handlerResult?.result ??
              null
          };
        }

        if (
          !handlerResult.state ||
          typeof handlerResult.state !==
            'object'
        ) {
          throw new Error(
            `Transaktion für "${normalizedGameKey}" liefert keinen gültigen State`
          );
        }

        const nextState =
          cleanLiveGameValue(
            handlerResult.state
          );

        const nextRevision =
          normalizedDocument.revision +
          1;

        const documentData = {
          gameKey:
            normalizedGameKey,

          state:
            nextState,

          revision:
            nextRevision,

          updatedClientId,

          updatedClientAt:
            requestedClientAt,

          updatedAt:
            serverTimestamp()
        };

        if (!snapshot.exists()) {
          documentData.createdAt =
            serverTimestamp();
        }

        transaction.set(
          gameRef,
          documentData
        );

        return {
          committed: true,

          gameKey:
            normalizedGameKey,

          state:
            nextState,

          revision:
            nextRevision,

          updatedClientId,

          updatedClientAt:
            requestedClientAt,

          result:
            handlerResult.result ??
            null
        };
      }
    );
  },

async loadLiveLotterie(clubId) {
  const ref = doc(
    db,
    'clubs',
    clubId,
    'liveGames',
    'lotterie'
  );

  const snap = await getDoc(ref);

  return snap.exists()
    ? snap.data()
    : null;
},

async saveLiveLotterie(clubId, state = {}, eveningStartedAt = typeof currentEveningStartedAt==='undefined'?'':currentEveningStartedAt, syncContext = null) {
  // Lotterie uses the same canonical `state` envelope as every other live game.
  // Keep the revision monotonic so the app and dashboard see the same snapshot.
  const ref = doc(db, 'clubs', clubId, 'liveGames', 'lotterie');
  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db, async transaction => {
    const rootSnap=await transaction.get(doc(db,'clubs',clubId,'state','current')),root=rootSnap.exists()?rootSnap.data():{};
    if(root.eveningResetRevision&&eveningStartedAt!==root.currentEveningStartedAt)throw Error('Der Kegelabend wurde inzwischen gewechselt');
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? snapshot.data() : {};
    transaction.set(ref, {
      gameKey: 'lotterie',
      state: cleanLiveGameValue({...state,eveningStartedAt}),
      revision: (Number(previous.revision) || 0) + 1,
      updatedClientId: typeof CLIENT_ID !== 'undefined' ? CLIENT_ID : 'lotterie',
      updatedClientAt: Date.now(),
      updatedAt: serverTimestamp()
    });
  });
},

async changeLiveLotterieThrow(
  clubId,
  personName,
  colIndex,
  value,
  throwMeta = null,
  eveningStartedAt = typeof currentEveningStartedAt==='undefined'?'':currentEveningStartedAt
, syncContext = null) {
  const ref = doc(
    db,
    'clubs',
    clubId,
    'liveGames',
    'lotterie'
  );

  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
    db,
    async transaction => {
      const rootSnap=await transaction.get(doc(db,'clubs',clubId,'state','current')),root=rootSnap.exists()?rootSnap.data():{};
      if(root.eveningResetRevision&&eveningStartedAt!==root.currentEveningStartedAt)throw Error('Der Kegelabend wurde inzwischen gewechselt');
      const snap =
        await transaction.get(ref);

      const current =
        snap.exists()
          ? snap.data()
          : {};

      const existingState = current.state && typeof current.state === "object" ? current.state : {};
      const throws = {
        ...(existingState.throws || current.throws || {})
      };

      const throwMetaMap = {
        ...(existingState.throwMeta || current.throwMeta || {})
      };

      const personThrows =
        Array.isArray(throws[personName])
          ? [...throws[personName]]
          : [];

      const personMeta =
        Array.isArray(
          throwMetaMap[personName]
        )
          ? [...throwMetaMap[personName]]
          : [];

      personThrows[colIndex] = value;
      personMeta[colIndex] =
        throwMeta || null;

      throws[personName] =
        personThrows;

      throwMetaMap[personName] =
        personMeta;

      transaction.set(
        ref,
        {
          state: { ...existingState, throws, throwMeta: throwMetaMap },
          revision: (Number(current.revision) || 0) + 1,
          updatedClientId: "lotterie-throw",
          updatedClientAt: Date.now(),
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        value,
        throwMeta: throwMeta || null
      };
    }
  );
},

subscribeToLiveLotterie(
  clubId,
  onData,
  onError
) {
  const ref = doc(
    db,
    'clubs',
    clubId,
    'liveGames',
    'lotterie'
  );

  return onSnapshot(
    ref,
    snap => {
      onData(
        snap.exists()
          ? snap.data()
          : null
      );
    },
    onError
  );
},    
    

  // Separate Live-Daten fuer Sitzordnung und Gruppeneinstellungen.
  async saveSeatingLive(clubId, payload, syncContext = null) {
    const ref = doc(db, 'clubs', clubId, 'live', 'seating');
    await (typeof runSharedSet==='function'?runSharedSet.bind(null,clubId,syncContext):setDoc)(ref, { ...payload, updatedAt: serverTimestamp() });
  },
  subscribeToSeatingLive(clubId, onData, onError) {
    const ref = doc(db, 'clubs', clubId, 'live', 'seating');
    return onSnapshot(ref, snap => onData(snap.exists() ? snap.data() : null), onError);
  },

  subscribeToClubState(clubId, onData, onError) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "state",
      "current"
    );

    const callback=snap=>onData(snap.exists()?snap.data():null,{fromCache:snap.metadata?.fromCache===true,pending:snap.metadata?.hasPendingWrites===true});
    return (window.KCSharedSync||window.KCSharedTransport)?onSnapshot(ref,{includeMetadataChanges:true},callback,onError):onSnapshot(ref,callback,onError);
  },


  // ─────────────────────────────────────────────
  // ARCHIV
  // ─────────────────────────────────────────────

  async archiveClubEvent(
    clubId,
    archiveId,
    payload = {}
  , syncContext = null) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "archive",
      archiveId
    );

    await (typeof runSharedSet==='function'?runSharedSet.bind(null,clubId,syncContext):setDoc)(
      ref,
      {
        ...payload,
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    );
  },


  // Geschlossene Kegelabende für die Kassenhistorie laden und löschen.
  async listCashBookEntries(clubId) {
    const snapshot=await getDocs(collection(db,'clubs',clubId,'archive'));
    return snapshot.docs.map(item=>({...item.data(),id:item.id})).filter(item=>['strafen','expense'].includes(item.category))
      .sort((a,b)=>String(b.closedAt||b.date||'').localeCompare(String(a.closedAt||a.date||'')));
  },

  subscribeCashBookEntries(clubId,onChange,onError) {
    return onSnapshot(collection(db,'clubs',clubId,'archive'),snapshot=>onChange(snapshot.docs
      .map(item=>({...item.data(),id:item.id})).filter(item=>['strafen','expense'].includes(item.category))
      .sort((a,b)=>String(b.closedAt||b.date||'').localeCompare(String(a.closedAt||a.date||'')))),onError);
  },

  async saveStrafenClosure(clubId,archiveId,payload,expectedRevision=null, syncContext = null) {
    if(!clubId||typeof archiveId!=='string'||!/^strafen_abend_[a-zA-Z0-9_-]+$/.test(archiveId))throw new Error('Ungültiger Kegelabend');
    if(payload.category!=='strafen'||!Number.isSafeInteger(payload.laneCostCents)||payload.laneCostCents<0)throw new Error('Ungültige Bahngebühr');
    const ref=doc(db,'clubs',clubId,'archive',archiveId);
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const current=await transaction.get(ref),previous=current.exists()?current.data():{};
      if(current.exists()&&(previous.category!=='strafen'||expectedRevision===null||(previous.ledgerRevision||0)!==expectedRevision))throw new Error('Abschluss wurde inzwischen geändert. Bitte erneut öffnen.');
      if(!current.exists()&&expectedRevision!==null)throw new Error('Abschluss wurde inzwischen gelöscht. Bitte erneut öffnen.');
      const revision=(previous.ledgerRevision||0)+1;
      transaction.set(ref,{...previous,...payload,ledgerRevision:revision,updatedAt:serverTimestamp()});
      return revision;
    });
  },

  async saveCashExpense(clubId,expenseId,payload,expectedRevision=null, syncContext = null) {
    if(!clubId||typeof expenseId!=='string'||!/^expense_manual_[a-zA-Z0-9_-]+$/.test(expenseId))throw new Error('Ungültige Ausgabe');
    if(!Number.isSafeInteger(payload.amountCents)||payload.amountCents<=0||!String(payload.description||'').trim()||String(payload.description).length>120||!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)||!Number.isFinite(Date.parse(payload.date+'T12:00:00Z'))||new Date(payload.date+'T12:00:00Z').toISOString().slice(0,10)!==payload.date||!Number.isFinite(Date.parse(payload.incurredAt)))throw new Error('Ungültige Ausgabedaten');
    const ref=doc(db,'clubs',clubId,'archive',expenseId);
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const current=await transaction.get(ref),previous=current.exists()?current.data():{};
      if(current.exists()&&(previous.category!=='expense'||expectedRevision===null||(previous.ledgerRevision||0)!==expectedRevision))throw new Error('Ausgabe wurde inzwischen geändert. Bitte erneut öffnen.');
      if(!current.exists()&&expectedRevision!==null)throw new Error('Ausgabe wurde inzwischen gelöscht. Bitte erneut öffnen.');
      const revision=(previous.ledgerRevision||0)+1;
      transaction.set(ref,{category:'expense',type:'manual',description:String(payload.description).trim(),date:payload.date,incurredAt:payload.incurredAt,amountCents:payload.amountCents,ledgerRevision:revision,updatedAt:serverTimestamp()});
      return revision;
    });
  },

  async updateLaneExpense(clubId,archiveId,payload,expectedRevision, syncContext = null) {
    if(!clubId||typeof archiveId!=='string'||!archiveId||archiveId.includes('/'))throw new Error('Ungültiger Kegelabend');
    if(!payload.remove&&(!Number.isSafeInteger(payload.amountCents)||payload.amountCents<0||!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)||!Number.isFinite(Date.parse(payload.date+'T12:00:00Z'))||new Date(payload.date+'T12:00:00Z').toISOString().slice(0,10)!==payload.date||!Number.isFinite(Date.parse(payload.incurredAt))))throw new Error('Ungültige Bahngebühr');
    const ref=doc(db,'clubs',clubId,'archive',archiveId);
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const current=await transaction.get(ref);
      if(!current.exists())throw new Error('Kegelabend wurde inzwischen gelöscht');
      const previous=current.data();
      if(previous.category!=='strafen'||!Number.isSafeInteger(previous.laneCostCents))throw new Error('Eintrag enthält keine Bahngebühr');
      if((previous.ledgerRevision||0)!==expectedRevision)throw new Error('Ausgabe wurde inzwischen geändert. Bitte erneut öffnen.');
      const changes=payload.remove?{laneExpenseExcluded:true}:{laneCostCents:payload.amountCents,laneExpenseDate:payload.date,laneExpenseIncurredAt:payload.incurredAt,laneExpenseExcluded:false};
      if(previous.manualDraft){changes.manualDraft={...previous.manualDraft,laneFee:((payload.remove?previous.laneCostCents:payload.amountCents)/100).toFixed(2),laneExpenseExcluded:!!payload.remove};changes.manualRevision=(previous.manualRevision||0)+1;}
      transaction.set(ref,{...previous,...changes,ledgerRevision:(previous.ledgerRevision||0)+1,updatedAt:serverTimestamp()});
    });
  },

  async deleteCashExpense(clubId,expenseId,expectedRevision, syncContext = null) {
    if(!clubId||typeof expenseId!=='string'||!/^expense_manual_[a-zA-Z0-9_-]+$/.test(expenseId))throw new Error('Ungültige Ausgabe');
    const ref=doc(db,'clubs',clubId,'archive',expenseId);
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const current=await transaction.get(ref);
      if(!current.exists())throw new Error('Ausgabe wurde inzwischen gelöscht');
      const data=current.data();
      if(data.category!=='expense'||(data.ledgerRevision||0)!==expectedRevision)throw new Error('Ausgabe wurde inzwischen geändert. Bitte aktualisieren.');
      transaction.delete(ref);
    });
  },

  async listArchivedStrafenEvents(clubId) {
    const ref = collection(db, 'clubs', clubId, 'archive');
    const snapshot = await getDocs(ref);
    return snapshot.docs
      .map(item => ({ ...item.data(), id: item.id }))
      .filter(item => item.category === 'strafen')
      .sort((a, b) => String(b.closedAt || b.date || '').localeCompare(String(a.closedAt || a.date || '')));
  },

  async deleteArchivedStrafenEvent(clubId, archiveId, expectedRevision=null, syncContext = null) {
    // Accept legacy, per-evening and cancelled IDs. Verify the category before deleting.
    if (!clubId || typeof archiveId !== 'string' || !archiveId || archiveId.includes('/') || archiveId === '.' || archiveId === '..' || archiveId.length > 1500) {
      throw new Error('Ungültiger Archiv-Eintrag');
    }
    const ref = doc(db, 'clubs', clubId, 'archive', archiveId);
    if(typeof runSharedTransaction==='function'&&syncContext)return runSharedTransaction(clubId,syncContext,db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw Error('Abschluss ist nicht mehr vorhanden');const data=snap.data();if(data.category!=='strafen')throw Error('Eintrag ist kein Strafenabschluss');if(expectedRevision===null||(Number(data.ledgerRevision)||0)!==expectedRevision)throw Error('Abschluss wurde inzwischen geändert. Bitte erneut prüfen.');tx.delete(ref);});
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error('Abschluss ist nicht mehr vorhanden');
    if (snapshot.data().category !== 'strafen') throw new Error('Eintrag ist kein Strafenabschluss');
    await (typeof runSharedDelete==='function'?runSharedDelete.bind(null,clubId,syncContext):deleteDoc)(ref);
  },

  subscribeArchivedStrafenEvents(clubId, onChange, onError) {
    return onSnapshot(collection(db,'clubs',clubId,'archive'), snapshot => onChange(snapshot.docs
      .map(item => ({...item.data(),id:item.id})).filter(item => item.category === 'strafen')
      .sort((a,b)=>String(b.closedAt||b.date||'').localeCompare(String(a.closedAt||a.date||'')))), onError);
  },

  async loadArchivedStrafenEvent(clubId, archiveId) {
    if(!clubId||typeof archiveId!=='string'||!archiveId||archiveId.includes('/'))throw new Error('Ungültiger Archiv-Eintrag');
    const snap=await getDoc(doc(db,'clubs',clubId,'archive',archiveId));
    if(!snap.exists())return null;
    const entry=snap.data();if(entry.category!=='strafen')throw new Error('Eintrag ist kein Strafenabschluss');
    return {...entry,id:snap.id};
  },

  async saveHistoricalStrafenEvent(clubId, archiveId, payload, expectedRevision=null, previousArchiveId=archiveId, syncContext = null) {
    if(!clubId||typeof archiveId!=='string'||!/^cancelled_\d{4}-\d{2}-\d{2}$|^strafen_nachtrag_[a-zA-Z0-9_-]+$/.test(archiveId))throw new Error('Ungültiger Nachtrag');
    if(payload.category!=='strafen'||!['cancelled','backfill'].includes(payload.kind))throw new Error('Ungültige Abrechnung');
    if(payload.laneCostCents!=null&&(!Number.isSafeInteger(payload.laneCostCents)||payload.laneCostCents<0||payload.kind==='cancelled'))throw new Error('Ungültige Bahngebühr');
    if(previousArchiveId!==archiveId&&(payload.kind!=='cancelled'||!/^cancelled_\d{4}-\d{2}-\d{2}$/.test(previousArchiveId)))throw new Error('Ungültiger ursprünglicher Ausfalltermin');
    const ref=doc(db,'clubs',clubId,'archive',archiveId);
    const previousRef=previousArchiveId===archiveId?ref:doc(db,'clubs',clubId,'archive',previousArchiveId);
    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async transaction=>{
      const current=await transaction.get(previousRef);
      if(current.exists()){
        const data=current.data();
        if(data.category!=='strafen')throw new Error('Eintrag ist kein Strafenabschluss');
        if(expectedRevision===null||(data.manualRevision||0)!==expectedRevision)throw new Error('Eintrag wurde inzwischen geändert. Bitte aktualisieren und erneut öffnen.');
      }else if(expectedRevision!==null)throw new Error('Eintrag wurde inzwischen gelöscht. Bitte als neuen Nachtrag anlegen.');
      if(previousArchiveId!==archiveId&&(await transaction.get(ref)).exists())throw new Error('Für dieses Datum ist bereits ein Ausfalltermin gespeichert.');
      const revision=(expectedRevision||0)+1;
      transaction.set(ref,{...(current.exists()?current.data():{}),...payload,manualRevision:revision,ledgerRevision:((current.exists()?current.data().ledgerRevision:0)||0)+1,updatedAt:serverTimestamp()});
      if(previousArchiveId!==archiveId)transaction.delete(previousRef);
      return revision;
    });
  },

  // ─────────────────────────────────────────────
  // CLUB-METADATEN
  // ─────────────────────────────────────────────

  async saveClubMeta(clubId, payload = {}, syncContext = null) {
    const ref = doc(
      db,
      "clubs",
      clubId
    );

    await (typeof runSharedSet==='function'?runSharedSet.bind(null,clubId,syncContext):setDoc)(
      ref,
      {
        ...payload,
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    );
  },


  async loadClubList() {
    const snap = await getDocs(
      collection(db, "clubs")
    );

    return snap.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));
  },


  // ─────────────────────────────────────────────
  // LIVE-PERSONEN
  // Getränke und Strafen
  // ─────────────────────────────────────────────

  getLivePersonId(personName) {
    return encodeURIComponent(
      String(personName || "")
        .trim()
        .toLowerCase()
    );
  },


  async loadLivePersons(clubId) {
    const ref = collection(
      db,
      "clubs",
      clubId,
      "livePersons"
    );

    const snap = await getDocs(ref);

    return snap.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));
  },

async seedLivePersons(clubId,persons=[], syncContext = null){
  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db,async tx=>{const missing=[];for(const person of persons){if(!person?.name)continue;const target=doc(db,'clubs',clubId,'livePersons',this.getLivePersonId(person.name)),snap=await tx.get(target);if(!snap.exists())missing.push({target,person});}for(const row of missing)tx.set(row.target,{...row.person,updatedAt:serverTimestamp()});return true;});
},
    
async saveLivePersonStatus(
  clubId,
  personName,
  payload = {}
, syncContext = null) {
  if (!personName) {
    throw new Error(
      "Personenname fehlt"
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    "clubs",
    clubId,
    "livePersons",
    personId
  );

  const allowedStatuses = [
    "present",
    "excused",
    "unexcused",
    "unknown"
  ];

  const attendanceStatus =
    allowedStatuses.includes(
      payload.attendanceStatus
    )
      ? payload.attendanceStatus
      : (
          payload.present
            ? "present"
            : "unknown"
        );

  await (typeof runSharedSet==='function'?runSharedSet.bind(null,clubId,syncContext):setDoc)(
    personRef,
    {
      name:
        personName,

      isGuest:
        !!payload.isGuest,

      present:
        !!payload.present,

      attendanceStatus,

      left:
        !!payload.left,

      tisch:
        payload.tisch || "",

      arrivalTime:
        payload.arrivalTime || "",

      leftAt:
        payload.leftAt || "",

      leftEarlyAt:
        payload.leftEarlyAt || "",
        
        boughtThrows:
          Math.max(
            0,
            parseInt(
              payload.boughtThrows || 0,
              10
            ) || 0
          ),
        
        paid:
          Math.max(
            0,
            parseFloat(
              payload.paid || 0
            ) || 0
          ),

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  return true;
},

async saveLivePerson(
  clubId,
  personName,
  payload = {}
, syncContext = null) {
  if (!personName) {
    throw new Error(
      "Personenname fehlt"
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    "clubs",
    clubId,
    "livePersons",
    personId
  );

  const allowedStatuses = [
    "present",
    "excused",
    "unexcused",
    "unknown"
  ];

  const attendanceStatus =
    allowedStatuses.includes(
      payload.attendanceStatus
    )
      ? payload.attendanceStatus
      : (
          payload.present
            ? "present"
            : "unknown"
        );

  await (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(db, async transaction => {
    const existingSnap = await transaction.get(personRef);
    const existing = existingSnap.exists() ? existingSnap.data() : null;
    const preserveCounters = !!existing && !payload.forceCounterReset;
    const personData =
    {
      name:
        personName,

      isGuest:
        !!payload.isGuest,

      present:
        !!payload.present,

      attendanceStatus,

      left:
        !!payload.left,

      tisch:
        payload.tisch || "",

      arrivalTime:
        payload.arrivalTime || "",

      leftAt:
        payload.leftAt || "",

      leftEarlyAt:
        payload.leftEarlyAt || "",

      drinks: preserveCounters ? {...(existing.drinks || {})} : {...(payload.drinks || {})},

      strafen: preserveCounters ? {...(existing.strafen || {})} : {...(payload.strafen || {})},
        
        freeStrafen:
          Array.isArray(
            payload.freeStrafen
          )
            ? payload.freeStrafen.map(
                entry => ({
                  ...entry
                })
              )
            : [],
        
        rounds:
          Array.isArray(
            payload.rounds
          )
            ? payload.rounds.map(
                round => ({
                  ...round,
                  drinks: {
                    ...(round.drinks || {})
                  }
                })
              )
            : [],
        
        boughtThrows:
          Math.max(
            0,
            parseInt(
              payload.boughtThrows || 0,
              10
            ) || 0
          ),
        
        paid:
  Math.max(
    0,
    parseFloat(
      payload.paid || 0
    ) || 0
  ),

      updatedAt:
        serverTimestamp()
    };
    transaction.set(personRef, personData, {merge:true});
  });

  return true;
},
    
async deleteLivePersonRound(
  clubId,
  personName,
  roundId
, syncContext = null) {
  if (!personName) {
    throw new Error(
      'Personenname fehlt'
    );
  }

  if (!roundId) {
    throw new Error(
      'Runden-ID fehlt'
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    'clubs',
    clubId,
    'livePersons',
    personId
  );

  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
    db,
    async transaction => {
      const snapshot =
        await transaction.get(
          personRef
        );

      if (!snapshot.exists()) {
        return {
          deleted: false,
          rounds: []
        };
      }

      const current =
        snapshot.data();

      const previous =
        Array.isArray(
          current.rounds
        )
          ? current.rounds
          : [];

      const rounds =
        previous.filter(
          round =>
            round.id !== roundId
        );

      transaction.set(
        personRef,
        {
          name:
            personName,

          rounds,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        deleted:
          rounds.length !==
          previous.length,

        rounds
      };
    }
  );
},    
    
async changeLivePersonBoughtThrows(
  clubId,
  personName,
  delta,
  maxBuys
, syncContext = null) {
  if (!personName) {
    throw new Error(
      'Personenname fehlt'
    );
  }

  const numericDelta =
    parseInt(
      delta || 0,
      10
    ) || 0;

  const numericMax =
    Math.max(
      0,
      parseInt(
        maxBuys || 0,
        10
      ) || 0
    );

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    'clubs',
    clubId,
    'livePersons',
    personId
  );

  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
    db,
    async transaction => {
      const snap =
        await transaction.get(
          personRef
        );

      const current =
        snap.exists()
          ? snap.data()
          : {};

      const previousValue =
        Math.max(
          0,
          parseInt(
            current.boughtThrows || 0,
            10
          ) || 0
        );

      const nextValue =
        Math.max(
          0,
          Math.min(
            numericMax,
            previousValue +
              numericDelta
          )
        );

      if (
        numericDelta > 0 &&
        previousValue >= numericMax
      ) {
        return {
          changed: false,
          value: previousValue
        };
      }

      transaction.set(
        personRef,
        {
          name:
            personName,

          boughtThrows:
            nextValue,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        changed:
          nextValue !==
          previousValue,

        value:
          nextValue
      };
    }
  );
},
    
async saveLivePersonPayment(
  clubId,
  personName,
  paid
, syncContext = null) {
  if (!personName) {
    throw new Error(
      'Personenname fehlt'
    );
  }

  const numericPaid =
    Math.max(
      0,
      Math.round(
        (
          parseFloat(
            paid || 0
          ) || 0
        ) * 100
      ) / 100
    );

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    'clubs',
    clubId,
    'livePersons',
    personId
  );

  await (typeof runSharedSet==='function'?runSharedSet.bind(null,clubId,syncContext):setDoc)(
    personRef,
    {
      name:
        personName,

      paid:
        numericPaid,

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  return {
    paid:
      numericPaid
  };
},
    
async addLivePersonFreeStrafe(
  clubId,
  personName,
  entry
, syncContext = null) {
  if (!personName) {
    throw new Error(
      'Personenname fehlt'
    );
  }

  if (
    !entry ||
    !entry.id
  ) {
    throw new Error(
      'Ungültiger Strafeneintrag'
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    'clubs',
    clubId,
    'livePersons',
    personId
  );

  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
    db,
    async transaction => {
      const snapshot =
        await transaction.get(
          personRef
        );

      const current =
        snapshot.exists()
          ? snapshot.data()
          : {};

      const freeStrafen =
        Array.isArray(
          current.freeStrafen
        )
          ? current.freeStrafen.map(
              item => ({
                ...item
              })
            )
          : [];

      const alreadyExists =
        freeStrafen.some(
          item =>
            item.id === entry.id
        );

      if (!alreadyExists) {
        freeStrafen.push({
          ...entry
        });
      }

      transaction.set(
        personRef,
        {
          name: personName,
          freeStrafen,
          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        added:
          !alreadyExists,
        freeStrafen
      };
    }
  );
},
    
async addLivePersonRound(
  clubId,
  personName,
  roundEntry
, syncContext = null) {
  if (!personName) {
    throw new Error(
      'Personenname fehlt'
    );
  }

  if (
    !roundEntry ||
    !roundEntry.id
  ) {
    throw new Error(
      'Ungültiger Rundeneintrag'
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    'clubs',
    clubId,
    'livePersons',
    personId
  );

  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
    db,
    async transaction => {
      const snapshot =
        await transaction.get(
          personRef
        );

      const current =
        snapshot.exists()
          ? snapshot.data()
          : {};

      const rounds =
        Array.isArray(
          current.rounds
        )
          ? current.rounds.map(
              round => ({
                ...round,
                drinks: {
                  ...(round.drinks || {})
                }
              })
            )
          : [];

      const alreadyExists =
        rounds.some(
          round =>
            round.id ===
            roundEntry.id
        );

      if (!alreadyExists) {
        rounds.push({
          ...roundEntry,
          drinks: {
            ...(roundEntry.drinks || {})
          }
        });
      }

      transaction.set(
        personRef,
        {
          name:
            personName,

          rounds,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        added:
          !alreadyExists,

        rounds
      };
    }
  );
},
    
async deleteLivePersonFreeStrafe(
  clubId,
  personName,
  freeStrafeId
, syncContext = null) {
  if (!personName) {
    throw new Error(
      'Personenname fehlt'
    );
  }

  if (!freeStrafeId) {
    throw new Error(
      'Strafen-ID fehlt'
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    'clubs',
    clubId,
    'livePersons',
    personId
  );

  return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
    db,
    async transaction => {
      const snapshot =
        await transaction.get(
          personRef
        );

      if (!snapshot.exists()) {
        return {
          deleted: false,
          freeStrafen: []
        };
      }

      const current =
        snapshot.data();

      const previous =
        Array.isArray(
          current.freeStrafen
        )
          ? current.freeStrafen
          : [];

      const freeStrafen =
        previous.filter(
          item =>
            item.id !==
            freeStrafeId
        );

      transaction.set(
        personRef,
        {
          name: personName,
          freeStrafen,
          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        deleted:
          freeStrafen.length !==
          previous.length,
        freeStrafen
      };
    }
  );
},

async deleteLivePerson(
  clubId,
  personName
, syncContext = null) {
  if (!personName) {
    throw new Error(
      "Personenname fehlt"
    );
  }

  const personId =
    this.getLivePersonId(
      personName
    );

  const personRef = doc(
    db,
    "clubs",
    clubId,
    "livePersons",
    personId
  );

  await (typeof runSharedDelete==='function'?runSharedDelete.bind(null,clubId,syncContext):deleteDoc)(
    personRef
  );

  return true;
},

  // ─────────────────────────────────────────────
  // EINZELNEN ZÄHLER ÄNDERN
  // ─────────────────────────────────────────────

  async changeLivePersonCounter(
    clubId,
    personName,
    category,
    key,
    delta
  , syncContext = null) {
    if (
      !["drinks", "strafen"].includes(category)
    ) {
      throw new Error(
        `Ungültige Kategorie: ${category}`
      );
    }

    if (!personName) {
      throw new Error(
        "Personenname fehlt"
      );
    }

    if (!key) {
      throw new Error(
        "Zählerschlüssel fehlt"
      );
    }

    const personId =
      this.getLivePersonId(personName);

    const personRef = doc(
      db,
      "clubs",
      clubId,
      "livePersons",
      personId
    );

    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
      db,

      async transaction => {
        const snap =
          await transaction.get(personRef);

        const current = snap.exists()
          ? snap.data()
          : {};

        const counters = {
          ...(current[category] || {})
        };

        const previousValue = Number(
          counters[key] || 0
        );

        const nextValue = Math.max(
          0,
          previousValue + Number(delta || 0)
        );

        counters[key] = nextValue;

        transaction.set(
          personRef,

          {
            name: personName,

            [category]: counters,

            updatedAt: serverTimestamp()
          },

          {
            merge: true
          }
        );

        return nextValue;
      }
    );
  },


  // ─────────────────────────────────────────────
  // MEHRERE ZÄHLER ATOMAR ÄNDERN
  // z. B. Kranz oder Verliererteam
  // ─────────────────────────────────────────────

  async changeMultipleLivePersonCounters(
    clubId,
    changes = []
  , syncContext = null) {
    const validChanges = changes.filter(
      change =>
        change &&
        change.personName &&
        ["drinks", "strafen"].includes(
          change.category
        ) &&
        change.key &&
        Number(change.delta || 0) !== 0
    );

    if (!validChanges.length) {
      return [];
    }

    return (typeof runSharedTransaction==='function'?runSharedTransaction.bind(null,clubId,syncContext):runTransaction)(
      db,

      async transaction => {
        const groupedChanges = new Map();

        /*
         * Änderungen nach Person gruppieren.
         */
        validChanges.forEach(change => {
          const personId =
            this.getLivePersonId(
              change.personName
            );

          if (!groupedChanges.has(personId)) {
            groupedChanges.set(personId, {
              personId,
              personName: change.personName,
              changes: []
            });
          }

          groupedChanges
            .get(personId)
            .changes
            .push(change);
        });

        /*
         * Firestore verlangt, dass innerhalb
         * einer Transaktion zuerst alle Reads
         * und danach alle Writes stattfinden.
         */
        const loadedPersons = [];

        for (
          const group of groupedChanges.values()
        ) {
          const personRef = doc(
            db,
            "clubs",
            clubId,
            "livePersons",
            group.personId
          );

          const snap =
            await transaction.get(personRef);

          loadedPersons.push({
            ...group,
            personRef,

            current: snap.exists()
              ? snap.data()
              : {}
          });
        }

        const results = [];

        loadedPersons.forEach(group => {
          const nextData = {
            name: group.personName,

            drinks: {
              ...(group.current.drinks || {})
            },

            strafen: {
              ...(group.current.strafen || {})
            },

            updatedAt: serverTimestamp()
          };

          group.changes.forEach(change => {
            const counters =
              nextData[change.category];

            const previousValue = Number(
              counters[change.key] || 0
            );

            const nextValue = Math.max(
              0,
              previousValue +
                Number(change.delta || 0)
            );

            counters[change.key] = nextValue;

            results.push({
              personName: change.personName,
              category: change.category,
              key: change.key,
              value: nextValue
            });
          });

          transaction.set(
            group.personRef,
            nextData,
            {
              merge: true
            }
          );
        });

        return results;
      }
    );
  },


  // ─────────────────────────────────────────────
  // LIVE-LISTENER FÜR PERSONEN
  // ─────────────────────────────────────────────

  subscribeToLivePersons(
    clubId,
    onData,
    onError
  ) {
    const ref = collection(
      db,
      "clubs",
      clubId,
      "livePersons"
    );

    return onSnapshot(
      ref,

      snapshot => {
        const changes =
          snapshot.docChanges().map(change => ({
            type: change.type,
            id: change.doc.id,
            data: change.doc.data()
          }));

        onData(changes);
      },

      onError
    );
  }
};


window.firestoreApi.__syncArity={"startNewEvening": 2, "saveClubState": 2, "updateClubCalendar": 2, "setDashboardGameOverview": 2, "updateGameOptions": 2, "drawRandomGame": 2, "updateGameFineSettings": 2, "updateClubContent": 2, "setClubContentDashboard": 2, "setCashDashboardView": 2, "updateCashStandingOrders": 2, "setDashboardRules": 2, "updatePenaltyStatsSettings": 2, "transactSechsGame": 2, "transactTableGame": 2, "transactIndividualGame": 2, "saveLiveGameState": 4, "resetLiveGameState": 4, "deleteLiveGameState": 2, "runLiveGameTransaction": 4, "saveLiveLotterie": 3, "changeLiveLotterieThrow": 6, "saveSeatingLive": 2, "archiveClubEvent": 3, "saveStrafenClosure": 4, "saveCashExpense": 4, "updateLaneExpense": 4, "deleteCashExpense": 3, "deleteArchivedStrafenEvent": 3, "saveHistoricalStrafenEvent": 5, "saveClubMeta": 2, "seedLivePersons": 2, "saveLivePersonStatus": 3, "saveLivePerson": 3, "deleteLivePersonRound": 3, "changeLivePersonBoughtThrows": 4, "saveLivePersonPayment": 3, "addLivePersonFreeStrafe": 3, "addLivePersonRound": 3, "deleteLivePersonFreeStrafe": 3, "deleteLivePerson": 2, "changeLivePersonCounter": 5, "changeMultipleLivePersonCounters": 2};
window.KCSharedSync?.install(window.firestoreApi);
console.log("Firestore API bereit");


if (typeof startApp === "function") {
  startApp();
}


