// Google トレンドの急上昇ワード（日本）を、画面の右端からスライドして出す。
//   ・ワードにマウスを乗せると、そのワードのニュースを3件ほど出す（押すと記事を別タブで開く）
//   ・ワードを押すと検索ワードに入れる：TubeFolio の「おすすめ」を見ているときは TubeFolio の検索欄、それ以外は YouTube の検索欄
//   ・設定（⚙ → 再生・動画）：パネルを出す／出さない、押したときに「入れるだけ」か「入れて検索」か
//   データは background.js が Google トレンドの RSS から取ってくる（30分ほど覚えておく）
(() => {
  if (window.__tgTrends) return;
  window.__tgTrends = true;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let cfg = { trend: true, trendGo: false };
  let data = null, open = false, hideT = 0, hours = 24;
  try { chrome.storage.local.get('trendHours').then(r => { if (r.trendHours === 4) { hours = 4; syncHours(); } }); } catch { /* なし */ }

  // ---- 画面 ----
  const css = document.createElement('style');
  css.textContent = `
#tg-trend-tab{position:fixed;right:0;top:42%;z-index:2301;writing-mode:vertical-rl;padding:12px 6px;border:0;border-radius:10px 0 0 10px;cursor:pointer;font:13px/1 Roboto,Arial,"Noto Sans JP",sans-serif;letter-spacing:2px;color:var(--yt-spec-text-primary,#f1f1f1);background:var(--yt-spec-badge-chip-background,#3f3f3f);box-shadow:-2px 2px 8px #0005;transition:right .25s}
#tg-trend-tab:hover{background:var(--yt-spec-button-chip-background-hover,#555)}
#tg-trend-tab.on{right:312px}
#tg-trend{position:fixed;top:56px;right:0;bottom:0;width:312px;z-index:2300;transform:translateX(100%);transition:transform .25s;display:flex;flex-direction:column;font:14px/1.4 Roboto,Arial,"Noto Sans JP",sans-serif;color:var(--yt-spec-text-primary,#f1f1f1);background:var(--yt-spec-menu-background,var(--yt-spec-base-background,#212121));border-left:1px solid var(--yt-spec-10-percent-layer,#444);box-shadow:-4px 0 16px #0004}
#tg-trend.on{transform:none}
#tg-trend .tgt-h{display:flex;align-items:center;gap:6px;padding:12px 14px 0}
#tg-trend .tgt-h b{flex:1;min-width:0;font-size:15px;white-space:nowrap}
#tg-trend .tgt-h2{padding:8px 14px 10px;border-bottom:1px solid var(--yt-spec-10-percent-layer,#444)}
#tg-trend .tgt-h small{display:block;white-space:nowrap;font-weight:400;font-size:11px;color:var(--yt-spec-text-secondary,#aaa)}
#tg-trend .tgt-h button{border:0;background:none;color:inherit;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px}
#tg-trend .tgt-hs{display:inline-flex;border:1px solid var(--yt-spec-10-percent-layer,#555);border-radius:14px;overflow:hidden}
#tg-trend .tgt-hs button{font-size:12px;padding:5px 12px;border-radius:0;border:0;background:transparent;color:var(--yt-spec-text-secondary,#aaa);cursor:pointer;font-family:inherit}
#tg-trend .tgt-hs button:hover{background:var(--yt-spec-badge-chip-background,#3f3f3f)}
#tg-trend .tgt-hs button.on{background:#3ea6ff;color:#0f0f0f;font-weight:700}
#tg-trend .tgt-hs button.on::before{content:'✓ '}
#tg-trend .tgt-h button:hover{background:var(--yt-spec-badge-chip-background,#3f3f3f)}
#tg-trend .tgt-l{overflow:auto;flex:1;padding:4px 0}
#tg-trend .tgt-i{display:flex;align-items:baseline;gap:10px;width:100%;padding:8px 14px;border:0;background:none;color:inherit;text-align:left;cursor:pointer;font:inherit}
#tg-trend .tgt-i:hover{background:var(--yt-spec-badge-chip-background,#3f3f3f)}
#tg-trend .tgt-i{align-items:center}
#tg-trend .tgt-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
#tg-trend .tgt-s{font-size:11px;color:var(--yt-spec-text-secondary,#aaa);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tg-trend .tgt-s .up{color:#4caf50}
#tg-trend .tgt-n{width:22px;text-align:right;color:var(--yt-spec-text-secondary,#aaa);font-size:12px;flex:none}
#tg-trend .tgt-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tg-trend .tgt-c{font-size:11px;color:var(--yt-spec-text-secondary,#aaa);flex:none}
#tg-trend .tgt-m{padding:14px;color:var(--yt-spec-text-secondary,#aaa)}
#tg-trend-news{position:fixed;z-index:2302;width:340px;display:none;padding:6px;border-radius:10px;background:var(--yt-spec-menu-background,#212121);border:1px solid var(--yt-spec-10-percent-layer,#444);box-shadow:0 6px 24px #0007;font:13px/1.4 Roboto,Arial,"Noto Sans JP",sans-serif;color:var(--yt-spec-text-primary,#f1f1f1)}
#tg-trend-news a{display:block;padding:7px 9px;border-radius:6px;color:inherit;text-decoration:none}
#tg-trend-news a:hover{background:var(--yt-spec-badge-chip-background,#3f3f3f)}
#tg-trend-news a{display:flex;gap:9px;align-items:flex-start}
#tg-trend-news a img{width:56px;height:56px;border-radius:6px;object-fit:cover;flex:none}
#tg-trend-news .tgt-rel{display:flex;flex-wrap:wrap;gap:6px;padding:6px 9px}
#tg-trend-news .tgt-rel span{padding:3px 9px;border-radius:12px;background:var(--yt-spec-badge-chip-background,#3f3f3f);cursor:pointer}
#tg-trend-news a small{display:block;margin-top:2px;color:var(--yt-spec-text-secondary,#aaa);font-size:11px}
#tg-trend-news .tgt-nh{padding:4px 9px;font-size:11px;color:var(--yt-spec-text-secondary,#aaa)}`;
  document.documentElement.appendChild(css);

  const tab = document.createElement('button');
  tab.id = 'tg-trend-tab'; tab.textContent = '🔥 急上昇ワード'; tab.title = 'Google トレンドの急上昇ワード（日本）';
  const panel = document.createElement('div');
  panel.id = 'tg-trend';
  panel.innerHTML = '<div class="tgt-h"><b>🔥 急上昇ワード<small>Google トレンド・日本</small></b><button class="tgt-r" title="取り直す">↻</button><button class="tgt-x" title="閉じる">✕</button></div><div class="tgt-h2"><span class="tgt-hs"><button data-hr="4">過去4時間</button><button data-hr="24">過去24時間</button></span></div><div class="tgt-l"><div class="tgt-m">読み込み中…</div></div>';
  const news = document.createElement('div');
  news.id = 'tg-trend-news';
  document.documentElement.append(tab, panel, news);
  const list = panel.querySelector('.tgt-l');

  function setOpen(v) {
    open = v;
    tab.classList.toggle('on', v); panel.classList.toggle('on', v);
    if (v) document.dispatchEvent(new CustomEvent('tg-panel-open', { detail: 'words' }));
    if (!v) news.style.display = 'none';
    if (v && !data) load();
  }
  tab.addEventListener('click', () => setOpen(!open));
  document.addEventListener('tg-panel-open', e => { if (e.detail !== 'words' && open) setOpen(false); });
  panel.querySelector('.tgt-x').addEventListener('click', () => setOpen(false));
  panel.querySelector('.tgt-r').addEventListener('click', () => load(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });

  // ---- データ ----
  const byHours = {};
  function syncHours() { panel.querySelectorAll('[data-hr]').forEach(b => b.classList.toggle('on', +b.dataset.hr === hours)); }
  panel.querySelectorAll('[data-hr]').forEach(b => b.addEventListener('click', () => {
    const h = +b.dataset.hr; if (h === hours) return;
    hours = h; syncHours(); news.style.display = 'none';
    try { chrome.storage.local.set({ trendHours: h }); } catch { /* なし */ }
    data = byHours[h] || null;
    if (data) draw(); else load();
  }));
  syncHours();
  function load(force) {
    const h = hours;
    list.innerHTML = '<div class="tgt-m">読み込み中…</div>';
    chrome.runtime.sendMessage({ type: 'tg-trends', force: !!force, hours: h }, r => {
      if (h !== hours) return; // 読み込み中に切り替えられた
      if (chrome.runtime.lastError || !r || r.error || !r.items) {
        list.innerHTML = `<div class="tgt-m">取得できませんでした：${esc(chrome.runtime.lastError?.message || r?.error || '')}</div>`;
        return;
      }
      data = byHours[h] = r; draw();
    });
  }
  // 数字・時間の見せ方
  const fmtVol = n => n >= 10000 ? `${n / 10000}万+` : n > 0 ? `${n}+` : '';
  const fmtAgo = t => { if (!t) return ''; const m = Math.max(0, Math.floor((Date.now() / 1000 - t) / 60)); return m < 60 ? `${m}分前` : m < 1440 ? `${Math.floor(m / 60)}時間前` : `${Math.floor(m / 1440)}日前`; };
  function draw() {
    list.textContent = '';
    if (!data.items.length) { list.innerHTML = '<div class="tgt-m">急上昇ワードがありません</div>'; return; }
    data.items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'tgt-i';
      const vol = it.traffic || fmtVol(it.vol), pct = it.pctText || (it.pct ? it.pct.toLocaleString('en-US') + '%' : ''), ago = it.agoText || fmtAgo(it.start);
      const sub = [vol && `検索 ${vol}`, pct && `<span class="up">▲${pct}</span>`, ago, it.end ? '終了' : ''].filter(Boolean).join(' ・ ');
      b.innerHTML = `<span class="tgt-n">${i + 1}</span><span class="tgt-b"><span class="tgt-t">${esc(it.title)}</span>${sub ? `<span class="tgt-s">${sub}</span>` : ''}${it.related?.length ? `<span class="tgt-s">${esc(it.related.slice(0, 4).join('　'))}</span>` : ''}</span>`;
      b.addEventListener('click', () => useTerm(it.title));
      b.addEventListener('mouseenter', () => showNews(it, b));
      b.addEventListener('mouseleave', () => { hideT = setTimeout(() => { news.style.display = 'none'; hoverIt = null; }, 400); });
      list.appendChild(b);
    });
  }

  // ---- マウスを乗せたときのニュース ----
  let hoverIt = null;
  function renderNews(it, el) {
    const hasN = it.news?.length, hasR = it.related?.length;
    if (!hasN && !hasR && !it.newsLoading) { news.style.display = 'none'; return; }
    news.innerHTML = (hasN ? `<div class="tgt-nh">「${esc(it.title)}」のニュース</div>` + it.news.slice(0, 3).map(n =>
      `<a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${n.picture ? `<img src="${esc(n.picture)}" alt="" referrerpolicy="no-referrer">` : ''}<span>${esc(n.title)}<small>${esc(n.source || '')}</small></span></a>`).join('')
      : `<div class="tgt-nh">${it.newsLoading ? `「${esc(it.title)}」のニュースを探しています…` : `「${esc(it.title)}」のニュースは見つかりませんでした`}</div>`)
      + (hasR ? `<div class="tgt-nh">関連ワード（押すと検索ワードに入れる）</div><div class="tgt-rel">${it.related.map(w => `<span data-w="${esc(w)}">${esc(w)}</span>`).join('')}</div>` : '');
    news.style.display = 'block';
    const r = el.getBoundingClientRect();
    // パネルにぴったり付けて出す（マウスを動かす途中で消えないように）
    news.style.right = (innerWidth - panel.getBoundingClientRect().left) + 'px';
    news.style.top = Math.max(60, Math.min(r.top, innerHeight - news.offsetHeight - 8)) + 'px';
  }
  function showNews(it, el) {
    clearTimeout(hideT);
    hoverIt = it;
    if (!it.news?.length && !it.newsTried) { // RSS にニュースが無いワードは、Google ニュースで探す
      it.newsTried = true; it.newsLoading = true;
      chrome.runtime.sendMessage({ type: 'tg-trend-news', q: it.title }, r => {
        it.newsLoading = false;
        if (!chrome.runtime.lastError && r?.news?.length) it.news = r.news;
        if (hoverIt === it && news.style.display !== 'none') renderNews(it, el);
      });
    }
    renderNews(it, el);
  }
  news.addEventListener('click', e => { const w = e.target.closest('[data-w]'); if (w) useTerm(w.dataset.w); });
  news.addEventListener('mouseenter', () => clearTimeout(hideT));
  news.addEventListener('mouseleave', () => { news.style.display = 'none'; });

  // ---- ワードを検索欄に入れる ----
  const visible = el => !!el && el.getClientRects().length > 0;
  // TubeFolio の「おすすめ」を見ているとき：TubeFolio の検索欄へ（「お気に入り以外／から検索」の画面でなければ、その画面に切り替える）
  async function toTubeFolio(term, go) {
    const bar = document.getElementById('tg-bar');
    if (!visible(bar)) return false;
    let inp = bar.querySelector('.tg-sq');
    if (!inp) {
      const m = bar.querySelector('[data-recmode="search"]');
      if (!m) return false; // おすすめの画面ではない
      m.click();
      for (let i = 0; i < 30 && !inp; i++) { await sleep(100); inp = document.querySelector('#tg-bar .tg-sq'); }
    }
    if (!inp) return false;
    inp.value = term;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (go) document.querySelector('#tg-bar [data-dosearch]')?.click(); else { inp.focus(); inp.select(); }
    return true;
  }
  function toYouTube(term, go) {
    const inp = document.querySelector('ytd-searchbox input[name="search_query"], input[name="search_query"], input#search');
    if (!inp) { if (go) location.href = '/results?search_query=' + encodeURIComponent(term); return; }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, term);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.focus();
    if (go) {
      const btn = document.querySelector('ytd-searchbox #search-icon-legacy, #search-icon-legacy, button[aria-label="検索"]');
      if (btn) btn.click(); else location.href = '/results?search_query=' + encodeURIComponent(term);
    }
  }
  async function useTerm(term) {
    const go = !!cfg.trendGo;
    if (!(await toTubeFolio(term, go))) toYouTube(term, go);
  }

  // ---- 設定（⚙ → 再生・動画）----
  // 再生画面（/watch・ショート）では出さない
  const onWatch = () => /^\/(watch|shorts)(\/|$)/.test(location.pathname);
  function apply() {
    const on = cfg.trend !== false && !onWatch();
    tab.style.display = on ? '' : 'none';
    if (!on) { setOpen(false); panel.style.display = 'none'; } else panel.style.display = '';
  }
  document.addEventListener('yt-navigate-finish', apply);
  window.addEventListener('popstate', apply)
  const read = px => { cfg = { trend: true, trendGo: false, ...(px || {}) }; apply(); };
  try {
    chrome.storage.local.get('px').then(r => read(r.px));
    chrome.storage.onChanged.addListener(ch => { if (ch.px) read(ch.px.newValue); });
  } catch { /* なし */ }
  apply();
})();
