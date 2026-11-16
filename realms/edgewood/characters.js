/* ============================================================
   THE FOLK OF EDGEWOOD — builds the pages of ovals from the characters,
   and opens a character's card when an oval is touched.
   You never need to edit this file: edit the characters in characters.html.
   ============================================================ */
(function () {
  'use strict';
  var PER_PAGE = 6;
  var book = document.getElementById('book'), folk = document.getElementById('folk');
  if (!book || !folk) return;

  function store(key, value) {           // read with store(key); write with store(key, value); remove with store(key, null)
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value);
      return true;
    } catch (e) { return value === undefined ? null : false; }
  }
  function ownKey(id) { return 'edgewood-own-' + id; }
  function pronoun(art) {                         // "His Story" -> him, "Her Story" -> her
    var h = art.querySelector('h3'), t = h ? h.textContent.toLowerCase() : '';
    return /\bher\b/.test(t) ? 'her' : /\bhis\b/.test(t) ? 'him' : 'them';
  }
  function nameOf(art) { var h = art.querySelector('h2'); return h ? h.textContent.trim() : art.id; }

  // ---------------------------------------------------------- the oval itself
  function paintOval(pic, art) {
    var own = art.hasAttribute('data-veiled') ? store(ownKey(art.id)) : null;
    pic.className = 'oval-pic';
    pic.style.backgroundImage = ''; pic.style.backgroundSize = ''; pic.style.backgroundPosition = '';
    if (own) { pic.style.backgroundImage = 'url(' + own + ')'; pic.classList.add('own'); }
    else if (art.hasAttribute('data-veiled')) { pic.style.backgroundImage = 'url(portraits/veil-' + art.id + '.jpg)'; pic.classList.add('veiled'); }
    else if (art.getAttribute('data-portrait')) {
      pic.style.backgroundImage = 'url(' + art.getAttribute('data-portrait') + ')';
      pic.style.backgroundSize = art.getAttribute('data-zoom') || '210%';
      pic.style.backgroundPosition = art.getAttribute('data-focus') || '50% 20%';
    } else pic.classList.add('empty');
  }
  var ovalsById = {};

  // ---------------------------------------------------------- build the pages
  var backCover = book.lastElementChild;
  Array.prototype.forEach.call(folk.querySelectorAll('.group'), function (group) {
    var title = group.getAttribute('data-title') || '';
    var people = Array.prototype.slice.call(group.querySelectorAll('article.character'));
    var empty = parseInt(group.getAttribute('data-empty'), 10) || 0;
    var slots = people.concat(new Array(empty).fill(null));
    if (!slots.length) return;
    for (var at = 0; at < slots.length; at += PER_PAGE) {
      var page = document.createElement('div'); page.className = 'page portraits';
      if (at === 0) page.setAttribute('data-title', title);
      var inner = document.createElement('div'); inner.className = 'page-inner';
      var head = document.createElement('div'); head.className = 'chapter-label';
      head.textContent = at === 0 ? title : title + ', continued';
      inner.appendChild(head);
      var grid = document.createElement('div'); grid.className = 'oval-grid';
      slots.slice(at, at + PER_PAGE).forEach(function (art) {
        var cell;
        if (art) {
          cell = document.createElement('button'); cell.type = 'button'; cell.className = 'oval';
          cell.setAttribute('data-id', art.id);
          var frame = document.createElement('span'); frame.className = 'oval-frame';
          var pic = document.createElement('span'); frame.appendChild(pic); paintOval(pic, art);
          (ovalsById[art.id] = ovalsById[art.id] || []).push(pic);
          var nm = document.createElement('span'); nm.className = 'oval-name'; nm.textContent = nameOf(art);
          cell.appendChild(frame); cell.appendChild(nm);
          if (art.hasAttribute('data-veiled')) {
            var hint = document.createElement('span'); hint.className = 'oval-hint';
            hint.textContent = 'picture ' + pronoun(art) + ' as you see ' + pronoun(art);
            cell.appendChild(hint);
          }
          cell.addEventListener('click', function () { openCard(art.id); });
        } else {
          cell = document.createElement('div'); cell.className = 'oval waiting';
          cell.innerHTML = '<span class="oval-frame"><span class="oval-pic empty"></span></span><span class="oval-name">a face yet to come</span>';
        }
        grid.appendChild(cell);
      });
      inner.appendChild(grid);
      var foot = document.createElement('div'); foot.className = 'page-foot';
      foot.innerHTML = '<a class="page-num"></a><a class="toc-return">Contents</a>';
      inner.appendChild(foot);
      page.appendChild(inner);
      book.insertBefore(page, backCover);
    }
  });

  // ---------------------------------------------------------- the card
  var veil = document.createElement('div'); veil.className = 'char-veil';
  veil.innerHTML = '<article class="char-card" role="dialog" aria-modal="true"><button type="button" class="char-close" aria-label="Close">&#215;</button><div class="char-body"></div></article>';
  document.body.appendChild(veil);
  var body = veil.querySelector('.char-body'), openId = null;

  function openCard(id) {
    var art = document.getElementById(id);
    if (!art || !art.classList.contains('character')) return;
    openId = id;
    var group = art.closest('.group'), him = pronoun(art);
    body.innerHTML = '';
    var kicker = document.createElement('div'); kicker.className = 'kicker'; kicker.textContent = group ? group.getAttribute('data-title') : '';
    body.appendChild(kicker);
    var h2 = art.querySelector('h2'); if (h2) body.appendChild(h2.cloneNode(true));
    if (art.getAttribute('data-title')) {
      var facts = document.createElement('p'); facts.className = 'facts'; facts.textContent = art.getAttribute('data-title'); body.appendChild(facts);
    }
    if (!art.hasAttribute('data-veiled') && art.getAttribute('data-portrait')) {
      var img = document.createElement('img'); img.className = 'char-portrait'; img.src = art.getAttribute('data-portrait'); img.alt = nameOf(art);
      body.appendChild(img);
    }
    Array.prototype.forEach.call(art.children, function (el) { if (el.tagName !== 'H2') body.appendChild(el.cloneNode(true)); });

    var places = (art.getAttribute('data-places') || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
    if (places.length) {
      var where = document.createElement('div'); where.className = 'char-where';
      where.innerHTML = '<h3>Where to find ' + him + '</h3>';
      var ul = document.createElement('ul');
      places.forEach(function (p) {
        var bits = p.split(':'), li = document.createElement('li');
        li.innerHTML = '<strong></strong> <span></span>';
        li.firstChild.textContent = bits[0].trim();
        var note = document.createElement('textarea'); note.innerHTML = (bits.slice(1).join(':') || '').trim();   // turns &#8211; into a dash
        li.lastChild.textContent = note.value ? '· ' + note.value : '';
        ul.appendChild(li);
      });
      where.appendChild(ul); body.appendChild(where);
    }

    if (art.hasAttribute('data-veiled')) {
      var own = document.createElement('div'); own.className = 'char-own';
      own.innerHTML = '<h3>Picture ' + him + ' as you see ' + him + '</h3>' +
        '<p>Nobody knows exactly what ' + nameOf(art).split(' ')[0] + ' looks like, except the one who imagined ' + him + '. ' +
        'You are welcome to imagine ' + him + ' too: choose a picture, and it will take the veil&#8217;s place in the oval.</p>' +
        '<p class="small-note">Your picture stays in this browser only. It is never uploaded, and nobody else will ever see it.</p>' +
        '<label class="own-choose">CHOOSE A PICTURE<input type="file" accept="image/*"></label> ' +
        '<button type="button" class="own-remove">BRING BACK THE VEIL</button>';
      body.appendChild(own);
      var remove = own.querySelector('.own-remove');
      remove.hidden = !store(ownKey(id));
      own.querySelector('input').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var im = new Image();
          im.onload = function () {
            var W = 360, H = 450, c = document.createElement('canvas'); c.width = W; c.height = H;
            var s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
            c.getContext('2d').drawImage(im, (W - w) / 2, (H - h) / 2.6, w, h);
            var data = c.toDataURL('image/jpeg', 0.84);
            if (store(ownKey(id), data) !== true) { alertNote(own, 'This browser would not keep the picture. It may be in private mode.'); return; }
            (ovalsById[id] || []).forEach(function (pic) { paintOval(pic, art); });
            remove.hidden = false; alertNote(own, 'Done. Close this card to see ' + him + ' in the oval.');
          };
          im.src = reader.result;
        };
        reader.readAsDataURL(f);
      });
      remove.addEventListener('click', function () {
        store(ownKey(id), null); (ovalsById[id] || []).forEach(function (pic) { paintOval(pic, art); });
        remove.hidden = true; alertNote(own, 'The veil is back.');
      });
      if (art.getAttribute('data-private')) {
        var key = document.createElement('a'); key.className = 'char-key'; key.href = art.getAttribute('data-private');
        key.target = '_blank'; key.rel = 'noopener'; key.title = 'For the keeper of the key'; key.innerHTML = '&#128477;';
        body.appendChild(key);
      }
    }
    veil.classList.add('is-open'); veil.scrollTop = 0; veil.querySelector('.char-card').scrollTop = 0;
    veil.querySelector('.char-close').focus({ preventScroll: true });
  }
  function alertNote(box, text) {
    var n = box.querySelector('.own-said'); if (!n) { n = document.createElement('p'); n.className = 'own-said small-note'; box.appendChild(n); }
    n.textContent = text;
  }
  function closeCard() { veil.classList.remove('is-open'); openId = null; }
  veil.querySelector('.char-close').addEventListener('click', closeCard);
  veil.addEventListener('click', function (e) { if (e.target === veil) closeCard(); });
  // Esc closes the card first, before it would close the whole book
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openId) { e.stopImmediatePropagation(); closeCard(); }
    if (openId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) e.stopImmediatePropagation();
  }, true);

  // characters.html#cal-weston opens straight onto Cal's card
  if (location.hash.length > 1) window.setTimeout(function () { openCard(decodeURIComponent(location.hash.slice(1))); }, 900);
})();
