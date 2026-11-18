/* ============================================================
   THE FOLK — reads the characters of Edgewood from their plain-text files:
     characters/list.md        who is in the book, in which group, in what order
     characters/cal-weston.md  one character (and cal-weston.jpg, their picture)
   It writes them into the page as hidden <article> blocks, which the
   portrait book (characters.js) and the great map (edgewood.js) then use.
   You never need to edit this file.
   ============================================================ */
(function () {
  'use strict';
  var BASE = 'characters/', PRIVATE = 'https://files.rcprojects.net/private/';
  var md = window.rcMarkdown;
  function get(src) { return fetch(src).then(function (r) { if (!r.ok) throw new Error(src); return r.text(); }); }

  window.rcFolk = function (into) {
    if (!md || !window.fetch) return Promise.reject(new Error('no fetch'));
    return get(BASE + 'list.md').then(function (text) {
      var groups = [], g = null;
      text.replace(/\r\n?/g, '\n').split('\n').forEach(function (line) {
        var m;
        if ((m = line.match(/^\s*#\s+(.+)$/))) { g = { title: m[1].trim(), ids: [], empty: 0 }; groups.push(g); return; }
        if (!g) return;
        if ((m = line.match(/^\s*[-*]\s+faces? to come\s*:\s*(\d+)/i))) { g.empty += parseInt(m[1], 10); return; }
        if ((m = line.match(/^\s*[-*]\s+([a-z0-9-]+)\s*$/i))) g.ids.push(m[1].toLowerCase());
      });
      var all = [];
      groups.forEach(function (gr) { gr.ids.forEach(function (id) { all.push(id); }); });
      return Promise.all(all.map(function (id) {
        return get(BASE + id + '.md').catch(function () { return '# ' + id + '\n\n*The file characters/' + id + '.md could not be found.*'; });
      })).then(function (texts) {
        var byId = {};
        all.forEach(function (id, n) { byId[id] = texts[n]; });
        groups.forEach(function (gr) {
          var sec = document.createElement('section'); sec.className = 'group';
          sec.setAttribute('data-title', gr.title); sec.setAttribute('data-empty', gr.empty);
          gr.ids.forEach(function (id) {
            var parts = md.split(byId[id]), m = parts.meta, one = function (k) { return md.one(m, k); };
            var art = document.createElement('article'); art.className = 'character'; art.id = id;
            if (one('title')) art.setAttribute('data-title', one('title'));
            if (one('places')) art.setAttribute('data-places', one('places'));
            if (/^(yes|true|y)$/i.test(one('veiled'))) {
              art.setAttribute('data-veiled', '');
              art.setAttribute('data-veil', BASE + 'veil-' + id + '.jpg');
              if (one('private')) art.setAttribute('data-private', PRIVATE + one('private'));
            } else if (one('picture')) {
              art.setAttribute('data-portrait', BASE + one('picture'));
              art.setAttribute('data-focus', one('focus') || '50% 0%');
              art.setAttribute('data-zoom', one('zoom') || '190%');
            }
            art.innerHTML = md.render(parts.body, BASE);
            sec.appendChild(art);
          });
          into.appendChild(sec);
        });
        return into;
      });
    });
  };
})();
