// YouTube（www.youtube.com）側：チャートのページ（charts.youtube.com）から頼まれて、再生リストの一覧を返す／動画を追加する
//   （background.js が、開いている YouTube のタブへ中継する）
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== 'tg-chart-yt') return;
  (async () => {
    try {
      if (msg.op === 'list') {
        const own = (await YTAPI.myPlaylists()).filter(p => !p.saved);
        reply({ list: [{ id: 'WL', title: '後で見る', count: null }, ...own] });
      } else if (msg.op === 'add') {
        await YTAPI.addToPlaylist(msg.v, msg.id);
        TG.log('再生リスト', `チャートから動画 ${msg.v} を再生リストへ追加`);
        reply({ ok: true });
      } else reply({ error: '不明な操作です' });
    } catch (e) { reply({ error: e.message || String(e) }); }
  })();
  return true;
});
