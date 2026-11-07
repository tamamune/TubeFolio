// charts.youtube.com のページ本体（MAIN world）で動く。
//   各行（ytmc-entry-row）が持つ曲のデータから動画IDと曲名を読み、行の属性（data-tg-vid / data-tg-title）に書き出す。
//   （拡張機能側のスクリプト charts.js からは、ページ内部のデータが見えないため）
(() => {
  const ID_RE = /\/vi(?:_webp)?\/([\w-]{11})(?:\/|$|\?)/;
  const rowsIn = (root, out = []) => {
    root.querySelectorAll('*').forEach(e => {
      if (e.tagName === 'YTMC-ENTRY-ROW') out.push(e);
      if (e.shadowRoot) rowsIn(e.shadowRoot, out);
    });
    return out;
  };
  const tick = () => {
    if (document.hidden) return;
    try {
      for (const row of rowsIn(document)) {
        const ent = row.__data?.chartSummaryEntity || row.chartSummaryEntity || {};
        let v = (ent.thumbnailUrl || '').match(ID_RE)?.[1] || '';
        if (!v) { // データに無ければ、行の中の画像から
          for (const im of row.shadowRoot?.querySelectorAll('img') || []) { v = (im.currentSrc || im.src || '').match(ID_RE)?.[1] || ''; if (v) break; }
        }
        if (v) { if (row.getAttribute('data-tg-vid') !== v) row.setAttribute('data-tg-vid', v); } else row.removeAttribute('data-tg-vid');
        const t = ent.entityTitle || '';
        if (t && row.getAttribute('data-tg-title') !== t) row.setAttribute('data-tg-title', t);
      }
    } catch { /* ページの作りが変わったときは何もしない */ }
  };
  setInterval(tick, 1500);
  let t = 0; // スクロールが止まったら、すぐ書き出す（charts.js が少し後に読む）
  addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(tick, 120); }, true);
  tick();
})();
