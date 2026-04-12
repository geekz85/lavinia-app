export function prepareCheckout(context: any, decision: any) {
  if (decision.action !== 'buy_now') {
    return null;
  }

  const store = context.availability?.nearbyStores?.[0];

  return {
    productId: context.productId ?? 'iphone-17-pro',
    variant: {
      storage: '256GB',
      color: 'Titan',
    },
    store: {
      id: store?.storeId ?? 'unknown',
      distance: store?.distanceKm ?? 0,
    },
    checkoutUrl: `/checkout?product=${context.productId}&store=${store?.storeId}`,
  };
}