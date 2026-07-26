(function () {
  'use strict';

  var KEY = 'mf_notify_v2';
  var LAST_KEY = 'mf_notify_last';
  var timer = null;
  var swReg = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load();
  if (!state.time) state.time = '09:00';
  if (typeof state.on !== 'boolean') {
    var legacy = false;
    try { legacy = !!(JSON.parse(localStorage.getItem('mf3') || '{}') || {}).notify; } catch (e) {}
    state.on = legacy;
  }

  function supported() { return 'Notification' in window; }
  function granted() { return supported() && Notification.permission === 'granted'; }
  function todayKey() { var n = new Date(); return n.getFullYear() + '-' + n.getMonth() + '-' + n.getDate(); }
  function todaysQuote() {
    if (typeof Q !== 'undefined' && Q.length) {
      var d = new Date(), s = new Date(d.getFullYear(), 0, 0), day = Math.floor((d - s) / 864e5);
      return Q[day % Q.length];
    }
    return { q: 'Discipline is the bridge between goals and accomplishment.', a: 'MindForge' };
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('sw.js').then(function (reg) {
      return navigator.serviceWorker.ready.then(function () { swReg = reg; return reg; });
    }).catch(function () { return null; });
  }

  function fire() {
    if (!granted()) return false;
    var q = todaysQuote();
    var opts = { body: '“' + q.q + '”\n— ' + q.a, tag: 'mindforge-daily', renotify: true };
    try {
      if (swReg && swReg.showNotification) { swReg.showNotification('MindForge · Today', opts); return true; }
      var n = new Notification('MindForge · Today', opts);
      n.onclick = function () { window.focus(); n.close(); };
      return true;
    } catch (e) {
      if (swReg && swReg.showNotification) { try { swReg.showNotification('MindForge · Today', opts); return true; } catch (e2) {} }
      return false;
    }
  }

  function targetDate(base) {
    var parts = state.time.split(':');
    var t = new Date(base.getTime());
    t.setHours(+parts[0] || 0, +parts[1] || 0, 0, 0);
    return t;
  }
  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

  function schedule() {
    clearTimer();
    if (typeof window.notifTimer !== 'undefined' && window.notifTimer) { try { clearTimeout(window.notifTimer); } catch (e) {} }
    if (!state.on || !granted()) return;
    var now = new Date();
    var todayTarget = targetDate(now);
    if (now >= todayTarget && localStorage.getItem(LAST_KEY) !== todayKey()) {
      if (fire()) localStorage.setItem(LAST_KEY, todayKey());
    }
    var next = targetDate(now);
    if (next <= now) next = new Date(next.getTime() + 864e5);
    timer = setTimeout(function () {
      if (fire()) localStorage.setItem(LAST_KEY, todayKey());
      schedule();
    }, next.getTime() - now.getTime());
  }

  function updateUI() {
    var toggle = document.getElementById('notif-toggle');
    var status = document.getElementById('notif-status');
    var test = document.getElementById('notif-test');
    var timeRow = document.getElementById('notif-time-row');
    var timeInput = document.getElementById('notif-time');
    if (!toggle || !status) return;
    if (!supported()) {
      toggle.classList.remove('on'); toggle.style.opacity = '0.4'; toggle.style.pointerEvents = 'none';
      status.className = 'notif-status err'; status.textContent = 'This browser does not support notifications.';
      if (test) test.style.display = 'none'; if (timeRow) timeRow.style.display = 'none';
      return;
    }
    var on = state.on && granted();
    toggle.classList.toggle('on', on);
    if (test) test.style.display = on ? 'block' : 'none';
    if (timeRow) timeRow.style.display = on ? 'flex' : 'none';
    if (timeInput) timeInput.value = state.time;
    if (Notification.permission === 'denied') {
      status.className = 'notif-status err';
      status.textContent = 'Notifications are blocked in your browser settings. Enable them for this site to turn this on.';
    } else if (on) {
      status.className = 'notif-status ok';
      status.textContent = 'On. You will get one quote at ' + state.time + ' each day while MindForge is open or pinned in a tab.';
    } else {
      status.className = 'notif-status';
      status.textContent = 'Tap to allow a daily quote reminder. Delivery works while the app stays open or pinned.';
    }
  }

  function turnOn() {
    if (!supported()) { updateUI(); return; }
    if (granted()) { state.on = true; save(); schedule(); updateUI(); return; }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function (p) {
        if (p === 'granted') { state.on = true; save(); schedule(); }
        updateUI();
      });
    } else { updateUI(); }
  }

  function stripListeners(el) {
    if (!el) return el;
    var clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }

  function buildUI() {
    var toggle = stripListeners(document.getElementById('notif-toggle'));
    var test = stripListeners(document.getElementById('notif-test'));
    var status = document.getElementById('notif-status');
    if (!toggle || !status) return;

    if (!document.getElementById('notif-time-row') && status.parentNode) {
      var row = document.createElement('div');
      row.id = 'notif-time-row';
      row.className = 'notif-time-row';
      row.innerHTML = '<label for="notif-time">Remind me at</label><input type="time" id="notif-time" value="' + state.time + '">';
      status.parentNode.insertBefore(row, status);
      row.querySelector('#notif-time').addEventListener('change', function () {
        state.time = this.value || '09:00'; save();
        try { localStorage.removeItem(LAST_KEY); } catch (e) {}
        if (state.on) schedule();
        updateUI();
      });
    }

    toggle.addEventListener('click', function () {
      if (!supported()) { updateUI(); return; }
      if (state.on) { state.on = false; save(); clearTimer(); updateUI(); }
      else { turnOn(); }
    });
    if (test) test.addEventListener('click', function () {
      if (granted()) { fire(); }
      else if (supported() && Notification.permission !== 'denied') {
        Notification.requestPermission().then(function (p) { if (p === 'granted') fire(); updateUI(); });
      } else { updateUI(); }
    });
  }

  function setup() {
    buildUI();
    updateUI();
    registerSW().then(function () { updateUI(); schedule(); });
    schedule();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
