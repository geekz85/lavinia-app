export function shouldSendPush(context: any, decision: any) {
  // ❌ keine Push wenn nicht verfügbar
  if (context.availability.status !== 'in_stock') {
    return false;
  }

  // ❌ keine Push wenn Score zu niedrig
  if (decision.score < 85) {
    return false;
  }

  // ❌ keine Push bei instabilem Stock (FlapScore)
  if ((context.signals?.flapScore ?? 0) > 60) {
    return false;
  }

  // ✅ Apple Morning Window (intern)
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  const isAppleWindow =
    hour === 9 && minutes >= 30 ||
    hour === 10 && minutes <= 5;

  // 👉 nur im richtigen Zeitfenster aggressiv pushen
  if (isAppleWindow) {
    return true;
  }

  // 👉 außerhalb: nur bei sehr starkem Signal
  return decision.score >= 92;
}