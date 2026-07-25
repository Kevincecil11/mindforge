(function () {
  'use strict';

  var STORAGE_KEY = 'mf_bookmarks_v1';
  var saved = loadSaved();

  function loadSaved() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(function (id) { return Number.isInteger(id) && id >= 0; }) : [];
    } catch (e) {
      return [];
    }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (e) {}
  }

  function isSaved(id) { return saved.indexOf(id) !== -1; }

  function toggleSaved(id) {
    var index = saved.indexOf(id);
    if (index === -1) saved.push(id);
    else saved.splice(index, 1);
    persist();
    decorateHero();
    decorateQuoteCards();
    renderBookmarks();
  }

  function quoteIdFromCard(card) {
    var text = card.querySelector('.qc-text');
    if (!text || typeof Q === 'undefined') return -1;
    var quote = text.textContent.replace(/^"|"$/g, '');
    for (var i = 0; i < Q.length; i++) if (Q[i].q === quote) return i;
    return -1;
  }

  function currentHeroId() {
    var text = document.getElementById('hero-quote');
    var author = document.getElementById('hero-author');
    if (!text || !author || typeof Q === 'undefined') return -1;
    var quote = text.textContent.replace(/^"|"$/g, '');
    for (var i = 0; i < Q.length; i++) {
      if (Q[i].q === quote && Q[i].a === author.textContent) return i;
    }
    return -1;
  }

  function setButtonState(button, id, compact) {
    var active = isSaved(id);
    button.classList.toggle('saved', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('title', active ? 'Remove bookmark' : 'Bookmark quote');
    button.innerHTML = compact ? (active ? '&#9829;' : '&#9825;') : (active ? '&#9829; Saved' : '&#9825; Save');
  }

  function decorateHero() {
    var button = document.getElementById('hero-bookmark');
    var refresh = document.getElementById('hero-refresh');
    if (!refresh) return;
    if (!button) {
      button = document.createElement('button');
      button.id = 'hero-bookmark';
      button.className = 'bookmark-btn hero-bookmark';
      refresh.insertAdjacentElement('afterend', button);
      button.addEventListener('click', function () {
        var id = currentHeroId();
        if (id >= 0) toggleSaved(id);
      });
    }
    var id = currentHeroId();
    if (id >= 0) setButtonState(button, id, false);
  }

  function decorateQuoteCards() {
    var cards = document.querySelectorAll('#qgrid .qc');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var id = quoteIdFromCard(card);
      if (id < 0) continue;
      var button = card.querySelector('.card-bookmark');
      if (!button) {
        button = document.createElement('button');
        button.className = 'bookmark-btn card-bookmark';
        card.appendChild(button);
        button.addEventListener('click', function (event) {
          event.stopPropagation();
          toggleSaved(Number(this.getAttribute('data-id')));
        });
      }
      button.setAttribute('data-id', String(id));
      setButtonState(button, id, true);
    }
  }

  function renderBookmarks() {
    var grid = document.getElementById('bookmarks-grid');
    var count = document.getElementById('bookmarks-count');
    if (!grid || !count || typeof Q === 'undefined') return;
    var valid = saved.filter(function (id) { return Q[id]; });
    count.textContent = valid.length + (valid.length === 1 ? ' saved quote' : ' saved quotes');
    if (!valid.length) {
      grid.innerHTML = '<div class="bookmark-empty"><div class="bookmark-empty-icon">&#9825;</div><strong>No bookmarks yet</strong><span>Tap the heart on any quote to save it here.</span></div>';
      return;
    }
    grid.innerHTML = valid.map(function (id) {
      var q = Q[id];
      var tags = q.t.map(function (tag) { return '<span class="qt">' + (TH[tag] || tag) + '</span>'; }).join('');
      return '<div class="qc bookmark-card"><button class="bookmark-btn card-bookmark saved" data-remove-id="' + id + '" aria-label="Remove bookmark" title="Remove bookmark">&#9829;</button><div class="qc-text">&quot;' + q.q + '&quot;</div><div class="qc-author">' + q.a + (q.s ? '<span class="qc-src">' + q.s + '</span>' : '') + '</div><div class="qc-tags">' + tags + '</div></div>';
    }).join('');
    var remove = grid.querySelectorAll('[data-remove-id]');
    for (var i = 0; i < remove.length; i++) {
      remove[i].addEventListener('click', function () { toggleSaved(Number(this.getAttribute('data-remove-id'))); });
    }
  }

  function showBookmarks() {
    document.getElementById('hero').style.display = 'none';
    var sections = document.querySelectorAll('.section');
    for (var i = 0; i < sections.length; i++) sections[i].classList.remove('active');
    document.getElementById('sec-bookmarks').classList.add('active');
    if (typeof setNav === 'function') setNav('bookmarks');
    renderBookmarks();
    window.scrollTo({ top: 0 });
  }

  function injectUI() {
    var style = document.createElement('style');
    style.textContent = '.bookmark-btn{border:1.5px solid var(--border);background:var(--bg-sub);color:var(--ink-light);font-family:var(--body-font);cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent}.bookmark-btn:hover{border-color:var(--accent);color:var(--accent)}.bookmark-btn.saved{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}.hero-bookmark{margin-top:12px;padding:9px 15px;border-radius:20px;font-size:.78rem;font-weight:700}.qc{position:relative}.card-bookmark{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;font-size:1.15rem;display:flex;align-items:center;justify-content:center}.qc .qc-text{padding-right:28px}.bookmark-empty{grid-column:1/-1;min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--ink-light);gap:8px}.bookmark-empty strong{color:var(--ink);font-size:1rem}.bookmark-empty span{font-size:.84rem}.bookmark-empty-icon{font-size:2.4rem;color:var(--accent);margin-bottom:4px}.bookmark-card{position:relative}';
    document.head.appendChild(style);

    var section = document.createElement('div');
    section.className = 'section';
    section.id = 'sec-bookmarks';
    section.innerHTML = '<div class="section-top"><button class="back-btn" id="back-bookmarks">&#8592; Back</button><div class="section-title">Bookmarks</div><div class="section-sub">Quotes worth keeping</div></div><div class="qcount" id="bookmarks-count"></div><div class="qgrid" id="bookmarks-grid"></div>';
    document.getElementById('bottom-nav').insertAdjacentElement('beforebegin', section);

    var nav = document.createElement('button');
    nav.className = 'bnav-btn';
    nav.setAttribute('data-nav', 'bookmarks');
    nav.innerHTML = '<span class="bnav-icon">&#9829;</span>Saved';
    var settings = document.querySelector('[data-nav="settings"]');
    settings.parentNode.insertBefore(nav, settings);
    nav.addEventListener('click', showBookmarks);
    document.getElementById('back-bookmarks').addEventListener('click', showHero);
  }

  function setup() {
    injectUI();

    var originalSetHeroQuote = window.setHeroQuote;
    window.setHeroQuote = function (random) {
      originalSetHeroQuote(random);
      decorateHero();
    };

    var originalRenderQuotes = window.renderQuotes;
    window.renderQuotes = function () {
      originalRenderQuotes();
      decorateQuoteCards();
    };

    decorateHero();
    decorateQuoteCards();
    renderBookmarks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
