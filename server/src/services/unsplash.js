import fetch from 'node-fetch';

const API_URL = 'https://api.unsplash.com/photos/random';

/**
 * Fetches a real stock photo URL from Unsplash for a given search query.
 * Returns null (rather than throwing) if no key is set or the call fails —
 * demo site generation should still work without images, just without photos.
 */
export async function getStockPhotoUrl(query, { orientation = 'landscape' } = {}) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const url = `${API_URL}?query=${encodeURIComponent(query)}&orientation=${orientation}&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      console.warn(`Unsplash API error (${res.status}) for query "${query}"`);
      return null;
    }

    const data = await res.json();
    // Use the "regular" sized rendition (~1080px wide) — plenty for a web hero/section image.
    return data?.urls?.regular || null;
  } catch (err) {
    console.warn(`Unsplash fetch failed for query "${query}":`, err.message);
    return null;
  }
}

/**
 * Fetches a small set of images for a demo site: one hero/wide shot and one
 * supporting shot, both keyed off the business category.
 */
export async function getDemoSiteImages(category) {
  const [hero, secondary] = await Promise.all([
    getStockPhotoUrl(`${category} business professional`),
    getStockPhotoUrl(`${category} worker on the job`),
  ]);
  return { hero, secondary };
}
