/* Room storyboard: room header, plan with the room marked, status table with live document links,
   finish build-ups, site progress, doors, items, materials, open actions. Save as HTML or share. */
(function () {
  var REG = window.REGISTER_DATA || {}, LIB = window.FINISH_LIB || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lnk(t, u) { return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>' : esc(t); }
  function chip(c) {
    c = (c || '').trim(); var k = { A: 'ok', B: 'ok', C: 'ok', O: 'info', E: 'bad', D: 'bad', G: 'warn' }[c.charAt(0).toUpperCase()] || 'none';
    return '<span class="sbc ' + k + '">' + esc(c || '–') + '</span>';
  }
  function partOf(k) { var p = k.charAt(0); return p === '4' ? '004' : p === '5' ? '005' : ''; }
  function codeMeaning(c) { return { A: 'Approved', B: 'Approved', C: 'No objection', G: 'Approved with comments – resubmit', E: 'Revise & resubmit', D: 'Rejected', O: 'For information' }[(c || '').charAt(0).toUpperCase()] || 'Awaiting reply'; }
  /* progress source: cloud (Claude version) or this device */
  function prog(k) {
    if (window.Cloud && Cloud.prog) { var p = Cloud.prog(k); if (p) return p; }
    try { return (JSON.parse(localStorage.getItem('ope_prog') || '{}'))[k] || {}; } catch (x) { return {}; }
  }
  function sdFor(r, re) { return r.sd.filter(function (s) { return re.test(s.t); }); }
  function finRow(label, part, r, p) {
    var ids = (r.fx && r.fx[part]) || [], codes = ids.map(function (i) { return LIB[i] ? LIB[i].code : i; });
    var mts = []; ids.forEach(function (i) { (LIB[i] && LIB[i].m || []).forEach(function (m) { mts.push(m); }); });
    var re = { w: /WALL|PAINT|CLADD|STONE|TILE|FINISH/i, f: /FLOOR|SCREED|PAVING|STONE|CARPET/i, c: /CEIL|RCP/i }[part];
    var sds = sdFor(r, re), v = p[part] || 0;
    var best = sds.filter(function (s) { return /^[ABC]/.test(s.c); }).length ? 'SD approved' : sds.length ? 'SD under review / resubmit' : 'No SD found';
    var mOk = mts.length && mts.every(function (m) { return /^Approved/.test(m.s); });
    var act = [];
    if (!sds.length) act.push('Submit shop drawing');
    sds.forEach(function (s) { if (/^[EGD]/.test(s.c)) act.push('Resubmit ' + s.no + ' (' + s.c + ')'); });
    mts.forEach(function (m) { if (!/^Approved/.test(m.s)) act.push('Get ' + m.c + ' approved'); });
    if (v < 100) act.push(v ? 'Site ' + v + '% – complete' : 'Not started on site');
    return { html: '<tr><th scope="row">' + label + '</th><td><b>' + esc(codes.join(', ') || '–') + '</b><div class="sbs">' + esc((r.ifc[part] || '').slice(0, 110)) + '</div></td>' +
      '<td>' + (sds.length ? sds.slice(0, 4).map(function (s) { return lnk(s.no, s.u) + ' ' + chip(s.c); }).join('<br>') : '<span class="sbna">Not submitted</span>') + '</td>' +
      '<td>' + (mts.length ? mts.map(function (m) { return lnk(m.c, m.u) + ' <span class="sbs">' + esc(m.s) + '</span>'; }).join('<br>') : '<span class="sbna">–</span>') + '</td>' +
      '<td><div class="sbbar"><i style="width:' + v + '%"></i></div><span class="sbs">' + v + '%</span></td>' +
      '<td class="' + (act.length > 1 || !mOk ? 'sbact' : '') + '">' + esc(best) + (act.length ? '<div class="sbs">' + esc(act.join(' · ')) + '</div>' : '') + '</td></tr>', act: act };
  }
  function build(k, snapUrl) {
    var d = ROOMS[k] || {}, r = REG[k], g = window.Grid && Grid.ofRoom(k), p = prog(k), now = new Date().toLocaleDateString('en-GB');
    var h = '<div class="sb">';
    h += '<div class="sbband"><div class="sbeye">Room status · Jeddah Opera House</div><h1>' + esc(k) + ' – ' + esc((r && r.ifc.n) || d.name || '') + '</h1>' +
      '<div class="sbmeta">Level ' + esc(d.baseLevel) + ' · Part ' + partOf(k) + (g ? ' · Grid ' + esc(g.text) : '') + (d.area ? ' · ' + d.area + ' m²' : '') + (r ? ' · ' + esc(r.sc) : '') + ' · ' + now + '</div></div>';
    h += '<section><h2>Location</h2>' + (snapUrl ? '<img class="sbplan" src="' + snapUrl + '" alt="Room ' + esc(k) + ' on the level plan">' : '<div class="frame sbplanlive" id="sbpv"><canvas></canvas><div class="mk"></div><div class="pvstat-el" id="pvstat">loading…</div></div>') + '</section>';
    if (!r) return h + '<section class="sbna">Room not in the P4-P5 register.</section></div>';
    var rows = [finRow('Walls', 'w', r, p), finRow('Floor', 'f', r, p), finRow('Ceiling', 'c', r, p)];
    h += '<section><h2>Status</h2><div class="sbtbl"><table><thead><tr><th>Item</th><th>Requirement / code</th><th>Shop drawing &amp; JCDC code</th><th>MTS / approval</th><th>Site</th><th>Status / action</th></tr></thead><tbody>' +
      rows.map(function (x) { return x.html; }).join('') + '</tbody></table></div></section>';
    h += '<section><h2>Finishes – build-up</h2><div class="sbgrid">';
    [['Walls', 'w'], ['Floor', 'f'], ['Ceiling', 'c']].forEach(function (a) {
      (r.fx[a[1]] || []).forEach(function (id) {
        var f = LIB[id]; if (!f) return;
        h += '<div class="sbcard"><div class="sbs">' + a[0] + '</div><b>' + esc(f.code) + '</b> ' + esc(f.t) + '<ol>' + f.l.slice().reverse().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>' + (f.n ? '<div class="sbs">' + esc(f.n) + '</div>' : '') + '</div>';
      });
    });
    h += '</div></section>';
    if (r.dr.length) h += '<section><h2>Doors</h2><div class="sbtbl"><table><tbody>' + r.dr.map(function (x) { return '<tr><th>' + esc(x.tag) + '</th><td>' + esc([x.type, x.fire, x.ac, x.size, x.th].filter(Boolean).join(' · ')) + '<div class="sbs">' + esc(x.fin) + '</div></td></tr>'; }).join('') + '</tbody></table></div></section>';
    h += '<section><h2>Shop drawings &amp; approvals</h2><div class="sbtbl"><table><thead><tr><th>Document</th><th>Subject</th><th>Code</th><th>Meaning</th></tr></thead><tbody>' +
      (r.sd.length ? r.sd.map(function (s) { return '<tr><th>' + lnk(s.no, s.u) + '</th><td>' + esc(s.t) + '</td><td>' + chip(s.c) + '</td><td class="sbs">' + codeMeaning(s.c) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="sbna">No shop drawing found in the register.</td></tr>') + '</tbody></table></div></section>';
    if (r.it.length) h += '<section><h2>Furniture, equipment &amp; fit-out</h2><div class="sbtbl"><table><tbody>' + r.it.map(function (x) { return '<tr><th>' + esc(x.tag) + '</th><td>' + esc(x.pk) + ' – ' + esc(x.d) + (x.f ? '<div class="sbs">' + esc(x.f) + '</div>' : '') + '</td><td class="sbs">' + esc(x.mts) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    if (r.mt.length) h += '<section><h2>Materials (MTS)</h2><div class="sbtbl"><table><tbody>' + r.mt.map(function (m) { return '<tr><th>' + lnk(m.c, m.u) + '</th><td>' + esc(m.m) + (m.p ? ' – ' + esc(m.p) : '') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    var acts = []; rows.forEach(function (x, i) { x.act.forEach(function (a) { acts.push(['Walls', 'Floor', 'Ceiling'][i] + ': ' + a); }); });
    h += '<section><h2>Open actions</h2>' + (acts.length ? '<ol class="sbacts">' + acts.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>' : '<div class="sbs">None.</div>') + '</section>';
    h += '<section id="sbai"></section>';
    h += '<footer class="sbs">Sources: P4-P5 Finishes Register · IFC Room Finishes Schedule AR-010560 · Opera House_Archive (SharePoint) · ' + now + '</footer></div>';
    return h;
  }
  var CSS = '.sb{display:flex;flex-direction:column;gap:22px;padding-bottom:30px;font-family:"IBM Plex Sans",Arial,sans-serif;color:#1E2A33}.sb a{color:#8A5F1E;font-weight:600}' +
    '.sbband{background:#1E2A33;color:#F4F2EC;padding:20px 16px;border-radius:10px}.sbband h1{margin:4px 0;font-size:24px;line-height:1.2}.sbeye{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#D9A85A}.sbmeta{font-size:13px;opacity:.85}' +
    '.sb h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5A6570;margin:0 0 8px;font-weight:600}.sbplan{width:100%;border-radius:10px;border:1px solid #D8D2C6}.sbplanlive{height:340px;position:relative;overflow:hidden}.sb th,.sb thead th,.sb tbody th{background:none;color:#1E2A33;position:static}.sb thead th{color:#5A6570}' +
    '.sbtbl{overflow-x:auto;background:#fff;border:1px solid #D8D2C6;border-radius:8px}.sbtbl table{border-collapse:collapse;width:100%;min-width:640px;font-size:13px}.sbtbl th,.sbtbl td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid #EAE5DA}.sbtbl thead th{font-size:11px;text-transform:uppercase;color:#5A6570;font-weight:600}' +
    '.sbs{font-size:12px;color:#5A6570}.sbna{color:#8a8f95;font-style:italic}.sbact{color:#A1352A;font-weight:600}.sbc{display:inline-block;min-width:2em;text-align:center;font-size:11px;padding:1px 7px;border-radius:99px;background:#e5e1d8}.sbc.ok{background:#E3F0E8;color:#2F6B4F}.sbc.warn{background:#FBEFD5;color:#8A5A00}.sbc.bad{background:#F8E1DD;color:#A1352A}.sbc.info{background:#E2EAF5;color:#355C8A}' +
    '.sbbar{height:8px;background:#e5e1d8;border-radius:4px;overflow:hidden;min-width:70px}.sbbar i{display:block;height:100%;background:#2F6B4F}' +
    '.sbgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}.sbcard{background:#fff;border:1px solid #D8D2C6;border-radius:8px;padding:12px;font-size:13px}.sbcard ol{margin:8px 0;padding-left:1.3em}.sbacts{margin:0;padding-left:1.4em}';
  function snapDataUrl() { try { var c = window.RoomPage && RoomPage.labelled ? RoomPage.labelled(CUR) : (Viewer.snapshot && Viewer.snapshot()); return c ? c.toDataURL('image/jpeg', 0.85) : ''; } catch (e) { return ''; } }
  var CUR = null;
  function open(k) {
    CUR = k; var app = document.getElementById('app');
    app.innerHTML = '<style>' + CSS + '</style><div class="rtop"><button class="btn ghost" onclick="location.hash=\'#/room/' + esc(k) + '\'">←</button><div class="rhead"><div class="rn">Storyboard</div></div>' +
      '<button class="btn ghost" onclick="Storyboard.save()">Save HTML</button> <button class="btn brass" onclick="Storyboard.share()">Share</button></div>' + build(k, '');
    var d = ROOMS[k]; if (d && d.pos) Viewer.openRoom(k, 'sbpv');
    if (window.Cloud && Cloud.aiBlock) Cloud.aiBlock(k, document.getElementById('sbai'));
  }
  function doc(k) {
    var ai = document.getElementById('sbai'), body = build(k, snapDataUrl());
    if (ai && ai.innerHTML) body = body.replace('<section id="sbai"></section>', '<section>' + ai.innerHTML.replace(/<button[^>]*>.*?<\/button>/g, '') + '</section>');
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room ' + esc(k) + '</title><style>body{margin:0;padding:16px;background:#F4F2EC}' + CSS + '</style></head><body>' + body + '</body></html>';
  }
  function file(k) { return new File([doc(k)], 'Room_' + k + '_status.html', { type: 'text/html' }); }
  window.Storyboard = {
    open: open, build: build,
    save: function () {
      var f = file(CUR);
      if (window.Cloud && Cloud.download) return Cloud.download(f.name, doc(CUR));
      var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    },
    share: function () {
      var f = file(CUR);
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'Room ' + CUR }).catch(function () {});
      else Storyboard.save();
    }
  };
})();
