export async function fetchAvailability() {
  // 🔥 simulierte API (später ersetzbar)
  return {
    availability: {
      status: 'in_stock',
      nearbyStores: [
        { storeId: 'Köln', distanceKm: 12, quantity: Math.floor(Math.random() * 5) + 1 },
        { storeId: 'Düsseldorf', distanceKm: 25, quantity: Math.floor(Math.random() * 8) },
        { storeId: 'Bonn', distanceKm: 18, quantity: Math.floor(Math.random() * 3) }
      ],
      movementScore: Math.floor(Math.random() * 100)
    },
    signals: {
      socialMomentum: Math.floor(Math.random() * 100),
      flapScore: Math.floor(Math.random() * 50)
    }
  };
}