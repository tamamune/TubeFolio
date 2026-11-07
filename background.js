// Google Drive 同期（バックグラウンド）
// 認証: chrome.identity.launchWebAuthFlow（組み込みのOAuthクライアントID。設定で別のIDにも変えられる）
// 保存先: マイドライブ直下の TubeFolio-sync.json（drive.file 権限＝この拡張が作ったファイルだけ触れる）
importScripts('shared.js');

const FILE = 'TubeFolio-sync.json';
const OLD_FILE = TG.LEGACY_APP + '-sync.json'; // 名前を変える前のファイル（見つけたら TubeFolio-sync.json に名前を変える）
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

// 拡張機能に組み込むクライアントID（manifest の key で拡張機能のIDが固定なので、どのPCでも同じIDが使える）
//   ここに入っていれば、新しいPCでもクライアントIDの入力は不要（「Google Drive に接続」を押すだけ）
const BUILTIN_CLIENT_ID = '553603750505-7g02mobn8i1f8sjh3l713bvdvbktrtn5.apps.googleusercontent.com';

async function getSync() {
  const { sync = {} } = await chrome.storage.local.get('sync');
  if (!sync.clientId && BUILTIN_CLIENT_ID) return { ...sync, clientId: BUILTIN_CLIENT_ID, builtin: true };
  return { ...sync, builtin: !!BUILTIN_CLIENT_ID && sync.clientId === BUILTIN_CLIENT_ID };
}
async function setSync(patch) {
  const s = { ...(await getSync()), ...patch };
  await chrome.storage.local.set({ sync: s });
  return s;
}

// ---------- 認証 ----------
async function token(interactive) {
  const s = await getSync();
  if (!s.clientId) throw new Error('クライアントIDが設定されていません');
  const { tok } = await chrome.storage.session.get('tok');
  if (tok && tok.exp > Date.now() + 60e3) return tok.value;
  if (!interactive && s.needReauth && Date.now() - (s.needReauthAt || 0) < 30 * 60e3) throw new Error('再接続が必要です（⚙ →「同期・バックアップ」→「Google Drive に再接続」）');
  // 裏で取り直すとき（1時間ごと・拡張機能の再読み込み後）は、接続したアカウントを指定する
  //   （Googleアカウントが複数あると、指定しないと interaction_required になる）
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: s.clientId,
    response_type: 'token',
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: SCOPE,
    ...(s.email ? { login_hint: s.email } : {}),
    ...(interactive ? (s.email ? {} : { prompt: 'select_account' }) : { prompt: 'none' })
  });
  let res;
  try {
    res = await chrome.identity.launchWebAuthFlow({ url, interactive, ...(interactive ? {} : { abortOnLoadForNonInteractive: false, timeoutMsForNonInteractive: 15000 }) });
  } catch (e) {
    if (!interactive) await setSync({ needReauth: true, needReauthAt: Date.now() });
    throw new Error(interactive ? '認証がキャンセルされたか失敗しました' : '再接続が必要です（⚙ →「同期・バックアップ」→「Google Drive に再接続」）');
  }
  const h = new URLSearchParams(new URL(res).hash.slice(1));
  const value = h.get('access_token');
  if (!value) {
    if (!interactive) await setSync({ needReauth: true, needReauthAt: Date.now() });
    throw new Error('認証に失敗しました：' + (h.get('error') || '不明なエラー') + (interactive ? '' : '（⚙ →「同期・バックアップ」で再接続してください）'));
  }
  await chrome.storage.session.set({ tok: { value, exp: Date.now() + (+h.get('expires_in') || 3600) * 1000 } });
  if (s.needReauth) await setSync({ needReauth: false });
  return value;
}

async function api(path, opt = {}, interactive = false) {
  for (let i = 0; i < 2; i++) {
    const t = await token(interactive);
    const r = await fetch('https://www.googleapis.com' + path, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + t } });
    if (r.status === 401 && i === 0) { await chrome.storage.session.remove('tok'); continue; }
    if (!r.ok) throw new Error(`Google Drive エラー (${r.status})`);
    return r;
  }
}

