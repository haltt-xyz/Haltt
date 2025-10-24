import React, { useState, useEffect } from 'react';
import { Receipt, Download, ExternalLink, Wallet, Send, Calendar, CheckCircle, Copy, Check, Search } from 'lucide-react';
import { useAuth } from '../../firebase';
import { getUserReceipts } from '../../services/receiptService';

const Receipts = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSignature, setCopiedSignature] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load receipts on component mount
  useEffect(() => {
    loadReceipts();
  }, [user]);

  const loadReceipts = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const data = await getUserReceipts(user.email);
      setReceipts(data);
    } catch (err) {
      console.error('Error loading receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const copySignature = (signature) => {
    navigator.clipboard.writeText(signature);
    setCopiedSignature(signature);
    setTimeout(() => setCopiedSignature(null), 2000);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Handle Firestore timestamp
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const filteredReceipts = receipts.filter(receipt => 
    receipt.transactionSignature?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.recipientAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.walletName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 flex items-center gap-3">
            <Receipt className="w-8 h-8" />
            Transaction Receipts
          </h2>
          <p className="text-gray-400 mt-2">
            View all your transaction history and receipts
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-semibold text-blue-400 mb-1">Automatic Receipt Generation:</p>
          <p>Every transaction you make is automatically saved here with full details including wallet used, amount, recipient, and transaction signature.</p>
        </div>
      </div>

      {/* Search Bar */}
      {receipts.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-cyan-900/30 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by signature, recipient, or wallet..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Receipts List */}
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-cyan-900/30 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading receipts...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <Download className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery ? 'No matching receipts found' : 'No receipts yet'}
            </p>
            {!searchQuery && (
              <p className="text-gray-500 text-sm mt-2">
                Transaction receipts will appear here automatically after you send funds
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                All Receipts ({filteredReceipts.length})
              </h3>
            </div>

            {filteredReceipts.map((receipt, index) => (
              <div
                key={index}
                className="bg-gray-800/50 rounded-lg p-5 border border-gray-700 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-green-400 font-semibold text-sm">Transaction Successful</span>
                      <span className="text-xs text-gray-500 ml-auto">{receipt.network}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Amount</p>
                          <p className="text-white font-bold text-lg">
                            {receipt.amount} {receipt.token}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            Wallet Used
                          </p>
                          <p className="text-cyan-400 font-semibold">{receipt.walletName}</p>
                          <code className="text-gray-400 font-mono text-xs block mt-1">
                            {truncateAddress(receipt.walletAddress)}
                          </code>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Recipient
                          </p>
                          <code className="text-gray-300 font-mono text-xs block">
                            {truncateAddress(receipt.recipientAddress)}
                          </code>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Date & Time
                          </p>
                          <p className="text-gray-300 text-sm">{formatDate(receipt.timestamp)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Signature */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-500 mb-2">Transaction Signature</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-cyan-400 font-mono text-xs bg-gray-900/50 px-3 py-2 rounded border border-gray-700 truncate">
                          {receipt.transactionSignature}
                        </code>
                        <button
                          onClick={() => copySignature(receipt.transactionSignature)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors flex items-center gap-1"
                          title="Copy signature"
                        >
                          {copiedSignature === receipt.transactionSignature ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={`https://solscan.io/tx/${receipt.transactionSignature}${receipt.network === 'devnet' ? '?cluster=devnet' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center gap-1"
                          title="View on Solscan"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Receipts;
