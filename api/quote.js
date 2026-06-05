export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { symbol } = req.query;
  if (!symbol) { res.status(400).json({ error: 'symbol required' }); return; }

  try {
    const FMP_KEY = 'jWKdS9lVU0qWZc6r3bz2vk2oQ8o1vbGM';
    
    // Current quote
    const quoteResp = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`
    );
    const quoteData = await quoteResp.json();
    if (!quoteData || quoteData.length === 0) throw new Error(`"${symbol}" non trovato`);
    const q = quoteData[0];

    // Historical prices (90 days)
    const histResp = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?timeseries=90&apikey=${FMP_KEY}`
    );
    const histData = await histResp.json();
    const historical = (histData.historical || []).reverse();
    const closes = historical.map(d => d.close);

    res.status(200).json({
      symbol: q.symbol,
      name: q.name,
      exchange: q.exchange,
      price: q.price,
      changesPercentage: q.changesPercentage,
      yearHigh: q.yearHigh,
      yearLow: q.yearLow,
      marketCap: q.marketCap,
      pe: q.pe,
      eps: q.eps,
      priceDate: new Date().toISOString().split('T')[0],
      closes: closes
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
