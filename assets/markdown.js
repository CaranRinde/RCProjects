/* ============================================================
   MARKDOWN — turns a plain-text file into a page.
   You never need to edit this file. What you can write in a .md file:

     # A title                     ## A subheading          ### A smaller one
     A blank line starts a new paragraph.
     *italics*   **bold**
     ![words under the picture](picture.jpg)
     > a quotation, or a letter
     ---                           a little divider
     - a list item                 1. a numbered item
   ============================================================ */
(function () {
  'use strict';
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) {
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
      return '<img src="' + src.replace(/"/g, '%22') + '" alt="' + alt.replace(/"/g, '&quot;') + '">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/(^|\s)'/g, '$1&#8216;').replace(/'/g, '&#8217;');           // curly quotes
    s = s.replace(/ -- /g, ' &#8212; ');
    return s;
  }
  window.rcMarkdown = function (text) {
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var out = [], para = [], list = null, quote = [];
    function flushPara() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('<' + list.tag + '>' + list.items.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; } }
    function flushQuote() { if (quote.length) { out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>'); quote = []; } }
    function flushAll() { flushPara(); flushList(); flushQuote(); }
    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, ''), m;
      if (!line.trim()) { flushAll(); return; }
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushAll(); var n = m[1].length + 1; out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); return; }
      if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flushAll(); out.push('<hr>'); return; }
      if ((m = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
        flushAll();
        out.push('<figure><img src="' + m[2].replace(/"/g, '%22') + '" alt="' + esc(m[1]).replace(/"/g, '&quot;') + '">' + (m[1] ? '<figcaption>' + inline(m[1]) + '</figcaption>' : '') + '</figure>');
        return;
      }
      if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); return; }
      if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); return; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); return; }
      flushList(); flushQuote(); para.push(line.trim());
    });
    flushAll();
    return out.join('\n');
  };
})();
