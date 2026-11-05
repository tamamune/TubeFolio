// 視聴記録画面
(async () => {
  const $ = s => document.querySelector(s);
  const esc = TG.esc;
  const PAGE = 50, INIT = 10; // 最初は10本だけ、「もっと見る」で50本ずつ
  let period = 7, rows = [], shown = 0, D = null;

  const fmtDur = sec => {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h) return `${h}時間${m}分`;
    if (m) return `${m}分`;
    return `${sec}秒`;
  };
  const clock = sec => {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const num = n => (n ? n.toLocaleString('ja-JP') : '—');
  const when = t => {
    const d = new Date(t);
    const today = TG.dayKey() === TG.dayKey(t);
    return today ? `今日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  async function loadAll() {
    const [d, st] = await Promise.all([
      TG.load(),
      chrome.storage.local.get(['history', 'daily', 'statsPeriod', 'statsGroup', 'rydOn', 'rydCache', 'ytHistOn', 'lastHistImport'])
    ]);
    period = st.statsPeriod ?? 7;
    groupDay = !!st.statsGroup;
    D = { ...d, history: st.history || {}, daily: st.daily || {}, ryd: !!st.rydOn, rydCache: st.rydCache || {} };
    D.fmap = TG.folderMap(D.channels, D.folders);
    D.roots = new Map(D.folders.map(f => [f.id, TG.rootOf(D.folders, f.id)]));
    $('#ryd').checked = D.ryd;
    document.body.classList.toggle('ryd', D.ryd);
    try { render(); $('#err')?.remove(); }
    catch (e) { showErr(e); }
  }
  // 表示できなかったときは画面と動作ログに原因を残す
  function showErr(e) {
    console.error(e);
    TG.log('視聴記録', '表示エラー：' + (e?.stack || e?.message || e), 'error');
    let box = $('#err');
    if (!box) { box = document.createElement('div'); box.id = 'err'; box.className = 'errbox'; document.querySelector('main').prepend(box); }
    box.textContent = '視聴記録を表示できませんでした：' + (e?.message || e) + '（動作ログに詳細を残しました）';
  }
  window.addEventListener('error', e => showErr(e.error || e.message));
  window.addEventListener('unhandledrejection', e => showErr(e.reason));

  // ---------- 期間 ----------
  //   数（日数）／'w0'＝今週／'w1'＝先週（月曜はじまり）／0＝すべて。範囲は [start, end)
  const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
  function rangeOf(p) {
    const now = Date.now(), today = dayStart(now);
    if (!p) return [0, now + 1];
    if (p === 'w0' || p === 'w1') {
      const m = new Date(today); m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
      if (p === 'w0') return [m.getTime(), now + 1];
      const pm = new Date(m); pm.setDate(pm.getDate() - 7);
      return [pm.getTime(), m.getTime()];
    }
    const s = new Date(today); s.setDate(s.getDate() - (p - 1));
    return [s.getTime(), now + 1];
  }
  const dayMs = 864e5;
  // 期間の集計（視聴時間・見た動画・ショート）
  function summarize(s, e) {
    let sec = 0;
    for (const [k, v] of Object.entries(D.daily)) { const t = new Date(k + 'T00:00:00').getTime(); if (t >= s && t < e) sec += v; }
    const hs = Object.values(D.history).filter(h => (h.last || 0) >= s && (h.last || 0) < e && (h.sec || 0) >= 5);
    return { sec, n: hs.length, shorts: hs.filter(h => h.short).length };
  }
  // 前の期間との差（▲ 増えた ▼ 減った）
  function delta(cur, prev, isTime, unit = '') {
    if (prev == null) return '';
    const d = cur - prev;
    if (!d) return ' <span class="muted">±0</span>';
    const txt = isTime ? fmtDur(Math.abs(d)) : Math.abs(d) + unit;
    return ` <span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲ +' : '▼ −'}${txt}</span>`;
  }
  const PNAME = { 1: '今日', 7: '7日間', w0: '今週', w1: '先週', 30: '30日間', 90: '90日間' };

  function render() {
    document.querySelectorAll('#period button').forEach(b => b.classList.toggle('on', b.dataset.p === String(period)));
    const [start, end] = rangeOf(period);
    const hist = Object.entries(D.history).map(([v, h]) => ({ v, ...h })).filter(h => (h.last || 0) >= start && (h.last || 0) < end && (h.sec || 0) >= 5);

    // ---------- 集計 ----------
    const days = Object.entries(D.daily).filter(([k]) => { const t = new Date(k + 'T00:00:00').getTime(); return t >= start && t < end; });
    const total = days.reduce((a, [, s]) => a + s, 0);
    const nDays = period === 0 ? Math.max(1, days.length) : Math.max(1, Math.round((Math.min(end, Date.now() + 1) - start) / dayMs));
    const liked = hist.filter(h => h.rate === 'like').length;
    const disliked = hist.filter(h => h.rate === 'dislike').length;
    const finished = hist.filter(h => h.d && h.sec >= h.d * 0.9).length;
    // 前の同じ長さの期間と比べる
    const prev = period ? summarize(start - (Math.min(end, Date.now() + 1) - start), start) : null;
    const cmp = period ? `（前の期間：${PNAME[period] ? '直前の' + PNAME[period] : ''}）` : '';
    // 見た日数・連続日数（今日から数えて）
    const active = new Set(days.filter(([, s]) => s > 0).map(([k]) => k));
    let streak = 0;
    for (let d = dayStart(Date.now()); ; d.setDate(d.getDate() - 1)) { if (D.daily[TG.dayKey(d.getTime())] > 0) streak++; else if (streak || d.getTime() < dayStart(Date.now()).getTime()) break; if (streak > 3650) break; }
    const best = days.slice().sort((a, b) => b[1] - a[1])[0];
    const bestD = best ? new Date(best[0] + 'T00:00:00') : null;
    $('#kpis').innerHTML = [
      ['視聴時間', fmtDur(total), `1日平均 ${fmtDur(total / nDays)}${prev ? delta(total, prev.sec, true) : ''}`],
      ['見た動画', `${hist.length} 本`, `最後まで見た ${finished} 本${prev ? delta(hist.length, prev.n, false, '本') : ''}`],
      ['ショート', `${hist.filter(h => h.short).length} 本`, `通常の動画 ${hist.filter(h => !h.short).length} 本${prev ? delta(hist.filter(h => h.short).length, prev.shorts, false, '本') : ''}`],
      ['見た日数', `${active.size} 日`, streak ? `${streak} 日連続中` : '今日はまだ見ていません'],
      ['いちばん長い日', best ? fmtDur(best[1]) : '—', bestD ? `${bestD.getMonth() + 1}/${bestD.getDate()}` : ''],
      ['あなたの評価', `👍 ${liked}　👎 ${disliked}`, '高評価・低評価した動画'],
      ['チャンネル', `${new Set(hist.map(h => h.k || h.ch)).size}`, '見たチャンネルの数']
    ].map(([lb, v, s]) => `<div class="kpi"><div class="lb">${lb}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');
    void cmp;

    renderDaily(start, end);
    renderMonthly();
    renderFolders(hist);
    renderChannels(hist);
    renderTopVideos(hist);
    renderVideos(hist, keepRows);
    keepRows = 0;
    window.TGPat?.setPeriod(period);
    const pr = $('#pRange'); if (pr) pr.textContent = period ? `${new Date(start).getMonth() + 1}/${new Date(start).getDate()}〜` : '';
    $('#vsecN').textContent = ` ${rows.length} 本`;
  }
  let keepRows = 0;
  let filt = null; // フォルダ・チャンネルで絞り込み中：{ t: 'folder'|'channel', k, label }

  function renderDaily(start, end) {
    const today0 = dayStart(Date.now());
    let first, last;
    if (!period) { first = new Date(today0); first.setDate(first.getDate() - 89); last = today0; }
    else { first = dayStart(start); last = new Date(Math.min(end - 1, today0.getTime())); }
    const cols = [];
    for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
      const dd = new Date(d), k = TG.dayKey(dd.getTime());
      cols.push({ k, d: dd, s: D.daily[k] || 0 });
    }
    const max = Math.max(60, ...cols.map(c => c.s));
    const today = TG.dayKey();
    $('#daily').innerHTML = cols.map(c => `<div class="col ${c.k === today ? 'today' : ''}">
        <span class="tip">${c.d.getMonth() + 1}/${c.d.getDate()}　${fmtDur(c.s)}</span>
        <div class="b" style="height:${(c.s / max) * 100}%"></div></div>`).join('');
    const step = Math.ceil(cols.length / 15);
    let axis = document.querySelector('#daily + .daily-axis');
    if (!axis) { axis = document.createElement('div'); axis.className = 'daily-axis'; $('#daily').after(axis); }
    axis.innerHTML = cols.map((c, i) => `<span>${i % step === 0 ? `${c.d.getMonth() + 1}/${c.d.getDate()}` : ''}</span>`).join('');
    $('#dailyNote').textContent = period ? '' : '直近90日';
  }

  // 月ごとの推移（直近12か月・期間の選択とは関係なく）
  function renderMonthly() {
    const now = new Date();
    const cols = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); cols.push({ d, k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, s: 0 }); }
    const idx = new Map(cols.map((c, i) => [c.k, i]));
    for (const [k, v] of Object.entries(D.daily)) { const i = idx.get(k.slice(0, 7)); if (i != null) cols[i].s += v; }
    const max = Math.max(3600, ...cols.map(c => c.s));
    $('#monthly').innerHTML = cols.map((c, i) => `<div class="col ${i === cols.length - 1 ? 'today' : ''}">
        <span class="tip">${c.d.getFullYear()}年${c.d.getMonth() + 1}月　${fmtDur(c.s)}</span>
        <div class="b" style="height:${(c.s / max) * 100}%"></div></div>`).join('');
    $('#monthlyAxis').innerHTML = cols.map(c => `<span>${c.d.getMonth() + 1}月</span>`).join('');
    const cur = cols[cols.length - 1].s, pre = cols[cols.length - 2].s;
    const withData = cols.filter(c => c.s > 0);
    $('#monthlyNote').innerHTML = `今月 ${fmtDur(cur)}${pre ? `（先月 ${fmtDur(pre)}${delta(cur, pre, true)}）` : ''}${withData.length ? `　月平均 ${fmtDur(withData.reduce((a, c) => a + c.s, 0) / withData.length)}` : ''}`;
  }

  // 動画のチャンネルが入っているフォルダ（トップ階層でまとめる）
  function topFolders(h) {
    const fs = D.fmap.get(h.k) || [];
    return [...new Map(fs.map(f => { const r = D.roots.get(f.id) || f; return [r.id, r]; })).values()];
  }

  function hbars(el, list, emptyMsg) {
    if (!list.length) { el.innerHTML = `<p class="muted">${emptyMsg}</p>`; return; }
    const max = Math.max(...list.map(x => x.sec));
    el.innerHTML = list.map(x => `<div class="hb ${filt && x.ft === filt.t && x.fk === filt.k ? 'sel' : ''}" ${x.ft ? `data-ft="${x.ft}" data-fk="${esc(x.fk)}" data-fl="${esc(x.name)}" title="押すと、見た動画をこれだけに絞り込みます"` : ''}>
      <span class="nm">${x.color ? `<i class="dot" style="background:${esc(x.color)}"></i>` : ''}${x.href && !x.ft ? `<a href="${esc(x.href)}" target="_blank">${esc(x.name)}</a>` : esc(x.name)}${x.href && x.ft ? `<a class="ext" href="${esc(x.href)}" target="_blank" title="開く">↗</a>` : ''}</span>
      <span class="track"><span class="fill" style="width:${(x.sec / max) * 100}%;${x.color ? `background:${esc(x.color)}` : ''}"></span></span>
      <span class="val">${x.label ?? `${fmtDur(x.sec)}・${x.n}本`}</span></div>`).join('');
  }

  function renderFolders(hist) {
    const m = new Map();
    for (const h of hist) {
      const fs = topFolders(h);
      const keys = fs.length ? fs.map(f => [f.id, f.name, f.color]) : [['__none', '未分類', '#888']];
      for (const [id, name, color] of keys) {
        const e = m.get(id) || { name, color, sec: 0, n: 0, ft: 'folder', fk: id };
        e.sec += h.sec; e.n++;
        m.set(id, e);
      }
    }
    hbars($('#folders'), [...m.values()].sort((a, b) => b.sec - a.sec), 'まだ記録がありません');
  }

  function renderChannels(hist) {
    const m = new Map();
    for (const h of hist) {
      const key = h.k || h.ch;
      if (!key) continue;
      const e = m.get(key) || { name: D.channels[h.k]?.name || h.ch || h.k, href: h.k ? TG.channelUrl(h.k) : '', sec: 0, n: 0, ft: 'channel', fk: key };
      e.sec += h.sec; e.n++;
      m.set(key, e);
    }
    hbars($('#channels'), [...m.values()].sort((a, b) => b.sec - a.sec).slice(0, 10), 'まだ記録がありません');
  }

  // 時間をかけた動画 上位5
  function renderTopVideos(hist) {
    const top = hist.slice().sort((a, b) => (b.sec || 0) - (a.sec || 0)).slice(0, 5).map(h => ({
      name: h.t || h.v, href: h.short ? `https://www.youtube.com/shorts/${h.v}` : `https://www.youtube.com/watch?v=${h.v}`, sec: h.sec, label: `${fmtDur(h.sec)}${h.d ? ` / ${clock(h.d)}` : ''}`
    }));
    hbars($('#topVideos'), top, 'まだ記録がありません');
  }

  // ---------- 動画一覧 ----------
  let groupDay = false, lastDayKey = '', dayTotals = new Map();
  const dayLabel = t => {
    const d = new Date(t), k = TG.dayKey(t), td = TG.dayKey(), yd = TG.dayKey(Date.now() - dayMs);
    const w = '日月火水木金土'[d.getDay()];
    return k === td ? `今日（${d.getMonth() + 1}/${d.getDate()} ${w}）` : k === yd ? `昨日（${d.getMonth() + 1}/${d.getDate()} ${w}）` : `${d.getMonth() + 1}/${d.getDate()}（${w}）`;
  };
  function renderVideos(hist, keep = 0) {
    const q = $('#q').value.trim().toLowerCase();
    const sort = $('#sort').value;
    const pctOf = h => (h.d ? Math.min(100, (h.sec / h.d) * 100) : 0);
    const fp = +$('#fPct').value, fv = +$('#fViews').value, [l0, l1] = ($('#fLen').value || '-').split('-');
    rows = hist.filter(h => !q || (h.t || '').toLowerCase().includes(q) || (h.ch || '').toLowerCase().includes(q));
    // フォルダ・チャンネルの棒を押して絞り込み
    if (filt) {
      rows = rows.filter(h => filt.t === 'channel' ? (h.k || h.ch) === filt.k : (topFolders(h).length ? topFolders(h).some(f => f.id === filt.k) : filt.k === '__none'));
    }
    const chip = $('#fchip');
    chip.hidden = !filt;
    if (filt) chip.innerHTML = `${filt.t === 'folder' ? '📁' : '📺'} ${esc(filt.label)} だけを表示中<button id="fchipx" title="絞り込みを解除">✕</button>`;
    // 絞り込み：見た割合・再生数・長さ（長さの分からない動画は長さの絞り込みで除く）
    if (fp > 0) rows = rows.filter(h => h.d && pctOf(h) >= fp); else if (fp < 0) rows = rows.filter(h => h.d && pctOf(h) < -fp);
    if (fv > 0) rows = rows.filter(h => (h.views || 0) >= fv); else if (fv < 0) rows = rows.filter(h => h.views && h.views < -fv);
    if (l0 || l1) rows = rows.filter(h => h.d && h.d >= (+l0 || 0) && (!l1 || h.d < +l1));
    const nf = (fp ? 1 : 0) + (fv ? 1 : 0) + ((l0 || l1) ? 1 : 0);
    $('#fReset').hidden = !nf;
    $('#fCnt').textContent = nf ? `（${nf}）` : '';
    if (sort === 'rate') rows = rows.filter(h => h.rate);
    const by = { last: h => h.last || 0, sec: h => h.sec || 0, views: h => h.views || 0, likes: h => h.likes || 0, rate: h => h.last || 0, pct: pctOf, dur: h => h.d || 0 }[sort];
    rows.sort(groupDay ? (a, b) => (b.last || 0) - (a.last || 0) : (a, b) => by(b) - by(a));
    $('#sort').disabled = groupDay;
    $('#grp').classList.toggle('on', groupDay);
    dayTotals = new Map();
    for (const h of rows) { const k = TG.dayKey(h.last || 0); const e = dayTotals.get(k) || { sec: 0, n: 0 }; e.sec += h.sec || 0; e.n++; dayTotals.set(k, e); }
    shown = 0; lastDayKey = '';
    $('#videos tbody').innerHTML = '';
    $('#count').textContent = `${rows.length} 本`;
    $('#empty').hidden = rows.length > 0;
    more(Math.max(INIT, keep));
  }

  function rowHtml(h) {
    const pct = h.d ? Math.min(100, Math.round((h.sec / h.d) * 100)) : 0;
    const tags = (D.fmap.get(h.k) || []).map(f => `<span class="tag" style="--c:${esc(f.color)}">${esc(f.name)}</span>`).join('');
    const r = D.rydCache[h.v];
    const url = h.short ? `https://www.youtube.com/shorts/${h.v}` : `https://www.youtube.com/watch?v=${h.v}`;
    let head = '';
    if (groupDay) {
      const k = TG.dayKey(h.last || 0);
      if (k !== lastDayKey) { lastDayKey = k; const t = dayTotals.get(k); head = `<tr class="dayhead"><td colspan="7">${dayLabel(h.last || 0)}<small>${t.n} 本・${fmtDur(t.sec)}</small></td></tr>`; }
    }
    return head + `<tr data-v="${esc(h.v)}">
      <td class="c-when">${h.src === 'yt' ? `${new Date(h.last).getMonth() + 1}/${new Date(h.last).getDate()}` : when(h.last)}</td>
      <td><div class="vid"><a href="${url}" target="_blank"><img src="https://i.ytimg.com/vi/${esc(h.v)}/mqdefault.jpg" loading="lazy" alt=""></a>
        <div><a class="t" href="${url}" target="_blank">${esc(h.t || h.v)}</a>
        <div class="c">${h.src === 'yt' || h.src === 'mix' ? '<span class="src-yt" title="YouTubeの履歴から取り込み（視聴時間は推定）">📱 履歴</span>' : ''}${h.short ? '<span class="short-tag">ショート</span>' : ''}${esc(h.ch || '')}${tags}</div></div></div></td>
      <td><div class="prog">${h.src === 'yt' ? '約' : ''}${fmtDur(h.sec)}${h.d ? ` / ${clock(h.d)}` : ''}${h.d ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div></td>
      <td class="num">${num(h.views)}</td>
      <td class="num">${num(h.likes || r?.likes)}</td>
      <td class="num ryd-col" data-ryd>${r ? num(r.dislikes) : D.ryd ? '…' : ''}</td>
      <td class="c-rate">${h.rate === 'like' ? '👍' : h.rate === 'dislike' ? '👎' : ''}</td></tr>`;
  }

  function more(n = PAGE) {
    const part = rows.slice(shown, shown + (typeof n === 'number' ? n : PAGE));
    $('#videos tbody').insertAdjacentHTML('beforeend', part.map(rowHtml).join(''));
    shown += part.length;
    $('#more').hidden = shown >= rows.length;
    if (D.ryd) fetchRyd(part.map(h => h.v));
  }

  // いま表示している一覧（絞り込み後）を CSV で保存
  function exportCsv() {
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['最後に見た日時', 'タイトル', 'チャンネル', '視聴時間（秒）', '動画の長さ（秒）', '再生数', '高評価数', 'ショート', 'あなたの評価', 'URL'];
    const lines = rows.map(h => [h.last ? new Date(h.last).toLocaleString('ja-JP') : '', h.t, h.ch, Math.round(h.sec || 0), h.d || '', h.views || '', h.likes || '', h.short ? 'はい' : '', h.rate === 'like' ? '高評価' : h.rate === 'dislike' ? '低評価' : '', `https://www.youtube.com/watch?v=${h.v}`].map(cell).join(','));
    const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tubefolio-視聴記録-${TG.dayKey()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    TG.log('視聴記録', `CSV を保存：${rows.length} 本`);
  }

  // ---------- 低評価数（Return YouTube Dislike の推定値） ----------
  let rydSaveT = null;
  async function fetchRyd(ids) {
    const need = ids.filter(v => !D.rydCache[v] || Date.now() - D.rydCache[v].at > 864e5);
    let i = 0;
    const worker = async () => {
      while (i < need.length) {
        const v = need[i++];
        try {
          const r = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(v)}`);
          if (!r.ok) continue;
          const j = await r.json();
          D.rydCache[v] = { at: Date.now(), dislikes: j.dislikes || 0, likes: j.likes || 0 };
          const cell = document.querySelector(`tr[data-v="${CSS.escape(v)}"] [data-ryd]`);
          if (cell) cell.textContent = num(j.dislikes);
        } catch { /* 取得できないものは空欄 */ }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    clearTimeout(rydSaveT);
    rydSaveT = setTimeout(() => chrome.storage.local.set({ rydCache: D.rydCache }), 1000);
    document.querySelectorAll('[data-ryd]').forEach(c => { if (c.textContent === '…') c.textContent = '—'; });
  }

  // ---------- 操作 ----------
  $('#period').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    period = /^\d+$/.test(b.dataset.p) ? +b.dataset.p : b.dataset.p;
    chrome.storage.local.set({ statsPeriod: period, prefsAt: Date.now() });
    render();
  });
  $('#q').addEventListener('input', () => render());
  $('#sort').addEventListener('change', () => render());
  ['#fPct', '#fViews', '#fLen'].forEach(s => $(s).addEventListener('change', () => render()));
  $('#fReset').addEventListener('click', () => { $('#fPct').value = '0'; $('#fViews').value = '0'; $('#fLen').value = ''; render(); });
  $('#more').addEventListener('click', more);
  // フォルダ・チャンネルの棒を押して、見た動画を絞り込む（もう一度押すと解除）
  const hbClick = e => {
    if (e.target.closest('a')) return;
    const hb = e.target.closest('.hb[data-ft]');
    if (!hb) return;
    const t = hb.dataset.ft, k = hb.dataset.fk;
    filt = filt && filt.t === t && filt.k === k ? null : { t, k, label: hb.dataset.fl };
    render();
    if (filt) { $('#vsec').open = true; $('#s-videos').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };
  $('#folders').addEventListener('click', hbClick);
  $('#channels').addEventListener('click', hbClick);
  $('#fchip').addEventListener('click', e => { if (e.target.closest('#fchipx')) { filt = null; render(); } });
  $('#grp').addEventListener('click', () => { groupDay = !groupDay; chrome.storage.local.set({ statsGroup: groupDay, prefsAt: Date.now() }); render(); });
  $('#csv').addEventListener('click', exportCsv);
  $('#ryd').addEventListener('change', async e => {
    D.ryd = e.target.checked;
    document.body.classList.toggle('ryd', D.ryd);
    await chrome.storage.local.set({ rydOn: D.ryd });
    if (D.ryd) fetchRyd(rows.slice(0, shown).map(h => h.v));
  });
  $('#clear').addEventListener('click', async () => {
    if (!confirm('視聴記録（視聴時間・見た動画の一覧）をすべて消去しますか？\n（視聴済みの表示やフォルダ設定は消えません）')) return;
    await chrome.storage.local.remove(['history', 'daily', 'ytHistSeen', 'lastHistImport', 'dayCh', 'dayHr', 'dayYt']);
    loadAll();
  });
  // 別のタブで再生中は記録が数秒ごとに増えるので、まとめて15秒ごとに更新（表示中の行数とスクロール位置は保つ）
  let liveT = null;
  chrome.storage.onChanged.addListener(ch => {
    if (!(ch.history || ch.daily || ch.folders)) return;
    clearTimeout(liveT);
    liveT = setTimeout(() => { keepRows = shown; const y = scrollY; loadAll().then(() => scrollTo(0, y)); }, 15000);
  });

  loadAll().catch(showErr);
})();

document.getElementById('openLog')?.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'openPage', page: 'log' }));
