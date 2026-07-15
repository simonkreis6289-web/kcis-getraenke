const APP_VERSION = '20260318-13';
const APPVersionSelf = '2.0.0.55, © SK';

const LOCAL_STATE_KEY = 'kcis_local_state_v6';
const FIRESTORE_ENABLED = true;

let DRINKS = [
  { key: 'kl_bier', label: 'Kl. Bier' },
  { key: 'gr_bier', label: 'Gr. Bier' },
  { key: 'kl_softd', label: 'Kl. Fanta/Cola' },
  { key: 'gr_softd', label: 'Gr. Fanta/Cola' },
  { key: 'malz', label: 'Malzbier' },
  { key: 'wasser', label: 'Wasser' },
  { key: 'schnaps', label: 'Schnaps' },
  { key: 'weizen', label: 'Weizen' },
  { key: 'wein', label: 'Wein/Sekt' }
];

let STRAFEN = [
  { key: 'pudel', label: 'Pudel' },
  { key: 'klingel', label: 'Klingel' }
];

let strafPrices = {};

let SPIELE_KATALOG = ['Tannenbaum', 'Darts'];
let RUNDEN_GRUENDE = ['1000er-Runde', '2000er-Runde', 'Geburtstag'];

let drinkEditPerson = null;
let drinkEditDraft = {};
let persons = [];
let prices = {};
let spiele = [];
let modalPerson = null;
let selectedLoser = null;
let teamDrinks = {};
let roundDraftDrinks = {};
let lastState = null;
let undoTimer = null;
let assignPerson = null;
let autoSaveTimer = null;
let appReady = false;
let lastLocalChangeAt = 0;
let lastRemoteChangeAt = 0;
let isApplyingRemoteState = false;
let tiberiusPendingThrower = null;

window.toastTimer = null;

const CLIENT_ID_KEY = 'kcis_client_id_v1';
const CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY) || (
  window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2)
);
localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);

let ACTIVE_CLUB = null;
let CLUBS = {};
let currentClubUnsubscribe = null;

let currentLivePersonsUnsubscribe = null;
let livePersonCounters = new Map();
let liveCountersReady = false;

const sounds = {
  cash: new Audio('sounds/cash.mp3'),
  goodbye: new Audio('sounds/goodbye.mp3'),
  welcome: new Audio('sounds/welcome.mp3')
};

let pendingClubAvatarName = null;

let bahnPreisProStunde = 0;
let bahnTimerStart = null;
let bahnTimerRunning = false;
let bahnTimerInterval = null;

let teamStopwatchActive = false;
let teamStopwatchRunning = false;
let teamStopwatchStart = null;
let teamCountdownDuration = 0;
let teamCountdownRemainingBefore = 0;
let teamStopwatchInterval = null;

let STRAFEN_LIMIT = 30;
const ABSENT_STRAFE_EXTRA = 2;

let tannenbaumThrowTeam = null;
let tannenbaumOnTop = false;

const TANNENBAUM_DEFAULT_BASE = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 4,
  7: 3,
  8: 2,
  9: 1
};

let TANNENBAUM_BASE = { ...TANNENBAUM_DEFAULT_BASE };
let tannenbaumHardRule = true;

let groupSettings = {
  T1: { name: 'Wand', color: '#111111', emoji: '⚫' },
  T2: { name: 'TV', color: '#d62828', emoji: '🔴' }
};

const DARTS_DEFAULT_VALUES = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 10,
  7: 15,
  8: 20,
  9: 25,
  kranz: 50
};

let penaltyStatsLog = [];
let kegelAbende = [];

let dartsState = null;
let dartsThrowTeam = null;

let tannenbaumState = null;
let lotterieState = null;
let tiberiusState = null;

let lotterieSettings = {
  minAmount: 0.10,
  maxAmount: 10.00
};

let tiberiusSettings = {
  minPins: 10,
  maxPins: 300
};

let lotterieEdit = {
  person: null,
  colIndex: null
};

let tiberiusEdit = {
  person: null,
  colIndex: null
};

let strafenHistory = [];

let wurfSettings = {
  maxBuys: 3
};

let timePenaltySettings = {
  startTime: '20:00',
  endTime: '23:00'
};

let arrivalEditPerson = null;
let leftEarlyEditPerson = null;
