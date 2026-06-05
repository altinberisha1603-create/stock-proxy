export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { symbol } = req.query;
  if (!symbol) { res.status(400).json({ error: 'symbol required' }); return; }

  const FMP_KEY = 'jWKdS9lVU0qWZc6r3bz2vk2oQ8o1vbGM';

  // Detect if it's a US ticker (no dot) or European (has dot like VWCE.DE, ENI.MI, EGLN.L)
  const isUS = !symbol.includes('.');

  try {
    if (isUS) {
      // ── US stocks via FMP ──
      const quoteResp = await fetch(
        `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`
      );
      const quoteData = await quoteResp.json();
      if (!quoteData || quoteData.length === 0) throw new Error(`"${symbol}" non trovato`);
      const q = quoteData[0];

      const histResp = await fetch(
        `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&limit=90&apikey=${FMP_KEY}`
      );
      const histData = await histResp.json();
      const historical = ((histData.results || histData.historical || histData) || []).reverse();
      const closes = historical.map(d => d.close || d.adjClose).filter(v => v);

      return res.status(200).json({
        symbol: q.symbol, name: q.name, exchange: q.exchange,
        price: q.price, changesPercentage: q.changesPercentage,
        yearHigh: q.yearHigh, yearLow: q.yearLow,
        marketCap: q.marketCap, pe: q.pe, eps: q.eps,
        priceDate: new Date().toISOString().split('T')[0],
        closes: closes
      });

    } else {
      // ── European ETF/stocks via Yahoo Finance ──
      const yahooSymbol = symbol; // already has suffix e.g. VWCE.DE, ENI.MI, EGLN.L

      // Get crumb
      const cookieResp = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' }
      });
      const cookies = (cookieResp.headers.get('set-cookie') || '').split(';')[0];

      const crumbResp = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Cookie': cookies
        }
      });
      const crumb = await crumbResp.text();

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo&crumb=${encodeURIComponent(crumb)}`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Cookie': cookies
        }
      });
      if (!r.ok) throw new Error(`Yahoo error ${r.status}`);
      const data = await r.json();

      const result = data.chart && data.chart.result && data.chart.result[0];
      if (!result) throw new Error(`"${symbol}" non trovato su Yahoo Finance`);

      const meta = result.meta || {};
      const quotes = result.indicators && result.indicators.quote && result.indicators.quote[0];
      const closes = (quotes && quotes.close || []).filter(v => v !== null && !isNaN(v));
      const timestamps = result.timestamp || [];
      const lastTs = timestamps[timestamps.length - 1];
      const prevClose = meta.chartPreviousClose || closes[closes.length - 2];
      const curP = meta.regularMarketPrice || closes[closes.length - 1];
      const chg = prevClose ? ((curP - prevClose) / prevClose * 100) : 0;

      return res.status(200).json({
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        exchange: meta.exchangeName || '',
        price: curP,
        changesPercentage: parseFloat(chg.toFixed(2)),
        yearHigh: meta.fiftyTwoWeekHigh || Math.max(...closes),
        yearLow: meta.fiftyTwoWeekLow || Math.min(...closes),
        marketCap: null, pe: null, eps: null,
        priceDate: lastTs ? new Date(lastTs * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        closes: closes.slice(-90)
      });
    }

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
