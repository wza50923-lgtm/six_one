/* main.js —— 六个一 · 语文素材本：交互逻辑（勾选/编辑/字数自定义/AI/热榜/导出） */
(function () {
  'use strict';

  var RAW = window.SIXONE_DATA || {};
  var LS_KEY = 'sixone.v1';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cnt(s) { return String(s == null ? '' : s).replace(/\s+/g, '').length; }
  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function mapOne(k, x) { return mapItems(k).filter(function (y) { return y.id === x.id; })[0] || x; }

  /* ---------- 数据项默认结构 ---------- */
  function mapItems(k) {
    var d = {
      geyan: function (x) { return { id: x.id, text: x.text, source: x.source, theme: x.theme, checked: false, custom: false }; },
      shici: function (x) { return { id: x.id, title: x.title, author: x.author, dynasty: x.dynasty, genre: x.genre, body: x.body, analysis: x.analysis, checked: false, custom: false }; },
      meiwen: function (x) { return { id: x.id, title: x.title, year: x.year, exam: x.exam, examTopic: x.examTopic, paraType: x.paraType, body: x.body, sourceNote: x.sourceNote, links: x.links || [], req: '', checked: false, custom: false }; },
      sucai: function (x) { return { id: x.id, title: x.title, summary: x.summary || '', category: x.category, date: x.date, source: x.source, link: x.link, req: '', analysis: x.analysis, checked: false, custom: false }; }
    };
    return (RAW[k] || []).map(d[k]);
  }

  function defaultState() {
    return {
      deletedIds: [],
      meta: { name: '', date: todayStr() },
      settings: { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
      geyan: { enabled: true, expanded: true, target: 5, filter: '全部', items: mapItems('geyan') },
      shici: { enabled: true, expanded: false, genre: '词', maxLen: 80, analysisLen: 150, items: mapItems('shici') },
      meiwen: { enabled: true, expanded: false, targetLen: 200, items: mapItems('meiwen') },
      sucai: { enabled: true, expanded: false, titleMin: 10, titleMax: 20, analysisLen: 75, updateCount: 5, items: mapItems('sucai') }
    };
  }

  /* ---------- 状态存取 ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var base = defaultState();
        var merged = Object.assign({}, base, saved);
        merged.deletedIds = Array.isArray(saved.deletedIds) ? saved.deletedIds : [];
        merged.settings = Object.assign({}, base.settings, saved.settings || {});
        merged.meta = Object.assign({}, base.meta, saved.meta || {});
        ['geyan', 'shici', 'meiwen', 'sucai'].forEach(function (k) {
          if (saved[k] && typeof saved[k] === 'object') {
            merged[k] = Object.assign({}, base[k], saved[k]);
            merged[k].items = saved[k].items || base[k].items;
          }
        });
        /* 数据文件新增条目自动并入 */
        ['geyan', 'shici', 'meiwen', 'sucai'].forEach(function (k) {
          var rawItems = RAW[k] || [];
          var have = {};
          (merged[k].items || []).forEach(function (it) { have[it.id] = true; });
          rawItems.forEach(function (x) { if (!have[x.id] && merged.deletedIds.indexOf(x.id) < 0) merged[k].items.push(mapOne(k, x)); });
        });
        return merged;
      }
    } catch (e) { /* 损坏则重建 */ }
    return defaultState();
  }
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      var el = $('#save-status');
      if (el) el.textContent = '已自动保存 ' + new Date().toLocaleTimeString();
    } catch (e) {
      var el2 = $('#save-status');
      if (el2) el2.textContent = '保存失败（浏览器限制）';
    }
  }

  var state = load();

  /* ---------- 通用渲染辅助 ---------- */
  function badgeHtml(actual, target, min, max, badgeKey) {
    var cls = 'ok', label = actual + ' / ' + target + ' 字';
    if (min != null && max != null) {
      cls = (actual >= min && actual <= max) ? 'ok' : 'warn';
      label = actual + ' 字（目标 ' + min + '~' + max + '）';
    } else {
      var tol = Math.max(20, target * 0.2);
      cls = Math.abs(actual - target) <= tol ? 'ok' : 'warn';
    }
    return '<span class="badge ' + cls + '"' + (badgeKey ? ' data-badge="' + badgeKey + '"' : '') + '>' + label + '</span>';
  }
  function setStatus(section, msg) {
    var el = $('#status-' + section);
    if (el) el.textContent = msg;
  }

  /* ---------- 渲染：格言 ---------- */
  function renderGeyan() {
    var sec = state.geyan;
    $('#geyan-enabled').checked = sec.enabled;
    $('#geyan-target').value = sec.target;
    $('#geyan-body').style.display = (sec.enabled && sec.expanded) ? 'block' : 'none';
    $('#geyan-toggle').textContent = sec.expanded ? '收起 ▲' : '展开 ▼';
    var themes = ['全部'];
    sec.items.forEach(function (it) { if (themes.indexOf(it.theme) < 0) themes.push(it.theme); });
    $('#geyan-themes').innerHTML = themes.map(function (t) {
      return '<button class="chip' + (t === sec.filter ? ' on' : '') + '" data-theme="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    var shown = sec.items.filter(function (it) { return sec.filter === '全部' || it.theme === sec.filter; });
    var checked = sec.items.filter(function (it) { return it.checked; }).length;
    $('#geyan-count').textContent = checked;
    $('#geyan-count').parentElement.querySelector('.target').textContent = sec.target;
    if (!shown.length) {
      $('#geyan-list').innerHTML = '<div class="empty">该主题下暂无条目</div>';
      return;
    }
    $('#geyan-list').innerHTML = shown.map(function (it) {
      return '<div class="row' + (it.checked ? ' picked' : '') + '">' +
        '<label class="chk"><input type="checkbox" data-geyan-check="' + esc(it.id) + '"' + (it.checked ? ' checked' : '') + '><span></span></label>' +
        '<div class="row-main"><div class="quote">' + esc(it.text) + '</div>' +
        '<div class="meta">——' + esc(it.source) + '<span class="tag">' + esc(it.theme) + '</span>' +
        '<button class="del" data-geyan-del="' + esc(it.id) + '">删除</button></div></div></div>';
    }).join('');
  }

  /* ---------- 渲染：好诗 ---------- */
  function renderShici() {
    var sec = state.shici;
    $('#shici-enabled').checked = sec.enabled;
    $('#shici-body').style.display = (sec.enabled && sec.expanded) ? 'block' : 'none';
    $('#shici-toggle').textContent = sec.expanded ? '收起 ▲' : '展开 ▼';
    $('#shici-genre').value = sec.genre;
    $('#shici-maxlen').value = sec.maxLen;
    $('#shici-alen').value = sec.analysisLen;
    if (!sec.items.length) { $('#shici-list').innerHTML = '<div class="empty">暂无诗词</div>'; return; }
    $('#shici-list').innerHTML = sec.items.map(function (it) {
      var n = cnt(it.analysis);
      return '<div class="item' + (it.checked ? ' picked' : '') + '">' +
        '<div class="item-head"><label class="chk"><input type="checkbox" data-shici-check="' + esc(it.id) + '"' + (it.checked ? ' checked' : '') + '><span></span></label>' +
        '<b>' + esc(it.title) + '</b><i>' + esc(it.dynasty ? it.dynasty + '·' : '') + esc(it.author) + '（' + esc(it.genre) + '）</i>' +
        '<button class="del" data-shici-an="' + esc(it.id) + '">✍️解析</button>' +
        '<button class="del" data-shici-del="' + esc(it.id) + '">删除</button></div>' +
        '<textarea rows="4" data-shici-body="' + esc(it.id) + '" placeholder="诗词正文">' + esc(it.body) + '</textarea>' +
        '<div class="mini-label">解析（字数自定义：目标 ' + sec.analysisLen + ' 字） ' + badgeHtml(n, sec.analysisLen, null, null, 'shici-analysis-' + it.id) + '</div>' +
        '<textarea rows="5" data-shici-analysis="' + esc(it.id) + '" placeholder="100~200 字解析">' + esc(it.analysis) + '</textarea>' +
        '</div>';
    }).join('');
  }

  /* ---------- 渲染：美文 ---------- */
  function renderMeiwen() {
    var sec = state.meiwen;
    $('#meiwen-enabled').checked = sec.enabled;
    $('#meiwen-target').value = sec.targetLen;
    $('#meiwen-body').style.display = (sec.enabled && sec.expanded) ? 'block' : 'none';
    $('#meiwen-toggle').textContent = sec.expanded ? '收起 ▲' : '展开 ▼';
    if (!sec.items.length) { $('#meiwen-list').innerHTML = '<div class="empty">暂无美文</div>'; return; }
    $('#meiwen-list').innerHTML = sec.items.map(function (it) {
      var n = cnt(it.body);
      return '<div class="item' + (it.checked ? ' picked' : '') + '">' +
        '<div class="item-head"><label class="chk"><input type="checkbox" data-meiwen-check="' + esc(it.id) + '"' + (it.checked ? ' checked' : '') + '><span></span></label>' +
        '<b>' + esc(it.title) + '</b><i>' + esc(it.exam + '，' + it.year + '年，' + it.paraType) + '</i>' +
        '<button class="del" data-meiwen-del="' + esc(it.id) + '">删除</button></div>' +
        '<div class="mini-label">正文（目标 ' + sec.targetLen + ' 字） ' + badgeHtml(n, sec.targetLen, null, null, 'meiwen-body-' + it.id) + '</div>' +
        '<textarea rows="6" data-meiwen-body="' + esc(it.id) + '" placeholder="完整美文段落（约200字，可编辑）">' + esc(it.body) + '</textarea>' +
        '<div class="row2"><input class="in grow" data-meiwen-req="' + esc(it.id) + '" value="' + esc(it.req || '') + '" placeholder="不满意想改什么？如：换个角度 / 更贴合××主题 / 更有文采（可留空）"><button class="btn ghost" data-meiwen-regen="' + esc(it.id) + '">🔄不满意</button></div>' +
        (it.sourceNote ? '<div class="note">说明：' + esc(it.sourceNote) + '</div>' : '') +
        (it.links && it.links.length ? '<div class="links">' + it.links.map(function (l) {
          return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">↗ ' + esc(l.label) + '</a>';
        }).join('') + '</div>' : '') +
        '</div>';
    }).join('');
  }

  /* ---------- 渲染：素材 ---------- */
  function renderSucai() {
    var sec = state.sucai;
    $('#sucai-enabled').checked = sec.enabled;
    $('#sucai-tmin').value = sec.titleMin;
    $('#sucai-tmax').value = sec.titleMax;
    $('#sucai-alen').value = sec.analysisLen;
    $('#sucai-count').value = sec.updateCount;
    $('#sucai-body').style.display = (sec.enabled && sec.expanded) ? 'block' : 'none';
    $('#sucai-toggle').textContent = sec.expanded ? '收起 ▲' : '展开 ▼';
    if (!sec.items.length) { $('#sucai-list').innerHTML = '<div class="empty">暂无素材</div>'; return; }
    $('#sucai-list').innerHTML = sec.items.map(function (it) {
      var tn = cnt(it.title), an = cnt(it.analysis);
      return '<div class="item' + (it.checked ? ' picked' : '') + '">' +
        '<div class="item-head"><label class="chk"><input type="checkbox" data-sucai-check="' + esc(it.id) + '"' + (it.checked ? ' checked' : '') + '><span></span></label>' +
        '<b>' + esc(it.title || '（未命名素材）') + '</b><i>' + esc(it.category + ' · ' + it.date) + '</i>' +
        '<button class="del" data-sucai-del="' + esc(it.id) + '">删除</button></div>' +
        '<div class="mini-label">标题 ' + badgeHtml(tn, 0, sec.titleMin, sec.titleMax, 'sucai-title-' + it.id) + '｜梗概 ' + cnt(it.summary) + ' 字｜分析 ' + badgeHtml(an, sec.analysisLen, null, null, 'sucai-analysis-' + it.id) + '</div>' +
        '<input class="in" data-sucai-title="' + esc(it.id) + '" value="' + esc(it.title) + '" placeholder="标题（10~20 字）">' +
        '<input class="in" data-sucai-summary="' + esc(it.id) + '" value="' + esc(it.summary || '') + '" placeholder="梗概：约30字，含六要素（时间/地点/人物/起因/经过/结果）">' +
        '<textarea rows="4" data-sucai-analysis="' + esc(it.id) + '" placeholder="议论性分析（50~100 字，可直接入文）">' + esc(it.analysis) + '</textarea>' +
        '<div class="row2"><input class="in" data-sucai-category="' + esc(it.id) + '" value="' + esc(it.category) + '" placeholder="类别">' +
        '<input class="in" type="date" data-sucai-date="' + esc(it.id) + '" value="' + esc(it.date) + '">' +
        '<input class="in grow" data-sucai-source="' + esc(it.id) + '" value="' + esc(it.source) + '" placeholder="来源"></div>' +
        (it.link ? '<a class="small-link" href="' + esc(it.link) + '" target="_blank" rel="noopener">↗ 来源链接</a>' : '') +
        '<div class="row2"><input class="in grow" data-sucai-req="' + esc(it.id) + '" value="' + esc(it.req || '') + '" placeholder="不满意想改什么？如：换个角度 / 更贴合××主题 / 更具体（可留空）"><button class="btn ghost" data-sucai-regen="' + esc(it.id) + '">🔄不满意</button></div>' +
        '</div>';
    }).join('');
  }

  /* ---------- 渲染：元信息 + 预览 ---------- */
  function renderMeta() {
    $('#meta-name').value = state.meta.name || '';
    $('#meta-date').value = state.meta.date || todayStr();
  }
  function buildChunks() {
    var chunks = [];
    chunks.push({ text: '六 个 一 · 语文素材本', kind: 'title' });
    if (state.meta.name) chunks.push({ text: '姓名/班级：' + state.meta.name, kind: 'subtitle' });
    chunks.push({ text: '日期：' + (state.meta.date || todayStr()), kind: 'subtitle' });
    var total = { geyan: 0, shici: 0, meiwen: 0, sucai: 0 };
    var g = state.geyan;
    if (g.enabled) {
      var gs = g.items.filter(function (i) { return i.checked; });
      if (gs.length) {
        chunks.push({ text: '一、格言名句', kind: 'h' });
        gs.forEach(function (it, i) {
          chunks.push({ text: (i + 1) + '. ' + it.text + ' ——' + it.source + (it.theme ? '（适用：' + it.theme + '）' : ''), kind: 'body' });
          total.geyan += cnt(it.text);
        });
      }
    }
    var s = state.shici;
    if (s.enabled) {
      var ss = s.items.filter(function (i) { return i.checked; });
      if (ss.length) {
        chunks.push({ text: '二、好诗一首', kind: 'h' });
        ss.forEach(function (it, i) {
          chunks.push({ text: (ss.length > 1 ? '第' + (i + 1) + '首：' : '') + it.title + '（' + (it.dynasty || '') + (it.dynasty ? '·' : '') + it.author + '·' + it.genre + '）', kind: 'body' });
          chunks.push({ text: it.body, kind: 'body' });
          if (it.analysis) chunks.push({ text: '【解析】' + it.analysis, kind: 'body' });
          total.shici += cnt(it.body) + cnt(it.analysis);
        });
      }
    }
    var m = state.meiwen;
    if (m.enabled) {
      var ms = m.items.filter(function (i) { return i.checked; });
      if (ms.length) {
        chunks.push({ text: '三、美文一段', kind: 'h' });
        ms.forEach(function (it, i) {
          chunks.push({ text: (ms.length > 1 ? '段落' + (i + 1) + '：' : '') + it.title + '（' + it.exam + '，' + it.year + '年，' + it.paraType + '）', kind: 'body' });
          chunks.push({ text: it.body, kind: 'body' });
          if (it.sourceNote) chunks.push({ text: '说明：' + it.sourceNote, kind: 'small' });
          total.meiwen += cnt(it.body);
        });
      }
    }
    var c = state.sucai;
    if (c.enabled) {
      var cs = c.items.filter(function (i) { return i.checked; });
      if (cs.length) {
        chunks.push({ text: '四、素材积累', kind: 'h' });
        cs.forEach(function (it, i) {
          chunks.push({ text: '素材' + (i + 1) + '：' + it.title + '（' + it.category + '，' + it.date + '）', kind: 'body' });
          if (it.summary) chunks.push({ text: '梗概：' + it.summary, kind: 'body' });
          if (it.analysis) chunks.push({ text: '分析：' + it.analysis, kind: 'body' });
          if (it.source) chunks.push({ text: '来源：' + it.source + (it.link ? ' ' + it.link : ''), kind: 'small' });
          total.sucai += cnt(it.title) + cnt(it.analysis);
        });
      }
    }
    var all = total.geyan + total.shici + total.meiwen + total.sucai;
    chunks.push({ text: '字数统计：格言 ' + total.geyan + ' 字｜诗词（含解析）' + total.shici + ' 字｜美文 ' + total.meiwen + ' 字｜素材 ' + total.sucai + ' 字｜合计 ' + all + ' 字', kind: 'small' });
    return chunks;
  }
  function renderPreview() {
    var chunks = buildChunks();
    var html = chunks.map(function (c) {
      var cls = 'pv-' + (c.kind === 'title' ? 'title' : c.kind === 'subtitle' ? 'subtitle' : c.kind === 'h' ? 'h' : c.kind === 'small' ? 'small' : 'body');
      return '<div class="' + cls + '">' + esc(c.text) + '</div>';
    }).join('');
    $('#preview').innerHTML = html;
    /* 导出计数显示 */
    var t = {};
    chunks.forEach(function (c) {});
  }
  function refreshBadges() {
    $('[data-badge]').forEach(function (el) {
      var key = el.getAttribute('data-badge');
      if (!key) return;
      var p = key.split('-');
      var sec = p[0], field = p[1], id = p.slice(2).join('-');
      var it = findItem(sec, id);
      if (!it) return;
      if (field === 'analysis') {
        var n = cnt(it.analysis);
        el.innerHTML = sec === 'shici' ? badgeHtml(n, state.shici.analysisLen) : badgeHtml(n, state.sucai.analysisLen);
      } else if (field === 'title') {
        el.innerHTML = badgeHtml(cnt(it.title), 0, state.sucai.titleMin, state.sucai.titleMax);
      } else if (field === 'body') {
        el.innerHTML = badgeHtml(cnt(it.body), state.meiwen.targetLen);
      }
    });
  }
  function renderAll() {
    renderGeyan(); renderShici(); renderMeiwen(); renderSucai(); renderMeta(); renderPreview();
  }

  /* ---------- DeepSeek 调用 ---------- */
  function callDeepSeek(messages, onOk, onErr) {
    var s = state.settings;
    if (!s.apiKey) { onErr('尚未填写 API Key：点右上角「设置」填入后重试（没有 Key 也可纯离线使用）。'); return; }
    var url = (s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.apiKey },
      body: JSON.stringify({ model: s.model || 'deepseek-chat', messages: messages, temperature: 0.8, stream: false })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 180)); });
      return r.json();
    }).then(function (j) {
      var text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!text) throw new Error('返回内容为空');
      onOk(text);
    }).catch(function (e) {
      var msg = e.message || String(e);
      if (msg.indexOf('Failed to fetch') >= 0) msg += '（浏览器跨域限制：可在 README 中查看本地代理方案，或改用离线模式）';
      onErr('调用失败：' + msg);
    });
  }

  /* ---------- AI 补充诗词（只检索真实名家作品，不创作）＋ AI 写解析 ---------- */
  function parseShici(text) {
    var get = function (label) {
      var re = new RegExp('【' + label + '】\\s*([\\s\\S]*?)(?=【|$)', 'm');
      var m = text.match(re);
      return m ? m[1].trim() : '';
    };
    var bodyM = text.match(/【正文】\s*([\s\S]*?)(?=【解析】|$)/);
    var anM = text.match(/【解析】\s*([\s\S]*)$/);
    return {
      title: get('标题'), author: get('作者'), dynasty: get('朝代'), genre: get('体裁'),
      body: bodyM ? bodyM[1].trim() : '',
      analysis: anM ? anM[1].trim() : ''
    };
  }
  function aiShici() {
    var kw = $('#shici-ai-theme').value.trim();
    if (!kw) { setStatus('shici', '请先输入关键词（主题/作者/篇名，如：苏轼 豁达）。'); return; }
    var maxLen = +state.shici.maxLen || 80;
    var aLen = +state.shici.analysisLen || 150;
    setStatus('shici', 'AI 检索中…');
    callDeepSeek([
      { role: 'system', content: '你是高中语文诗词库检索员。根据关键词，提供一首真实存在的名家诗词（严禁创作、严禁编造），要求：著名但**不来自小学/初中/高中语文课本与高考必背篇目**，高中生课内较少接触；若你无法确认是否课内，请在【作者】处注明"待核实"。按以下格式输出：第一行【标题】…；第二行【作者】…；第三行【朝代】…；第四行【体裁】诗或词；第五行开始【正文】…（全文，不含标点与题目不超过 ' + maxLen + ' 字为宜，若原词较长请如实给出）；空一行后【解析】约 ' + aLen + ' 字解析（说明意象、手法及在高考作文中的用法）。' },
      { role: 'user', content: '关键词：' + kw }
    ], function (text) {
      var p = parseShici(text);
      if (!p.body) { setStatus('shici', '未能解析返回内容，已把原文放入关键词框，可自行处理：'); $('#shici-ai-theme').value = text.slice(0, 400); return; }
      state.shici.items.push({
        id: 'ai' + Date.now() + Math.floor(Math.random() * 999),
        title: p.title || kw,
        author: p.author || '待核实',
        dynasty: p.dynasty || '',
        genre: p.genre || '',
        body: p.body,
        analysis: p.analysis || '',
        checked: true, custom: true, ai: true
      });
      save(); renderShici(); renderPreview();
      setStatus('shici', '已补充（AI 自知识库检索，请核对原文；可点该诗「✍️解析」重新生成解析）。');
    }, function (err) { setStatus('shici', err); });
  }
  function aiShiciAnalysis(it) {
    var aLen = +state.shici.analysisLen || 150;
    setStatus('shici', '正在为《' + it.title + '》生成解析…');
    callDeepSeek([
      { role: 'system', content: '你是资深高中语文教师。请为下面这首' + (it.genre || '诗') + '写约 ' + aLen + ' 字解析（说明意象、手法、情感与在高考作文中的用法），只输出解析正文。' },
      { role: 'user', content: (it.title ? '《' + it.title + '》' + (it.author ? '（' + it.author + '）' : '') : '') + '\n' + it.body }
    ], function (text) {
      it.analysis = text.trim();
      save(); renderShici(); renderPreview();
      setStatus('shici', '解析已更新，可继续编辑。');
    }, function (err) { setStatus('shici', err); });
  }
  /* ---------- AI 生成：素材分析（含具体要素） ---------- */
  function aiSucai() {
    var news = $('#sucai-ai-input').value.trim();
    if (!news) { setStatus('sucai', '请先粘贴新闻内容（或点击热点条目自动填入）。'); return; }
    var tMin = +state.sucai.titleMin || 10, tMax = +state.sucai.titleMax || 20;
    var aLen = +state.sucai.analysisLen || 75;
    setStatus('sucai', 'AI 分析中…');
    callDeepSeek([
      { role: 'system', content: '你是高考作文素材分析师。请基于用户提供的新闻内容，输出三行：第一行【标题】' + tMin + '~' + tMax + '字；第二行【梗概】约30字的一句话概括（包含六要素：时间/地点/人物/起因/经过/结果）；第三行【分析】约 ' + aLen + ' 字议论性分析（观点鲜明，可直接写入高中议论文，联系青年成长与时代精神）。严禁编造事实，只能基于用户提供的内容。' },
      { role: 'user', content: news }
    ], function (text) {
      var title = '', summary = '', analysis = text;
      var m1 = text.match(/【标题】\s*([^\n]+)/);
      if (m1) title = m1[1].trim();
      var m2 = text.match(/【梗概】\s*([^\n]+)/);
      if (m2) summary = m2[1].trim();
      var m4 = text.match(/【分析】\s*([\s\S]+)$/);
      if (m4) analysis = m4[1].trim();
      state.sucai.items.push({ id: 'ai' + Date.now() + Math.floor(Math.random() * 999), title: title || 'AI 素材', summary: summary, category: '自定义', date: todayStr(), source: 'AI 分析（基于粘贴内容）', link: '', analysis: analysis, checked: true, custom: true, ai: true });
      save(); renderSucai(); renderPreview();
      setStatus('sucai', '已生成（含要素，请核对事实后使用）。');
    }, function (err) { setStatus('sucai', err); });
  }
  /* ---------- AI 补充格言（真实名句，可核对） ---------- */
  function aiGeyan() {
    var theme = $('#geyan-ai-theme').value.trim();
    if (!theme) { setStatus('geyan', '请先输入主题（如：奋斗/坚持/家国）。'); return; }
    var n = state.geyan.target || 5;
    setStatus('geyan', 'AI 检索中…');
    callDeepSeek([
      { role: 'system', content: '你是高考语文格言库检索员。根据用户主题，给出 ' + n + ' 条真实存在的格言/名句（严禁编造），要求：著名但**不来自小学/初中/高中课本与高考必背篇目**，高中生课内较少接触（优先名家名言、经典典籍），只输出一个 JSON 数组，每项：{"text":"句子","source":"作者《篇目》","theme":"适用主题"}。' },
      { role: 'user', content: '主题：' + theme }
    ], function (text) {
      try {
        var arr = extractJsonArray(text);
        if (!Array.isArray(arr) || !arr.length) throw new Error('not-array');
        arr.forEach(function (it) {
          state.geyan.items.push({ id: 'gai' + Date.now() + Math.floor(Math.random() * 999), text: String(it.text || ''), source: String(it.source || 'AI 检索'), theme: String(it.theme || theme), checked: true, custom: true, ai: true });
        });
        save(); renderGeyan(); renderPreview();
        setStatus('geyan', '已补充 ' + arr.length + ' 条（AI 检索，请核对出处后使用）。');
      } catch (e) {
        setStatus('geyan', '返回格式异常，请重试或手动添加。');
      }
    }, function (err) { setStatus('geyan', err); });
  }

  /* ---------- AI 补充美文（完整段落，整理版会注明） ---------- */
  function aiMeiwen() {
    var theme = $('#meiwen-ai-theme').value.trim();
    if (!theme) { setStatus('meiwen', '请先输入主题（如：坚持/家国/创新）。'); return; }
    var n = state.meiwen.targetLen || 200;
    setStatus('meiwen', 'AI 检索/整理中…');
    callDeepSeek([
      { role: 'system', content: '你是高考作文美文顾问。用户给出主题，请输出两行：第一行【来源】注明出处（如为真实满分作文/名篇请写篇目与年份；若无法确认真实出处，写"AI整理版·模拟满分作文风格"）；第二行【正文】约 ' + n + ' 字的完整论述性段落（论点清晰、引用或举例具体、语言可入高考作文，必须是完整一段，禁止只有几个字）。不要输出其它内容。' },
      { role: 'user', content: '主题：' + theme + '；字数：约 ' + n + ' 字' }
    ], function (text) {
      var src = '', body = text;
      var m1 = text.match(/【来源】\s*([^\n]+)/);
      if (m1) src = m1[1].trim();
      var m2 = text.match(/【正文】\s*([\s\S]*)$/);
      if (m2) body = m2[1].trim();
      state.meiwen.items.push({
        id: 'mai' + Date.now() + Math.floor(Math.random() * 999),
        title: theme + '·美文', year: '', exam: 'AI 补充', examTopic: '', paraType: '主体段',
        body: body, sourceNote: src || 'AI整理版·模拟满分作文风格（请核对）', links: [],
        checked: true, custom: true, ai: true
      });
      save(); renderMeiwen(); renderPreview();
      setStatus('meiwen', '已补充完整段落（' + cnt(body) + ' 字），可在文本框继续编辑。');
    }, function (err) { setStatus('meiwen', err); });
  }

  /* ---------- 不满意重新生成：美文 / 素材 ---------- */
  function aiMeiwenRegen(it) {
    var theme = (it.title || '').replace(/·美文$/, '') || '坚持';
    var n = state.meiwen.targetLen || 200;
    setStatus('meiwen', '正在重新生成《' + it.title + '》…');
    callDeepSeek([
      { role: 'system', content: '你是高考作文美文顾问。主题：' + theme + '。请输出两行：第一行【来源】注明出处（真实篇目写篇目与年份；无法确认真实出处写"AI整理版·模拟满分作文风格"）；第二行【正文】约 ' + n + ' 字的完整论述性段落（论点清晰、引用或举例具体、可入高考作文，必须完整一段）。不要输出其它内容。' },
      { role: 'user', content: (it.req ? '修改要求：' + it.req + '。' : '') + '请重新生成一段更好的。' }
    ], function (text) {
      var src = '', body = text;
      var m1 = text.match(/【来源】\s*([^\n]+)/);
      if (m1) src = m1[1].trim();
      var m2 = text.match(/【正文】\s*([\s\S]*)$/);
      if (m2) body = m2[1].trim();
      it.body = body; it.sourceNote = src || 'AI整理版·模拟满分作文风格（请核对）';
      save(); renderMeiwen(); renderPreview();
      setStatus('meiwen', '已重新生成（' + cnt(body) + ' 字），可继续编辑。');
    }, function (err) { setStatus('meiwen', err); });
  }
  function aiSucaiRegen(it) {
    var tMin = +state.sucai.titleMin || 10, tMax = +state.sucai.titleMax || 20;
    var aLen = +state.sucai.analysisLen || 75;
    setStatus('sucai', '正在重新生成《' + (it.title || '素材') + '》…');
    callDeepSeek([
      { role: 'system', content: '你是高考作文素材分析师。请基于以下素材标题，重新输出三行：第一行【标题】' + tMin + '~' + tMax + '字；第二行【梗概】约30字含六要素（时间/地点/人物/起因/经过/结果）；第三行【分析】约 ' + aLen + ' 字议论性分析（可直接入文）。严禁编造，只能基于给定信息。' },
      { role: 'user', content: '标题：' + (it.title || '') + (it.req ? '；修改要求：' + it.req : '') }
    ], function (text) {
      var m1 = text.match(/【标题】\s*([^\n]+)/);
      if (m1) it.title = m1[1].trim();
      var m2 = text.match(/【梗概】\s*([^\n]+)/);
      if (m2) it.summary = m2[1].trim();
      var m4 = text.match(/【分析】\s*([\s\S]+)$/);
      if (m4) it.analysis = m4[1].trim();
      save(); renderSucai(); renderPreview();
      setStatus('sucai', '已重新生成，可继续编辑。');
    }, function (err) { setStatus('sucai', err); });
  }

  /* ---------- 热榜获取（60s 新闻优先，vvhan 热榜兜底） ---------- */
  function fetchNewsList() {
    return fetch('https://60s-api.viki.moe/v2/60s', { mode: 'cors' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var news = j && j.data && j.data.news;
        if (!Array.isArray(news) || !news.length) throw new Error('empty');
        return news.map(function (x) { return { title: String(x).replace(/^\d+[.、\s]+/, ''), url: '', hot: '' }; });
      })
      .catch(function () {
        return fetch('https://api.vvhan.com/api/hotlist/all', { mode: 'cors' })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var list = (j && j.data) || [];
            if (!Array.isArray(list) || !list.length) throw new Error('empty');
            return list.map(function (x) { return { title: x.title || x.name || '', url: x.url || '', hot: x.hot || '' }; });
          })
          .catch(function () { return null; });
      });
  }
  function fetchHotlist() {
    setStatus('sucai', '正在获取热点…');
    fetchNewsList().then(function (list) {
      if (list && list.length) showHotlist(list);
      else setStatus('sucai', '热榜接口不可用（file:// 打开时可能被浏览器跨域限制），请改为手动粘贴新闻。');
    });
  }

  /* ---------- 一键更新素材：热榜 + AI 生成（标题/分析按自定义字数） ---------- */
  function extractJsonArray(text) {
    var t = String(text || '').trim();
    var m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) t = m[1].trim();
    var s = t.indexOf('['), e = t.lastIndexOf(']');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
    return JSON.parse(t);
  }
  function refreshSucai() {
    if (!state.settings.apiKey) { setStatus('sucai', '一键更新需要 API Key：点右上角「设置」填入（Key 仅存本机浏览器）。'); return; }
    var n = state.sucai.updateCount || 5;
    setStatus('sucai', '正在抓取今日热点并生成素材（约 10~30 秒，单次成本不足 1 分钱）…');
    fetchNewsList().then(function (list) {
      if (!list || !list.length) { setStatus('sucai', '热榜接口不可用（file:// 跨域限制），请手动粘贴新闻后点「AI 写分析」。'); return; }
      var tMin = state.sucai.titleMin || 10, tMax = state.sucai.titleMax || 20, aLen = state.sucai.analysisLen || 75;
      var top = list.slice(0, 30).map(function (x, i) { return (i + 1) + '. ' + x.title; }).join('\n');
      callDeepSeek([
        { role: 'system', content: '你是高考作文素材库主编。以下是今日抓取的新闻/热点标题：\n' + top + '\n\n请从中挑选 ' + n + ' 条最适合作高考议论文素材的社会现实类新闻（政治/经济/文化/科技/社会），只输出一个 JSON 数组（不要任何其它文字、不要代码块标记），每项格式：{"title":"标题' + tMin + '~' + tMax + '字","category":"科技/经济/文化/社会/政策","summary":"梗概约30字，含六要素（时间/地点/人物/起因/经过/结果）","analysis":"约' + aLen + '字议论性分析，观点鲜明、可直接写入议论文","source":"今日热点"}。要求：只基于给定标题，严禁编造标题中不存在的事实细节。' },
        { role: 'user', content: '请生成 ' + n + ' 条素材。' }
      ], function (text) {
        try {
          var arr = extractJsonArray(text);
          if (!Array.isArray(arr) || !arr.length) throw new Error('not-array');
          arr.forEach(function (it) {
            state.sucai.items.push({
              id: 'upd' + Date.now() + Math.floor(Math.random() * 999),
              title: String(it.title || '').slice(0, 50),
              category: String(it.category || '自定义'),
              date: todayStr(),
              source: String(it.source || 'AI·热榜更新'),
              link: '',
              summary: String(it.summary || ''),
              analysis: String(it.analysis || ''),
              checked: true, custom: true, ai: true
            });
          });
          save(); renderSucai(); renderPreview();
          setStatus('sucai', '已更新 ' + arr.length + ' 条素材（存于本机浏览器；想同步到别的电脑请点「导出素材包(.js)」）。');
        } catch (e) {
          setStatus('sucai', 'AI 返回格式异常，已把原文填入下方输入框，可手动整理或重试：');
          $('#sucai-ai-input').value = text;
        }
      }, function (err) { setStatus('sucai', err); });
    });
  }

  /* ---------- 导出当前素材为可替换的 sucai.js ---------- */
  function exportSucaiJs() {
    var items = state.sucai.items.map(function (it) {
      return { id: it.id, title: it.title || '', summary: it.summary || '', category: it.category || '', date: it.date || todayStr(), source: it.source || '', link: it.link || '', analysis: it.analysis || '' };
    });
    var content = '// 素材数据：由「六个一 · 语文素材本」导出（' + todayStr() + '）\n' +
      '// 使用方法：用本文件替换 sixone/data/sucai.js，下次打开即成为内置素材\n' +
      'window.SIXONE_DATA = window.SIXONE_DATA || {};\n' +
      'window.SIXONE_DATA.sucai = ' + JSON.stringify(items, null, 2) + ';\n';
    download('sucai_' + todayStr().replace(/-/g, '') + '.js', content, 'text/javascript;charset=utf-8');
    setStatus('sucai', '素材包已导出（见下载文件），用它替换 data/sucai.js 即可永久保存。');
  }

  function showHotlist(list) {
    var box = $('#sucai-hotlist');
    box.style.display = 'block';
    box.innerHTML = '<div class="mini-label">点击条目 → 自动填入下方 AI 分析框（' + list.length + ' 条热点）</div>' +
      '<div class="hotlist">' + list.slice(0, 40).map(function (it, i) {
        return '<button type="button" class="hot-item" data-title="' + esc(it.title) + '">' + (i + 1) + '. ' + esc(it.title) + (it.hot ? ' <em>' + esc(it.hot) + '</em>' : '') + '</button>';
      }).join('') + '</div>';
    $$('.hot-item', box).forEach(function (b) {
      b.addEventListener('click', function () {
        $('#sucai-ai-input').value = b.getAttribute('data-title');
        $('#sucai-ai-input').focus();
      });
    });
  }

  /* ---------- 导出 ---------- */
  function fallbackDownload(filename, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    setStatus('preview', '文件已下载（浏览器下载目录）；建议移动到「sixone/导出文件/」文件夹统一存放。');
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var ext = (filename.split('.').pop() || 'txt').toLowerCase();
    if (window.showSaveFilePicker && window.isSecureContext) {
      window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: '导出文件', accept: { 'application/octet-stream': ['.' + ext] } }]
      }).then(function (handle) {
        return handle.createWritable().then(function (w) {
          return w.write(blob).then(function () { return w.close(); });
        });
      }).then(function () {
        setStatus('preview', '已保存到所选文件夹（建议：sixone/导出文件/）。');
      }).catch(function () {
        fallbackDownload(filename, blob);
      });
    } else {
      fallbackDownload(filename, blob);
    }
  }
  function exportTxt() {
    var chunks = buildChunks();
    var text = chunks.map(function (c) { return c.text; }).join('\n');
    var date = (state.meta.date || todayStr()).replace(/-/g, '');
    download('六个一素材本_' + date + '.txt', text);
  }
  function exportDocx() {
    var chunks = buildChunks();
    var sections = [], cur = null;
    chunks.forEach(function (c) {
      if (c.kind === 'title' || c.kind === 'subtitle') return;
      if (c.kind === 'h') { cur = { heading: c.text, paras: [] }; sections.push(cur); }
      else { if (!cur) { cur = { heading: '', paras: [] }; sections.push(cur); } cur.paras.push({ text: c.text, kind: c.kind === 'small' ? 'small' : 'body' }); }
    });
    var date = (state.meta.date || todayStr()).replace(/-/g, '');
    if (typeof window.downloadDocx === 'function') {
      window.downloadDocx({
        title: '六 个 一 · 语文素材本',
        name: state.meta.name ? '姓名/班级：' + state.meta.name : '',
        date: '日期：' + (state.meta.date || todayStr()),
        sections: sections
      }, '六个一素材本_' + date + '.docx');
    } else {
      alert('Word 导出组件加载失败，请使用 TXT 导出。');
    }
  }
  function copyAll() {
    var chunks = buildChunks();
    var text = chunks.map(function (c) { return c.text; }).join('\n');
    function done() { setStatus('preview', '已复制到剪贴板。'); }
    function fail() { setStatus('preview', '复制失败，请手动选择复制。'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { fail(); }
      ta.remove();
    }
  }

  /* ---------- 设置 ---------- */
  function openSettings() {
    $('#settings-apiKey').value = state.settings.apiKey || '';
    $('#settings-model').value = state.settings.model || 'deepseek-chat';
    $('#settings-baseUrl').value = state.settings.baseUrl || 'https://api.deepseek.com';
    $('#settings-status').textContent = '';
    $('#settings-modal').classList.add('show');
  }
  function closeSettings() { $('#settings-modal').classList.remove('show'); }
  function saveSettings() {
    state.settings.apiKey = $('#settings-apiKey').value.trim();
    state.settings.model = $('#settings-model').value;
    state.settings.baseUrl = $('#settings-baseUrl').value.trim() || 'https://api.deepseek.com';
    save();
    $('#settings-status').textContent = '已保存（Key 仅存于本机浏览器）。';
  }
  function testSettings() {
    saveSettings();
    $('#settings-status').textContent = '测试中…';
    callDeepSeek([{ role: 'user', content: '请只回复四个字：连接成功' }],
      function () { $('#settings-status').textContent = '✓ 连接成功，Key 可用。'; },
      function (err) { $('#settings-status').textContent = err; });
  }
  function clearSettings() {
    $('#settings-apiKey').value = '';
    state.settings.apiKey = '';
    save();
    $('#settings-status').textContent = '已清空 API Key。';
  }

  /* ---------- 事件：静态控件 ---------- */
  function attachStaticEvents() {
    var t = function (id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); };
    t('#settings-open', openSettings);
    t('#settings-close', closeSettings);
    t('#settings-save', saveSettings);
    t('#settings-test', testSettings);
    t('#settings-clear', clearSettings);
    t('#export-txt', exportTxt);
    t('#export-docx', exportDocx);
    t('#export-copy', copyAll);
    t('#export-print', function () { window.print(); });
    t('#export-txt2', exportTxt);
    t('#export-docx2', exportDocx);
    t('#export-copy2', copyAll);
    t('#geyan-toggle', function () { state.geyan.expanded = !state.geyan.expanded; renderGeyan(); });
    t('#shici-toggle', function () { state.shici.expanded = !state.shici.expanded; renderShici(); });
    t('#meiwen-toggle', function () { state.meiwen.expanded = !state.meiwen.expanded; renderMeiwen(); });
    t('#sucai-toggle', function () { state.sucai.expanded = !state.sucai.expanded; renderSucai(); });
    t('#geyan-add', function () {
      var txt = $('#geyan-add-text').value.trim(), src = $('#geyan-add-src').value.trim();
      if (!txt) { setStatus('geyan', '请填写格言内容。'); return; }
      state.geyan.items.push({ id: 'g' + Date.now(), text: txt, source: src || '自定义', theme: '自定义', checked: true, custom: true });
      $('#geyan-add-text').value = ''; $('#geyan-add-src').value = '';
      save(); renderGeyan(); renderPreview(); setStatus('geyan', '已添加。');
    });
    t('#geyan-ai', aiGeyan);
    t('#meiwen-ai', aiMeiwen);
    t('#shici-ai', aiShici);
    t('#sucai-ai', aiSucai);
    t('#sucai-hot', fetchHotlist);
    t('#sucai-update', refreshSucai);
    t('#sucai-exportjs', exportSucaiJs);
    t('#sucai-all', function () { state.sucai.items.forEach(function (i) { i.checked = true; }); save(); renderSucai(); renderPreview(); });
    t('#sucai-none', function () { state.sucai.items.forEach(function (i) { i.checked = false; }); save(); renderSucai(); renderPreview(); });
    t('#sucai-invert', function () { state.sucai.items.forEach(function (i) { i.checked = !i.checked; }); save(); renderSucai(); renderPreview(); });
    t('#clear-all', function () {
      if (window.confirm('确定清空全部记录（勾选、编辑、设置）？数据文件内容不受影响。')) {
        localStorage.removeItem(LS_KEY);
        window.location.reload();
      }
    });
  }

  /* ---------- 事件：委托（动态内容） ---------- */
  function bindDelegated() {
    document.addEventListener('change', function (e) {
      var el = e.target, d = el.dataset || {};
      if (d.geyanCheck) {
        var it = findItem('geyan', d.geyanCheck);
        if (it) { it.checked = el.checked; save(); renderGeyan(); renderPreview(); }
      } else if (d.shiciCheck) {
        var it2 = findItem('shici', d.shiciCheck);
        if (it2) { it2.checked = el.checked; save(); renderShici(); renderPreview(); }
      } else if (d.meiwenCheck) {
        var it3 = findItem('meiwen', d.meiwenCheck);
        if (it3) { it3.checked = el.checked; save(); renderMeiwen(); renderPreview(); }
      } else if (d.sucaiCheck) {
        var it4 = findItem('sucai', d.sucaiCheck);
        if (it4) { it4.checked = el.checked; save(); renderSucai(); renderPreview(); }
      } else if (el.id === 'geyan-enabled') { state.geyan.enabled = el.checked; save(); renderGeyan(); renderPreview(); }
      else if (el.id === 'shici-enabled') { state.shici.enabled = el.checked; save(); renderShici(); renderPreview(); }
      else if (el.id === 'meiwen-enabled') { state.meiwen.enabled = el.checked; save(); renderMeiwen(); renderPreview(); }
      else if (el.id === 'sucai-enabled') { state.sucai.enabled = el.checked; save(); renderSucai(); renderPreview(); }
      else if (el.id === 'meta-name') { state.meta.name = el.value; save(); renderPreview(); }
      else if (el.id === 'meta-date') { state.meta.date = el.value; save(); renderPreview(); }
    });
    document.addEventListener('input', function (e) {
      var el = e.target, d = el.dataset || {};
      if (d.shiciBody) { var it = findItem('shici', d.shiciBody); if (it) { it.body = el.value; save(); renderPreview(); } }
      else if (d.shiciAnalysis) { var it2 = findItem('shici', d.shiciAnalysis); if (it2) { it2.analysis = el.value; save(); renderPreview(); } }
      else if (d.meiwenBody) { var it3 = findItem('meiwen', d.meiwenBody); if (it3) { it3.body = el.value; save(); renderPreview(); } }
      else if (d.sucaiTitle) { var it4 = findItem('sucai', d.sucaiTitle); if (it4) { it4.title = el.value; save(); renderPreview(); } }
      else if (d.sucaiAnalysis) { var it5 = findItem('sucai', d.sucaiAnalysis); if (it5) { it5.analysis = el.value; save(); renderPreview(); } }
      else if (d.sucaiCategory) { var it6 = findItem('sucai', d.sucaiCategory); if (it6) { it6.category = el.value; save(); renderPreview(); } }
      else if (d.sucaiDate) { var it7 = findItem('sucai', d.sucaiDate); if (it7) { it7.date = el.value; save(); renderPreview(); } }
      else if (d.sucaiSource) { var it8 = findItem('sucai', d.sucaiSource); if (it8) { it8.source = el.value; save(); renderPreview(); } }
      else if (d.sucaiSummary) { var ita = findItem('sucai', d.sucaiSummary); if (ita) { ita.summary = el.value; save(); renderPreview(); } }
      else if (d.meiwenReq) { var itb = findItem('meiwen', d.meiwenReq); if (itb) { itb.req = el.value; save(); } }
      else if (d.sucaiReq) { var itc2 = findItem('sucai', d.sucaiReq); if (itc2) { itc2.req = el.value; save(); } }
      else if (el.id === 'geyan-target') { state.geyan.target = Math.max(1, +el.value || 5); save(); }
      else if (el.id === 'shici-genre') { state.shici.genre = el.value; save(); }
      else if (el.id === 'shici-maxlen') { state.shici.maxLen = Math.max(20, +el.value || 80); save(); }
      else if (el.id === 'shici-alen') { state.shici.analysisLen = Math.max(50, +el.value || 150); save(); }
      else if (el.id === 'meiwen-target') { state.meiwen.targetLen = Math.max(50, +el.value || 200); save(); }
      else if (el.id === 'sucai-tmin') { state.sucai.titleMin = Math.max(4, +el.value || 10); save(); }
      else if (el.id === 'sucai-tmax') { state.sucai.titleMax = Math.max(4, +el.value || 20); save(); }
      else if (el.id === 'sucai-alen') { state.sucai.analysisLen = Math.max(30, +el.value || 75); save(); }
      else if (el.id === 'sucai-count') { state.sucai.updateCount = Math.max(1, +el.value || 5); save(); }
      else if (el.id === 'meta-name' || el.id === 'meta-date') { save(); }
      if (el.dataset && (el.dataset.shiciBody || el.dataset.shiciAnalysis || el.dataset.meiwenBody || el.dataset.sucaiTitle || el.dataset.sucaiAnalysis)) refreshBadges();
    });
    document.addEventListener('click', function (e) {
      var el = e.target;
      var th = el.getAttribute && el.getAttribute('data-theme');
      if (th) { state.geyan.filter = th; renderGeyan(); return; }
      var sa = el.getAttribute && el.getAttribute('data-shici-an');
      if (sa) { var it0 = findItem('shici', sa); if (it0) aiShiciAnalysis(it0); return; }
      var mr = el.getAttribute && el.getAttribute('data-meiwen-regen');
      if (mr) { var itm = findItem('meiwen', mr); if (itm) aiMeiwenRegen(itm); return; }
      var cr = el.getAttribute && el.getAttribute('data-sucai-regen');
      if (cr) { var itc = findItem('sucai', cr); if (itc) aiSucaiRegen(itc); return; }
      var delMap = [['data-geyan-del', 'geyan'], ['data-shici-del', 'shici'], ['data-meiwen-del', 'meiwen'], ['data-sucai-del', 'sucai']];
      for (var di = 0; di < delMap.length; di++) {
        var attr = el.getAttribute && el.getAttribute(delMap[di][0]);
        if (attr) {
          var arr = state[delMap[di][1]].items;
          var idx = -1;
          for (var j = 0; j < arr.length; j++) if (arr[j].id === attr) idx = j;
          if (idx >= 0) {
            if (!arr[idx].custom && state.deletedIds.indexOf(attr) < 0) state.deletedIds.push(attr);
            arr.splice(idx, 1);
          }
          save(); renderAll(); return;
        }
      }
    });
  }
  function findItem(section, id) {
    var arr = state[section].items;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  /* ---------- 启动 ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    attachStaticEvents();
    bindDelegated();
    renderAll();
    save();
  });
})();