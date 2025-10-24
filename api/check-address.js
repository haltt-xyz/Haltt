// Vercel Serverless Function for ChainAbuse API
const fetch = require('node-fetch');

const CHAINABUSE_API_KEY = process.env.CHAINABUSE_API_KEY;

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, chain = 'solana' } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log(`🔍 Checking address: ${address} on chain: ${chain}`);

    const basicAuth = Buffer.from(`${CHAINABUSE_API_KEY}:${CHAINABUSE_API_KEY}`).toString('base64');
    const chainUpper = chain.toUpperCase() === 'SOLANA' ? 'SOL' : chain.toUpperCase();
    
    const queryParams = new URLSearchParams({
      address: address,
      chain: chainUpper,
      includePrivate: 'false',
      page: '1',
      perPage: '50'
    });
    
    const apiUrl = `https://api.chainabuse.com/v0/reports?${queryParams}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ChainAbuse API Error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `ChainAbuse API returned ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();

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

    res.json({
      safe: !hasReports,
      reports: reports,
      totalReports: totalReports,
      checked: true,
      message: hasReports ? `Found ${totalReports} fraud report(s)` : 'No fraud reports found'
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
