export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { symbol } = req.query;
  if (!symbol) { res.status(400).json({ error: 'symbol required' }); return; }

  try {
    // Step 1: get crumb and cookie from Yahoo
    const cookieResp = await fetch('https://finance.yahoo.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const cookies = cookieResp.headers.get('set-cookie') || '';

    const crumbResp = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookies,
      }
    });
    const crumb = await crumbResp.text();

    // Step 2: fetch chart data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=6mo&crumb=${encodeURIComponent(crumb)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': cookies,
      }
    });

    if (!r.ok) throw new Error(`Yahoo error ${r.status}`);
    const data = await r.json();
    res.status(200).json(data);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
