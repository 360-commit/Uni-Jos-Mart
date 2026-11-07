const button = document.querySelector('#installApp');
const hint = document.querySelector('#installHint');
let installPrompt = null;

const isInstalled = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const isIos = () => (
  /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
);

const showInstallButton = () => {
  if (button && !isInstalled()) button.hidden = false;
};

if (button) {
  showInstallButton();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
    hint.textContent = 'Uni-Jos Mart is installed.';
  });

  button.addEventListener('click', async () => {
    hint.textContent = '';
    if (!installPrompt) {
      hint.textContent = isIos()
        ? 'In Safari, tap Share, then Add to Home Screen.'
        : 'Open your browser menu and choose Install app or Add to Home Screen.';
      return;
    }

    try {
      const promptEvent = installPrompt;
      installPrompt = null;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') button.hidden = true;
    } catch (error) {
      console.error('Could not open the app install prompt.', error);
      hint.textContent = 'Installation is unavailable right now. Try your browser menu.';
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .catch((error) => console.error('Could not register the app service worker.', error));
}
