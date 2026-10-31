/* Search across rooms and room information: room no./name, finish codes and descriptions, shop drawings, MTS, doors, items. */
(function () {
  var IDX = null, LAST = { ids: [] }, PAL = ['#F2C200', '#00A6D6', '#E0409A', '#33B249', '#8D6E63', '#7A5CFF', '#D7263D', '#1FB5A8'];
  function sets() { try { return JSON.parse(sessionStorage.getItem('gs_sets') || '[]'); } catch (x) { return []; } }
  function saveSets(a) { try { sessionStorage.setItem('gs_sets', JSON.stringify(a)); } catch (x) {} MAP = null; chips(); if (window.Viewer && Viewer.draw) Viewer.draw(); }
  var MAP = null;
  function map() { if (MAP) return MAP; MAP = {}; sets().forEach(function (st) { st.ids.forEach(function (id) { MAP[id] = st.c; }); }); return MAP; }
  function chips() {
    var e = document.getElementById('gs-chips'); if (!e) return; var a = sets();
    e.innerHTML = a.map(function (st, i) { return '<button class="gs-chip" style="--c:' + st.c + '" onclick="Search.drop(' + i + ')" title="Tap to remove"><i></i>' + esc(st.label) + ' · ' + st.ids.length + ' ✕</button>'; }).join('');
    e.hidden = !a.length; document.body.classList.toggle('hl-on', a.length > 0);
  }
  function labelOf(q, f) { var p = []; if (q) p.push(q); if (f.lv) p.push('L' + f.lv); if (f.pt) p.push('P00' + f.pt); if (f.ty) p.push(f.ty); return p.join(' ') || 'All'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[‐-―]/g, '-'); }
  function build() {
    var R = window.REGISTER_DATA || {}, L = window.FINISH_LIB || {}, rows = [];
    Object.keys(window.ROOMS || {}).forEach(function (k) {
      var d = ROOMS[k] || {}, r = R[k];
      var name = (r && r.ifc.n) || d.name || '';
      rows.push({ k: k, kind: 'Room', t: k + ' – ' + name, s: norm(k + ' ' + name + ' level ' + (d.baseLevel || '') + ' ' + (d.function || '')) });
      if (!r) return;
      rows.push({ k: k, kind: 'Sub-contractor', t: r.sc, s: norm(r.sc) });
      [['w', 'Walls'], ['f', 'Floor'], ['c', 'Ceiling']].forEach(function (p) {
        (r.fx[p[0]] || []).forEach(function (id) {
          var f = L[id]; if (!f) return;
          rows.push({ k: k, kind: p[1], t: (f.code ? f.code + ' – ' : '') + f.t, s: norm(f.code + ' ' + f.t + ' ' + (f.m || []).map(function (m) { return m.c + ' ' + m.d; }).join(' ') + ' ' + (f.l || []).join(' ')) });
        });
        if (r.ifc[p[0]]) rows.push({ k: k, kind: p[1] + ' source', t: r.ifc[p[0]], s: norm(r.ifc[p[0]]) });
      });
      (r.sd || []).forEach(function (x) { rows.push({ k: k, kind: 'Shop drawing', t: x.no + (x.c ? ' (' + x.c + ')' : '') + ' – ' + x.t, s: norm(x.no + ' ' + x.no.replace(/^\w+-/, '') + ' ' + x.t + ' code ' + x.c), u: x.u }); });
      (r.dr || []).forEach(function (x) { rows.push({ k: k, kind: 'Door', t: x.tag + ' – ' + [x.type, x.fire, x.ac, x.size].filter(Boolean).join(' · '), s: norm(x.tag + ' ' + x.type + ' ' + x.fire + ' ' + x.ac + ' ' + x.size + ' ' + x.fin + ' ' + x.hw) }); });
      (r.it || []).forEach(function (x) { rows.push({ k: k, kind: x.pk, t: x.tag + ' – ' + x.d, s: norm(x.tag + ' ' + x.pk + ' ' + x.d + ' ' + x.f + ' ' + x.mts) }); });
      (r.tq || []).forEach(function (x) { var t = (window.REGISTER_TQ || {})[x[0]] || {}; rows.push({ k: k, kind: 'TQ', t: x[0] + ' – ' + (t.s || ''), s: norm(x[0] + ' ' + x[0].replace('TQ-', '') + ' ' + t.s + ' ' + (t.h || '') + ' ' + (t.r || '')), u: t.u }); });
      (r.mt || []).forEach(function (x) { rows.push({ k: k, kind: 'Material', t: x.c + ' – ' + x.m, s: norm(x.c + ' ' + x.m + ' ' + x.p), u: x.u }); });
    });
    return rows;
  }
  function filt() {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    return { lv: g('gs-lv'), pt: g('gs-pt'), ty: g('gs-ty') };
  }
  function okRoom(k, f) {
    var d = ROOMS[k] || {}, p = k.split('.');
    if (f.lv && (d.baseLevel || p[1]) !== f.lv) return false;
    if (f.pt && p[0] !== f.pt) return false;
    if (f.ty && p[2] !== f.ty) return false;
    return true;
  }
  function run(q) {
    var out = document.getElementById('gs-out'); if (!out) return;
    q = norm(q).trim(); var f = filt(), any = f.lv || f.pt || f.ty;
    if (q.length < 2 && !any) { out.innerHTML = ''; out.hidden = true; return; }
    out.hidden = false;
    IDX = IDX || build();
    var terms = q ? q.split(/\s+/) : [], hits = {}, order = [];
    IDX.forEach(function (r) {
      if (!okRoom(r.k, f)) return;
      if (!terms.length && r.kind !== 'Room') return;
      if (!terms.every(function (t) { return r.s.indexOf(t) >= 0; })) return;
      if (!hits[r.k]) { hits[r.k] = []; order.push(r.k); }
      if (hits[r.k].length < 4 && !hits[r.k].some(function (h) { return h.t === r.t; })) hits[r.k].push(r);
    });
    order.sort(function (a, b) { var ra = hits[a][0].kind === 'Room' ? 0 : 1, rb = hits[b][0].kind === 'Room' ? 0 : 1; return ra - rb || (a < b ? -1 : 1); });
    var total = order.length; LAST = { ids: order.slice(), q: q, f: f };
    var cb = document.getElementById('gs-color'); if (cb) cb.disabled = !total;
    out.innerHTML = '<div class="small">' + total + ' room' + (total === 1 ? '' : 's') + (total > 60 ? ' – showing 60' : '') + '</div>' + order.slice(0, 60).map(function (k) {
      var d = ROOMS[k] || {}, r = (window.REGISTER_DATA || {})[k];
      return '<div class="gs-it"><a href="#/room/' + encodeURIComponent(k) + '"><b>' + esc(k) + '</b> ' + esc((r && r.ifc.n) || d.name || '') + ' <span class="small">L' + esc(d.baseLevel || '') + '</span></a>' +
        hits[k].filter(function (h) { return h.kind !== 'Room'; }).map(function (h) {
          return '<div class="gs-hit"><span class="gs-kind">' + esc(h.kind) + '</span> ' + (h.u ? '<a href="' + esc(h.u) + '" target="_blank" rel="noopener">' + esc(h.t.slice(0, 110)) + '</a>' : esc(h.t.slice(0, 110))) + '</div>';
        }).join('') + '</div>';
    }).join('') || '<div class="small">No match.</div>';
  }
  function types() { var t = {}; Object.keys(window.ROOMS || {}).forEach(function (k) { var p = k.split('.'); if (p[2]) t[p[2]] = 1; }); return Object.keys(t).sort(); }
  window.Search = {
    bar: function (level) {
      var lv = (window.LEVELS || ['00', '01', '02', '03', '04', '05', '06']).map(function (l) { return '<option value="' + l + '">L' + l + '</option>'; }).join('');
      return '<div class="gs-bar"><input id="gs-q" type="search" placeholder="🔍 Room, name, code, SD, MTS, TQ, door…" autocomplete="off">' +
        '<div class="gs-fl"><select id="gs-lv" aria-label="Level"><option value="">All levels</option>' + lv + '</select>' +
        '<select id="gs-pt" aria-label="Part"><option value="">All parts</option><option value="1">Part 001</option><option value="2">Part 002</option><option value="3">Part 003</option><option value="4">Part 004</option><option value="5">Part 005</option></select>' +
        '<select id="gs-ty" aria-label="Room type"><option value="">All rooms</option>' + types().map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="gs-act"><button id="gs-color" class="btn ghost" onclick="Search.paint()" disabled>🎨 Colour these rooms on the plans</button></div>' +
        '<div id="gs-chips" class="gs-chips" hidden></div>' +
        '<div id="gs-out" class="gs-out" hidden></div></div>';
    },
    mountBar: function () {
      var q = document.getElementById('gs-q'), t = null; if (!q) return;
      try { var st = JSON.parse(sessionStorage.getItem('gs_st') || '{}'); q.value = st.q || ''; ['lv', 'pt', 'ty'].forEach(function (k) { if (st[k]) document.getElementById('gs-' + k).value = st[k]; }); } catch (x) {}
      var go = function () { clearTimeout(t); t = setTimeout(function () { var f = filt(); try { sessionStorage.setItem('gs_st', JSON.stringify({ q: q.value, lv: f.lv, pt: f.pt, ty: f.ty })); } catch (x) {} run(q.value); }, 150); };
      q.addEventListener('input', go); ['gs-lv', 'gs-pt', 'gs-ty'].forEach(function (id) { document.getElementById(id).addEventListener('change', go); });
      run(q.value); chips();
      q.addEventListener('focus', function () { run(q.value); });
      document.addEventListener('click', function (e) { var o = document.getElementById('gs-out'); if (o && !e.target.closest('.gs-bar')) o.hidden = true; });
    },
    paint: function () {
      if (!LAST.ids.length) return; var a = sets();
      var used = a.map(function (x) { return x.c; }), c = PAL.filter(function (p) { return used.indexOf(p) < 0; })[0] || PAL[a.length % PAL.length];
      a.push({ label: labelOf(LAST.q, LAST.f), c: c, ids: LAST.ids.slice(0, 2000) }); saveSets(a);
      var q = document.getElementById('gs-q'); if (q) q.blur(); setTimeout(function () { var o = document.getElementById('gs-out'); if (o) o.hidden = true; }, 200);
    },
    drop: function (i) { var a = sets(); a.splice(i, 1); saveSets(a); },
    colorOf: function (id) { return map()[id] || null; },
    open: function () {
      var m = document.getElementById('gs-modal'); if (m) m.remove();
      document.body.insertAdjacentHTML('beforeend', '<div id="gs-modal" class="sn-modal" role="dialog" aria-modal="true" aria-label="Search"><div class="sn-box gs-box">' +
        '<div class="sn-head"><input id="gs-q" type="search" placeholder="Search rooms, codes, SD, MTS, doors…" autocomplete="off"><button class="btn ghost" onclick="Search.close()" aria-label="Close">✕</button></div>' +
        '<div id="gs-out"></div></div></div>');
      var q = document.getElementById('gs-q'), t = null;
      try { q.value = sessionStorage.getItem('gs_q') || ''; } catch (x) {}
      q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { try { sessionStorage.setItem('gs_q', q.value); } catch (x) {} run(q.value); }, 150); });
      run(q.value); q.focus();
    },
    close: function () { var m = document.getElementById('gs-modal'); if (m) m.remove(); }
  };
})();