async function findFile(interactive) {
  const q = encodeURIComponent(`(name='${FILE}' or name='${OLD_FILE}') and trashed=false`);
  const r = await api(`/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&spaces=drive`, {}, interactive);
  const f = (await r.json()).files?.[0] || null;
  if (f && f.name !== FILE) {
    try {
      await api(`/drive/v3/files/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FILE }) }, interactive);
      TG.log('同期', `Driveのファイル名を ${FILE} に変更しました`);
      f.name = FILE;
    } catch (e) { TG.log('同期', 'Driveのファイル名を変えられませんでした：' + e.message, 'warn'); }
  }
  return f;
}

async function upload(data, interactive) {
  const body = JSON.stringify(data);
  const f = await findFile(interactive);
  if (f) {
    await api(`/upload/drive/v3/files/${f.id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }, interactive);
  } else {
    const b = 'tgb' + Date.now();
    const mp = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE, mimeType: 'application/json' })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
    await api('/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body: mp }, interactive);
  }
  return body.length;
}

async function download(interactive) {
  const f = await findFile(interactive);
  if (!f) return null;
  const r = await api(`/drive/v3/files/${f.id}?alt=media`, {}, interactive);
  return r.json();
}

// ---------- 操作 ----------
// 保存する種類（設定のチェック。初期値はすべてオン）
const syncOpts = s => ({ meta: s.includeMeta !== false, history: s.incHistory !== false, later: s.incLater !== false, prefs: s.incPrefs !== false });

const kbs = n => n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
function describe(data) {
  const a = data.aux || {};
  const parts = [`フォルダ ${(data.folders || []).length}`, `チャンネル ${Object.keys(data.channels || {}).length}`];
  if (a.history) parts.push(`視聴記録 ${Object.keys(a.history.history || {}).length}本`);
  if (a.later) parts.push(`後で見る ${(a.later.later || []).length}本`);
  if (!a.later) parts.push('後で見る：対象外');
  return parts.join('・');
}
async function push(interactive, why = '') {
  const s = await getSync();
  const data = await TG.exportData(syncOpts(s));
  const bytes = await upload(data, interactive);
  TG.log('同期', `Driveへ保存${why ? `（${why}）` : ''}：${describe(data)}／${kbs(bytes)}`);
  auxDirty = false;
  await chrome.storage.session.set({ auxDirty: false });
  await setSync({ syncedSavedAt: data.savedAt, lastSyncAt: Date.now(), lastBytes: bytes, lastError: '', lastRemoteSeen: data.exportedAt });
  return { bytes };
}

async function pull(interactive) {
  const data = await download(interactive);
  if (!data) throw new Error('Google Drive にまだ保存されていません');
  TG.log('同期', `Driveから読み込み（手動）：${describe(data)}`);
  data._reason = 'Driveから読み込む前の状態';
  data.aux = pickAux(data.aux, await getSync());
  const r = await TG.importData(data, { forcePrefs: true }); // 手動はDriveの設定を必ず反映
  await setSync({ syncedSavedAt: data.savedAt, lastSyncAt: Date.now(), lastError: '' });
  return r;
}

// 新しい方に合わせる（自動同期用）
let lastAutoPull = 0;
async function autoPull() {
  const s = await getSync();
  if (!s.auto || !s.connected || Date.now() - lastAutoPull < 5 * 60e3) return { skipped: true };
  lastAutoPull = Date.now();
  const remote = await download(false);
  if (!remote) TG.log('同期', '自動同期：Driveにファイルがありません', 'warn');
  const { savedAt = 0 } = await chrome.storage.local.get('savedAt');
  const localUnsynced = savedAt && savedAt !== s.syncedSavedAt; // このPCにDriveへ未保存の変更がある
  if (remote && (remote.savedAt || 0) > savedAt && !localUnsynced) {
    TG.log('同期', `自動同期：Driveの方が新しいので読み込み（${describe(remote)}）`);
    remote._reason = '自動同期で読み込む前の状態';
    remote.aux = pickAux(remote.aux, s);
    await TG.importData(remote);
    await setSync({ syncedSavedAt: remote.savedAt, lastSyncAt: Date.now(), lastError: '', lastRemoteSeen: remote.exportedAt });
    return { pulled: true };
  }
  // フォルダは同じでも、別のPCで増えた視聴記録・後で見るなどは合体させる
  if (remote?.aux && remote.exportedAt && remote.exportedAt !== s.lastRemoteSeen) {
    TG.log('同期', `自動同期：別のPCの変更を合体（${describe(remote)}）`);
    await TG.mergeAux(pickAux(remote.aux, s));
    await setSync({ lastRemoteSeen: remote.exportedAt });
    auxDirty = true;
  }
  if ((savedAt && savedAt !== s.syncedSavedAt) || auxDirty) { await push(false, '自動同期'); return { pushed: true }; }
  return { same: true };
}

