import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  getDocs
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