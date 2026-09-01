/*
  MindForge — authentication (Neon Managed Better Auth)
  ----------------------------------------------------
  Everything goes through /api/auth/* on our own domain (see
  api/auth/[...path].js). That proxy hands us the session in an
  `x-mf-session` header; we keep it in localStorage and send it back on
  every call. So the session survives even when the browser refuses to
  keep cookies — which is exactly what iOS Safari does with Neon's domain.

  Flows offered:
    - Create account / sign in with email + password  (reliable everywhere)
    - Set or reset a password by email                (links a password to
      an account that was created with Google)
    - Continue with Google                            (great on desktop;
      iOS may drop the session, and we say so plainly)
*/
(function () {
  'use strict';

  var PROXY = '/api/auth';
  var UPSTREAM =
    'https://ep-bitter-fog-ae1yr8y3.neonauth.c-2.us-east-2.aws.neon.tech/neondb/auth';

  var SESSION_KEY = 'mf_session';
  var PENDING_KEY = 'mf_auth_pending';

  var state = { user: null, busy: false, view: 'signin', checked: false };

  // ---------------------------------------------------------------- storage

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* private mode */ }
    return null;
  }

  // ---------------------------------------------------------------- network

  function request(path, body, base) {
    var headers = { 'Content-Type': 'application/json' };
    var session = store(SESSION_KEY);
    if (session) headers['x-mf-session'] = session;

    return fetch((base || PROXY) + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      var carried = res.headers.get('x-mf-session');
      if (carried) store(SESSION_KEY, carried);

      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { /* not json */ }

        if (!res.ok) {
          var err = new Error(
            (data && (data.message || data.error)) || ('Request failed (' + res.status + ')')
          );
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function quiet(promise) {
    return promise.catch(function () { return null; });
  }

  function loadSession() {
    return Promise.all([
      quiet(request('/get-session')),
      quiet(request('/get-session', null, UPSTREAM))
    ]).then(function (results) {
      var found = null;
      results.forEach(function (data) {
        if (!found && data && data.user) found = data.user;
      });
      state.user = found;
      state.checked = true;
      return found;
    });
  }

  // ------------------------------------------------------------------ styles

  function styles() {
    if (document.getElementById('mf-auth-css')) return;
    var css = document.createElement('style');
    css.id = 'mf-auth-css';
    css.textContent =
      '.mf-auth-field{width:100%;padding:12px 14px;margin-bottom:8px;border-radius:10px;' +
        'border:1.5px solid var(--border);background:var(--bg);color:var(--ink);' +
        'font-family:var(--body-font);font-size:0.9rem;}' +
      '.mf-auth-field:focus{outline:none;border-color:var(--accent);}' +
      '.mf-auth-btn{width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--accent);' +
        'background:var(--accent-soft);color:var(--accent);font-family:var(--body-font);' +
        'font-size:0.86rem;font-weight:700;cursor:pointer;margin-bottom:8px;' +
        '-webkit-tap-highlight-color:transparent;}' +
      '.mf-auth-btn[disabled]{opacity:0.5;cursor:default;}' +
      '.mf-auth-btn.ghost{border-color:var(--border);background:var(--bg);color:var(--ink-mid);}' +
      '.mf-auth-btn.ghost:hover{border-color:var(--accent);color:var(--accent);}' +
      '.mf-auth-alt{text-align:center;font-size:0.78rem;color:var(--ink-light);padding:4px 0 6px;' +
        'line-height:1.6;}' +
      '.mf-auth-alt a{color:var(--accent);font-weight:600;text-decoration:none;cursor:pointer;}' +
      '.mf-auth-msg{font-size:0.74rem;line-height:1.45;margin-top:6px;padding:0 2px;' +
        'color:var(--ink-light);}' +
      '.mf-auth-msg.err{color:oklch(65% 0.16 25);}' +
      '.mf-auth-msg.ok{color:var(--accent);}' +
      '.mf-auth-card{display:flex;align-items:center;gap:12px;background:var(--bg);' +
        'border:1.5px solid var(--accent);border-radius:10px;padding:14px 16px;}' +
      '.mf-auth-dot{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;' +
        'align-items:center;justify-content:center;background:var(--accent-soft);' +
        'color:var(--accent);font-weight:700;font-size:1rem;}' +
      '.mf-auth-who{font-size:0.92rem;font-weight:700;margin-bottom:1px;}' +
      '.mf-auth-sub{font-size:0.74rem;color:var(--ink-light);line-height:1.35;word-break:break-all;}';
    document.head.appendChild(css);
  }

  function section() {
    var panel = document.querySelector('#settings-overlay .settings-panel');
    if (!panel) return null;

    var el = document.getElementById('mf-auth');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'settings-section';
    el.id = 'mf-auth';

    var title = panel.querySelector('.settings-title');
    if (title && title.nextSibling) panel.insertBefore(el, title.nextSibling);
    else panel.appendChild(el);

    return el;
  }

  function message(text, kind) {
    var box = document.getElementById('mf-auth-msg');
    if (!box) return;
    box.className = 'mf-auth-msg' + (kind ? ' ' + kind : '');
    box.textContent = text || '';
  }

  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function on(id, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  function enterKey(ids, handler) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') handler(); });
    });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? (el.value || '') : '';
  }

  // -------------------------------------------------------------------- view

  function render(note, kind) {
    var el = section();
    if (!el) return;

    // ---------- signed in
    if (state.user) {
      var name = state.user.name || state.user.email || 'Signed in';
      el.innerHTML =
        '<div class="settings-label">Account</div>' +
        '<div class="mf-auth-card">' +
          '<div class="mf-auth-dot">' + esc((name.trim()[0] || '?').toUpperCase()) + '</div>' +
          '<div>' +
            '<div class="mf-auth-who">' + esc(name) + '</div>' +
            '<div class="mf-auth-sub">' + esc(state.user.email || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="mf-auth-btn ghost" id="mf-signout" style="margin-top:10px;">Sign out</button>' +
        '<div class="mf-auth-msg ok" id="mf-auth-msg">\u2713 Signed in on this device.</div>';
      on('mf-signout', signOut);
      if (note) message(note, kind || 'ok');
      return;
    }

    // ---------- set a new password (arrived from a reset email)
    if (state.view === 'reset') {
      el.innerHTML =
        '<div class="settings-label">Set a password</div>' +
        '<input class="mf-auth-field" id="mf-new" type="password" placeholder="New password" ' +
          'autocomplete="new-password">' +
        '<button class="mf-auth-btn" id="mf-save">Save password</button>' +
        '<div class="mf-auth-alt"><a id="mf-back">Back to sign in</a></div>' +
        '<div class="mf-auth-msg" id="mf-auth-msg">At least 8 characters.</div>';
      on('mf-save', savePassword);
      on('mf-back', function () { state.view = 'signin'; render(); });
      enterKey(['mf-new'], savePassword);
      if (note) message(note, kind);
      return;
    }

    // ---------- ask for a reset email
    if (state.view === 'forgot') {
      el.innerHTML =
        '<div class="settings-label">Set or reset password</div>' +
        '<input class="mf-auth-field" id="mf-email" type="email" placeholder="Your email" ' +
          'autocomplete="email" autocapitalize="none" spellcheck="false">' +
        '<button class="mf-auth-btn" id="mf-send">Email me a link</button>' +
        '<div class="mf-auth-alt"><a id="mf-back">Back to sign in</a></div>' +
        '<div class="mf-auth-msg" id="mf-auth-msg">' +
          'Signed up with Google? This adds a password to the same account.' +
        '</div>';
      on('mf-send', sendReset);
      on('mf-back', function () { state.view = 'signin'; render(); });
      enterKey(['mf-email'], sendReset);
      if (note) message(note, kind);
      return;
    }

    // ---------- sign in / create account
    var signingUp = state.view === 'signup';

    el.innerHTML =
      '<div class="settings-label">Account</div>' +
      (signingUp
        ? '<input class="mf-auth-field" id="mf-name" type="text" placeholder="Your name" ' +
          'autocomplete="name">'
        : '') +
      '<input class="mf-auth-field" id="mf-email" type="email" placeholder="Email" ' +
        'autocomplete="email" autocapitalize="none" spellcheck="false">' +
      '<input class="mf-auth-field" id="mf-pass" type="password" placeholder="Password" ' +
        'autocomplete="' + (signingUp ? 'new-password' : 'current-password') + '">' +
      '<button class="mf-auth-btn" id="mf-submit">' +
        (signingUp ? 'Create account' : 'Sign in') +
      '</button>' +
      '<div class="mf-auth-alt">' +
        (signingUp
          ? 'Already have an account? <a id="mf-toggle">Sign in</a>'
          : 'New here? <a id="mf-toggle">Create an account</a>' +
            '<br><a id="mf-forgot">Set or reset password</a>') +
      '</div>' +
      '<button class="mf-auth-btn ghost" id="mf-google">Continue with Google</button>' +
      '<div class="mf-auth-msg" id="mf-auth-msg">' +
        (state.checked ? '' : 'Checking your account\u2026') +
      '</div>';

    on('mf-submit', submit);
    on('mf-google', google);
    on('mf-toggle', function () {
      state.view = signingUp ? 'signin' : 'signup';
      render();
    });
    on('mf-forgot', function () { state.view = 'forgot'; render(); });
    enterKey(['mf-email', 'mf-pass', 'mf-name'], submit);

    if (note) message(note, kind || 'err');
  }

  // ----------------------------------------------------------------- actions

  function busy(on_, label) {
    state.busy = on_;
    ['mf-submit', 'mf-google', 'mf-send', 'mf-save'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = on_;
    });
    if (on_ && label) message(label);
  }

  function friendly(msg, signingUp) {
    if (/exist/i.test(msg) && signingUp) {
      return 'That email already has an account. Use "Set or reset password" to add a password to it.';
    }
    if (/credential|password|invalid|unauthor/i.test(msg) && !signingUp) {
      return 'No password set for that email yet. Tap "Set or reset password" below.';
    }
    return msg;
  }

  function adopt(data) {
    if (data && data.user) {
      state.user = data.user;
      state.checked = true;
      return true;
    }
    return false;
  }

  function submit() {
    if (state.busy) return;

    var email = val('mf-email').trim();
    var password = val('mf-pass');
    var signingUp = state.view === 'signup';

    if (!email || !password) return message('Enter your email and password.', 'err');
    if (signingUp && password.length < 8) {
      return message('Use at least 8 characters for your password.', 'err');
    }

    busy(true, signingUp ? 'Creating your account\u2026' : 'Signing you in\u2026');

    var body = signingUp
      ? { name: val('mf-name').trim() || email.split('@')[0], email: email, password: password }
      : { email: email, password: password };

    request(signingUp ? '/sign-up/email' : '/sign-in/email', body)
      .then(function (data) {
        busy(false);
        if (adopt(data)) {
          render();
          quiet(loadSession()).then(function () { render(); });
          return;
        }
        return loadSession().then(function (user) {
          if (user) render();
          else render('Signed in, but the session did not stick. Reload the page.', 'err');
        });
      })
      .catch(function (err) {
        busy(false);
        message(friendly(err.message || 'Something went wrong. Try again.', signingUp), 'err');
      });
  }

  function sendReset() {
    if (state.busy) return;
    var email = val('mf-email').trim();
    if (!email) return message('Enter your email.', 'err');

    busy(true, 'Sending\u2026');
    request('/forget-password', {
      email: email,
      redirectTo: window.location.origin + window.location.pathname
    })
      .then(function () {
        busy(false);
        message('Check your inbox for a link to set your password. It may take a minute.', 'ok');
      })
      .catch(function (err) {
        busy(false);
        message(err.message || 'Could not send the email. Try again.', 'err');
      });
  }

  function savePassword() {
    if (state.busy) return;
    var password = val('mf-new');
    if (password.length < 8) return message('Use at least 8 characters.', 'err');

    busy(true, 'Saving\u2026');
    request('/reset-password', { newPassword: password, token: state.token })
      .then(function () {
        busy(false);
        state.view = 'signin';
        clearToken();
        render('Password saved. Sign in with it now.', 'ok');
      })
      .catch(function (err) {
        busy(false);
        message(err.message || 'That link may have expired. Request a new one.', 'err');
      });
  }

  function google() {
    if (state.busy) return;
    busy(true, 'Opening Google\u2026');
    store(PENDING_KEY, 'google');

    request('/sign-in/social', {
      provider: 'google',
      callbackURL: window.location.origin + window.location.pathname
    }, UPSTREAM)
      .then(function (data) {
        if (data && data.url) { window.location.href = data.url; return; }
        busy(false);
        store(PENDING_KEY, null);
        message('Could not start Google sign-in.', 'err');
      })
      .catch(function (err) {
        busy(false);
        store(PENDING_KEY, null);
        message(err.message || 'Could not start Google sign-in.', 'err');
      });
  }

  function signOut() {
    store(SESSION_KEY, null);
    store(PENDING_KEY, null);
    Promise.all([
      quiet(request('/sign-out', {})),
      quiet(request('/sign-out', {}, UPSTREAM))
    ]).then(function () {
      state.user = null;
      state.view = 'signin';
      render('Signed out.', 'ok');
    });
  }

  // -------------------------------------------------------------------- boot

  function findToken() {
    var match = /[?&#]token=([^&]+)/.exec(window.location.href);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function clearToken() {
    state.token = null;
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    }
  }

  function start() {
    styles();

    state.token = findToken();
    if (state.token) state.view = 'reset';

    render();

    var fromGoogle = store(PENDING_KEY) === 'google';

    loadSession().then(function (user) {
      store(PENDING_KEY, null);

      if (user) { state.view = 'signin'; render(); return; }
      if (state.token) { render(); return; }

      if (fromGoogle) {
        render(
          'Google signed you in but this browser dropped the session. ' +
          'Tap "Set or reset password" to add a password \u2014 that one sticks on iPhone.',
          'err'
        );
        return;
      }
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.MindForgeAuth = {
    user: function () { return state.user; },
    refresh: function () { return loadSession().then(function (u) { render(); return u; }); }
  };
})();
