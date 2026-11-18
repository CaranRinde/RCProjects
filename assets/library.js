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

   A chapter can also live in its own plain-text file, and the book lays it out by itself:
       <div class="page" data-src="chapters/01-arrival.md" data-title="The Arrival"></div>
   becomes as many pages as the chapter needs. (This needs assets/markdown.js on the page too.)
   And a sealed chapter, which opens elsewhere behind a password:
       <div class="page" data-sealed="https://files.rcprojects.net/sealed/read.html?f=chapter-05.md" data-title="..."></div>
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

  // ---------------------------------------------------------- 1b. CHAPTERS THAT LAY THEMSELVES OUT
  var BOOK_FILL = 0.96;   // how much of the available height the book uses
  var PAGE_RATIO = 0.72;  // page width : height, like a real hardback
  var stage = bookEl.parentNode;
  function bookWidth() {
    var availH = (stage.clientHeight || window.innerHeight) - 24;
    var pageW = availH * BOOK_FILL * PAGE_RATIO;
    return window.innerWidth < 620 ? Math.min(pageW, window.innerWidth * 0.96) : Math.min(pageW * 2, window.innerWidth * 0.97);
  }
  function pageWidth() {
    var w = window.innerWidth < 620 ? bookWidth() : bookWidth() / 2;
    return Math.max(260, Math.min(900, w));
  }
  // text in laid-out chapters is sized by the page, so the layout holds whatever the size of the window
  function setPw(w) { bookEl.style.setProperty('--pw', (w || pageWidth()) + 'px'); }
  setPw();

  function sealedPage(el) {
    var title = el.getAttribute('data-title') || 'A sealed chapter';
    el.innerHTML = '<div class="page-inner sealed-inner"><div class="chapter-label">a sealed chapter</div><h2></h2>' +
      '<div class="wax" aria-hidden="true"></div><p class="centered small-note">This chapter is kept behind a seal.</p>' +
      '<a class="plate seal-break" target="_blank" rel="noopener">BREAK THE SEAL</a>' +
      '<p class="centered small-note">It opens in a new tab, and asks for a name and a password.</p>' +
      '<div class="page-foot"><a class="page-num"></a><a class="toc-return">Contents</a></div></div>';
    el.querySelector('h2').textContent = title;
    el.querySelector('.seal-break').href = el.getAttribute('data-sealed');
  }

  function layOut(el, html) {
    // a hidden page of the real size, to measure what fits
    var pw = pageWidth(), ph = pw / PAGE_RATIO;
    var probe = document.createElement('div');
    probe.className = 'page flowed';
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;width:' + pw + 'px;height:' + ph + 'px;--pw:' + pw + 'px';
    probe.innerHTML = '<div class="page-inner"><div class="flow"></div><div class="page-foot"><a class="page-num">0</a></div></div>';
    document.body.appendChild(probe);
    var flow = probe.querySelector('.flow');
    function fits() { return flow.scrollHeight <= flow.clientHeight + 1; }

    var src = document.createElement('div'); src.innerHTML = html;
    var blocks = Array.prototype.slice.call(src.children);
    var title = el.getAttribute('data-title') || '';
    var h = blocks.length && /^H2$/.test(blocks[0].tagName) ? blocks.shift() : null;   // the file's own # title
    var pages = [], first = true;
    function newPage() {
      if (flow.childNodes.length) pages.push(flow.innerHTML);
      flow.innerHTML = '';
    }
    flow.innerHTML = '<div class="chapter-label">' + (el.getAttribute('data-label') || '') + '</div>';
    var h2 = document.createElement('h2'); h2.innerHTML = h ? h.innerHTML : title; flow.appendChild(h2);
    var firstPara = true;
    while (blocks.length) {
      var b = blocks.shift();
      if (b.tagName === 'P' && firstPara && !b.className) { b.className = 'first'; firstPara = false; }
      flow.appendChild(b);
      if (fits()) continue;
      flow.removeChild(b);
      if (b.tagName === 'P' || b.tagName === 'BLOCKQUOTE') {
        // split the paragraph by words: as much as fits stays, the rest goes over the page
        var target = b.tagName === 'P' ? b : b.querySelector('p') || b;
        var words = target.innerHTML.split(/(\s+)/), lo = 0, hi = words.length, keep = 0;
        var part = b.cloneNode(true), ptarget = b.tagName === 'P' ? part : part.querySelector('p') || part;
        flow.appendChild(part);
        while (lo <= hi) {
          var mid = (lo + hi) >> 1;
          ptarget.innerHTML = words.slice(0, mid).join('');
          if (fits()) { keep = mid; lo = mid + 1; } else hi = mid - 1;
        }
        // never leave a word broken inside a tag: step back to a whole word outside any <...>
        while (keep > 0 && /<[^>]*$/.test(words.slice(0, keep).join(''))) keep--;
        if (keep < 3) { flow.removeChild(part); newPage(); blocks.unshift(b); continue; }
        ptarget.innerHTML = words.slice(0, keep).join('');
        var rest = b.cloneNode(true), rtarget = b.tagName === 'P' ? rest : rest.querySelector('p') || rest;
        rtarget.innerHTML = words.slice(keep).join('').replace(/^\s+/, '');
        if (b.tagName === 'P') rest.className = 'cont';
        newPage(); blocks.unshift(rest);
      } else if (flow.childNodes.length) {
        newPage(); flow.appendChild(b);
        if (!fits() && b.querySelector('img')) b.classList.add('squeeze');
      } else { flow.appendChild(b); }       // something taller than a page: it is shrunk to fit
    }
    newPage();
    document.body.removeChild(probe);

    // the chapter's pages replace its placeholder
    var made = pages.map(function (inner, n) {
      var p = document.createElement('div'); p.className = 'page flowed';
      if (n === 0 && title) p.setAttribute('data-title', title);
      p.innerHTML = '<div class="page-inner"><div class="flow">' + inner + '</div><div class="page-foot"><a class="page-num"></a><a class="toc-return">Contents</a></div></div>';
      return p;
    });
    made.forEach(function (p) { el.parentNode.insertBefore(p, el); });
    el.parentNode.removeChild(el);
  }

  // a book with data-chapters="chapters/list.md" takes its chapters from that list:
  //   - The Arrival: 01-the-arrival.md        an open chapter
  //   - The Storm: sealed: the-storm.md       a sealed chapter, kept in the warehouse
  var WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  function chaptersFromList() {
    var src = bookEl.getAttribute('data-chapters');
    if (!src || !window.fetch || !window.rcMarkdown || !window.rcMarkdown.list) return Promise.resolve();
    var base = window.rcMarkdown.folder(src), labels = bookEl.getAttribute('data-chapter-labels') !== 'no';
    var anchor = bookEl.querySelector('.chapters-here') || bookEl.lastElementChild;
    return fetch(src).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (text) {
      window.rcMarkdown.list(text).forEach(function (it, n) {
        var p = document.createElement('div'); p.className = 'page';
        p.setAttribute('data-title', it.title);
        if (labels) p.setAttribute('data-label', 'chapter ' + (WORDS[n] || (n + 1)));
        var m = /^(sealed|private)\s*:\s*(.+)$/i.exec(it.target);
        if (m) p.setAttribute('data-sealed', 'https://files.rcprojects.net/' + m[1].toLowerCase() + '/read.html?f=' + m[2].trim());
        else if (it.target) p.setAttribute('data-src', base + it.target);
        else return;
        anchor.parentNode.insertBefore(p, anchor);
      });
    }).catch(function () {});
  }

  function prepare() {
    var gate = window.rcBookGate && window.rcBookGate.then ? window.rcBookGate : Promise.resolve();
    gate.then(chaptersFromList, chaptersFromList).then(prepareChapters, prepareChapters);
  }
  function prepareChapters() {
    Array.prototype.forEach.call(bookEl.querySelectorAll('.page[data-sealed]'), sealedPage);
    var auto = Array.prototype.slice.call(bookEl.querySelectorAll('.page[data-src]'));
    if (!auto.length || !window.rcMarkdown || !window.fetch) { start(); return; }
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    Promise.all(auto.map(function (el) {
      return fetch(el.getAttribute('data-src')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .catch(function () { return '# ' + (el.getAttribute('data-title') || 'A chapter') + '\n\n*This chapter could not be found. Check its file name: ' + el.getAttribute('data-src') + '*'; });
    })).then(function (texts) {
      return fontsReady.then(function () { auto.forEach(function (el, n) {
        var md = window.rcMarkdown, base = md.folder ? md.folder(el.getAttribute('data-src')) : '';
        if (!md.card) { layOut(el, md(texts[n], base)); return; }
        var c = md.card(texts[n], base);                                   // the card lines: label, facts, picture, button...
        if (md.one(c.meta, 'label')) el.setAttribute('data-label', md.one(c.meta, 'label'));
        layOut(el, c.html);
      }); });
    }).then(start, start);
  }

  function start() {
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

  var built = false;
  function fitBook() {
    var availH = (stage.clientHeight || window.innerHeight) - 24;
    var pageW = availH * BOOK_FILL * PAGE_RATIO;
    if (window.innerWidth < 620) bookEl.style.width = Math.min(pageW, window.innerWidth * 0.96) + 'px';
    else bookEl.style.width = Math.min(pageW * 2, window.innerWidth * 0.97) + 'px';
    var real = built && pageEls[1] && pageEls[1].offsetWidth;          // the true width of a page, once the book is built
    setPw(real > 50 ? real : undefined);
  }
  fitBook();
  window.addEventListener('resize', fitBook);

  var pageFlip = new St.PageFlip(bookEl, {
    width: 560, height: 778, size: 'stretch',
    minWidth: 260, maxWidth: 900, minHeight: 360, maxHeight: 1250,
    showCover: true, usePortrait: true, maxShadowOpacity: 0.5, mobileScrollSupport: false
  });
  pageFlip.loadFromHTML(pageEls);
  built = true;

  // some browsers hand the book slightly wrong measurements at birth; nudge it once everything has loaded
  function nudge() {
    fitBook(); window.dispatchEvent(new Event('resize'));
    window.setTimeout(function () { fitBook(); window.dispatchEvent(new Event('resize')); }, 500);
  }
  if (document.readyState === 'complete') window.setTimeout(nudge, 50); else window.addEventListener('load', nudge);

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
  }
  prepare();
})();
