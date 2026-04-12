export const formatPush = (context: any, decision: any) => {
  const store = context?.availability?.nearbyStores?.[0];

  return {
    title: 'Jetzt verfügbar 🔥',
    body: `In deiner Nähe (${Math.round(store?.distanceKm ?? 0)} km) – nur wenige Geräte verfügbar.`,
  };
};