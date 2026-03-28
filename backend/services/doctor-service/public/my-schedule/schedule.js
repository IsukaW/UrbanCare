(function () {
  'use strict';

  var SLOT_STARTS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  var STORAGE_KEY = 'uc_doc_sched_token';
  var STORAGE_USER = 'uc_doc_sched_user';

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function endFromStart(start) {
    var p = start.split(':').map(Number);
    var h = p[0] + 2;
    return pad2(h) + ':' + pad2(p[1]);
  }

  /** Monday 00:00:00 of the calendar week containing `d` (week Mon–Sun). */
  function mondayOfWeekContaining(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = x.getDay();
    var offset = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + offset);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  /** Add days (can be negative). */
  function addDays(date, n) {
    var x = new Date(date.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function slotKey(dayOfWeek, startTime, endTime) {
    return dayOfWeek + '|' + startTime + '|' + endTime;
  }

  function parseSchedule(arr) {
    var map = Object.create(null);
    (arr || []).forEach(function (s) {
      map[slotKey(s.dayOfWeek, s.startTime, s.endTime)] = true;
    });
    return map;
  }

  function scheduleFromMap(map) {
    return Object.keys(map).map(function (k) {
      var p = k.split('|');
      return {
        dayOfWeek: Number(p[0]),
        startTime: p[1],
        endTime: p[2]
      };
    });
  }

  var token = null;
  var user = null;
  var weekAnchor = mondayOfWeekContaining(new Date());
  var scheduleMap = Object.create(null);
  var weekTimer = null;

  var elLogin = document.getElementById('login-panel');
  var elCal = document.getElementById('calendar-shell');
  var elWeekRange = document.getElementById('week-range');
  var elGrid = document.getElementById('cal-grid');
  var elErr = document.getElementById('form-err');
  var elLogout = document.getElementById('btn-logout');

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(path, Object.assign({}, opts, { headers: headers })).then(function (res) {
      return res.text().then(function (text) {
        var data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = null;
        }
        if (!res.ok) {
          var msg = (data && data.message) || res.statusText || 'Request failed';
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  function saveSession() {
    try {
      if (token) sessionStorage.setItem(STORAGE_KEY, token);
      else sessionStorage.removeItem(STORAGE_KEY);
      if (user) sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
      else sessionStorage.removeItem(STORAGE_USER);
    } catch (e) {}
  }

  function loadSession() {
    try {
      token = sessionStorage.getItem(STORAGE_KEY);
      var u = sessionStorage.getItem(STORAGE_USER);
      user = u ? JSON.parse(u) : null;
    } catch (e) {
      token = null;
      user = null;
    }
  }

  function clearSession() {
    token = null;
    user = null;
    saveSession();
    elLogin.classList.remove('hidden');
    elCal.classList.add('hidden');
    if (weekTimer) clearTimeout(weekTimer);
    weekTimer = null;
  }

  function scheduleNextMondayRollover() {
    if (weekTimer) clearTimeout(weekTimer);
    var now = new Date();
    var thisMon = mondayOfWeekContaining(now);
    var nextMon = addDays(thisMon, 7);
    var ms = nextMon.getTime() - now.getTime();
    if (ms < 1e3) ms = 1e3;
    weekTimer = setTimeout(function () {
      var cur = mondayOfWeekContaining(new Date());
      if (cur.getTime() !== weekAnchor.getTime()) {
        weekAnchor = cur;
        renderCalendar();
      }
      scheduleNextMondayRollover();
    }, ms);
  }

  function startHeartbeat() {
    setInterval(function () {
      var cur = mondayOfWeekContaining(new Date());
      if (cur.getTime() !== weekAnchor.getTime()) {
        weekAnchor = cur;
        renderCalendar();
      }
    }, 30000);
  }

  function fetchDoctorAndRender() {
    var id = user && (user._id || user.id);
    if (!id) throw new Error('No doctor id');
    return api('/doctors/' + id).then(function (doc) {
      scheduleMap = parseSchedule(doc.schedule);
      renderCalendar();
    });
  }

  function persistSchedule() {
    var id = user && (user._id || user.id);
    var body = { schedule: scheduleFromMap(scheduleMap) };
    return api('/doctors/' + id + '/schedule', { method: 'PATCH', body: JSON.stringify(body) }).then(function () {
      return fetchDoctorAndRender();
    });
  }

  function renderCalendar() {
    var mon = weekAnchor;
    var sun = addDays(mon, 6);
    elWeekRange.textContent =
      mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' – ' +
      sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    elGrid.innerHTML = '';

    var corner = document.createElement('div');
    corner.className = 'corner';
    elGrid.appendChild(corner);

    for (var c = 0; c < 7; c++) {
      var dayDate = addDays(mon, c);
      var h = document.createElement('div');
      h.className = 'dhead';
      var dw = dayDate.toLocaleDateString(undefined, { weekday: 'short' });
      var dn = dayDate.getDate();
      h.innerHTML = '<span>' + dw + '</span><span class="date-num">' + dn + '</span>';
      elGrid.appendChild(h);
    }

    for (var r = 0; r < SLOT_STARTS.length; r++) {
      var start = SLOT_STARTS[r];
      var end = endFromStart(start);
      var tl = document.createElement('div');
      tl.className = 'time-label';
      tl.textContent = start + ' – ' + end;
      elGrid.appendChild(tl);

      for (var c = 0; c < 7; c++) {
        var cellDate = addDays(mon, c);
        var dow = cellDate.getDay();
        var key = slotKey(dow, start, end);
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'slot' + (scheduleMap[key] ? ' available' : '');
        cell.dataset.key = key;
        cell.dataset.dow = String(dow);
        cell.dataset.start = start;
        cell.dataset.end = end;
        cell.setAttribute('aria-pressed', scheduleMap[key] ? 'true' : 'false');
        cell.addEventListener('click', onSlotClick);
        elGrid.appendChild(cell);
      }
    }
  }

  function onSlotClick(ev) {
    var cell = ev.currentTarget;
    var key = cell.dataset.key;
    var isOn = !!scheduleMap[key];
    if (isOn) {
      if (!confirm('Remove availability for this time slot?')) return;
      delete scheduleMap[key];
    } else {
      scheduleMap[key] = true;
    }
    var prev = isOn;
    persistSchedule().catch(function (e) {
      if (prev) scheduleMap[key] = true;
      else delete scheduleMap[key];
      renderCalendar();
      alert(e.message || 'Could not save schedule');
    });
  }

  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    elErr.textContent = '';
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    api('/doctors/login', { method: 'POST', body: JSON.stringify({ email: email, password: password }) })
      .then(function (data) {
        token = data.token;
        user = data.user;
        saveSession();
        elLogin.classList.add('hidden');
        elCal.classList.remove('hidden');
        weekAnchor = mondayOfWeekContaining(new Date());
        return fetchDoctorAndRender();
      })
      .then(function () {
        scheduleNextMondayRollover();
      })
      .catch(function (err) {
        elErr.textContent = err.message || 'Login failed';
      });
  });

  elLogout.addEventListener('click', clearSession);

  loadSession();
  if (token && user) {
    elLogin.classList.add('hidden');
    elCal.classList.remove('hidden');
    weekAnchor = mondayOfWeekContaining(new Date());
    fetchDoctorAndRender()
      .then(function () {
        scheduleNextMondayRollover();
      })
      .catch(function () {
        clearSession();
      });
  }

  startHeartbeat();
})();
