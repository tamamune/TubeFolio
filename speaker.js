// CaptionSpeaker：画面に出ている日本語字幕を、ブラウザの音声合成（speechSynthesis）で読み上げる
//   ・字幕は画面の字幕（.ytp-caption-segment）を読む。外国語の動画は「字」ボタンの自動日本語字幕と組み合わせる
//   ・自動字幕のように伸びていく字幕は、前に読んだ分との差分だけを読む
//   ・読み上げが遅れてたまったら、古い分を捨てて最新から読む
//   ・読んでいる間は元の音声の音量を下げる（設定）。一時停止・シーク・広告・動画の切り替えで止める
//   設定 px: { speak, speakRate, speakDuck（読み上げ中の元の音量・%）, speakHide（字幕を隠す） }
(() => {
  if (window.__tgSpeaker) return;
  window.__tgSpeaker = true;
  const DEF = { speak: false, speakRate: 1.2, speakDuck: 15, speakHide: false };
  let cfg = { ...DEF };
  const synth = window.speechSynthesis;
  if (!synth) return;

  const player = () => document.querySelector('#movie_player');
  const video = () => player()?.querySelector('video');
  const curVid = () => (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null);
  const adShowing = () => !!document.querySelector('#movie_player.ad-showing, #movie_player.ad-interrupting');
  const JA = /[぀-ヿ一-鿿]/;

  const load = async () => { const { px = {} } = await chrome.storage.local.get('px'); cfg = { ...DEF, ...px }; };
  const ready = load();
  chrome.storage.onChanged.addListener(ch => {
    if (!ch.px) return;
    const was = cfg.speak;
    load().then(() => { if (was && !cfg.speak) stop(); paint(); });
  });

  // ---------- 声 ----------
  let voice = null;
  function pickVoice() {
    if (voice) return voice;
    const vs = synth.getVoices().filter(v => /^ja/i.test(v.lang));
    voice = vs.find(v => /natural|online/i.test(v.name)) || vs.find(v => /nanami|google|kyoko|haruka/i.test(v.name)) || vs[0] || null;
    return voice;
  }
  synth.addEventListener?.('voiceschanged', () => { voice = null; });

  // ---------- 読み上げのキュー ----------
  let queue = [], speaking = false, duckVol = null, idleT = null;
  function duck(on) {
    const v = video();
    if (!v) return;
    if (on && duckVol == null && cfg.speakDuck < 100) { duckVol = v.volume; v.volume = Math.max(0, Math.min(1, duckVol * cfg.speakDuck / 100)); }
    if (!on && duckVol != null) { v.volume = duckVol; duckVol = null; }
  }
  function next() {
    if (!cfg.speak) { stop(); return; }
    const t = queue.shift();
    if (!t) { speaking = false; clearTimeout(idleT); idleT = setTimeout(() => { if (!speaking) duck(false); }, 800); return; }
    speaking = true;
    clearTimeout(idleT);
    duck(true);
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ja-JP';
    const vo = pickVoice();
    if (vo) u.voice = vo;
    u.rate = cfg.speakRate;
    u.onend = next;
    u.onerror = e => { if (e.error && e.error !== 'canceled' && e.error !== 'interrupted') TG.log('読み上げ', '読み上げに失敗：' + e.error, 'warn'); next(); };
    synth.speak(u);
  }
  function enqueue(text) {
    // 文ごとに区切る（長いと途中で止まることがある）
    const parts = text.split(/(?<=[。！？!?])/).flatMap(s => s.match(/.{1,80}/gs) || []).map(s => s.trim()).filter(Boolean);
    queue.push(...parts);
    while (queue.length > 4) queue.shift(); // 遅れたら古い分を捨てる
    if (!speaking) next();
  }
  function stop() {
    queue = [];
    speaking = false;
    try { synth.cancel(); } catch { /* なし */ }
    clearTimeout(idleT);
    duck(false);
  }

  // ---------- 字幕を読み取る ----------
  let lastText = '', pend = '', pendAt = 0, vidFor = null;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  function captionText() {
    const segs = document.querySelectorAll('#movie_player .ytp-caption-window-container .ytp-caption-segment');
    return norm([...segs].map(s => s.textContent).join(' '));
  }
  // 伸びていく字幕：前に読んだ分と重なる部分を除いて、新しい部分だけにする
  function diff(prev, cur) {
    if (!prev) return cur;
    if (cur.startsWith(prev)) return cur.slice(prev.length).trim();
    if (prev.includes(cur)) return '';
    for (let k = Math.min(prev.length, cur.length) - 1; k >= 4; k--) {
      if (cur.startsWith(prev.slice(-k))) return cur.slice(k).trim();
    }
    return cur;
  }
  function poll() {
    if (!cfg.speak) return;
    const v = curVid();
    if (v !== vidFor) { vidFor = v; stop(); lastText = ''; pend = ''; }
    const vEl = video();
    if (!v || !vEl || vEl.paused || adShowing()) { if (adShowing()) stop(); return; }
    const cur = captionText();
    if (!cur) { pend = ''; return; }
    const now = Date.now();
    if (cur !== pend) { pend = cur; pendAt = now; return; }
    if (now - pendAt < 350 || cur === lastText) return; // 字幕が落ち着くまで少し待つ
    const add = diff(lastText, cur);
    lastText = cur;
    if (add && JA.test(add)) enqueue(add); // 日本語以外の字幕は読まない
  }

  // ---------- 止める・ボタン ----------
  const onVideo = (name, fn) => document.addEventListener(name, e => { if (e.target === video()) fn(); }, true);
  onVideo('pause', () => { stop(); });
  onVideo('seeking', () => { stop(); lastText = ''; pend = ''; });
  onVideo('emptied', () => { stop(); lastText = ''; pend = ''; });
  window.addEventListener('pagehide', () => { try { synth.cancel(); } catch { /* なし */ } });

  function paint() {
    const p = player();
    const b = p?.querySelector('.tg-px-spk');
    if (b) b.classList.toggle('on', !!cfg.speak);
    p?.classList.toggle('tg-spk-hide', !!(cfg.speak && cfg.speakHide));
  }
  function ensureBtn() {
    const p = player(), ctr = p?.querySelector('.ytp-right-controls-left') || p?.querySelector('.ytp-right-controls');
    if (!ctr || !curVid()) return;
    if (!ctr.querySelector('.tg-px-spk')) {
      const b = document.createElement('button');
      b.className = 'ytp-button tg-px-spk';
      b.title = '字幕の読み上げ（CaptionSpeaker）';
      b.innerHTML = '<span>読</span>';
      ['mousedown', 'keydown'].forEach(t => b.addEventListener(t, e => e.stopPropagation()));
      b.addEventListener('click', async e => {
        e.stopPropagation();
        const { px = {} } = await chrome.storage.local.get('px');
        const speak = !(px.speak ?? DEF.speak);
        await chrome.storage.local.set({ px: { ...px, speak }, prefsAt: Date.now() });
      });
      ctr.insertBefore(b, ctr.firstChild);
    }
    paint();
  }

  ready.then(() => setInterval(() => { ensureBtn(); poll(); }, 250));
})();
