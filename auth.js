/*
  MindForge — authentication (Neon Managed Better Auth)
  ----------------------------------------------------
  Adds an Account block at the top of Settings: email + password, Google,
  and a signed-in view with sign out.

  Two routes to the auth service, because browsers differ:

    /api/auth/*   — same-origin proxy (see api/auth/[...path].js). Cookies
                    set through here belong to this site, so Safari and iOS
                    keep them. This is the reliable path.
    UPSTREAM      — Neon's auth domain, called directly. Needed for the
                    Google redirect flow, whose session cookie lands on
                    Neon's domain rather than ours.

  When we check who is signed in we ask BOTH and take whichever answers with
  a user, so either flow lights up the UI.
*/
(function () {
  'use strict';

  var PROXY = '/api/auth';
  var UPSTREAM =
    'https://ep-bitter-fog-ae1yr8y3.neonauth.c-2.us-east-2.aws.neon.tech/neondb/auth';

  var TOKEN_KEY = 'mf_auth_token';
  var PENDING_KEY = 'mf_auth_pending';

  var state = { user: null, busy: false, mode: 'signin', checked: false };

  // ---------------------------------------------------------------- helpers

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
  }
  function setToken(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* private mode — ignore */ }
  }
  function flag(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* ignore */ }
    return null;
  }

  // One request to one base. Never throws for "no session" — only real errors.
  function request(base, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var saved = token();
    if (saved) headers.Authorization = 'Bearer ' + saved;

    return fetch(base + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      // Better Auth hands back a session token here when cookies are unavailable.
      var issued = res.headers.get('set-auth-token');
      if (issued) setToken(issued);

      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { /* not json */ }

        if (!res.ok) {
          var msg = (data && (data.message || data.error)) ||
                    ('Request failed (' + res.status + ')');
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }

        if (data && data.token) setToken(data.token);
        return data;
      });
    });
  }

  function quiet(promise) {
    return promise.catch(function () { return null; });
  }

  // Ask both the proxy and Neon directly; first one with a user wins.
  function loadSession() {
    return Promise.all([
      quiet(request(PROXY, '/get-session')),
      quiet(request(UPSTREAM, '/get-session'))
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

  // ------------------------------------------------------------------- view

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
      '.mf-auth-alt{text-align:center;font-size:0.78rem;color:var(--ink-light);padding:4px 0 2px;}' +
      '.mf-auth-alt a{color:var(--accent);font-weight:600;text-decoration:none;cursor:pointer;}' +
      '.mf-auth-msg{font-size:0.74rem;line-height:1.45;margin-top:6px;padding:0 2px;color:var(--ink-light);}' +
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

  function escape(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(note, noteKind) {
    var el = section();
    if (!el) return;

    // ---- signed in
    if (state.user) {
      var name = state.user.name || state.user.email || 'Signed in';
      var initial = (name.trim()[0] || '?').toUpperCase();

      el.innerHTML =
        '<div class="settings-label">Account</div>' +
        '<div class="mf-auth-card">' +
          '<div class="mf-auth-dot">' + escape(initial) + '</div>' +
          '<div>' +
            '<div class="mf-auth-who">' + escape(name) + '</div>' +
            '<div class="mf-auth-sub">' + escape(state.user.email || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="mf-auth-btn ghost" id="mf-signout" style="margin-top:10px;">Sign out</button>' +
        '<div class="mf-auth-msg ok" id="mf-auth-msg">\u2713 Signed in. This device is linked to your account.</div>';

      document.getElementById('mf-signout').addEventListener('click', signOut);
      if (note) message(note, noteKind || 'ok');
      return;
    }

    // ---- not signed in
    var signingUp = state.mode === 'signup';

    el.innerHTML =
      '<div class="settings-label">Account</div>' +
      (signingUp
        ? '<input class="mf-auth-field" id="mf-name" type="text" placeholder="Your name" autocomplete="name">'
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
          : 'New here? <a id="mf-toggle">Create an account</a>') +
      '</div>' +
      '<button class="mf-auth-btn ghost" id="mf-google">Continue with Google</button>' +
      '<div class="mf-auth-msg" id="mf-auth-msg">' +
        (state.checked ? '' : 'Checking your account\u2026') +
      '</div>';

    document.getElementById('mf-submit').addEventListener('click', submit);
    document.getElementById('mf-google').addEventListener('click', google);
    document.getElementById('mf-toggle').addEventListener('click', function () {
      state.mode = signingUp ? 'signin' : 'signup';
      render();
    });

    ['mf-email', 'mf-pass', 'mf-name'].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submit();
      });
    });

    if (note) message(note, noteKind || 'err');
  }

  // ----------------------------------------------------------------- actions

  function busy(on, label) {
    state.busy = on;
    var btn = document.getElementById('mf-submit');
    var g = document.getElementById('mf-google');
    if (btn) btn.disabled = on;
    if (g) g.disabled = on;
    if (on && label) message(label);
  }

  function submit() {
    if (state.busy) return;

    var emailEl = document.getElementById('mf-email');
    var passEl = document.getElementById('mf-pass');
    var nameEl = document.getElementById('mf-name');
    if (!emailEl || !passEl) return;

    var email = (emailEl.value || '').trim();
    var password = passEl.value || '';
    var signingUp = state.mode === 'signup';

    if (!email || !password) {
      message('Enter your email and password.', 'err');
      return;
    }
    if (signingUp && password.length < 8) {
      message('Use at least 8 characters for your password.', 'err');
      return;
    }

    busy(true, signingUp ? 'Creating your account\u2026' : 'Signing you in\u2026');

    var path = signingUp ? '/sign-up/email' : '/sign-in/email';
    var body = signingUp
      ? {
          name: (nameEl && nameEl.value.trim()) || email.split('@')[0],
          email: email,
          password: password
        }
      : { email: email, password: password };

    // Through the proxy, so the session cookie is first-party and sticks.
    request(PROXY, path, body)
      .then(function (data) {
        // Show the signed-in state straight from the response — no waiting.
        if (data && data.user) {
          state.user = data.user;
          state.checked = true;
          busy(false);
          render();
          loadSession().then(function () { render(); });
          return;
        }
        return loadSession().then(function (user) {
          busy(false);
          if (user) render();
          else render('Signed in, but no session came back. Reload the page.', 'err');
        });
      })
      .catch(function (err) {
        busy(false);
        var msg = err.message || 'Something went wrong. Try again.';
        if (/credential|password|invalid/i.test(msg) && !signingUp) {
          msg = 'Wrong email or password. If you signed up with Google, use the Google button.';
        }
        if (/exist/i.test(msg) && signingUp) {
          msg = 'That email already has an account. Try signing in instead.';
        }
        message(msg, 'err');
      });
  }

  function google() {
    if (state.busy) return;
    busy(true, 'Opening Google\u2026');
    flag(PENDING_KEY, 'google');

    // Direct to Neon: the Google redirect has to land back on their domain.
    request(UPSTREAM, '/sign-in/social', {
      provider: 'google',
      callbackURL: window.location.origin + window.location.pathname
    })
      .then(function (data) {
        if (data && data.url) {
          window.location.href = data.url;
          return;
        }
        busy(false);
        flag(PENDING_KEY, null);
        message('Could not start Google sign-in.', 'err');
      })
      .catch(function (err) {
        busy(false);
        flag(PENDING_KEY, null);
        message(err.message || 'Could not start Google sign-in.', 'err');
      });
  }

  function signOut() {
    setToken(null);
    flag(PENDING_KEY, null);
    Promise.all([
      quiet(request(PROXY, '/sign-out', {})),
      quiet(request(UPSTREAM, '/sign-out', {}))
    ]).then(function () {
      state.user = null;
      state.mode = 'signin';
      render('Signed out.', 'ok');
    });
  }

  // -------------------------------------------------------------------- boot

  function start() {
    styles();
    render();

    var cameBackFromGoogle = flag(PENDING_KEY) === 'google';

    loadSession().then(function (user) {
      if (user) {
        flag(PENDING_KEY, null);
        render();
        return;
      }
      if (cameBackFromGoogle) {
        flag(PENDING_KEY, null);
        render(
          'Google signed you in, but this browser blocked the session. ' +
          'Create an email + password login here \u2014 that one sticks on iPhone.',
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

  // Available to other scripts (per-user sync later).
  window.MindForgeAuth = {
    user: function () { return state.user; },
    refresh: function () { return loadSession().then(function (u) { render(); return u; }); }
  };
})();
