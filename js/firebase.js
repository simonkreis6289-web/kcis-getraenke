import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
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

window.firestoreApi = {

  // ─────────────────────────────────────────────
  // GESAMTZUSTAND
  // ─────────────────────────────────────────────

  async loadClubState(clubId) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "state",
      "current"
    );

    const snap = await getDoc(ref);

    return snap.exists()
      ? snap.data()
      : null;
  },


  async saveClubState(clubId, payload = {}) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "state",
      "current"
    );

    await setDoc(
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
  ) {
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

    return runTransaction(
      db,
      async transaction => {
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
  ) {
    return this.saveLiveGameState(
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
      }
    );
  },


  async deleteLiveGameState(
    clubId,
    gameKey
  ) {
    const gameRef =
      this.getLiveGameRef(
        clubId,
        gameKey
      );

    await deleteDoc(
      gameRef
    );

    return true;
  },


  async runLiveGameTransaction(
    clubId,
    gameKey,
    transactionHandler,
    metadata = {}
  ) {
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

    return runTransaction(
      db,
      async transaction => {
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

async saveLiveLotterie(clubId, state = {}) {
  // Lotterie uses the same canonical `state` envelope as every other live game.
  // Keep the revision monotonic so the app and dashboard see the same snapshot.
  const ref = doc(db, 'clubs', clubId, 'liveGames', 'lotterie');
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? snapshot.data() : {};
    transaction.set(ref, {
      gameKey: 'lotterie',
      state: cleanLiveGameValue(state),
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
  throwMeta = null
) {
  const ref = doc(
    db,
    'clubs',
    clubId,
    'liveGames',
    'lotterie'
  );

  return runTransaction(
    db,
    async transaction => {
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
  async saveSeatingLive(clubId, payload) {
    const ref = doc(db, 'clubs', clubId, 'live', 'seating');
    await setDoc(ref, { ...payload, updatedAt: serverTimestamp() });
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


  // ─────────────────────────────────────────────
  // ARCHIV
  // ─────────────────────────────────────────────

  async archiveClubEvent(
    clubId,
    archiveId,
    payload = {}
  ) {
    const ref = doc(
      db,
      "clubs",
      clubId,
      "archive",
      archiveId
    );

    await setDoc(
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

  async saveStrafenClosure(clubId,archiveId,payload,expectedRevision=null) {
    if(!clubId||typeof archiveId!=='string'||!/^strafen_abend_[a-zA-Z0-9_-]+$/.test(archiveId))throw new Error('Ungültiger Kegelabend');
    if(payload.category!=='strafen'||!Number.isSafeInteger(payload.laneCostCents)||payload.laneCostCents<0)throw new Error('Ungültige Bahngebühr');
    const ref=doc(db,'clubs',clubId,'archive',archiveId);
    return runTransaction(db,async transaction=>{
      const current=await transaction.get(ref),previous=current.exists()?current.data():{};
      if(current.exists()&&(previous.category!=='strafen'||expectedRevision===null||(previous.ledgerRevision||0)!==expectedRevision))throw new Error('Abschluss wurde inzwischen geändert. Bitte erneut öffnen.');
      if(!current.exists()&&expectedRevision!==null)throw new Error('Abschluss wurde inzwischen gelöscht. Bitte erneut öffnen.');
      const revision=(previous.ledgerRevision||0)+1;
      transaction.set(ref,{...previous,...payload,ledgerRevision:revision,updatedAt:serverTimestamp()});
      return revision;
    });
  },

  async saveCashExpense(clubId,expenseId,payload,expectedRevision=null) {
    if(!clubId||typeof expenseId!=='string'||!/^expense_manual_[a-zA-Z0-9_-]+$/.test(expenseId))throw new Error('Ungültige Ausgabe');
    if(!Number.isSafeInteger(payload.amountCents)||payload.amountCents<=0||!String(payload.description||'').trim()||String(payload.description).length>120||!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)||!Number.isFinite(Date.parse(payload.date+'T12:00:00Z'))||new Date(payload.date+'T12:00:00Z').toISOString().slice(0,10)!==payload.date||!Number.isFinite(Date.parse(payload.incurredAt)))throw new Error('Ungültige Ausgabedaten');
    const ref=doc(db,'clubs',clubId,'archive',expenseId);
    return runTransaction(db,async transaction=>{
      const current=await transaction.get(ref),previous=current.exists()?current.data():{};
      if(current.exists()&&(previous.category!=='expense'||expectedRevision===null||(previous.ledgerRevision||0)!==expectedRevision))throw new Error('Ausgabe wurde inzwischen geändert. Bitte erneut öffnen.');
      if(!current.exists()&&expectedRevision!==null)throw new Error('Ausgabe wurde inzwischen gelöscht. Bitte erneut öffnen.');
      const revision=(previous.ledgerRevision||0)+1;
      transaction.set(ref,{category:'expense',type:'manual',description:String(payload.description).trim(),date:payload.date,incurredAt:payload.incurredAt,amountCents:payload.amountCents,ledgerRevision:revision,updatedAt:serverTimestamp()});
      return revision;
    });
  },

  async updateLaneExpense(clubId,archiveId,payload,expectedRevision) {
    if(!clubId||typeof archiveId!=='string'||!archiveId||archiveId.includes('/'))throw new Error('Ungültiger Kegelabend');
    if(!payload.remove&&(!Number.isSafeInteger(payload.amountCents)||payload.amountCents<0||!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)||!Number.isFinite(Date.parse(payload.date+'T12:00:00Z'))||new Date(payload.date+'T12:00:00Z').toISOString().slice(0,10)!==payload.date||!Number.isFinite(Date.parse(payload.incurredAt))))throw new Error('Ungültige Bahngebühr');
    const ref=doc(db,'clubs',clubId,'archive',archiveId);
    return runTransaction(db,async transaction=>{
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

  async deleteCashExpense(clubId,expenseId,expectedRevision) {
    if(!clubId||typeof expenseId!=='string'||!/^expense_manual_[a-zA-Z0-9_-]+$/.test(expenseId))throw new Error('Ungültige Ausgabe');
    const ref=doc(db,'clubs',clubId,'archive',expenseId);
    return runTransaction(db,async transaction=>{
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

  async deleteArchivedStrafenEvent(clubId, archiveId) {
    // Accept legacy, per-evening and cancelled IDs. Verify the category before deleting.
    if (!clubId || typeof archiveId !== 'string' || !archiveId || archiveId.includes('/') || archiveId === '.' || archiveId === '..' || archiveId.length > 1500) {
      throw new Error('Ungültiger Archiv-Eintrag');
    }
    const ref = doc(db, 'clubs', clubId, 'archive', archiveId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error('Abschluss ist nicht mehr vorhanden');
    if (snapshot.data().category !== 'strafen') throw new Error('Eintrag ist kein Strafenabschluss');
    await deleteDoc(ref);
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

  async saveHistoricalStrafenEvent(clubId, archiveId, payload, expectedRevision=null, previousArchiveId=archiveId) {
    if(!clubId||typeof archiveId!=='string'||!/^cancelled_\d{4}-\d{2}-\d{2}$|^strafen_nachtrag_[a-zA-Z0-9_-]+$/.test(archiveId))throw new Error('Ungültiger Nachtrag');
    if(payload.category!=='strafen'||!['cancelled','backfill'].includes(payload.kind))throw new Error('Ungültige Abrechnung');
    if(payload.laneCostCents!=null&&(!Number.isSafeInteger(payload.laneCostCents)||payload.laneCostCents<0||payload.kind==='cancelled'))throw new Error('Ungültige Bahngebühr');
    if(previousArchiveId!==archiveId&&(payload.kind!=='cancelled'||!/^cancelled_\d{4}-\d{2}-\d{2}$/.test(previousArchiveId)))throw new Error('Ungültiger ursprünglicher Ausfalltermin');
    const ref=doc(db,'clubs',clubId,'archive',archiveId);
    const previousRef=previousArchiveId===archiveId?ref:doc(db,'clubs',clubId,'archive',previousArchiveId);
    return runTransaction(db,async transaction=>{
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

  async saveClubMeta(clubId, payload = {}) {
    const ref = doc(
      db,
      "clubs",
      clubId
    );

    await setDoc(
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

async seedLivePersons(
  clubId,
  persons = []
) {
  await Promise.all(
    persons.map(async person => {
      if (!person || !person.name) {
        return;
      }

      const personId =
        this.getLivePersonId(
          person.name
        );

      const personRef = doc(
        db,
        "clubs",
        clubId,
        "livePersons",
        personId
      );

      const existing =
        await getDoc(personRef);

      if (existing.exists()) {
        return;
      }

      await setDoc(personRef, {
        name:
          person.name,

        isGuest:
          !!person.isGuest,

        present:
          !!person.present,

        attendanceStatus:
          person.present
            ? "present"
            : (
                person.attendanceStatus ||
                "unknown"
              ),

        left:
          !!person.left,

        tisch:
          person.tisch || "",

        arrivalTime:
          person.arrivalTime || "",

        leftAt:
          person.leftAt || "",

        leftEarlyAt:
          person.leftEarlyAt || "",

        drinks: {
          ...(person.drinks || {})
        },

        strafen: {
          ...(person.strafen || {})
        },
          
          freeStrafen:
              Array.isArray(
                person.freeStrafen
              )
                ? person.freeStrafen.map(
                    entry => ({
                      ...entry
                    })
                  )
                : [],
          
          rounds:
              Array.isArray(
                person.rounds
              )
                ? person.rounds.map(
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
              person.boughtThrows || 0,
              10
            ) || 0
          ),

          paid:
              Math.max(
                0,
                parseFloat(
                  person.paid || 0
                ) || 0
              ),
          
        updatedAt:
          serverTimestamp()
      });
    })
  );

  return true;
},
    
async saveLivePersonStatus(
  clubId,
  personName,
  payload = {}
) {
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

  await setDoc(
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
) {
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

  await runTransaction(db, async transaction => {
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
) {
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

  return runTransaction(
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
) {
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

  return runTransaction(
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
) {
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

  await setDoc(
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
) {
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

  return runTransaction(
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
) {
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

  return runTransaction(
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
) {
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

  return runTransaction(
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
) {
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

  await deleteDoc(
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
  ) {
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

    return runTransaction(
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
  ) {
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

    return runTransaction(
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


console.log("Firestore API bereit");


if (typeof startApp === "function") {
  startApp();
}


