/*
  MindForge — authentication (Neon Managed Better Auth)
  ----------------------------------------------------
  Adds an Account section at the top of the Settings panel:
    - email + password sign in / create account
    - "Continue with Google"
    - signed-in state with sign out

  How it works: the browser talks straight to Neon's hosted auth service.
  The URL below is a PUBLIC client endpoint (the same value Neon's docs put
  in a VITE_ env var) — it is not a password and is safe in front-end code.
  Neon sets an HttpOnly session cookie, so the session survives reloads and
  we never touch a token by hand.
*/
(function () {
  'use strict';

  var AUTH_URL = 'https://ep-bitter-fog-ae1yr8y3.neonauth.c-2.us-east-2.aws.neon.tech/neondb/auth';

  var state = { user: null, busy: false, mode: 'signin' };

  // ---------------------------------------------------------------- network

  function call(path, body) {
    return fetch(AUTH_URL + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'include', // session cookie is cross-site
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { /* not json */ }
        if (!res.ok) {
          var msg = (data && (data.message || data.error)) || ('Request failed (' + res.status + ')');
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  function loadSession() {
    return call('/get-session')
      .then(function (data) {
        state.user = (data && data.user) || null;
        return state.user;
      })
      .catch(function () {
        state.user = null;
        return null;
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
      '.mf-auth-msg{font-size:0.74rem;line-height:1.4;margin-top:6px;padding:0 2px;color:var(--ink-light);}' +
      '.mf-auth-msg.err{color:oklch(65% 0.16 25);}' +
      '.mf-auth-msg.ok{color:var(--accent);}' +
      '.mf-auth-who{font-size:0.9rem;font-weight:600;margin-bottom:2px;}' +
      '.mf-auth-sub{font-size:0.74rem;color:var(--ink-light);line-height:1.4;}';
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

    // Sit just under the "Settings" title, above Daily Notification.
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

  function render() {
    var el = section();
    if (!el) return;

    if (state.user) {
      el.innerHTML =
        '<div class="settings-label">Account</div>' +
        '<div class="notif-row">' +
          '<div class="notif-info">' +
            '<div class="mf-auth-who">' + escape(state.user.name || 'Signed in') + '</div>' +
            '<div class="mf-auth-sub">' + escape(state.user.email || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="mf-auth-btn ghost" id="mf-signout" style="margin-top:10px;">Sign out</button>' +
        '<div class="mf-auth-msg" id="mf-auth-msg">Your account is ready. Settings and saved quotes can sync across devices from here.</div>';

      document.getElementById('mf-signout').addEventListener('click', signOut);
      return;
    }

    var signingUp = state.mode === 'signup';

    el.innerHTML =
      '<div class="settings-label">Account</div>' +
      (signingUp
        ? '<input class="mf-auth-field" id="mf-name" type="text" placeholder="Your name" autocomplete="name">'
        : '') +
      '<input class="mf-auth-field" id="mf-email" type="email" placeholder="Email" autocomplete="email">' +
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
      '<div class="mf-auth-msg" id="mf-auth-msg"></div>';

    document.getElementById('mf-submit').addEventListener('click', submit);
    document.getElementById('mf-google').addEventListener('click', google);
    document.getElementById('mf-toggle').addEventListener('click', function () {
      state.mode = signingUp ? 'signin' : 'signup';
      render();
    });

    // Enter key submits.
    ['mf-email', 'mf-pass', 'mf-name'].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submit();
      });
    });
  }

  function escape(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ----------------------------------------------------------------- actions

  function setBusy(on, label) {
    state.busy = on;
    var btn = document.getElementById('mf-submit');
    if (btn) btn.disabled = on;
    if (on && label) message(label);
  }

  function submit() {
    if (state.busy) return;

    var email = (document.getElementById('mf-email') || {}).value || '';
    var password = (document.getElementById('mf-pass') || {}).value || '';
    var nameEl = document.getElementById('mf-name');
    var signingUp = state.mode === 'signup';

    email = email.trim();

    if (!email || !password) {
      message('Enter your email and password.', 'err');
      return;
    }
    if (signingUp && password.length < 8) {
      message('Use at least 8 characters for your password.', 'err');
      return;
    }

    setBusy(true, signingUp ? 'Creating your account\u2026' : 'Signing you in\u2026');

    var path = signingUp ? '/sign-up/email' : '/sign-in/email';
    var body = signingUp
      ? { name: ((nameEl && nameEl.value.trim()) || email.split('@')[0]), email: email, password: password }
      : { email: email, password: password };

    call(path, body)
      .then(function () { return loadSession(); })
      .then(function () {
        setBusy(false);
        render();
        if (!state.user) message('Signed in, but no session came back. Try reloading.', 'err');
      })
      .catch(function (err) {
        setBusy(false);
        message(err.message || 'Something went wrong. Try again.', 'err');
      });
  }

  function google() {
    message('Opening Google\u2026');
    call('/sign-in/social', {
      provider: 'google',
      callbackURL: window.location.origin + window.location.pathname
    })
      .then(function (data) {
        if (data && data.url) window.location.href = data.url;
        else message('Could not start Google sign-in.', 'err');
      })
      .catch(function (err) {
        message(err.message || 'Could not start Google sign-in.', 'err');
      });
  }

  function signOut() {
    call('/sign-out', {})
      .catch(function () { /* clear locally regardless */ })
      .then(function () {
        state.user = null;
        state.mode = 'signin';
        render();
      });
  }

  // -------------------------------------------------------------------- boot

  function start() {
    styles();
    render();               // show the form straight away
    loadSession().then(render); // then fill in signed-in state if there is one
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Let other scripts (e.g. future per-user sync) see who is signed in.
  window.MindForgeAuth = {
    user: function () { return state.user; },
    refresh: function () { return loadSession().then(function (u) { render(); return u; }); }
  };
})();
