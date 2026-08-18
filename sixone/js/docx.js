/* docx.js —— 内置轻量 .docx 生成器（纯函数，无外部依赖）
 * 原理：无压缩 ZIP（STORE）+ WordprocessingML，生成 Word/WPS 可直接打开的合法 .docx。
 * 因构建环境无外网无法下载第三方 docx 库，故自研此生成器，功能等价且完全离线。
 */
(function (root) {
  'use strict';

  /* ---------- CRC32 ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------- 字节工具 ---------- */
  function strBytes(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var out = [], i, c, c2;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xD800 || c >= 0xE000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else { i++; c2 = s.charCodeAt(i); c = 0x10000 + (((c & 0x3FF) << 10) | (c2 & 0x3FF)); out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return new Uint8Array(out);
  }
  function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
  function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
  function dosDateTime(d) {
    var t = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | (Math.floor(d.getSeconds() / 2) & 31);
    var dt = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
    return [t, dt];
  }

  /* ---------- ZIP（STORE 无压缩） ---------- */
  function zip(files) {
    var chunks = [], central = [], offset = 0, now = new Date(), td = dosDateTime(now);
    files.forEach(function (f) {
      var nameB = strBytes(f.name), crc = crc32(f.data), size = f.data.length;
      var head = [0x50, 0x4B, 0x03, 0x04];
      head = head.concat(u16(20), u16(0x0800), u16(0), u16(td[0]), u16(td[1]), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0));
      chunks.push(new Uint8Array(head)); chunks.push(nameB); chunks.push(f.data);
      var cent = [0x50, 0x4B, 0x01, 0x02];
      cent = cent.concat(u16(20), u16(20), u16(0x0800), u16(0), u16(td[0]), u16(td[1]), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
      central.push(new Uint8Array(cent)); central.push(nameB);
      offset += 30 + nameB.length + size;
    });
    var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var eocd = [0x50, 0x4B, 0x05, 0x06].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0));
    chunks = chunks.concat(central); chunks.push(new Uint8Array(eocd));
    var total = chunks.reduce(function (a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(total), p = 0;
    chunks.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  /* ---------- WordprocessingML ---------- */
  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function paraXml(text, kind) {
    var jc = '', sz = '24', bold = '0', indent = '', spacing = '';
    if (kind === 'title')   { jc = '<w:jc w:val="center"/>'; sz = '32'; bold = '1'; spacing = '<w:spacing w:after="240"/>'; }
    else if (kind === 'subtitle') { jc = '<w:jc w:val="center"/>'; sz = '21'; spacing = '<w:spacing w:after="200"/>'; }
    else if (kind === 'h')  { sz = '28'; bold = '1'; spacing = '<w:spacing w:before="240" w:after="120"/>'; }
    else if (kind === 'body') { sz = '24'; indent = '<w:ind w:firstLineChars="200" w:firstLine="480"/>'; spacing = '<w:spacing w:line="360" w:lineRule="auto"/>'; }
    else if (kind === 'small') { sz = '21'; }
    var rPr = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="宋体" w:hAnsi="Times New Roman"/><w:b w:val="' + bold + '"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr>';
    return '<w:p><w:pPr>' + jc + spacing + indent + '</w:pPr><w:r>' + rPr + '<w:t xml:space="preserve">' + escXml(text) + '</w:t></w:r></w:p>';
  }

  function makeDocx(opts) {
    opts = opts || {};
    var paras = [];
    paras.push(paraXml(opts.title || '六个一 · 语文素材本', 'title'));
    if (opts.name) paras.push(paraXml(opts.name, 'subtitle'));
    if (opts.date) paras.push(paraXml(opts.date, 'subtitle'));
    (opts.sections || []).forEach(function (sec) {
      paras.push(paraXml(sec.heading, 'h'));
      (sec.paras || []).forEach(function (p) { paras.push(paraXml(p.text, p.kind || 'body')); });
    });
    var docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<w:body>' + paras.join('') +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>';
    var docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    return zip([
      { name: '[Content_Types].xml', data: strBytes(contentTypes) },
      { name: '_rels/.rels', data: strBytes(rels) },
      { name: 'word/document.xml', data: strBytes(docXml) },
      { name: 'word/_rels/document.xml.rels', data: strBytes(docRels) }
    ]);
  }

  function downloadDocx(opts, filename) {
    var bytes = makeDocx(opts);
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || ('六个一素材本_' + Date.now() + '.docx');
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  root.makeDocx = makeDocx;
  root.downloadDocx = downloadDocx;
  root.crc32 = crc32;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));