// 読み込む種類も設定に合わせる
function pickAux(aux, s) {
  if (!aux) return aux;
  const o = syncOpts(s);
  return Object.fromEntries(Object.entries(aux).filter(([k]) => o[k] !== false));
}

// ---------- 視聴記録・後で見る・設定の自動保存 ----------
//   後で見る・設定：変更から10秒後 ／ 視聴記録・視聴済み：30分ごと＋YouTubeのタブを閉じたとき
let auxDirty = false, auxT = null;
chrome.storage.session.get('auxDirty').then(r => { auxDirty = auxDirty || !!r.auxDirty; });
const HIST_KEYS = new Set(TG.AUX.history);
const SOON_KEYS = new Set([...TG.AUX.later, ...TG.AUX.prefs, 'tagEditAt']); // tagEditAt＝ランダム用のタグを手で編集した印（これが変わると10秒後に保存。自動で溜まる分は30分ごと）
async function pushIfDirty(why = '') {
  const s = await getSync();
  if (!s.auto || !s.connected || !auxDirty) return;
  try { await push(false, why); } catch (e) { TG.log('同期', 'Driveへの保存に失敗：' + e.message, 'error'); await setSync({ lastError: e.message, lastErrorAt: Date.now() }); }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local') return;
  const keys = Object.keys(ch);
  // 設定を変えた時刻（同期の読み込みで変わった場合は除く）
  const PREF_KEYS = TG.AUX.prefs.filter(k => k !== 'prefsAt');
  if (!ch.prefsAt && keys.some(k => PREF_KEYS.includes(k))) chrome.storage.local.set({ prefsAt: Date.now() });
  if (keys.some(k => HIST_KEYS.has(k) || SOON_KEYS.has(k))) {
    if (!auxDirty) { auxDirty = true; chrome.storage.session.set({ auxDirty: true }); }
  }
  if (keys.some(k => SOON_KEYS.has(k))) {
    clearTimeout(auxT);
    auxT = setTimeout(() => pushIfDirty('後で見る・設定の変更'), 10000);
  }
});
chrome.alarms.get('tg-sync').then(a => { if (!a) chrome.alarms.create('tg-sync', { periodInMinutes: 30, delayInMinutes: 30 }); });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'tg-sync') pushIfDirty('30分ごと'); });

// YouTubeのタブを閉じたら保存（どのタブがYouTubeかは、ページ側から知らせてもらう）
const ytTabs = new Set();
chrome.storage.session.get('ytTabs').then(r => (r.ytTabs || []).forEach(id => ytTabs.add(id)));
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'tg-hello' || !sender.tab) return;
  ytTabs.add(sender.tab.id);
  chrome.storage.session.set({ ytTabs: [...ytTabs] });
});
chrome.tabs.onRemoved.addListener(id => {
  if (!ytTabs.delete(id)) return;
  chrome.storage.session.set({ ytTabs: [...ytTabs] });
  setTimeout(() => pushIfDirty('YouTubeのタブを閉じた'), 2000); // ページ側の最後の保存を待つ
});

