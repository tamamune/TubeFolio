// 急上昇動画（日本・Top 50）を、画面の右端からスライドして出す。日付を前後に動かせる。
//   データは background.js が Top1Trend（t1trend.com）の日別ランキングから読む。
//   直近10日ほどは日付ごとの保存が無く、最新と同じ一覧が返るので、その日は注意を出す。
(() => {
  if (window.__tgTrendVid) return;
  window.__tgTrendVid = true;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = () => ymd(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  let on = true, open = false, date = todayStr(), seq = 0;

  const css = document.createElement('style');
  css.textContent = `
#tg-tv-tab{position:fixed;right:0;top:calc(42% + 128px);z-index:2301;writing-mode:vertical-rl;padding:12px 6px;border:0;border-radius:10px 0 0 10px;cursor:pointer;font:13px/1 Roboto,Arial,"Noto Sans JP",sans-serif;letter-spacing:2px;color:var(--yt-spec-text-primary,#f1f1f1);background:var(--yt-spec-badge-chip-background,#3f3f3f);box-shadow:-2px 2px 8px #0005;transition:right .25s}
#tg-tv-tab:hover{background:var(--yt-spec-button-chip-background-hover,#555)}
#tg-tv-tab.on{right:432px}
#tg-tv{position:fixed;top:56px;right:0;bottom:0;width:432px;z-index:2300;transform:translateX(100%);transition:transform .25s;display:flex;flex-direction:column;font:14px/1.4 Roboto,Arial,"Noto Sans JP",sans-serif;color:var(--yt-spec-text-primary,#f1f1f1);background:var(--yt-spec-menu-background,var(--yt-spec-base-background,#212121));border-left:1px solid var(--yt-spec-10-percent-layer,#444);box-shadow:-4px 0 16px #0004}
#tg-tv.on{transform:none}
#tg-tv .tv-h{display:flex;align-items:center;gap:6px;padding:12px 14px 8px}
#tg-tv .tv-h b{flex:1;min-width:0;font-size:15px;white-space:nowrap}
#tg-tv .tv-h small{display:block;white-space:nowrap;font-weight:400;font-size:11px;color:var(--yt-spec-text-secondary,#aaa)}
#tg-tv button{border:0;background:none;color:inherit;cursor:pointer;font:inherit;font-size:15px;padding:4px 8px;border-radius:6px}
#tg-tv button:hover{background:var(--yt-spec-badge-chip-background,#3f3f3f)}
#tg-tv .tv-n{display:flex;align-items:center;gap:6px;padding:0 14px 10px;border-bottom:1px solid var(--yt-spec-10-percent-layer,#444)}
#tg-tv .tv-n input{flex:1;min-width:0;padding:5px 8px;border-radius:8px;border:1px solid var(--yt-spec-10-percent-layer,#555);background:transparent;color:inherit;font:inherit;color-scheme:dark light}
#tg-tv .tv-n button{border:1px solid var(--yt-spec-10-percent-layer,#555)}
#tg-tv .tv-w{margin:8px 14px 0;padding:6px 10px;border-radius:8px;font-size:12px;background:#ff980033;color:var(--yt-spec-text-primary,#f1f1f1)}
#tg-tv .tv-l{overflow:auto;flex:1;padding:4px 0}
#tg-tv .tv-i{position:relative;display:flex;gap:10px;align-items:flex-start;padding:7px 14px;color:inherit;text-decoration:none}
#tg-tv .tv-i:hover{background:var(--yt-spec-badge-chip-background,#3f3f3f)}
#tg-tv .tv-r{width:24px;text-align:right;flex:none;font-size:13px;color:var(--yt-spec-text-secondary,#aaa);padding-top:2px}
#tg-tv .tv-r.top{color:#ffb300;font-weight:700}
#tg-tv .tv-t{position:relative;flex:none;width:120px;height:68px;border-radius:8px;overflow:hidden;background:#000}
#tg-tv .tv-t img{width:100%;height:100%;object-fit:cover;display:block}
#tg-tv .tv-t i{position:absolute;right:3px;bottom:3px;padding:1px 4px;border-radius:4px;background:#000c;color:#fff;font-style:normal;font-size:11px}
#tg-tv .tv-t:has(.tg-fp-emb),#tg-tv .tv-t:has(.tg-fp-sb){overflow:hidden}
#tg-tv .tv-t.tg-fp-on i,#tg-tv .tv-t.tg-fp-on .tv-wb{opacity:0}
#tg-tv .tv-t .tv-wb{display:none;position:absolute;right:3px;top:3px;padding:1px 5px;border-radius:4px;background:rgba(0,0,0,.8);color:#fff;font-size:11px;font-weight:600;z-index:3}
#tg-tv .tv-t .tv-bar{display:none;position:absolute;left:3px;bottom:3px;height:3px;width:calc((100% - 6px) * var(--tg-wpn,0));background:#f00;z-index:5;border-radius:0 2px 2px 0}
#tg-tv .tv-i.tg-watched .tv-wb,#tg-tv .tv-i.tg-partial .tv-wb,#tg-tv .tv-i.tg-watched .tv-bar,#tg-tv .tv-i.tg-partial .tv-bar{display:block}
#tg-tv .tv-i.tg-watched .tv-wb{background:#3ea6ff;color:#0f0f0f}
#tg-tv .tv-i.tg-watched .tv-t img{filter:brightness(.45) saturate(.6)}
#tg-tv .tv-i.tg-watched .tv-ti{color:var(--yt-spec-text-secondary,#aaa)}
#tg-tv .tv-i.tg-watched .tv-t i{bottom:8px}
#tg-tv .tv-b{flex:1;min-width:0}
#tg-tv .tv-b span{display:block}
#tg-tv .tv-ti{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px}
#tg-tv .tv-s{font-size:11px;color:var(--yt-spec-text-secondary,#aaa);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tg-tv .tv-later{position:absolute;right:12px;bottom:6px;padding:3px 8px;font-size:13px;border:1px solid var(--yt-spec-10-percent-layer,#555);border-radius:12px;background:var(--yt-spec-menu-background,#212121);opacity:.9}
#tg-tv .tv-later.on{background:#2e7d32;color:#fff;border-color:#2e7d32}
#tg-tv .tv-m{padding:14px;color:var(--yt-spec-text-secondary,#aaa)}`;
  document.documentElement.appendChild(css);

  const tab = document.createElement('button');
  tab.id = 'tg-tv-tab'; tab.textContent = '📈 急上昇動画'; tab.title = '日本の急上昇動画 Top 50（日付を移動できます）';
  const panel = document.createElement('div');
  panel.id = 'tg-tv';
  panel.innerHTML = '<div class="tv-h"><b>📈 急上昇動画<small>日本・Top 50（Top1Trend）</small></b><button class="tv-r2" title="取り直す">↻</button><button class="tv-x" title="閉じる">✕</button></div>'
    + '<div class="tv-n"><button class="tv-prev" title="前の日">◀</button><input type="date" class="tv-d"><button class="tv-next" title="次の日">▶</button><button class="tv-now" title="最新">最新</button></div>'
    + '<div class="tv-wrap"></div><div class="tv-l"><div class="tv-m">読み込み中…</div></div>';
  document.documentElement.append(tab, panel);
  const list = panel.querySelector('.tv-l'), wrap = panel.querySelector('.tv-wrap'), inp = panel.querySelector('.tv-d');
  inp.max = todayStr(); inp.min = '2026-01-01';

  function setOpen(v) {
    open = v;
    tab.classList.toggle('on', v); panel.classList.toggle('on', v);
    if (v) { document.dispatchEvent(new CustomEvent('tg-panel-open', { detail: 'tv' })); if (!list.dataset.loaded) go(date); }
  }
  tab.addEventListener('click', () => setOpen(!open));
  panel.querySelector('.tv-x').addEventListener('click', () => setOpen(false));
  document.addEventListener('tg-panel-open', e => { if (e.detail !== 'tv' && open) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });
  panel.querySelector('.tv-r2').addEventListener('click', () => go(date, true));
  panel.querySelector('.tv-prev').addEventListener('click', () => go(addDays(date, -1)));
  panel.querySelector('.tv-next').addEventListener('click', () => { if (date < todayStr()) go(addDays(date, 1)); });
  panel.querySelector('.tv-now').addEventListener('click', () => go(todayStr()));
  inp.addEventListener('change', () => { if (inp.value) go(inp.value > todayStr() ? todayStr() : inp.value); });

  // ---- TubeFolio の「後で見る」に追加 ----
  let laterSet = new Set();
  const byId = new Map();
  const secOf = d => String(d || '').split(':').reduce((a, x) => a * 60 + (+x || 0), 0);
  const paintLater = b => {
    const on = laterSet.has(b.dataset.v);
    b.classList.toggle('on', on);
    b.textContent = on ? '✓ 後で見る' : '🕒 後で見る';
    b.title = on ? 'TubeFolioの「後で見る」から外す' : 'TubeFolioの「後で見る」に追加';
  };
  const paintAll = () => list.querySelectorAll('.tv-later').forEach(paintLater);
  try {
    chrome.storage.local.get('later').then(r => { laterSet = new Set((r.later || []).map(x => x.v)); paintAll(); });
    chrome.storage.onChanged.addListener(ch => { if (ch.later) { laterSet = new Set((ch.later.newValue || []).map(x => x.v)); paintAll(); } });
  } catch { /* なし */ }
  // ---- 視聴済み（TubeFolioの一覧と同じ：90%以上で薄く、途中は％とバー）----
  const WATCHED = 90;
  let watched = {};
  const paintWatched = () => list.querySelectorAll('.tv-i[data-v]').forEach(a => {
    const p = watched[a.dataset.v]?.p || 0;
    a.classList.toggle('tg-watched', p >= WATCHED);
    a.classList.toggle('tg-partial', p > 0 && p < WATCHED);
    a.style.setProperty('--tg-wpn', p / 100);
    const b = a.querySelector('.tv-wb');
    if (b) b.textContent = p >= WATCHED ? '視聴済み' : p > 0 ? `途中 ${Math.round(p)}%` : '';
  });
  try {
    chrome.storage.local.get('watched').then(r => { watched = r.watched || {}; paintWatched(); });
    chrome.storage.onChanged.addListener(ch => { if (ch.watched) { watched = ch.watched.newValue || {}; paintWatched(); } });
  } catch { /* なし */ }
  list.addEventListener('click', async e => {
    const b = e.target.closest('.tv-later'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); // 動画のリンクを開かない
    const it = byId.get(b.dataset.v); if (!it || b.dataset.busy) return;
    b.dataset.busy = '1';
    try {
      const added = await TGX.toggleLater({ v: it.id, t: it.title, p: 0, th: `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`, d: secOf(it.dur), ch: { key: '', name: it.channel, unsub: true } });
      laterSet[added ? 'add' : 'delete'](it.id); paintAll();
    } catch (err) { b.title = '追加できませんでした：' + (err?.message || err); }
    finally { delete b.dataset.busy; }
  });

  function go(d, force) {
    date = d; inp.value = d; inp.max = todayStr();
    panel.querySelector('.tv-next').disabled = d >= todayStr();
    const my = ++seq;
    wrap.textContent = '';
    list.innerHTML = '<div class="tv-m">読み込み中…</div>';
    chrome.runtime.sendMessage({ type: 'tg-t1', date: d >= todayStr() ? 'latest' : d, force: !!force }, r => {
      if (my !== seq) return; // 読み込み中に別の日へ移った
      if (chrome.runtime.lastError || !r || r.error || !r.items) {
        list.innerHTML = `<div class="tv-m">取得できませんでした：${esc(chrome.runtime.lastError?.message || r?.error || '')}</div>`;
        return;
      }
      list.dataset.loaded = '1';
      if (r.same) wrap.innerHTML = '<div class="tv-w">この日の一覧はまだ保存されていないようです（10日ほど前までの日は、最新と同じ一覧が出ます）。</div>';
      list.textContent = ''; byId.clear();
      for (const it of r.items) {
        byId.set(it.id, it);
        const a = document.createElement('a');
        a.className = 'tv-i'; a.href = '/watch?v=' + it.id; a.dataset.v = it.id;
        a.innerHTML = `<span class="tv-r ${it.rank <= 3 ? 'top' : ''}">${it.rank}</span><span class="tv-t"><img src="https://i.ytimg.com/vi/${esc(it.id)}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"><i>${esc(it.dur)}</i><span class="tv-wb"></span><span class="tv-bar"></span></span>`
          + `<span class="tv-b"><span class="tv-ti">${esc(it.title)}</span><span class="tv-s">${esc(it.channel)}</span><span class="tv-s">${[it.views && `再生 ${esc(it.views)}`, it.score && `${esc(it.score)} pts`].filter(Boolean).join(' ・ ')}</span></span><button class="tv-later" data-v="${esc(it.id)}"></button>`;
        paintLater(a.querySelector('.tv-later'));
        list.appendChild(a);
      }
      paintWatched();
      list.scrollTop = 0;
    });
  }

  // ---- 設定（⚙ → 再生・動画）----
  // 再生画面（/watch・ショート）では出さない
  const onWatch = () => /^\/(watch|shorts)(\/|$)/.test(location.pathname);
  function apply() {
    const show = on && !onWatch();
    tab.style.display = show ? '' : 'none';
    panel.style.display = show ? '' : 'none';
    if (!show && open) setOpen(false);
  }
  document.addEventListener('yt-navigate-finish', apply);
  window.addEventListener('popstate', apply);
  const read = px => { on = (px || {}).trendVid !== false; apply(); };
  try {
    chrome.storage.local.get('px').then(r => read(r.px));
    chrome.storage.onChanged.addListener(ch => { if (ch.px) read(ch.px.newValue); });
  } catch { /* なし */ }
  apply();
})();
