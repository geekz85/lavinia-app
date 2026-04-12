import { shouldSendPush } from '@/lib/push-ai/trigger';
import { formatPush } from '@/lib/push-ai/formatter';
import { prepareCheckout } from '@/lib/checkout/helper';

export function makeMasterDecision(context: any) {
  const availabilityScore =
    context.availability.status === 'in_stock' ? 90 : 20;

  const priceScore =
    context.pricing.currentPrice < context.pricing.avgPrice30d ? 85 : 60;

  const predictionScore = (context.prediction.confidence ?? 0) * 100;

  const distanceScore = Math.max(
    0,
    100 - (context.availability.nearbyStores?.[0]?.distanceKm ?? 50) * 5
  );

  const competitionScore = context.signals?.socialMomentum ?? 50;

  const flapScore = context.signals?.flapScore ?? 0;
  const stabilityPenalty = flapScore > 60 ? 20 : 0;

  const movementScore = context.availability?.movementScore ?? 50;

  const finalScore = Math.round(
    availabilityScore * 0.25 +
      priceScore * 0.2 +
      predictionScore * 0.15 +
      distanceScore * 0.1 +
      competitionScore * 0.15 +
      movementScore * 0.15 -
      stabilityPenalty
  );

  // 🚀 Auto Launch Detection (final)
  const isLaunch =
    (context.signals?.socialMomentum ?? 0) > 85 ||
    (
      (context.availability?.movementScore ?? 0) > 80 &&
      context.availability?.status === 'in_stock'
    ) ||
    (
      context.availability?.status === 'in_stock' &&
      (context.previousAvailability === 'out_of_stock')
    );

  // 🚀 Launch Mode Score Adjustment
  let adjustedScore = finalScore;

  if (isLaunch) {
    adjustedScore = Math.min(100, finalScore + 8);
  }

  let action: 'buy_now' | 'wait' | 'monitor' = 'monitor';

  if (adjustedScore >= 75 && context.availability.status === 'in_stock') {
    action = 'buy_now';
  } else if (adjustedScore >= 65) {
    action = 'wait';
  }

  // 🔥 Recovery Engine
  let recoveryTips: string[] = [];

  if (context.availability.status === 'out_of_stock') {
    recoveryTips = [
      'Abholung im Store statt Lieferung versuchen',
      'Andere Städte in der Nähe prüfen',
    ];
  }

  // 🔔 Push AI
  const shouldPush = shouldSendPush(context, { score: adjustedScore });
  const pushPayload = shouldPush
    ? formatPush(context, { score: adjustedScore })
    : null;

  const checkout = prepareCheckout(context, { action });

  // 🧠 Hybrid Strategy Engine
  let hybridPlan: any = null;

  if (action === 'buy_now') {
    hybridPlan = {
      strategy: 'hybrid',
      steps: [
        'Sichere dir das Gerät per Lieferung (Fallback)',
        'Beobachte parallel Stores in deiner Nähe',
        'Wenn ein näherer Store verfügbar wird → dort bestellen',
        'Ursprüngliche Bestellung stornieren (keine Doppelbelastung vor Versand)'
      ],
      recommended: true
    };
  }

  return {
    action,
    score: adjustedScore,
    recoveryTips,
    pushPayload,
    checkout,
    hybridPlan,
  };
}