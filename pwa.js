const installButton = document.getElementById('install-app');
const installHelp = document.getElementById('install-help');
const status = document.getElementById('offline-status');
const updateButton = document.getElementById('update-app');
let installPrompt;
let offlineReady = false;
let updating = false;
function showStatus() {
  status.textContent = offlineReady
    ? (navigator.onLine ? '離線內容已備妥，可離線使用 200 項任務。' : '目前離線，可繼續選任務、帶入範例及生成提示詞。')
    : (navigator.onLine ? '首次開啟請保持連線，正在準備離線內容…' : '目前離線；首次使用須連線下載內容。');
}
function showInstalled() {
  installButton.hidden = true;
  installHelp.open = false;
}
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) showInstalled();
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
window.addEventListener('appinstalled', () => { installPrompt = null; showInstalled(); });
installButton.addEventListener('click', async () => {
  if (!installPrompt) { installHelp.open = true; return; }
  const prompt = installPrompt;
  installPrompt = null;
  await prompt.prompt();
  if ((await prompt.userChoice).outcome === 'accepted') installButton.hidden = true;
});
window.addEventListener('online', showStatus);
window.addEventListener('offline', showStatus);
if ('serviceWorker' in navigator) {
  showStatus();
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload();
  });
  navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).then(registration => {
    const showUpdate = () => {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      updateButton.hidden = false;
      updateButton.onclick = () => {
        updating = true;
        registration.waiting?.postMessage({type: 'SKIP_WAITING'});
      };
    };
    showUpdate();
    const watchInstall = () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        showUpdate();
        if (worker.state === 'redundant' && !offlineReady) status.textContent = '離線內容下載未完成，請保持連線並重新整理後再試。';
      });
    };
    watchInstall();
    registration.addEventListener('updatefound', watchInstall);
    return navigator.serviceWorker.ready;
  }).then(() => { offlineReady = true; showStatus(); }).catch(() => {
    status.textContent = '離線內容尚未準備完成，請保持連線並重新整理後再試。';
  });
} else {
  status.textContent = '目前瀏覽器不支援離線快取，請連線使用。';
}
