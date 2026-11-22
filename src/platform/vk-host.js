// Initialize the official VK Bridge before parsing the 3D game bundle.
// The ordinary browser build must also work when no VK host is present.
(function initializeVkHost() {
  const bridge = window.vkBridge;
  const params = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams((window.location.hash||'').replace(/^#/,''));
  let vkReferrer = false;
  try {vkReferrer=/(^|\.)(vk\.com|vk\.ru|vk\.me)$/.test(new URL(window.document.referrer).hostname);} catch (_) {}
  const embedded = params.has('vk_app_id') || params.has('vk_platform') || fragment.has('vk_app_id') || Boolean(bridge?.isWebView?.()) || Boolean(vkReferrer&&bridge?.isEmbedded?.());
  const state = {embedded, status: embedded ? 'connecting' : 'standalone', error: null};
  window.palataVkHost = state;
  if (!embedded) return;

  function setStatus(status, error = null) {
    state.status = status;
    state.error = error;
    console.info('[Palata 13] VK Bridge:', status, error || '');
    window.dispatchEvent(new Event('palata:vk-status'));
  }

  if (!bridge || typeof bridge.send !== 'function') {
    setStatus('unavailable', 'SDK не найден');
    return;
  }

  bridge.subscribe(event => {
    const type = event.detail?.type;
    if (type === 'VKWebAppViewHide') window.dispatchEvent(new Event('palata:vk-hide'));
    if (type === 'VKWebAppViewRestore') window.dispatchEvent(new Event('palata:vk-restore'));
  });

  const timer = setTimeout(() => {
    if (state.status === 'connecting') setStatus('timeout', 'VK не подтвердил инициализацию');
  }, 8000);
  try {
    Promise.resolve(bridge.send('VKWebAppInit')).then(result => {
      clearTimeout(timer);
      if (result?.result === false) setStatus('error', 'VK отклонил инициализацию');
      else setStatus('connected');
    }).catch(error => {
      clearTimeout(timer);
      setStatus('error', error?.message || error?.error_data?.error_reason || 'Ошибка VKWebAppInit');
    });
  } catch (error) {
    clearTimeout(timer);
    setStatus('error', String(error));
  }
})();
