// YouTube チャート（charts.youtube.com）の各行に「＋」ボタンを付ける。
//   行のサムネ（i.ytimg.com/vi/<動画ID>/…）から動画IDを取り、押すと再生リストの一覧を出して追加する。
//   再生リストの読み込み・追加は、開いている YouTube（www.youtube.com）のタブが行う（background.js が仲介）
(() => {
  const BTN = 'tg-chart-add';
  // 拡張機能のスクリプトからは e.shadowRoot が見えないことがあるので、専用の方法（chrome.dom）を先に使う
  const shOf = e => { try { return chrome.dom?.openOrClosedShadowRoot?.(e) || e.shadowRoot || null; } catch { return e.shadowRoot || null; } };
  const rowsIn = (root, out = []) => {
    root.querySelectorAll('*').forEach(e => {
      if (e.tagName === 'YTMC-ENTRY-ROW') out.push(e);
      const r = shOf(e);
      if (r) rowsIn(r, out);
    });
    return out;
  };
  // 動画ID・曲名は、ページ側（chartmain.js）が行の属性に書き出したものを使う
  const vidOf = row => row.getAttribute('data-tg-vid') || '';

  // 追加した動画の記録：{ 動画ID: { ids: [再生リストID], names: [名前] } }（ブラウザに保存。ページを開き直しても残る）
  let added = {};
  try { chrome.storage.local.get('chartAdded').then(r => { added = r.chartAdded || {}; place(); }); } catch { /* なし */ }
  const saveAdded = () => {
    const keys = Object.keys(added);
    if (keys.length > 3000) keys.slice(0, keys.length - 3000).forEach(k => delete added[k]);
    try { chrome.storage.local.set({ chartAdded: added }); } catch { /* なし */ }
  };
  const send = msg => new Promise(res => {
    try { chrome.runtime.sendMessage(msg, r => res(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : r || { error: '応答がありません' })); }
    catch (e) { res({ error: e.message }); }
  });

  // ---- 画面下のお知らせ ----
  function toast(msg, bad) {
    let t = document.getElementById('tg-chart-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'tg-chart-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;padding:10px 16px;border-radius:8px;font:14px/1.4 Roboto,Arial,"Noto Sans JP",sans-serif;color:#fff;box-shadow:0 4px 16px #0008;max-width:80vw';
      document.body.appendChild(t);
    }
    t.style.background = bad ? '#b3261e' : '#2e7d32';
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, 3500);
  }
  const note = (box, text, color) => {
    box.textContent = '';
    const d = document.createElement('div');
    d.style.cssText = `padding:12px 16px;color:${color || '#aaa'}`; d.textContent = text;
    box.appendChild(d);
  };

  // ---- 再生リストの選択 ----
  let plCache = null;
  async function pick(v, title) {
    document.getElementById('tg-chart-pick')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'tg-chart-pick';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#0007;display:flex;align-items:center;justify-content:center;font:14px/1.4 Roboto,Arial,"Noto Sans JP",sans-serif';
    wrap.innerHTML = '<div style="background:#212121;color:#fff;border-radius:12px;width:min(420px,92vw);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px #000a">'
      + '<div style="padding:14px 16px;border-bottom:1px solid #444"><b>再生リストに追加</b><div class="tg-t" style="margin-top:4px;color:#aaa;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div>'
      + '<div class="tg-l" style="overflow:auto;padding:8px 0"></div>'
      + '<div style="padding:10px 16px;border-top:1px solid #444;text-align:right"><button class="tg-x" style="background:#3f3f3f;color:#fff;border:0;border-radius:18px;padding:8px 16px;cursor:pointer">閉じる</button></div></div>';
    wrap.querySelector('.tg-t').textContent = title || v;
    const close = () => wrap.remove();
    wrap.querySelector('.tg-x').onclick = close;
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    const box = wrap.querySelector('.tg-l');
    note(box, '読み込み中…');
    if (!plCache || Date.now() - plCache.at > 5 * 60e3) {
      const r = await send({ type: 'tg-chart', op: 'list' });
      if (r.error || !r.list) return note(box, r.error || '再生リストを読み込めませんでした', '#ff8a80');
      plCache = { at: Date.now(), list: r.list };
    }
    box.textContent = '';
    if (!plCache.list.length) return note(box, '再生リストがありません');
    for (const p of plCache.list) {
      const b = document.createElement('button');
      b.style.cssText = 'display:block;width:100%;text-align:left;background:none;color:#fff;border:0;padding:10px 16px;cursor:pointer;font:inherit';
      const done = added[v]?.ids?.includes(p.id);
      b.textContent = (done ? '✓ ' : '') + p.title + (p.count != null ? `（${p.count}）` : '') + (done ? '　追加済み' : '');
      if (done) { b.disabled = true; b.style.color = '#81c784'; b.style.cursor = 'default'; }
      b.onmouseenter = () => { b.style.background = '#383838'; };
      b.onmouseleave = () => { b.style.background = 'none'; };
      b.onclick = async () => {
        b.disabled = true; b.textContent = '追加中…';
        const r = await send({ type: 'tg-chart', op: 'add', v, id: p.id });
        close();
        if (r.error) toast('追加できませんでした：' + r.error, true);
        else {
          const e = added[v] || (added[v] = { ids: [], names: [] });
          if (!e.ids.includes(p.id)) { e.ids.push(p.id); e.names.push(p.title); }
          saveAdded(); place();
          toast(`「${p.title}」に追加しました`);
        }
      };
      box.appendChild(b);
    }
  }

  // ---- 各行の上にボタンを重ねる ----
  //   行の内側（シャドウDOM）へは書き込まず、ページ全体の上に透明な層を作って、行の位置にボタンを置く
  const layer = document.createElement('div');
  layer.id = 'tg-chart-layer';
  layer.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none';
  document.documentElement.appendChild(layer);
  const btns = new Map(); // 行 → ボタン
  let rowList = [];
  function refreshRows() {
    if (document.hidden) return;
    rowList = rowsIn(document);
    const live = new Set(rowList);
    for (const [row, b] of btns) if (!live.has(row) || !row.isConnected) { b.remove(); btns.delete(row); }
    place();
  }
  function makeBtn(row) {
    const b = document.createElement('button');
    b.className = 'tg-chart-ov'; b.textContent = '＋';
    b.style.cssText = 'position:fixed;pointer-events:auto;width:32px;height:32px;padding:0;background:#3f3f3f;color:#fff;border:1px solid #666;border-radius:50%;font:20px/30px Roboto,Arial,sans-serif;cursor:pointer;opacity:.9;display:none';
    b.addEventListener('mouseenter', () => { b.style.background = b.dataset.done ? '#43a047' : '#606060'; });
    b.addEventListener('mouseleave', () => { b.style.background = b.dataset.done ? '#2e7d32' : '#3f3f3f'; });
    b.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      const rt = shOf(row)?.querySelector('.ytmc-entry-row-container')?.innerText || '';
      const first = rt.split(String.fromCharCode(10)).map(x => x.trim()).filter(x => x && !/^[0-9]+$|^New$|^-$/.test(x))[0] || '';
      pick(b.dataset.v, row.getAttribute('data-tg-title') || first);
    });
    layer.appendChild(b);
    return b;
  }
  function place() {
    const rects = rowList.map(r => r.getBoundingClientRect()); // 位置の読み取りを先にまとめる（読み書きを交互にしない）
    rowList.forEach((row, i) => {
      const v = vidOf(row);
      let b = btns.get(row);
      if (!v) { if (b) { b.remove(); btns.delete(row); } return; } // 動画IDが分からない行（アーティストなど）には付けない
      if (!b) { b = makeBtn(row); btns.set(row, b); }
      const a = added[v], mark = a ? '✓' : '＋';
      if (b.dataset.v !== v || (b.dataset.done === '1') !== !!a) {
        b.dataset.v = v; b.dataset.done = a ? '1' : '';
        b.textContent = mark;
        b.style.background = a ? '#2e7d32' : '#3f3f3f';
        b.title = a ? `追加済み：${a.names.join('、')}（押すと別の再生リストにも追加できます）` : 'この動画を再生リストに追加';
      }
      const r = rects[i];
      const show = r.width > 0 && r.bottom > 0 && r.top < innerHeight;
      const disp = show ? 'block' : 'none';
      if (b.style.display !== disp) b.style.display = disp;
      if (show) { b.style.left = Math.round(r.right - 156) + 'px'; b.style.top = Math.round(r.top + r.height / 2 - 16) + 'px'; }
    });
  }
  // スクロール・大きさの変化の間は毎フレーム位置を合わせ、止まったら行の一覧を取り直す（仮想スクロールで行が入れ替わるため）
  let until = 0, raf = 0, settleT = 0;
  const loop = () => { raf = 0; place(); if (performance.now() < until) raf = requestAnimationFrame(loop); };
  const kick = () => {
    until = performance.now() + 400;
    if (!raf) raf = requestAnimationFrame(loop);
    clearTimeout(settleT); settleT = setTimeout(refreshRows, 250);
  };
  addEventListener('scroll', kick, true);
  addEventListener('resize', kick);
  setInterval(refreshRows, 3000); // ページ内の切り替え（チャートの種類・日付）に追従
  refreshRows();
})();
