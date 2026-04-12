type AppleFetchOptions = {
  zip?: string;
  model?: string;
  models?: string[];
};

// Helper: default models (fallback)
const DEFAULT_MODELS = [
  'MTV03ZD/A', // iPhone 256GB Titan
];

export async function fetchAppleAvailability(options: AppleFetchOptions = {}) {
  const zip = options.zip || '50667';

  // allow single model OR multiple
  const parts =
    options.models && options.models.length > 0
      ? options.models
      : options.model
      ? [options.model]
      : DEFAULT_MODELS;

  try {
    const res = await fetch(
      'https://www.apple.com/de/shop/fulfillment-messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parts,
          location: zip,
        }),
      }
    );

    const data = await res.json();

    return {
      stores: data?.body?.content?.pickupMessage?.stores || [],
      parts,
      zip,
      raw: data,
    };
  } catch (err) {
    console.error('Apple fetch error:', err);
    return {
      stores: [],
      parts,
      zip,
      error: true,
    };
  }
}