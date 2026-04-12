export function makeSimpleDecision(context: any) {
  const isGoodDeal =
    context.pricing.currentPrice < context.pricing.avgPrice30d;

  const isAvailable =
    context.availability.status === 'in_stock';

  const isHighConfidence =
    context.prediction.confidence > 0.8;

  let action = 'monitor';

  if (isAvailable && isGoodDeal && isHighConfidence) {
    action = 'buy_now';
  } else if (isHighConfidence) {
    action = 'wait';
  }

  const score = Math.round(
    (isAvailable ? 40 : 10) +
    (isGoodDeal ? 30 : 10) +
    (isHighConfidence ? 30 : 10)
  );

  return { action, score };
}