// フォルダ設定が保存されたら少し待ってから自動アップロード
let upT = null;
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local' || !ch.savedAt) return;
  clearTimeout(upT);
  upT = setTimeout(async () => {
    const s = await getSync();
    if (!s.auto || !s.connected) return;
    const { savedAt } = await chrome.storage.local.get('savedAt');
    if (savedAt === s.syncedSavedAt) return; // Driveから読み込んだ直後など
    try { await push(false, 'フォルダ設定の変更'); }
    catch (e) {
      TG.log('同期', 'Driveへの保存に失敗（1分後に再試行）：' + e.message, 'error');
      await setSync({ lastError: e.message, lastErrorAt: Date.now() });
      setTimeout(() => push(false, '再試行').catch(e2 => TG.log('同期', '再試行も失敗：' + e2.message, 'error')), 60e3); // 1分後にもう一度
    }
  }, 5000);
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== 'drive') return;
  (async () => {
    switch (msg.op) {
      case 'status': return { ...(await getSync()), redirect: chrome.identity.getRedirectURL() };
      case 'setClient': return setSync({ clientId: (msg.clientId || '').trim() });
      case 'setOpt': return setSync(msg.patch || {});
      case 'connect': {
        TG.log('同期', 'Google Drive に接続');
        await chrome.storage.session.remove('tok');
        const t = await token(true);
        // 次から裏で取り直すときに使うアカウント（Driveの情報から）
        let email = '';
        try { email = (await (await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: 'Bearer ' + t } })).json())?.user?.emailAddress || ''; } catch { /* 取れなくても続ける */ }
        // TubeFolio のデータは基本 Drive に保存して他の端末と共有（自分で自動同期を切った場合はそのまま）
        const cur = await getSync();
        await setSync({ connected: true, lastError: '', needReauth: false, ...(email ? { email } : {}), ...(cur.autoUserOff ? {} : { auto: true }) });
        TG.log('同期', 'Google Drive に接続しました' + (email ? `（${email.replace(/(.{2}).*(@.*)/, '$1…$2')}）` : ''));
        const remote = await findFile(false);
        return { connected: true, hasRemote: !!remote };
      }
      case 'disconnect': {
        const { tok } = await chrome.storage.session.get('tok');
        if (tok?.value) fetch('https://oauth2.googleapis.com/revoke?token=' + tok.value, { method: 'POST' }).catch(() => {});
        await chrome.storage.session.remove('tok');
        return setSync({ connected: false, auto: false });
      }
      case 'push': return push(true, '手動');
      case 'pull': return pull(true);
      case 'peek': {
        const d = await download(true);
        return d ? { savedAt: d.savedAt || 0, folders: (d.folders || []).length, channels: Object.keys(d.channels || {}).length } : { none: true };
      }
      case 'autoPull': return autoPull();
    }
  })().then(r => reply({ ok: true, ...r }), e => {
    TG.log('同期', `${msg.op} に失敗：${e.message}`, 'error');
    setSync({ lastError: e.message });
    reply({ ok: false, error: e.message });
  });
  return true;
});

// ---------- 新着の定期確認と通知 ----------
// 決めた間隔（初期15分）ごとに、開いているYouTubeのタブに新着の確認を依頼する（YouTubeのログイン情報を使うため）
async function setupCheckAlarm() {
  const iv = Math.max(5, (await TG.notifyRules()).interval || 15);
  const a = await chrome.alarms.get('tg-check');
  if (!a || a.periodInMinutes !== iv) chrome.alarms.create('tg-check', { periodInMinutes: iv, delayInMinutes: 1 });
  const q = await chrome.alarms.get('tg-queue');
  if (!q) chrome.alarms.create('tg-queue', { periodInMinutes: 5, delayInMinutes: 1 });
}
chrome.runtime.onInstalled.addListener(setupCheckAlarm);
chrome.runtime.onStartup.addListener(setupCheckAlarm);
setupCheckAlarm();
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.notifyRules) setupCheckAlarm(); });

async function askTab(msg) {
  const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
  if (!tabs.length) return { ok: false, error: 'YouTubeのタブが開いていません（YouTubeを開いてからもう一度押してください）' };
  tabs.sort((a, b) => (b.active - a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
  for (const t of tabs) {
    try { return await chrome.tabs.sendMessage(t.id, msg); } catch { /* 拡張機能の更新前に開いたタブ等 */ }
  }
  return { ok: false, error: 'YouTubeのタブを再読み込みしてください' };
}
const askTabToCheck = force => askTab({ type: 'tg-check', force });

chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'tg-check') {
    flushQueue();
    askTabToCheck(false).then(r => { if (r && r.ok === false) TG.log('新着', '定期確認：' + r.error, 'warn'); });
  }
  if (a.name === 'tg-queue') flushQueue();
});

// 時間帯待ちの通知を、時間になったら出す
async function flushQueue() {
  const { notifyQueue = [] } = await chrome.storage.local.get('notifyQueue');
  if (!notifyQueue.length) return;
  const now = Date.now();
  const due = notifyQueue.filter(x => x.due <= now);
  if (!due.length) return;
  await chrome.storage.local.set({ notifyQueue: notifyQueue.filter(x => x.due > now) });
  // 古すぎるもの（2日以上待った）は出さない
  deliver(due.filter(x => now - x.due < 2 * 864e5), '時間帯');
}

const notifUrl = new Map();
const LV = { high: 3, normal: 2, low: 1 };
const KIND = { live: '🔴 配信中', upcoming: '⏰ 配信予定', kw: '⚡', new: '' };
const label = it => `${KIND[it.kind] ? KIND[it.kind] + ' ' : ''}【${it.folder}】${it.ch}`;
const watchUrl = v => 'https://www.youtube.com/watch?v=' + v;

