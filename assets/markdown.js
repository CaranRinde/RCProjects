/* ============================================================
   MARKDOWN — turns a plain-text (.md) file into a page.
   You never need to edit this file. This is everything you can write:

   THE WORDS
     # A title                     ## A subheading          ### A smaller one
     A blank line starts a new paragraph.
     *italics*   **bold**   [words](https://a-link.com)
     ![words under the picture](picture.jpg)      a picture, with a caption
     > a quotation, or a letter                    (the gold line at its side)
     ---                                           the little flower divider
     - a list item                 1. a numbered item
     [A BUTTON](https://...)       a link alone on its line becomes a button
     // a note to yourself          a line starting with // never shows on the site

   THE CARD LINES (optional, at the very top of the file, before the first blank line)
     kicker: the small line above the title
     facts: SMALL CAPITAL FACTS UNDER THE TITLE   (you can have several facts: lines)
     picture: a-picture.jpg                        a picture at the top of the card
     before: before.jpg   and   after: after.jpg   two pictures side by side
     shots: one.jpg, two.jpg                       screenshots, side by side
     button: VISIT THE SITE | https://...          a button
     note: a small line under the button
     credits: who helped
     stamp: IN THE MAKING                          a red stamp
     series: 1st Game of The Red Circle series     (with  mark: logo.png  beside it)
     back: BACK TO THE DRAWINGS | #drawings        a button back to another card
     seal: yes                                     a red wax seal (for things still sealed)
   ============================================================ */
