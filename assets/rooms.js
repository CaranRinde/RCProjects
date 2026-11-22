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
     5. Dust, fireflies, petals, sparkles, dragonflies and ripples (what moves in the air and water)
     6. The secret     (one hidden Red Circle per room)
     7. Pictures that open large (any <img class="zoomable"> in a panel)
     8. The postcard   (a room painted as a pinned card can be turned over)
     9. Toys and tickets (things that wobble when poked; a roll of riddle tickets)
   ============================================================ */
(function () {
  'use strict';
  var thisScript = document.currentScript;
  // a room whose objects or cards come from text files waits for them first (window.rcRoomGate)
  function whenReady(fn) { if (window.rcRoomGate && window.rcRoomGate.then) window.rcRoomGate.then(fn, fn); else fn(); }
  // run something once the page has loaded, even if that has already happened
  function onLoaded(fn) { if (document.readyState === 'complete') window.setTimeout(fn, 0); else window.addEventListener('load', fn); }
  whenReady(function () {

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
    if (music) { if (soundOn) fadeMusic(true); else fadeMusic(false); }
  });

  // music: if a file called music.mp3 sits in the room's folder, it plays softly, on a loop.
  // Browsers only allow music after the visitor's first click, so it begins then. The SOUND switch stops it.
  var music = null, MUSIC_VOLUME = 0.25, musicFade = null;
  function fadeMusic(on) {
    if (!music) return;
    window.clearInterval(musicFade);
    if (on) { music.play().catch(function () {}); }
    musicFade = window.setInterval(function () {
      var v = music.volume + (on ? 0.02 : -0.03);
      if (on && v >= MUSIC_VOLUME) { music.volume = MUSIC_VOLUME; window.clearInterval(musicFade); return; }
      if (!on && v <= 0) { music.volume = 0; music.pause(); window.clearInterval(musicFade); return; }
      music.volume = Math.max(0, Math.min(MUSIC_VOLUME, v));
    }, 80);
  }
  (function musicLoader() {
    var src = document.body.getAttribute('data-music');
    if (src === 'none' || !window.fetch) return;
    src = src || 'music.mp3';
    fetch(src, { method: 'HEAD' }).then(function (r) {
      if (!r.ok) return;
      music = new Audio(src); music.loop = true; music.volume = 0; music.preload = 'auto';
      function begin() {
        document.removeEventListener('pointerdown', begin, true); document.removeEventListener('keydown', begin, true);
        if (soundOn) fadeMusic(true);
      }
      document.addEventListener('pointerdown', begin, true); document.addEventListener('keydown', begin, true);
    }).catch(function () {});
  })();

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
    bell: function (a) {                  // a small shop bell, for leaving
      [0, 0.16].forEach(function (delay, k) {
        [1318.5, 1975.5, 2637].forEach(function (hz, i) {
          var o = a.createOscillator(), g = a.createGain(), at = a.currentTime + delay;
          o.type = 'sine'; o.frequency.value = hz * (k ? 0.997 : 1);
          g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime([0.08, 0.04, 0.02][i] * (k ? 0.6 : 1), at + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
          o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.95);
        });
      });
    },
    plop: function (a) {                  // something touching water
      var o = a.createOscillator(), g = a.createGain(), at = a.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(820, at); o.frequency.exponentialRampToValueAtTime(260, at + 0.12);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.16, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.22);
    },
    croak: function (a) {                 // a frog clearing its throat
      [0, 0.2].forEach(function (delay) {
        var o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), at = a.currentTime + delay;
        o.type = 'sawtooth'; o.frequency.setValueAtTime(150, at); o.frequency.linearRampToValueAtTime(118, at + 0.14);
        f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 2.5;
        var lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 38; lg.gain.value = 0.09;   // the rattle
        lfo.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.13, at + 0.02); g.gain.linearRampToValueAtTime(0.0001, at + 0.16);
        o.connect(f); f.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.17); lfo.start(at); lfo.stop(at + 0.17);
      });
    },
    coin: function (a) {                  // an arcade machine taking a coin
      [988, 1319, 1976].forEach(function (hz, i) {
        var o = a.createOscillator(), g = a.createGain(), at = a.currentTime + i * 0.07;
        o.type = 'square'; o.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.045, at + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
        o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.12);
      });
    },
    boing: function (a) {                 // a balloon bumped
      var o = a.createOscillator(), g = a.createGain(), at = a.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(180, at); o.frequency.exponentialRampToValueAtTime(420, at + 0.12);
      o.frequency.exponentialRampToValueAtTime(240, at + 0.32);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.12, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.36);
      o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.38);
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
    // a lily pad (or any spot marked "pad") with nothing to open is simply empty: it ripples, and that is all
    if (spot.hasAttribute('data-poke')) return;           // a toy: it only wobbles, so it is not in the phone list
    if ((spot.classList.contains('pad') || spot.classList.contains('arm') || spot.classList.contains('cabinet')) && !(spot.hasAttribute('data-opens') || spot.hasAttribute('data-book'))) {
      spot.classList.add('unlit'); spot.setAttribute('tabindex', '-1'); spot.setAttribute('aria-disabled', 'true'); return;
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
  // the cards opened one from another (a map, then a place on it): the ✕ steps back through them
  var trail = [];

  panels.forEach(function (p) {
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    var heading = p.querySelector('h2');
    if (heading) { if (!heading.id) heading.id = p.id + '-title'; p.setAttribute('aria-labelledby', heading.id); }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'panel-close';
    x.setAttribute('aria-label', 'Close'); x.innerHTML = '&times;'; x.addEventListener('click', stepBack);
    p.insertBefore(x, p.firstChild);
    var back = document.createElement('button'); back.type = 'button'; back.className = 'panel-back';
    back.textContent = '~ back to the room ~'; back.addEventListener('click', close);
    p.appendChild(back);
    holder.appendChild(p);
  });
  document.body.appendChild(holder);
  holder.addEventListener('click', function (e) { if (e.target === holder) stepBack(); });

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
  // a book opened from a card (a portrait on a place card) closes back to that card.
  // With opts.cardOnly the book shows just one card from inside it, without the book behind
  var bookFrom = null;
  function showBook(url, name, opts) {
    opts = opts || {};
    bookFrom = openPanel ? openPanel.id : null;
    if (openPanel) { openPanel.classList.remove('is-open'); openPanel = null; }
    holder.classList.toggle('card-only', !!opts.cardOnly);
    removeBook();
    bookClose = document.createElement('button'); bookClose.type = 'button'; bookClose.className = 'book-close';
    bookClose.textContent = 'CLOSE THE BOOK'; bookClose.addEventListener('click', stepBack);
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
  window.addEventListener('message', function (e) { if (e.data === 'rc-close-book' && bookFrame) stepBack(); });
  window.rcRoom = { showBook: function (url, name, opts) { showBook(url, name, opts); }, show: function (id) { show(id); }, play: function (n) { play(n); } };

  // once the room has loaded, quietly fetch its books and the book machinery,
  // so the first book opened does not have to wait for the internet
  var assetsBase = (thisScript && thisScript.src || '').replace(/rooms\.js(\?.*)?$/, '');
  onLoaded(function () {
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

  // pictures in a card load at once when it opens, and are repainted as they arrive,
  // so a card never shows a blank space, or for a moment another card's pictures
  function wakePictures(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('img'), function (img) {
      if (img.getAttribute('loading') === 'lazy') img.loading = 'eager';
      if (!img.complete) img.addEventListener('load', function () {
        img.style.outline = '1px solid transparent';
        window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { img.style.outline = ''; }); });
      }, { once: true });
    });
  }
  // once the room has loaded and settled, quietly fetch every card's pictures, so they are ready before anyone asks
  onLoaded(function () {
    window.setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.panel img[loading="lazy"]'), function (img) { img.loading = 'eager'; });
    }, 1500);
  });
  // a panel with data-md="words/cv.md" takes its words (and, if the file says so, its pictures and buttons) from that file
  var mdCache = window.rcMdCache = window.rcMdCache || {};
  function fetchText(src) {
    if (!mdCache[src]) mdCache[src] = fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
    return mdCache[src];
  }
  function fillWords(p, text) {
    var src = p.getAttribute('data-md'), md = window.rcMarkdown;
    var box = p.querySelector('.md-body');
    if (!box) { box = document.createElement('div'); box.className = 'md-body'; p.insertBefore(box, p.querySelector('.panel-back')); }
    if (!md || !md.card) { box.innerHTML = '<p>' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>'; return; }
    var c = md.card(text, md.folder(src));
    box.innerHTML = c.html;
    var back = p.getAttribute('data-back');                      // e.g. "BACK TO THE DRAWINGS | #drawings"
    if (back && !box.querySelector('.plate-back')) box.insertAdjacentHTML('beforeend', md.plate(back, '', 'plate-back'));
    var h = box.querySelector('h2');
    if (h && !p.getAttribute('aria-labelledby')) { h.id = p.id + '-title'; p.setAttribute('aria-labelledby', h.id); }
    if (p.getAttribute('data-kind') === 'scroll' || p.classList.contains('parchment')) {
      var first = box.querySelector(':scope > p:not(.facts):not(.series):not(.centered):not(.credits)');
      if (first && !p.querySelector('p.first')) first.classList.add('first');
    }
    Array.prototype.forEach.call(box.querySelectorAll('img:not(.zoomable)'), function (img) { if (!img.closest('.series')) img.classList.add('zoomable'); });
    wakePictures(box);
  }
  function loadWords(p) {
    var src = p.getAttribute('data-md');
    if (!src || p.hasAttribute('data-md-loaded') || !window.fetch) return;
    p.setAttribute('data-md-loaded', '');
    var box = p.querySelector('.md-body');
    if (!box) { box = document.createElement('div'); box.className = 'md-body'; p.insertBefore(box, p.querySelector('.panel-back')); }
    if (!box.innerHTML.trim()) box.innerHTML = '<p class="centered small-note">~ unrolling ~</p>';
    fetchText(src).then(function (t) { fillWords(p, t); }).catch(function () {
      box.innerHTML = '<p class="centered small-note">These words could not be found. Check the file name: ' + src.replace(/</g, '') + '</p>';
      p.removeAttribute('data-md-loaded'); delete mdCache[src];
    });
  }
  // a moment after the room has loaded, every card quietly reads its words, so nothing waits when it opens
  onLoaded(function () {
    window.setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll('.panel[data-md]'), loadWords); }, 900);
  });
  function show(id) {
    var p = document.getElementById(id);
    if (!p || !p.classList.contains('panel')) { glideHome(); return; }
    removeBook();
    if (openPanel) openPanel.classList.remove('is-open');
    wakePictures(p); loadWords(p);
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
      trail = [];
      if (book) showBook(book, spot.getAttribute('aria-label')); else show(id);
    }, glideTo(spot));
  }
  // ✕, Esc or a click beside the card: back to the card it was opened from, or to the room
  function stepBack() {
    if (bookFrame && bookFrom) { var back = bookFrom; bookFrom = null; removeBook(); holder.classList.remove('card-only'); play('paper'); show(back); return; }
    if (openPanel && !bookFrame && trail.length) { play('paper'); show(trail.pop()); return; }
    close();
  }
  function close() {
    trail = []; bookFrom = null; holder.classList.remove('card-only');
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (openPanel || bookFrame || pending)) stepBack(); });

  // links such as <a href="#cv"> open that panel, from the top bar or from inside another panel
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null; if (!a) return;
    var id = a.getAttribute('href').slice(1), target = id && document.getElementById(id);
    if (!target || !target.classList.contains('panel')) return;
    e.preventDefault();
    var spot = view.querySelector('.spot[data-opens="' + id + '"]');
    if (openPanel || bookFrame || !spot) {
      play('paper'); if (!openPanel && !bookFrame) lastFocus = a;
      var at = trail.indexOf(id);
      if (at > -1) trail = trail.slice(0, at);                    // going back to a card already on the way
      else if (openPanel && openPanel.id !== id) trail.push(openPanel.id);
      show(id);
    }
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
    // one area "l t r b", or several separated by commas: "l t r b, l t r b"
    var boxes = attr.split(',').map(function (part) { return part.trim().split(/\s+/).map(Number); });
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
      var unit = W / 1600;
      for (var i = 0; i < n; i++) {
        var box = boxes[i % boxes.length];
        var x0 = box[0] / 100 * W, y0 = box[1] / 100 * H, bw = (box[2] - box[0]) / 100 * W, bh = (box[3] - box[1]) / 100 * H;
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

  // a little canvas over the picture, shared by the effects below
  function effectCanvas() {
    var canvas = document.createElement('canvas'); canvas.className = 'room-dust'; canvas.setAttribute('aria-hidden', 'true');
    view.appendChild(canvas);
    var g = canvas.getContext('2d');
    var box = { W: 0, H: 0 };
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      box.W = canvas.width = Math.round(view.clientWidth * dpr); box.H = canvas.height = Math.round(view.clientHeight * dpr);
    }
    size(); window.addEventListener('resize', size);
    return { g: g, box: box };
  }
  function animate(draw) {
    var running = false, last = 0;
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      draw(now / 1000, dt);
      window.requestAnimationFrame(frame);
    }
    function start() { if (running || document.hidden) return; running = true; last = performance.now(); window.requestAnimationFrame(frame); }
    start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else start(); });
  }
  function readBox(name) {
    var attr = room.getAttribute(name);
    if (!attr || reduceMotion) return null;
    return attr.split(/\s+/).map(function (v) { return Number(v) / 100; });
  }

  // petals: data-petals="left top right bottom" is where they fall from (in % of the picture); they drift down from there
  (function petals() {
    var b = readBox('data-petals'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var list = [], n = 14;
    function spawn(p, anywhere) {
      p.x = b[0] + Math.random() * (b[2] - b[0]); p.y = anywhere ? b[1] + Math.random() * 0.5 : b[1] + Math.random() * (b[3] - b[1]);
      p.floor = 0.62 + Math.random() * 0.3; p.vy = 0.018 + Math.random() * 0.02; p.vx = 0.004 + Math.random() * 0.01;
      p.spin = 1 + Math.random() * 2.5; p.phase = Math.random() * 6.28; p.size = 0.7 + Math.random() * 0.6; p.life = 0;
      p.hue = Math.random() < 0.75 ? [196, 158, 222] : [236, 214, 240];
    }
    for (var i = 0; i < n; i++) { var p = {}; spawn(p, true); list.push(p); }
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, unit = W / 1600;
      g.clearRect(0, 0, W, H);
      for (var i = 0; i < n; i++) {
        var p = list[i];
        p.life += dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 1.1 + p.phase) * 0.012) * dt;
        if (p.y > p.floor) spawn(p, false);
        var fade = Math.min(1, p.life * 1.5, (p.floor - p.y) * 12);
        var flutter = Math.cos(t * p.spin + p.phase);                       // turning in the air: wide, then edge-on
        g.save(); g.translate(p.x * W, p.y * H); g.rotate(Math.sin(t * 0.7 + p.phase) * 1.2);
        g.scale(Math.max(0.15, Math.abs(flutter)), 1);
        g.fillStyle = 'rgba(' + p.hue.join(',') + ',' + (0.85 * fade).toFixed(3) + ')';
        g.beginPath(); g.ellipse(0, 0, 5 * unit * p.size * 1.6, 3 * unit * p.size * 1.6, 0, 0, 6.2832); g.fill();
        g.restore();
      }
    });
  })();

  // sparkles: data-sparkle="left top right bottom", brief glints of light, as on falling water
  (function sparkles() {
    var b = readBox('data-sparkle'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var list = [], n = 9;
    function spawn(s) { s.x = b[0] + Math.random() * (b[2] - b[0]); s.y = b[1] + Math.random() * (b[3] - b[1]); s.age = -Math.random() * 1.2; s.dur = 0.35 + Math.random() * 0.5; s.size = 0.6 + Math.random() * 0.8; }
    for (var i = 0; i < n; i++) { var s = {}; spawn(s); list.push(s); }
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, unit = W / 1600;
      g.clearRect(0, 0, W, H);
      for (var i = 0; i < n; i++) {
        var s = list[i]; s.age += dt;
        if (s.age > s.dur) { spawn(s); continue; }
        if (s.age < 0) continue;
        var k = Math.sin(s.age / s.dur * Math.PI), r = 7 * unit * s.size * k, x = s.x * W, y = s.y * H;
        g.fillStyle = 'rgba(255,255,248,' + (0.9 * k).toFixed(3) + ')';
        g.beginPath();                                                        // a four-pointed glint
        g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
        g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
      }
    });
  })();

  // dragonflies: data-dragonflies="left top right bottom", two of them, darting and hovering
  (function dragonflies() {
    var b = readBox('data-dragonflies'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var flies = [];
    function aim(f) { f.tx = b[0] + Math.random() * (b[2] - b[0]); f.ty = b[1] + Math.random() * (b[3] - b[1]); f.rest = 0.8 + Math.random() * 2.8; }
    for (var i = 0; i < 2; i++) { var f = { x: b[0] + Math.random() * (b[2] - b[0]), y: b[1] + Math.random() * (b[3] - b[1]), ang: 0, phase: Math.random() * 6 }; aim(f); flies.push(f); }
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1250;
      g.clearRect(0, 0, W, H);
      flies.forEach(function (f) {
        var dx = f.tx - f.x, dy = (f.ty - f.y) * H / W, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.004) { f.rest -= dt; if (f.rest <= 0) aim(f); }
        else { var sp = Math.min(d, 0.22 * dt); f.x += dx / d * sp; f.y += dy / d * sp * W / H; f.ang = Math.atan2(dy, dx); }
        var x = f.x * W, y = (f.y + Math.sin(t * 2.3 + f.phase) * 0.003) * H;
        g.save(); g.translate(x, y); g.rotate(f.ang);
        var flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 38 + f.phase));         // wings, a blur of glass
        g.fillStyle = 'rgba(225,240,255,' + (0.42 * flap).toFixed(3) + ')';
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (w) {
          g.beginPath(); g.ellipse(w[0] * 2.5 * u + 1 * u, w[1] * 8 * u, 3 * u, 9 * u, w[1] * (0.35 + w[0] * 0.15), 0, 6.2832); g.fill();
        });
        g.strokeStyle = 'rgba(30,110,140,0.95)'; g.lineWidth = 2.6 * u; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-13 * u, 0); g.lineTo(9 * u, 0); g.stroke();                 // body
        g.fillStyle = 'rgba(25,95,125,1)'; g.beginPath(); g.arc(10 * u, 0, 2.6 * u, 0, 6.2832); g.fill();   // head
        g.restore();
      });
    });
  })();

  // ripples on water: data-ripples="water-map.png" is a small black-and-white map of where the water is;
  // a click on the water ripples, and now and then the pond ripples by itself.
  // data-ripple-spots="x y  x y ..." (in %) are places that ripple more often, like round a duck
  var ripple = null;
  (function ripples() {
    var src = room.getAttribute('data-ripples'); if (!src) return;
    var c = effectCanvas(); if (!c.g) return;
    var map = null, mw = 0, mh = 0;
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); mw = cv.width = img.naturalWidth; mh = cv.height = img.naturalHeight;
      var g = cv.getContext('2d'); g.drawImage(img, 0, 0); map = g.getImageData(0, 0, mw, mh).data;
    };
    img.src = src;
    function isWater(fx, fy) {
      if (!map) return false;
      var x = Math.floor(fx * mw), y = Math.floor(fy * mh);
      if (x < 0 || y < 0 || x >= mw || y >= mh) return false;
      return map[(y * mw + x) * 4] > 128;
    }
    var rings = [], glints = [];
    ripple = function (fx, fy, size) { rings.push({ x: fx, y: fy, age: 0, size: size || 1 }); };
    var hot = (room.getAttribute('data-ripple-spots') || '').trim().split(/\s+/).map(Number), nextHot = 2, nextRandom = 1.5;
    view.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.spot:not(.unlit)')) return;
      var r = view.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      if (isWater(fx, fy)) { ripple(fx, fy, 1.2); play('plop'); }
    });
    if (reduceMotion) return;
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      nextRandom -= dt; nextHot -= dt;
      if (nextRandom <= 0 && map) {                                          // a fish, a falling seed
        for (var k = 0; k < 20; k++) { var fx = Math.random(), fy = Math.random(); if (isWater(fx, fy)) { ripple(fx, fy, 0.55); break; } }
        nextRandom = 2 + Math.random() * 4;
      }
      if (nextHot <= 0 && hot.length >= 2) {
        var n = Math.floor(Math.random() * hot.length / 2) * 2;
        ripple(hot[n] / 100 + (Math.random() - 0.5) * 0.01, hot[n + 1] / 100, 0.8); nextHot = 2.5 + Math.random() * 3;
      }
      if (map && glints.length < 7 && Math.random() < 0.25) {                // light on the water
        for (var j = 0; j < 10; j++) { var gx = Math.random(), gy = Math.random(); if (isWater(gx, gy)) { glints.push({ x: gx, y: gy, age: 0, dur: 0.5 + Math.random() * 0.7 }); break; } }
      }
      g.lineWidth = 1.6 * u;
      rings = rings.filter(function (r) {
        r.age += dt; var life = 2.6;
        if (r.age > life) return false;
        for (var q = 0; q < 3; q++) {
          var a = r.age - q * 0.32; if (a <= 0) continue;
          var rad = (10 + a * 34) * u * r.size, alpha = 0.55 * (1 - r.age / life) * (1 - q * 0.25);
          g.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
          g.beginPath(); g.ellipse(r.x * W, r.y * H, rad, rad * 0.32, 0, 0, 6.2832); g.stroke();
        }
        return true;
      });
      glints = glints.filter(function (s) {
        s.age += dt; if (s.age > s.dur) return false;
        var k = Math.sin(s.age / s.dur * Math.PI);
        g.fillStyle = 'rgba(255,255,250,' + (0.75 * k).toFixed(3) + ')';
        g.beginPath(); g.ellipse(s.x * W, s.y * H, 6 * u * k, 1.4 * u * k, 0, 0, 6.2832); g.fill();
        return true;
      });
    });
  })();
  // a lily pad ripples where it sits, lit or not
  view.querySelectorAll('.spot.pad').forEach(function (pad) {
    pad.addEventListener('click', function () {
      var l = parseFloat(pad.style.left), t = parseFloat(pad.style.top), w = parseFloat(pad.style.width), h = parseFloat(pad.style.height);
      if (ripple) ripple((l + w / 2) / 100, (t + h * 0.6) / 100, 2.4);
      if (pad.classList.contains('unlit')) play('plop');
    });
  });

  // fairy sparks: data-sparks="left top right bottom", little lights drifting in the sunbeams.
  // When something with data-glow is hovered, one spark flies over and settles on it.
  var callSpark = null, freeSpark = null;
  (function sparks() {
    var b = readBox('data-sparks'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var list = [], n = 9, called = null;
    function drift(s) { s.tx = b[0] + Math.random() * (b[2] - b[0]); s.ty = b[1] + Math.random() * (b[3] - b[1]); }
    for (var i = 0; i < n; i++) { var s = { x: b[0] + Math.random() * (b[2] - b[0]), y: b[1] + Math.random() * (b[3] - b[1]), phase: Math.random() * 6.28, size: 0.8 + Math.random() * 0.6 }; drift(s); list.push(s); }
    callSpark = function (fx, fy) {
      var best = null, bd = 9;
      list.forEach(function (s) { var d = Math.abs(s.x - fx) + Math.abs(s.y - fy); if (d < bd && s !== called) { bd = d; best = s; } });
      if (called) drift(called);
      called = best; if (best) { best.tx = fx; best.ty = fy; best.held = true; }
    };
    freeSpark = function () { if (called) { called.held = false; drift(called); called = null; } };
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      list.forEach(function (s) {
        var dx = s.tx - s.x, dy = s.ty - s.y, d = Math.sqrt(dx * dx + dy * dy);
        var speed = s.held ? 0.5 : 0.012;
        if (d > 0.002) { var st = Math.min(d, speed * dt); s.x += dx / d * st; s.y += dy / d * st; }
        else if (!s.held) drift(s);
        var hover = s.held && d < 0.01;
        var x = (s.x + Math.sin(t * 0.9 + s.phase) * (hover ? 0.003 : 0.008)) * W, y = (s.y + Math.cos(t * 1.1 + s.phase) * (hover ? 0.004 : 0.006)) * H;
        var tw = 0.55 + 0.45 * Math.sin(t * (hover ? 6 : 2.2) + s.phase), r = (hover ? 15 : 10) * u * s.size;
        var grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,255,235,' + (0.95 * tw).toFixed(3) + ')');
        grad.addColorStop(0.3, 'rgba(255,236,160,' + (0.5 * tw).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,220,120,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        g.strokeStyle = 'rgba(255,255,240,' + (0.7 * tw).toFixed(3) + ')'; g.lineWidth = 1.1 * u;   // a tiny cross of light
        g.beginPath(); g.moveTo(x - r * 0.7, y); g.lineTo(x + r * 0.7, y); g.moveTo(x, y - r * 0.7); g.lineTo(x, y + r * 0.7); g.stroke();
      });
    });
  })();

  // falling leaves: data-leaves="left top right bottom", where the canopy is; a leaf drops now and then
  (function leaves() {
    var b = readBox('data-leaves'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var MAX = 5, leaves = [], wait = 0.4;              // up to five leaves in the air; the first falls almost at once
    var colours = [[176, 168, 64], [150, 160, 60], [196, 160, 70], [130, 150, 70], [204, 140, 60]];
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      wait -= dt;
      if (wait <= 0 && leaves.length < MAX) {
        leaves.push({ x: b[0] + Math.random() * (b[2] - b[0]), y: b[1] + Math.random() * (b[3] - b[1]), age: 0, phase: Math.random() * 6,
          col: colours[Math.floor(Math.random() * colours.length)], floor: 0.62 + Math.random() * 0.28, size: 0.8 + Math.random() * 0.5, speed: 0.026 + Math.random() * 0.014 });
        wait = 0.5 + Math.random() * 1.1;
      }
      leaves = leaves.filter(function (leaf) {
        leaf.age += dt; leaf.y += leaf.speed * dt; leaf.x += Math.sin(leaf.age * 1.4 + leaf.phase) * 0.03 * dt + 0.004 * dt;
        var fade = Math.min(1, leaf.age * 1.2, (leaf.floor - leaf.y) * 10);
        if (fade <= 0) return false;
        var s = u * leaf.size;
        g.save(); g.translate(leaf.x * W, leaf.y * H); g.rotate(Math.sin(leaf.age * 1.4 + leaf.phase) * 0.9);
        g.scale(Math.max(0.25, Math.abs(Math.cos(leaf.age * 1.9 + leaf.phase))), 1);
        g.fillStyle = 'rgba(' + leaf.col.join(',') + ',' + (0.95 * fade).toFixed(3) + ')';
        g.beginPath(); g.moveTo(0, -11 * s); g.quadraticCurveTo(8 * s, 0, 0, 11 * s); g.quadraticCurveTo(-8 * s, 0, 0, -11 * s); g.fill();
        g.strokeStyle = 'rgba(110,100,40,' + (0.6 * fade).toFixed(3) + ')'; g.lineWidth = 0.9 * s;
        g.beginPath(); g.moveTo(0, -10 * s); g.lineTo(0, 12 * s); g.stroke();
        g.restore();
        return true;
      });
    });
  })();

  // lily pads (or anything marked "pad") that hold something shimmer: little golden motes rise from them
  (function padGlitter() {
    var pads = Array.prototype.filter.call(view.querySelectorAll('.spot.pad'), function (p) { return !p.classList.contains('unlit'); });
    if (!pads.length || reduceMotion) return;
    var c = effectCanvas(); if (!c.g) return;
    var boxes = pads.map(function (p) { return [parseFloat(p.style.left) / 100, parseFloat(p.style.top) / 100, parseFloat(p.style.width) / 100, parseFloat(p.style.height) / 100]; });
    var motes = [];
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      boxes.forEach(function (b) {
        if (Math.random() < dt * 9) motes.push({ x: b[0] + b[2] * (0.15 + Math.random() * 0.7), y: b[1] + b[3] * (0.3 + Math.random() * 0.5),
          vy: 0.012 + Math.random() * 0.014, age: 0, life: 1.4 + Math.random() * 1.4, ph: Math.random() * 6, size: 0.6 + Math.random() * 0.8 });
      });
      motes = motes.filter(function (m) {
        m.age += dt; if (m.age > m.life) return false;
        m.y -= m.vy * dt; var x = (m.x + Math.sin(m.age * 2.4 + m.ph) * 0.003) * W, y = m.y * H;
        var k = Math.sin(Math.PI * m.age / m.life) * (0.6 + 0.4 * Math.sin(t * 9 + m.ph)), r = 11 * u * m.size;
        g.globalCompositeOperation = 'lighter';
        var grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,252,225,' + k.toFixed(3) + ')');
        grad.addColorStop(0.25, 'rgba(255,220,110,' + (0.6 * k).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,200,80,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        g.strokeStyle = 'rgba(255,255,240,' + (0.8 * k).toFixed(3) + ')'; g.lineWidth = 1.2 * u;      // a tiny cross of light
        g.beginPath(); g.moveTo(x - r * 0.9, y); g.lineTo(x + r * 0.9, y); g.moveTo(x, y - r * 0.9); g.lineTo(x, y + r * 0.9); g.stroke();
        g.globalCompositeOperation = 'source-over';
        return true;
      });
    });
  })();

  // data-glow="some-id" on a spot: while it is hovered, the element with that id glows (and a spark comes, if there are sparks)
  view.querySelectorAll('.spot[data-glow]').forEach(function (spot) {
    var el = document.getElementById(spot.getAttribute('data-glow')); if (!el) return;
    function on() {
      el.classList.add('is-glowing');
      if (callSpark) {
        var l = parseFloat(spot.style.left), t = parseFloat(spot.style.top), w = parseFloat(spot.style.width), h = parseFloat(spot.style.height);
        var tip = spot.getAttribute('data-tip') === 'right' ? l + w * 0.9 : l + w * 0.1;   // the pointed end of a signpost arm
        callSpark(tip / 100, (t + h * 0.45) / 100);
      }
    }
    function off() { el.classList.remove('is-glowing'); if (freeSpark) freeSpark(); }
    spot.addEventListener('mouseenter', on); spot.addEventListener('focus', on);
    spot.addEventListener('mouseleave', off); spot.addEventListener('blur', off);
  });

  // twinkling lights: data-lights="x,y x,y ..." (in %), each a bulb painted in the picture
  (function lights() {
    var attr = room.getAttribute('data-lights'); if (!attr || reduceMotion) return;
    var c = effectCanvas(); if (!c.g) return;
    var bulbs = attr.trim().split(/\s+/).map(function (p) { var v = p.split(','); return { x: +v[0] / 100, y: +v[1] / 100, phase: Math.random() * 6.28, speed: 0.6 + Math.random() * 1.6 }; });
    c.g.canvas.style.mixBlendMode = 'screen';
    animate(function (t) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      bulbs.forEach(function (b) {
        var k = Math.pow(0.5 + 0.5 * Math.sin(t * b.speed + b.phase), 4);         // mostly steady, now and then a bright twinkle
        if (k < 0.04) return;
        var r = 16 * u, x = b.x * W, y = b.y * H;
        var grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,248,215,' + (0.85 * k).toFixed(3) + ')');
        grad.addColorStop(0.35, 'rgba(255,214,120,' + (0.4 * k).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,190,90,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      });
    });
  })();

  // popcorn: data-popcorn="left top right bottom", a kernel hops up now and then
  (function popcorn() {
    var b = readBox('data-popcorn'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var list = [], wait = 0.5;
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      wait -= dt;
      if (wait <= 0) {
        list.push({ x: b[0] + Math.random() * (b[2] - b[0]), y: b[3], vx: (Math.random() - 0.5) * 0.03, vy: -(0.12 + Math.random() * 0.1), age: 0, spin: Math.random() * 6 });
        wait = 0.25 + Math.random() * 0.9;
      }
      list = list.filter(function (k) {
        k.age += dt; k.vy += 0.5 * dt; k.x += k.vx * dt; k.y += k.vy * dt;
        if (k.y > b[3] && k.age > 0.1) return false;
        var x = k.x * W, y = Math.max(b[1], k.y) * H, r = 4.2 * u;
        g.save(); g.translate(x, y); g.rotate(k.spin + k.age * 6);
        g.fillStyle = 'rgba(255,250,228,0.95)';
        g.beginPath(); g.arc(-r * 0.5, 0, r, 0, 6.2832); g.arc(r * 0.5, -r * 0.3, r * 0.9, 0, 6.2832); g.arc(0, r * 0.5, r * 0.8, 0, 6.2832); g.fill();
        g.restore();
        return true;
      });
    });
  })();

  // embers: data-embers="left top right bottom", the fire; sparks rise from its bottom and fade as they climb
  (function embers() {
    var b = readBox('data-embers'); if (!b) return;
    var c = effectCanvas(); if (!c.g) return;
    var list = [];
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      if (list.length < 22 && Math.random() < 0.35) {
        list.push({ x: b[0] + Math.random() * (b[2] - b[0]), y: b[3], vy: 0.05 + Math.random() * 0.07, phase: Math.random() * 6, age: 0, life: 1.2 + Math.random() * 1.8, size: 0.6 + Math.random() * 0.9 });
      }
      list = list.filter(function (e) {
        e.age += dt; if (e.age > e.life) return false;
        e.y -= e.vy * dt; e.x += Math.sin(e.age * 3 + e.phase) * 0.006 * dt;
        var k = 1 - e.age / e.life, flick = 0.6 + 0.4 * Math.sin(t * 20 + e.phase);
        var x = e.x * W, y = e.y * H, r = 3.2 * u * e.size;
        var grad = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
        grad.addColorStop(0, 'rgba(255,236,170,' + (k * flick).toFixed(3) + ')');
        grad.addColorStop(0.35, 'rgba(255,150,50,' + (0.7 * k * flick).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r * 2.4, 0, 6.2832); g.fill();
        return true;
      });
    });
  })();

  // smoke: data-smoke="x,y x,y ..." (in %), thin smoke curling up from those points, like chimneys
  (function smoke() {
    var attr = room.getAttribute('data-smoke'); if (!attr || reduceMotion) return;
    var c = effectCanvas(); if (!c.g) return;
    var vents = attr.trim().split(/\s+/).map(function (p) { var v = p.split(','); return { x: +v[0] / 100, y: +v[1] / 100, wait: Math.random() * 0.8 }; });
    var puffs = [];
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      vents.forEach(function (v) {
        v.wait -= dt;
        if (v.wait <= 0) { puffs.push({ x: v.x, y: v.y, age: 0, life: 2.6 + Math.random() * 1.4, drift: 0.004 + Math.random() * 0.004, phase: Math.random() * 6 }); v.wait = 0.35 + Math.random() * 0.35; }
      });
      puffs = puffs.filter(function (p) {
        p.age += dt; if (p.age > p.life) return false;
        var k = p.age / p.life, x = (p.x + Math.sin(p.age * 1.6 + p.phase) * 0.002 + p.drift * k) * W, y = (p.y - 0.035 * k) * H;
        var r = (2.2 + 7 * k) * u, a = 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k);
        var grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(236,230,220,' + a.toFixed(3) + ')'); grad.addColorStop(1, 'rgba(236,230,220,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        return true;
      });
    });
  })();

  // snow: data-snow="left top right bottom", snow falling behind a window.
  // Several panes of glass can be given, separated by commas; the snow shows only on them
  (function snow() {
    var attr = room.getAttribute('data-snow'); if (!attr || reduceMotion) return;
    var panes = attr.split(',').map(function (part) { return part.trim().split(/\s+/).map(function (v) { return Number(v) / 100; }); });
    var b = [Math.min.apply(null, panes.map(function (q) { return q[0]; })), Math.min.apply(null, panes.map(function (q) { return q[1]; })),
             Math.max.apply(null, panes.map(function (q) { return q[2]; })), Math.max.apply(null, panes.map(function (q) { return q[3]; }))];
    var c = effectCanvas(); if (!c.g) return;
    var flakes = [];
    for (var i = 0; i < 60; i++) flakes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), sp: 0.05 + Math.random() * 0.06, ph: Math.random() * 6 });
    animate(function (t, dt) {
      var g = c.g, W = c.box.W, H = c.box.H, u = W / 1600;
      g.clearRect(0, 0, W, H);
      g.save(); g.beginPath();
      panes.forEach(function (q) { g.rect(q[0] * W, q[1] * H, (q[2] - q[0]) * W, (q[3] - q[1]) * H); });
      g.clip();
      flakes.forEach(function (f) {
        f.y += f.sp * dt * f.s; if (f.y > 1) { f.y = 0; f.x = Math.random(); }
        var x = (b[0] + (f.x + Math.sin(t * 0.8 + f.ph) * 0.03) * (b[2] - b[0])) * W, y = (b[1] + f.y * (b[3] - b[1])) * H;
        g.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.35 * f.s / 1.5).toFixed(3) + ')';
        g.beginPath(); g.arc(x, y, (0.9 + 1.4 * f.s) * u, 0, 6.2832); g.fill();
      });
      g.restore();
    });
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
      if (count >= TOTAL_CIRCLES) { finale(isNew); return; }
      say(count >= TOTAL_CIRCLES
        ? 'You have found every hidden Red Circle. All ' + TOTAL_CIRCLES + ' of ' + TOTAL_CIRCLES + '.'
        : (isNew ? 'You found the Red Circle hidden in ' + realmName + '. ' : 'The Red Circle of ' + realmName + '. ') +
          count + ' of ' + TOTAL_CIRCLES + ' found.');
    });
  }

  // all seven found: red circles rain down, and a note opens. The note's words live in assets/seven-of-seven.md
  function finale(firstTime) {
    if (!reduceMotion) {
      var cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
      var g = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
      var logo = new Image(); logo.src = assetsBase + 'img/rc-logo-small.png';
      var bits = [];
      for (var i = 0; i < 140; i++) bits.push({ x: Math.random(), y: -Math.random() * 0.9 - 0.05, vy: 0.12 + Math.random() * 0.2, vx: (Math.random() - 0.5) * 0.05,
        r: (8 + Math.random() * 22) * dpr, spin: Math.random() * 6, vs: (Math.random() - 0.5) * 4, phase: Math.random() * 6 });
      var began = performance.now(), last = began;
      (function frame(now) {
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        var age = (now - began) / 1000, fade = Math.min(1, Math.max(0, 6.5 - age));
        g.clearRect(0, 0, cv.width, cv.height);
        bits.forEach(function (b) {
          b.y += b.vy * dt; b.x += (b.vx + Math.sin(age * 2 + b.phase) * 0.03) * dt; b.spin += b.vs * dt;
          var x = b.x * cv.width, y = b.y * cv.height;
          g.save(); g.globalAlpha = fade; g.translate(x, y); g.rotate(b.spin); g.scale(Math.max(0.2, Math.abs(Math.cos(age * 2.5 + b.phase))), 1);
          if (logo.complete && logo.naturalWidth) g.drawImage(logo, -b.r, -b.r, b.r * 2, b.r * 2);
          else { g.strokeStyle = '#B03030'; g.lineWidth = b.r * 0.22; g.beginPath(); g.arc(0, 0, b.r * 0.8, 0.3, 6.0); g.stroke(); }
          g.restore();
        });
        if (age < 7) window.requestAnimationFrame(frame); else document.body.removeChild(cv);
      })(began);
    }
    play('chime'); window.setTimeout(function () { play('chime'); }, 350);
    var veil = document.createElement('div'); veil.className = 'seven';
    veil.innerHTML = '<div class="seven-card" role="dialog" aria-label="Seven of seven"><img class="seven-logo" src="' + assetsBase + 'img/rc-logo.png" alt="">' +
      '<div class="kicker">' + (firstTime ? 'the last one' : 'all seven, again') + '</div><h2>Seven of Seven</h2><div class="seven-words"></div>' +
      '<button type="button" class="seven-close">BACK TO ' + realmName.toUpperCase() + '</button></div>';
    document.body.appendChild(veil);
    var words = veil.querySelector('.seven-words');
    words.innerHTML = '<p>You found every hidden Red Circle on the island.</p>';
    if (window.fetch) fetch(assetsBase + 'seven-of-seven.md').then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) { words.innerHTML = window.rcMarkdown ? window.rcMarkdown(t) : '<p>' + t.replace(/</g, '&lt;') + '</p>'; }).catch(function () {});
    window.setTimeout(function () { veil.classList.add('is-open'); }, reduceMotion ? 0 : 900);
    function shut() { veil.classList.remove('is-open'); window.setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, 500); }
    veil.querySelector('.seven-close').addEventListener('click', shut);
    veil.addEventListener('click', function (e) { if (e.target === veil) shut(); });
  }

  // ---------------------------------------------------------- 7. PICTURES THAT OPEN LARGE
  // any <img class="zoomable"> inside a panel opens over everything; a click anywhere closes it
  var zoom = document.createElement('div'); zoom.className = 'zoom'; zoom.setAttribute('role', 'dialog');
  var zoomImg = document.createElement('img'); zoomImg.alt = ''; zoom.appendChild(zoomImg);
  var zoomCap = document.createElement('p'); zoom.appendChild(zoomCap);
  document.body.appendChild(zoom);
  function unzoom() { zoom.classList.remove('is-open'); }
  zoom.addEventListener('click', unzoom);
  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('img.zoomable') : null; if (!img) return;
    zoomImg.src = img.getAttribute('data-large') || img.currentSrc || img.src; zoomImg.alt = img.alt || '';
    var fig = img.closest('figure'), cap = fig && fig.querySelector('figcaption');
    zoomCap.textContent = cap ? cap.textContent : '';
    zoom.classList.add('is-open'); play('paper');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && zoom.classList.contains('is-open')) { e.stopImmediatePropagation(); unzoom(); }
  }, true);

  // ---------------------------------------------------------- 8. THE POSTCARD
  // a room painted as a pinned postcard: <div class="postcard"> holds its front and its back,
  // and <button class="postcard-pin"> turns it over and back again
  var card = view.querySelector('.postcard'), pin = view.querySelector('.postcard-pin');
  if (card && pin) {
    var turning = false;
    function fitPerspective() { card.style.perspective = Math.round(view.clientWidth * 1.7) + 'px'; }
    fitPerspective(); window.addEventListener('resize', fitPerspective);
    function turn() {
      if (turning) return; turning = true;
      var toBack = !room.classList.contains('is-turned');
      if (toBack) close();
      room.classList.add('pin-up'); play('paper');
      window.setTimeout(function () {
        room.classList.toggle('is-turned', toBack);
        pin.setAttribute('aria-label', toBack ? 'Turn the postcard back' : 'Turn the postcard over');
      }, reduceMotion ? 0 : 320);
      window.setTimeout(function () { room.classList.remove('pin-up'); turning = false; }, reduceMotion ? 50 : 1750);
    }
    pin.setAttribute('aria-label', 'Turn the postcard over');
    pin.addEventListener('click', turn);
    var back = card.querySelector('.postcard-back');
    if (back) back.addEventListener('click', function () { if (room.classList.contains('is-turned')) turn(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && room.classList.contains('is-turned') && !openPanel && !bookFrame) turn();
    });
  }

  // ---------------------------------------------------------- 9. TOYS AND TICKETS
  // a spot with data-poke="#something, .other" makes those wobble for a moment (they need a "poke" animation in the css)
  view.querySelectorAll('.spot[data-poke]').forEach(function (spot) {
    spot.addEventListener('click', function () {
      play(spot.getAttribute('data-sound') || 'boing');
      document.querySelectorAll(spot.getAttribute('data-poke')).forEach(function (el) {
        el.classList.remove('is-poked'); void el.offsetWidth; el.classList.add('is-poked');
      });
    });
  });

  // a roll of riddle tickets: <div class="ticket-roll"> holds a ticket and, hidden, an <ol class="riddles">
  // where each <li data-answer="..."> is one riddle. Riddles come out in a shuffled order.
  document.querySelectorAll('.ticket-roll').forEach(function (roll) {
    var items = Array.prototype.slice.call(roll.querySelectorAll('.riddles li'));
    var ticket = roll.querySelector('.ticket'), front = roll.querySelector('.ticket-riddle'), back = roll.querySelector('.ticket-answer');
    var num = roll.querySelector('.ticket-number'), turnBtn = roll.querySelector('.ticket-turn'), nextBtn = roll.querySelector('.ticket-next');
    if (!items.length || !ticket) return;
    var order = [], at = 0;
    function shuffle() {
      order = items.map(function (_, i) { return i; });
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
      at = 0;
    }
    function deal(tear) {
      if (at >= order.length) shuffle();
      var li = items[order[at++]];
      function fill() {
        front.textContent = li.textContent.trim();
        back.textContent = li.getAttribute('data-answer') || '';
        if (num) num.textContent = 'No. ' + String(1000 + items.indexOf(li) * 37).slice(-4);
        ticket.classList.remove('is-turned');
        if (turnBtn) turnBtn.textContent = 'TURN IT OVER';
      }
      if (tear && !reduceMotion) {
        ticket.classList.add('is-torn'); play('paper');
        window.setTimeout(function () { fill(); ticket.classList.remove('is-torn'); ticket.classList.add('is-new'); window.setTimeout(function () { ticket.classList.remove('is-new'); }, 450); }, 380);
      } else fill();
    }
    shuffle(); deal(false);
    function turn() { ticket.classList.toggle('is-turned'); if (turnBtn) turnBtn.textContent = ticket.classList.contains('is-turned') ? 'BACK TO THE RIDDLE' : 'TURN IT OVER'; play('paper'); }
    if (turnBtn) turnBtn.addEventListener('click', turn);
    ticket.addEventListener('click', turn);
    if (nextBtn) nextBtn.addEventListener('click', function () { deal(true); });
  });
  });   // whenReady
})();
