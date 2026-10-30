/* Room photos: dated status photos per room, saved to this repo under data/photos/<room>/ (needs the GitHub token set once on this device) */
(function () {
  var OWNER = 'fadeelhusin', REPO = 'OPE-Story', BR = 'main', K_TOKEN = 'joh_gh_token';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { try { return localStorage.getItem(K_TOKEN) || ''; } catch (x) { return ''; } }
  function hdr() { var h = { 'Accept': 'application/vnd.github+json' }; if (token()) h.Authorization = 'Bearer ' + token(); return h; }
  function dir(k) { return 'data/photos/' + k.replace(/[^A-Za-z0-9._-]/g, '_'); }
  function api(path) { return 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + path; }
  function msg(t) { var e = document.getElementById('ph-msg'); if (e) e.innerHTML = t; }
  function stamp(d) { var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }
  function label(name) { var m = name.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : name; }
  function shrink(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        res(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = function () { rej(new Error('Not an image')); }; img.src = u;
    });
  }
  function list(k) {
    var box = document.getElementById('ph-list'); if (!box) return;
    fetch(api(dir(k)) + '?ref=' + BR + '&t=' + Date.now(), { headers: hdr(), cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return [];
      if (!r.ok) throw new Error('GitHub ' + r.status); return r.json();
    }).then(function (items) {
      items = (items || []).filter(function (x) { return /\.jpe?g$/i.test(x.name); }).sort(function (a, b) { return a.name < b.name ? 1 : -1; });
      box.innerHTML = items.length ? items.map(function (x) {
        return '<div class="rp-ph-it"><a href="' + esc(x.download_url) + '" target="_blank" rel="noopener"><img src="' + esc(x.download_url) + '" alt="Room photo ' + esc(label(x.name)) + '" loading="lazy"></a>' +
          '<div class="d">' + esc(label(x.name)) + '</div>' + (token() ? '<button onclick="Photos.del(\'' + esc(k) + '\',\'' + esc(x.path) + '\',\'' + x.sha + '\')">Delete</button>' : '') + '</div>';
      }).join('') : '<div class="small">No photos yet.</div>';
    }).catch(function (e) { box.innerHTML = '<div class="small">Photos not loaded (' + esc(e.message) + ').</div>'; });
  }
  function askToken(k) {
    msg('<div class="ph-tok">GitHub token for saving photos (stored on this device only):<input id="ph-tok" type="password" autocomplete="off"><button class="btn ghost" id="ph-tok-save">Save</button></div>');
    document.getElementById('ph-tok-save').onclick = function () {
      var v = (document.getElementById('ph-tok').value || '').trim(); if (!v) return;
      try { localStorage.setItem(K_TOKEN, v); } catch (x) {}
      msg('Saved. Add the photos again.'); list(k);
    };
  }
  function upload(k, files) {
    if (!token()) { askToken(k); return; }
    files = Array.prototype.slice.call(files || []); if (!files.length) return;
    var done = 0, base = new Date();
    msg('Uploading 0/' + files.length + '…');
    files.reduce(function (p, f, i) {
      return p.then(function () {
        return shrink(f).then(function (b64) {
          var d = new Date(f.lastModified || base.getTime()); if (Math.abs(d - base) > 864e5 * 365) d = base;
          var name = stamp(d) + (i ? '_' + i : '') + '.jpg';
          return fetch(api(dir(k) + '/' + name), { method: 'PUT', headers: hdr(), body: JSON.stringify({ message: 'Room ' + k + ' photo ' + name, branch: BR, content: b64 }) })
            .then(function (r) { if (!r.ok) throw new Error(r.status === 401 ? 'token rejected' : 'upload failed ' + r.status); done++; msg('Uploading ' + done + '/' + files.length + '…'); });
        });
      });
    }, Promise.resolve()).then(function () { msg('Saved ' + done + ' photo(s).'); list(k); })
      .catch(function (e) { msg('Stopped: ' + esc(e.message)); if (/token/.test(e.message)) askToken(k); list(k); });
  }
  window.Photos = {
    mount: function (k) {
      ['ph-cam', 'ph-gal'].forEach(function (id) { var fi = document.getElementById(id); if (fi) fi.addEventListener('change', function () { var f = fi.files; upload(k, f); fi.value = ''; }); });
      list(k);
    },
    del: function (k, path, sha) {
      var b = event && event.target; if (b && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirm'; setTimeout(function () { if (b) { b.dataset.sure = ''; b.textContent = 'Delete'; } }, 3000); return; }
      fetch(api(path), { method: 'DELETE', headers: hdr(), body: JSON.stringify({ message: 'Remove room photo ' + path.split('/').pop(), sha: sha, branch: BR }) })
        .then(function (r) { if (!r.ok) throw new Error('delete failed ' + r.status); msg('Deleted.'); list(k); })
        .catch(function (e) { msg(esc(e.message)); });
    }
  };
})();
