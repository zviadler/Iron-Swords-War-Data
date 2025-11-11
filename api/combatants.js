const DEFAULT_TABLE = 'iron_swords_war_data';

module.exports = async (req, res) => {
  const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_TABLE = DEFAULT_TABLE
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({
      error: 'Supabase environment variables are missing',
      hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in your Vercel project'
    });
    return;
  }

  const url = new URL(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${encodeURIComponent(SUPABASE_TABLE)}`);
  url.searchParams.set('select', '*');

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({
        error: 'Supabase request failed',
        status: response.status,
        details: text
      });
      return;
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ source: 'supabase', data });
  } catch (err) {
    console.error('[API] Supabase fetch failed', err);
    res.status(500).json({ error: 'Internal error while fetching data' });
  }
};