async function deliver(items, why = '') {
  if (!items.length) return;
  const rules = await TG.notifyRules();
  TG.log('通知', `${why ? why + '：' : ''}${items.length}本 ` + items.slice(0, 5).map(x => `${label(x)}（${x.level === 'high' ? '高' : x.level === 'low' ? '低' : '中'}）`).join('、'));
  let toPage = rules.show !== 'pc', toPc = rules.show !== 'page';
  if (toPage) {
    const r = await askTab({ type: 'tg-toast', items });
    if (!r?.ok) { toPage = false; toPc = true; } // YouTubeのタブが無ければPCの通知で
  }
  if (!toPc) return;
  const icon = chrome.runtime.getURL('icons/icon128.png');
  // 重要度の高いものは個別に（閉じるまで残す）、ほかは4本以上ならまとめて1つに
  const high = items.filter(x => x.level === 'high');
  const rest = items.filter(x => x.level !== 'high');
  const single = it => {
    const id = 'tg-' + it.v + '-' + Date.now() + Math.random().toString(36).slice(2, 5);
    notifUrl.set(id, watchUrl(it.v));
    const when = it.kind === 'upcoming' && it.at ? `（${new Date(it.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}〜）` : '';
    chrome.notifications.create(id, {
      type: 'basic', iconUrl: icon, title: label(it), message: it.title + when,
      priority: it.level === 'high' ? 2 : it.level === 'low' ? 0 : 1,
      requireInteraction: it.level === 'high', silent: it.level === 'low'
    });
  };
  high.forEach(single);
  if (rest.length <= 3) rest.forEach(single);
  else {
    const id = 'tg-many-' + Date.now();
    notifUrl.set(id, 'https://www.youtube.com/feed/subscriptions');
    const folders = [...new Set(rest.map(x => x.folder))].join('・');
    chrome.notifications.create(id, {
      type: 'list', iconUrl: icon, title: `新着 ${rest.length} 本（${folders}）`, message: '',
      items: rest.slice(0, 5).map(x => ({ title: x.ch, message: x.title })), priority: 1,
      silent: rest.every(x => x.level === 'low')
    });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'tg-check-now') { askTabToCheck(true).then(reply); return true; }
  if (msg?.type === 'tg-hist-now') { askTab({ type: 'tg-hist' }).then(reply); return true; }
  if (msg?.type === 'tg-notify-test') {
    deliver([{ v: 'dQw4w9WgXcQ', title: 'テスト通知です（クリックで動画を開きます）', ch: 'TubeFolio', folder: 'テスト', level: msg.level || 'normal', kind: msg.kind || 'new' }], 'テスト').then(() => reply({ ok: true }));
    return true;
  }
  if (msg?.type !== 'tg-notify') return;
  deliver(msg.items || []);
});

chrome.notifications.onClicked.addListener(id => {
  const url = notifUrl.get(id);
  if (url) chrome.tabs.create({ url });
  chrome.notifications.clear(id);
});

// 視聴記録の画面を開く（すでに開いていればそのタブへ）
// （chrome.tabs.query の url 指定は tabs 権限が無いと無視され、関係ないタブが選ばれてしまうので使わない）
async function openOwnPage(file) {
  const url = chrome.runtime.getURL(file);
  try {
    const ctx = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
    const c = ctx.find(x => x.tabId >= 0);
    if (c) {
      const tab = await chrome.tabs.update(c.tabId, { active: true });
      if (tab?.windowId != null) chrome.windows.update(tab.windowId, { focused: true });
      return;
    }
  } catch (e) { /* 古いChrome（getContexts なし）は新しいタブで開く */ }
  await chrome.tabs.create({ url });
  TG.log('拡張', `${file === 'log.html' ? '動作ログ' : '視聴記録'}の画面を開いた`);
}
chrome.runtime.onMessage.addListener(msg => {
  if (msg?.type !== 'openStats') return;
  openOwnPage('stats.html').catch(e => TG.log('拡張', '視聴記録の画面を開けません：' + e.message, 'error'));
});

// ---------- 動作ログ ----------
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'tg-log') { TG.writeLog((msg.items || []).slice(0, 200)); return; }
  if (msg?.type !== 'openPage') return;
  openOwnPage(msg.page === 'log' ? 'log.html' : 'stats.html').catch(e => TG.log('拡張', '画面を開けません：' + e.message, 'error'));
});
chrome.runtime.onInstalled.addListener(d => TG.log('拡張', d.reason === 'update' ? `更新しました（v${chrome.runtime.getManifest().version}）` : `インストール：${d.reason}`));
chrome.runtime.onStartup.addListener(() => TG.log('拡張', 'ブラウザ起動'));

