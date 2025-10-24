import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Copy, Check, Share2, Download, Wallet, DollarSign, MessageSquare, AlertCircle } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import QRCodeStyling from 'qr-code-styling';

const ExportBarcode = ({ connectedWallets = [] }) => {
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const qrCodeRef = useRef(null);
  const qrCodeInstance = useRef(null);
  
  // QR Code customization options
  const [qrSize, setQrSize] = useState(300);
  const [qrColor, setQrColor] = useState('#06b6d4');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrStyle, setQrStyle] = useState('rounded'); // 'rounded', 'square', 'dots'
  const [showCustomization, setShowCustomization] = useState(false);

  // Generate reference key for tracking (as PublicKey)
  const generateReference = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return new PublicKey(array);
  };

  // Generate Solana Pay URL
  const generateSolanaPayUrl = () => {
    if (!selectedWallet) {
      setError('Please select a wallet');
      return;
    }

    try {
      // Validate wallet address
      let recipientPubkey;
      try {
        recipientPubkey = new PublicKey(selectedWallet);
      } catch (e) {
        setError('Invalid wallet address format');
        return;
      }

      // Create Solana Pay transfer request URL (MAINNET)
      // Format: solana:<recipient>?amount=<amount>&reference=<reference>&label=<label>&message=<message>&memo=<memo>
      
      // Use mainnet-beta cluster
      const url = new URL(`solana:${recipientPubkey.toBase58()}`);
      
      // Add amount if specified (in SOL)
      if (amount && parseFloat(amount) > 0) {
        url.searchParams.append('amount', amount);
      }

      // Add label (short description shown in wallet)
      if (memo && memo.trim()) {
        url.searchParams.append('label', encodeURIComponent(memo.trim()));
      }

      // Add message (longer description)
      if (memo && memo.trim()) {
        url.searchParams.append('message', encodeURIComponent(memo.trim()));
      }

      // Add reference for tracking (required for Solana Pay)
      const reference = generateReference();
      url.searchParams.append('reference', reference.toBase58());

      // Add memo (on-chain memo)
      if (memo && memo.trim()) {
        url.searchParams.append('memo', encodeURIComponent(memo.trim()));
      }

      const solanaPayUrl = url.toString();
      setPaymentUrl(solanaPayUrl);
      setError('');
      
      // Generate QR code
      generateQRCode(solanaPayUrl);
    } catch (err) {
      setError(`Error generating QR code: ${err.message}`);
    }
  };

  // Generate QR Code using qr-code-styling
  const generateQRCode = (url) => {
    if (qrCodeRef.current) {
      // Clear previous QR code
      qrCodeRef.current.innerHTML = '';

      // Determine dot style based on selection
      const dotType = qrStyle === 'rounded' ? 'rounded' : qrStyle === 'dots' ? 'dots' : 'square';
      const cornerType = qrStyle === 'rounded' ? 'extra-rounded' : 'square';

      // Create new QR code instance with customization
      qrCodeInstance.current = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        data: url,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H'
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 8
        },
        dotsOptions: {
          type: dotType,
          color: qrColor,
          gradient: qrStyle === 'rounded' ? {
            type: 'linear',
            rotation: 0,
            colorStops: [
              { offset: 0, color: qrColor },
              { offset: 1, color: adjustColor(qrColor, -20) }
            ]
          } : undefined
        },
        backgroundOptions: {
          color: qrBgColor,
          round: 0.2
        },
        cornersSquareOptions: {
          type: cornerType,
          color: qrColor
        },
        cornersDotOptions: {
          type: 'dot',
          color: qrColor
        }
      });

      qrCodeInstance.current.append(qrCodeRef.current);
    }
  };

  // Helper function to adjust color brightness
  const adjustColor = (color, amount) => {
    const clamp = (val) => Math.min(Math.max(val, 0), 255);
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (paymentUrl) {
      try {
        await navigator.clipboard.writeText(paymentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setError('Failed to copy to clipboard');
      }
    }
  };

  // Download QR code
  const downloadQRCode = () => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.download({
        name: `solana-pay-${selectedWallet.slice(0, 8)}`,
        extension: 'png'
      });
    }
  };

  // Share payment link
  const sharePaymentLink = async () => {
    if (paymentUrl && navigator.share) {
      try {
        await navigator.share({
          title: 'Solana Payment Request',
          text: `Pay ${amount || 'any amount'} SOL${memo ? ` - ${memo}` : ''}`,
          url: paymentUrl
        });
      } catch (err) {
        // User cancelled or share not supported
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  // Auto-generate when inputs change
  useEffect(() => {
    if (selectedWallet) {
      generateSolanaPayUrl();
    }
  }, [selectedWallet, amount, memo]);

  // Regenerate QR when customization changes
  useEffect(() => {
    if (paymentUrl) {
      generateQRCode(paymentUrl);
    }
  }, [qrSize, qrColor, qrBgColor, qrStyle]);

  return (
    <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-cyan-900/30 p-6 sm:p-8 shadow-2xl tab-transition">
      {/* Header */}
      <div className="flex items-center mb-8">
        <QrCode className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-400 mr-3 sm:mr-4" />
        <div>
          <h2 className="text-3xl sm:text-4xl premium-heading text-white">QR Codes</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Generate Solana Pay QR codes for payments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Wallet Selection */}
          <div>
            <label className="flex items-center premium-label text-gray-300 mb-3">
              <Wallet className="w-4 h-4 mr-2" />
              Select Wallet
            </label>
            {connectedWallets.length === 0 ? (
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">No Wallets Connected</p>
                    <p className="text-yellow-300/70 text-xs mt-1">Please connect a wallet first to generate QR codes</p>
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white premium-body focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              >
                <option value="">Choose a wallet...</option>
                {connectedWallets.map((wallet, index) => (
                  <option key={index} value={wallet.publicKey || wallet.address}>
                    {wallet.name} - {(wallet.publicKey || wallet.address)?.slice(0, 8)}...{(wallet.publicKey || wallet.address)?.slice(-6)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="flex items-center premium-label text-gray-300 mb-3">
              <DollarSign className="w-4 h-4 mr-2" />
              Amount (Optional)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 pr-16 text-white premium-body focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">SOL</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">Leave empty to let payer choose amount</p>
          </div>

          {/* Memo Input */}
          <div>
            <label className="flex items-center premium-label text-gray-300 mb-3">
              <MessageSquare className="w-4 h-4 mr-2" />
              Memo / Message (Optional)
            </label>
            <textarea
              placeholder="e.g., Coffee payment, Invoice #123"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows="3"
              maxLength="200"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white premium-body focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
            />
            <p className="text-gray-500 text-xs mt-2">{memo.length}/200 characters</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* QR Customization Toggle */}
          <div>
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="w-full flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white premium-body hover:bg-gray-800 transition-all"
            >
              <span className="text-sm font-medium">🎨 Customize QR Code</span>
              <span className="text-gray-400 text-xs">{showCustomization ? '▼' : '▶'}</span>
            </button>
            
            {showCustomization && (
              <div className="mt-4 space-y-4 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                {/* Size Slider */}
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-2 block">
                    Size: {qrSize}px
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="500"
                    step="50"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-2 block">
                    QR Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      placeholder="#06b6d4"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-2 block">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Style Selection */}
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-2 block">
                    QR Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setQrStyle('rounded')}
                      className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                        qrStyle === 'rounded'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Rounded
                    </button>
                    <button
                      onClick={() => setQrStyle('square')}
                      className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                        qrStyle === 'square'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Square
                    </button>
                    <button
                      onClick={() => setQrStyle('dots')}
                      className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                        qrStyle === 'dots'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Dots
                    </button>
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    setQrSize(300);
                    setQrColor('#06b6d4');
                    setQrBgColor('#ffffff');
                    setQrStyle('rounded');
                  }}
                  className="w-full bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded transition-all"
                >
                  Reset to Default
                </button>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={generateSolanaPayUrl}
            disabled={!selectedWallet}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none"
          >
            Generate QR Code
          </button>
        </div>

        {/* Right Column - QR Code Display */}
        <div className="space-y-6">
          {/* QR Code Container */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            {paymentUrl ? (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div 
                    ref={qrCodeRef}
                    className="bg-white rounded-xl p-4 shadow-2xl"
                  />
                </div>

                {/* Payment Details */}
                <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Wallet:</span>
                    <span className="text-white text-sm font-mono">
                      {selectedWallet.slice(0, 6)}...{selectedWallet.slice(-4)}
                    </span>
                  </div>
                  {amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Amount:</span>
                      <span className="text-cyan-400 text-sm font-semibold">{amount} SOL</span>
                    </div>
                  )}
                  {memo && (
                    <div className="flex justify-between items-start">
                      <span className="text-gray-400 text-sm">Memo:</span>
                      <span className="text-white text-sm text-right max-w-[200px] break-words">{memo}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-white py-2.5 px-3 rounded-lg transition-all text-sm font-medium"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={sharePaymentLink}
                    className="flex items-center justify-center gap-2 bg-cyan-600/50 hover:bg-cyan-600 text-white py-2.5 px-3 rounded-lg transition-all text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  <button
                    onClick={downloadQRCode}
                    className="flex items-center justify-center gap-2 bg-green-600/50 hover:bg-green-600 text-white py-2.5 px-3 rounded-lg transition-all text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                </div>

                {/* Payment URL */}
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-2">Solana Pay URL:</p>
                  <p className="text-cyan-400 text-xs font-mono break-all">{paymentUrl}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <QrCode className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg font-medium mb-2">No QR Code Generated</p>
                <p className="text-gray-500 text-sm">Select a wallet and click generate</p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-cyan-900/10 border border-cyan-700/30 rounded-lg p-4">
            <h3 className="text-cyan-400 text-sm font-semibold mb-2">✨ Solana Pay (Mainnet)</h3>
            <ul className="text-gray-400 text-xs space-y-1.5">
              <li>• Customers scan with their Solana wallet app</li>
              <li>• Payment details pre-filled automatically</li>
              <li>• Transactions on <span className="text-cyan-400 font-semibold">Mainnet-Beta</span></li>
              <li>• Tracked with unique reference keys</li>
              <li>• Compatible with Phantom, Solflare, Backpack</li>
              <li>• Customize colors, size, and style</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportBarcode;
