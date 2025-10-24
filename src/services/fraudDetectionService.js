// Fraud Detection Service - ChainAbuse & Helius API Integration

const CHAINABUSE_API_KEY = 'ca_ODRFcXFqZ1NaWGticHg2SWFZQml3RWZHLnhOWi91Ukx0UjF3c2JhNTBCWlRKM2c9PQ';
const HELIUS_API_KEY = '277fd0d2-3b36-46a0-8ecc-24d7cac3a071';

/**
 * Check if a wallet address has been reported for fraud using ChainAbuse API
 * @param {string} address - Solana wallet address to check
 * @returns {Promise<Object>} - Fraud report data
 */
export const checkChainAbuse = async (address) => {
  try {
    console.log('🔍 Checking ChainAbuse for address:', address);
    
    // Method 1: Use our backend proxy server (RECOMMENDED - bypasses CORS)
    try {
      console.log('🔄 Attempting ChainAbuse check via backend proxy...');
      console.log('📦 Request payload:', { address, chain: 'solana' });
      
      const apiBase = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'http://localhost:3001'
        : (process.env.REACT_APP_API_BASE || '');
      const proxyUrl = `${apiBase}/api/check-address`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          chain: 'solana'
        })
      });

      console.log('📡 Proxy response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ ChainAbuse proxy response:', JSON.stringify(data, null, 2));
        
        const hasReports = data.reports && data.reports.length > 0;
        console.log(`🎯 ChainAbuse check complete: ${hasReports ? `FOUND ${data.totalReports} REPORT(S)` : 'No reports found'}`);
        
        if (hasReports) {
          console.log('⚠️ FRAUD REPORTS DETECTED:', data.reports);
        }
        
        return {
          safe: data.safe,
          reports: data.reports || [],
          totalReports: data.totalReports || 0,
          checked: true,
          method: 'backend_proxy'
        };
      } else {
        const errorText = await response.text();
        console.error('❌ Backend proxy returned error:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Raw error:', errorText);
        }
      }
    } catch (proxyError) {
      console.error('❌ Backend proxy call FAILED:', proxyError);
      console.error('Error name:', proxyError.name);
      console.error('Error message:', proxyError.message);
      console.error('Error stack:', proxyError.stack);
      console.error('⚠️ Make sure the proxy server is running: cd server && npm start');
      console.error('⚠️ Check if http://localhost:3001/health is accessible');
    }
    
    // Method 2: Try direct API call (will likely fail due to CORS)
    try {
      console.log('Attempting direct ChainAbuse API call...');
      const url = 'https://api.chainabuse.com/v1/reports';
      const basicAuth = btoa(`${CHAINABUSE_API_KEY}:${CHAINABUSE_API_KEY}`);
      
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          chain: 'solana'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Direct ChainAbuse response:', data);
        
        let reports = [];
        let totalReports = 0;
        
        if (data.reports && Array.isArray(data.reports)) {
          reports = data.reports;
          totalReports = data.total || data.reports.length;
        } else if (Array.isArray(data)) {
          reports = data;
          totalReports = data.length;
        } else if (data.data && Array.isArray(data.data)) {
          reports = data.data;
          totalReports = data.total || data.data.length;
        }
        
        const hasReports = reports.length > 0;
        
        return {
          safe: !hasReports,
          reports: reports,
          totalReports: totalReports,
          checked: true,
          method: 'direct_api'
        };
      }
    } catch (corsError) {
      console.warn('Direct ChainAbuse API call failed (CORS):', corsError.message);
    }
    
    // If all methods fail, return unchecked status with clear error
    console.error('❌ All ChainAbuse verification methods failed');
    console.error('⚠️ IMPORTANT: Start the proxy server to enable fraud detection:');
    console.error('   1. cd server');
    console.error('   2. npm install');
    console.error('   3. npm start');
    
    return { 
      safe: true, // Cannot verify, so don't block but warn user
      reports: [], 
      error: 'Proxy server not running - fraud detection unavailable',
      checked: false,
      warning: 'Address verification service is currently unavailable. Start the proxy server to enable fraud detection.'
    };
    
  } catch (error) {
    console.error('ChainAbuse API error:', error);
    return { 
      safe: true,
      reports: [], 
      error: error.message,
      checked: false,
      warning: 'Address verification failed. Please verify the recipient manually.'
    };
  }
};

/**
 * Analyze wallet using Helius API for blockchain activity
 * @param {string} address - Solana wallet address to analyze
 * @returns {Promise<Object>} - Blockchain analysis data
 */
