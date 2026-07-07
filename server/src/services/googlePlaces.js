import fetch from 'node-fetch';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.currentOpeningHours.openNow',
  'places.currentOpeningHours.weekdayDescriptions',
  'places.editorialSummary',
  'places.reviews',
  'places.types',
  'nextPageToken',
].join(',');

/**
 * Searches Google Places (New) Text Search for a category + city.
 * Returns up to 60 results by following nextPageToken (max 3 pages of 20).
 */
export async function searchPlaces(category, city) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set. Add it to server/.env');
  }

  const query = `${category} in ${city}`;
  const results = [];
  let pageToken = null;
  let pagesFetched = 0;

  do {
    const body = { textQuery: query };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Places API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    results.push(...(data.places || []));
    pageToken = data.nextPageToken || null;
    pagesFetched += 1;

    // Google requires a short delay before a pageToken becomes valid.
    if (pageToken && pagesFetched < 3) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  } while (pageToken && pagesFetched < 3);

  return results.map(normalizePlace);
}

function normalizePlace(place) {
  const websiteUrl = place.websiteUri || null;

  // Best review snippet: pick the highest-rated English review with actual text
  const reviews = place.reviews || [];
  const bestReview = reviews
    .filter((r) => r.text?.text && r.text.text.length > 20)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];

  return {
    place_id: place.id,
    name: place.displayName?.text || 'Unknown',
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    address: place.formattedAddress || null,
    rating: place.rating ?? null,
    review_count: place.userRatingCount ?? null,
    website_url: websiteUrl,
    has_website: websiteUrl ? 1 : 0,
    open_now: place.currentOpeningHours?.openNow ?? null,
    opening_hours: place.currentOpeningHours?.weekdayDescriptions || null,
    description: place.editorialSummary?.text || null,
    review_snippet: bestReview ? bestReview.text.text.slice(0, 300) : null,
    types: place.types || [],
  };
}

/**
 * Quick sanity check on a website URL: does it resolve, and does it look
 * like a parked/placeholder domain? Best-effort only — failures are treated
 * as "couldn't verify" rather than thrown.
 */
export async function checkWebsiteHealth(url) {
  if (!url) return { reachable: false, looksParked: false };
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', timeout: 8000 });
    const text = (await res.text()).toLowerCase();
    const parkedSignals = ['domain is for sale', 'parked domain', 'this domain is parked', 'buy this domain'];
    const looksParked = parkedSignals.some((s) => text.includes(s));
    return { reachable: res.ok, looksParked };
  } catch {
    return { reachable: false, looksParked: false };
  }
}
