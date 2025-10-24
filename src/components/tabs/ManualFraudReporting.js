import React, { useState, useEffect, useRef } from 'react';
import { Flag, AlertTriangle, Shield, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../../firebase';
import { submitFraudReport } from '../../services/fraudReportService';
import Turnstile from 'react-turnstile';

const ManualFraudReporting = () => {
  const { user } = useAuth();
  
  // Form state
  const [walletAddress, setWalletAddress] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [message, setMessage] = useState('');
  const [reportFrequency, setReportFrequency] = useState(null);
  
  const turnstileRef = useRef(null);

  // Categories for the dropdown
  const categories = [
    { value: 'Phishing', label: 'Phishing' },
    { value: 'Scam', label: 'Scam' },
    { value: 'Fraud', label: 'Fraud' },
    { value: 'Others', label: 'Others' }
  ];

  // Validate wallet address format (basic Solana/Ethereum validation)
  const isValidWalletAddress = (address) => {
    // Solana addresses are typically 32-44 characters, base58 encoded
    // Ethereum addresses are 42 characters starting with 0x
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
    return solanaRegex.test(address) || ethereumRegex.test(address);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!walletAddress.trim()) {
      setMessage('Please enter a wallet address.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    if (!isValidWalletAddress(walletAddress.trim())) {
      setMessage('Please enter a valid wallet address.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    if (!category) {
      setMessage('Please select a category.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    if (!turnstileToken) {
      setMessage('Please complete the verification challenge.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    try {
      setIsSubmitting(true);
      setShowSuccess(false);
      setShowError(false);
      setMessage('');

      // Submit the report
      const result = await submitFraudReport(walletAddress, category, note, user.email);

      if (result.success) {
        setShowSuccess(true);
        setMessage(result.message);
        setReportFrequency(result.frequency);
        
        // Reset form after 3 seconds
        setTimeout(() => {
          resetForm();
        }, 3000);
      } else {
        setShowError(true);
        setMessage(result.message);
      }
    } catch (error) {
      console.error('Fraud report submission error:', error);
      setShowError(true);
      
      // Show detailed error message
      if (error.code === 'permission-denied') {
        setMessage('Permission denied. Please ensure you are signed in and Firestore rules are configured.');
      } else if (error.code === 'unavailable') {
        setMessage('Network error. Please check your internet connection and try again.');
      } else if (error.message) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Failed to submit report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setWalletAddress('');
    setCategory('');
    setNote('');
    setTurnstileToken('');
    setShowSuccess(false);
    setShowError(false);
    setMessage('');
    setReportFrequency(null);
    
    // Reset Turnstile
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  };

  return (
    <div className="flex items-start justify-center pt-0 pb-0 px-4 tab-transition">
      <div className="w-full max-w-3xl bg-gray-900/40 backdrop-blur-2xl rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Flag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
              Fraud Reporting
            </h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
              Report Suspicious Wallets
            </p>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3.5">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-green-300 font-medium text-sm">{message}</p>
                {reportFrequency && (
                  <p className="text-green-400/60 text-xs mt-1">
                    Reported by {reportFrequency} user{reportFrequency > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {showError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3.5">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm font-medium">{message}</p>
            </div>
          </div>
        )}

        {/* Report Form - Two Column Grid */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wallet Address Field */}
            <div className="md:col-span-2">
              <label htmlFor="walletAddress" className="block text-xs font-medium text-gray-400 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                WALLET ADDRESS <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter suspicious wallet address"
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                disabled={isSubmitting}
              />
            </div>

            {/* Category Field */}
            <div>
              <label htmlFor="category" className="block text-xs font-medium text-gray-400 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                CATEGORY <span className="text-red-400">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all cursor-pointer text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
                disabled={isSubmitting}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User Email */}
            <div>
              <label htmlFor="userEmail" className="block text-xs font-medium text-gray-400 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                YOUR EMAIL
              </label>
              <input
                type="email"
                id="userEmail"
                value={user?.email || ''}
                readOnly
                className="w-full px-4 py-2.5 bg-gray-700/30 border border-gray-600/50 rounded-lg text-gray-500 cursor-not-allowed text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            {/* Note Field */}
            <div className="md:col-span-2">
              <label htmlFor="note" className="block text-xs font-medium text-gray-400 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                NOTE <span className="text-gray-600">(Optional)</span>
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Provide additional details..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-600 mt-1.5">{note.length}/500</p>
            </div>
          </div>

          {/* Turnstile */}
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              sitekey="0x4AAAAAAB7i-CXLmMjIUopP"
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken('')}
              onExpire={() => setTurnstileToken('')}
              theme="dark"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !walletAddress || !category || !turnstileToken}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-red-500/20 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 text-base"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Submitting....</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Submit Report</span>
              </>
            )}
          </button>
        </form>

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-gray-800/50">
          <p className="text-xs text-gray-500 text-center leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Reports are stored securely and reviewed to maintain data quality. Multiple reports help identify high-risk wallets.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualFraudReporting;
