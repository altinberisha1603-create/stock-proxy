export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { symbol } = req.query;
  if (!symbol) { res.status(400).json({ error: 'symbol required' }); return; }

  try {
    const FMP_KEY = 'jWKdS9lVU0qWZc6r3bz2vk2oQ8o1vbGM';

    const quoteResp = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`
    );
    const raw = await quoteResp.text();

    res.status(200).json({ debug: raw, status: quoteResp.status });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