(function () {
  'use strict';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function attr(s) { return esc(s).replace(/"/g, '&quot;'); }
  // a picture or link named in a file is found next to that file
  function at(base, src) {
    src = String(src).trim();
    if (!base || /^(https?:|\/|#|data:|mailto:)/i.test(src)) return src;
    return base + src;
  }
  function inline(s, base) {
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) { return '<img src="' + attr(at(base, src)) + '" alt="' + attr(alt) + '">'; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, href) {
      var out = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + attr(at(base, href)) + '"' + out + '>' + t + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/(^|[\s(>])'/g, '$1&#8216;').replace(/'(?![^<]*>)/g, '&#8217;');          // curly quotes, never inside a tag
    s = s.replace(/ -- /g, ' &#8212; ');
    return s;
  }

  function render(text, base) {
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var out = [], para = [], list = null, quote = [];
    function flushPara() { if (para.length) { out.push('<p>' + inline(para.join(' '), base) + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('<' + list.tag + '>' + list.items.map(function (i) { return '<li>' + inline(i, base) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; } }
    function flushQuote() { if (quote.length) { out.push('<blockquote><p>' + inline(quote.join(' '), base) + '</p></blockquote>'); quote = []; } }
    function flushAll() { flushPara(); flushList(); flushQuote(); }
    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, ''), m;
      if (/^\s*\/\//.test(line)) return;                                       // a note to yourself
      if (!line.trim()) { flushAll(); return; }
      if (/^\s*<(video|iframe|audio|div|figure|p|table)\b/i.test(line)) { flushAll(); out.push(line.replace(/\b(src|href)="(?!https?:|\/|#|data:)([^"]+)"/g, function (m, k, v) { return k + '="' + at(base, v) + '"'; })); return; }   // a line of HTML is kept as it is
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushAll(); var n = m[1].length + 1; out.push('<h' + n + '>' + inline(m[2], base) + '</h' + n + '>'); return; }
      if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flushAll(); out.push('<hr>'); return; }
      if ((m = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
        flushAll();
        out.push('<figure><img src="' + attr(at(base, m[2])) + '" alt="' + attr(m[1]) + '">' + (m[1] ? '<figcaption>' + inline(m[1], base) + '</figcaption>' : '') + '</figure>');
        return;
      }
      if ((m = line.match(/^\s*\[([^\]]+)\]\(([^)\s]+)\)\s*$/))) {            // a link alone on its line: a button
        flushAll();
        var web = /^https?:/i.test(m[2]);
        out.push('<a class="plate" href="' + attr(at(base, m[2])) + '"' + (web ? ' target="_blank" rel="noopener"' : '') + '>' + inline(m[1], base) + (web ? ' &#8599;' : '') + '</a>');
        return;
      }
      if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); return; }
      if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); return; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); return; }
      flushList(); flushQuote(); para.push(line.trim());
    });
    flushAll();
    return out.join('\n');
  }

  // the card lines at the top of a file: "key: value", until the first blank line
  function split(text) {
    var t = String(text).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    var lines = t.split('\n'), meta = {}, i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    var start = i, ok = false;
    while (i < lines.length && lines[i].trim()) {
      var m = lines[i].match(/^([a-zA-Z][a-zA-Z ]{0,18}):\s*(.*)$/);
      if (!m || /^https?$/i.test(m[1])) { ok = false; break; }
      ok = true; i++;
    }
    if (!ok) return { meta: {}, body: t };
    for (var k = start; k < i; k++) {
      var mm = lines[k].match(/^([a-zA-Z][a-zA-Z ]{0,18}):\s*(.*)$/), key = mm[1].trim().toLowerCase();
      (meta[key] = meta[key] || []).push(mm[2].trim());
    }
    return { meta: meta, body: lines.slice(i).join('\n') };
  }
  function one(meta, key) { return meta[key] && meta[key].length ? meta[key][meta[key].length - 1] : ''; }
  function plate(v, base, cls) {
    var bits = v.split('|'), label = bits[0].trim(), href = (bits[1] || '').trim();
    if (!href) return '';
    var web = /^https?:/i.test(href);
    return '<a class="plate' + (cls ? ' ' + cls : '') + '" href="' + attr(at(base, href)) + '"' + (web ? ' target="_blank" rel="noopener"' : '') + '>' + esc(label) + (web ? ' &#8599;' : '') + '</a>';
  }

  // a whole card: the card lines, then the words
  function card(text, base, opts) {
    opts = opts || {};
    var s = split(text), m = s.meta, html = [], body = render(s.body, base);
    if (one(m, 'kicker')) html.push('<div class="kicker">' + inline(one(m, 'kicker'), base) + '</div>');
    if (/^(yes|true|y)$/i.test(one(m, 'seal'))) html.push('<div class="wax" aria-hidden="true"></div>');
    var title = body.match(/^<h2>[\s\S]*?<\/h2>/);
    if (title) { html.push(title[0]); body = body.slice(title[0].length); }
    if (one(m, 'series')) html.push('<p class="series">' + (one(m, 'mark') ? '<img src="' + attr(at(base, one(m, 'mark'))) + '" alt="">' : '') + inline(one(m, 'series'), base) + '</p>');
    (m.facts || []).forEach(function (f) { html.push('<p class="facts">' + inline(f, base) + '</p>'); });
    if (one(m, 'stamp')) html.push('<p class="centered"><span class="stamp">' + esc(one(m, 'stamp')) + '</span></p>');
    if (one(m, 'picture')) html.push('<img class="card-photo zoomable" src="' + attr(at(base, one(m, 'picture'))) + '" alt="">');
    if (one(m, 'before') || one(m, 'after')) {
      html.push('<div class="before-after">' +
        (one(m, 'before') ? '<figure><img class="zoomable" src="' + attr(at(base, one(m, 'before'))) + '" alt=""><figcaption>before</figcaption></figure>' : '') +
        (one(m, 'after') ? '<figure><img class="zoomable" src="' + attr(at(base, one(m, 'after'))) + '" alt=""><figcaption>after</figcaption></figure>' : '') + '</div>');
    }
    html.push(body);
    if (one(m, 'shots')) html.push('<div class="shots">' + one(m, 'shots').split(',').map(function (x) {
      return '<figure><img class="zoomable" src="' + attr(at(base, x.trim())) + '" alt=""></figure>'; }).join('') + '</div>');
    (m.button || []).forEach(function (b) { html.push(plate(b, base)); });
    if (one(m, 'note')) html.push('<p class="centered small-note">' + inline(one(m, 'note'), base) + '</p>');
    if (one(m, 'credits')) html.push('<p class="credits"><strong>Credits:</strong> ' + inline(one(m, 'credits'), base) + '</p>');
    if (one(m, 'back')) html.push(plate(one(m, 'back'), base, 'plate-back'));
    return { html: html.join('\n'), meta: m, title: title ? title[0].replace(/<[^>]+>/g, '') : '' };
  }

  // a list file: "# A section" headings, and "- Title: target" lines (or "2. Title: target" with a number)
  function list(text) {
    var out = [], section = '';
    String(text).replace(/\r\n?/g, '\n').split('\n').forEach(function (line) {
      var m;
      if ((m = line.match(/^\s*#{1,3}\s+(.*)$/))) { section = m[1].trim(); return; }
      if ((m = line.match(/^\s*(?:[-*]|(\d+)[.)])\s+(.*)$/))) {
        var text = m[2].trim(), cut = text.indexOf(':');
        var item = { section: section, number: m[1] ? parseInt(m[1], 10) : null, title: text, target: '' };
        if (cut > -1) { item.title = text.slice(0, cut).trim(); item.target = text.slice(cut + 1).trim(); }
        out.push(item);
      }
    });
    return out;
  }

  var md = function (text, base) { return render(split(text).body, base); };
  md.render = render; md.plate = plate; md.split = split; md.card = card; md.list = list; md.one = one; md.inline = inline;
  md.folder = function (path) { var i = String(path).lastIndexOf('/'); return i > -1 ? path.slice(0, i + 1) : ''; };
  window.rcMarkdown = md;
})();
