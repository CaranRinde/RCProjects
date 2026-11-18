/* ============================================================
   EDGEWOOD — puts the people on the map.
   It reads the characters from the characters folder (their places: lines),
   pins them on the great map, and lists them on each place's card.
   You never need to edit this file.
   ============================================================ */
(function () {
  'use strict';
  function slug(n) { return n.toLowerCase().replace(/['‘’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function decode(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
  function own(id) { try { return window.localStorage.getItem('edgewood-own-' + id); } catch (e) { return null; } }

  if (!window.fetch || !window.rcFolk) return;
  window.rcFolk(document.createElement('div')).then(function (doc) {
    var byPlace = {};
    Array.prototype.forEach.call(doc.querySelectorAll('article.character'), function (art) {
      var h2 = art.querySelector('h2'), name = h2 ? h2.textContent.trim() : art.id;
      var seen = {};
      (art.getAttribute('data-places') || '').split(';').forEach(function (bit) {
        bit = bit.trim(); if (!bit) return;
        var place = slug(bit.split(':')[0]), note = decode((bit.split(':').slice(1).join(':') || '').trim());
        var kind = /^home/i.test(note) ? 'home' : 'work';
        if (seen[place]) { seen[place].kind = seen[place].kind === kind ? kind : 'both'; seen[place].notes.push(note); return; }
        var who = { id: art.id, name: name, kind: kind, notes: [note], veiled: art.hasAttribute('data-veiled'), veil: art.getAttribute('data-veil'),
          portrait: art.getAttribute('data-portrait'), focus: art.getAttribute('data-focus'), zoom: art.getAttribute('data-zoom') };
        seen[place] = who; (byPlace[place] = byPlace[place] || []).push(who);
      });
    });

    // fetch every portrait straight away, so the ovals on the place cards are ready before anyone opens one
    Array.prototype.forEach.call(doc.querySelectorAll('article.character'), function (art) {
      var src = art.getAttribute('data-portrait') || art.getAttribute('data-veil');
      if (src) { var im = new Image(); im.src = src; }
    });

    // pins on the map
    Array.prototype.forEach.call(document.querySelectorAll('.place[data-place]'), function (pl) {
      var people = byPlace[pl.getAttribute('data-place')]; if (!people) return;
      var box = document.createElement('span'); box.className = 'pins';
      people.forEach(function (p) {
        var pin = document.createElement('i'); pin.className = 'pin ' + p.kind;
        pin.title = p.name + ' · ' + p.notes.join(', ');
        box.appendChild(pin);
      });
      pl.appendChild(box);
    });

    // the people of each place, on its card
    Array.prototype.forEach.call(document.querySelectorAll('.folk[data-place]'), function (list) {
      var people = byPlace[list.getAttribute('data-place')];
      if (!people) { list.insertAdjacentHTML('afterend', '<p class="folk-empty">~ nobody has been met here yet ~</p>'); return; }
      people.forEach(function (p) {
        var b = document.createElement('button'); b.type = 'button';
        var frame = document.createElement('span'); frame.className = 'oval-frame';
        var pic = document.createElement('span'); pic.className = 'oval-pic';
        var mine = p.veiled && own(p.id);
        if (mine) { pic.style.backgroundImage = 'url(' + mine + ')'; pic.classList.add('own'); }
        else if (p.veiled) { pic.style.backgroundImage = 'url(' + p.veil + ')'; }
        else if (p.portrait) { pic.style.backgroundImage = 'url(' + p.portrait + ')'; pic.style.backgroundSize = p.zoom || '210%'; pic.style.backgroundPosition = p.focus || '50% 20%'; }
        else pic.classList.add('empty');
        frame.appendChild(pic); b.appendChild(frame);
        var who = document.createElement('span'); who.className = 'who'; who.textContent = p.name; b.appendChild(who);
        var note = document.createElement('span'); note.className = 'note'; note.textContent = p.notes.join(' & '); b.appendChild(note);
        b.addEventListener('click', function () { if (window.rcRoom) window.rcRoom.showBook('characters.html#' + p.id, 'The Folk of Edgewood'); });
        list.appendChild(b);
      });
    });
  }).catch(function () { /* opened straight from a folder on the computer: the map still works, without its people */ });

  // ---------------------------------------------------------- the great map comes alive
  // birds crossing every few seconds, and the sea moving at Rosehaven
  (function life() {
    var cv = document.querySelector('.chart-life'); if (!cv) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var panel = cv.closest('.panel'), g = cv.getContext('2d'); if (!g) return;
    // the sea, in the map's own pixels (1622 x 970)
    var SEA = [[1622, 470], [1585, 520], [1540, 585], [1500, 650], [1452, 712], [1404, 778], [1360, 845], [1325, 905], [1300, 970], [1622, 970]];
    var waves = [], flock = null, wait = 1, last = 0, running = false;
    for (var i = 0; i < 40; i++) waves.push({ x: 1300 + Math.random() * 322, y: 470 + Math.random() * 500, ph: Math.random() * 6, len: 10 + Math.random() * 16 });
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
    }
    function frame(now) {
      if (!panel.classList.contains('is-open') || document.hidden) { running = false; return; }
      var dt = Math.min(0.05, (now - last) / 1000 || 0), t = now / 1000; last = now;
      if (cv.width !== Math.round(cv.clientWidth * Math.min(window.devicePixelRatio || 1, 2))) size();
      var W = cv.width, H = cv.height, sx = W / 1622, sy = H / 970;
      g.clearRect(0, 0, W, H);
      // the sea: soft light moving on the water
      g.save(); g.beginPath();
      SEA.forEach(function (p, n) { if (n) g.lineTo(p[0] * sx, p[1] * sy); else g.moveTo(p[0] * sx, p[1] * sy); });
      g.closePath(); g.clip();
      g.lineCap = 'round'; g.lineWidth = Math.max(1, 2 * sx);
      waves.forEach(function (w) {
        var k = 0.5 + 0.5 * Math.sin(t * 1.4 + w.ph), x = (w.x + Math.sin(t * 0.6 + w.ph) * 12) * sx, y = w.y * sy;
        g.strokeStyle = 'rgba(255,255,255,' + (0.55 * k).toFixed(3) + ')';
        g.beginPath(); g.moveTo(x - w.len * sx, y); g.quadraticCurveTo(x, y - 4 * sy * k, x + w.len * sx, y); g.stroke();
      });
      g.restore();
      // the birds: a little flock crossing, every few seconds
      if (!flock) { wait -= dt; if (wait <= 0) {
        var fromLeft = Math.random() < 0.5;
        flock = { x: fromLeft ? -40 : 1662, y: 120 + Math.random() * 500, vx: (fromLeft ? 1 : -1) * (150 + Math.random() * 60), vy: (Math.random() - 0.5) * 30,
          birds: [[0, 0], [-22, -12], [-20, 14], [-44, -6], [-40, 22]].slice(0, 3 + Math.floor(Math.random() * 3)) };
      } }
      if (flock) {
        flock.x += flock.vx * dt; flock.y += flock.vy * dt;
        var dir = flock.vx > 0 ? 1 : -1;
        g.strokeStyle = 'rgba(40,30,20,0.8)'; g.lineWidth = Math.max(1, 2.2 * sx); g.lineJoin = 'round';
        flock.birds.forEach(function (b, n) {
          var bx = (flock.x + b[0] * dir) * sx, by = (flock.y + b[1]) * sy, flap = Math.sin(t * 9 + n) * 5 * sy, wing = 9 * sx;
          g.beginPath(); g.moveTo(bx - wing, by - flap); g.quadraticCurveTo(bx - wing / 2, by - 4 * sy, bx, by); g.quadraticCurveTo(bx + wing / 2, by - 4 * sy, bx + wing, by - flap); g.stroke();
        });
        if (flock.x < -80 || flock.x > 1702) { flock = null; wait = 2.5 + Math.random() * 2; }
      }
      window.requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; size(); last = performance.now(); window.requestAnimationFrame(frame); }
    // run only while the map is open
    new MutationObserver(function () { if (panel.classList.contains('is-open')) start(); }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && panel.classList.contains('is-open')) start(); });
  })();
})();
