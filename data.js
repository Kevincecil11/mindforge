/*
  MindForge — live content loader
  -------------------------------
  Fetches quotes / essays / power laws from the database (via /api/content)
  and swaps them into the arrays index.html already uses, then re-renders.

  Safe by design:
  - If the API is unreachable (e.g. on GitHub Pages), nothing breaks:
    the hardcoded content in index.html stays on screen.
  - A copy is cached in localStorage, so a second visit renders instantly
    and still works offline.
  - Content is only swapped in if the database has AT LEAST as many items
    as the page already shows, so a half-filled table can never wipe out
    content that other scripts added.
*/
(function () {
  'use strict';

  var API = '/api/content';
  var CACHE_KEY = 'mf_content_v1';

  function count(name) {
    return (window[name] && window[name].length) || 0;
  }

  // Replace a global array only if the incoming list is not smaller.
  function swap(name, incoming) {
    if (!incoming || !incoming.length) return false;
    if (incoming.length < count(name)) return false;
    window[name] = incoming;
    return true;
  }

  function repaint() {
    try {
      if (typeof setHeroQuote === 'function') setHeroQuote(false);
      if (typeof renderChips === 'function') renderChips();
      if (typeof renderQuotes === 'function') renderQuotes();
      if (typeof renderEssays === 'function') renderEssays();
      if (typeof renderLaws === 'function') renderLaws();
    } catch (e) {
      /* rendering is best-effort — never let this kill the page */
    }
  }

  function apply(data) {
    if (!data) return false;
    var changed = false;
    if (swap('Q', data.quotes)) changed = true;
    if (swap('ESSAYS', data.essays)) changed = true;
    if (swap('LAWS', data.laws)) changed = true;
    if (changed) repaint();
    return changed;
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* quota — ignore */ }
  }

  function start() {
    // 1. Paint from cache immediately (instant, works offline).
    apply(readCache());

    // 2. Then go get the fresh version from the database.
    fetch(API, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || data.error) return;
        writeCache(data);
        apply(data);
      })
      .catch(function () {
        /* offline or no API (GitHub Pages) — keep what is already showing */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
