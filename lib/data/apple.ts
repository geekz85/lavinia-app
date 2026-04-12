export async function fetchAppleAvailability(zip = '50667') {
  try {
    const res = await fetch(
      'https://www.apple.com/de/shop/fulfillment-messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parts: [
            'MU7D3ZD/A', // Beispiel iPhone Modell (später dynamisch)
          ],
          location: zip,
        }),
      }
    );

    const data = await res.json();

    return data?.body?.content?.pickupMessage?.stores || [];
  } catch (err) {
    console.error('Apple fetch error:', err);
    return [];
  }
}