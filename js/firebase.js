import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
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
  async loadClubState(clubId) {
    const ref = doc(db, 'clubs', clubId, 'state', 'current');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async saveClubState(clubId, payload = {}) {
    const ref = doc(db, 'clubs', clubId, 'state', 'current');
    await setDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async archiveClubEvent(clubId, archiveId, payload = {}) {
    const ref = doc(db, 'clubs', clubId, 'archive', archiveId);
    await setDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async saveClubMeta(clubId, payload = {}) {
    const ref = doc(db, 'clubs', clubId);
    await setDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async loadClubList() {
    const snap = await getDocs(collection(db, 'clubs'));
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  },
    
      getLivePersonId(personName) {
    return encodeURIComponent(
      String(personName || '')
        .trim()
        .toLowerCase()
    );
  },

  async loadLivePersons(clubId) {
    const ref = collection(db, 'clubs', clubId, 'livePersons');
    const snap = await getDocs(ref);

    return snap.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));
  },

    async seedLivePersons(clubId, persons = []) {
      await Promise.all(
        persons.map(async person => {
          const personId = this.getLivePersonId(person.name);

          const personRef = doc(
            db,
            'clubs',
            clubId,
            'livePersons',
            personId
          );

          const existing = await getDoc(personRef);

          // Vorhandene Live-Werte niemals überschreiben.
          if (existing.exists()) {
            return;
          }

          await setDoc(personRef, {
            name: person.name,
            drinks: { ...(person.drinks || {}) },
            strafen: { ...(person.strafen || {}) },
            updatedAt: serverTimestamp()
          });
        })
      );

      return true;
    },

  async changeLivePersonCounter(
    clubId,
    personName,
    category,
    key,
    delta
  ) {
    if (!['drinks', 'strafen'].includes(category)) {
      throw new Error(`Ungültige Kategorie: ${category}`);
    }

    const personId = this.getLivePersonId(personName);
    const personRef = doc(
      db,
      'clubs',
      clubId,
      'livePersons',
      personId
    );

    return runTransaction(db, async transaction => {
      const snap = await transaction.get(personRef);
      const current = snap.exists() ? snap.data() : {};

      const counters = {
        ...(current[category] || {})
      };

      const previousValue = Number(counters[key] || 0);
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
        { merge: true }
      );

      return nextValue;
    });
  },

  subscribeToLivePersons(clubId, onData, onError) {
    const ref = collection(
      db,
      'clubs',
      clubId,
      'livePersons'
    );

    return onSnapshot(
      ref,
      snapshot => {
        const changes = snapshot.docChanges().map(change => ({
          type: change.type,
          id: change.doc.id,
          data: change.doc.data()
        }));

        onData(changes);
      },
      onError
    );
  },

  subscribeToClubState(clubId, onData, onError) {
    const ref = doc(db, 'clubs', clubId, 'state', 'current');
    return onSnapshot(
      ref,
      (snap) => onData(snap.exists() ? snap.data() : null),
      onError
    );
  }
};

  console.log('Firestore API bereit');

  if (typeof startApp === 'function') {
    startApp();
  }
