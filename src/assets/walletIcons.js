// Official wallet icons as SVG components
export const WalletIcons = {
  Phantom: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#AB9FF2"/>
    </svg>
  ),
  Solflare: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#9945FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Backpack: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C13.1 2 14 2.9 14 4H16C17.1 4 18 4.9 18 6V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V6C6 4.9 6.9 4 8 4H10C10 2.9 10.9 2 12 2ZM12 4C11.45 4 11 4.45 11 5S11.45 6 12 6 13 5.55 13 5 12.55 4 12 4ZM8 6V20H16V6H8Z" fill="#00D4AA"/>
    </svg>
  ),
  MetaMask: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.5 2L12 7.5 2.5 2 12 0l9.5 2z" fill="#F6851B"/>
      <path d="M12 7.5v13L21.5 2l-9.5 5.5z" fill="#F6851B"/>
      <path d="M12 7.5L2.5 2l9.5 5.5v13L2.5 2l9.5 5.5z" fill="#F6851B"/>
    </svg>
  )
};
