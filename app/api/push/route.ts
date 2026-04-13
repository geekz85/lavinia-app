import { NextResponse } from 'next/server';
import webpush from 'web-push';

let subscriptions: any[] = [];

// 🔐 VAPID Keys (später in ENV speichern!)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:geekz85@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.error('❌ VAPID keys missing!');
}

// 📥 Subscription speichern
export async function POST(req: Request) {
  const sub = await req.json();
  subscriptions.push(sub);

  console.log('New subscription saved:', subscriptions.length);

  return NextResponse.json({ success: true });
}

// 🔥 ECHTEN PUSH SENDEN
export async function GET() {
  if (!subscriptions.length) {
    return NextResponse.json({ message: 'Keine Geräte registriert' });
  }

  const payload = JSON.stringify({
    title: 'Jetzt verfügbar 🔥',
    body: 'Köln • Score hoch – jetzt zuschlagen!',
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, payload)
    )
  );

  console.log('Push results:', results);

  return NextResponse.json({
    message: `Push gesendet an ${subscriptions.length} Geräte`
  });
}