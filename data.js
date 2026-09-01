/*
  MindForge — content loader
  --------------------------
  Works on both hosts:

    Vercel        -> /api/content exists, so quotes / essays / laws come
                     live from the Neon database.
    GitHub Pages  -> no API, so we load quotes-extra.js instead and the
                     same quotes get added from a plain static file.

  Either way the page ends up with the full library, and nothing breaks if
  the network is unavailable.
*/
(function () {
  'use strict';

  var API = '/api/content';
  var CACHE_KEY = 'mf_content_v1';
  var FALLBACK = 'quotes-extra.js';

  var LABELS = { movies: 'Movies' };

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

  // Any theme on a quote that has no filter chip yet gets one.
  function registerThemes(quotes) {
    if (typeof TH === 'undefined' || !quotes) return;
    quotes.forEach(function (item) {
      (item.t || []).forEach(function (theme) {
        if (TH[theme]) return;
        TH[theme] = LABELS[theme] ||
          theme.charAt(0).toUpperCase() + theme.slice(1).replace(/-/g, ' ');
      });
    });
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
    if (swap('Q', data.quotes)) { registerThemes(data.quotes); changed = true; }
    if (swap('ESSAYS', data.essays)) changed = true;
    if (swap('LAWS', data.laws)) changed = true;
    if (changed) repaint();
    return changed;
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* quota */ }
  }

  // Static host: pull in the plain-file copy of the extra quotes instead.
  function useFallback() {
    if (document.querySelector('script[data-mf-fallback]')) return;
    var s = document.createElement('script');
    s.src = FALLBACK;
    s.setAttribute('data-mf-fallback', '1');
    document.body.appendChild(s);
  }

  function start() {
    // 1. Paint from cache immediately (instant, works offline).
    apply(readCache());

    // 2. Then try the database.
    fetch(API, { headers: { accept: 'application/json' } })
      .then(function (res) {
        var type = res.headers.get('content-type') || '';
        if (!res.ok || type.indexOf('json') === -1) return null; // no real API here
        return res.json();
      })
      .then(function (data) {
        if (!data || data.error) { useFallback(); return; }
        writeCache(data);
        apply(data);
      })
      .catch(function () {
        useFallback();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
