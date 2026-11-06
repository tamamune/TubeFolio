// YouTubeページへの組み込み：サイドバー・登録チャンネル画面・追加ボタン
(() => {
  let S = { channels: {}, folders: [], meta: {}, activeGroup: null, feedType: 'video', cols: 4 };
  let tick = null, feedSig = '';
  const esc = TG.esc;

  const isSubsFeed = () => location.pathname === '/feed/subscriptions';
  const isChannelPage = () => /^\/(@[^/]+|channel\/|c\/|user\/)/.test(location.pathname);
  const isWatchPage = () => location.pathname === '/watch';
  const isShortsPage = () => /^\/shorts\/[\w-]{11}/.test(location.pathname);

  const P = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  const IC = {
    video: P('M18 4H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm1 13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1zM10 8.5v7l5.5-3.5z'),
    live: P('M7.76 16.24C6.67 15.16 6 13.66 6 12s.67-3.16 1.76-4.24l1.42 1.42C8.45 9.9 8 10.9 8 12c0 1.1.45 2.1 1.17 2.83l-1.41 1.41zm8.48 0C17.33 15.16 18 13.66 18 12s-.67-3.16-1.76-4.24l-1.42 1.42C15.55 9.9 16 10.9 16 12c0 1.1-.45 2.1-1.17 2.83l1.41 1.41zM12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm8 2c0 2.21-.9 4.21-2.35 5.65l1.42 1.42C20.88 17.26 22 14.76 22 12s-1.12-5.26-2.93-7.07l-1.42 1.42C19.1 7.79 20 9.79 20 12zM6.35 6.35L4.93 4.93C3.12 6.74 2 9.24 2 12s1.12 5.26 2.93 7.07l1.42-1.42C4.9 16.21 4 14.21 4 12s.9-4.21 2.35-5.65z'),
    short: P('M16 2H8a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3zm1 17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1zM10 8.5v7l5-3.5z'),
    folder: P('M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'),
    gear: P('M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'),
    caret: P('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'),
    stats: P('M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z'),
    new: P('M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM8.5 15H7.3l-2.55-3.5V15H3.5V9h1.25l2.5 3.5V9H8.5v6zm5-4.74H11v1.12h2.5v1.26H11v1.11h2.5V15h-4V9h4v1.26zm7 3.74c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1V9h1.25v4.51h1.13V9.99h1.25v3.51h1.12V9h1.25v5z'),
    bm: P('M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z'),
    later: P('M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z'),
    rec: P('M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z'),
    grid: P('M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h8v8h-8v-8zm2 2v4h4v-4h-4z')
  };

  // 新着件数・後で見るの本数
  let NC = new Map(), laterN = 0, bmN = 0;
  // 件数が変わったときだけ描き直す。呼び出しは1.5秒まとめる
  let countsT = null, countsSig = '';
  function refreshCounts() {
    clearTimeout(countsT);
    countsT = setTimeout(doRefreshCounts, 1500);
  }
  async function doRefreshCounts() {
    const { recent = [], folderSeen = {}, watched = {}, later = [], bookmarks = [] } = await chrome.storage.local.get(['recent', 'folderSeen', 'watched', 'later', 'bookmarks']);
    bmN = bookmarks.length;
    NC = TGX.newCounts(S, recent, watched, folderSeen);
    laterN = later.length;
    setLaterSet(later);
    const sig = JSON.stringify([...NC]) + laterN + '|' + bmN;
    if (sig === countsSig) return;
    countsSig = sig;
    renderGuide(true);
    const bar = document.getElementById('tg-bar');
    if (bar && isSubsFeed()) { buildBar(bar); layoutBar(); }
  }
  const badge = n => (n ? `<span class="tg-new" title="未視聴の新着 ${n} 本">${n > 99 ? '99+' : n}</span>` : '');

  // YouTubeのテーマ（視聴記録・動作ログ画面の「自動」で使う）
  function saveYtTheme() {
    const dark = document.documentElement.hasAttribute('dark');
    chrome.storage.local.get('ytDark').then(r => { if (r.ytDark !== dark) chrome.storage.local.set({ ytDark: dark }); });
  }
  setTimeout(saveYtTheme, 3000);
  new MutationObserver(saveYtTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });

  // ---------- 集中モード ----------
  let FOCUS = TG.FOCUS_DEF, FST = { active: false }, focusSig = '';
  const fLocked = id => FST.active && TG.folderLocked(FOCUS, S.folders, id);
  function applyFocus() {
    FST = TG.focusState(FOCUS);
    const fm = TG.folderMap(S.channels, S.folders);
    const chLocked = (key, id) => {
      const fs = fm.get(key) || (id && fm.get('channel/' + id));
      const known = fs || (S.channels[key] || (id && S.channels['channel/' + id]) ? [] : null);
      return TG.channelLocked(FOCUS, S.folders, known);
    };
    TGFeed.setFocus({ active: FST.active, until: FST.until, folderLocked: id => TG.folderLocked(FOCUS, S.folders, id), channelLocked: chLocked });
    const sig = JSON.stringify([FST.active, FOCUS]);
    const changed = sig !== focusSig;
    focusSig = sig;
    document.documentElement.classList.toggle('tg-focus-on', FST.active);
    return changed;
  }
  async function loadFocus() { FOCUS = await TG.focusCfg(); }
  // 1分ごとに時間帯の出入りを確認
  setInterval(() => {
    if (document.hidden) return;
    if (applyFocus()) { bumpMark(); renderGuide(true); renderSubsPage(true); markVideos(); checkWatchLock(); }
  }, 30000);

  // 一時解除（10秒待ってから）
  async function askUnlock() {
    if (document.getElementById('tg-unlock')) return;
    const d = document.createElement('div');
    d.id = 'tg-unlock';
    const min = FOCUS.unlockMin || 15;
    d.innerHTML = `<div class="tg-ul-box"><div class="tg-ul-t">🔒 集中モードを ${min} 分だけ解除しますか？</div>
      <p>本当に今見る必要がありますか？ 10秒待つと解除できます。</p>
      <div class="tg-ul-btns"><button class="tg-ul-no">やめる（集中を続ける）</button><button class="tg-ul-yes" disabled>10</button></div></div>`;
    document.body.appendChild(d);
    const yes = d.querySelector('.tg-ul-yes');
    let n = 10;
    const t = setInterval(() => { n--; yes.textContent = n > 0 ? String(n) : `${min}分だけ解除`; if (n <= 0) { clearInterval(t); yes.disabled = false; } }, 1000);
    d.querySelector('.tg-ul-no').onclick = () => { clearInterval(t); d.remove(); };
    yes.onclick = async () => {
      d.remove();
      const F = await TG.focusCfg();
      F.unlockUntil = Date.now() + min * 60e3;
      await chrome.storage.local.set({ focus: F });
      TG.log('集中モード', `${min}分だけ解除`);
    };
  }
  document.addEventListener('click', e => {
    const u = e.target.closest?.('[data-tg-unlock]');
    if (u) { e.preventDefault(); e.stopPropagation(); askUnlock(); return; }
    const c = e.target.closest?.('[data-tg-focuscfg]');
    if (c) { e.preventDefault(); e.stopPropagation(); TGManager.open('focus'); }
  }, true);

  // 再生ページ：見えないチャンネルの動画ならロック画面
  function checkWatchLock() {
    let ov = document.getElementById('tg-watchlock');
    const id = isWatchPage() ? new URLSearchParams(location.search).get('v') : isShortsPage() ? location.pathname.split('/')[2] : null;
    let lock = false, why = '';
    if (id && FST.active && FOCUS.blockWatch) {
      const ch = currentChannel();
      if (ch) {
        const fs = fMap.get(ch.key) || (ch.id && fMap.get('channel/' + ch.id));
        const known = fs || (favSet.has(ch.key) ? [] : null);
        lock = TG.channelLocked(FOCUS, S.folders, known);
        why = fs?.length ? fs.map(f => f.name).join('・') : known ? '未分類' : '登録していないチャンネル';
      }
    }
    if (!lock) { ov?.remove(); return; }
    document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch { /* なし */ } });
    if (ov && ov.dataset.v === id) return;
    ov?.remove();
    ov = document.createElement('div');
    ov.id = 'tg-watchlock';
    ov.dataset.v = id;
    const until = FST.until ? new Date(FST.until).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
    ov.innerHTML = `<div class="tg-ul-box"><div class="tg-lock-ic">🔒</div><div class="tg-ul-t">集中モード中です</div>
      <p>「${esc(why)}」の動画は ${until ? until + ' まで' : '今は'} 見られません。</p>
      <div class="tg-ul-btns"><button class="tg-ul-no" data-back="1">前のページに戻る</button><button data-tg-unlock="1">少しだけ解除する…</button></div></div>`;
    ov.querySelector('[data-back]').onclick = () => (history.length > 1 ? history.back() : location.assign('/'));
    document.body.appendChild(ov);
  }
  // 解除までの間、勝手に再生されないように
  document.addEventListener('play', e => { if (document.getElementById('tg-watchlock') && e.target.tagName === 'VIDEO') e.target.pause(); }, true);

  async function reload() {
    S = await TG.load();
    S.noHist = NH;
    S.hideMembers = !!(await chrome.storage.local.get('hideMembers')).hideMembers;
    S.recAlgo = (await chrome.storage.local.get('recAlgo')).recAlgo || 'old';
    await loadFocus();
    applyFocus();
    if (S.activeGroup && S.activeGroup !== '__unsorted' && !S.folders.some(f => f.id === S.activeGroup)) S.activeGroup = null;
    buildFavSet();
    applyHomeCols();
    renderGuide(true);
    renderSubsPage(true);
    renderFab();
    markVideos();
    checkWatchLock();
    countsSig = '';
    refreshCounts();
    homeFeedOn = false; homeFeed(); // 履歴オフ中のホームは、読み込んだフォルダで出し直す
  }

  // サイドバーのフォルダを押したときに開く一覧（設定 fOpen: { on, type }。初期は 新着）
  let FOPEN = { on: true, type: 'new' };
  chrome.storage.local.get('fOpen').then(r => { FOPEN = { on: true, type: 'new', ...(r.fOpen || {}) }; if (FOPEN.type === 'video') FOPEN.type = 'new'; renderGuide(true); });
  // 他のPCの設定がDriveから届いたとき
  chrome.storage.onChanged.addListener(ch => { if (ch.hideMembers) S.hideMembers = !!ch.hideMembers.newValue; if (ch.recAlgo) S.recAlgo = ch.recAlgo.newValue || 'old'; });
  chrome.storage.onChanged.addListener(ch => { if (ch.fOpen) { FOPEN = { on: true, type: 'new', ...(ch.fOpen.newValue || {}) }; renderGuide(true); } });

  // ---------- サイドバー ----------
  // チャンネル名の一覧を開いているフォルダ（このPCに保存）
  const chOpen = new Set((() => { try { return JSON.parse(localStorage.getItem('tgChOpen') || '[]'); } catch { return []; } })());
  // チャンネル名をドラッグしてフォルダへ移す（Ctrl でコピー）・「未分類」へ落とすとそのフォルダから外す
  let gDrag = null;
  function bindGuideDrag(sec) {
    sec.addEventListener('dragstart', e => {
      const fa = e.target.closest?.('.tg-g-item[data-f]');
      if (fa && fa.dataset.f !== '__unsorted' && !e.target.closest('.tg-g-ch')) { // フォルダの並べ替え
        gDrag = { folder: fa.dataset.f };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', fa.textContent.trim());
        fa.classList.add('tg-g-dragging');
        return;
      }
      const a = e.target.closest?.('.tg-g-ch');
      if (!a) return;
      gDrag = { key: a.dataset.chk, from: a.dataset.from };
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/plain', a.textContent.trim());
      a.classList.add('tg-g-dragging');
    });
    sec.addEventListener('dragend', e => { e.target.closest?.('.tg-g-ch, .tg-g-item')?.classList.remove('tg-g-dragging'); sec.querySelectorAll('.tg-g-before, .tg-g-after').forEach(x => x.classList.remove('tg-g-before', 'tg-g-after')); sec.querySelectorAll('.tg-g-drop').forEach(x => x.classList.remove('tg-g-drop')); gDrag = null; });
    const target = e => { const t = e.target.closest?.('.tg-g-item[data-f]'); return t && !t.dataset.locked && t.dataset.f !== gDrag?.from ? t : null; };
    // フォルダの並べ替え：同じ親の中で、行の上半分なら前・下半分なら後ろへ
    const fTarget = e => {
      const t = e.target.closest?.('.tg-g-item[data-f]');
      if (!t || t.dataset.f === '__unsorted' || t.dataset.f === gDrag.folder) return null;
      const src = S.folders.find(f => f.id === gDrag.folder), dst = S.folders.find(f => f.id === t.dataset.f);
      if (!src || !dst || (src.parent || null) !== (dst.parent || null)) return null; // ほかの親の中へは動かさない
      const r = t.getBoundingClientRect();
      return { t, after: e.clientY > r.top + r.height / 2 };
    };
    sec.addEventListener('dragover', e => {
      if (!gDrag) return;
      if (gDrag.folder) {
        const x = fTarget(e);
        sec.querySelectorAll('.tg-g-before, .tg-g-after').forEach(y => y.classList.remove('tg-g-before', 'tg-g-after'));
        if (!x) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        x.t.classList.add(x.after ? 'tg-g-after' : 'tg-g-before');
        return;
      }
      const t = target(e);
      sec.querySelectorAll('.tg-g-drop').forEach(x => x !== t && x.classList.remove('tg-g-drop'));
      if (!t) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      t.classList.add('tg-g-drop');
    });
    sec.addEventListener('drop', async e => {
      if (!gDrag) return;
      if (gDrag.folder) {
        const x = fTarget(e);
        const id = gDrag.folder;
        gDrag = null;
        sec.querySelectorAll('.tg-g-before, .tg-g-after').forEach(y => y.classList.remove('tg-g-before', 'tg-g-after'));
        if (!x) return;
        e.preventDefault();
        await TG.update(d => {
          const i = d.folders.findIndex(f => f.id === id);
          if (i < 0) return false;
          const [f] = d.folders.splice(i, 1);
          let j = d.folders.findIndex(g => g.id === x.t.dataset.f);
          if (j < 0) { d.folders.splice(i, 0, f); return false; }
          if (x.after) j++;
          d.folders.splice(j, 0, f);
        });
        TG.log('フォルダ', 'サイドバーでフォルダを並べ替え');
        return;
      }
      const t = target(e);
      if (!t) return;
      e.preventDefault();
      const { key, from } = gDrag, to = t.dataset.f, copy = e.ctrlKey;
      t.classList.remove('tg-g-drop');
      gDrag = null;
      await TG.update(d => {
        const src = d.folders.find(f => f.id === from);
        const dst = to === '__unsorted' ? null : d.folders.find(f => f.id === to);
        if (!copy && src) src.keys = src.keys.filter(k => k !== key);
        if (dst && !dst.keys.includes(key)) dst.keys.push(key);
      });
      const name = S.channels[key]?.name || key;
      const toName = to === '__unsorted' ? '' : S.folders.find(f => f.id === to)?.name || '';
      toastMsg(to === '__unsorted' ? `「${name}」をフォルダから外しました` : `「${name}」を「${toName}」へ${copy ? 'コピー' : '移動'}しました`);
      TG.log('振り分け', `サイドバーで「${name}」を${to === '__unsorted' ? 'フォルダから外す' : `「${toName}」へ${copy ? 'コピー' : '移動'}`}`);
    });
  }

  // サイドバーの「ショート」の下に、YouTube ミュージックのチャート（charts.youtube.com）へのリンク。別タブで開く（YouTube の中には埋め込めない）
  function placeChartsLink(sections) {
    const shorts = [...sections.querySelectorAll('ytd-guide-entry-renderer')].find(e => { const a = e.querySelector('a'); return a && (/^\/shorts/.test(a.getAttribute('href') || '') || /^(ショート|Shorts)$/.test(a.getAttribute('title') || '')); }); // ショートの項目は href が無いので、名前でも探す
    if (!shorts) return;
    let a = document.getElementById('tg-charts');
    if (!a) {
      a = document.createElement('a');
      a.id = 'tg-charts';
      a.href = 'https://charts.youtube.com/jp';
      a.target = '_blank'; a.rel = 'noopener';
      a.title = 'YouTube チャート（急上昇・人気の動画やアーティストのランキング）を新しいタブで開く';
      a.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 9h3v10H5V9zm5.5-5h3v15h-3V4zM16 13h3v6h-3v-6z"/></svg><span>チャート</span>';
      a.addEventListener('click', e => e.stopPropagation());
    }
    if (a.previousElementSibling !== shorts) shorts.after(a);
  }

  function renderGuide(force) {
    const sections = document.querySelector('ytd-guide-renderer #sections');
    if (!sections) return;
    placeChartsLink(sections);
    const secs = [...sections.children].filter(s => s.matches('ytd-guide-section-renderer'));
    const subs =
      secs.find(s => s.querySelector('a[href^="/@"], a[href^="/channel/"]')) ||
      secs.find(s => s.querySelector('a[href="/feed/channels"]')) ||
      secs[1] || null;

    let sec = document.getElementById('tg-guide');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = 'tg-guide';
      sec.addEventListener('click', onGuideClick);
      bindGuideDrag(sec);
    }
    if (sec.parentElement !== sections || sec.nextElementSibling !== subs) sections.insertBefore(sec, subs);

    const onSubs = isSubsFeed();
    const sig = JSON.stringify([focusSig, onSubs, S.activeGroup, S.feedType, S.folders.map(f => [f.id, f.name, f.color, f.parent, f.collapsed, chOpen.has(f.id) ? f.keys.join() : f.keys.length]), [...NC], laterN, [...chOpen]]);
    if (!force && sec.dataset.sig === sig) return;
    sec.dataset.sig = sig;

    const item = (attrs, icon, name, on, extra = '', pad = 12) =>
      `<a class="tg-g-item ${on ? 'tg-on' : ''}" ${attrs} style="padding-left:${pad}px">${icon}<span class="tg-g-name">${esc(name)}</span>${extra}</a>`;

    // 新着・動画・後で見る などの種類は登録チャンネル画面の上のツールに、視聴記録・フォルダ設定は右上の ⚙ にまとめた
    const fl = { new: '新着動画', live: 'ライブ・配信', short: 'ショート', rec: 'おすすめ', later: '後で見る', bm: 'ブックマーク' };
    let h = `<div class="tg-g-block"><div class="tg-g-title"${FOPEN.on ? ` data-fopen="1" title="押すと「${fl[FOPEN.type] || '新着動画'}」を開く（⚙ → 再生画面で変更）"` : ''}>フォルダ</div>`;
    // フォルダを開くと、そのフォルダに入っているチャンネル名も並べる（サブフォルダの後ろ）。ドラッグでほかのフォルダへ移せる
    const chRows = (f, depth) => {
      if (!chOpen.has(f.id) || !f.keys.length) return '';
      const list = f.keys.map(k => S.channels[k] || { key: k, name: k }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
      return list.map(c => `<a class="tg-g-item tg-g-ch" href="${esc(TG.channelUrl(c.key))}" data-chk="${esc(c.key)}" data-from="${esc(f.id)}" draggable="true" title="${esc(c.name)}（ドラッグでほかのフォルダへ移動・Ctrl を押しながらでコピー）" style="padding-left:${12 + (depth + 1) * 16}px">${c.thumb ? `<img class="tg-g-av" src="${esc(c.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="tg-g-av"></span>'}<span class="tg-g-name">${esc(c.name || c.key)}</span></a>`).join('');
    };
    const pend = []; // 開いているフォルダのうち、サブフォルダを並べ終わるのを待っているもの
    const flush = depth => { while (pend.length && pend[pend.length - 1].depth >= depth) { const p = pend.pop(); h += chRows(p.f, p.depth); } };
    for (const { f, depth, hidden } of TG.tree(S.folders)) {
      if (hidden) continue;
      flush(depth);
      const kids = TG.hasChildren(S.folders, f.id);
      const open = kids ? !f.collapsed : chOpen.has(f.id);
      const caret = kids || f.keys.length ? `<span class="tg-g-caret ${open ? 'open' : ''}" data-caret="${esc(f.id)}" title="開く／閉じる（中のチャンネルも表示）">${IC.caret}</span>` : '';
      const lk = fLocked(f.id);
      h += item(`data-f="${esc(f.id)}" draggable="true" title="${esc(TG.pathName(S.folders, f))}${lk ? '（集中モード中）' : ''}（ドラッグで並べ替え）"${lk ? ' data-locked="1"' : ''}`,
        `<span class="tg-g-ic" style="color:${esc(f.color)}">${lk ? '🔒' : TG.iconHtml(f, IC.folder)}</span>`, f.name,
        onSubs && S.activeGroup === f.id, (lk ? '' : badge(NC.get(f.id))) + caret, 12 + depth * 16);
      if (!lk && (kids ? !f.collapsed : true)) pend.push({ f, depth });
    }
    flush(0);
    h += item('data-f="__unsorted"', `<span class="tg-g-ic">${IC.folder}</span>`, '未分類', onSubs && S.activeGroup === '__unsorted', badge(NC.get('__unsorted')));
    h += item('data-act="manage"', IC.gear, 'フォルダ設定', false);
    h += '</div>';
    sec.innerHTML = h;
  }

  async function onGuideClick(e) {
    const caret = e.target.closest('[data-caret]');
    if (caret) {
      e.preventDefault();
      e.stopPropagation();
      const id = caret.dataset.caret;
      const kids = TG.hasChildren(S.folders, id);
      const f0 = S.folders.find(x => x.id === id);
      const opening = kids ? !!f0?.collapsed : !chOpen.has(id);
      if (opening) chOpen.add(id); else chOpen.delete(id);
      try { localStorage.setItem('tgChOpen', JSON.stringify([...chOpen])); } catch { /* なし */ }
      if (kids) {
        await TG.update(d => {
          const f = d.folders.find(x => x.id === id);
          if (!f) return false;
          f.collapsed = !opening;
        });
      } else renderGuide(true);
      return;
    }
    const chA = e.target.closest('.tg-g-ch');
    if (chA) { // チャンネル名：そのチャンネルへ（YouTube の中の移動）
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // 新しいタブはブラウザに任せる
      e.preventDefault();
      closeOverlayGuide();
      TG.goChannel(chA.dataset.chk, S.channels); // 右のメインだけ切り替える
      return;
    }
    const ttl = e.target.closest('.tg-g-title[data-fopen]');
    if (ttl && FOPEN.on) { // 「フォルダ」の見出し：設定で選んだ一覧を、すべてのフォルダで開く
      e.preventDefault();
      const t = FOPEN.type, patch = { feedType: t };
      S.feedType = t;
      if (t === 'new') { S.newOff = []; patch.newOff = []; }
      else if (t === 'later') { S.laterOff = []; patch.laterOff = []; }
      else if (t === 'live' || t === 'short') { S.activeGroup = null; await TG.setActive(null); }
      await chrome.storage.local.set(patch);
      return goSubs();
    }
    const a = e.target.closest('.tg-g-item');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.act === 'manage') return TGManager.open();
    if (a.dataset.act === 'stats') return chrome.runtime.sendMessage({ type: 'openStats' });
    if (a.dataset.type) {
      S.feedType = a.dataset.type;
      await chrome.storage.local.set({ feedType: S.feedType });
    } else if (a.dataset.f) {
      const wasRec = S.feedType === 'rec' || S.feedType === 'later' || S.feedType === 'new' || S.feedType === 'bm';
      if (wasRec) { S.feedType = 'video'; await chrome.storage.local.set({ feedType: 'video' }); } // おすすめ画面ではフォルダが効かないので動画に戻す
      S.activeGroup = isSubsFeed() && !wasRec && S.activeGroup === a.dataset.f ? null : a.dataset.f;
      await TG.setActive(S.activeGroup);
    }
    goSubs();
  }

  // 画面が狭いと、サイドバーは画面の上に重なる引き出し（オーバーレイ）になる。押したら閉じて、切り替わった一覧が見えるようにする
  function closeOverlayGuide() {
    const drawer = document.querySelector('tp-yt-app-drawer#guide, #guide.tp-yt-app-drawer');
    if (!drawer || !drawer.hasAttribute('opened') || drawer.hasAttribute('persistent')) return;
    const btn = document.querySelector('#guide-button button, #guide-button, yt-icon-button#guide-button');
    if (btn) btn.click();
    else document.querySelector('tp-yt-iron-overlay-backdrop')?.click();
  }
  function goSubs() {
    closeOverlayGuide();
    if (isSubsFeed()) {
      renderGuide(true);
      renderSubsPage(true);
      window.scrollTo({ top: 0 });
      setTimeout(() => { if (isSubsFeed() && !document.querySelector('#tg-feed .tg-grid')) renderSubsPage(true); }, 1500);
      return;
    }
    // YouTube内の移動（サイドバーの「登録チャンネル」のリンクを使う）。見えるリンクを優先し、だめならページごと移動
    const links = [...document.querySelectorAll('ytd-guide-renderer a[href="/feed/subscriptions"], ytd-mini-guide-renderer a[href="/feed/subscriptions"], a#endpoint[href="/feed/subscriptions"]')];
    const link = links.find(l => l.offsetParent !== null && l.getBoundingClientRect().width > 0) || links[0];
    if (link) link.click();
    setTimeout(() => { if (!isSubsFeed()) location.assign('/feed/subscriptions'); }, link ? 1500 : 0);
    // 移動したのに一覧が出ていなければ作り直す（それでもだめならページごと読み込み直す）
    setTimeout(() => {
      if (!isSubsFeed()) return;
      if (!document.querySelector('#tg-feed .tg-grid')) { renderGuide(true); renderSubsPage(true); }
      setTimeout(() => { if (isSubsFeed() && !document.querySelector('#tg-feed .tg-grid')) { TG.log('画面', '登録チャンネル画面が出ないので読み込み直します', 'warn'); location.reload(); } }, 2000);
    }, 1800);
  }

  // ---------- 登録チャンネル画面（独自一覧に置き換え） ----------
  function renderSubsPage(rebuild) {
    if (!isSubsFeed()) return;
    const browse = document.querySelector('ytd-browse[page-subtype="subscriptions"]');
    const primary = browse?.querySelector('#primary');
    if (!primary) return;
    browse.classList.add('tg-takeover');

    let bar = document.getElementById('tg-bar');
    let spacer = document.getElementById('tg-bar-spacer');
    let feed = document.getElementById('tg-feed');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'tg-bar'; bar.addEventListener('click', onBarClick); rebuild = true;
      let qT = null;
      bar.addEventListener('input', e => {
        if (!e.target.classList.contains('tg-q')) return;
        qText = e.target.value;
        e.target.closest('.tg-qbox')?.classList.toggle('tg-has', !!qText);
        clearTimeout(qT);
        qT = setTimeout(() => TGFeed.setQuery(qText), 200);
      });
      // 入力中はYouTubeのショートカット（k・j・/ など）を効かせない
      ['keydown', 'keyup', 'keypress'].forEach(t => bar.addEventListener(t, e => {
        if (e.target.tagName !== 'INPUT') return;
        e.stopPropagation();
        if (e.target.classList.contains('tg-sq')) { if (t === 'keydown' && e.key === 'Enter') bar.querySelector('[data-dosearch]')?.click(); return; }
        if (t === 'keydown' && e.key === 'Escape') { e.target.value = qText = ''; TGFeed.setQuery(''); }
      }));
    }
    if (!spacer) { spacer = document.createElement('div'); spacer.id = 'tg-bar-spacer'; }
    if (!feed) { feed = document.createElement('div'); feed.id = 'tg-feed'; rebuild = true; }
    if (bar.parentElement !== primary || primary.firstElementChild !== bar) primary.prepend(bar);
    if (bar.nextElementSibling !== spacer) bar.after(spacer);
    if (spacer.nextElementSibling !== feed) spacer.after(feed);
    TGFeed.mount(feed);
    TGFeed.setHideWatched(S.hideWatched);
    TGFeed.setHideMembers(S.hideMembers);
    watchBar(primary, bar);
    if (needSubsRebuild) { needSubsRebuild = false; rebuild = true; feedSig = ''; } // ホームで一覧を使っていたので作り直す
    if (!rebuild) { layoutBar(); return; }

    buildBar(bar);
    layoutBar();
    if (S.feedType === 'new') TGX.markSeen(S, null);
    else if (S.feedType !== 'rec' && S.feedType !== 'later') TGX.markSeen(S, S.activeGroup);
    const sig = TGFeed.signature(S);
    if (sig !== feedSig || !feed.dataset.painted) {
      feedSig = sig;
      feed.dataset.painted = '1';
      TGFeed.refresh(S);
    } else {
      TGFeed.setCols(S.cols);
    }
  }

  // 上部バーは画面上端（ヘッダーの下）に固定し、同じ高さの空白を置いて動画と重ならないようにする
  let barRO = null;
  function watchBar(primary, bar) {
    if (barRO?.target === primary) return;
    barRO?.disconnect();
    barRO = new ResizeObserver(layoutBar);
    barRO.target = primary;
    barRO.observe(primary);
    barRO.observe(bar);
  }
  // YouTube の「すべて・ニュース・ポッドキャスト…」の段（チップ）は、TubeFolio のツールの下へずらす
  //   TubeFolio のツールは常に検索欄のすぐ下に置き、段の開け閉めやチップの有無で位置が変わらないようにする
  let ytChipsEl = null, ytChipsDy = 0;
  // ホームの YouTube の「すべて」のチップが #primary の左端からどれだけ右にあるか（登録チャンネル画面のツール・一覧をそろえる）
  let chipOff = (() => { try { const n = parseInt(localStorage.getItem('tgChipOff') || '', 10); return isNaN(n) ? null : n; } catch { return null; } })();
  function findYtChips() {
    if (ytChipsEl?.isConnected && ytChipsEl.getBoundingClientRect().height > 0) return ytChipsEl;
    const cands = [...document.querySelectorAll('ytd-feed-filter-chip-bar-renderer, yt-chip-cloud-renderer, #chips-wrapper')]
      .filter(el => !el.closest('#tg-bar, #tg-feed, #tg-manager, ytd-watch-flexy') && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().top < 200);
    return cands.find(el => !cands.some(o => o !== el && o.contains(el))) || null; // いちばん外側
  }
  function placeYtChips(barBottom) {
    const el = barBottom ? findYtChips() : ytChipsEl;
    if (ytChipsEl && ytChipsEl !== el) { ytChipsEl.style.removeProperty('transform'); ytChipsEl.classList.remove('tg-chips-moved'); ytChipsDy = 0; }
    ytChipsEl = el;
    if (!el) return;
    if (!barBottom) { el.style.removeProperty('transform'); el.classList.remove('tg-chips-moved'); ytChipsEl = null; ytChipsDy = 0; return; }
    const origTop = el.getBoundingClientRect().top - ytChipsDy; // ずらす前の位置
    const dy = Math.max(0, Math.round(barBottom - origTop));
    if (dy === ytChipsDy && el.classList.contains('tg-chips-moved')) return;
    ytChipsDy = dy;
    el.style.setProperty('transform', `translateY(${dy}px)`, 'important');
    el.classList.add('tg-chips-moved');
  }
  document.addEventListener('yt-navigate-finish', () => { if (!isSubsFeed()) placeYtChips(0); });

  function layoutBar() {
    const bar = document.getElementById('tg-bar');
    const spacer = document.getElementById('tg-bar-spacer');
    if (!isSubsFeed()) { if (ytChipsEl) placeYtChips(0); return; }
    if (!bar || !spacer) return;
    const r = bar.parentElement.getBoundingClientRect();
    if (!r.width) return;
    const top = document.querySelector('ytd-masthead')?.getBoundingClientRect().bottom || document.querySelector('#masthead-container')?.getBoundingClientRect().bottom || 56;
    bar.style.top = Math.max(0, top) + 'px';
    bar.style.left = r.left + 'px';
    bar.style.width = r.width + 'px';
    // ツール・一覧の左端を、ホームの YouTube のチップ（すべて）と同じ位置に
    if (chipOff != null) {
      const px = chipOff + 'px';
      if (bar.style.paddingLeft !== px) bar.style.paddingLeft = px;
      const feed = document.getElementById('tg-feed');
      if (feed && feed.style.paddingLeft !== px) { feed.style.paddingLeft = px; feed.style.paddingRight = Math.max(8, chipOff) + 'px'; }
    }
    placeYtChips(Math.max(0, top) + bar.offsetHeight);
    // フォルダの段をたたんでいる間は、下の余白を縮めない（動画の位置がずれないように）
    if (bar.classList.contains('tg-folded')) return;
    const h = bar.offsetHeight + 'px';
    if (spacer.style.height !== h) spacer.style.height = h;
  }
  window.addEventListener('resize', layoutBar);

  // ---------- フォルダの段の自動たたみ（下へスクロールで隠す／上へで出す／つまみで切り替え） ----------
  let folded = false, lastY = 0, scrollRaf = 0, manualUntil = 0;
  function setFolded(v) {
    const bar = document.getElementById('tg-bar');
    if (!bar || !bar.classList.contains('tg-bar-full')) return;
    folded = v;
    bar.classList.toggle('tg-folded', v);
    const tab = bar.querySelector('.tg-index');
    if (tab) tab.setAttribute('aria-expanded', String(!v));
    if (!v) setTimeout(layoutBar, 260); // 開き終わってから余白を合わせる
  }
  window.addEventListener('scroll', () => {
    if (scrollRaf || !isSubsFeed()) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      const y = scrollY, dy = y - lastY;
      lastY = y;
      if (performance.now() < manualUntil) return;
      if (y < 60) { if (folded) setFolded(false); return; }
      if (dy > 6 && !folded) setFolded(true);
      else if (dy < -10 && folded) setFolded(false);
    });
  }, { passive: true });

  let qText = '', qKey = '';
  // おすすめの比重（日本語の割合・フォルダごとの重み）
  let recPrefsOpen = false, recPrefsCache = null, rpT = null;
  async function loadRecPrefs() {
    const { recPrefs } = await chrome.storage.local.get('recPrefs');
    const w = { ...(recPrefs?.w || {}) };
    if (!recPrefs) S.folders.filter(f => !f.parent).forEach(f => { if (/国内/.test(f.name)) w[f.id] = 3; else if (/海外/.test(f.name)) w[f.id] = 0.3; });
    recPrefsCache = { jp: recPrefs?.jp ?? 0.9, w };
  }
  // ---------- おすすめ：再生数の上限・好みのタグで探す ----------
  let viewCapNow = 0, tagPrefs = null, tagRot = 0, tagsOpen = false, opsOpen = false; // tagsOpen：好みのタグの一覧を出しているか
  chrome.storage.local.get(['viewCap', 'tagPrefs']).then(r => { viewCapNow = +r.viewCap || 0; tagPrefs = r.tagPrefs || null; });
  // よく見たチャンネルの上位の動画から、投稿者が設定したタグを集めて数える
  async function collectTags() {
    const { history = {}, tagCache = {} } = await chrome.storage.local.get(['history', 'tagCache']);
    const byCh = new Map();
    for (const [v, h] of Object.entries(history)) {
      if (!h.k || h.short || !(h.sec > 30)) continue;
      const e = byCh.get(h.k) || { sec: 0, vids: [] };
      e.sec += h.sec; e.vids.push([v, h.sec]); byCh.set(h.k, e);
    }
    const tops = [...byCh.entries()].sort((a, b) => b[1].sec - a[1].sec).slice(0, 10);
    const vids = tops.flatMap(([, e]) => e.vids.sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]));
    const need = vids.filter(v => !tagCache[v]);
    const bar = document.getElementById('tg-bar');
    let done = 0;
    const q = [...need];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (q.length) {
        const v = q.shift();
        try { const o = await YTAPI.videoOwner(v); tagCache[v] = (o?.kw || []).slice(0, 40); } catch { tagCache[v] = []; }
        done++;
        const st = document.querySelector('#tg-feed .tg-feed-status');
        if (st) st.textContent = `よく見た動画のタグを集計中… ${done} / ${need.length}`;
      }
    }));
    const keys = Object.keys(tagCache);
    if (keys.length > 600) keys.slice(0, keys.length - 600).forEach(k => delete tagCache[k]);
    const chNames = new Set(Object.values(S.channels).map(c => (c.name || '').toLowerCase()));
    const count = new Map();
    for (const v of vids) {
      const seen = new Set();
      for (let t of tagCache[v] || []) {
        t = t.trim(); const k = t.toLowerCase();
        if (t.length < 2 || t.length > 20 || seen.has(k) || chNames.has(k) || /^(youtube|video|動画|vlog|shorts?)$/i.test(t)) continue;
        seen.add(k);
        const e = count.get(k) || { t, n: 0 }; e.n++; count.set(k, e);
      }
    }
    const tags = [...count.values()].filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 20).map(x => [x.t, x.n]);
    tagPrefs = { at: Date.now(), tags, from: vids.length };
    await chrome.storage.local.set({ tagCache, tagPrefs });
    TG.log('おすすめ', `よく見た ${vids.length} 本の動画のタグを集計：${tags.slice(0, 6).map(x => x[0]).join('・')}`);
    return tagPrefs;
  }
  async function tagSearch(single) {
    if (!single && (!tagPrefs?.tags?.length || Date.now() - tagPrefs.at > 864e5 || tagRot > 0)) {
      if (!tagPrefs?.tags?.length || Date.now() - tagPrefs.at > 864e5) await collectTags();
    }
    const tags = (tagPrefs?.tags || []).map(x => x[0]);
    if (!single && !tags.length) { const st = document.querySelector('#tg-feed .tg-feed-status'); if (st) st.textContent = '集計できるタグが見つかりませんでした（視聴記録が少ないか、タグの無い動画が多いようです）'; const bar0 = document.getElementById('tg-bar'); if (bar0) { buildBar(bar0); layoutBar(); } return; }
    // 1つをタイトルに必ず含め（intitle:）、ほかの2つはどちらか
    let sText;
    if (single) sText = `intitle:"${single}"`;
    else {
      const i = tagRot++ % Math.max(1, tags.length);
      const others = tags.filter((_, k) => k !== i).slice(tagRot % 3, tagRot % 3 + 2);
      sText = `intitle:"${tags[i]}" ${others.map(t => (/\s/.test(t) ? `"${t}"` : t)).join(' | ')}`.trim();
    }
    return applyTagText(sText);
  }
  async function applyTagText(sText) {
    tagsOpen = true;
    const patch = { feedType: 'rec', recMode: S.recMode === 'fav' ? 'fav' : 'search', sFolder: '', sText, recKind: 'video' };
    Object.assign(S, patch);
    await chrome.storage.local.set(patch);
    const bar = document.getElementById('tg-bar');
    if (bar) { buildBar(bar); layoutBar(); }
    window.scrollTo({ top: 0 });
    TGFeed.refresh(S, { force: true });
  }

  // ---- 再生した動画のタグを記録（playedTags: { 小文字のタグ: { t:タグ, n:何本の動画に付いていたか, at } }）----
  //   30秒以上見た動画（ショート以外）ごとに1回。「🎲 ランダム」は、ここに溜めたタグからキーワードを作る
  const tagRecorded = new Set(), tagSecs = {};
  async function recordPlayedTags(id) {
    if (!id || tagRecorded.has(id)) return;
    tagRecorded.add(id);
    try {
      const o = await YTAPI.videoOwner(id);
      const chNames = new Set(Object.values(S.channels || {}).map(c => (c.name || '').toLowerCase()));
      const seen = new Set();
      const { playedTags = {} } = await chrome.storage.local.get('playedTags');
      for (let t of o?.kw || []) {
        t = String(t).trim(); const k = t.toLowerCase();
        if (t.length < 2 || t.length > 20 || seen.has(k) || chNames.has(k) || /^(youtube|video|動画|vlog|shorts?)$/i.test(t)) continue;
        seen.add(k);
        const e = playedTags[k] || { t, n: 0 };
        if (e.ng) continue;                    // 「追加しないタグ」に入れたもの
        if (e.x) { e.x = false; e.n = 0; }      // 一度消しただけのタグは、また見たら増やす
        e.n++; e.at = Date.now(); playedTags[k] = e;
      }
      const keys = Object.keys(playedTags);
      // 多すぎたら古いものから捨てる（自分で追加したものは残す）
      const auto = keys.filter(k => !playedTags[k].own);
      if (keys.length > 500) auto.sort((a, b) => playedTags[a].at - playedTags[b].at).slice(0, keys.length - 500).forEach(k => delete playedTags[k]);
      await chrome.storage.local.set({ playedTags });
    } catch { tagRecorded.delete(id); }
  }
  // 記録したタグからランダムに選んで、キーワードに入れて探す（よく出るタグほど選ばれやすい）
  async function tagRandom() {
    const { playedTags = {} } = await chrome.storage.local.get('playedTags');
    const pool = Object.values(playedTags).filter(x => !x.x); // x＝設定で削除したもの
    if (!pool.length) {
      const st = document.querySelector('#tg-feed .tg-feed-status');
      if (st) st.textContent = 'ランダム用のタグがありません（「設定 → 整理・通知 → ランダム」で追加できます。動画を30秒以上見ると、そのタグも溜まります）';
      const bar0 = document.getElementById('tg-bar'); if (bar0) { buildBar(bar0); layoutBar(); }
      return;
    }
    const pick = () => {
      const total = pool.reduce((a, x) => a + x.n, 0);
      let r = Math.random() * total, i = 0;
      for (; i < pool.length - 1; i++) { r -= pool[i].n; if (r < 0) break; }
      return pool.splice(i, 1)[0].t;
    };
    const main = pick();
    const others = []; while (others.length < 2 && pool.length) others.push(pick());
    const q = t => (/\s/.test(t) ? `"${t}"` : t);
    return applyTagText(`intitle:"${main}" ${others.map(q).join(' | ')}`.trim());
  }

  // ---------- 🔭 ゼロビュー・🌐 他言語で検索 ----------
  const SEEDS = ['vlog', 'test', 'my first video', 'unboxing', 'review', 'cooking', 'cat', 'game', '日常', '練習'];
  async function seedWord() {
    const t = tagPrefs?.tags?.map(x => x[0]) || [];
    const f = S.folders.map(x => x.name);
    const pool = t.length ? t : f.length ? f : SEEDS;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // 検索の絞り込み（期間・日付）を変えて、探し直す
  async function searchPatch(patch) {
    Object.assign(S, patch);
    await chrome.storage.local.set(patch);
    const bar = document.getElementById('tg-bar');
    if (bar) { buildBar(bar); layoutBar(); }
    window.scrollTo({ top: 0 });
    TGFeed.refresh(S, { force: true });
  }
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // ゼロビュー＝期間が「1時間以内」＋再生数が「100回未満」（キーワード・フォルダが空ならランダムな言葉で探す）
  const isSrchMode = () => S.recMode === 'search' || S.recMode === 'fav';
  const isZeroNow = () => isSrchMode() && S.sPeriod === 'h' && viewCapNow > 0 && viewCapNow <= 100;
  // 検索用タグ（YouTube の検索の書き方）：押すとキーワード欄に入る。§ はカーソルを置く位置
  const SEARCH_OPS = [
    ['"語句"', '"§"', '完全一致：語句がそのままの並びで含まれる動画'],
    ['-除外', ' -§', 'この語を含む動画を除く（例：大食い -ASMR）'],
    ['A | B', ' | ', 'どちらかを含む（OR）'],
    ['intitle:', 'intitle:"§"', 'タイトルに、この語を含む動画'],
    ['allintitle:', 'allintitle:§', 'タイトルに、並べた語を全部含む動画（効かないことがある）'],
    ['#タグ', '#§', 'ハッシュタグで探す'],
    ['after:', ' after:§', 'この日以降に投稿（例：after:2026-01-01）'],
    ['before:', ' before:§', 'この日より前に投稿（例：before:2026-06-30）']
  ];
  function insertOp(i) {
    const inp = document.querySelector('#tg-bar .tg-sq'); if (!inp) return;
    const [t] = [SEARCH_OPS[i][1]]; const at = t.indexOf('§'); const txt = t.replace('§', '');
    const a = inp.selectionStart ?? inp.value.length, b = inp.selectionEnd ?? a;
    inp.value = inp.value.slice(0, a) + txt + inp.value.slice(b);
    const pos = a + (at < 0 ? txt.length : at);
    inp.focus(); inp.setSelectionRange(pos, pos);
  }
  // 表示の切り替えで作り直しても、入力中のキーワードが消えないようにする
  const keepSq = () => { const v = document.querySelector('#tg-bar .tg-sq'); if (v) S.sText = v.value; };
  const PERIODS = [['', '指定なし'], ['h', '1時間以内'], ['d', '今日'], ['w', '今週'], ['m', '今月'], ['y', '今年'], ['range', '📅 日付を指定…']];
  let sortNow = '';
  chrome.storage.local.get('sSort').then(r => { sortNow = ['new', 'low', 'high'].includes(r.sSort) ? r.sSort : ''; });
  const LANGS = [['th', 'タイ語'], ['es', 'スペイン語'], ['pt', 'ポルトガル語'], ['ko', '韓国語'], ['vi', 'ベトナム語'], ['id', 'インドネシア語'], ['fr', 'フランス語'], ['de', 'ドイツ語'], ['tr', 'トルコ語'], ['ru', 'ロシア語'], ['ar', 'アラビア語'], ['hi', 'ヒンディー語'], ['it', 'イタリア語'], ['pl', 'ポーランド語'], ['fil', 'フィリピン語']];
  async function translateRandom(text) {
    const [to, name] = LANGS[Math.floor(Math.random() * LANGS.length)];
    const out = await chrome.runtime.sendMessage({ type: 'translate', q: text, to }).catch(() => null);
    return out ? { text: out, to, name } : null;
  }
  async function xlangSearch() {
    const src = document.querySelector('#tg-bar .tg-sq')?.value.trim() || (S.sText || '').replace(/intitle:|"/g, '').trim() || await seedWord();
    const st = document.querySelector('#tg-feed .tg-feed-status');
    if (st) st.textContent = `「${src}」を外国語にしています…`;
    const r = await translateRandom(src.split('|')[0].trim());
    if (!r) { if (st) st.textContent = '翻訳できませんでした'; return; }
    TG.log('検索', `「${src}」→ ${r.name}「${r.text}」で検索`);
    const patch = { feedType: 'rec', recMode: 'search', sFolder: '', sText: r.text };
    Object.assign(S, patch);
    await chrome.storage.local.set(patch);
    const bar = document.getElementById('tg-bar');
    if (bar) { buildBar(bar); layoutBar(); }
    TGFeed.refresh(S, { force: true });
    setTimeout(() => { const s2 = document.querySelector('#tg-feed .tg-feed-status'); if (s2) s2.textContent = `🌐 ${r.name}：「${src}」→「${r.text}」　` + s2.textContent; }, 1500);
  }
  // YouTube の検索欄の横に 🌐（入力した言葉をランダムな外国語にして検索）
  function renderXlangBtn() {
    const box = document.querySelector('ytd-masthead yt-searchbox, ytd-masthead ytd-searchbox, ytd-masthead #search-form');
    if (!box || box.querySelector('.tg-xl')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tg-xl';
    b.title = '入力した言葉をランダムな外国語に翻訳して検索（異文化の動画を探す）';
    b.textContent = '🌐';
    b.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      const inp = box.querySelector('input[name="search_query"], input.ytSearchboxComponentInput, input:not([type="file"])');
      const src = inp?.value.trim() || await seedWord();
      b.textContent = '…';
      const r = await translateRandom(src);
      b.textContent = '🌐';
      if (!r) { toastMsg('翻訳できませんでした'); return; }
      toastMsg(`🌐 ${r.name}：「${src}」→「${r.text}」`);
      TG.log('検索', `「${src}」→ ${r.name}「${r.text}」で検索`);
      location.assign('/results?search_query=' + encodeURIComponent(r.text));
    });
    box.appendChild(b);
  }
  // YouTube の検索結果を「低評価の割合が高い順」に並べ替える
  async function chaosYt() {
    const secs = [...document.querySelectorAll('ytd-search ytd-item-section-renderer > #contents')];
    const vids = secs.flatMap(c => [...c.children].map(el => ({ el, v: (el.querySelector('a[href*="watch?v="]')?.getAttribute('href') || '').match(/[?&]v=([\w-]{11})/)?.[1] })).filter(x => x.v && /VIDEO-RENDERER|LOCKUP/i.test(x.el.tagName)));
    if (!vids.length) return toastMsg('並べ替える動画がありません');
    toastMsg(`🔥 ${vids.length} 本の賛否を調べています…`);
    const q = [...vids];
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (q.length) {
        const x = q.shift();
        const r = await chrome.runtime.sendMessage({ type: 'ryd', v: x.v }).catch(() => null);
        x.ratio = r && r.likes + r.dislikes >= 5 ? r.dislikes / (r.likes + r.dislikes) : -1;
      }
    }));
    for (const c of secs) {
      if (getComputedStyle(c).display === 'block') c.style.setProperty('display', 'flex', 'important'), c.style.setProperty('flex-direction', 'column');
      [...c.children].forEach(el => { const x = vids.find(y => y.el === el); el.style.order = x ? String(Math.round((1 - Math.max(0, x.ratio)) * 1000)) : '5000'; });
    }
    vids.forEach(x => {
      x.el.querySelector('.tg-chaos-b')?.remove();
      if (x.ratio < 0) return;
      const t = x.el.querySelector('#video-title, h3');
      t?.insertAdjacentHTML('afterbegin', `<span class="tg-chaos-b">👎 ${Math.round(x.ratio * 100)}%</span>`);
    });
    window.scrollTo({ top: 0 });
    toastMsg('🔥 低評価の割合が高い順に並べました（推定値）');
    TG.log('検索', `検索結果 ${vids.length} 本を賛否両論順に並べ替え`);
  }

  function buildBar(bar) {
    // 表示の種類・フォルダが変わったら絞り込みを解除
    const key = S.feedType + '|' + (['rec', 'later', 'new', 'bm'].includes(S.feedType) ? '' : S.activeGroup);
    if (key !== qKey) { qKey = key; if (qText) { qText = ''; TGFeed.setQuery(''); } }
    const act = document.activeElement;
    const keepFocus = act?.classList?.contains('tg-q') && bar.contains(act) ? [act.selectionStart, act.selectionEnd] : null;
    const fById = new Map(S.folders.map(f => [f.id, f]));
    const chip = (attrs, label, on, n, color) => {
      const f = fById.get((attrs.match(/data-(?:g|sf|ncat|lcat)="([^"]+)"/) || [])[1]);
      const ic = f && (f.icon || f.iconImg) ? TG.iconHtml(f) : color ? `<i class="tg-cdot" style="background:${esc(color)}"></i>` : '';
      return `<button class="tg-chip ${on ? 'tg-active' : ''}" ${attrs}>${ic}<span class="tg-clabel">${esc(label)}</span>${badge(n)}</button>`;
    };
    const tops = S.folders.filter(f => !f.parent || !S.folders.some(x => x.id === f.parent));
    const root = S.activeGroup && S.activeGroup !== '__unsorted' ? TG.rootOf(S.folders, S.activeGroup) : null;

    // 1段目：表示の種類・列数・操作
    const seg = (attr, val, label, on) => `<button class="tg-seg-btn ${on ? 'tg-active' : ''}" ${attr}="${val}">${label}</button>`;
    const types = Object.entries(TGFeed.TYPES).filter(([, d]) => !d.hidden).map(([t, d]) => seg('data-type', t, d.short || d.label, S.feedType === t || (t === 'new' && S.feedType === 'video'))).join('');
    // 列の候補（設定 px.colMin〜px.colMax）＋ リスト表示
    const cMin = Math.max(1, Math.min(10, +PXH.colMin || 3)), cMax = Math.max(cMin, Math.min(12, +PXH.colMax || 7));
    const cols = Array.from({ length: cMax - cMin + 1 }, (_, i) => cMin + i).map(n => seg('data-cols', n, n, S.cols === n)).join('')
      + seg('data-cols', 'list', '☰ リスト', S.cols === 'list');
    const play = ['video', 'live', 'new', 'short'].includes(S.feedType) // 後で見るは一覧ごとのボタンで
      ? '<button class="tg-chip tg-play" data-play="1" title="表示中の未視聴の動画を、新しい順に続けて再生">▶ 連続再生</button><button class="tg-chip tg-play tg-shuffle" data-shuffle="1" title="表示中の未視聴の動画を、ランダムな順で続けて再生">🔀 ランダム再生</button>' : '';
    const hidew = `<button class="tg-chip tg-ghost ${S.hideWatched ? 'tg-active' : ''}" data-hidew="1" title="90%以上見た動画を一覧から隠す">${S.hideWatched ? '視聴済みを表示' : '視聴済みを隠す'}</button>`;
    const fName = S.activeGroup === '__unsorted' ? '未分類' : S.folders.find(f => f.id === S.activeGroup)?.name;
    const ph = S.feedType === 'new' ? '新着から検索' : S.feedType === 'later' ? '後で見るから検索' : S.feedType === 'rec' ? 'おすすめから検索' : fName ? `「${fName}」内を検索` : '一覧から検索';
    const qbox = `<label class="tg-qbox ${qText ? 'tg-has' : ''}" title="表示中の一覧をタイトル・チャンネル名で絞り込み（スペースで区切ると全部を含むもの）"><span>🔍</span><input class="tg-q" type="search" placeholder="${esc(ph)}" value="${esc(qText)}"></label>`;
    const tools = `<div class="tg-seg">${types}</div>${S.feedType === 'bm' ? '' : `<div class="tg-seg" title="列の数"><span class="tg-seg-lb">列</span>${cols}</div>`}${qbox}`; // ブックマークは列の数を使わない

    // 2段目：フォルダ（横幅いっぱいに折り返し）
    let folders = chip('data-g=""', 'すべて', !S.activeGroup, NC.get('__all'));
    folders += chip('data-g="__unsorted"', '未分類', S.activeGroup === '__unsorted', NC.get('__unsorted'));
    folders += '<span class="tg-sep"></span>';
    tops.forEach(f => { folders += fLocked(f.id) ? chip(`data-g="${esc(f.id)}" data-locked="1" title="集中モード中"`, '🔒 ' + f.name, root?.id === f.id, 0, f.color) : chip(`data-g="${esc(f.id)}"`, f.name, root?.id === f.id, NC.get(f.id), f.color); });

    // 3段目：選択中のフォルダの中のフォルダ
    let sub = '';
    if (root && TG.hasChildren(S.folders, root.id)) {
      const tree = TG.tree(S.folders);
      const base = tree.find(x => x.f.id === root.id)?.depth || 0;
      const inRoot = TG.subtreeIds(S.folders, root.id);
      sub += chip(`data-g="${esc(root.id)}"`, `${root.name}（すべて）`, S.activeGroup === root.id, NC.get(root.id), root.color);
      tree.forEach(({ f, depth }) => {
        if (f.id !== root.id && inRoot.has(f.id)) sub += chip(`data-g="${esc(f.id)}"`, `${'› '.repeat(Math.max(1, depth - base))}${f.name}`, S.activeGroup === f.id, NC.get(f.id), f.color);
      });
    }

    let cur = S.activeGroup === '__unsorted' ? { name: '未分類' } : S.folders.find(f => f.id === S.activeGroup);
    let curName = cur ? (cur.id ? TG.pathName(S.folders, cur) : cur.name) : 'すべて';
    let totalNew = cur ? NC.get(cur.id || '__unsorted') : NC.get('__all');
    let row2 = `<div class="tg-chips tg-folders">${folders}</div>
        ${sub ? `<div class="tg-chips tg-sub"><span class="tg-sub-lb">${esc(root.name)} の中</span>${sub}</div>` : ''}`;
    // おすすめ・後で見る：1段目は動画と同じ並び、2段目にその画面の操作
    if (S.feedType === 'rec') {
      const srch = isSrchMode();
      const ALGOS = [['old', '🕰 YouTube検索'], ['new', '✨ オリジナル検索'], ['chain', '🔗 関連検索'], ['wiki', '🎲 ランダム語']];
      const algoNow = ALGOS.some(a => a[0] === S.recAlgo) ? S.recAlgo : 'old';
      const algoSeg = srch || S.recKind === 'short' ? '' : `<label class="tg-chip ${algoNow === 'old' ? 'tg-ghost' : 'tg-focus'} tg-vcap" title="検索方法（動画のおすすめ）&#10;🕰 YouTube検索：YouTube のおすすめ＋キーワード・関連動画&#10;✨ オリジナル検索：YouTube のおすすめを使わず、よく見るフォルダのキーワードと関連動画だけ&#10;🔗 関連検索：登録チャンネルが紹介している別のチャンネルの最新動画&#10;🎲 ランダム語：Wikipedia のランダムな記事名で検索（好みの外の話題）">🧭 検索方法<select data-recalgo-sel="1">${ALGOS.map(([v, l]) => `<option value="${v}" ${algoNow === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
      const kindSeg = `<div class="tg-seg" title="動画／ショート">${seg('data-reckind', 'video', '動画', S.recKind !== 'short')}${seg('data-reckind', 'short', 'ショート', S.recKind === 'short')}</div>`;
      const modeSeg = `<div class="tg-seg">${seg('data-recmode', 'rec', `${IC.rec}おすすめ`, !srch)}${seg('data-recmode', 'search', '🔍 お気に入り以外を検索', S.recMode === 'search')}${seg('data-recmode', 'fav', '⭐ お気に入りから検索', S.recMode === 'fav')}</div>`;
      // 1段目：探し方（おすすめ／検索・動画／ショート）　2段目：絞り込みと並べ替え
      const zeroNow = isZeroNow();
      const capOpts = [[0, '上限なし'], [100, '100回未満'], [1000, '1千回未満'], [10000, '1万回未満'], [100000, '10万回未満']];
      const capSel = zeroNow ? 'zero' : String(viewCapNow);
      const sortSel = TGFeed.isChaos() ? 'chaos' : sortNow;
      const sortOpts = [['', '標準'], ['new', '新しい順'], ['low', '再生数が少ない順'], ['high', '再生数が多い順'], ['chaos', '🔥 賛否両論順']];
      const periodRow = srch ? `<label class="tg-chip ${S.sPeriod ? 'tg-focus' : 'tg-ghost'} tg-vcap" title="投稿された期間で絞る（YouTube の絞り込み。「日付を指定」は after: before: を使う）">📅 期間<select data-period="1">${PERIODS.map(([v, l]) => `<option value="${v}" ${S.sPeriod === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${S.sPeriod === 'range' ? `<label class="tg-chip tg-ghost tg-vcap tg-date" title="この日以降に投稿">から<input type="date" data-after="1" value="${esc(S.sAfter)}"></label><label class="tg-chip tg-ghost tg-vcap tg-date" title="この日より前に投稿">まで<input type="date" data-before="1" value="${esc(S.sBefore)}"></label>` : ''}` : '';
      const row1 = `<div class="tg-chips tg-folders">${modeSeg}${algoSeg}${kindSeg}
        ${srch ? '' : '<button class="tg-chip tg-ghost" data-reload="1">更新</button>'}</div>`;
      const filtersHtml = `<div class="tg-chips tg-sub tg-filters"><span class="tg-sub-lb">絞り込み</span>
        ${periodRow}
        <label class="tg-chip ${zeroNow ? 'tg-focus' : 'tg-ghost'} tg-vcap" title="再生数が多い（すでに人気の）動画を隠して、埋もれた動画だけを出す。🔭 ゼロビュー＝1時間以内に投稿された、再生100回未満の動画（誰にも見つかっていない動画）">📉 再生数<select data-vcap="1">${capOpts.map(([v, l]) => `<option value="${v}" ${capSel === String(v) ? 'selected' : ''}>${l}</option>`).join('')}${srch ? `<option value="zero" ${capSel === 'zero' ? 'selected' : ''}>🔭 ゼロビュー</option>` : ''}</select></label>
        <span class="tg-sub-lb" style="margin-left:8px">並び替え</span>
        <label class="tg-chip ${sortSel ? 'tg-focus' : 'tg-ghost'} tg-vcap" title="読み込んだ動画の並び順（下へ読み込むたびに、その分を並べ替える）。賛否両論順＝低評価の割合が 1% 以上の動画だけを高い順に（Return YouTube Dislike の推定値）">↕<select data-sort="1">${sortOpts.map(([v, l]) => `<option value="${v}" ${sortSel === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${srch ? `<button class="tg-chip ${opsOpen ? 'tg-focus' : 'tg-ghost'}" data-opstoggle="1" title="YouTube の検索の書き方（intitle: など）をボタンでキーワードに入れる" style="margin-left:8px">${opsOpen ? '⌨ 検索用タグを非表示' : '⌨ 検索用タグを表示'}</button>` : ''}
        ${srch ? `<button class="tg-chip ${tagsOpen ? 'tg-focus' : 'tg-ghost'}" data-tagtoggle="1" title="よく見たチャンネルの動画のタグを集計して、${S.recMode === 'fav' ? '好みのタグで探す' : 'まだ登録していないチャンネルを探す'}（もう一度押すとタグを隠す）" style="margin-left:4px">${tagsOpen ? '🏷 好みのタグを隠す' : '🏷 好みのタグで探す'}</button>` : ''}
        <button class="tg-chip ${histOn() ? 'tg-focus' : 'tg-ghost'}" data-hist="1" title="${HIST_TITLE}" style="margin-left:auto">${histLabel()}</button></div>`;
      let prefsHtml = '', searchHtml = '';
      if (!srch && recPrefsOpen && recPrefsCache) {
        const P = recPrefsCache;
        const WL = [[3, '多め'], [1, '普通'], [0.3, '少なめ'], [0, '使わない']];
        const wOf = id => P.w[id] ?? 1;
        const label = id => (WL.find(x => x[0] === wOf(id)) || WL[1])[1];
        prefsHtml = `<div class="tg-chips tg-sub tg-recprefs"><span class="tg-sub-lb">日本語の動画</span>
          <div class="tg-seg">${[[1, 'だけ'], [0.9, '9割'], [0.7, '7割'], [0.5, '半々'], [0, '気にしない']].map(([v, l]) => seg('data-rpjp', v, l, P.jp === v)).join('')}</div>
          <span class="tg-sub-lb" style="margin-left:10px">フォルダの比重（押すと 多め→普通→少なめ→使わない）</span>
          ${tops.map(f => `<button class="tg-chip tg-rpw tg-w${String(wOf(f.id)).replace('.', '')}" data-rpw="${esc(f.id)}">${f.icon || f.iconImg ? TG.iconHtml(f) : `<i class="tg-cdot" style="background:${esc(f.color)}"></i>`}<span class="tg-clabel">${esc(f.name)}</span><small>${label(f.id)}</small></button>`).join('')}
          <div class="tg-sq-hint">よく見るフォルダのキーワードで検索した動画・関連動画・ホームのおすすめを混ぜて出します。見たことのないチャンネルを優先、見た動画と最近出した動画は出しません。</div></div>`;
      }
      if (srch) {
        const sRoot = S.sFolder ? TG.rootOf(S.folders, S.sFolder) : null;
        let fchips = chip('data-sf=""', '指定なし', !S.sFolder) + tops.map(f => chip(`data-sf="${esc(f.id)}"`, f.name, sRoot?.id === f.id, 0, f.color)).join('');
        let subs = '';
        if (sRoot && TG.hasChildren(S.folders, sRoot.id)) {
          const inRoot = TG.subtreeIds(S.folders, sRoot.id);
          subs = chip(`data-sf="${esc(sRoot.id)}"`, `${sRoot.name}（全体）`, S.sFolder === sRoot.id, 0, sRoot.color) +
            S.folders.filter(f => f.id !== sRoot.id && inRoot.has(f.id)).map(f => chip(`data-sf="${esc(f.id)}"`, '› ' + f.name, S.sFolder === f.id, 0, f.color)).join('');
        }
        const q = TG.searchQuery(S.folders, S.sFolder, S.sText);
        searchHtml = `<div class="tg-chips tg-sub tg-search">
          <label class="tg-qbox tg-sbox"><span>🔍</span><input class="tg-sq" type="search" placeholder="キーワード（空ならフォルダのタグで探す）" value="${esc(S.sText)}"></label>
          <button class="tg-chip tg-play" data-dosearch="1">検索</button>
          <button class="tg-chip tg-ghost" data-tagrandom="1" title="ランダムなタグを選んで、キーワードに入れて探す（タグは「設定 → 整理・通知 → ランダム」で編集。再生した動画のタグも自動で溜まります）">🎲 ランダム</button>
          <button class="tg-chip tg-ghost" data-xlang="1" title="キーワード（空なら好みのタグ）をランダムな外国語に翻訳して探す">🌐 他言語で</button>
          <span class="tg-sub-lb">フォルダ：</span>${fchips}
          ${subs ? `<div class="tg-chips tg-sub2">${subs}</div>` : ''}
          ${opsOpen ? `<div class="tg-chips tg-sub2 tg-tagpref"><span class="tg-sub-lb">⌨ 検索用タグ（押すとキーワードに入ります）：</span>${SEARCH_OPS.map(([l, , d], i) => `<button class="tg-chip" data-op="${i}" title="${esc(d)}">${esc(l)}</button>`).join('')}</div>` : ''}
          ${tagsOpen && tagPrefs?.tags?.length ? `<div class="tg-chips tg-sub2 tg-tagpref"><span class="tg-sub-lb">🏷 好みのタグ（よく見た動画から）：</span>${tagPrefs.tags.slice(0, 12).map(([t, n]) => `<button class="tg-chip" data-tagq="${esc(t)}" title="${n}本の動画に付いていたタグ。押すとタイトルにこの言葉を含む動画を探す">${esc(t)}<small>${n}</small></button>`).join('')}<button class="tg-chip tg-ghost" data-tagsearch="1" title="集計し直して別の組み合わせで探す">↻ 別の組み合わせ</button></div>` : ''}
          ${isZeroNow() && !q ? '<div class="tg-sq-hint">🔭 ゼロビュー中：キーワード・フォルダが空なので、ランダムな言葉で1時間以内・再生100回未満の動画を探しています（期間か再生数を変えると解除）</div>' : q ? '' : '<div class="tg-sq-hint">キーワードを入れるか、フォルダを選んでください</div>'}</div>`;
      }
      row2 = row1 + filtersHtml + (srch ? searchHtml : prefsHtml);
      cur = null; curName = srch ? '検索' : 'おすすめ'; totalNew = 0;
    } else if (S.feedType === 'new') {
      const off = new Set(S.newOff);
      const cat = (id, name, color, n) => `<button class="tg-chip tg-cat ${off.has(id) ? '' : 'tg-active'}" data-ncat="${esc(id)}" title="${off.has(id) ? '押すと表示' : '押すと隠す'}">${fById.get(id) && (fById.get(id).icon || fById.get(id).iconImg) ? TG.iconHtml(fById.get(id)) : color ? `<i class="tg-cdot" style="background:${esc(color)}"></i>` : ''}<span class="tg-clabel">${esc(name)}</span>${badge(n)}</button>`;
      row2 = `<div class="tg-chips tg-folders"><span class="tg-bar-title">${IC.new}新着動画<small>カテゴリを押してオン／オフ</small></span>
        <button class="tg-chip tg-ghost" data-ncatall="1">${off.size ? 'すべてオン' : 'すべてオフ'}</button>
        ${tops.map(f => cat(f.id, f.name, f.color, NC.get(f.id))).join('')}${cat('__unsorted', '未分類', '', NC.get('__unsorted'))}
        <button class="tg-chip tg-ghost" data-reload="1" title="今すぐ新着を確認">更新</button></div>`;
      cur = null; curName = '新着動画'; totalNew = NC.get('__all');
    } else if (S.feedType === 'bm') {
      row2 = `<div class="tg-chips tg-folders"><span class="tg-bar-title">${IC.bm}ブックマーク<small>再生中に B キーで、その時間を保存</small></span></div>`;
      cur = null; curName = 'ブックマーク'; totalNew = 0;
    } else if (S.feedType === 'later') {
      const off = new Set(S.laterOff);
      const cat = (id, name, color) => `<button class="tg-chip tg-cat ${off.has(id) ? '' : 'tg-active'}" data-lcat="${esc(id)}" title="${off.has(id) ? '押すと表示' : '押すと隠す'}">${fById.get(id) && (fById.get(id).icon || fById.get(id).iconImg) ? TG.iconHtml(fById.get(id)) : color ? `<i class="tg-cdot" style="background:${esc(color)}"></i>` : ''}<span class="tg-clabel">${esc(name)}</span></button>`;
      row2 = `<div class="tg-chips tg-folders"><span class="tg-bar-title">${IC.later}後で見る<small>カテゴリを押してオン／オフ</small></span>
        <button class="tg-chip tg-ghost" data-lcatall="1">${off.size ? 'すべてオン' : 'すべてオフ'}</button>
        ${tops.map(f => cat(f.id, f.name, f.color)).join('')}${cat('__unsorted', '未分類', '')}${cat('__other', '登録外', '')}
        <button class="tg-chip tg-ghost" data-reload="1" title="YouTubeの「後で見る」を読み込み直す">更新</button></div>`;
      cur = null; curName = '後で見る'; totalNew = 0;
    }
    bar.className = 'tg-bar-full' + (folded ? ' tg-folded' : '');
    const focusChip = FST.active ? `<button class="tg-chip tg-focus" data-tg-focuscfg="1" title="集中モードの設定">🎯 集中モード中${FST.until ? '（〜' + new Date(FST.until).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) + '）' : ''}</button>`
      : FST.unlocked ? `<button class="tg-chip tg-ghost" data-tg-focuscfg="1">🎯 一時解除中（〜${new Date(FOCUS.unlockUntil).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}）</button>` : '';
    const discover = (S.feedType === 'video' || S.feedType === 'live' || S.feedType === 'short') && S.activeGroup && S.activeGroup !== '__unsorted'
      ? '<button class="tg-chip tg-ghost" data-discover="1" title="このフォルダのキーワードで、登録していないチャンネルの動画を探す">🔍 お気に入り以外を探す</button>' : '';
    const hidem = `<button class="tg-chip tg-ghost ${S.hideMembers ? 'tg-active' : ''}" data-hidem="1" title="メンバー限定の動画を一覧から隠す／表示する">${S.hideMembers ? 'メンバー限定を表示' : 'メンバー限定を隠す'}</button>`;
    const disb = `<button class="tg-chip tg-ghost ${disBadgeOn() ? 'tg-active' : ''}" data-disb="1" title="サムネの右上に低評価の割合（Return YouTube Dislike の推定）を表示">👎 低評価率</button>`;
    bar.innerHTML = `<div class="tg-bar-tools">${tools}<span class="tg-grow"></span>${focusChip}${discover}${play}</div>
      <div class="tg-fold"><div class="tg-fold-in">
        ${row2}
      </div></div>`;
    void curName; void totalNew; // （以前はインデックスのつまみに表示していた）
    if (keepFocus) { const i = bar.querySelector('.tg-q'); i?.focus(); try { i?.setSelectionRange(...keepFocus); } catch { /* なし */ } }
    bar.querySelector('[data-vcap]')?.addEventListener('change', e => {
      const was = viewCapNow, zeroBefore = isZeroNow();
      if (e.target.value === 'zero') { // 🔭 ゼロビュー：期間＝1時間以内＋再生数＝100回未満（動画の検索）
        viewCapNow = 100;
        chrome.storage.local.set({ viewCap: 100 });
        TGFeed.setViewCap(100);
        return searchPatch({ sPeriod: 'h', recMode: 'search', recKind: 'video', feedType: 'rec' });
      }
      viewCapNow = +e.target.value || 0;
      chrome.storage.local.set({ viewCap: viewCapNow });
      TGFeed.setViewCap(viewCapNow);
      if (zeroBefore || (isSrchMode() && S.sPeriod === 'h' && (was <= 100 || viewCapNow <= 100))) searchPatch({}); // ゼロビューの出入りは探し直す
      else buildBar(bar);
    });
    bar.querySelector('[data-recalgo-sel]')?.addEventListener('change', async e => {
      S.recAlgo = e.target.value;
      await chrome.storage.local.set({ recAlgo: S.recAlgo });
      buildBar(bar);
      window.scrollTo({ top: 0 });
      TGFeed.refresh(S, { force: true });
    });
    bar.querySelector('[data-period]')?.addEventListener('change', e => {
      const v = e.target.value;
      const patch = { sPeriod: v };
      if (v === 'range' && !S.sAfter && !S.sBefore) { const d = new Date(); patch.sBefore = ymd(d); d.setDate(d.getDate() - 30); patch.sAfter = ymd(d); }
      searchPatch(patch);
    });
    bar.querySelector('[data-after]')?.addEventListener('change', e => searchPatch({ sAfter: e.target.value || '' }));
    bar.querySelector('[data-before]')?.addEventListener('change', e => searchPatch({ sBefore: e.target.value || '' }));
    bar.querySelector('[data-sort]')?.addEventListener('change', e => {
      const v = e.target.value;
      if (TGFeed.isChaos()) TGFeed.chaosSort(); // 賛否両論順から出る（元の並びに戻す）
      if (v === 'chaos') TGFeed.chaosSort();
      else {
        sortNow = v;
        chrome.storage.local.set({ sSort: v });
        TGFeed.setSort(v);
      }
      window.scrollTo({ top: 0 });
      buildBar(bar);
    });
  }

  // 連続再生：表示中の未視聴＋（フォルダ表示なら）そのフォルダの直近の新着、新しい順
  async function playNow(btn, shuffle = false) {
    let list = TGFeed.playable();
    let title = S.feedType === 'new' ? '新着動画' : S.feedType === 'short' ? 'ショート' : '後で見る';
    if (S.feedType !== 'later' && S.feedType !== 'new' && S.feedType !== 'short') {
      const f = S.folders.find(x => x.id === S.activeGroup);
      title = f ? TG.pathName(S.folders, f) : S.activeGroup === '__unsorted' ? '未分類' : 'すべて';
      if (S.feedType === 'video') {
        const { recent = [], watched = {} } = await chrome.storage.local.get(['recent', 'watched']);
        let set = null;
        if (f) set = TG.matchSet(S.channels, [...TG.folderKeys(S.folders, f.id)]);
        if (S.activeGroup === '__unsorted') {
          const inAny = TG.matchSet(S.channels, [...new Set(S.folders.flatMap(x => x.keys))]);
          set = TG.matchSet(S.channels, Object.keys(S.channels).filter(k => !inAny.has(k)));
        }
        const extra = recent.filter(x => !x.live && Math.max(x.w || 0, watched[x.v]?.p || 0) < 90 && (!set || set.has(x.k) || (x.id && set.has('channel/' + x.id))));
        const seen = new Set(list.map(x => x.v));
        list = list.concat(extra.filter(x => !seen.has(x.v))).sort((a, b) => (b.p || 0) - (a.p || 0));
      }
    }
    if (shuffle) list = list.slice().sort(() => Math.random() - 0.5);
    list = list.slice(0, 100);
    if (!list.length) {
      const was = btn.textContent;
      btn.textContent = '未視聴の動画がありません';
      setTimeout(() => { btn.textContent = was; }, 2500);
      return;
    }
    TGX.startQueue(list, (shuffle ? '🔀 ' : '') + title);
  }

  async function onBarClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.manage) return TGManager.open();
    if (b.dataset.disb) return toggleDisBadge();
    if (b.dataset.fold) { manualUntil = performance.now() + 700; setFolded(!folded); return; }
    if (b.dataset.hist) return histMenu();
    if (b.dataset.recreset) return recReset();
    if (b.dataset.op) return insertOp(+b.dataset.op);
    if (b.dataset.opstoggle) { keepSq(); opsOpen = !opsOpen; buildBar(document.getElementById('tg-bar')); layoutBar(); return; }
    if (b.dataset.tagtoggle) { // 表示・非表示だけ。キーワードや検索結果は変えない
      keepSq();
      if (!tagsOpen && (!tagPrefs?.tags?.length || Date.now() - tagPrefs.at > 864e5)) {
        b.disabled = true; b.textContent = '🏷 集計中…';
        await collectTags();
        if (!tagPrefs?.tags?.length) { const st = document.querySelector('#tg-feed .tg-feed-status'); if (st) st.textContent = '集計できるタグが見つかりませんでした（視聴記録が少ないか、タグの無い動画が多いようです）'; }
      }
      tagsOpen = !tagsOpen && !!tagPrefs?.tags?.length;
      buildBar(document.getElementById('tg-bar')); layoutBar(); return;
    }
    if (b.dataset.tagsearch) { b.disabled = true; b.textContent = '🏷 集計中…'; return tagSearch(); }
    if (b.dataset.tagq) return tagSearch(b.dataset.tagq);
    if (b.dataset.tagrandom) return tagRandom();
    if (b.dataset.xlang) return xlangSearch();
    if (b.dataset.reload) { window.scrollTo({ top: 0 }); return TGFeed.refresh(S, { force: true }); } // 更新したら一番上から
    if (b.dataset.recmode || b.dataset.discover || 'sf' in b.dataset || b.dataset.dosearch) {
      const patch = {};
      if (b.dataset.recmode) patch.recMode = b.dataset.recmode;
      if (b.dataset.discover) {
        Object.assign(patch, { recMode: 'search', sFolder: S.activeGroup, sText: '', feedType: 'rec', recKind: S.feedType === 'short' ? 'short' : 'video' });
      }
      if ('sf' in b.dataset) patch.sFolder = b.dataset.sf;
      if (b.dataset.dosearch) patch.sText = document.querySelector('#tg-bar .tg-sq')?.value.trim() || '';
      Object.assign(S, patch);
      await chrome.storage.local.set(patch);
      buildBar(document.getElementById('tg-bar'));
      layoutBar();
      window.scrollTo({ top: 0 });
      if (!patch.feedType) TGFeed.refresh(S, { force: !!b.dataset.dosearch });
      return;
    }
    if (b.dataset.lcat || b.dataset.lcatall) {
      const all = S.folders.filter(f => !f.parent || !S.folders.some(x => x.id === f.parent)).map(f => f.id).concat('__unsorted', '__other');
      let off = new Set(S.laterOff);
      if (b.dataset.lcatall) off = off.size ? new Set() : new Set(all);
      else off.has(b.dataset.lcat) ? off.delete(b.dataset.lcat) : off.add(b.dataset.lcat);
      S.laterOff = [...off];
      await chrome.storage.local.set({ laterOff: S.laterOff });
      buildBar(document.getElementById('tg-bar'));
      layoutBar();
      return TGFeed.refresh(S);
    }
    if (b.dataset.recprefs || b.dataset.rpjp || b.dataset.rpw) {
      if (b.dataset.recprefs) { recPrefsOpen = !recPrefsOpen; await loadRecPrefs(); }
      else {
        const P = recPrefsCache;
        if (b.dataset.rpjp) P.jp = +b.dataset.rpjp;
        if (b.dataset.rpw) { const order = [3, 1, 0.3, 0]; const cur = P.w[b.dataset.rpw] ?? 1; P.w[b.dataset.rpw] = order[(order.indexOf(cur) + 1) % order.length]; }
        await chrome.storage.local.set({ recPrefs: P });
        clearTimeout(rpT);
        rpT = setTimeout(() => TGFeed.refresh(S, { force: true }), 900); // 続けて押せるよう少し待ってから読み直す
      }
      buildBar(document.getElementById('tg-bar'));
      layoutBar();
      return;
    }
    if (b.dataset.ncat || b.dataset.ncatall) {
      const tops = S.folders.filter(f => !f.parent || !S.folders.some(x => x.id === f.parent)).map(f => f.id).concat('__unsorted');
      let off = new Set(S.newOff);
      if (b.dataset.ncatall) off = off.size ? new Set() : new Set(tops);
      else off.has(b.dataset.ncat) ? off.delete(b.dataset.ncat) : off.add(b.dataset.ncat);
      S.newOff = [...off];
      await chrome.storage.local.set({ newOff: S.newOff });
      buildBar(document.getElementById('tg-bar'));
      layoutBar();
      return TGFeed.refresh(S);
    }
    if (b.dataset.reckind) {
      if (S.recKind === b.dataset.reckind) return;
      S.recKind = b.dataset.reckind;
      await chrome.storage.local.set({ recKind: S.recKind });
      buildBar(document.getElementById('tg-bar'));
      layoutBar();
      window.scrollTo({ top: 0 });
      return TGFeed.refresh(S);
    }
    if (b.dataset.recalgo) {
      S.recAlgo = b.dataset.recalgo;
      await chrome.storage.local.set({ recAlgo: S.recAlgo });
      buildBar(document.getElementById('tg-bar'));
      window.scrollTo({ top: 0 });
      return TGFeed.refresh(S, { force: true });
    }
    if (b.dataset.play) return playNow(b);
    if (b.dataset.shuffle) return playNow(b, true);
    if (b.dataset.hidem) return toggleHideMembers();
    if (b.dataset.hidew) return toggleHideWatched();
    if (b.dataset.type) {
      S.feedType = b.dataset.type;
      await chrome.storage.local.set({ feedType: S.feedType });
    } else if (b.dataset.cols) {
      S.cols = b.dataset.cols === 'list' ? 'list' : +b.dataset.cols;
      await chrome.storage.local.set({ cols: S.cols });
      return;
    } else if ('g' in b.dataset) {
      if (S.feedType === 'rec' || S.feedType === 'later' || S.feedType === 'new' || S.feedType === 'bm') { S.feedType = 'video'; await chrome.storage.local.set({ feedType: 'video' }); }
      S.activeGroup = b.dataset.g || null;
      await TG.setActive(S.activeGroup);
    }
    window.scrollTo({ top: 0 });
  }

  // ---------- ホーム等の動画：登録チャンネル＝青枠 / それ以外＝赤枠 ----------
  const ITEM_SEL = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, ytd-reel-item-renderer';
  const CH_LINK_SEL = 'a[href^="/@"], a[href^="/channel/"], a[href^="/c/"], a[href^="/user/"]';
  let favSet = new Set(), fMap = new Map(), nameMap = new Map();
  const normName = t => (t || '').replace(/\s+/g, ' ').trim().toLowerCase();
  function buildFavSet() {
    bumpMark();
    const subs = Object.values(S.channels).filter(c => !c.unsub);
    favSet = TG.matchSet(S.channels, subs.map(c => c.key));
    fMap = TG.folderMap(S.channels, S.folders);
    nameMap = new Map();
    subs.forEach(c => { if (c.name) nameMap.set(normName(c.name), c.key); });
  }
  const NAME_SEL = '[class*="metadata-row" i], [class*="metadatarow" i], ytd-channel-name #text, #channel-name #text, #byline';
  const MIX_SEL = 'a[href*="start_radio="], a[href^="/playlist"], yt-collection-thumbnail-view-model, ytd-playlist-thumbnail';
  // ---------- 動画ID → チャンネル（oEmbed）。チャンネル情報が画面に無いショート等で使う ----------
  const vidOwner = new Map();
  let ownerQ = [], ownerBusy = 0, ownerSaveT = null, markT = null;
  chrome.storage.local.get('vidOwner').then(({ vidOwner: o }) => { for (const [k, v] of Object.entries(o || {})) if (v?.k || v?.n) vidOwner.set(k, v); }); // 分からなかったもの（空）は調べ直す
  function videoIdOf(item) {
    const a = item.querySelector('a[href*="/shorts/"], a[href*="watch?v="]');
    const h = a?.getAttribute('href') || '';
    return (h.match(/\/shorts\/([\w-]{11})/) || h.match(/[?&]v=([\w-]{11})/))?.[1] || null;
  }
  function scheduleMark() { clearTimeout(markT); markT = setTimeout(markVideos, 300); }
  function lookupOwner(vid) {
    if (vidOwner.has(vid) || ownerQ.includes(vid)) return;
    ownerQ.push(vid);
    pumpOwner();
  }
  function pumpOwner() {
    while (ownerBusy < 4 && ownerQ.length) {
      const vid = ownerQ.shift();
      ownerBusy++;
      fetch(`/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + vid)}&format=json`, { credentials: 'omit' })
        .then(r => (r.ok ? r.json() : null))
        // 埋め込み禁止の動画（音楽・ダンスなど）は oEmbed で取れないので、YouTubeの動画情報から調べる
        .then(async j => j?.author_url ? { k: TG.channelKey(j.author_url) || '', n: j.author_name || '' } : (await YTAPI.videoOwner(vid).catch(() => null)))
        .then(o => vidOwner.set(vid, o || { k: '', n: '' }))
        .catch(() => vidOwner.set(vid, { k: '', n: '' }))
        .finally(() => {
          ownerBusy--;
          scheduleMark();
          clearTimeout(ownerSaveT);
          ownerSaveT = setTimeout(() => {
            const o = Object.fromEntries([...vidOwner].slice(-4000)); // 古いものから捨てる
            chrome.storage.local.set({ vidOwner: o });
          }, 3000);
          pumpOwner();
        });
    }
  }
  function ownerKey(o) {
    if (!o || (!o.k && !o.n)) return null;
    if (o.k && favSet.has(o.k)) return o.k;
    return nameMap.get(normName(o.n)) || o.k || '__other';
  }

  // リンクが無い欄（再生画面の横など）はチャンネル名の文字で判別する
  function nameEl(item) {
    const row = item.querySelector(NAME_SEL);
    if (!row) return null;
    return row.querySelector('a, span.yt-core-attributed-string, span') || row;
  }
  // 枠を描く部品：入れ子のうち一番外側のサムネ部品（querySelectorは外側から見つける）
  const THUMB_SEL = 'ytd-thumbnail, yt-thumbnail-view-model, [class*="content-image" i], [class*="contentimage" i], [class*="thumbnailcontainer" i]:not([class*="parent" i])';
  function frameTarget(item) {
    const t = item.querySelector(THUMB_SEL);
    if (!t) return;
    if (!t.classList.contains('tg-fr')) {
      t.classList.add('tg-fr');
      if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    }
    // 位置合わせは画像が読み込まれた後に1回だけ（毎回測ると重い）
    if (t.dataset.tgFit === fitGen) return;
    const img = t.querySelector('img');
    if (!img) return;
    if (!img.complete || !img.naturalWidth) {
      if (!img.dataset.tgWait) { img.dataset.tgWait = '1'; img.addEventListener('load', () => { delete img.dataset.tgWait; fitQueue.add(t); flushFit(); }, { once: true }); }
      return;
    }
    fitQueue.add(t);
    flushFit();
  }
  // 測定はまとめて1フレームで（読み取り→書き込みの順にして描き直しを1回に）
  let fitGen = '1', fitQueue = new Set(), fitRaf = 0;
  function flushFit() {
    if (fitRaf) return;
    fitRaf = requestAnimationFrame(() => {
      fitRaf = 0;
      const list = [...fitQueue].filter(t => t.isConnected);
      fitQueue.clear();
      const rects = list.map(t => { const img = t.querySelector('img'); return img ? [t.getBoundingClientRect(), img.getBoundingClientRect()] : null; });
      list.forEach((t, i) => { if (rects[i]) fitFrame(t, ...rects[i]); });
    });
  }
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { fitGen = String(+fitGen + 1); document.querySelectorAll('.tg-fr').forEach(t => fitQueue.add(t)); flushFit(); }, 400);
  });
  // 枠を画像の範囲にぴったり合わせる（部品が画像より大きい場合、その差を内側に詰める）
  function fitFrame(t, a, b) {
    if (!a.height || !b.height) return;
    t.dataset.tgFit = fitGen;
    const px = v => Math.max(0, Math.round(v)) + 'px';
    const vals = { '--tg-it': px(b.top - a.top), '--tg-ir': px(a.right - b.right), '--tg-ib': px(a.bottom - b.bottom), '--tg-il': px(b.left - a.left) };
    for (const [k, v] of Object.entries(vals)) if (t.style.getPropertyValue(k) !== v) t.style.setProperty(k, v);
  }

  // 処理済みの動画は、中身（リンク）が変わるか設定が変わるまで飛ばす
  let markGen = 1;
  const bumpMark = () => { markGen++; };
  function itemSig(item) {
    const a = item.querySelector('a[href*="watch?v="], a[href*="/shorts/"], a[href^="/@"], a[href^="/channel/"]');
    return markGen + '|' + (a?.getAttribute('href') || item.textContent.length);
  }
  // ---------- 後で見る（ホーム・検索・再生画面の横の動画、再生中の動画） ----------
  let laterSet = new Set();
  function setLaterSet(list) {
    laterSet = new Set((list || []).map(x => x.v));
    document.querySelectorAll('.tg-lbtn').forEach(paintLaterBtn);
  }
  chrome.storage.local.get('later').then(({ later }) => setLaterSet(later));
  function paintLaterBtn(b) {
    const on = laterSet.has(b.dataset.v);
    b.classList.toggle('on', on);
    const label = b.id === 'tg-lfab' ? (on ? '✓ 後で見る' : '🕒 後で見る') : (on ? '✓' : '🕒');
    if (b.textContent !== label) b.textContent = label;
    b.title = on ? 'TubeFolioの「後で見る」から外す' : 'TubeFolioの「後で見る」に追加（サイドバーの「後で見る」で一覧）';
  }
  function laterBtn(v, list = '', short = false) {
    const b = document.createElement('button');
    b.className = 'tg-lbtn';
    // ボタンの上ではYouTubeのマウスオーバー（サムネのプレビュー再生など）を起こさない
    ['mouseover', 'mouseenter', 'mousemove', 'pointerover', 'pointerenter', 'pointermove'].forEach(t => b.addEventListener(t, e => e.stopPropagation()));
    b.dataset.v = v;
    if (list) b.dataset.list = list;
    if (short) b.dataset.short = '1';
    paintLaterBtn(b);
    return b;
  }
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  function laterInfo(btn) {
    const v = btn.dataset.v;
    const th = `https://i.ytimg.com/vi/${v}/mqdefault.jpg`;
    const extra = { ...(btn.dataset.list ? { list: btn.dataset.list } : {}), ...(btn.dataset.short ? { short: true } : {}) };
    if (btn.id === 'tg-lfab') {
      const ch = currentChannel();
      const t = isShortsPage()
        ? txt(document.querySelector('ytd-reel-video-renderer[is-active] h2, ytd-reel-video-renderer[is-active] [class*="title" i], yt-shorts-video-title-view-model')) || document.title.replace(/ - YouTube$/, '')
        : txt(document.querySelector('ytd-watch-metadata h1, #title h1')) || document.title.replace(/ - YouTube$/, '');
      return { v, t, th, ...extra, ch: { key: ch?.key || '', name: ch?.name || '', unsub: !(ch && favSet.has(ch.key)) } };
    }
    const item = btn._item || btn.closest(ITEM_SEL);
    const tEl = item?.querySelector('#video-title, a#video-title-link, h3 a, h3, [class*="title" i] a[href*="watch"], [class*="title" i] a[href*="shorts"], [class*="title" i] span');
    const t = txt(tEl) || tEl?.getAttribute('title') || '';
    const link = item?.querySelector(CH_LINK_SEL);
    let key = link ? TG.channelKey(link.getAttribute('href')) : null;
    const nm = txt(item && nameEl(item));
    if (!key && nm) key = nameMap.get(normName(nm)) || null;
    if (!key && vidOwner.has(v)) key = ownerKey(vidOwner.get(v));
    if (key === '__other') key = '';
    const name = (key && S.channels[key]?.name) || nm || txt(link) || vidOwner.get(v)?.n || '';
    // 長さ（サムネ右下の「19:53」）
    let d = 0;
    for (const el of item?.querySelectorAll('[class*="badge" i], #time-status, .ytd-thumbnail-overlay-time-status-renderer, span') || []) {
      const m = (el.childElementCount ? '' : el.textContent.trim()).match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
      if (m) { d = (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3]; break; }
    }
    return { v, t, th, d, ...extra, ch: { key: key || '', name, unsub: !(key && favSet.has(key)) } };
  }
  // サムネや動画リンクの中にあってもページ移動させない
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach(type => window.addEventListener(type, async e => {
    const b = e.target.closest?.('.tg-lbtn');
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (type !== 'click' || b.dataset.busy) return;
    b.dataset.busy = '1';
    try {
      const added = await TGX.toggleLater(laterInfo(b));
      if (b === fl) fl.blur();
      laterSet[added ? 'add' : 'delete'](b.dataset.v);
      document.querySelectorAll('.tg-lbtn').forEach(paintLaterBtn);
    } finally { delete b.dataset.busy; }
  }, true));
  // ---------- マウスを乗せた動画の🕒を、ページの一番上の層に重ねて出す ----------
  //   ホームのショート・トピックの棚などは、マウスを乗せるとYouTubeがサムネをプレビューに差し替えて
  //   サムネの中の🕒が消える。サムネの位置に合わせた別のボタンをページの上に置いておく
  let fl = null, flItem = null, flRect = null, flRaf = 0, lastPt = null;
  function flThumb(item) {
    const own = item.querySelector('.tg-lov');
    return own?.parentElement || item.querySelector(THUMB_SEL) || item.querySelector('a[href*="/shorts/"], a[href*="watch?v="]');
  }
  function hideFl() { if (fl) fl.style.display = 'none'; flItem = null; flRect = null; }
  function placeFl(item) {
    const own = item.querySelector('.tg-lov');
    const t = flThumb(item);
    if (!own || !t) return hideFl();
    const r = t.getBoundingClientRect();
    const top = (document.querySelector('#masthead-container, ytd-masthead')?.getBoundingClientRect().bottom || 56);
    if (!r.width || r.bottom - 40 < top || r.top > innerHeight) return hideFl();
    if (!fl) {
      fl = laterBtn('');
      fl.id = 'tg-lfloat';
      fl.classList.add('tg-lov');
      document.body.appendChild(fl);
    }
    fl._item = item;
    fl.dataset.v = own.dataset.v;
    if (own.dataset.list) fl.dataset.list = own.dataset.list; else delete fl.dataset.list;
    if (own.dataset.short) fl.dataset.short = '1'; else delete fl.dataset.short;
    paintLaterBtn(fl);
    fl.style.left = Math.round(r.left + 8) + 'px';
    fl.style.top = Math.round(r.bottom - 38) + 'px';
    fl.style.display = 'block';
    flItem = item;
    flRect = r;
  }
  function trackFl() {
    flRaf = 0;
    if (!lastPt) return;
    const { x, y, target } = lastPt;
    // 今のサムネ（＋少し余白）の中にいる間は出したまま（プレビューに差し替わっても）
    if (flItem && flRect && flItem.isConnected) {
      const r = flThumb(flItem)?.getBoundingClientRect() || flRect;
      if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4) { if (r.top !== flRect.top || r.left !== flRect.left) placeFl(flItem); return; }
    }
    if (target === fl) return;
    const item = target?.closest?.(ITEM_SEL);
    if (item && !item.closest('#tg-feed, #tg-hf-list') && item.querySelector('.tg-lov')) {
      const outer = item.parentElement?.closest(ITEM_SEL) || item;
      return placeFl(outer.querySelector('.tg-lov') ? outer : item);
    }
    hideFl();
  }
  document.addEventListener('pointermove', e => {
    lastPt = { x: e.clientX, y: e.clientY, target: e.target };
    if (!flRaf) flRaf = requestAnimationFrame(trackFl);
  }, { passive: true, capture: true });
  window.addEventListener('scroll', () => { if (flItem) { lastPt = null; hideFl(); } }, { passive: true });

  function renderLaterFab() {
    let b = document.getElementById('tg-lfab');
    const v = isWatchPage() ? new URLSearchParams(location.search).get('v') : isShortsPage() ? location.pathname.split('/')[2] : null;
    if (!v) { b?.remove(); return; }
    if (!b) {
      b = document.createElement('button');
      b.id = 'tg-lfab';
      b.className = 'tg-lbtn';
      if (isShortsPage()) b.dataset.short = '1';
      document.body.appendChild(b);
    }
    if (b.dataset.v !== v) b.dataset.v = v;
    paintLaterBtn(b);
    // フォルダ登録ボタン（📁＋）の左に並べる
    const fab = document.getElementById('tg-fab');
    const r = fab && getComputedStyle(fab).display !== 'none' ? fab.getBoundingClientRect() : null; // fixed の要素は offsetParent が null なので大きさで判定
    if (r?.width) {
      const right = Math.round(innerWidth - r.left + 8) + 'px', bottom = Math.round(innerHeight - r.bottom + (r.height - b.offsetHeight) / 2) + 'px';
      if (b.style.right !== right) b.style.right = right;
      if (b.style.bottom !== bottom) b.style.bottom = bottom;
    } else { b.style.right = ''; b.style.bottom = ''; }
  }

  // 再生リスト・ミックス（束ねたサムネ）。ミックス・ステーションは最初の動画＋リストIDで「後で見る」に入れられる
  const COLL_SEL = 'yt-collection-thumbnail-view-model, ytd-playlist-thumbnail, a[href^="/playlist"]';
  const listIdOf = item => {
    const a = item.querySelector('a[href*="list="]');
    return (a?.getAttribute('href') || '').match(/[?&]list=([\w-]+)/)?.[1] || '';
  };
  const isShortItem = item => item.matches('ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, ytd-reel-item-renderer') || !!item.querySelector('ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, a[href^="/shorts/"]');
  const META_SEL = 'yt-lockup-metadata-view-model, [class*="lockup-metadata" i], #meta, #details';
  // チャンネル別の設定（chSet: { チャンネルキー: { s: 冒頭スキップ秒, e: 最後スキップ秒, mid: サムネを動画の途中の画面に } }）
  let chSet = {};
  chrome.storage.local.get('chSet').then(r => { chSet = r.chSet || {}; });
  chrome.storage.onChanged.addListener(ch => { if (ch.chSet) { chSet = ch.chSet.newValue || {}; document.querySelectorAll('[data-tg-sig]').forEach(e => delete e.dataset.tgSig); markVideos(); } });
  // サムネを動画の途中の画面（YouTubeが自動で作る mq2＝真ん中あたりのコマ）に差し替える。設定を外したら元に戻す
  function midThumbs() {
    for (const item of document.querySelectorAll('[data-tg-mid]')) {
      const v = item.dataset.tgMid;
      for (const img of item.querySelectorAll('ytd-thumbnail img, yt-thumbnail-view-model img, a#thumbnail img, .yt-core-image')) {
        if (v === '-') { if (img.dataset.tgOrig) { img.src = img.dataset.tgOrig; delete img.dataset.tgOrig; } continue; }
        if (!img.src || img.src.includes('/mq2.jpg') || img.closest('#avatar, yt-avatar-shape, yt-decorated-avatar-view-model')) continue;
        img.dataset.tgOrig = img.src;
        img.removeAttribute('srcset');
        img.src = `https://i.ytimg.com/vi/${v}/mq2.jpg`;
      }
      if (v === '-') delete item.dataset.tgMid;
    }
  }
  function markVideos() {
    if (!favSet.size) return; // まだ登録チャンネルを読み込んでいない
    const app = document.querySelector('ytd-app');
    if (!app) return;
    for (const item of app.querySelectorAll(ITEM_SEL)) {
      const sigNow = itemSig(item);
      // 処理済みでも、YouTubeが中身を描き直して枠や🕒が消えていたらやり直す
      if (item.dataset.tgSig === sigNow && decoOk(item)) continue;
      if (item.closest('#tg-feed, #tg-hf-list')) continue;
      item.dataset.tgSig = sigNow;
      item.dataset.tgNeed = '';
      const coll = !!item.querySelector(COLL_SEL);
      const lvid = videoIdOf(item);
      if (coll) {
        // ミックス・再生リスト：枠は付けず、動画があるものだけ🕒
        if (item.dataset.tgfav) delete item.dataset.tgfav;
        if (item.parentElement?.closest(ITEM_SEL) || !lvid) continue;
        placeRow(item, null, [], null, lvid, listIdOf(item));
        continue;
      }
      const links = [...item.querySelectorAll(CH_LINK_SEL)];
      let key = links.length ? TG.channelKey(links[0].getAttribute('href')) : null;
      let byName = null;
      if (!key) {
        byName = nameEl(item);
        const nm = normName(byName?.textContent);
        if (nm) key = nameMap.get(nm) || null;
        if (!key) {
          // 名前で見つからない／名前が無い → 動画IDからチャンネルを調べる
          if (lvid) {
            if (vidOwner.has(lvid)) key = ownerKey(vidOwner.get(lvid)) || (nm ? '__other' : null); // 調べても分からない＝登録外として赤枠
            else { lookupOwner(lvid); delete item.dataset.tgSig; } // 判別できたら後でもう一度
          }
          if (!key && nm && !lvid) key = '__other';
        }
      }
      const val = key ? (favSet.has(key) ? '1' : '0') : '';
      if ((item.dataset.tgfav || '') !== val) {
        if (val) item.dataset.tgfav = val;
        else delete item.dataset.tgfav;
      }
      if (val) frameTarget(item);
      if (val && item.querySelector(THUMB_SEL)) item.dataset.tgNeed += 'f';
      // 集中モード：見えないチャンネルの動画はぼかして押せなくする
      let lk = false;
      if (FST.active && FOCUS.hideHome && (key || item.dataset.tgSig)) {
        const fs = key && key !== '__other' ? fMap.get(key) : null;
        lk = TG.channelLocked(FOCUS, S.folders, fs || (key && key !== '__other' && favSet.has(key) ? [] : null));
      }
      if (lk) item.dataset.tglock = '1'; else if (item.dataset.tglock) delete item.dataset.tglock;
      const mid = key && lvid && !isShortItem(item) && chSet[key]?.mid;
      if (mid) item.dataset.tgMid = lvid; else if (item.dataset.tgMid) item.dataset.tgMid = '-';
      if (item.parentElement?.closest(ITEM_SEL)) continue; // 入れ子は外側だけ
      placeRow(item, key, links, byName, lvid, '');
    }
    midThumbs();
  }
  // チャンネル名の下に「🕒＋フォルダ名」の行。置き場所が無いもの（ショート等）はサムネの左上に🕒
  function placeRow(item, key, links, byName, lvid, list) {
    const folders = key ? fMap.get(key) || [] : [];
    const short = isShortItem(item);
    // 🕒（後で見る）：どの画面でもサムネの左下
    if (lvid) {
      const osig = lvid + '|' + list;
      const cur = item.querySelector('.tg-lov');
      if (cur && cur.dataset.sig === osig) item.dataset.tgNeed += 'o';
      else {
        cur?.remove();
        const t = item.querySelector(THUMB_SEL) || item.querySelector('a[href*="/shorts/"], a[href*="watch?v="]');
        if (t) {
          if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
          const b = laterBtn(lvid, list, short);
          b.classList.add('tg-lov');
          b.dataset.sig = osig;
          t.appendChild(b);
          item.dataset.tgNeed += 'o';
        }
      }
    } else item.querySelector('.tg-lov')?.remove();
    // フォルダ名：チャンネル名の下の1行
    const sig = folders.map(f => f.id + f.name + f.color).join('|');
    const cur = item.querySelector('.tg-ftags');
    if (cur && cur.dataset.sig === sig) { item.dataset.tgNeed += 'r'; return; }
    cur?.remove();
    if (!folders.length || short) return;
    let anchor = byName, append = null;
    if (!anchor) {
      const nameLink = links.find(l => l.textContent.trim() && !l.closest('#avatar, #avatar-link, yt-decorated-avatar-view-model'));
      anchor = nameLink ? nameLink.closest('ytd-channel-name') || nameLink : nameEl(item);
    }
    if (anchor) {
      // チャンネル名の「行」の直後に専用の1行として入れる（同じ行だと幅が足りず切れる）
      const ROW_SEL = '[class*="metadata-row" i], [class*="metadatarow" i], #byline-container, #channel-info, ytd-channel-name';
      const row = anchor.closest(ROW_SEL);
      if (row && item.contains(row)) anchor = row.closest('#channel-info') || row;
    } else append = item.querySelector(META_SEL); // 名前が見つからない形式（音楽・ステーション等）は情報欄の最後に
    if (!anchor && !append) return;
    const span = document.createElement('div');
    span.className = 'tg-ftags tg-ftags-row';
    span.dataset.sig = sig;
    folders.forEach(f => {
      const t = document.createElement('span');
      t.className = 'tg-ftag';
      t.style.setProperty('--c', f.color);
      t.textContent = f.name;
      span.appendChild(t);
    });
    if (anchor) anchor.insertAdjacentElement('afterend', span);
    else append.appendChild(span);
    item.dataset.tgNeed += 'r';
  }
  function decoOk(item) {
    const n = item.dataset.tgNeed || '';
    if (n.includes('f')) {
      const t = item.querySelector(THUMB_SEL);
      if (t && !t.classList.contains('tg-fr')) return false;
    }
    if (n.includes('r') && !item.querySelector('.tg-ftags')) return false;
    if (n.includes('o') && !item.querySelector('.tg-lov')) return false;
    return true;
  }

  // ---------- ホームの列数（動画 / ショート別） ----------
  function applyHomeCols() {
    let st = document.getElementById('tg-homecols');
    if (!st) {
      st = document.createElement('style');
      st.id = 'tg-homecols';
      document.documentElement.appendChild(st);
    }
    const H = 'ytd-browse[page-subtype="home"]';
    const C = 'ytd-browse[page-subtype="channels"]';
    let css = '';
    // チャンネルのページ（動画・ライブ・ショートの一覧）：ホームの列数を使う
    if (S.homeCols) css += `${C} ytd-rich-grid-renderer { --ytd-rich-grid-items-per-row: ${S.homeCols} !important; }
        ${C} ytd-rich-grid-row, ${C} ytd-rich-grid-row > #contents { display: contents !important; }`;
    if (S.homeShortCols) css += `${C} ytd-rich-grid-renderer { --ytd-rich-grid-slim-items-per-row: ${S.homeShortCols} !important; }`;
    if (S.homeCols) {
      const N = S.homeCols, SH = `${H} ytd-rich-shelf-renderer:not([is-shorts])`;
      css += `${H} ytd-rich-grid-renderer { --ytd-rich-grid-items-per-row: ${N} !important; }
        ${H} ytd-rich-grid-row, ${H} ytd-rich-grid-row > #contents { display: contents !important; }
        /* トップニュース・その他のトピックなどの動画の棚も、動画の列数で並べる（たたまれていても先頭の ${N} 本は出す） */
        ${SH} #contents { display: grid !important; grid-template-columns: repeat(${N}, minmax(0, 1fr)) !important; column-gap: 16px !important; }
        ${SH} #contents > ytd-rich-item-renderer { width: auto !important; max-width: none !important; min-width: 0 !important; margin-left: 0 !important; margin-right: 0 !important; }
        ${SH} #contents > ytd-rich-item-renderer:nth-child(-n+${N}) { display: block !important; }`;
    }
    css += searchColsCss();
    if (st.textContent !== css) st.textContent = css;
    renderHomeTool();
    document.querySelectorAll('[data-tg-memo]').forEach(e => delete e.dataset.tgMemo);
    layoutHome();
  }

  // ---------- 検索結果の列数（動画は新着動画のようなカード、ショートは横に並べる） ----------
  function searchColsCss() {
    const R = 'ytd-search';
    let css = '';
    const N = S.searchCols, M = S.searchShortCols;
    if (N) {
      css += `
      ${R} ytd-two-column-search-results-renderer, ${R} #container.ytd-search, ${R} ytd-two-column-search-results-renderer #primary { max-width: none !important; width: 100% !important; }
      ${R} ytd-two-column-search-results-renderer #secondary { display: none !important; }
      /* 下へスクロールして読み込んだ続きは別のまとまり（セクション）になるので、まとまりごとに区切らず全体で1つの並びにする */
      ${R} ytd-section-list-renderer > #contents {
        display: grid !important; grid-template-columns: repeat(${N}, minmax(0, 1fr)); gap: 24px 16px; align-items: start; }
      ${R} ytd-section-list-renderer > #contents > ytd-item-section-renderer, ${R} ytd-section-list-renderer > #contents > ytd-item-section-renderer > #contents { display: contents !important; }
      ${R} ytd-section-list-renderer > #contents > :not(ytd-item-section-renderer), ${R} ytd-section-list-renderer > #contents > ytd-item-section-renderer > :not(#contents) { grid-column: 1 / -1; min-width: 0; }
      /* 「〇〇の他の人はこちらも視聴しています」などの縦の棚も、中の動画を同じ並びに混ぜる（見出しは横いっぱい） */
      ${R} ytd-item-section-renderer > #contents > ytd-shelf-renderer, ${R} ytd-shelf-renderer #dismissible, ${R} ytd-shelf-renderer > #dismissible > #contents,
      ${R} ytd-shelf-renderer ytd-vertical-list-renderer, ${R} ytd-shelf-renderer ytd-vertical-list-renderer > #items { display: contents !important; }
      ${R} ytd-shelf-renderer #dismissible > :not(#contents), ${R} ytd-shelf-renderer ytd-vertical-list-renderer > :not(#items) { grid-column: 1 / -1; min-width: 0; }
      /* 1本ずつの枠：列の幅からはみ出さない（文字の重なりを防ぐ） */
      ${R} :is(ytd-video-renderer, yt-lockup-view-model, ytd-movie-renderer) { min-width: 0 !important; max-width: 100% !important; width: auto !important; overflow: hidden; }
      ${R} yt-lockup-view-model .yt-lockup-metadata-view-model__text-container, ${R} yt-lockup-view-model .yt-lockup-view-model__metadata { min-width: 0 !important; }
      ${R} yt-lockup-view-model [class*="description" i], ${R} ytd-video-renderer #description-text { display: none !important; }
      ${R} ytd-vertical-list-renderer #items {
        display: grid !important; grid-template-columns: repeat(${N}, minmax(0, 1fr)); gap: 24px 16px; align-items: start; }
      ${R} ytd-item-section-renderer > #contents > *:not(ytd-video-renderer):not(yt-lockup-view-model):not(ytd-movie-renderer) { grid-column: 1 / -1; min-width: 0; }
      ${R} ytd-item-section-renderer > #contents > ytd-video-renderer, ${R} ytd-vertical-list-renderer #items > ytd-video-renderer { margin: 0 !important; max-width: none !important; min-width: 0; }
      ${R} ytd-video-renderer #dismissible { flex-direction: column !important; }
      ${R} ytd-video-renderer ytd-thumbnail.ytd-video-renderer, ${R} ytd-video-renderer ytd-thumbnail { width: 100% !important; max-width: none !important; min-width: 0 !important; flex: none !important; margin: 0 0 10px !important; }
      ${R} ytd-video-renderer ytd-thumbnail #thumbnail { border-radius: 12px; }
      ${R} ytd-video-renderer .text-wrapper { max-width: none !important; padding: 0 !important; }
      ${R} ytd-video-renderer #video-title { font-size: 15px !important; line-height: 21px !important; max-height: 42px !important; -webkit-line-clamp: 2 !important; }
      ${R} ytd-video-renderer #title-wrapper h3 { margin: 0 !important; }
      ${R} ytd-video-renderer #channel-info { margin: 4px 0 0 !important; padding: 0 !important; }
      ${R} ytd-video-renderer #channel-info #avatar { display: none !important; }
      ${R} ytd-video-renderer .metadata-snippet-container, ${R} ytd-video-renderer #description-text, ${R} ytd-video-renderer ytd-badge-supported-renderer.ytd-video-renderer:not([system-icons]) { display: none !important; }
      ${R} ytd-video-renderer #expandable-metadata { display: none !important; }
      ${R} ytd-item-section-renderer > #contents > yt-lockup-view-model .yt-lockup-view-model--horizontal, ${R} ytd-item-section-renderer > #contents > yt-lockup-view-model > div { flex-direction: column !important; }
      ${R} ytd-item-section-renderer > #contents > yt-lockup-view-model .yt-lockup-view-model__content-image { width: 100% !important; max-width: none !important; margin: 0 0 10px !important; }`;
    }
    if (M) {
      css += `
      ${R} ytd-reel-shelf-renderer yt-horizontal-list-renderer #items, ${R} grid-shelf-view-model .ytGridShelfViewModelGridShelfRow {
        display: grid !important; grid-template-columns: repeat(${M}, minmax(0, 1fr)) !important; gap: 16px 12px !important; transform: none !important; width: auto !important; }
      ${R} ytd-reel-shelf-renderer yt-horizontal-list-renderer #items > *, ${R} grid-shelf-view-model .ytGridShelfViewModelGridShelfItem {
        width: auto !important; min-width: 0 !important; max-width: none !important; margin: 0 !important; }
      ${R} ytd-reel-shelf-renderer yt-horizontal-list-renderer #left-arrow, ${R} ytd-reel-shelf-renderer yt-horizontal-list-renderer #right-arrow { display: none !important; }
      ${R} ytd-reel-shelf-renderer yt-horizontal-list-renderer #scroll-container { overflow: visible !important; }`;
    }
    return css;
  }

  // 拡張機能が上書きしたスタイルだけを記録し、「自動」に戻すときはYouTube自身の値に戻す
  const setStyle = (el, prop, val) => {
    const k = 'tgs' + prop.replace(/[^a-z]/gi, '');
    if (val === '' || val == null) {
      if (k in el.dataset) {
        const orig = el.dataset[k];
        if (orig) el.style.setProperty(prop, orig); else el.style.removeProperty(prop);
        delete el.dataset[k];
      }
      return;
    }
    if (!(k in el.dataset)) el.dataset[k] = el.style.getPropertyValue(prop) || '';
    if (el.style.getPropertyValue(prop) !== String(val) || el.style.getPropertyPriority(prop) !== 'important') {
      el.style.setProperty(prop, String(val), 'important');
    }
  };

  // YouTubeは自分の列数ごとにショート棚を差し込むので、指定列数で行が埋まってから棚が来るよう並べ替える
  function layoutHome() {
    if (location.pathname !== '/') return;
    const browse = document.querySelector('ytd-browse[page-subtype="home"]');
    const grid = browse?.querySelector('ytd-rich-grid-renderer');
    const contents = grid?.querySelector('#contents');
    if (!contents) return;
    const N = S.homeCols;
    // 動画の数・設定が変わっていなければやり直さない
    const memo = `${contents.childElementCount}|${N}|${S.homeShortCols}|${browse.querySelectorAll('ytd-rich-shelf-renderer #contents > ytd-rich-item-renderer').length}`;
    if (contents.dataset.tgMemo === memo) return;
    contents.dataset.tgMemo = memo;
    const kids = [...contents.querySelectorAll('ytd-rich-item-renderer, ytd-rich-section-renderer, ytd-continuation-item-renderer')]
      .filter(e => !e.parentElement.closest('ytd-rich-section-renderer'));
    let pos = 0, n = 0;
    const pending = [];
    for (const el of kids) {
      if (!N) { setStyle(el, 'order', ''); continue; }
      if (el.tagName === 'YTD-RICH-SECTION-RENDERER') { pending.push(el); continue; }
      if (el.tagName === 'YTD-CONTINUATION-ITEM-RENDERER') { setStyle(el, 'order', 999999); continue; }
      setStyle(el, 'order', pos++);
      if (!el.hidden && !el.hasAttribute('hidden') && ++n % N === 0) {
        pending.forEach(sec => setStyle(sec, 'order', pos++));
        pending.length = 0;
      }
    }
    pending.forEach(sec => setStyle(sec, 'order', pos++));

    // 棚（ショート＝ショートの列数、「その他のトピック」などの動画の棚＝動画の列数）：
    // 届いている本数より多い列数だと空欄になるので、本数に合わせて詰める
    browse.querySelectorAll('ytd-rich-shelf-renderer').forEach(shelf => {
      const M = shelf.hasAttribute('is-shorts') ? S.homeShortCols : S.homeCols;
      const items = [...shelf.querySelectorAll('#contents > ytd-rich-item-renderer')];
      // 届いている本数が足りなければ、棚の「もっと見る」を1回だけ押して追加分を読み込ませる
      if (M && items.length < M && !shelf.dataset.tgExpanded) {
        const btn = [...shelf.querySelectorAll('#show-more-button button, [id*="show-more" i] button, button')]
          .find(b => /もっと見る|show more|さらに表示/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent));
        if (btn) { shelf.dataset.tgExpanded = '1'; btn.click(); }
      }
      const eff = M ? Math.max(1, Math.min(M, items.length)) : '';
      setStyle(shelf, '--ytd-rich-grid-slim-items-per-row', eff);
      setStyle(shelf, '--ytd-rich-grid-items-per-row', eff);
      setStyle(shelf, '--ytd-rich-shelf-items-count', eff);
      // 動画の棚（トップニュース・その他のトピックなど）は CSS のグリッドで列数を決める（applyHomeCols）。ショートの棚だけ本数で詰める
      if (shelf.hasAttribute('is-shorts')) items.forEach((it, i) => setStyle(it, 'display', M ? (i < eff ? 'block' : 'none') : ''));
      else items.forEach(it => setStyle(it, 'display', ''));
    });
  }

  // ---------- 履歴オフ（視聴履歴を踏まえずに、ホーム・おすすめの一覧を探す）・おすすめのリセット ----------
  //   noHist: true のあいだ
  //   ・ホーム：YouTube のおすすめ（視聴履歴から作られる）の代わりに、TubeFolio が視聴履歴を使わずに探した一覧を出す
  //   ・おすすめ：YouTube のおすすめ・見た動画・視聴時間の重み付けを使わず、フォルダのキーワード検索（ログインしない状態）と
  //     登録チャンネルの新着の関連動画から探す
  //   （以前の「一時的に視聴履歴に残さない」機能は廃止。古い設定 histOff は片付ける）
  let NH = false;
  const histOn = () => NH;
  chrome.storage.local.get(['noHist', 'histOff']).then(r => {
    NH = !!r.noHist; S.noHist = NH;
    if (r.histOff) chrome.storage.local.remove('histOff');
    renderHomeTool(); homeFeed();
  });
  chrome.storage.onChanged.addListener(ch => {
    if (!ch.noHist) return;
    NH = !!ch.noHist.newValue; S.noHist = NH;
    renderHomeTool(); homeFeed(true);
    const bar = document.getElementById('tg-bar');
    if (bar && S.feedType === 'rec') { buildBar(bar); if (isSubsFeed()) { window.scrollTo({ top: 0 }); TGFeed.refresh(S, { force: true }); } }
  });
  const histLabel = () => histOn() ? '🕶 履歴オフ中' : '🕶 履歴オフ';
  const HIST_TITLE = '視聴履歴を踏まえずに、ホーム・おすすめの動画を探す（押すたびにオン／オフ）';
  // ---------- ホーム：YouTube の「すべて・音楽・ニュース…」の段の左に、TubeFolio のツール（新着〜ブックマーク）を並べる ----------
  //   YouTube の段は上に貼り付いたまま残るので、下へスクロールしてもツールは消えない
  function homeTypes() {
    const browse = document.querySelector('ytd-browse[page-subtype="home"]');
    let seg = document.getElementById('tg-hometypes');
    if (location.pathname !== '/' || !browse) { seg?.remove(); htBar?.classList.remove('tg-types-bar'); htBar?.style.removeProperty('padding-left'); htBar = null; return; }
    // 見えている「すべて」のチップを探し、その横スクロールの入れ物の左にツールを差し込む
    //   （YouTube の部品の名前は変わることがあるので、チップそのものから辿る）
    const okChip = c => !c.closest('#tg-hometypes, #tg-bar, #tg-feed, #tg-manager, #left-arrow, #right-arrow') && c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().top < 260;
    const chip = [...document.querySelectorAll('yt-chip-cloud-chip-renderer, chip-view-model, [class*="ChipCloudChip"]')].find(okChip)
      || [...document.querySelectorAll('ytd-feed-filter-chip-bar-renderer button')].find(okChip) || null;
    // チップの段（YouTube の部品まるごと：‹ › の矢印も含む）。ツールはその左に、段の外側に置く
    // YouTube の段のうち、画面の上に固定されている部品（#chips-wrapper）。ツールはこれに付いていく
    const chipBar = chip && (chip.closest('#chips-wrapper') || chip.closest('ytd-feed-filter-chip-bar-renderer, chip-bar-view-model, yt-chip-cloud-renderer') || chip.parentElement?.parentElement);
    const primary = browse.querySelector('#primary');
    if (!seg) {
      seg = document.createElement('div');
      seg.id = 'tg-hometypes';
      seg.className = 'tg-seg';
      seg.addEventListener('click', async e => {
        const b = e.target.closest('[data-type]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        S.feedType = b.dataset.type;
        await chrome.storage.local.set({ feedType: S.feedType });
        goSubs();
      });
      ['mousedown', 'pointerdown'].forEach(t => seg.addEventListener(t, e => e.stopPropagation()));
    }
    const html = Object.entries(TGFeed.TYPES).filter(([, d]) => !d.hidden).map(([t, d]) => `<button class="tg-seg-btn" data-type="${t}">${esc(d.short || d.label)}</button>`).join('');
    if (seg.dataset.html !== html) { seg.innerHTML = html; seg.dataset.html = html; }
    if (chipBar) {
      // ツールは画面に固定して、YouTube の段の左側の余白（段に付けた左の余白）の上に重ねる。
      // 段は下へスクロールすると画面の上に貼り付くので、毎回その位置に合わせる（placeHomeTypes）
      if (seg.parentElement !== document.body) document.body.appendChild(seg);
      if (htBar !== chipBar) {
        htBar?.classList.remove('tg-types-bar'); htBar?.style.removeProperty('padding-left');
        document.querySelectorAll('.tg-types-bar').forEach(e => { e.classList.remove('tg-types-bar'); e.style.removeProperty('padding-left'); }); // 前の版で外側に付けた余白
        htBar = chipBar;
        chipBar.classList.add('tg-types-bar');
        setTimeout(checkHomeTypes, 600);
      }
      seg.classList.add('tg-ht-float');
      placeHomeTypes();
    } else if (primary && seg.parentElement !== primary) {
      seg.classList.remove('tg-ht-float'); seg.style.cssText = '';
      primary.prepend(seg); // 段が無いとき（読み込み中など）は一番上に
    }
    // 登録チャンネル画面のツール・一覧も同じ左端にするため、#primary の左端からの距離を覚えておく
    const sl = seg.getBoundingClientRect().left;
    if (primary && seg.getBoundingClientRect().width) {
      const off = Math.round(sl - primary.getBoundingClientRect().left);
      if (off >= 0 && off < 200 && off !== chipOff) { chipOff = off; try { localStorage.setItem('tgChipOff', String(off)); } catch { /* なし */ } layoutBar(); }
    }
  }

  let htBar = null, htRaf = 0;
  function placeHomeTypes() {
    htRaf = 0;
    const seg = document.getElementById('tg-hometypes');
    if (!seg || !htBar || !seg.classList.contains('tg-ht-float')) return;
    if (location.pathname !== '/' || !htBar.isConnected) { seg.style.visibility = 'hidden'; return; }
    const r = htBar.getBoundingClientRect();
    // ツールの左端：動画の一覧（バナー・サムネ）の左端にそろえる（段の左端はそれより左にはみ出しているため）
    const first = document.querySelector('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer > #contents > :is(ytd-rich-item-renderer, ytd-rich-section-renderer):not([hidden])');
    const fl = first?.getBoundingClientRect().left;
    const left = fl && fl > r.left && fl - r.left < 200 ? fl : r.left;
    const sw = Math.ceil(left - r.left + seg.getBoundingClientRect().width) + 12;
    // 固定されている段の中に、ツールの幅ぶんの左余白を作る。幅は変えないので画面からはみ出さず、
    // YouTube の ‹ › と横スクロールは残りの部分（チップの欄）の中だけで動く
    if (Math.abs((parseFloat(htBar.style.paddingLeft) || 0) - sw) > 1) {
      htBar.style.setProperty('padding-left', sw + 'px', 'important');
      htBar.style.setProperty('box-sizing', 'border-box', 'important');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 30); // ‹ › の要否を計算し直させる
    }
    const cs = getComputedStyle(htBar);
    const hidden = !r.height || r.bottom <= 0 || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0;
    seg.style.visibility = hidden ? 'hidden' : '';
    seg.style.left = Math.round(left) + 'px';
    seg.style.top = Math.round(r.top + (r.height - seg.offsetHeight) / 2) + 'px';
  }
  const placeHTSoon = () => { if (!htRaf) htRaf = requestAnimationFrame(placeHomeTypes); };
  window.addEventListener('scroll', placeHTSoon, { passive: true });
  window.addEventListener('resize', placeHTSoon);
  setInterval(() => { if (location.pathname === '/') placeHomeTypes(); else { const s2 = document.getElementById('tg-hometypes'); if (s2) s2.style.visibility = 'hidden'; } }, 400);

  // ツールがほかの物（上に重なる半透明の帯など）に隠れていないか確かめ、隠れていたら手前に出す。様子は動作ログに残す
  let htLogged = false;
  function checkHomeTypes() {
    const seg = document.getElementById('tg-hometypes');
    if (!seg) return;
    const r = seg.getBoundingClientRect();
    const desc = el => { const out = []; for (let e = el, i = 0; e && e !== document.body && i < 7; e = e.parentElement, i++) out.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '')); return out.join(' < '); };
    const hit = r.width ? document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2) : null;
    const covered = !!hit && !seg.contains(hit);
    void covered; // 重なりは記録だけ（手前に出すと検索の候補に重なるため）
    if (!htLogged || covered) {
      htLogged = true;
      TG.log('ホームのツール', `置き場所：${desc(seg.parentElement)}／大きさ ${Math.round(r.width)}×${Math.round(r.height)}（x=${Math.round(r.left)}, y=${Math.round(r.top)}）${covered ? `／上に重なっていた物：${desc(hit)}（手前に出しました）` : '／表示OK'}`, covered ? 'warn' : 'info');
    }
  }

  // 履歴オフ中のホーム：YouTube のおすすめ（視聴履歴から作られる）を隠し、視聴履歴を使わずに探した一覧を出す
  let homeFeedOn = false, needSubsRebuild = false;
  const homeS = () => ({ ...S, feedType: 'rec', recMode: 'rec', recKind: 'video', noHist: true, cols: S.homeCols || S.cols });
  function homeFeed(force = false) {
    const browse = document.querySelector('ytd-browse[page-subtype="home"]');
    let box = document.getElementById('tg-homefeed');
    if (location.pathname !== '/' || !NH || !browse) {
      box?.remove();
      browse?.classList.remove('tg-home-nohist');
      if (homeFeedOn) { homeFeedOn = false; needSubsRebuild = true; } // 登録チャンネル画面の一覧は作り直す
      return;
    }
    const host = browse.querySelector('ytd-rich-grid-renderer')?.parentElement || browse.querySelector('#primary');
    if (!host) return;
    browse.classList.add('tg-home-nohist');
    if (!box) {
      box = document.createElement('div');
      box.id = 'tg-homefeed';
      box.innerHTML = `<div class="tg-hf-head">🕶 履歴オフ中<small>視聴履歴を使わずに探したおすすめ（登録していないチャンネル）</small><button class="tg-chip tg-ghost" data-hf-reload="1">更新</button></div><div id="tg-hf-list"></div>`;
      box.addEventListener('click', e => { if (e.target.closest('[data-hf-reload]')) { window.scrollTo({ top: 0 }); TGFeed.refresh(homeS(), { force: true }); } });
      homeFeedOn = false;
    }
    if (box.parentElement !== host) host.prepend(box);
    if (!homeFeedOn || force) {
      homeFeedOn = true;
      needSubsRebuild = true;
      TGFeed.mount(box.querySelector('#tg-hf-list'));
      TGFeed.refresh(homeS(), { force });
    }
  }

  function tgDialog(html, onClick) {
    document.getElementById('tg-dlg')?.remove();
    const d = document.createElement('div');
    d.id = 'tg-dlg';
    d.innerHTML = `<div class="tg-dlg-box">${html}<button class="tg-dlg-x" data-x="1">✕</button></div>`;
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-x]')) { d.remove(); return; }
      const b = e.target.closest('button[data-a]');
      if (b) onClick(b.dataset.a, d);
    });
    document.body.appendChild(d);
  }
  function histMenu() {
    const on = !histOn();
    chrome.storage.local.set({ noHist: on });
    TG.log('履歴オフ', on ? 'ホーム・おすすめを視聴履歴を使わずに探す' : 'ホーム・おすすめを元に戻しました');
    toastMsg(on ? '🕶 ホーム・おすすめを、視聴履歴を使わずに探します' : '🕶 ホーム・おすすめを元に戻しました');
  }
  function recReset() {
    tgDialog(`<div class="tg-dlg-t">↺ おすすめをリセット</div>
      <div class="tg-dlg-opt"><b>TubeFolioのおすすめ</b><p>これまでに出したおすすめの記録を消して、まっさらな状態から出し直します。</p><button data-a="tf">TubeFolioのおすすめをリセット</button></div>
      <div class="tg-dlg-opt"><b>YouTubeのおすすめ</b><p>YouTubeのおすすめは、再生履歴と検索履歴から作られています。履歴の画面で「すべての再生履歴を削除」（必要なら検索履歴も）を押すと、おすすめがリセットされます。これはGoogleアカウントの操作なので、ご自身で押してください（元に戻せません）。</p><button data-a="yt">YouTubeの履歴の画面を開く</button></div>
      <div class="tg-dlg-opt"><b>履歴を使わずに探す</b><p>ホーム・おすすめの一覧を、視聴履歴を踏まえずに探すこともできます。</p><button data-a="off">🕶 履歴オフにする</button></div>`, async (a, d) => {
      if (a === 'tf') {
        await chrome.storage.local.remove(['recSeen']);
        TG.log('おすすめ', 'TubeFolioのおすすめの記録をリセット');
        d.remove(); toastMsg('↺ TubeFolioのおすすめをリセットしました');
        if (isSubsFeed() && S.feedType === 'rec') { window.scrollTo({ top: 0 }); TGFeed.refresh(S, { force: true }); }
      }
      if (a === 'yt') { d.remove(); window.open('https://www.youtube.com/feed/history', '_blank'); }
      if (a === 'off') { d.remove(); if (!histOn()) histMenu(); }
    });
  }
  function toastMsg(text) {
    document.getElementById('tg-mini-toast')?.remove();
    const t = document.createElement('div');
    t.id = 'tg-mini-toast'; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2500);
    setTimeout(() => t.remove(), 3100);
  }

  function renderHomeTool() {
    const isHome = location.pathname === '/', isSearch = location.pathname === '/results';
    const isCh = isChannelPage(); // チャンネルのページ（動画・ショートなどの一覧）もホームと同じ列数で
    const isSubs = isSubsFeed();
    let tool = document.getElementById('tg-hometool');
    if (!isHome && !isSearch && !isCh && !isSubs) { tool?.remove(); return; }
    if (!tool) {
      tool = document.createElement('div');
      tool.id = 'tg-hometool';
      tool.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.toggle) { tool.classList.toggle('open'); return; }
        if (b.dataset.hist) return histMenu();
        if (b.dataset.recreset) return recReset();
        if (b.dataset.chaosyt) return chaosYt();
        if (b.dataset.hsnd) return toggleHoverSound();
        if (b.dataset.disb) return toggleDisBadge();
        if (b.dataset.hidem) return toggleHideMembers();
        if (b.dataset.hidew) return toggleHideWatched();
        const v = b.dataset.v === '' ? null : +b.dataset.v;
        await chrome.storage.local.set({ [b.dataset.k]: v });
      });
      document.body.appendChild(tool);
    }
    const seg = (k, cur, list, auto = '自動') => list.map(n =>
      `<button class="tg-seg-btn ${(cur ?? '') === n ? 'tg-active' : ''}" data-k="${k}" data-v="${n}">${n === '' ? auto : n}</button>`).join('');
    const open = tool.classList.contains('open');
    const hs = hoverSoundOn();
    const dbBtn = `<button class="tg-ht-btn tg-ht-act ${disBadgeOn() ? 'on' : ''}" data-disb="1" title="サムネの右上に低評価の割合（Return YouTube Dislike の推定）を表示（押すとオン／オフ）">👎 低評価率</button>`;
    const hsBtn = `<button class="tg-ht-btn tg-ht-act ${hs ? 'on' : ''}" data-hsnd="1" title="${hs ? 'サムネに乗せたときのプレビューを音声ありで再生中（押すとオフ）' : 'プレビューは無音（押すと音声あり）'}">${hs ? '🔊' : '🔇'} プレビュー音声</button>`;
    const chPanel = `<div class="tg-ht-panel">
        <div class="tg-ht-title">ホーム・チャンネルのページ</div>
        <div class="tg-ht-row"><span>動画</span><div class="tg-seg">${seg('homeCols', S.homeCols, ['', 3, 4, 5, 6, 7])}</div></div>
        <div class="tg-ht-row"><span>ショート</span><div class="tg-seg">${seg('homeShortCols', S.homeShortCols, ['', 3, 4, 5, 6, 7])}</div></div>
      </div>`;
    const memBtn = `<button class="tg-ht-btn tg-ht-act ${S.hideMembers ? 'on' : ''}" data-hidem="1" title="メンバー限定の動画を一覧から隠す／表示する">🔒 ${S.hideMembers ? 'メンバー限定を表示' : 'メンバー限定を隠す'}</button>`;
    const subsRow = `<div class="tg-ht-main">${dbBtn}${memBtn}<button class="tg-ht-btn tg-ht-act ${S.hideWatched ? 'on' : ''}" data-hidew="1" title="90%以上見た動画を一覧から隠す／表示する">✓ ${S.hideWatched ? '視聴済みを表示' : '視聴済みを隠す'}</button>${hsBtn}</div>`;
    const html = isSubs ? subsRow : isCh && !isHome ? `<div class="tg-ht-main">${dbBtn}${memBtn}${hsBtn}<button class="tg-ht-btn" data-toggle="1" title="一覧の列数（ホームと共通）">${IC.grid}<span>列</span></button></div>${chPanel}`
      : isHome ? `<div class="tg-ht-main">${dbBtn}${hsBtn}<button class="tg-ht-btn tg-ht-act ${histOn() ? 'on' : ''}" data-hist="1" title="${HIST_TITLE}">${histLabel()}</button><button class="tg-ht-btn" data-toggle="1" title="ホームの列数">${IC.grid}<span>列</span></button></div>
      <div class="tg-ht-panel">
        <div class="tg-ht-row"><span>動画</span><div class="tg-seg">${seg('homeCols', S.homeCols, ['', 3, 4, 5, 6, 7])}</div></div>
        <div class="tg-ht-row"><span>ショート</span><div class="tg-seg">${seg('homeShortCols', S.homeShortCols, ['', 3, 4, 5, 6, 7])}</div></div>
      </div>` : `<div class="tg-ht-main">${dbBtn}${hsBtn}<button class="tg-ht-btn tg-ht-act" data-chaosyt="1" title="低評価の割合が高い順に並べ替える（Return YouTube Dislike の推定値）">🔥 賛否両論順</button><button class="tg-ht-btn" data-toggle="1" title="検索結果の列数">${IC.grid}<span>列</span></button></div>
      <div class="tg-ht-panel">
        <div class="tg-ht-title">検索結果</div>
        <div class="tg-ht-row"><span>動画</span><div class="tg-seg">${seg('searchCols', S.searchCols, ['', 2, 3, 4, 5, 6], 'リスト')}</div></div>
        <div class="tg-ht-row"><span>ショート</span><div class="tg-seg">${seg('searchShortCols', S.searchShortCols, ['', 4, 5, 6, 7, 8], '自動')}</div></div>
      </div>`;
    if (tool.dataset.html !== html) { tool.innerHTML = html; tool.dataset.html = html; }
    tool.classList.toggle('open', open);
    tool.classList.toggle('tg-ht-ch', isCh && !isHome); // 右下の 📁＋ ボタンと重ならないように
  }

  // ---------- チャンネル/動画ページ：フォルダ追加ボタン ----------
  // ページ上のキー（@ハンドル等）→ 保存済みのチャンネルのキー。チャンネルIDで照合する
  const canon = new Map(); // ページのキー → { key, id }
  function canonOf(pageKey) {
    if (S.channels[pageKey]) return { key: pageKey, id: S.channels[pageKey].id };
    const c = canon.get(pageKey);
    if (c) {
      const hit = c.id && Object.values(S.channels).find(x => x.id === c.id);
      return { key: hit ? hit.key : pageKey, id: c.id };
    }
    return null;
  }
  const resolving = new Set();
  async function resolveCanon(pageKey) {
    if (canon.has(pageKey) || resolving.has(pageKey)) return;
    resolving.add(pageKey);
    let id = pageKey.startsWith('channel/') ? pageKey.slice(8) : null;
    try { if (!id) id = await YTAPI.resolveId(pageKey); } catch { /* 取れなければキーのまま */ }
    canon.set(pageKey, { id });
    resolving.delete(pageKey);
    renderFab();
    if (document.getElementById('tg-pop')) buildPopover();
  }

  function currentChannel() {
    const ch = rawChannel();
    if (!ch) return null;
    const c = canonOf(ch.key);
    if (!c) resolveCanon(ch.key);
    return { ...ch, pageKey: ch.key, key: c?.key || ch.key, id: c?.id || null, resolved: !!c };
  }

  function rawChannel() {
    if (isShortsPage()) {
      const box = document.querySelector('ytd-reel-video-renderer[is-active], ytd-shorts [is-active]') || document;
      const a = box.querySelector('a[href^="/@"], a[href^="/channel/"]');
      const key = a && TG.channelKey(a.getAttribute('href'));
      const name = (a?.textContent || '').trim().replace(/^@/, '') || key;
      const thumb = box.querySelector('img[src*="yt3."], yt-avatar-shape img')?.src || '';
      return key ? { key, name, thumb } : null;
    }
    if (isChannelPage()) {
      const key = TG.channelKey(location.pathname);
      const name =
        document.querySelector('#page-header h1, yt-dynamic-text-view-model h1, #channel-name #text')?.textContent?.trim() ||
        document.title.replace(/ - YouTube$/, '');
      const thumb = document.querySelector('#page-header yt-avatar-shape img, #avatar img')?.src || '';
      return key ? { key, name, thumb } : null;
    }
    if (isWatchPage()) {
      const a = document.querySelector('ytd-watch-metadata ytd-video-owner-renderer a[href], #owner ytd-channel-name a[href]');
      const key = a && TG.channelKey(a.getAttribute('href'));
      const name = document.querySelector('ytd-watch-metadata ytd-channel-name a, #owner ytd-channel-name a')?.textContent?.trim();
      const thumb = document.querySelector('ytd-watch-metadata #owner img, #owner #avatar img')?.src || '';
      return key ? { key, name: name || key, thumb } : null;
    }
    return null;
  }

  // ホームなど一覧のページの右下：サムネに乗せたときのプレビューの音声 オン／オフ
  async function toggleHoverSound() {
    const { px = {} } = await chrome.storage.local.get('px');
    px.hoverSound = px.hoverSound === false;
    await chrome.storage.local.set({ px, prefsAt: Date.now() });
    toastMsg(px.hoverSound ? '🔊 プレビューの音声をオンにしました' : '🔇 プレビューの音声をオフにしました');
  }
  const hoverSoundOn = () => { try { return PXH.hoverSound !== false; } catch { return true; } };
  // 視聴済み・メンバー限定を隠す（登録チャンネル画面の右下のボタン）
  async function toggleHideWatched() {
    S.hideWatched = !S.hideWatched;
    await chrome.storage.local.set({ hideWatched: S.hideWatched });
    TGFeed.setHideWatched(S.hideWatched);
    renderHomeTool();
  }
  async function toggleHideMembers() {
    S.hideMembers = !S.hideMembers;
    await chrome.storage.local.set({ hideMembers: S.hideMembers });
    TGFeed.setHideMembers(S.hideMembers);
    renderHomeTool();
  }
  // 👎 一覧のサムネに低評価率を出す（xtra.js）
  async function toggleDisBadge() {
    const { px = {} } = await chrome.storage.local.get('px');
    px.disBadge = px.disBadge === false;
    await chrome.storage.local.set({ px, prefsAt: Date.now() });
    toastMsg(px.disBadge ? '👎 サムネに低評価率を表示します' : '👎 サムネの低評価率を消しました');
  }
  const disBadgeOn = () => { try { return PXH.disBadge !== false; } catch { return true; } };
  function renderHoverSoundBtn(show) {
    let b = document.getElementById('tg-hsnd');
    if (!show) { b?.remove(); return; }
    if (!b) {
      b = document.createElement('button');
      b.id = 'tg-hsnd';
      b.addEventListener('click', toggleHoverSound);
      document.body.appendChild(b);
    }
    const on = hoverSoundOn();
    const label = on ? '🔊 プレビュー音声' : '🔇 プレビュー音声';
    if (b.textContent !== label) b.textContent = label;
    b.title = on ? 'サムネに乗せたときのプレビューを音声ありで再生中（押すとオフ）' : 'プレビューは無音（押すと音声あり）';
    b.classList.toggle('on', on);
  }

  // ---------- 右上（アカウントのアイコンの右）：TubeFolio 全体の設定 ----------
  function renderMastGear() {
    const end = document.querySelector('ytd-masthead #end');
    if (!end) return;
    let b = document.getElementById('tg-mh-gear');
    if (!b) {
      b = document.createElement('button');
      b.id = 'tg-mh-gear';
      b.title = 'TubeFolio の設定（同期・通知・集中モード・振り分け・再生画面・視聴記録など。フォルダ設定もここから）';
      b.innerHTML = IC.gear;
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); TGManager.open('settings'); });
    }
    if (b.parentElement !== end || end.lastElementChild !== b) end.appendChild(b);
  }

  function renderFab() {
    renderMastGear();
    renderLaterFab();
    renderXlangBtn();
    renderHomeTool();
    renderHoverSoundBtn(!isChannelPage() && !isWatchPage() && !isShortsPage() && location.pathname !== '/' && location.pathname !== '/results' && !isSubsFeed() && location.hostname === 'www.youtube.com'); // ホーム・検索は右下のツールの列に入れる
    let fab = document.getElementById('tg-fab');
    if (!isChannelPage() && !isWatchPage() && !isShortsPage()) {
      fab?.remove();
      document.getElementById('tg-pop')?.remove();
      return;
    }
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'tg-fab';
      fab.title = 'このチャンネルをフォルダに追加';
      fab.addEventListener('click', togglePopover);
      document.body.appendChild(fab);
    }
    const ch = currentChannel();
    const count = ch ? S.folders.filter(f => f.keys.includes(ch.key)).length : 0;
    const label = count ? `📁 ${count}` : '📁＋';
    if (fab.textContent !== label) fab.textContent = label;
    fab.classList.toggle('tg-in', count > 0);
  }

  function togglePopover() {
    const pop = document.getElementById('tg-pop');
    if (pop) return pop.remove();
    buildPopover();
  }

  function buildPopover() {
    const ch = currentChannel();
    let pop = document.getElementById('tg-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'tg-pop';
      ['keydown', 'keyup', 'keypress'].forEach(t => pop.addEventListener(t, e => e.stopPropagation()));
      document.body.appendChild(pop);
    }
    pop.textContent = '';
    const title = document.createElement('div');
    title.className = 'tg-pop-title';
    title.textContent = ch ? ch.name : 'チャンネルを取得できませんでした';
    pop.appendChild(title);
    if (!ch) return;
    if (!ch.resolved) {
      const w = document.createElement('div');
      w.className = 'tg-pop-wait';
      w.textContent = 'チャンネルを確認中…';
      pop.appendChild(w);
      return;
    }

    TG.tree(S.folders).forEach(({ f, depth }) => {
      const row = document.createElement('label');
      row.className = 'tg-pop-row';
      row.style.paddingLeft = (2 + depth * 16) + 'px';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = f.keys.includes(ch.key);
      cb.addEventListener('change', () => toggleMembership(f.id, ch, cb.checked));
      const dot = document.createElement('span');
      dot.className = 'tg-dot';
      dot.style.background = f.color;
      const name = document.createElement('span');
      name.textContent = f.name;
      row.append(cb, dot, name);
      pop.appendChild(row);
    });

    const form = document.createElement('form');
    form.className = 'tg-pop-new';
    const input = document.createElement('input');
    input.placeholder = '新しいフォルダ名';
    const add = document.createElement('button');
    add.textContent = '作成';
    form.append(input, add);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const n = input.value.trim();
      if (!n) return;
      input.value = '';
      await TG.update(d => {
        const f = TG.newFolder(n, d.folders.length);
        f.keys.push(ch.key);
        d.folders.push(f);
        ensureChannel(d, ch);
      });
    });
    pop.appendChild(form);
  }

  function ensureChannel(d, ch) {
    const c = d.channels[ch.key];
    if (c) { if (!c.id && ch.id) c.id = ch.id; return; }
    d.channels[ch.key] = { key: ch.key, id: ch.id || null, name: ch.name, thumb: ch.thumb, hidden: false };
  }

  function toggleMembership(folderId, ch, on) {
    return TG.update(d => {
      const f = d.folders.find(x => x.id === folderId);
      if (!f) return false;
      f.keys = f.keys.filter(k => k !== ch.key && k !== ch.pageKey);
      if (on) f.keys.push(ch.key);
      ensureChannel(d, ch);
    });
  }

  // ---------- ポップアップからの「フォルダ設定を開く」 ----------
  async function checkOpenRequest() {
    if (document.visibilityState !== 'visible') return;
    const { openManager } = await chrome.storage.local.get('openManager');
    if (!openManager) return;
    await chrome.storage.local.remove('openManager');
    TGManager.open();
  }

  // ---------- ブックマーク：再生中に B キーで、その瞬間の時間を保存 ----------
  document.addEventListener('keydown', async e => {
    if (e.key !== 'b' && e.key !== 'B') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const v = isWatchPage() ? new URLSearchParams(location.search).get('v') : isShortsPage() ? location.pathname.split('/')[2] : null;
    const video = document.querySelector('#movie_player video, ytd-reel-video-renderer[is-active] video, video');
    if (!v || !video) return;
    e.preventDefault();
    e.stopPropagation();
    const sec = Math.floor(video.currentTime || 0);
    const ch = currentChannel();
    const title = (document.querySelector('ytd-watch-metadata h1, #title h1')?.textContent || document.title.replace(/ - YouTube$/, '')).trim();
    const shot = grabFrame(video); // その瞬間の画面（サムネ用・このPCだけに保存）
    const id = v + '@' + sec + '@' + Date.now().toString(36);
    const { bookmarks = [] } = await chrome.storage.local.get('bookmarks');
    bookmarks.unshift({ id, v, t: title, ch: ch?.name || '', k: ch?.key || '', sec, d: Math.round(video.duration || 0), at: Date.now() });
    await chrome.storage.local.set({ bookmarks: bookmarks.slice(0, 3000), ...(shot ? { ['bmt:' + id]: shot } : {}) });
    // 概要欄はあとから取得して書き足す
    YTAPI.videoText(v).then(async ({ desc }) => {
      if (!desc) return;
      const { bookmarks: bs = [] } = await chrome.storage.local.get('bookmarks');
      const b = bs.find(x => x.id === id);
      if (b) { b.desc = desc.slice(0, 1500); await chrome.storage.local.set({ bookmarks: bs }); }
    }).catch(() => {});
    const mm = s => (s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') : Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0');
    bmMemo(id, `🔖 ${mm(sec)} をブックマークしました`);
    TG.log('ブックマーク', `${title}（${mm(sec)}）`);
  }, true);
  // 1行メモ（Enterで保存・Escか空のままならメモなし）。動画はそのまま再生を続ける
  function bmMemo(id, msg) {
    document.getElementById('tg-bmtoast')?.remove();
    const d = document.createElement('div');
    d.id = 'tg-bmtoast';
    d.className = 'tg-bmmemo';
    d.innerHTML = `<div class="tg-bmm-h">${esc(msg)}</div><input class="tg-bmm-in" maxlength="120" placeholder="1行メモ（Enterで保存・Escでメモなし）">`;
    (document.querySelector('#movie_player') || document.body).appendChild(d);
    const inp = d.querySelector('input');
    let closed = false;
    const close = async save => {
      if (closed) return;
      closed = true;
      const note = inp.value.trim();
      if (save && note) {
        const { bookmarks = [] } = await chrome.storage.local.get('bookmarks');
        const b = bookmarks.find(x => x.id === id);
        if (b) { b.note = note; b.noteAt = Date.now(); await chrome.storage.local.set({ bookmarks }); }
        d.querySelector('.tg-bmm-h').textContent = '📝 メモを保存しました';
        inp.remove();
        setTimeout(() => d.classList.add('out'), 900);
        setTimeout(() => d.remove(), 1500);
      } else { d.classList.add('out'); setTimeout(() => d.remove(), 400); }
      document.querySelector('#movie_player')?.focus?.();
    };
    ['keydown', 'keyup', 'keypress'].forEach(t => inp.addEventListener(t, ev => {
      ev.stopPropagation();
      if (t !== 'keydown' || ev.isComposing) return;
      if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); close(false); }
    }));
    ['click', 'mousedown', 'dblclick'].forEach(t => d.addEventListener(t, ev => ev.stopPropagation()));
    inp.addEventListener('blur', () => setTimeout(() => close(true), 150));
    setTimeout(() => inp.focus(), 30);
    // 何も打たずに12秒たったら閉じる
    setTimeout(() => { if (!closed && !inp.value) close(false); }, 12000);
  }
  function grabFrame(video) {
    try {
      const w = 480, h = Math.round(w * (video.videoHeight / video.videoWidth || 9 / 16));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(video, 0, 0, w, h);
      const url = c.toDataURL('image/jpeg', 0.72);
      return url.length > 1000 ? url : null;
    } catch { return null; } // 取り込めない動画（保護されたもの）は通常のサムネ
  }
  function bmToast(msg) {
    document.getElementById('tg-bmtoast')?.remove();
    const d = document.createElement('div');
    d.id = 'tg-bmtoast';
    d.textContent = msg;
    (document.querySelector('#movie_player') || document.body).appendChild(d);
    setTimeout(() => d.classList.add('out'), 1600);
    setTimeout(() => d.remove(), 2200);
  }

  // ---------- 画面内の通知（右下からスライド） ----------
  const TOAST_MS = { high: 0, normal: 12000, low: 6000 }; // 0＝閉じるまで残す
  function showToasts(items) {
    let box = document.getElementById('tg-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'tg-toasts'; document.body.appendChild(box); }
    const KIND = { live: '🔴 配信中', upcoming: '⏰ 配信予定', kw: '⚡ キーワード', new: '新着' };
    items.slice(0, 6).forEach((it, i) => setTimeout(() => {
      const t = document.createElement('div');
      t.className = `tg-toast tg-lv-${it.level || 'normal'}`;
      const when = it.kind === 'upcoming' && it.at ? ` ${new Date(it.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}〜` : '';
      t.innerHTML = `<img src="https://i.ytimg.com/vi/${esc(it.v)}/mqdefault.jpg" alt="">
        <div class="tg-t-body"><div class="tg-t-head"><span class="tg-t-kind">${KIND[it.kind] || '新着'}${esc(when)}</span><span class="tg-t-folder">${esc(it.folder || '')}</span></div>
          <div class="tg-t-title">${esc(it.title || '')}</div><div class="tg-t-ch">${esc(it.ch || '')}</div></div>
        <button class="tg-t-x" title="閉じる">✕</button>`;
      const close = () => { t.classList.remove('in'); setTimeout(() => t.remove(), 350); };
      t.querySelector('.tg-t-x').addEventListener('click', e => { e.stopPropagation(); close(); });
      t.addEventListener('click', () => { close(); location.assign('/watch?v=' + encodeURIComponent(it.v)); });
      box.appendChild(t);
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
      const ms = TOAST_MS[it.level || 'normal'];
      if (ms) { let tm = setTimeout(close, ms); t.addEventListener('mouseenter', () => clearTimeout(tm)); t.addEventListener('mouseleave', () => { tm = setTimeout(close, 4000); }); }
    }, i * 250));
    if (items.length > 6) setTimeout(() => showToasts([{ v: items[6].v, title: `ほか ${items.length - 6} 本の新着があります`, ch: '', folder: '', level: 'low', kind: 'new' }]), 1700);
  }

  // ---------- イベント ----------
  chrome.storage.onChanged.addListener(async changes => {
    if (changes.openManager?.newValue) checkOpenRequest();
    if (changes.watched) TGFeed.setWatched(changes.watched.newValue);
    if (changes.later) { TGFeed.setLater(changes.later.newValue); setLaterSet(changes.later.newValue || []); }
    if (changes.recent || changes.folderSeen || changes.watched || changes.later || changes.bookmarks) refreshCounts();
    if (changes.recent && isSubsFeed() && S.feedType === 'new') setTimeout(() => TGFeed.refresh(S), 300);
    if (changes.queue) TGX.syncQueue();
    if (changes.hideWatched) { S.hideWatched = !!changes.hideWatched.newValue; TGFeed.setHideWatched(S.hideWatched); }
    if (changes.cols) {
      S.cols = changes.cols.newValue;
      TGFeed.setCols(S.cols);
      const bar = document.getElementById('tg-bar');
      if (bar) buildBar(bar);
    }
    if (changes.homeCols || changes.homeShortCols || changes.searchCols || changes.searchShortCols) {
      const d = await TG.load();
      S.homeCols = d.homeCols;
      S.homeShortCols = d.homeShortCols;
      S.searchCols = d.searchCols;
      S.searchShortCols = d.searchShortCols;
      applyHomeCols();
    }
    if (changes.focus && !(changes.channels || changes.folders || changes.activeGroup || changes.feedType)) {
      FOCUS = { ...TG.FOCUS_DEF, ...(changes.focus.newValue || {}) };
      applyFocus(); bumpMark(); renderGuide(true); renderSubsPage(true); markVideos(); checkWatchLock();
    }
    if (changes.channels || changes.folders || changes.activeGroup || changes.feedType) {
      reload().then(() => { if (document.getElementById('tg-pop')) buildPopover(); });
    } else if (changes.meta) {
      S.meta = changes.meta.newValue || {};
    }
  });

  // ---------- 再生した動画を記録（視聴済み表示用） ----------
  let wTimer = null, wSaveT = null, wPending = {};
  function currentVid() {
    if (location.pathname === '/watch') return new URLSearchParams(location.search).get('v');
    return location.pathname.match(/^\/shorts\/([\w-]{11})/)?.[1] || null;
  }
  // 保存はまとめて20秒に1回（＋ページを離れるとき）。5%未満の変化は保存しない（90%到達だけはすぐ）
  const wSaved = {};
  function recordWatch(id, p) {
    if (!id) return;
    const prev = Math.max(wPending[id] || 0, wSaved[id] || 0);
    if (p < prev + 5 && !(p >= 90 && prev < 90) && prev) return;
    wPending[id] = Math.max(wPending[id] || 0, p);
    if (p >= 90 && prev < 90) { clearTimeout(wSaveT); wSaveT = setTimeout(flushWatch, 500); return; }
    if (!wSaveT) wSaveT = setTimeout(flushWatch, 20000);
  }
  async function flushWatch() {
    clearTimeout(wSaveT); wSaveT = null;
    {
      const add = wPending; wPending = {};
      if (!Object.keys(add).length) return;
      Object.assign(wSaved, add);
      const { watched = {} } = await chrome.storage.local.get('watched');
      let changed = false;
      for (const [k, v] of Object.entries(add)) {
        const np = Math.max(watched[k]?.p || 0, v);
        if (watched[k]?.p !== np) { watched[k] = { p: np, at: Date.now() }; changed = true; }
      }
      if (!changed) return;
      const keys = Object.keys(watched);
      if (keys.length > 6000) keys.sort((a, b) => watched[a].at - watched[b].at).slice(0, keys.length - 6000).forEach(k => delete watched[k]);
      await chrome.storage.local.set({ watched });
    }
  }
  // ---------- 視聴記録（視聴時間・再生数・高評価数・自分の評価） ----------
  //   history: { 動画ID: { t, ch, k, d:長さ秒, first, last, sec:見た秒数, views, likes, rate:'like'|'dislike'|'' , short } }
  //   daily:   { 'YYYY-MM-DD': 見た秒数 }
  let hPending = {}, hDaily = {}, hSlot = {}, hSaveT = null; // hSlot … 日・時間・チャンネルごとの視聴秒（視聴パターン用）
  function readWatchMeta(id) {
    const isShort = location.pathname.startsWith('/shorts/');
    const meta = document.querySelector('ytd-watch-metadata');
    const title = (isShort ? document.querySelector('ytd-reel-video-renderer[is-active] h2, yt-shorts-video-title-view-model h2') : meta?.querySelector('h1'))?.textContent?.trim()
      || document.title.replace(/ - YouTube$/, '');
    const ch = isShort ? null : currentChannel();
    const shortCh = isShort ? document.querySelector('ytd-reel-video-renderer[is-active] ytd-channel-name a, yt-reel-channel-bar-view-model a') : null;
    const info = meta?.querySelector('#info, ytd-watch-info-text')?.textContent || '';
    const views = TG.parseCount(info.match(/([\d.,]+\s*[万億]?)\s*回視聴/)?.[1] || info.match(/([\d.,]+\s*[KMB]?)\s*views/i)?.[1] || '');
    const likeBtn = (isShort ? document.querySelector('ytd-reel-video-renderer[is-active]') : meta)?.querySelector('like-button-view-model button, #segmented-like-button button, ytd-toggle-button-renderer button');
    const disBtn = (isShort ? document.querySelector('ytd-reel-video-renderer[is-active]') : meta)?.querySelector('dislike-button-view-model button, #segmented-dislike-button button');
    const likes = TG.parseCount(likeBtn?.textContent?.trim() || likeBtn?.getAttribute('aria-label')?.match(/([\d.,]+\s*[万億KMB]?)/i)?.[1] || '');
    const rate = likeBtn?.getAttribute('aria-pressed') === 'true' ? 'like' : disBtn?.getAttribute('aria-pressed') === 'true' ? 'dislike' : '';
    const sk = shortCh ? TG.channelKey(shortCh.getAttribute('href')) : null;
    return { t: title, ch: ch?.name || shortCh?.textContent?.trim() || '', k: ch?.key || sk || '', views, likes, rate, short: isShort };
  }
  let metaCache = { id: null, at: 0, m: null };
  function recordHistory(id, addSec, v) {
    if (metaCache.id !== id || Date.now() - metaCache.at > 30000) metaCache = { id, at: Date.now(), m: readWatchMeta(id) };
    const m = metaCache.m;
    const e = (hPending[id] ||= { add: 0 });
    e.add += addSec;
    Object.assign(e, Object.fromEntries(Object.entries(m).filter(([, x]) => x !== '' && x !== 0 && x != null)));
    e.rate = m.rate; // 評価の取り消しも反映
    if (!m.short && !tagRecorded.has(id) && ((tagSecs[id] = (tagSecs[id] || 0) + addSec) >= 30)) recordPlayedTags(id); // 30秒以上見たらタグを記録（ランダム検索用）
    if (v?.duration > 0 && isFinite(v.duration)) e.d = Math.round(v.duration);
    const day = TG.dayKey();
    hDaily[day] = (hDaily[day] || 0) + addSec;
    const hr = new Date().getHours(), ck = m.k || (m.ch ? '#' + m.ch : '');
    const sd = (hSlot[day] ||= { c: {}, h: {} });
    sd.c[ck] = (sd.c[ck] || 0) + addSec;
    sd.h[hr] = (sd.h[hr] || 0) + addSec;
    if (m.short) sd.h.s = (sd.h.s || 0) + addSec; // ショートの秒
    // 集中モードの時間帯に見た秒（f）と、そのうち見えなくしているフォルダの秒（x＝脱線）
    const fs = TG.focusState(FOCUS);
    if (fs.active || fs.unlocked) {
      sd.h.f = (sd.h.f || 0) + addSec;
      if (m.k) {
        const fl = TG.folderMap(S.channels, S.folders).get(m.k) || (S.channels[m.k] ? [] : null);
        if (TG.channelLocked(FOCUS, S.folders, fl)) sd.h.x = (sd.h.x || 0) + addSec;
      }
    }
    if (!hSaveT) hSaveT = setTimeout(flushHistory, 30000);
  }
  async function flushHistory() {
    clearTimeout(hSaveT); hSaveT = null;
    const add = hPending, daily = hDaily, slot = hSlot;
    hPending = {}; hDaily = {}; hSlot = {};
    if (!Object.keys(add).length && !Object.keys(daily).length) return;
    const st = await chrome.storage.local.get(['history', 'daily', 'dayCh', 'dayHr']);
    const history = st.history || {}, dd = st.daily || {}, dc = st.dayCh || {}, dh = st.dayHr || {};
    for (const [d, x] of Object.entries(slot)) {
      const c = (dc[d] ||= {}), h = (dh[d] ||= {});
      for (const [k, sec] of Object.entries(x.c)) c[k] = (c[k] || 0) + sec;
      for (const [k, sec] of Object.entries(x.h)) h[k] = (h[k] || 0) + sec;
    }
    // 視聴パターン用の記録は400日分
    const cutDay = TG.dayKey(Date.now() - 400 * 864e5);
    for (const o of [dc, dh]) for (const d of Object.keys(o)) if (d < cutDay) delete o[d];
    const now = Date.now();
    for (const [id, e] of Object.entries(add)) {
      const h = (history[id] ||= { first: now, sec: 0 });
      h.sec = (h.sec || 0) + e.add;
      h.last = now;
      for (const k of ['t', 'ch', 'k', 'd', 'views', 'likes', 'short']) if (e[k] !== undefined) h[k] = e[k];
      h.rate = e.rate || '';
    }
    for (const [d, sec] of Object.entries(daily)) dd[d] = (dd[d] || 0) + sec;
    const ids = Object.keys(history);
    if (ids.length > 5000) ids.sort((a, b) => history[a].last - history[b].last).slice(0, ids.length - 5000).forEach(k => delete history[k]);
    await chrome.storage.local.set({ history, daily: dd, dayCh: dc, dayHr: dh });
  }

  function trackWatch() {
    clearInterval(wTimer);
    const id = currentVid();
    if (!id) return;
    recordWatch(id, 1); // 開いただけでも「途中」として記録
    let lastT = performance.now();
    wTimer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(10, (now - lastT) / 1000);
      lastT = now;
      if (currentVid() !== id) { clearInterval(wTimer); flushHistory(); flushWatch(); return; }
      const v = document.querySelector('#movie_player video, video');
      if (v && v.duration > 0 && isFinite(v.duration) && !v.paused) {
        recordWatch(id, Math.min(100, Math.round((v.currentTime / v.duration) * 100)));
        if (!document.querySelector('#movie_player.ad-showing')) recordHistory(id, Math.round(dt), v); // 広告の時間は数えない
      }
    }, 5000);
  }
  window.addEventListener('pagehide', () => { flushHistory(); flushWatch(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { flushHistory(); flushWatch(); } });
  window.addEventListener('pagehide', () => {
    const id = currentVid();
    const v = document.querySelector('#movie_player video, video');
    if (id && v?.duration > 0 && isFinite(v.duration)) recordWatch(id, Math.round((v.currentTime / v.duration) * 100));
  });

  // ショートは上下に送ってもページ移動の合図が出ないことがあるので、URLの変化を見る
  let lastHref = location.href;
  setInterval(() => {
    if (location.href === lastHref || document.hidden) return;
    lastHref = location.href;
    if (isShortsPage()) { document.getElementById('tg-pop')?.remove(); renderFab(); setTimeout(renderFab, 800); }
  }, 700);
  document.addEventListener('yt-navigate-finish', () => {
    trackWatch();
    TGX.syncQueue();
    document.getElementById('tg-pop')?.remove();
    setTimeout(() => { renderGuide(true); renderSubsPage(true); renderFab(); renderHomeTool(); markVideos(); }, 200);
  });

  document.addEventListener('click', e => {
    const pop = document.getElementById('tg-pop');
    if (pop && !pop.contains(e.target) && e.target.id !== 'tg-fab') pop.remove();
  });

  document.addEventListener('visibilitychange', checkOpenRequest);

  // ---------- 画面の変化への追従（軽量化） ----------
  // ・動画プレーヤーや拡張機能自身の部品の中の変化は無視（再生時間の表示などで毎秒変わるため）
  // ・まとめて0.5秒に1回だけ処理（間引き）。タブが裏にあるときは何もしない
  const IGNORE = '#movie_player, .html5-video-player, #tg-feed, #tg-guide, #tg-bar, #tg-mh-gear, #tg-homefeed, #tg-hometypes, #tg-queue, #tg-pop, #tg-manager, #tg-hometool, .tg-c-panel, ytd-live-chat-frame, #chat, tp-yt-paper-tooltip, #ticker';
  function relevant(muts) {
    for (const m of muts) {
      const t = m.target;
      if (t.nodeType !== 1) continue;
      if (t.closest(IGNORE)) continue;
      return true;
    }
    return false;
  }
  function runAll() {
    tick = null;
    if (document.hidden) { pendingWhileHidden = true; return; }
    renderGuide(false);
    renderSubsPage(false);
    if (!isSubsFeed() && ytChipsEl) placeYtChips(0);
    homeTypes();
    homeFeed();
    renderFab();
    markVideos();
    layoutHome();
    if (FST.active && FOCUS.blockWatch) checkWatchLock();
  }
  let pendingWhileHidden = false;
  function schedule(delay = 500) {
    if (tick) return;
    tick = setTimeout(runAll, delay);
  }
  new MutationObserver(muts => { if (relevant(muts)) schedule(); })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && pendingWhileHidden) { pendingWhileHidden = false; schedule(50); } });

  reload().then(checkOpenRequest);
  trackWatch();
  TGX.syncQueue();
  try { chrome.runtime.sendMessage({ type: 'tg-hello' }).catch(() => {}); } catch { /* 拡張機能の再読み込み直後 */ }
  // 新着の確認（15分以上たっていれば）。拡張機能のバックグラウンドからの依頼にも応える
  setTimeout(() => TGX.check().catch(() => {}), 4000);
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m?.type === 'tg-toast') { showToasts(m.items || []); reply({ ok: true }); return; }
    if (m?.type === 'tg-hist') {
      TGX.importHistory({ force: true }).then(r => reply({ ok: true, ...r }), e => reply({ ok: false, error: e.message }));
      return true;
    }
    if (m?.type !== 'tg-check') return;
    TGX.check({ force: !!m.force }).then(r => reply({ ok: true, ...r }), e => reply({ ok: false, error: e.message }));
    return true;
  });
  // ---------- ホバー再生（サムネに乗せたときのプレビュー）を 音声あり・2倍速 に ----------
  //   YouTube のプレビュー用プレイヤーをそのまま使い、ミュート解除・速度だけ変える（px.hoverSound / px.hoverFast）
  const PXH0 = { hoverSound: true, hoverVol: 30, hoverFast: true, feedPreview: true, pvMode: 'old', pvScale: 0.25, colMin: 3, colMax: 7 };
  let PXH = { ...PXH0 };
  chrome.storage.local.get('px').then(r => { PXH = { ...PXH0, ...(r.px || {}) }; renderFab(); renderHomeTool(); });
  chrome.storage.onChanged.addListener(ch => { if (ch.px) { PXH = { ...PXH0, ...(ch.px.newValue || {}) }; renderFab(); renderHomeTool(); const bar = document.getElementById('tg-bar'); if (bar && isSubsFeed()) buildBar(bar); } });
  const hoverVol = () => Math.min(1, Math.max(0.01, (+PXH.hoverVol || 30) / 100));
  const isPreview = v => v.tagName === 'VIDEO' && !v.closest('ytd-shorts, ytd-reel-video-renderer, #shorts-player, #tg-mini, ytd-watch-flexy #player-container, ytd-miniplayer')
    && (!!v.closest('#inline-preview-player, ytd-video-preview, #video-preview, ytd-moving-thumbnail-renderer, [id*="preview" i]') || !v.closest('#movie_player'));
  const hovStart = new WeakMap();
  function tuneHover(v) {
    if (!hovStart.has(v)) hovStart.set(v, Date.now());
    if (Date.now() - hovStart.get(v) > 1500) return; // 始まってすぐだけ合わせる（そのあと自分で変えたものは尊重）
    if (PXH.hoverFast && v.playbackRate !== 2) try { v.playbackRate = 2; } catch { /* なし */ }
    if (PXH.hoverSound) {
      const vol = hoverVol();
      if (Math.abs(v.volume - vol) > 0.005) v.volume = vol; // 設定の音量に（大きすぎないように）
      if (v.muted) v.muted = false;
    }
  }
  ['playing', 'loadeddata', 'ratechange', 'volumechange'].forEach(t => document.addEventListener(t, e => {
    const v = e.target;
    if (!isPreview(v)) return;
    if (t === 'loadeddata') hovStart.delete(v);
    tuneHover(v);
  }, true));

  // ---------- TubeFolio の一覧（新着・動画・後で見る・ブックマークなど）のサムネに乗せたらプレビュー ----------
  //   コマ割り画像のパラパラ表示（音声なし）をすぐ出し、裏で埋め込みプレイヤーを読み込む。
  //   埋め込みが動き出したらそちらに切り替える（拡張機能の中継ページ pv.html の中で埋め込み、
  //   embed_rules.json で youtube.com 以外の Referer を付けてエラー 152／153 を避ける）
  let fpTimer = 0, fpThumb = null, fpBoardEl = null, fpBoardT = 0, fpTune = 0, fpCur = null;
  let fpEmbedBad = 0; // 続けて失敗したら、しばらくは埋め込みを試さない
  const FP_SEL = '.tg-card .tg-thumb, .tg-bmth, #tg-tv .tv-t'; // #tg-tv＝急上昇動画のパネル
  const fpLog = msg => { try { TG.log('プレビュー', msg); } catch { /* なし */ } };
  function fpStop() {
    clearTimeout(fpTimer); clearInterval(fpTune); clearInterval(fpBoardT); fpTimer = 0; fpTune = 0; fpBoardT = 0;
    fpBoardEl?.remove(); fpBoardEl = null;
    if (fpCur?.done && fpCur.short) stAdd((Date.now() - fpCur.at) / 1000); // ショートのプレビュー時間も合計に
    if (fpCur && !fpCur.done && !fpCur.fell) fpLog(`埋め込みが動き出す前に離れました（状態 ${fpCur.state ?? '応答なし'}・${((Date.now() - fpCur.t0) / 1000).toFixed(1)}秒）`);
    fpCur?.el.remove(); fpCur = null;
    fpThumb?.classList.remove('tg-fp-on', 'tg-fp-play'); fpThumb = null;
  }
  const fpTarget = th => {
    const a = th.matches('a[href]') ? th : th.closest('a[href]');
    const u = new URL(a?.getAttribute('href') || '', location.href);
    const v = u.searchParams.get('v') || (u.pathname.match(/^\/shorts\/([\w-]{11})/) || [])[1] || th.closest('[data-v]')?.dataset.v;
    return { v, start: parseInt(u.searchParams.get('t') || '0', 10) || 0 };
  };
  function fpStart(th) {
    const { v, start } = fpTarget(th);
    if (!v) return;
    // 検証用拡張で成功したのと同じ流れ：サムネを出したまま埋め込みを読み込み、再生が始まってから表示する。
    // コマ送り（コマ割り画像）は、埋め込みで再生できなかったときだけ
    if (fpEmbedBad < 3) fpEmbed(th, v, start);
    else fpBoard(th).catch(() => {});
  }
  // 新プレビュー：埋め込みプレイヤーを「大きく作ってから縮める」ことで、タイトル・ボタンなどの UI だけを小さくする
  //   scale＝UI の大きさ（1＝100%・0.01＝1%）。中身を 1/scale 倍の大きさで作り、scale 倍に縮めてサムネの枠に収める
  function fpScale(el) {
    const sc = Math.min(1, Math.max(0.01, +PXH.pvScale || 0.25));
    const inv = 1 / sc;
    Object.assign(el.style, { width: inv * 100 + '%', height: inv * 100 + '%', left: -50 * (inv - 1) + '%', top: -50 * (inv - 1) + '%', right: 'auto', bottom: 'auto', transform: `scale(${sc})`, transformOrigin: 'center center' });
  }
  function fpEmbed(th, v, start) {
    const el = document.createElement('iframe');
    const nu = PXH.pvMode === 'new';
    el.className = 'tg-fp tg-fp-emb' + (nu ? ' tg-fp-new' : '');
    el.allow = 'autoplay; encrypted-media';
    // 拡張機能の中継ページ（pv.html）の中で埋め込む：YouTube のページから直接埋め込むと 152 になるため
    el.src = chrome.runtime.getURL(`pv.html?v=${encodeURIComponent(v)}${start ? '&start=' + start : ''}${nu ? '&loop=1' : ''}`);
    if (nu) { fpScale(el); th.classList.add('tg-fp-on', 'tg-fp-play'); } // 新プレビュー：すぐに重ねて表示（UI が小さいので待たない）
    th.appendChild(el);
    const cur = fpCur = { th, el, v, state: null, done: false, t0: Date.now(), short: !!th.closest('[data-type="short"]') || /\/shorts\//.test(th.closest('a[href]')?.getAttribute('href') || th.querySelector('a[href]')?.getAttribute('href') || '') };
    const send = (event, extra) => { try { el.contentWindow?.postMessage(JSON.stringify({ event, id: 'tgfp', channel: 'widget', ...extra }), '*'); } catch { /* なし */ } };
    fpTune = setInterval(() => {
      if (fpCur !== cur) return clearInterval(fpTune);
      if (!cur.done) send('listening');
      let vEl = null;
      try { vEl = el.contentDocument?.querySelector('video'); } catch { /* 読めなければ API だけ */ }
      if (vEl && !vEl.paused && vEl.currentTime > 0.1) cur.state = 1;
      if (cur.done && vEl && Date.now() - cur.at < 2000) { // 動き出してすぐは音量・速さを合わせ直す
        if (PXH.hoverFast && vEl.playbackRate !== 2) vEl.playbackRate = 2;
        if (PXH.hoverSound && !cur.remuted) { if (Math.abs(vEl.volume - hoverVol()) > 0.005) vEl.volume = hoverVol(); if (vEl.muted) vEl.muted = false; }
      }
      if (cur.state === 1 && !cur.done) {
        cur.done = true; cur.at = Date.now();
        if (PXH.hoverFast) send('command', { func: 'setPlaybackRate', args: [2] });
        fpEmbedBad = 0;
        fpLog(`埋め込みで再生（${((Date.now() - cur.t0) / 1000).toFixed(1)}秒）`);
        th.classList.add('tg-fp-on', 'tg-fp-play'); // 再生が始まったらすぐ表示
        clearInterval(fpBoardT); fpBoardEl?.remove(); fpBoardEl = null;
        if (PXH.hoverSound) setTimeout(() => { if (fpCur === cur && !cur.remuted) { send('command', { func: 'setVolume', args: [Math.round(hoverVol() * 100)] }); send('command', { func: 'unMute', args: [] }); } }, 300);
      }
      if (cur.done) { if (Date.now() - cur.at > 5000) clearInterval(fpTune); return; }
      if (Date.now() - cur.t0 > 10000) { clearInterval(fpTune); fpFail(cur, `10秒で動き出さず（状態 ${cur.state ?? '応答なし'}）`); }
    }, 250);
  }
  function fpFail(cur, why) {
    if (fpCur !== cur || cur.fell) return;
    cur.fell = true; fpEmbedBad++;
    cur.th.classList.remove('tg-fp-play');
    cur.el.remove();
    fpLog(`埋め込みで再生できません：${why}`);
    if (fpThumb === cur.th) fpBoard(cur.th).catch(() => {}); // 代わりにコマ送り
  }
  window.addEventListener('message', e => {
    const cur = fpCur;
    if (!cur || e.source !== cur.el.contentWindow) return;
    let d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
    if (!d?.event) return;
    if (d.event === 'onError') return fpFail(cur, `エラー ${d.info}`);
    const cmd = (func, args = []) => { try { cur.el.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args, id: 'tgfp', channel: 'widget' }), '*'); } catch { /* なし */ } };
    if (d.event === 'onReady') cmd('playVideo');
    const st = d.event === 'onStateChange' ? d.info : d.event === 'infoDelivery' ? d.info?.playerState : undefined;
    if (st == null) return;
    cur.state = st;
    // 再生中に止まった（音を出したことでブラウザに止められた等）：ミュートに戻して続ける。2回目は諦めてサムネに戻す
    if (cur.done && st === 2 && fpCur === cur) {
      if (!cur.remuted) { cur.remuted = true; cmd('mute'); cmd('playVideo'); fpLog('音声つきで止められたので、ミュートで再生を続けます'); }
      else { cur.th.classList.remove('tg-fp-play'); fpLog('再生が止まりました'); }
    }
  });
  // 動画のコマ割り画像をパラパラ表示する（音声なし）
  async function fpBoard(th) {
    const { v, start } = fpTarget(th);
    let sb = null;
    try { sb = await YTAPI.storyboard(v); } catch { /* 取れなければ何もしない */ }
    if (!sb || fpThumb !== th || th.classList.contains('tg-fp-play')) return;
    const per = sb.cols * sb.rows, total = sb.count || per;
    const step = sb.interval ? sb.interval / 1000 : (sb.dur || total) / total; // 1コマの秒数
    let k = Math.min(total - 1, Math.floor(start / step));
    const f = document.createElement('div');
    f.className = 'tg-fp tg-fp-sb';
    f.innerHTML = '<i></i>';
    th.appendChild(f);
    fpBoardEl = f;
    const bar = f.firstChild;
    const show = () => {
      const sheet = Math.floor(k / per), j = k % per, col = j % sb.cols, row = Math.floor(j / sb.cols);
      f.style.backgroundImage = `url("${sb.url(sheet)}")`;
      f.style.backgroundSize = `${sb.cols * 100}% ${sb.rows * 100}%`;
      f.style.backgroundPosition = `${sb.cols > 1 ? (col / (sb.cols - 1)) * 100 : 0}% ${sb.rows > 1 ? (row / (sb.rows - 1)) * 100 : 0}%`;
      bar.style.width = ((k + 1) / total) * 100 + '%';
    };
    const pre = new Set();
    const preload = () => { const sh = Math.floor(k / per) + 1; if (!pre.has(sh) && sh * per < total) { pre.add(sh); new Image().src = sb.url(sh); } };
    show(); preload();
    th.classList.add('tg-fp-on');
    const ms = PXH.hoverFast ? 250 : 500;
    clearInterval(fpBoardT);
    fpBoardT = setInterval(() => { if (fpBoardEl !== f) return clearInterval(fpBoardT); k = (k + 1) % total; show(); preload(); }, ms);
  }
  document.addEventListener('mouseover', e => {
    const th = e.target.closest?.(FP_SEL);
    if (th === fpThumb) return;
    fpStop();
    if (!th || PXH.feedPreview === false || e.target.closest('button')) return;
    fpThumb = th;
    fpTimer = setTimeout(() => { if (fpThumb === th) fpStart(th); }, 600);
  }, true);
  document.addEventListener('mouseout', e => { if (fpThumb && !fpThumb.contains(e.relatedTarget)) fpStop(); }, true);
  document.addEventListener('click', e => { if (fpThumb && fpThumb.contains(e.target)) fpStop(); }, true);
  window.addEventListener('scroll', () => { if (fpThumb) fpStop(); }, { passive: true });

  // ---------- ショート：空いている場所に「ショートを見続けている時間」と今日のショートの合計時間 ----------
  //   ⏱ は次のショートへ移っても続けてカウントし、ショート以外のページへ移ると 0 に戻る（再生中だけ数える）
  //   合計は、その ⏱ で数えた秒をそのまま足し上げたもの（TubeFolio の一覧でショートをプレビュー再生した時間も含む）。
  //   shortsSec: { 日付: 秒 }（60日分）。ほかのタブで見た分も合わせる
  let stBox = null, stSec = 0, stLast = 0;
  let stStore = { day: '', sec: 0 }, stPend = 0, stFlushT = 0;
  const stLoad = async () => { const { shortsSec = {} } = await chrome.storage.local.get('shortsSec'); const day = TG.dayKey(); stStore = { day, sec: shortsSec[day] || 0 }; };
  stLoad().catch(() => {});
  chrome.storage.onChanged.addListener(ch => { if (ch.shortsSec) { const day = TG.dayKey(); stStore = { day, sec: (ch.shortsSec.newValue || {})[day] || 0 }; } });
  async function stFlush() {
    clearTimeout(stFlushT); stFlushT = 0;
    if (stPend < 0.5) return;
    const add = stPend; stPend = 0;
    const day = TG.dayKey();
    const { shortsSec = {} } = await chrome.storage.local.get('shortsSec');
    shortsSec[day] = (shortsSec[day] || 0) + add;
    const cut = TG.dayKey(Date.now() - 60 * 864e5);
    for (const d of Object.keys(shortsSec)) if (d < cut) delete shortsSec[d];
    stStore = { day, sec: shortsSec[day] };
    await chrome.storage.local.set({ shortsSec });
  }
  function stAdd(sec) {
    if (!(sec > 0)) return;
    stPend += sec;
    if (!stFlushT) stFlushT = setTimeout(() => stFlush().catch(() => {}), 10000);
  }
  const stTotal = () => (stStore.day === TG.dayKey() ? stStore.sec : 0) + stPend;
  window.addEventListener('pagehide', () => { stFlush().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stFlush().catch(() => {}); });
  const hms = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
  const hm2 = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}時間${m}分` : `${m}分`; };
  async function shortsTime() {
    const now = Date.now(), dt = stLast ? Math.min(2, (now - stLast) / 1000) : 0;
    stLast = now;
    if (!isShortsPage()) { stSec = 0; stBox?.remove(); stBox = null; return; }
    const v = document.querySelector('ytd-reel-video-renderer[is-active] video, ytd-shorts #shorts-player video, #shorts-player video');
    if (v && !v.paused && !v.ended && v.readyState > 2 && document.visibilityState === 'visible') { stSec += dt; stAdd(dt); }
    if (PXH.shortsTime === false) { stBox?.remove(); stBox = null; return; }
    const pl = v?.closest('#shorts-player, ytd-reel-video-renderer') || v;
    if (!v || !pl) return;
    if (!stBox) { stBox = document.createElement('div'); stBox.id = 'tg-stime'; stBox.title = '⏱ ショートを見続けている時間／合計：今日 ⏱ で数えた時間を足したもの（TubeFolio の一覧でのプレビューも含む）'; document.body.appendChild(stBox); }
    stBox.innerHTML = `<div class="t">⏱ ${hms(stSec)}</div><div class="d">今日のショート合計 <b>${hms(stTotal())}</b></div>`;
    const r = pl.getBoundingClientRect(), w = stBox.offsetWidth || 170;
    const left = r.left - w - 24;
    stBox.style.left = Math.max(8, left > 8 ? left : r.right + 90) + 'px';
    stBox.style.top = Math.max(70, r.top + 16) + 'px';
  }
  setInterval(() => shortsTime().catch(() => {}), 500);

  // 再生画面の追加機能（playerx.js）から使う
  globalThis.TGPage = {
    currentChannel: () => (isWatchPage() ? currentChannel() : null), state: () => S,
    histMenu, recReset, histOn, histLabel,
    goChannel: key => TG.goChannel(key, S.channels),
    addToFolder: fid => { const ch = currentChannel(); return ch ? toggleMembership(fid, ch, true) : null; }
  };
  // Google Drive 自動同期：開いたときに新しい方へ合わせる
  try { chrome.runtime.sendMessage({ type: 'drive', op: 'autoPull' }).catch(() => {}); } catch { /* 拡張機能の再読み込み直後など */ }
})();
