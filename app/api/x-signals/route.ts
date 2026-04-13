export async function GET() {
  try {
    const query = encodeURIComponent('iphone OR ps5 OR gpu restock');

    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=10`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    const data = await res.json();

    const tweets = data?.data || [];

    let level = 'none';

    const text = tweets.map((t: any) => t.text.toLowerCase()).join(' ');

    if (text.includes('in stock') || text.includes('available now')) {
      level = 'strong';
    } else if (text.includes('restock') || text.includes('drop')) {
      level = 'medium';
    }

    return Response.json({ level });
  } catch (e) {
    return Response.json({ level: 'none' });
  }
}