// 字幕検索（v4.23）をやめたので、このPCに保存した字幕を消す
chrome.runtime.onInstalled.addListener(async () => {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(k => k.startsWith('tr:') || k === 'trIdx' || k === 'trOpts');
  if (keys.length) await chrome.storage.local.remove(keys);
});

// ---------- 以前の「一時的に YouTube の視聴履歴に残さない（histOff）」の後片付け ----------
//   履歴オフは「視聴履歴を踏まえずにホーム・おすすめを探す」機能（noHist）に変わったので、
//   再生の記録を止めていた通信のブロックを外し、古い設定を消す
const HIST_RULES = [9101, 9102];
async function clearOldHistOff() {
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: HIST_RULES });
  chrome.alarms.clear('tg-histoff');
  const { histOff } = await chrome.storage.local.get('histOff');
  if (histOff) await chrome.storage.local.remove('histOff');
}
chrome.runtime.onStartup.addListener(() => clearOldHistOff().catch(() => {}));
chrome.runtime.onInstalled.addListener(() => clearOldHistOff().catch(() => {}));
clearOldHistOff().catch(() => {});

// ---------- Return YouTube Dislike（推定の高評価・低評価）と、翻訳（他言語で検索） ----------
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'ryd') {
    fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(msg.v)}`)
      .then(r => (r.ok ? r.json() : null)).then(j => reply(j ? { likes: j.likes || 0, dislikes: j.dislikes || 0, views: j.viewCount || 0 } : null)).catch(() => reply(null));
    return true;
  }
  // 追加機能（xtra.js）用：決まったサイトへの GET だけ中継する
  if (msg?.type === 'xfetch') {
    let u;
    try { u = new URL(msg.url); } catch { reply(null); return; }
    const OK = ['sponsor.ajay.app', 'api.github.com', 'ja.wikipedia.org', 'en.wikipedia.org', 'api.open-meteo.com', 'geocoding-api.open-meteo.com', 'ipapi.co', 'archive.org'];
    if (u.protocol !== 'https:' || !OK.includes(u.hostname)) { reply(null); return; }
    fetch(u.href, { credentials: 'omit', headers: u.hostname === 'api.github.com' ? { Accept: 'application/vnd.github+json' } : {} })
      .then(r => (r.ok ? (msg.as === 'text' ? r.text() : r.json()) : (msg.st ? { _http: r.status } : null))).then(reply, () => reply(null));
    return true;
  }
  if (msg?.type === 'translate') {
    const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(msg.to)}&dt=t&q=${encodeURIComponent(msg.q)}`;
    fetch(u).then(r => (r.ok ? r.json() : null)).then(j => reply(j ? (j[0] || []).map(x => x[0]).join('') : null)).catch(() => reply(null));
    return true;
  }
});

// チャート（charts.youtube.com）から、再生リストの一覧・追加を頼まれたら、開いている YouTube のタブへ中継する
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== 'tg-chart') return;
  (async () => {
    const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
    let last = 'YouTube のタブを開いてから、もう一度押してください（ログインしている状態で）';
    for (const t of tabs) {
      try {
        const r = await chrome.tabs.sendMessage(t.id, { ...msg, type: 'tg-chart-yt' });
        if (r && !r.error) return reply(r);
        if (r?.error) last = r.error;
      } catch { /* そのタブは拡張機能が動いていない */ }
    }
    reply({ error: last });
  })();
  return true;
});

