// Backend Proxy Server for ChainAbuse API
// This bypasses CORS restrictions by making API calls server-side

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your frontend
app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

const CHAINABUSE_API_KEY = 'ca_ODRFcXFqZ1NaWGticHg2SWFZQml3RWZHLnhOWi91Ukx0UjF3c2JhNTBCWlRKM2c9PQ';

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ChainAbuse Proxy Server',
    endpoints: {
      health: 'GET /health',
      checkAddress: 'POST /api/check-address'
    }
  });
});

// Proxy endpoint for ChainAbuse API
app.post('/api/check-address', async (req, res) => {
  console.log('🎯 POST /api/check-address endpoint hit!');
  console.log('Request body:', req.body);
  try {
    const { address, chain = 'solana' } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log(`🔍 Checking address: ${address} on chain: ${chain}`);

    // Create Basic Auth header (API key as both username AND password)
    const basicAuth = Buffer.from(`${CHAINABUSE_API_KEY}:${CHAINABUSE_API_KEY}`).toString('base64');

    console.log('🔑 Using API Key:', CHAINABUSE_API_KEY.substring(0, 20) + '...');
    console.log('🔐 Basic Auth:', basicAuth.substring(0, 30) + '...');

    // Call ChainAbuse API v0 (not v1!) with GET and query params
    // Chain must be uppercase (SOL, not solana)
    const chainUpper = chain.toUpperCase() === 'SOLANA' ? 'SOL' : chain.toUpperCase();
    
    const queryParams = new URLSearchParams({
      address: address,
      chain: chainUpper,
      includePrivate: 'false',
      page: '1',
      perPage: '50'
    });
    
    const apiUrl = `https://api.chainabuse.com/v0/reports?${queryParams}`;
    console.log('🌐 API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`📡 Response Status: ${response.status}`);

    console.log(`ChainAbuse API Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ChainAbuse API Error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `ChainAbuse API returned ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    console.log(`ChainAbuse Response:`, JSON.stringify(data, null, 2));

    // Parse reports from response
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
    console.error('Proxy server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChainAbuse proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 ChainAbuse Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - POST /api/check-address (ChainAbuse)`);
});
