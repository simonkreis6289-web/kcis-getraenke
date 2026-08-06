// ─────────────────────────────────────────────────────────────
// GENERISCHE LIVE-SPIELE
//
// Firestore-Pfad:
// clubs/{clubId}/liveGames/{gameKey}
//
// Diese Datei stellt nur die allgemeine Infrastruktur bereit.
// Listener werden NICHT automatisch gestartet.
// ─────────────────────────────────────────────────────────────

const LIVE_GAME_CONFIG =
  new Map();

const liveGameUnsubscribes =
  new Map();

const lastLiveGameChangeAt = {};
const lastLiveGameRevision = {};

const liveGameApplyingRemote =
  new Set();


// ─────────────────────────────────────────────────────────────
// ALLGEMEINE HELFER
// ─────────────────────────────────────────────────────────────

function normalizeLiveGameKey(
  gameKey
) {
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


function cloneLiveGameValue(
  value
) {
  if (
    typeof structuredClone ===
    'function'
  ) {
    try {
      return structuredClone(
        value
      );
    } catch {
      // Fallback folgt unten.
    }
  }

  try {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  } catch {
    return value;
  }
}


function getCurrentLiveGameClubId() {
  if (!ACTIVE_CLUB) {
    return null;
  }

  if (
    typeof getClubFirestoreId ===
    'function'
  ) {
    return getClubFirestoreId(
      ACTIVE_CLUB
    );
  }

  return String(
    ACTIVE_CLUB
  );
}


function isLiveGameRegistered(
  gameKey
) {
  const normalizedGameKey =
    normalizeLiveGameKey(
      gameKey
    );

  return LIVE_GAME_CONFIG.has(
    normalizedGameKey
  );
}


function getLiveGameConfig(
  gameKey
) {
  const normalizedGameKey =
    normalizeLiveGameKey(
      gameKey
    );

  const config =
    LIVE_GAME_CONFIG.get(
      normalizedGameKey
    );

  if (!config) {
    throw new Error(
      `Live-Spiel "${normalizedGameKey}" ist nicht registriert`
    );
  }

  return {
    gameKey:
      normalizedGameKey,

    config
  };
}


function isApplyingLiveGameState(
  gameKey
) {
  const normalizedGameKey =
    normalizeLiveGameKey(
      gameKey
    );

  return liveGameApplyingRemote.has(
    normalizedGameKey
  );
}


// ─────────────────────────────────────────────────────────────
// SPIEL REGISTRIEREN
// ─────────────────────────────────────────────────────────────

function registerLiveGame(
  gameKey,
  config = {}
) {
  const normalizedGameKey =
    normalizeLiveGameKey(
      gameKey
    );

  if (
    typeof config.createState !==
      'function'
  ) {
    throw new Error(
      `createState fehlt bei "${normalizedGameKey}"`
    );
  }

  if (
    typeof config.getState !==
      'function'
  ) {
    throw new Error(
      `getState fehlt bei "${normalizedGameKey}"`
    );
  }

  if (
    typeof config.setState !==
      'function'
  ) {
    throw new Error(
      `setState fehlt bei "${normalizedGameKey}"`
    );
  }

  LIVE_GAME_CONFIG.set(
    normalizedGameKey,
    {
      createState:
        config.createState,

      getState:
        config.getState,

      setState:
        config.setState,

      ensureState:
        typeof config.ensureState ===
          'function'
          ? config.ensureState
          : null,

      render:
        typeof config.render ===
          'function'
          ? config.render
          : null,

      onRemoteApplied:
        typeof config.onRemoteApplied ===
          'function'
          ? config.onRemoteApplied
          : null
    }
  );

  if (
    lastLiveGameChangeAt[
      normalizedGameKey
    ] === undefined
  ) {
    lastLiveGameChangeAt[
      normalizedGameKey
    ] = 0;
  }

  if (
    lastLiveGameRevision[
      normalizedGameKey
    ] === undefined
  ) {
    lastLiveGameRevision[
      normalizedGameKey
    ] = 0;
  }

  return true;
}


// ─────────────────────────────────────────────────────────────
// LOKALEN STATE HOLEN
// ─────────────────────────────────────────────────────────────

function getRegisteredLiveGameState(
  gameKey
) {
  const {
    config
  } =
    getLiveGameConfig(
      gameKey
    );

  const state =
    config.getState();

  if (
    !state ||
    typeof state !==
      'object'
  ) {
    return cloneLiveGameValue(
      config.createState()
    );
  }

  return cloneLiveGameValue(
    state
  );
}


// ─────────────────────────────────────────────────────────────
// REMOTE-STATE ANWENDEN
// ─────────────────────────────────────────────────────────────

function applyLiveGameState(
  gameKey,
  remoteDocument,
  options = {}
) {
  const {
    gameKey:
      normalizedGameKey,

    config
  } =
    getLiveGameConfig(
      gameKey
    );

  if (!remoteDocument) {
    return false;
  }

  const remoteRevision =
    Math.max(
      0,
      parseInt(
        remoteDocument.revision || 0,
        10
      ) || 0
    );

  const remoteClientAt =
    Number(
      remoteDocument.updatedClientAt ||
      0
    ) || 0;

  const remoteClientId =
    String(
      remoteDocument.updatedClientId ||
      ''
    );

  const ownClientId =
    typeof CLIENT_ID !==
      'undefined'
      ? String(CLIENT_ID)
      : '';

  const knownRevision =
    Math.max(
      0,
      parseInt(
        lastLiveGameRevision[
          normalizedGameKey
        ] || 0,
        10
      ) || 0
    );

  const knownClientAt =
    Number(
      lastLiveGameChangeAt[
        normalizedGameKey
      ] || 0
    ) || 0;

  /*
   * Bereits verarbeiteten Stand ignorieren.
   */
  if (
    !options.force &&
    remoteRevision > 0 &&
    remoteRevision <= knownRevision
  ) {
    return false;
  }

  /*
   * Eigene Firestore-Rückmeldung ignorieren,
   * wenn sie nicht neuer als der lokal bekannte
   * Speicherzeitpunkt ist.
   */
  if (
    !options.force &&
    ownClientId &&
    remoteClientId === ownClientId &&
    remoteClientAt <= knownClientAt
  ) {
    lastLiveGameRevision[
      normalizedGameKey
    ] =
      Math.max(
        knownRevision,
        remoteRevision
      );

    return false;
  }

  const remoteState =
    remoteDocument.state &&
    typeof remoteDocument.state ===
      'object'
      ? cloneLiveGameValue(
          remoteDocument.state
        )
      : cloneLiveGameValue(
          config.createState()
        );

  liveGameApplyingRemote.add(
    normalizedGameKey
  );

  try {
    config.setState(
      remoteState
    );

    if (
      config.ensureState
    ) {
      config.ensureState();
    }

    lastLiveGameRevision[
      normalizedGameKey
    ] =
      Math.max(
        knownRevision,
        remoteRevision
      );

    lastLiveGameChangeAt[
      normalizedGameKey
    ] =
      Math.max(
        knownClientAt,
        remoteClientAt
      );

    if (
      config.render
    ) {
      config.render();
    }

    if (
      config.onRemoteApplied
    ) {
      config.onRemoteApplied(
        remoteState,
        remoteDocument
      );
    }

    return true;
  } catch (error) {
    console.error(
      `Live-State von "${normalizedGameKey}" konnte nicht angewendet werden:`,
      error
    );

    return false;
  } finally {
    liveGameApplyingRemote.delete(
      normalizedGameKey
    );
  }
}


// ─────────────────────────────────────────────────────────────
// SPIELSTAND SPEICHERN
// ─────────────────────────────────────────────────────────────

async function saveLiveGame(
  gameKey,
  options = {}
) {
  const {
    gameKey:
      normalizedGameKey
  } =
    getLiveGameConfig(
      gameKey
    );

  if (
    isApplyingLiveGameState(
      normalizedGameKey
    )
  ) {
    return {
      saved: false,
      reason: 'remote_apply'
    };
  }

  if (
    !navigator.onLine
  ) {
    if (
      !options.silent
    ) {
      showToast(
        '📴 Spielstand konnte offline nicht live gespeichert werden',
        'error'
      );
    }

    return {
      saved: false,
      reason: 'offline'
    };
  }

  if (
    !window.firestoreApi ||
    typeof window.firestoreApi
      .saveLiveGameState !==
      'function'
  ) {
    if (
      !options.silent
    ) {
      showToast(
        '❌ Live-Spiel-Synchronisation nicht verfügbar',
        'error'
      );
    }

    return {
      saved: false,
      reason: 'api_missing'
    };
  }

  const clubId =
    getCurrentLiveGameClubId();

  if (!clubId) {
    return {
      saved: false,
      reason: 'club_missing'
    };
  }

  const changedAt =
    Date.now();

  lastLiveGameChangeAt[
    normalizedGameKey
  ] =
    changedAt;

  const state =
    getRegisteredLiveGameState(
      normalizedGameKey
    );

  try {
    const result =
      await window.firestoreApi
        .saveLiveGameState(
          clubId,
          normalizedGameKey,
          state,
          {
            updatedClientId:
              typeof CLIENT_ID !==
                'undefined'
                ? CLIENT_ID
                : '',

            updatedClientAt:
              changedAt
          }
        );

    if (
      result?.revision !==
      undefined
    ) {
      lastLiveGameRevision[
        normalizedGameKey
      ] =
        Math.max(
          lastLiveGameRevision[
            normalizedGameKey
          ] || 0,
          parseInt(
            result.revision || 0,
            10
          ) || 0
        );
    }

    return {
      saved: true,
      ...result
    };
  } catch (error) {
    console.error(
      `Spielstand "${normalizedGameKey}" konnte nicht gespeichert werden:`,
      error
    );

    if (
      !options.silent
    ) {
      showToast(
        `❌ ${normalizedGameKey} konnte nicht synchronisiert werden`,
        'error'
      );
    }

    return {
      saved: false,
      reason: 'save_failed',
      error
    };
  }
}


// ─────────────────────────────────────────────────────────────
// EIN SPIEL LADEN
// ─────────────────────────────────────────────────────────────

async function loadLiveGame(
  gameKey,
  options = {}
) {
  const {
    gameKey:
      normalizedGameKey,

    config
  } =
    getLiveGameConfig(
      gameKey
    );

  if (
    !window.firestoreApi ||
    typeof window.firestoreApi
      .loadLiveGameState !==
      'function'
  ) {
    return {
      loaded: false,
      reason: 'api_missing'
    };
  }

  const clubId =
    getCurrentLiveGameClubId();

  if (!clubId) {
    return {
      loaded: false,
      reason: 'club_missing'
    };
  }

  try {
    const remoteDocument =
      await window.firestoreApi
        .loadLiveGameState(
          clubId,
          normalizedGameKey
        );

    /*
     * Noch kein Live-Dokument:
     * Nur lokal initialisieren.
     *
     * Es wird hier bewusst noch nicht automatisch
     * nach Firestore geschrieben.
     */
    if (!remoteDocument) {
      if (
        options.initializeLocal
      ) {
        config.setState(
          cloneLiveGameValue(
            config.createState()
          )
        );

        if (
          config.ensureState
        ) {
          config.ensureState();
        }

        if (
          config.render
        ) {
          config.render();
        }
      }

      return {
        loaded: false,
        reason: 'not_found'
      };
    }

    const applied =
      applyLiveGameState(
        normalizedGameKey,
        remoteDocument,
        {
          force:
            !!options.force
        }
      );

    return {
      loaded: true,
      applied,
      document:
        remoteDocument
    };
  } catch (error) {
    console.error(
      `Spielstand "${normalizedGameKey}" konnte nicht geladen werden:`,
      error
    );

    return {
      loaded: false,
      reason: 'load_failed',
      error
    };
  }
}


// ─────────────────────────────────────────────────────────────
// LISTENER FÜR EIN SPIEL
// ─────────────────────────────────────────────────────────────

function subscribeToLiveGame(
  gameKey,
  options = {}
) {
  const {
    gameKey:
      normalizedGameKey
  } =
    getLiveGameConfig(
      gameKey
    );

  if (
    !window.firestoreApi ||
    typeof window.firestoreApi
      .subscribeToLiveGameState !==
      'function'
  ) {
    console.error(
      'subscribeToLiveGameState ist nicht verfügbar'
    );

    return false;
  }

  const clubId =
    getCurrentLiveGameClubId();

  if (!clubId) {
    return false;
  }

  unsubscribeFromLiveGame(
    normalizedGameKey
  );

  const unsubscribe =
    window.firestoreApi
      .subscribeToLiveGameState(
        clubId,
        normalizedGameKey,

        remoteDocument => {
          if (!remoteDocument) {
            if (
              typeof options.onMissing ===
              'function'
            ) {
              options.onMissing(
                normalizedGameKey
              );
            }

            return;
          }

          const applied =
            applyLiveGameState(
              normalizedGameKey,
              remoteDocument
            );

          if (
            applied &&
            typeof options.onApplied ===
              'function'
          ) {
            options.onApplied(
              remoteDocument
            );
          }
        },

        error => {
          console.error(
            `Live-Listener für "${normalizedGameKey}" meldet einen Fehler:`,
            error
          );

          if (
            typeof options.onError ===
              'function'
          ) {
            options.onError(
              error
            );
          }
        }
      );

  liveGameUnsubscribes.set(
    normalizedGameKey,
    unsubscribe
  );

  return true;
}


// ─────────────────────────────────────────────────────────────
// EINEN LISTENER BEENDEN
// ─────────────────────────────────────────────────────────────

function unsubscribeFromLiveGame(
  gameKey
) {
  const normalizedGameKey =
    normalizeLiveGameKey(
      gameKey
    );

  const unsubscribe =
    liveGameUnsubscribes.get(
      normalizedGameKey
    );

  if (
    typeof unsubscribe ===
    'function'
  ) {
    try {
      unsubscribe();
    } catch (error) {
      console.warn(
        `Listener für "${normalizedGameKey}" konnte nicht sauber beendet werden:`,
        error
      );
    }
  }

  liveGameUnsubscribes.delete(
    normalizedGameKey
  );
}


// ─────────────────────────────────────────────────────────────
// ALLE REGISTRIERTEN SPIELE ABONNIEREN
//
// Wird noch NICHT automatisch aufgerufen.
// ─────────────────────────────────────────────────────────────

function subscribeToAllLiveGames(
  options = {}
) {
  unsubscribeFromAllLiveGames();

  LIVE_GAME_CONFIG.forEach(
    (
      config,
      gameKey
    ) => {
      subscribeToLiveGame(
        gameKey,
        options
      );
    }
  );

  return true;
}


// ─────────────────────────────────────────────────────────────
// ALLE SPIEL-LISTENER BEENDEN
// ─────────────────────────────────────────────────────────────

function unsubscribeFromAllLiveGames() {
  Array.from(
    liveGameUnsubscribes.keys()
  ).forEach(gameKey => {
    unsubscribeFromLiveGame(
      gameKey
    );
  });
}


// ─────────────────────────────────────────────────────────────
// SPIEL ZURÜCKSETZEN
// ─────────────────────────────────────────────────────────────

async function resetLiveGame(
  gameKey,
  options = {}
) {
  const {
    gameKey:
      normalizedGameKey,

    config
  } =
    getLiveGameConfig(
      gameKey
    );

  const initialState =
    cloneLiveGameValue(
      config.createState()
    );

  config.setState(
    initialState
  );

  if (
    config.ensureState
  ) {
    config.ensureState();
  }

  if (
    config.render
  ) {
    config.render();
  }

  if (
    options.localOnly
  ) {
    return {
      reset: true,
      saved: false,
      localOnly: true
    };
  }

  if (
    !navigator.onLine
  ) {
    return {
      reset: true,
      saved: false,
      reason: 'offline'
    };
  }

  if (
    !window.firestoreApi ||
    typeof window.firestoreApi
      .resetLiveGameState !==
      'function'
  ) {
    return {
      reset: true,
      saved: false,
      reason: 'api_missing'
    };
  }

  const clubId =
    getCurrentLiveGameClubId();

  if (!clubId) {
    return {
      reset: true,
      saved: false,
      reason: 'club_missing'
    };
  }

  const changedAt =
    Date.now();

  lastLiveGameChangeAt[
    normalizedGameKey
  ] =
    changedAt;

  try {
    const result =
      await window.firestoreApi
        .resetLiveGameState(
          clubId,
          normalizedGameKey,
          initialState,
          {
            updatedClientId:
              typeof CLIENT_ID !==
                'undefined'
                ? CLIENT_ID
                : '',

            updatedClientAt:
              changedAt
          }
        );

    if (
      result?.revision !==
      undefined
    ) {
      lastLiveGameRevision[
        normalizedGameKey
      ] =
        Math.max(
          lastLiveGameRevision[
            normalizedGameKey
          ] || 0,
          parseInt(
            result.revision || 0,
            10
          ) || 0
        );
    }

    return {
      reset: true,
      saved: true,
      ...result
    };
  } catch (error) {
    console.error(
      `Spiel "${normalizedGameKey}" konnte nicht zurückgesetzt werden:`,
      error
    );

    return {
      reset: true,
      saved: false,
      reason: 'reset_failed',
      error
    };
  }
}


// ─────────────────────────────────────────────────────────────
// GENERISCHE TRANSAKTION
//
// handler erhält:
//
// {
//   state,
//   revision,
//   document,
//   exists
// }
//
// Rückgabe des Handlers:
//
// {
//   state: neuerState,
//   result: optional
// }
//
// oder:
//
// {
//   abort: true,
//   reason: '...'
// }
// ─────────────────────────────────────────────────────────────

async function runLiveGameAction(
  gameKey,
  handler,
  options = {}
) {
  const {
    gameKey:
      normalizedGameKey,

    config
  } =
    getLiveGameConfig(
      gameKey
    );

  if (
    typeof handler !==
    'function'
  ) {
    throw new Error(
      'Aktionsfunktion fehlt'
    );
  }

  if (
    !navigator.onLine
  ) {
    return {
      committed: false,
      reason: 'offline'
    };
  }

  if (
    !window.firestoreApi ||
    typeof window.firestoreApi
      .runLiveGameTransaction !==
      'function'
  ) {
    return {
      committed: false,
      reason: 'api_missing'
    };
  }

  const clubId =
    getCurrentLiveGameClubId();

  if (!clubId) {
    return {
      committed: false,
      reason: 'club_missing'
    };
  }

  const changedAt =
    Date.now();

  lastLiveGameChangeAt[
    normalizedGameKey
  ] =
    changedAt;

  try {
    const transactionResult =
      await window.firestoreApi
        .runLiveGameTransaction(
          clubId,
          normalizedGameKey,

          async remoteContext => {
            const currentState =
              remoteContext.state &&
              typeof remoteContext.state ===
                'object'
                ? cloneLiveGameValue(
                    remoteContext.state
                  )
                : cloneLiveGameValue(
                    config.createState()
                  );

            return handler({
              ...remoteContext,
              state:
                currentState
            });
          },

          {
            updatedClientId:
              typeof CLIENT_ID !==
                'undefined'
                ? CLIENT_ID
                : '',

            updatedClientAt:
              changedAt
          }
        );

    if (
      transactionResult?.revision !==
      undefined
    ) {
      lastLiveGameRevision[
        normalizedGameKey
      ] =
        Math.max(
          lastLiveGameRevision[
            normalizedGameKey
          ] || 0,
          parseInt(
            transactionResult
              .revision || 0,
            10
          ) || 0
        );
    }

    if (
      transactionResult
        ?.committed &&
      transactionResult.state
    ) {
      applyLiveGameState(
        normalizedGameKey,
        {
          gameKey:
            normalizedGameKey,

          state:
            transactionResult.state,

          revision:
            transactionResult.revision,

          updatedClientId:
            transactionResult
              .updatedClientId,

          updatedClientAt:
            transactionResult
              .updatedClientAt
        },
        {
          force: true
        }
      );
    }

    if (
      !transactionResult
        ?.committed &&
      !options.silent
    ) {
      const reason =
        transactionResult?.reason ||
        'aborted';

      console.info(
        `Live-Aktion für "${normalizedGameKey}" wurde nicht ausgeführt: ${reason}`
      );
    }

    return transactionResult;
  } catch (error) {
    console.error(
      `Live-Aktion für "${normalizedGameKey}" ist fehlgeschlagen:`,
      error
    );

    if (
      !options.silent
    ) {
      showToast(
        `❌ Aktion für ${normalizedGameKey} fehlgeschlagen`,
        'error'
      );
    }

    return {
      committed: false,
      reason: 'transaction_failed',
      error
    };
  }
}


// ─────────────────────────────────────────────────────────────
// ALLE SPIELE LOKAL ZURÜCKSETZEN
//
// Noch keine automatische Nutzung.
// ─────────────────────────────────────────────────────────────

function resetAllLiveGamesLocally() {
  LIVE_GAME_CONFIG.forEach(
    (
      config,
      gameKey
    ) => {
      config.setState(
        cloneLiveGameValue(
          config.createState()
        )
      );

      if (
        config.ensureState
      ) {
        config.ensureState();
      }

      if (
        config.render
      ) {
        config.render();
      }

      lastLiveGameChangeAt[
        gameKey
      ] = 0;

      lastLiveGameRevision[
        gameKey
      ] = 0;
    }
  );
}


// ─────────────────────────────────────────────────────────────
// STANDARD-SPIELE REGISTRIEREN
//
// Dies registriert nur die Konfiguration.
// Es werden keine Firestore-Aufrufe gestartet.
// ─────────────────────────────────────────────────────────────

function registerDefaultLiveGames() {
  if (
    typeof createLotterieState ===
      'function' &&
    typeof ensureLotterieState ===
      'function' &&
    typeof renderLotterie ===
      'function'
  ) {
    registerLiveGame(
      'lotterie',
      {
        createState:
          createLotterieState,

        getState:
          () => lotterieState,

        setState:
          state => {
            lotterieState =
              state;
          },

        ensureState:
          ensureLotterieState,

        render:
          renderLotterie
      }
    );
  }

  if (
    typeof createTiberiusState ===
      'function' &&
    typeof ensureTiberiusState ===
      'function' &&
    typeof renderTiberius ===
      'function'
  ) {
    registerLiveGame(
      'tiberius',
      {
        createState:
          createTiberiusState,

        getState:
          () => tiberiusState,

        setState:
          state => {
            tiberiusState =
              state;
          },

        ensureState:
          ensureTiberiusState,

        render:
          renderTiberius
      }
    );
  }

  if (
    typeof createDartsState ===
      'function' &&
    typeof ensureDartsState ===
      'function' &&
    typeof renderDarts ===
      'function'
  ) {
    registerLiveGame(
      'darts',
      {
        createState:
          createDartsState,

        getState:
          () => dartsState,

        setState:
          state => {
            dartsState =
              state;
          },

        ensureState:
          ensureDartsState,

        render:
          renderDarts
      }
    );
  }

  if (
    typeof createTannenbaumState ===
      'function' &&
    typeof ensureTannenbaumState ===
      'function' &&
    typeof renderTannenbaum ===
      'function'
  ) {
    registerLiveGame(
      'tannenbaum',
      {
        createState:
          createTannenbaumState,

        getState:
          () => tannenbaumState,

        setState:
          state => {
            tannenbaumState =
              state;
          },

        ensureState:
          ensureTannenbaumState,

        render:
          renderTannenbaum
      }
    );
  }
}


registerDefaultLiveGames();

console.log(
  'Live-Game-Infrastruktur bereit:',
  Array.from(
    LIVE_GAME_CONFIG.keys()
  )
);
