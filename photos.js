/* Room photos by Walls / Floor / Ceiling, saved to this repo under data/photos/<room>/<w|f|c>/ with the date in the file name.
   data/photos/index.json keeps the last photo date per room and part; data/site-progress.json keeps the progress per room
   (set from the photo review or the sliders). Rooms with no photo for 30 days and not at 100% show red. */
(function () {
  var OWNER = 'fadeelhusin', REPO = 'OPE-Story', BR = 'main', K_TOKEN = 'joh_gh_token', DAY = 864e5;
  var PARTS = { w: 'Walls', f: 'Floor', c: 'Ceiling' }, IDX = {}, PROG = {}, ready = false, tmr = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { try { return localStorage.getItem(K_TOKEN) || ''; } catch (x) { return ''; } }
  function hdr() { var h = { 'Accept': 'application/vnd.github+json' }; if (token()) h.Authorization = 'Bearer ' + token(); return h; }
  function safe(k) { return k.replace(/[^A-Za-z0-9._-]/g, '_'); }
  function api(path) { return 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + path; }
  function b64(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o, null, 1)))); }
  function unb64(s) { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/\s/g, ''))))); }
  function msg(p, t) { var e = document.getElementById('ph-msg-' + p); if (e) e.innerHTML = t; }
  function stamp(d) { var q = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate()) + '_' + q(d.getHours()) + q(d.getMinutes()) + q(d.getSeconds()); }
  function label(name) { var m = name.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : name; }

  /* shared files: read through the API (fresh) with a fallback to the published copy */
  function readJson(path) {
    return fetch(api(path) + '?ref=' + BR + '&t=' + Date.now(), { headers: hdr(), cache: 'no-store' })
      .then(function (r) { if (r.status === 404) return { sha: null, data: {} }; if (!r.ok) throw new Error('GitHub ' + r.status); return r.json().then(function (j) { return { sha: j.sha, data: unb64(j.content) || {} }; }); })
      .catch(function () { return fetch(path + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) { return { sha: null, data: d || {}, ro: true }; }).catch(function () { return { sha: null, data: {}, ro: true }; }); });
  }
  function writeJson(path, mutate, note, tries) {
    tries = tries || 0;
    return readJson(path).then(function (cur) {
      if (cur.ro) throw new Error('GitHub not reachable');
      var d = mutate(cur.data || {});
      var body = { message: note, branch: BR, content: b64(d) }; if (cur.sha) body.sha = cur.sha;
      return fetch(api(path), { method: 'PUT', headers: hdr(), body: JSON.stringify(body) }).then(function (r) {
        if ((r.status === 409 || r.status === 422) && tries < 3) return writeJson(path, mutate, note, tries + 1);
        if (!r.ok) throw new Error(r.status === 401 ? 'token rejected' : 'save failed ' + r.status);
        return d;
      });
    });
  }
  function load() {
    Promise.all([readJson('data/photos/index.json'), readJson('data/site-progress.json')]).then(function (a) {
      IDX = a[0].data || {}; PROG = a[1].data || {}; ready = true; repaint();
    });
  }
  function repaint() {
    document.querySelectorAll('.mkdot[data-id]').forEach(function (el) { el.classList.toggle('stale', RoomStatus.stale(el.dataset.id)); });
    var rn = document.querySelector('.rhead .rn'); if (rn) rn.classList.toggle('stale', RoomStatus.stale(rn.textContent.trim()));
    var k = document.querySelector('.rhead .rn') && document.querySelector('.rhead .rn').textContent.trim();
    if (k && PROG[k]) ['w', 'f', 'c'].forEach(function (p) {
      var el = document.querySelector('.rp-prog input[oninput*="\'' + p + '\'"]'), v = PROG[k][p];
      if (el && v != null && document.activeElement !== el && !(window.Cloud && Cloud.prog && Cloud.prog(k))) { el.value = v; el.style.setProperty('--p', v + '%'); var b = document.getElementById('pg-' + p); if (b) b.textContent = v + '%'; }
    });
  }

  function shrink(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        res(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = function () { rej(new Error('not an image')); }; img.src = u;
    });
  }
  function dir(k, p) { return 'data/photos/' + safe(k) + '/' + p; }
  function list(k, p) {
    var box = document.getElementById('ph-list-' + p); if (!box) return;
    fetch(api(dir(k, p)) + '?ref=' + BR + '&t=' + Date.now(), { headers: hdr(), cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return []; if (!r.ok) throw new Error('GitHub ' + r.status); return r.json();
    }).then(function (items) {
      items = (items || []).filter(function (x) { return /\.jpe?g$/i.test(x.name); }).sort(function (a, b) { return a.name < b.name ? 1 : -1; });
      box.innerHTML = items.length ? items.map(function (x) {
        return '<div class="rp-ph-it"><a href="' + esc(x.download_url) + '" target="_blank" rel="noopener"><img src="' + esc(x.download_url) + '" alt="' + PARTS[p] + ' ' + esc(label(x.name)) + '" loading="lazy"></a>' +
          '<div class="d">' + esc(label(x.name)) + '</div>' + (token() ? '<button onclick="RoomStatus.del(this,\'' + esc(k) + '\',\'' + p + '\',\'' + esc(x.path) + '\',\'' + x.sha + '\')">Delete</button>' : '') + '</div>';
      }).join('') : '<div class="small">No photos yet.</div>';
    }).catch(function (e) { box.innerHTML = '<div class="small">Photos not loaded (' + esc(e.message) + ').</div>'; });
  }
  function askToken(k, p) {
    msg(p, '<div class="ph-tok">GitHub token (kept on this device only): <input id="ph-tok-' + p + '" type="password" autocomplete="off"> <button class="btn ghost" id="ph-tok-save-' + p + '">Save</button></div>');
    document.getElementById('ph-tok-save-' + p).onclick = function () {
      var v = (document.getElementById('ph-tok-' + p).value || '').trim(); if (!v) return;
      try { localStorage.setItem(K_TOKEN, v); } catch (x) {}
      msg(p, 'Saved. Add the photos again.'); list(k, p);
    };
  }
  function upload(k, p, files) {
    if (!token()) { askToken(k, p); return; }
    files = Array.prototype.slice.call(files || []); if (!files.length) return;
    var done = 0, now = new Date(), last = '';
    msg(p, 'Uploading 0/' + files.length + '…');
    files.reduce(function (pr, f, i) {
      return pr.then(function () {
        return shrink(f).then(function (data) {
          var d = new Date(f.lastModified || now.getTime()); if (d > now || now - d > 365 * DAY) d = now;
          var name = stamp(d) + (i ? '_' + i : '') + '.jpg'; if (name > last) last = name;
          return fetch(api(dir(k, p) + '/' + name), { method: 'PUT', headers: hdr(), body: JSON.stringify({ message: 'Room ' + k + ' ' + PARTS[p] + ' photo ' + name, branch: BR, content: data }) })
            .then(function (r) { if (!r.ok) throw new Error(r.status === 401 ? 'token rejected' : 'upload failed ' + r.status); done++; msg(p, 'Uploading ' + done + '/' + files.length + '…'); });
        });
      });
    }, Promise.resolve()).then(function () {
      var day = last.slice(0, 10);
      return writeJson('data/photos/index.json', function (d) { d[k] = d[k] || {}; if (!d[k][p] || d[k][p] < day) d[k][p] = day; return d; }, 'Photo index ' + k)
        .then(function (d) { IDX = d; repaint(); });
    }).then(function () { msg(p, 'Saved ' + done + ' photo(s).'); list(k, p); })
      .catch(function (e) { msg(p, 'Stopped: ' + esc(e.message)); if (/token/.test(e.message)) askToken(k, p); list(k, p); });
  }

  window.RoomStatus = {
    PARTS: PARTS,
    block: function (k, p) {
      return '<div class="rp-ph" id="rp-photos-' + p + '"><div class="rp-ph-h">Site photos – ' + PARTS[p] + (IDX[k] && IDX[k][p] ? ' <span class="small">last ' + esc(IDX[k][p].split('-').reverse().join('/')) + '</span>' : '') + '</div>' +
        '<div class="rp-ph-btns"><label class="btn ghost">📷 Camera<input id="ph-cam-' + p + '" type="file" accept="image/*" capture="environment" hidden></label>' +
        '<label class="btn ghost">🖼 Gallery<input id="ph-gal-' + p + '" type="file" accept="image/*" multiple hidden></label></div>' +
        '<div id="ph-msg-' + p + '" class="small"></div><div id="ph-list-' + p + '" class="rp-ph-list"></div></div>';
    },
    mount: function (k) {
      ['w', 'f', 'c'].forEach(function (p) {
        ['ph-cam-' + p, 'ph-gal-' + p].forEach(function (id) { var fi = document.getElementById(id); if (fi) fi.addEventListener('change', function () { var fl = fi.files; upload(k, p, fl); fi.value = ''; }); });
        if (document.getElementById('ph-list-' + p)) list(k, p);
      });
      repaint();
    },
    del: function (btn, k, p, path, sha) {
      if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'Confirm'; setTimeout(function () { btn.dataset.sure = ''; btn.textContent = 'Delete'; }, 3000); return; }
      fetch(api(path), { method: 'DELETE', headers: hdr(), body: JSON.stringify({ message: 'Remove room photo ' + path.split('/').pop(), sha: sha, branch: BR }) })
        .then(function (r) { if (!r.ok) throw new Error('delete failed ' + r.status); msg(p, 'Deleted.'); list(k, p); })
        .catch(function (e) { msg(p, esc(e.message)); });
    },
    prog: function (k) { return PROG[k]; },
    saveProg: function (k, part, v) {
      PROG[k] = PROG[k] || {}; PROG[k][part] = v;
      if (!token()) return;
      clearTimeout(tmr);
      tmr = setTimeout(function () {
        var cur = PROG[k];
        writeJson('data/site-progress.json', function (d) { d[k] = d[k] || {}; ['w', 'f', 'c'].forEach(function (p) { if (cur[p] != null) d[k][p] = cur[p]; }); d[k].t = new Date().toISOString().slice(0, 10); d[k].by = 'site'; return d; }, 'Site progress ' + k).catch(function () {});
      }, 1200);
    },
    lastPhoto: function (k) { var e = IDX[k] || {}; return [e.w, e.f, e.c].filter(Boolean).sort().pop() || ''; },
    stale: function (k) {
      if (!ready || !window.REGISTER_DATA || !REGISTER_DATA[k]) return false;
      var p = PROG[k] || {}; if ((p.w || 0) >= 100 && (p.f || 0) >= 100 && (p.c || 0) >= 100) return false;
      var l = RoomStatus.lastPhoto(k); return !l || (Date.now() - new Date(l + 'T00:00:00').getTime()) > 30 * DAY;
    },
    pinClass: function (k) { return RoomStatus.stale(k) ? 'stale' : ''; },
    refresh: load
  };
  window.Photos = { mount: RoomStatus.mount };
  load();
})();
