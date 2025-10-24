import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../../firebase';
import { getUserAuditLogs } from '../../services/auditLogService';

// Wallet icon paths from public folder
const walletIconPaths = {
  Phantom: `${process.env.PUBLIC_URL}/phantom.png`,
  Solflare: `${process.env.PUBLIC_URL}/solflare.png`,
  Backpack: `${process.env.PUBLIC_URL}/backpack.png`,
  MetaMask: `${process.env.PUBLIC_URL}/metamask.png`,
};

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'connected', 'disconnected'
  const [refreshing, setRefreshing] = useState(false);

  // Fetch audit logs
  const fetchLogs = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      const auditLogs = await getUserAuditLogs(user.email, 100);
      setLogs(auditLogs);
    } catch (error) {
      // If error, set empty logs
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.email) {
        fetchLogs();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Filter logs based on action
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.action === filter;
  });

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get full timestamp
  const getFullTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-cyan-900/30 p-6 sm:p-8 shadow-2xl tab-transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center">
          <FileText className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-400 mr-3 sm:mr-4" />
          <div>
            <h2 className="text-3xl sm:text-4xl premium-heading text-white">Audit Logs</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Track all wallet connection activities</p>
          </div>
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={refreshing}
          className="flex items-center justify-center px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/50 rounded-lg text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700'
          }`}
        >
          <Filter className="w-4 h-4 inline mr-2" />
          All Events ({logs.length})
        </button>
        <button
          onClick={() => setFilter('connected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'connected'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700'
          }`}
        >
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Connected ({logs.filter(l => l.action === 'connected').length})
        </button>
        <button
          onClick={() => setFilter('disconnected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'disconnected'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700'
          }`}
        >
          <XCircle className="w-4 h-4 inline mr-2" />
          Disconnected ({logs.filter(l => l.action === 'disconnected').length})
        </button>
      </div>

      {/* Logs List */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Clock className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg font-medium mb-2">No Activity Yet</p>
            <p className="text-gray-500 text-sm">
              {filter === 'all' 
                ? 'Connect a wallet to start tracking activity'
                : `No ${filter} events found`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="p-4 sm:p-5 hover:bg-gray-800/70 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Wallet Logo */}
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center p-1.5 ${
                    log.action === 'connected'
                      ? 'bg-green-500/20 border-2 border-green-500/50'
                      : 'bg-red-500/20 border-2 border-red-500/50'
                  }`}>
                    {walletIconPaths[log.walletName] ? (
                      <img 
                        src={walletIconPaths[log.walletName]} 
                        alt={log.walletName} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full rounded-md bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                        {log.walletName?.charAt(0) || 'W'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-base sm:text-lg font-semibold ${
                          log.action === 'connected' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          Wallet {log.action === 'connected' ? 'Connected' : 'Disconnected'}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          <span className="font-medium">{log.walletName}</span>
                          <span className="text-gray-500 mx-2">•</span>
                          <span className="text-gray-400 font-mono text-xs">
                            {log.walletAddress?.slice(0, 6)}...{log.walletAddress?.slice(-4)}
                          </span>
                        </p>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center text-xs sm:text-sm text-gray-400">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                        <span title={getFullTimestamp(log.timestamp)}>
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        log.action === 'connected'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {log.action === 'connected' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {log.walletType?.toUpperCase()}
                      </span>
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

export default AuditLogs;
