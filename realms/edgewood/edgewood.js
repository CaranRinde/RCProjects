/* ============================================================
   EDGEWOOD — puts the people on the map.
   It reads the characters from characters.html (their data-places),
   pins them on the great map, and lists them on each place's card.
   You never need to edit this file.
   ============================================================ */
(function () {
  'use strict';
  function slug(n) { return n.toLowerCase().replace(/['‘’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function decode(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
  function own(id) { try { return window.localStorage.getItem('edgewood-own-' + id); } catch (e) { return null; } }

  if (!window.fetch || !window.DOMParser) return;
  fetch('characters.html').then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (text) {
    var doc = new DOMParser().parseFromString(text, 'text/html');
    var byPlace = {};
    Array.prototype.forEach.call(doc.querySelectorAll('article.character'), function (art) {
      var h2 = art.querySelector('h2'), name = h2 ? h2.textContent.trim() : art.id;
      var seen = {};
      (art.getAttribute('data-places') || '').split(';').forEach(function (bit) {
        bit = bit.trim(); if (!bit) return;
        var place = slug(bit.split(':')[0]), note = decode((bit.split(':').slice(1).join(':') || '').trim());
        var kind = /^home/i.test(note) ? 'home' : 'work';
        if (seen[place]) { seen[place].kind = seen[place].kind === kind ? kind : 'both'; seen[place].notes.push(note); return; }
        var who = { id: art.id, name: name, kind: kind, notes: [note], veiled: art.hasAttribute('data-veiled'),
          portrait: art.getAttribute('data-portrait'), focus: art.getAttribute('data-focus'), zoom: art.getAttribute('data-zoom') };
        seen[place] = who; (byPlace[place] = byPlace[place] || []).push(who);
      });
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
        else if (p.veiled) { pic.style.backgroundImage = 'url(portraits/veil-' + p.id + '.jpg)'; }
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
})();
