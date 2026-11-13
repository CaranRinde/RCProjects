/* ============================================================
   THE BOOKS — the shared machinery of every book on rcprojects.net
   You never need to edit this file to write or add a book.
   A book page only needs its pages:

     <div class="stage"><div id="book">
       <div class="page cover" data-density="hard"> ... </div>     front cover
       <div class="page"> ... <nav class="toc" id="tocList"></nav> </div>   endpaper
       <div class="page" data-title="A chapter"> ... </div>        pages
       <div class="page cover" data-density="hard"> ... </div>     back cover
     </div></div>

   What this file does, in order:
     1. Knows whether the book is open on its own or inside a room
     2. Keeps the pages even   (adds a blank leaf if needed, so the last page always folds)
     3. Sizes the book to the window and builds it
     4. Numbers the pages and writes the Contents
     5. Keeps links, buttons and videos from turning the page
     6. Sound and music
     7. The seal on a "Write to Me" page
   ============================================================ */
(function () {
  'use strict';

  var bookEl = document.getElementById('book');
  if (!bookEl || !window.St) return;

  function store(key, value) {           // browser storage can be switched off; never crash on it
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------- 1. ALONE, OR INSIDE A ROOM?
  var embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  if (embedded) document.documentElement.classList.add('is-embedded');
  function askRoomToClose() { try { window.parent.postMessage('rc-close-book', '*'); } catch (e) {} }

  // ---------------------------------------------------------- 2. KEEP THE PAGES EVEN
  var pageEls = Array.prototype.slice.call(bookEl.querySelectorAll('.page'));
  if (pageEls.length % 2 === 1 && pageEls.length > 2) {
    var blank = document.createElement('div'); blank.className = 'page';
    blank.innerHTML = '<div class="page-inner"><div class="page-foot"><a class="page-num"></a><a class="toc-return">Contents</a></div></div>';
    var back = pageEls[pageEls.length - 1];
    back.parentNode.insertBefore(blank, back);
    pageEls.splice(pageEls.length - 1, 0, blank);
  }

  // ---------------------------------------------------------- 3. SIZE AND BUILD
  var BOOK_FILL = 0.96;   // how much of the available height the book uses
  var PAGE_RATIO = 0.72;  // page width : height, like a real hardback
  var stage = bookEl.parentNode;

  function fitBook() {
    var availH = (stage.clientHeight || window.innerHeight) - 24;
    var pageW = availH * BOOK_FILL * PAGE_RATIO;
    if (window.innerWidth < 620) bookEl.style.width = Math.min(pageW, window.innerWidth * 0.96) + 'px';
    else bookEl.style.width = Math.min(pageW * 2, window.innerWidth * 0.97) + 'px';
  }
  fitBook();
  window.addEventListener('resize', fitBook);

  var pageFlip = new St.PageFlip(bookEl, {
    width: 560, height: 778, size: 'stretch',
    minWidth: 260, maxWidth: 900, minHeight: 360, maxHeight: 1250,
    showCover: true, usePortrait: true, maxShadowOpacity: 0.5, mobileScrollSupport: false
  });
  pageFlip.loadFromHTML(pageEls);

  // some browsers hand the book slightly wrong measurements at birth; nudge it once everything has loaded
  window.addEventListener('load', function () {
    fitBook(); window.dispatchEvent(new Event('resize'));
    window.setTimeout(function () { fitBook(); window.dispatchEvent(new Event('resize')); }, 500);
  });

  // ---------------------------------------------------------- 4. NUMBERS AND THE CONTENTS
  // the cover and the endpaper carry no number; page 1 is the first page after them
  var ENDPAPER_INDEX = 1;

  function guard(el, action) {          // a click here is for this thing, not for turning the page
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
    if (action) el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); action(); });
  }

  var chapters = [];
  for (var i = ENDPAPER_INDEX + 1; i < pageEls.length - 1; i++) {
    var folio = i - ENDPAPER_INDEX;
    var numEl = pageEls[i].querySelector('.page-num');
    if (numEl) numEl.textContent = folio;
    var t = pageEls[i].getAttribute('data-title');
    if (t) chapters.push({ title: t, idx: i, folio: folio });
  }
  var toc = document.getElementById('tocList');
  if (toc) chapters.forEach(function (ch, n) {
    var row = document.createElement('a'); row.className = 'toc-row';
    var title = document.createElement('span'); title.className = 'toc-title'; title.textContent = (n + 1) + '.  ' + ch.title;
    var dots = document.createElement('span'); dots.className = 'toc-dots';
    var num = document.createElement('span'); num.className = 'toc-num'; num.textContent = ch.folio;
    row.appendChild(title); row.appendChild(dots); row.appendChild(num);
    guard(row, function () { pageFlip.flip(ch.idx); });
    toc.appendChild(row);
  });
  // the way back: the word in the corner, and (secretly) the page number itself
  Array.prototype.forEach.call(bookEl.querySelectorAll('.toc-return, .page-num'), function (el) {
    guard(el, function () { pageFlip.flip(ENDPAPER_INDEX); });
  });

  // ---------------------------------------------------------- 5. THINGS ON A PAGE THAT ARE NOT PAGE-TURNS
  Array.prototype.forEach.call(
    bookEl.querySelectorAll('a[href]:not(.toc-row):not(.seal-link), button, video, audio, iframe, input, textarea, .seal-address'),
    function (el) { guard(el); });
  // inside a room, a link to another part of the site must leave the room, not load inside the book's frame
  if (embedded) Array.prototype.forEach.call(bookEl.querySelectorAll('a[href]:not([target])'), function (a) {
    if (a.getAttribute('href').charAt(0) !== '#') a.setAttribute('target', '_top');
  });

  // a cover picture that cannot be found becomes a dashed circle instead of a broken image
  Array.prototype.forEach.call(bookEl.querySelectorAll('img.logo-cover'), function (img) {
    function missing() {
      img.classList.add('missing');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    }
    if (img.complete && img.naturalWidth === 0) missing(); else img.addEventListener('error', missing, { once: true });
  });

  // ---------------------------------------------------------- 6. SOUND AND MUSIC
  // one switch for the whole site, remembered between visits; set music with data-music="..." on <body>
  var toggle = document.getElementById('soundToggle');
  var audio = null, music = null;
  var MUSIC_URL = document.body.getAttribute('data-music') || '';
  var MUSIC_VOLUME = 0.22;
  function soundOn() { return store('rc-sound') !== 'off'; }
  function paintToggle() { if (toggle) toggle.textContent = soundOn() ? 'SOUND: ON' : 'SOUND: OFF'; }
  paintToggle();
  if (toggle) toggle.addEventListener('click', function () {
    store('rc-sound', soundOn() ? 'off' : 'on'); paintToggle();
    if (music) { if (soundOn()) music.play().catch(function () {}); else music.pause(); }
  });

  function pageTurnSound() {
    if (!soundOn()) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var buf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.28), audio.sampleRate);
      var d = buf.getChannelData(0);
      for (var k = 0; k < d.length; k++) {
        var u = k / d.length;
        d[k] = (Math.random() * 2 - 1) * Math.pow(1 - u, 2.2) * (0.25 + 0.75 * Math.sin(u * 3.14));
      }
      var src = audio.createBufferSource(); src.buffer = buf;
      var f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.7;
      var g = audio.createGain(); g.gain.value = 0.35;
      src.connect(f); f.connect(g); g.connect(audio.destination); src.start();
    } catch (e) { /* sound is a garnish, never a crash */ }
  }
  pageFlip.on('changeState', function (e) { if (e.data === 'flipping') pageTurnSound(); });

  document.addEventListener('pointerdown', function () {
    if (!MUSIC_URL || music) return;
    music = new Audio(MUSIC_URL); music.loop = true; music.volume = MUSIC_VOLUME;
    if (soundOn()) music.play().catch(function () {});
  }, { once: true });

  // arrow keys turn pages; inside a room, Esc or a click beside the book closes it
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') pageFlip.flipNext();
    if (e.key === 'ArrowLeft') pageFlip.flipPrev();
    if (e.key === 'Escape' && embedded) askRoomToClose();
  });
  if (embedded) stage.addEventListener('click', function (e) { if (e.target === stage) askRoomToClose(); });

  // ---------------------------------------------------------- 7. THE SEAL
  // pressing it reveals the address and copies it; the address is assembled here
  // so robots reading the page never see it whole
  var seal = document.getElementById('sealMail'), out = document.getElementById('sealAddress');
  if (seal && out) {
    var realmName = document.body.getAttribute('data-realm-name') || 'the island';
    guard(seal, function () {
      var addr = ['hello', '@', 'rcprojects', '.', 'net'].join('');
      var copied = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(addr).catch(function () {}); copied = true; } } catch (e) {}
      out.textContent = addr;
      out.appendChild(document.createElement('br'));
      var note = document.createElement('span'); note.className = 'seal-note';
      note.textContent = (copied ? 'copied to your clipboard — ' : '') + 'do say you write from ' + realmName;
      out.appendChild(note);
    });
  }
})();
