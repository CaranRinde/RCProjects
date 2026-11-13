/* ============================================================
   THE ROOMS — the shared machinery of every room on rcprojects.net
   You never need to edit this file to add a room or an object.
   A room page only needs:

     <main class="room" data-realm="lectern" data-realm-name="the Lectern">
       <div class="room-view" style="--w:1672;--h:941">
         <img class="room-pic" src="picture.jpg" alt="">
         <button class="spot" data-opens="cv" style="left:..%;top:..%;width:..%;height:..%">Name</button>
         <button class="spot" data-book="publications.html" style="...">Name</button>     (opens a book)
         <button class="spot lantern" data-book="bear.html" style="...">Bear</button>      (a lantern: lit if it opens something)
       </div>
     </main>
     <section class="panel" id="cv" data-kind="card"> ... </section>

   What this file does, in order:
     1. Sound          (one switch, shared with the books)
     2. The spots      (names, the first glow, the list for phones)
     3. The glide      (the camera travels to what you click)
     4. The panels     (open, close, Esc, back to the room; books open here too)
     5. Dust and fireflies (what drifts in the air)
     6. The secret     (one hidden Red Circle per room)
   ============================================================ */
(function () {
  'use strict';

  var room = document.querySelector('.room');
  if (!room) return;
  var view = room.querySelector('.room-view');
  var realm = room.getAttribute('data-realm') || 'room';
  var realmName = room.getAttribute('data-realm-name') || 'this room';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(key, value) {           // browser storage can be switched off; never crash on it
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------- 1. SOUND
  var soundOn = store('rc-sound') !== 'off';
  var toggle = document.getElementById('soundToggle');
  var audio = null;

  function paintToggle() { if (toggle) toggle.textContent = soundOn ? 'SOUND: ON' : 'SOUND: OFF'; }
  paintToggle();
  if (toggle) toggle.addEventListener('click', function () {
    soundOn = !soundOn; store('rc-sound', soundOn ? 'on' : 'off'); paintToggle();
  });

  function ctx() {
    if (!audio) { var C = window.AudioContext || window.webkitAudioContext; if (C) audio = new C(); }
    if (audio && audio.state === 'suspended') audio.resume();
    return audio;
  }
  function noise(a, seconds, shape) {
    var buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * shape(i / d.length);
    var src = a.createBufferSource(); src.buffer = buf; return src;
  }
  var sounds = {
    paper: function (a) {                 // a sheet lifted from the desk
      var src = noise(a, 0.26, function (t) { return Math.pow(1 - t, 2.2) * (0.25 + 0.75 * Math.sin(t * 3.14)); });
      var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.7;
      var g = a.createGain(); g.gain.value = 0.3;
      src.connect(f); f.connect(g); g.connect(a.destination); src.start();
    },
    wood: function (a) {                  // a lid, a door, a shelf
      var o = a.createOscillator(), g = a.createGain(), now = a.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(58, now + 0.2);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.32, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      o.connect(g); g.connect(a.destination); o.start(now); o.stop(now + 0.32);
      var src = noise(a, 0.12, function (t) { return Math.pow(1 - t, 3); });
      var f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      var g2 = a.createGain(); g2.gain.value = 0.16;
      src.connect(f); f.connect(g2); g2.connect(a.destination); src.start();
    },
    glass: function (a) {                 // a lantern touched
      [1568, 2093].forEach(function (hz, i) {
        var o = a.createOscillator(), g = a.createGain(), at = a.currentTime + i * 0.05;
        o.type = 'sine'; o.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.09, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
        o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.75);
      });
    },
    steps: function (a) {                 // two footsteps on a path
      [0, 0.22].forEach(function (delay) {
        var src = noise(a, 0.09, function (t) { return Math.pow(1 - t, 2.5); });
        var f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        var g = a.createGain(); g.gain.value = 0.38;
        src.connect(f); f.connect(g); g.connect(a.destination); src.start(a.currentTime + delay);
      });
    },
    chime: function (a) {                 // something small and bright
      [880, 1318.5, 1760].forEach(function (hz, i) {
        var o = a.createOscillator(), g = a.createGain(), at = a.currentTime + i * 0.11;
        o.type = 'sine'; o.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.14, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
        o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 1.15);
      });
    }
  };
  function play(name) {
    if (!soundOn) return;
    try { var a = ctx(); if (a && sounds[name]) sounds[name](a); } catch (e) { /* sound is a garnish, never a crash */ }
  }

  // ---------------------------------------------------------- 2. THE SPOTS
  var spots = Array.prototype.slice.call(view.querySelectorAll('.spot'));
  var listItems = [];

  spots.forEach(function (spot, i) {
    spot.style.setProperty('--i', i);
    if (spot.classList.contains('secret')) return;
    var name = spot.textContent.trim();
    spot.textContent = '';
    var label = document.createElement('span'); label.textContent = name; spot.appendChild(label);
    spot.setAttribute('aria-label', name);
    // keep the name inside the picture: below if the spot is near the top, aligned in at the sides
    var top = parseFloat(spot.style.top) || 0, left = parseFloat(spot.style.left) || 0, w = parseFloat(spot.style.width) || 0;
    if (top < 13) spot.classList.add('label-below');
    if (left + w / 2 > 90) spot.classList.add('label-left');
    else if (left + w / 2 < 10) spot.classList.add('label-right');
    // a lantern is lit when it has something to open; an unlit one waits, and does nothing
    if (spot.classList.contains('lantern')) {
      var lit = spot.hasAttribute('data-opens') || spot.hasAttribute('data-book');
      spot.classList.add(lit ? 'is-lit' : 'unlit');
      if (!lit) { spot.setAttribute('tabindex', '-1'); spot.setAttribute('aria-disabled', 'true'); return; }
      // its light trembles on the water below: data-water="top bottom" on the room, in % of the picture
      var water = (room.getAttribute('data-water') || '').split(/\s+/).map(Number);
      if (water.length === 2 && !isNaN(water[1])) {
        var glow = document.createElement('div'); glow.className = 'water-light'; glow.setAttribute('aria-hidden', 'true');
        glow.style.left = (left + w / 2) + '%'; glow.style.top = water[0] + '%'; glow.style.height = (water[1] - water[0]) + '%';
        glow.style.animationDelay = (-i * 1.3) + 's';
        view.appendChild(glow);
      }
    }
    listItems.push({ name: name, spot: spot });
  });

  // the plain list for phones and narrow windows: the same doors, as words
  if (listItems.length) {
    var list = document.createElement('nav'); list.className = 'room-list';
    list.setAttribute('aria-label', 'Everything in this room');
    var h = document.createElement('h2'); h.textContent = '~ in this room ~'; list.appendChild(h);
    var ul = document.createElement('ul');
    listItems.forEach(function (item) {
      var li = document.createElement('li'), el;
      if (item.spot.tagName === 'A') { el = document.createElement('a'); el.href = item.spot.getAttribute('href'); }
      else {
        el = document.createElement('button'); el.type = 'button';
        el.addEventListener('click', function () { openFromSpot(item.spot, el); });
      }
      el.textContent = item.name; li.appendChild(el); ul.appendChild(li);
    });
    list.appendChild(ul);
    room.parentNode.insertBefore(list, room.nextSibling);
  }

  if (!reduceMotion) {
    room.classList.add('is-waking');
    window.setTimeout(function () { room.classList.remove('is-waking'); }, spots.length * 160 + 2400);
  }

  // ---------------------------------------------------------- 3. THE GLIDE
  function glideTo(spot) {
    if (reduceMotion) return 0;
    var r = room.getBoundingClientRect(), v = view.getBoundingClientRect(), s = spot.getBoundingClientRect();
    if (s.width < 2 || s.height < 2) return 0;
    var scale = Math.max(1.5, Math.min(4, 0.62 * Math.min(r.width / s.width, r.height / s.height)));
    var cx = s.left + s.width / 2 - v.left, cy = s.top + s.height / 2 - v.top;   // the spot, inside the picture
    var tx = (r.left + r.width / 2 - v.left) - cx * scale;                        // bring it to the middle
    var ty = (r.top + r.height / 2 - v.top) - cy * scale;
    view.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    room.classList.add('is-gliding');
    return 520;                                                                   // ms before the panel appears
  }
  function glideHome() { view.style.transform = ''; room.classList.remove('is-gliding'); }

  // ---------------------------------------------------------- 4. THE PANELS
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var holder = document.createElement('div'); holder.className = 'panels';
  var openPanel = null, bookFrame = null, bookClose = null, lastFocus = null, pending = null;

  panels.forEach(function (p) {
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    var heading = p.querySelector('h2');
    if (heading) { if (!heading.id) heading.id = p.id + '-title'; p.setAttribute('aria-labelledby', heading.id); }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'panel-close';
    x.setAttribute('aria-label', 'Close'); x.innerHTML = '&times;'; x.addEventListener('click', close);
    p.insertBefore(x, p.firstChild);
    var back = document.createElement('button'); back.type = 'button'; back.className = 'panel-back';
    back.textContent = '~ back to the room ~'; back.addEventListener('click', close);
    p.appendChild(back);
    holder.appendChild(p);
  });
  document.body.appendChild(holder);
  holder.addEventListener('click', function (e) { if (e.target === holder) close(); });

  var bookNote = null, bookTimer = null;
  function removeBook() {
    window.clearTimeout(bookTimer);
    if (bookFrame) { holder.removeChild(bookFrame); bookFrame = null; }
    if (bookClose) { holder.removeChild(bookClose); bookClose = null; }
    if (bookNote) { holder.removeChild(bookNote); bookNote = null; }
    holder.classList.remove('has-book'); holder.classList.remove('book-loading');
  }
  // the book stays hidden until it has finished building itself, with a note so the wait never looks like nothing
  function bookReady() {
    window.clearTimeout(bookTimer);
    holder.classList.remove('book-loading');
  }
  // a book is its own file; it opens in a frame over the dimmed room
  function showBook(url, name) {
    if (openPanel) { openPanel.classList.remove('is-open'); openPanel = null; }
    removeBook();
    bookClose = document.createElement('button'); bookClose.type = 'button'; bookClose.className = 'book-close';
    bookClose.textContent = 'CLOSE THE BOOK'; bookClose.addEventListener('click', close);
    bookFrame = document.createElement('iframe'); bookFrame.className = 'book-frame';
    bookFrame.setAttribute('title', name || 'A book');
    bookNote = document.createElement('p'); bookNote.className = 'book-note'; bookNote.textContent = '~ the book is opening ~';
    bookFrame.addEventListener('load', function () { bookTimer = window.setTimeout(bookReady, 650); });
    bookFrame.src = url;
    holder.appendChild(bookNote); holder.appendChild(bookClose); holder.appendChild(bookFrame);
    holder.classList.add('has-book'); holder.classList.add('book-loading'); holder.classList.add('is-open'); holder.scrollTop = 0;
    bookTimer = window.setTimeout(bookReady, 12000);             // never hide a book for ever, whatever happens
    document.body.style.overflow = 'hidden';
    bookClose.focus({ preventScroll: true });
  }
  window.addEventListener('message', function (e) { if (e.data === 'rc-close-book' && bookFrame) close(); });

  // once the room has loaded, quietly fetch its books and the book machinery,
  // so the first book opened does not have to wait for the internet
  var assetsBase = (document.currentScript && document.currentScript.src || '').replace(/rooms\.js(\?.*)?$/, '');
  window.addEventListener('load', function () {
    var urls = [];
    view.querySelectorAll('.spot[data-book]').forEach(function (s) { urls.push(s.getAttribute('data-book')); });
    if (!urls.length) return;
    if (assetsBase) urls.push(assetsBase + 'library.js', assetsBase + 'vendor/page-flip.browser.js');
    window.setTimeout(function () {
      urls.forEach(function (u) {
        var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; document.head.appendChild(l);
      });
    }, 1200);
  });

  function show(id) {
    var p = document.getElementById(id);
    if (!p || !p.classList.contains('panel')) { glideHome(); return; }
    removeBook();
    if (openPanel) openPanel.classList.remove('is-open');
    openPanel = p; p.classList.add('is-open'); holder.classList.add('is-open'); holder.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    var x = p.querySelector('.panel-close'); if (x) x.focus({ preventScroll: true });
    if (window.history && history.replaceState) history.replaceState(null, '', '#' + id);
  }
  function openFromSpot(spot, focusBack) {
    var id = spot.getAttribute('data-opens'), book = spot.getAttribute('data-book');
    if (!id && !book) return;
    lastFocus = focusBack || spot;
    room.classList.add('has-explored');
    play(spot.getAttribute('data-sound') || 'paper');
    window.clearTimeout(pending);
    pending = window.setTimeout(function () {
      pending = null;
      if (book) showBook(book, spot.getAttribute('aria-label')); else show(id);
    }, glideTo(spot));
  }
  function close() {
    window.clearTimeout(pending); pending = null;
    if (openPanel) openPanel.classList.remove('is-open');
    openPanel = null; holder.classList.remove('is-open'); document.body.style.overflow = '';
    removeBook();
    glideHome();
    if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  spots.forEach(function (spot) {
    if (spot.classList.contains('secret') || spot.classList.contains('unlit')) return;
    if (spot.tagName === 'A') { spot.addEventListener('click', function () { play(spot.getAttribute('data-sound') || 'wood'); }); return; }
    spot.addEventListener('click', function () { openFromSpot(spot); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (openPanel || bookFrame || pending)) close(); });

  // links such as <a href="#cv"> open that panel, from the top bar or from inside another panel
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null; if (!a) return;
    var id = a.getAttribute('href').slice(1), target = id && document.getElementById(id);
    if (!target || !target.classList.contains('panel')) return;
    e.preventDefault();
    var spot = view.querySelector('.spot[data-opens="' + id + '"]');
    if (openPanel || bookFrame || !spot) { play('paper'); if (!openPanel && !bookFrame) lastFocus = a; show(id); }
    else openFromSpot(spot, a);
  });
  // a web address ending in #cv opens straight onto the CV
  if (location.hash.length > 1) {
    var first = document.getElementById(location.hash.slice(1));
    if (first && first.classList.contains('panel')) { room.classList.add('has-explored'); show(first.id); }
  }

  // ---------------------------------------------------------- 5. DUST
  // data-dust="left top right bottom" (in % of the picture) says where the light falls
  (function dust() {
    if (reduceMotion || !room.hasAttribute('data-dust')) return;
    var box = room.getAttribute('data-dust').split(/\s+/).map(Number);
    var canvas = document.createElement('canvas'); canvas.className = 'room-dust'; canvas.setAttribute('aria-hidden', 'true');
    view.appendChild(canvas);
    var g = canvas.getContext('2d'); if (!g) return;
    var motes = [], n = 46, W = 0, H = 0, running = false;
    for (var i = 0; i < n; i++) motes.push({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.5,
      vx: (Math.random() - 0.3) * 0.006, vy: -0.003 - Math.random() * 0.006,
      phase: Math.random() * 6.28, speed: 0.4 + Math.random() * 0.9, sway: 0.004 + Math.random() * 0.01
    });
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.round(view.clientWidth * dpr); H = canvas.height = Math.round(view.clientHeight * dpr);
    }
    var last = 0;
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      g.clearRect(0, 0, W, H);
      var x0 = box[0] / 100 * W, y0 = box[1] / 100 * H, bw = (box[2] - box[0]) / 100 * W, bh = (box[3] - box[1]) / 100 * H;
      var unit = W / 1600;
      for (var i = 0; i < n; i++) {
        var m = motes[i];
        m.x += (m.vx + Math.sin(now / 1000 * m.speed + m.phase) * m.sway) * dt * 4;
        m.y += m.vy * dt * 4;
        if (m.y < -0.03) { m.y = 1.03; m.x = Math.random(); }
        if (m.x < -0.03) m.x = 1.03; if (m.x > 1.03) m.x = -0.03;
        var edge = Math.min(1, m.y * 6, (1 - m.y) * 6, m.x * 6, (1 - m.x) * 6);          // fade at the edges of the light
        var twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 1000 * m.speed * 1.7 + m.phase));
        g.beginPath();
        g.fillStyle = 'rgba(255,244,214,' + (0.5 * edge * twinkle).toFixed(3) + ')';
        g.arc(x0 + m.x * bw, y0 + m.y * bh, m.r * unit * (window.devicePixelRatio > 1 ? 1.6 : 1.1) + 0.4, 0, 6.2832);
        g.fill();
      }
      window.requestAnimationFrame(frame);
    }
    function start() { if (running || document.hidden) return; running = true; last = performance.now(); window.requestAnimationFrame(frame); }
    function stop() { running = false; }
    size(); start();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  })();

  // fireflies: data-fireflies="left top right bottom" (in % of the picture) says where they wander
  (function fireflies() {
    var attr = room.getAttribute('data-fireflies');
    if (!attr || reduceMotion) return;
    var box = attr.split(/\s+/).map(Number);
    var canvas = document.createElement('canvas'); canvas.className = 'room-dust'; canvas.setAttribute('aria-hidden', 'true');
    view.appendChild(canvas);
    var g = canvas.getContext('2d'); if (!g) return;
    var flies = [], n = 16, W = 0, H = 0, running = false, last = 0;
    function target(f) { f.tx = Math.random(); f.ty = Math.random(); f.rest = 0.5 + Math.random() * 2.5; }
    for (var i = 0; i < n; i++) {
      var f = { x: Math.random(), y: Math.random(), phase: Math.random() * 6.28, blink: 0.5 + Math.random() * 0.9, size: 0.8 + Math.random() * 0.7 };
      target(f); flies.push(f);
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.round(view.clientWidth * dpr); H = canvas.height = Math.round(view.clientHeight * dpr);
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      g.clearRect(0, 0, W, H);
      var x0 = box[0] / 100 * W, y0 = box[1] / 100 * H, bw = (box[2] - box[0]) / 100 * W, bh = (box[3] - box[1]) / 100 * H;
      var unit = W / 1600;
      for (var i = 0; i < n; i++) {
        var f = flies[i], dx = f.tx - f.x, dy = f.ty - f.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.02) { f.rest -= dt; if (f.rest <= 0) target(f); }
        else { f.x += dx / d * dt * 0.035; f.y += dy / d * dt * 0.035; }       // they dart, pause, and dart again
        var wob = Math.sin(now / 1000 * 1.3 + f.phase) * 0.004;
        var glow = Math.pow(0.5 + 0.5 * Math.sin(now / 1000 * f.blink + f.phase), 3);   // mostly dim, briefly bright
        if (glow < 0.03) continue;
        var px = x0 + (f.x + wob) * bw, py = y0 + f.y * bh, r = 9 * unit * f.size * (window.devicePixelRatio > 1 ? 1.5 : 1);
        var grad = g.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, 'rgba(255,246,190,' + (0.95 * glow).toFixed(3) + ')');
        grad.addColorStop(0.25, 'rgba(255,226,130,' + (0.5 * glow).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,210,90,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(px, py, r, 0, 6.2832); g.fill();
      }
      window.requestAnimationFrame(frame);
    }
    function start() { if (running || document.hidden) return; running = true; last = performance.now(); window.requestAnimationFrame(frame); }
    size(); start();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else start(); });
  })();

  // ---------------------------------------------------------- 6. THE SECRET
  // one hidden Red Circle per room; the browser remembers which ones this visitor has found
  var TOTAL_CIRCLES = 7;
  var toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  var toastTimer = null;
  function say(text) {
    toast.textContent = text; toast.classList.add('is-shown');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove('is-shown'); }, 5200);
  }
  function found() { try { return JSON.parse(store('rc-circles') || '[]'); } catch (e) { return []; } }

  var secret = view.querySelector('.spot.secret');
  if (secret) {
    secret.setAttribute('aria-label', 'Something small and red');
    if (found().indexOf(realm) !== -1) secret.classList.add('is-found');
    secret.addEventListener('click', function () {
      var list = found(), isNew = list.indexOf(realm) === -1;
      if (isNew) { list.push(realm); store('rc-circles', JSON.stringify(list)); }
      secret.classList.add('is-found'); play('chime');
      var count = Math.min(list.length, TOTAL_CIRCLES);
      say(count >= TOTAL_CIRCLES
        ? 'You have found every hidden Red Circle. All ' + TOTAL_CIRCLES + ' of ' + TOTAL_CIRCLES + '.'
        : (isNew ? 'You found the Red Circle hidden in ' + realmName + '. ' : 'The Red Circle of ' + realmName + '. ') +
          count + ' of ' + TOTAL_CIRCLES + ' found.');
    });
  }
})();
