/* =========================================================================
   save.js — localStorage-обёртка для прогресса
   ========================================================================= */
(function () {
  const KEY = "restaurant-escape-save-v2";

  const DEFAULT_STATE = {
    keysCollected: [],
    seenIntro: false,
    playerName: null,
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (e) {
      return { ...DEFAULT_STATE };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* quota / private mode */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function markKey(state, id) {
    if (!state.keysCollected.includes(id)) {
      state.keysCollected.push(id);
      save(state);
    }
  }

  window.Save = { load, save, reset, markKey, DEFAULT_STATE };
})();
