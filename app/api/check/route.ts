import { fetchAppleAvailability } from '@/lib/data/apple';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const data = await fetchAppleAvailability({
    zip: '50667',
    models: ['MTW03ZD/A'],
  });

  for (const store of data.stores) {
    // 1. Letzten Eintrag holen
    const { data: last } = await supabase
      .from('availability')
      .select('*')
      .eq('store', store.name)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const changed =
      !last ||
      last.available !== store.available ||
      last.stock !== store.stock;

    // 2. Immer speichern
    await supabase.from('availability').insert({
      store: store.name,
      model: 'MTW03ZD/A',
      available: store.available,
      stock: store.stock,
    });

    // 3. Nur bei Änderung reagieren
    if (changed && store.available) {
      console.log('🔥 DROP DETECTED:', store.name);

      // 👉 später: Push hier rein
    }
  }

  return Response.json({ ok: true });
}