export const analyzeWithHelius = async (address) => {
  try {
    console.log('🔍 Analyzing with Helius API:', address);
    
    // Get wallet balance and account info
    const balanceResponse = await fetch(`https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });

    const balanceData = await balanceResponse.json();
    console.log('Helius balance response:', balanceData);

    // Get recent transaction signatures
    const signaturesResponse = await fetch(`https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getSignaturesForAddress',
        params: [address, { limit: 10 }]
      })
    });

    const signaturesData = await signaturesResponse.json();
    console.log('Helius signatures response:', signaturesData);

    const balance = balanceData.result?.value || 0;
    const recentTransactions = signaturesData.result || [];
    const transactionCount = recentTransactions.length;

    // Simple heuristic analysis
    const isNewWallet = transactionCount === 0;
    const hasBalance = balance > 0;
    const suspiciousPattern = transactionCount > 50 && balance === 0; // High activity, no balance

    return {
      balance: balance / 1000000000, // Convert lamports to SOL
      transactionCount,
      isNewWallet,
      hasBalance,
      suspiciousPattern,
      recentTransactions: recentTransactions.slice(0, 5),
      analyzed: true
    };
  } catch (error) {
    console.error('Helius API error:', error);
    return {
      balance: 0,
      transactionCount: 0,
      isNewWallet: true,
      hasBalance: false,
      suspiciousPattern: false,
      error: error.message,
      analyzed: false
    };
  }
};

/**
 * Comprehensive wallet risk assessment combining ChainAbuse and Helius
 * @param {string} address - Solana wallet address to assess
 * @returns {Promise<Object>} - Complete risk assessment
 */
export const assessWalletRisk = async (address) => {
  try {
    console.log('🛡️ Starting comprehensive risk assessment for:', address);

    // Run both checks in parallel
    const [chainAbuseResult, heliusResult] = await Promise.all([
      checkChainAbuse(address),
      analyzeWithHelius(address)
    ]);

    // Calculate overall risk score (0-100, higher = more risky)
    let riskScore = 0;
    let riskFactors = [];

    // Log detailed ChainAbuse results
    console.log('ChainAbuse Result:', {
      safe: chainAbuseResult.safe,
      reportsCount: chainAbuseResult.reports?.length || 0,
      checked: chainAbuseResult.checked,
      error: chainAbuseResult.error
    });

    // ChainAbuse reports (highest priority)
    if (!chainAbuseResult.safe && chainAbuseResult.reports.length > 0) {
      riskScore += 80; // Major risk
      const firstReport = chainAbuseResult.reports[0];
      riskFactors.push({
        severity: 'critical',
        reason: `Reported for fraud/scam: ${firstReport.category || 'Unknown category'}`,
        details: {
          category: firstReport.category || 'Unknown',
          subcategory: firstReport.subcategory || 'N/A',
          description: firstReport.description || 'No description',
          reporter: firstReport.reporter || 'Anonymous',
          reportedAt: firstReport.created_at || firstReport.createdAt || 'Unknown date'
        }
      });
    } else if (!chainAbuseResult.checked) {
      // API check failed - add warning
      riskFactors.push({
        severity: 'medium',
        reason: 'Unable to verify address against fraud database',
        details: chainAbuseResult.error || 'ChainAbuse API check failed'
      });
    }

    // Helius analysis
    if (heliusResult.suspiciousPattern) {
      riskScore += 30;
      riskFactors.push({
        severity: 'medium',
        reason: 'Suspicious transaction pattern detected',
        details: 'High activity with zero balance'
      });
    }

    if (heliusResult.isNewWallet && !heliusResult.hasBalance) {
      riskScore += 10;
      riskFactors.push({
        severity: 'low',
        reason: 'New wallet with no activity',
        details: 'Exercise caution with new wallets'
      });
    }

    // Determine overall safety
    const isSafe = riskScore < 50;
    const riskLevel = riskScore >= 80 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 20 ? 'medium' : 'low';

    return {
      safe: isSafe,
      riskScore,
      riskLevel,
      riskFactors,
      chainAbuseResult,
      heliusResult,
      recommendation: isSafe ? 'Transaction can proceed' : 'Transaction should be blocked',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Risk assessment error:', error);
    return {
      safe: false,
      riskScore: 50,
      riskLevel: 'unknown',
      riskFactors: [{ severity: 'medium', reason: 'Unable to complete risk assessment', details: error.message }],
      error: error.message
    };
  }
};
