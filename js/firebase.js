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

async saveLiveLotterie(
  clubId,
  state = {}
) {
  const ref = doc(
    db,
    'clubs',
    clubId,
    'liveGames',
    'lotterie'
  );

  await setDoc(
    ref,
    {
      ...state,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
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

      const throws = {
        ...(current.throws || {})
      };

      const throwMetaMap = {
        ...(current.throwMeta || {})
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
          throws,
          throwMeta: throwMetaMap,
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

      drinks: {
        ...(payload.drinks || {})
      },

      strafen: {
        ...(payload.strafen || {})
      },
        
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
    },
    {
      merge: true
    }
  );

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