// Google トレンドの急上昇ワード（日本）。RSS を取って、ワードごとにニュースも付けて返す（30分は覚えておく）
const TRENDS_TTL = 30 * 60e3;
function xmlText(s) {
  return (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();
}
const xmlTag = (s, t) => { const m = s.match(new RegExp('<' + t + '(?: [^>]*)?>([^]*?)</' + t + '>')); return m ? xmlText(m[1]) : ''; }; // [^] ＝ 改行も含む任意の文字
// 急上昇のページ：ページに埋め込まれているデータ（AF_initDataCallback の ds:0）から、関連度順に上位 N 件。
//   hours は 4 か 24。ds:0 が読めないときは、ページの表（25件ほど）から読む
async function fetchTrendsPage(hours, limit) {
  const res = await fetch('https://trends.google.co.jp/trending?geo=JP&hours=' + hours + '&hl=ja', { credentials: 'omit' });
  if (!res.ok) throw new Error('急上昇のページを取得できませんでした（' + res.status + '）');
  const html = await res.text();
  try {
    const m = html.match(/AF_initDataCallback\(\{key: 'ds:0', hash: '[0-9]+', data:/);
    if (m) {
      const rest = html.slice(m.index + m[0].length);
      const d = JSON.parse(rest.slice(0, rest.indexOf(', sideChannel')));
      const items = (d[1] || []).filter(x => Array.isArray(x) && x[0]).slice(0, limit).map(x => ({
        title: String(x[0]), start: x[3]?.[0] || 0, end: x[4]?.[0] || 0, vol: +x[6] || 0, pct: +x[8] || 0,
        related: (x[9] || []).filter(w => w && w !== x[0]).slice(0, 12)
      }));
      if (items.length) return items;
    }
  } catch { /* 表から読む */ }
  const cls = (b, c) => { const mm = b.match(new RegExp('class="' + c + '"[^>]*>([^<]*)<')); return mm ? xmlText(mm[1]) : ''; };
  return (html.match(/<tr[^>]*data-row-id[^]*?<\/tr>/g) || []).map(row => ({
    title: cls(row, 'mZ3RIc'), traffic: cls(row, 'lqv0Cb'), pctText: cls(row, 'TXt85b'), agoText: cls(row, 'A7jE4'),
    related: [...new Set([...row.matchAll(/data-term="([^"]+)"/g)].map(mm => xmlText(mm[1])))]
  })).filter(x => x.title).slice(0, limit);
}
async function fetchTrends(hours) {
  const items = (await fetchTrendsPage(hours, 50)).map(x => ({ ...x, news: [] })); // ニュースは、ワードにマウスを乗せたときに Bing ニュースで探す
  if (!items.length) throw new Error('急上昇ワードを読み取れませんでした（Google トレンドのページの作りが変わった可能性があります）');
  return { at: Date.now(), hours, items };
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== 'tg-trends') return;
  (async () => {
    const hours = msg.hours === 4 ? 4 : 24;
    const key = 'trendsCache' + hours;
    const cached = (await chrome.storage.local.get(key))[key];
    const age = cached ? Date.now() - cached.at : Infinity;
    if (cached && age < (msg.force ? 60e3 : TRENDS_TTL)) return reply(cached); // 取り直しでも1分以内なら使い回す
    try {
      const fresh = await fetchTrends(hours);
      await chrome.storage.local.set({ [key]: fresh });
      reply(fresh);
    } catch (e) { reply(cached || { error: e.message }); }
  })();
  return true;
});
// ワードのニュース（急上昇の RSS に無いワード用）：Bing ニュースの検索 RSS から3件（記事の画像つき）。取れなければ Google ニュースの RSS（画像なし）
const newsMem = new Map();
async function newsFromBing(q) {
  const res = await fetch('https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&format=rss&setlang=ja&cc=JP', { credentials: 'omit' });
  if (!res.ok) throw new Error('bing ' + res.status);
  const xml = await res.text();
  const all = xml.split('<item>').slice(1, 11).map(raw => {
    const body = raw.split('</item>')[0];
    let url = xmlTag(body, 'link');
    try { const u = new URL(url).searchParams.get('url'); if (u) url = u; } catch { /* そのまま */ } // Bing の中継ではなく、記事のアドレスへ
    const img = xmlTag(body, 'News:Image').replace(/^http:/, 'https:');
    return { title: xmlTag(body, 'title'), url, source: xmlTag(body, 'News:Source'), picture: img ? img + '&w=120&h=120&c=14' : '' };
  }).filter(n => n.title && /^https?:\/\//.test(n.url));
  // 画像のある記事を先に（元の順は保つ）。3件に絞る
  return [...all.filter(n => n.picture), ...all.filter(n => !n.picture)].slice(0, 3);
}
async function newsFromGoogle(q) {
  const res = await fetch('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=ja&gl=JP&ceid=JP:ja', { credentials: 'omit' });
  if (!res.ok) throw new Error('google ' + res.status);
  const xml = await res.text();
  return xml.split('<item>').slice(1, 4).map(raw => {
    const body = raw.split('</item>')[0];
    let title = xmlTag(body, 'title'); const source = xmlTag(body, 'source');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    return { title, url: xmlTag(body, 'link'), source, picture: '' };
  }).filter(n => n.title && /^https?:\/\//.test(n.url));
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== 'tg-trend-news' || !msg.q) return;
  (async () => {
    const hit = newsMem.get(msg.q);
    if (hit && Date.now() - hit.at < 30 * 60e3) return reply({ news: hit.news });
    let news = [];
    try { news = await newsFromBing(msg.q); } catch { /* 次へ */ }
    if (!news.length) { try { news = await newsFromGoogle(msg.q); } catch { /* なし */ } }
    newsMem.set(msg.q, { at: Date.now(), news });
    if (newsMem.size > 200) newsMem.delete(newsMem.keys().next().value);
    reply({ news });
  })();
  return true;
});

// 急上昇動画（日本）：Top1Trend（t1trend.com）の「日別 Top 50」の一覧ページから読む。
//   最新は /youtube/jp、日付ごとは /youtube/jp/YYYY-MM-DD。直近10日ほどは日付ごとの保存が無く、最新と同じ一覧が返る（same で知らせる）
const T1_TTL = 30 * 60e3;
function t1Decode(s) {
  return xmlText(s).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d));
}
function t1Tokens(x) {
  return x.replace(/<svg[^]*?<\/svg>/g, '').replace(/<(script|style)[^]*?<\/\1>/g, '').split(/<[^>]+>/).map(s => t1Decode(s).trim()).filter(Boolean);
}
function t1Parse(html) {
  const out = new Map();
  const idOf = s => (s.match(/href="\/youtube\/video_([\w-]{11})"/) || [])[1];
  for (const part of html.split('<div data-slot="card"')) { // 1〜3位のカード
    if (!/(1st|2nd|3rd)<!-- --> Place/.test(part.slice(0, 3000))) continue;
    const id = idOf(part); if (!id) continue;
    const t = t1Tokens(part.slice(0, 9000)), i = t.indexOf('Place'), p = t.indexOf('pts');
    out.set(id, { id, rank: +t[i + 2], dur: t[i + 1], title: t[i + 3], channel: t[i + 4], views: '', score: p > 0 ? t[p - 1] : '' });
  }
  for (const row of html.match(/<tr data-slot="table-row"[^]*?<\/tr>/g) || []) { // 4位以降の表
    const id = idOf(row); if (!id || out.has(id)) continue;
    const t = t1Tokens(row), d = t.findIndex(s => /^\d+:\d\d(?::\d\d)?$/.test(s));
    if (d < 0) continue;
    out.set(id, { id, rank: +t.find(s => /^\d+$/.test(s)), dur: t[d], title: t[d + 1], channel: t[d + 2], views: t[d + 3] || '', score: /^\d+$/.test(t[t.length - 1]) ? t[t.length - 1] : '' });
  }
  return [...out.values()].filter(x => x.title).sort((a, b) => a.rank - b.rank);
}
async function t1Fetch(date) {
  const res = await fetch('https://t1trend.com/youtube/jp' + (date && date !== 'latest' ? '/' + date : ''), { credentials: 'omit' });
  if (!res.ok) throw new Error('Top1Trend から取得できませんでした（' + res.status + '）');
  const items = t1Parse(await res.text());
  if (!items.length) throw new Error('一覧を読み取れませんでした（Top1Trend のページの作りが変わった可能性があります）');
  return items;
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== 'tg-t1') return;
  (async () => {
    const date = /^\d{4}-\d\d-\d\d$/.test(msg.date) ? msg.date : 'latest';
    const key = 't1_' + date;
    const c = (await chrome.storage.local.get(key))[key];
    const ttl = date === 'latest' ? T1_TTL : 24 * 3600e3;
    if (c && Date.now() - c.at < (msg.force ? 60e3 : ttl)) return reply(c);
    try {
      const items = await t1Fetch(date);
      let same = false;
      if (date !== 'latest') { // 日付ごとの保存が無い日は、最新と同じ一覧が返る
        const l = await chrome.storage.local.get('t1_latest');
        const latest = l.t1_latest && Date.now() - l.t1_latest.at < T1_TTL ? l.t1_latest.items : await t1Fetch('latest').catch(() => null);
        if (latest) same = latest.map(x => x.id).join() === items.map(x => x.id).join();
      }
      const fresh = { at: Date.now(), date, same, items };
      await chrome.storage.local.set({ [key]: fresh });
      reply(fresh);
    } catch (e) { reply(c || { error: e.message }); }
  })();
  return true;
});
