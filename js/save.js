/* =========================================================================
   save.js — localStorage-обёртка для прогресса
   ========================================================================= */
(function () {
  const KEY = "restaurant-escape-save-v1";

  const DEFAULT_STATE = {
    keysCollected: [],   // массив id ключей: ['food', 'photo', ...]
    currentRoom: "hall", // id текущей комнаты
    seenIntro: false,
    playerName: null,    // персонализация — имя героя
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

  window.Save = { load, save, reset, DEFAULT_STATE };
})();
