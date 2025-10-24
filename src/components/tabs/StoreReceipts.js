import React from 'react';
import { Archive, FolderOpen } from 'lucide-react';

const StoreReceipts = () => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-cyan-900/30 p-8 shadow-2xl tab-transition">
      <div className="flex items-center mb-8">
        <Archive className="w-9 h-9 text-cyan-400 mr-4" />
        <h2 className="text-4xl premium-heading text-white">Store Receipts</h2>
      </div>
      
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <p className="premium-body text-gray-200 text-lg mb-4">
          Archive and organize your important receipts securely
        </p>
        <p className="premium-body text-gray-400 text-sm leading-relaxed">
          Future features: Save receipts permanently, create custom folders, tag transactions for easy retrieval, and search through archived documents with advanced filters.
        </p>
      </div>

      {/* Placeholder for future content */}
      <div className="mt-8 text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="premium-body text-gray-400">No stored receipts</p>
      </div>
    </div>
  );
};

export default StoreReceipts;
