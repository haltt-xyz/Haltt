import React, { useState, useEffect } from 'react';
import { UserX, ShieldAlert, Plus, Trash2, AlertCircle, CheckCircle, Search, Calendar, User } from 'lucide-react';
import { useAuth } from '../../firebase';
import { addToBlocklist, removeFromBlocklist, getBlocklist } from '../../services/blocklistService';

const ManageBlocklist = () => {
  const { user } = useAuth();
  const [blocklist, setBlocklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load blocklist on component mount
  useEffect(() => {
    loadBlocklist();
  }, [user]);

  const loadBlocklist = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const data = await getBlocklist(user.email);
      setBlocklist(data);
    } catch (err) {
      console.error('Error loading blocklist:', err);
      setError('Failed to load blocklist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    // Basic Solana address validation (base58, 32-44 characters)
    if (newAddress.length < 32 || newAddress.length > 44) {
      setError('Invalid Solana wallet address format');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      
      await addToBlocklist(user.email, newAddress.trim(), newReason.trim());
      
      setSuccess('Address added to blocklist successfully!');
      setNewAddress('');
      setNewReason('');
      setShowAddModal(false);
      
      // Reload blocklist
      await loadBlocklist();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding to blocklist:', err);
      setError(err.message || 'Failed to add address to blocklist');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAddress = async (address) => {
    if (!window.confirm('Are you sure you want to unblock this address?')) {
      return;
    }

    try {
      setError(null);
      await removeFromBlocklist(user.email, address);
      
      setSuccess('Address removed from blocklist successfully!');
      
      // Reload blocklist
      await loadBlocklist();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing from blocklist:', err);
      setError('Failed to remove address from blocklist');
    }
  };

  const filteredBlocklist = blocklist.filter(item => 
    item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 flex items-center gap-3">
            <UserX className="w-8 h-8" />
            Manage Blocklist
          </h2>
          <p className="text-gray-400 mt-2">
            Block suspicious addresses and prevent sending funds to them
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Address
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-semibold text-blue-400 mb-1">How it works:</p>
          <p>Addresses in your blocklist cannot receive funds from your wallet. This helps prevent accidental transactions to known scammers or suspicious addresses.</p>
        </div>
      </div>

      {/* Search Bar */}
      {blocklist.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-cyan-900/30 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocked addresses..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Blocklist */}
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-cyan-900/30 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading blocklist...</p>
          </div>
        ) : filteredBlocklist.length === 0 ? (
          <div className="text-center py-12">
            <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery ? 'No matching addresses found' : 'No blocked addresses'}
            </p>
            {!searchQuery && (
              <p className="text-gray-500 text-sm mt-2">
                Add addresses to prevent sending funds to them
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Blocked Addresses ({filteredBlocklist.length})
              </h3>
            </div>

            {filteredBlocklist.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-red-500/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <UserX className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <code className="text-cyan-400 font-mono text-sm break-all">
                        {item.address}
                      </code>
                    </div>
                    
                    {item.reason && (
                      <p className="text-gray-300 text-sm mb-2">
                        <span className="font-medium">Reason:</span> {item.reason}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.blockedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Added {item.addedBy}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveAddress(item.address)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
                    title="Remove from blocklist"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Unblock</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-cyan-900/30 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-red-400" />
              Add Address to Blocklist
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => {
                    setNewAddress(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter Solana wallet address"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Why are you blocking this address?"
                  rows={3}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewAddress('');
                    setNewReason('');
                    setError(null);
                  }}
                  disabled={adding}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAddress}
                  disabled={adding || !newAddress.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add to Blocklist
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBlocklist;
