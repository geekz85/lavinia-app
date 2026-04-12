import { NextResponse } from 'next/server';

let subscriptions: any[] = [];

// 📥 speichern (wie bisher)
export async function POST(req: Request) {
  const sub = await req.json();
  subscriptions.push(sub);

  return NextResponse.json({ success: true });
}

// 🔥 TEST PUSH SENDEN (GET)
export async function GET() {
  console.log('Sending test push to:', subscriptions.length, 'devices');

  // ⚠️ aktuell nur simuliert (echter Push kommt gleich im nächsten Step)
  return NextResponse.json({
    message: `Push vorbereitet für ${subscriptions.length} Geräte`
  });
}