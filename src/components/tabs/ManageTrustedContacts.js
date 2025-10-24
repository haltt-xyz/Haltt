import React, { useState, useEffect } from 'react';
import { UsersRound, UserPlus, Send, Trash2, AlertCircle, CheckCircle, Search, Calendar, UserX, Shield, Edit2, X } from 'lucide-react';
import { useAuth } from '../../firebase';
import { addTrustedContact, removeTrustedContact, getTrustedContacts, updateTrustedContact } from '../../services/trustedContactsService';
import { isAddressBlocked } from '../../services/blocklistService';
import { addToBlocklist, removeFromBlocklist } from '../../services/blocklistService';

const ManageTrustedContacts = ({ onSendToContact }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedAddresses, setBlockedAddresses] = useState(new Set());

  // Load trusted contacts on component mount
  useEffect(() => {
    loadTrustedContacts();
  }, [user]);

  const loadTrustedContacts = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const data = await getTrustedContacts(user.email);
      setContacts(data);
      
      // Check which contacts are blocked
      const blocked = new Set();
      for (const contact of data) {
        const isBlocked = await isAddressBlocked(user.email, contact.address);
        if (isBlocked) {
          blocked.add(contact.address);
        }
      }
      setBlockedAddresses(blocked);
    } catch (err) {
      console.error('Error loading trusted contacts:', err);
      setError('Failed to load trusted contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newAddress.trim() || !newName.trim()) {
      setError('Please enter both address and name');
      return;
    }

    // Basic Solana address validation
    if (newAddress.length < 32 || newAddress.length > 44) {
      setError('Invalid Solana wallet address format');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      
      await addTrustedContact(user.email, newAddress.trim(), newName.trim(), newNotes.trim());
      
      setSuccess('Contact added successfully!');
      setNewAddress('');
      setNewName('');
      setNewNotes('');
      setShowAddModal(false);
      
      // Reload contacts
      await loadTrustedContacts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err.message || 'Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveContact = async (address, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from trusted contacts?`)) {
      return;
    }

    try {
      setError(null);
      await removeTrustedContact(user.email, address);
      
      setSuccess('Contact removed successfully!');
      
      // Reload contacts
      await loadTrustedContacts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing contact:', err);
      setError('Failed to remove contact');
    }
  };

  const handleBlockContact = async (address, name) => {
    if (!window.confirm(`Are you sure you want to block ${name}? This will prevent sending funds to this address.`)) {
      return;
    }

    try {
      setError(null);
      await addToBlocklist(user.email, address, `Blocked from trusted contacts: ${name}`);
      
      setSuccess(`${name} has been added to blocklist`);
      
      // Reload to update blocked status
      await loadTrustedContacts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error blocking contact:', err);
      setError(err.message || 'Failed to block contact');
    }
  };

  const handleUnblockContact = async (address, name) => {
    if (!window.confirm(`Are you sure you want to unblock ${name}?`)) {
      return;
    }

    try {
      setError(null);
      await removeFromBlocklist(user.email, address);
      
      setSuccess(`${name} has been removed from blocklist`);
      
      // Reload to update blocked status
      await loadTrustedContacts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error unblocking contact:', err);
      setError('Failed to unblock contact');
    }
  };

  const handleSendToContact = (contact) => {
    if (blockedAddresses.has(contact.address)) {
      setError('Cannot send to blocked address. Please unblock first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Call parent function to initiate send
    if (onSendToContact) {
      onSendToContact(contact);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.notes && contact.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
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
            <UsersRound className="w-8 h-8" />
            Trusted Contacts
          </h2>
          <p className="text-gray-400 mt-2">
            Manage your trusted wallet addresses for quick and secure transactions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Contact
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
        <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-semibold text-blue-400 mb-1">Quick & Secure Sending:</p>
          <p>Save frequently used addresses with custom names for easy identification. Send funds quickly without re-entering addresses each time.</p>
        </div>
      </div>

      {/* Search Bar */}
      {contacts.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-cyan-900/30 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or address..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-cyan-900/30 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery ? 'No matching contacts found' : 'No trusted contacts added'}
            </p>
            {!searchQuery && (
              <p className="text-gray-500 text-sm mt-2">
                Add contacts to send funds quickly and securely
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Contacts ({filteredContacts.length})
              </h3>
            </div>

            {filteredContacts.map((contact, index) => {
              const isBlocked = blockedAddresses.has(contact.address);
              
              return (
                <div
                  key={index}
                  className={`bg-gray-800/50 rounded-lg p-4 border transition-colors ${
                    isBlocked 
                      ? 'border-red-500/30 bg-red-900/10' 
                      : 'border-gray-700 hover:border-green-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <UsersRound className={`w-5 h-5 flex-shrink-0 ${isBlocked ? 'text-red-400' : 'text-green-400'}`} />
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-lg">{contact.name}</h4>
                          {isBlocked && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1">
                              <UserX className="w-3 h-3" />
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <code className="text-cyan-400 font-mono text-sm break-all block mb-2">
                        {contact.address}
                      </code>
                      
                      {contact.notes && (
                        <p className="text-gray-400 text-sm mb-2">
                          <span className="font-medium">Notes:</span> {contact.notes}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Added {formatDate(contact.addedAt)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {!isBlocked && (
                        <button
                          onClick={() => handleSendToContact(contact)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                          title="Send funds"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </button>
                      )}
                      
                      {isBlocked ? (
                        <button
                          onClick={() => handleUnblockContact(contact.address, contact.name)}
                          className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                          title="Unblock contact"
                        >
                          <Shield className="w-4 h-4" />
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlockContact(contact.address, contact.name)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                          title="Block contact"
                        >
                          <UserX className="w-4 h-4" />
                          Block
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRemoveContact(contact.address, contact.name)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                        title="Remove contact"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-cyan-900/30 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-green-400" />
                Add Trusted Contact
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewAddress('');
                  setNewName('');
                  setNewNotes('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., John Doe, Exchange Wallet"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

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
                  Notes (Optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add any notes about this contact"
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
                    setNewName('');
                    setNewNotes('');
                    setError(null);
                  }}
                  disabled={adding}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={adding || !newAddress.trim() || !newName.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Contact
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

export default ManageTrustedContacts;
