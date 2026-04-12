import { NextResponse } from 'next/server';

let subscriptions: any[] = [];

export async function POST(req: Request) {
  const sub = await req.json();
  subscriptions.push(sub);

  return NextResponse.json({ success: true });
}

// später: hier senden wir echte Pushes