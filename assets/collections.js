/* ============================================================
   COLLECTIONS — builds lists of things from plain-text list files,
   before the room wakes up. You never need to edit this file.

   In a room, a container such as
       <div class="collection" data-list="drawings/list.md" data-style="gallery"></div>
   reads its list file and fills itself:
       gallery    a wall of framed pictures; each opens its own card  (the Atelier)
       recipes    a box of recipe cards, in sections                  (the Atelier)
       polaroids  a pinboard of pictures with a line under each       (the Pondering)
       stories    a list of scrolls, open or sealed                   (Edgewood)
   A list file looks like this:
       # A section (optional)
       - The Title: its-file.md
   A room with  data-pads="essays/list.md"  lights its lily pads (or lanterns) from a numbered list:
       2. The Title: its-file.md      (2 = the second pad)
   A roll of tickets with  data-list="riddles.md"  reads lines like:
       - The riddle? | The answer.
   ============================================================ */
(function () {
  'use strict';
  var md = window.rcMarkdown;
  if (!md || !window.fetch) return;
  var cache = window.rcMdCache = window.rcMdCache || {};
  function get(src) {
    if (!cache[src]) cache[src] = fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
    return cache[src];
  }
  function slug(s) { return String(s).toLowerCase().replace(/\.md$/, '').replace(/^.*\//, '').replace(/['‘’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function panel(id, src, kind, extra) {
    if (document.getElementById(id)) return;
    var p = el('section', 'panel' + (extra ? ' ' + extra : ''));
    p.id = id; p.setAttribute('data-kind', kind); p.setAttribute('data-md', src);
    document.body.appendChild(p);
  }
  var SEALED = 'https://files.rcprojects.net/sealed/read.html?f=', PRIVATE = 'https://files.rcprojects.net/private/read.html?f=';

  var jobs = [];
  Array.prototype.forEach.call(document.querySelectorAll('.collection[data-list]'), function (box) {
    var listSrc = box.getAttribute('data-list'), base = md.folder(listSrc), style = box.getAttribute('data-style') || 'gallery';
    var back = box.getAttribute('data-back') || '';
    jobs.push(get(listSrc).then(function (text) {
      var items = md.list(text);
      if (style === 'polaroids') {
        items.forEach(function (it) {
          var f = el('figure'), img = el('img', 'zoomable'); img.src = base + it.title; img.alt = ''; img.loading = 'lazy';
          f.appendChild(img); f.appendChild(el('figcaption', null, md.inline(it.target, base))); box.appendChild(f);
        });
        return;
      }
      return Promise.all(items.map(function (it) {
        var sealed = /^(sealed|private)\s*:/i.test(it.target);
        if (sealed || !it.target) return Promise.resolve('');
        return get(base + it.target).catch(function () { return ''; });
      })).then(function (texts) {
        var section = null, grid = null;
        items.forEach(function (it, n) {
          var m = /^(sealed|private)\s*:\s*(.+)$/i.exec(it.target);
          if (style === 'stories') {
            if (!box.querySelector('ul')) box.appendChild(el('ul', 'stories'));
            var li = el('li', m ? 'sealed' : null, '<span class="scroll-icon"></span>');
            var a = el('a', null, esc(it.title));
            if (m) {
              a.href = (m[1].toLowerCase() === 'private' ? PRIVATE : SEALED) + encodeURIComponent(m[2].trim()).replace(/%2F/g, '/');
              a.target = '_blank'; a.rel = 'noopener';
              a.appendChild(el('span', 'story-note', 'sealed: it asks for a name and a password'));
            } else if (it.target) {
              var id = 'story-' + slug(it.target); a.href = '#' + id;
              a.appendChild(el('span', 'story-note', 'an open scroll'));
              panel(id, base + it.target, 'scroll', 'parchment');
            }
            li.appendChild(a); box.querySelector('ul').appendChild(li);
            return;
          }
          // gallery and recipes: a tile that opens a card
          if (!it.target) return;
          if (style === 'recipes' && it.section !== section) {
            section = it.section;
            if (section) { var h = el('h3', null, esc(section)); h.id = 'section-' + slug(section); box.appendChild(h); }
            grid = null;
          }
          if (!grid) { grid = el('div', style === 'recipes' ? 'recipe-box' : 'gallery'); box.appendChild(grid); }
          var meta = md.split(texts[n] || '').meta, pic = md.one(meta, 'small') || md.one(meta, 'after') || md.one(meta, 'picture');
          var pid = slug(it.target);
          var tile = el('a'); tile.href = '#' + pid;
          var img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = pic ? (base + it.target).replace(/[^\/]*$/, '') + pic : (box.getAttribute('data-placeholder') || '');
          tile.appendChild(img); tile.appendChild(el('span', null, esc(it.title)));
          grid.appendChild(tile);
          panel(pid, base + it.target, style === 'recipes' ? 'card' : 'card', style === 'recipes' ? 'recipe' : '');
          if (back && !md.one(meta, 'back')) document.getElementById(pid).setAttribute('data-back', back);
        });
        if (style === 'recipes') {
          var tabs = box.querySelectorAll('h3');
          if (tabs.length > 1) {
            var bar = el('p', 'box-tabs');
            Array.prototype.forEach.call(tabs, function (h, i) { bar.innerHTML += (i ? ' &middot; ' : '') + '<a href="#' + h.id + '">' + esc(h.textContent.toUpperCase()) + '</a>'; });
            box.insertBefore(bar, box.firstChild);
          }
        }
      });
    }).catch(function () { box.innerHTML = '<p class="centered small-note">This list could not be found: ' + esc(listSrc) + '</p>'; }));
  });

  // lily pads, lanterns or anything with class "pad": lit from a numbered list
  var room = document.querySelector('.room[data-pads]');
  if (room) {
    var padSrc = room.getAttribute('data-pads'), padBase = md.folder(padSrc);
    jobs.push(get(padSrc).then(function (text) {
      var pads = room.querySelectorAll('.spot.pad');
      md.list(text).forEach(function (it, n) {
        var pad = pads[(it.number || n + 1) - 1]; if (!pad || !it.target) return;
        var id = 'essay-' + slug(it.target);
        pad.setAttribute('data-opens', id); pad.setAttribute('data-sound', pad.getAttribute('data-sound') || 'plop');
        pad.textContent = it.title;
        panel(id, padBase + it.target, 'scroll', 'parchment');
      });
    }).catch(function () {}));
  }

  // riddles for a roll of tickets
  Array.prototype.forEach.call(document.querySelectorAll('.ticket-roll[data-list]'), function (roll) {
    jobs.push(get(roll.getAttribute('data-list')).then(function (text) {
      var ol = roll.querySelector('.riddles') || roll.appendChild(el('ol', 'riddles'));
      ol.innerHTML = '';
      text.replace(/\r\n?/g, '\n').split('\n').forEach(function (line) {
        var m = line.match(/^\s*[-*]\s+(.+?)\s*\|\s*(.+)$/); if (!m) return;
        var li = el('li', null, md.inline(m[1])); li.setAttribute('data-answer', m[2].replace(/<[^>]*>/g, '')); ol.appendChild(li);
      });
    }).catch(function () {}));
  });

  // the room waits for all of this (rooms.js looks for window.rcRoomGate)
  window.rcRoomGate = Promise.all(jobs).catch(function () {});
})();
