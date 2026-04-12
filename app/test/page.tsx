'use client';

import { useEffect, useState, useRef } from 'react';
import { makeMasterDecision } from '@/lib/core/master-control';
import { fetchAvailability } from '@/lib/data/fetch-availability';

export default function TestPage() {
  const [decision, setDecision] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [userPrefs, setUserPrefs] = useState<any>({
    maxDistanceKm: 20,
    variant: { storage: '256GB', color: 'Titan' }
  });

  const [appMode, setAppMode] = useState(true);

  const lastPushRef = useRef<number>(0);
  const lastScoreRef = useRef<number>(0);
  const lastStatusRef = useRef<string | null>(null);
  const lastStockRef = useRef<Record<string, number>>({});
  const lastBestStoreRef = useRef<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const lastCheckRef = useRef<number>(Date.now());

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      alert('Notification Permission: ' + permission);
    }
  };

  useEffect(() => {
    // 🔐 Load user preferences from localStorage
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lavinia_user_prefs') : null;
    if (stored) {
      try {
        setUserPrefs(JSON.parse(stored));
      } catch {}
    }

    let interval: any;

    const load = async () => {
      // 🌐 Fetch (simulated) live data
      const data = await fetchAvailability();

      const mockContext = {
        availability: data.availability,
        pricing: {
          currentPrice: 1199,
          avgPrice30d: 1299,
          effectivePriceAfterTradeIn: 899
        },
        prediction: {
          confidence: 0.9
        },
        signals: data.signals,
        // meta optional – Launch wird automatisch erkannt
        userPreferences: userPrefs
      };

      const result = makeMasterDecision(mockContext);
      setDecision(result);
      setContext(mockContext);

      // ⏱ last check timestamp
      lastCheckRef.current = Date.now();

      // 📊 Verlauf (max 30 Punkte)
      setHistory((prev) => {
        const next = [...prev, result?.score ?? 0];
        return next.slice(-30);
      });

      // 🔔 Smart Push (Anti-Spam + intelligente Events)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const now = Date.now();
        const COOLDOWN = 60000; // 60s

        const currentScore = result?.score ?? 0;
        const currentStatus = mockContext?.availability?.status ?? null;
        const currentBestStore = result?.checkout?.store?.id ?? null;

        // 📊 Score Sprung > +5
        const scoreJump = currentScore - (lastScoreRef.current ?? 0) > 5;

        // 🔄 Statuswechsel
        const statusChanged = currentStatus !== lastStatusRef.current;

        // 🏪 neuer bester Store
        const newBestStore = currentBestStore && currentBestStore !== lastBestStoreRef.current;

        // 🏪 Stock Increase (any store)
        let stockIncreased = false;
        const stores = mockContext?.availability?.nearbyStores ?? [];
        stores.forEach((s: any) => {
          const prev = lastStockRef.current[s.storeId] ?? 0;
          if ((s.quantity ?? 0) > prev) stockIncreased = true;
          lastStockRef.current[s.storeId] = s.quantity ?? 0;
        });

        if (
          Notification.permission === 'granted' &&
          result?.action === 'buy_now' &&
          now - lastPushRef.current > COOLDOWN &&
          (scoreJump || statusChanged || newBestStore || stockIncreased)
        ) {
          lastPushRef.current = now;

          const n = new Notification('Jetzt verfügbar 🔥', {
            body: `${currentBestStore ?? 'in deiner Nähe'} • Score ${currentScore}`
          });

          n.onclick = () => {
            window.focus();
            window.location.href = '/test';
          };
        }

        // update refs
        lastScoreRef.current = currentScore;
        lastStatusRef.current = currentStatus;
        lastBestStoreRef.current = currentBestStore;
      }

      // 💾 Save user preferences
      if (typeof window !== 'undefined') {
        localStorage.setItem('lavinia_user_prefs', JSON.stringify(userPrefs));
      }
    };

    // initial load
    load();

    // 🔄 auto refresh (simuliert Live-Daten)
    const getInterval = () => {
      if (decision?.action === 'buy_now') return 5000; // aggressiv
      if (decision?.action === 'wait') return 10000;
      return 25000; // ruhig
    };

    interval = setInterval(load, getInterval());

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!decision) return <div style={{
    padding: 16,
    maxWidth: 520,
    margin: '0 auto',
    fontFamily: 'system-ui'
  }}>Lade...</div>;

  return (
    <div style={{
      padding: 14,
      maxWidth: 520,
      margin: '0 auto',
      fontFamily: 'system-ui',
      lineHeight: 1.4
    }}>
      <button
        onClick={requestNotificationPermission}
        style={{
          marginBottom: 15,
          padding: 10,
          background: '#3b82f6',
          color: 'white',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        🔔 Push aktivieren
      </button>
      <button
        onClick={() => setAppMode(!appMode)}
        style={{
          marginBottom: 10,
          padding: 8,
          background: '#222',
          color: 'white',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        {appMode ? '🔓 Debug anzeigen' : '🔒 App Mode'}
      </button>
      <div style={{
        marginBottom: 15,
        padding: 12,
        background: '#0b0b0b',
        borderRadius: 10,
        border: '1px solid #222'
      }}>
        <div style={{ fontSize: 12, color: '#aaa' }}>Live Status</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ color: '#ccc' }}>
            letzter Check: {Math.round((Date.now() - lastCheckRef.current) / 1000)}s
          </div>
          <div style={{ fontWeight: 'bold' }}>
            {decision.action === 'buy_now' ? 'active 🔥' : 'monitoring 👀'}
          </div>
        </div>

        {/* 📊 Verlauf (Mini Graph) */}
        <div style={{ marginTop: 10, display: 'flex', gap: 2 }}>
          {history.map((h, i) => (
            <div key={i} style={{
              width: 4,
              height: Math.max(4, h / 2),
              background: h > 85 ? '#22c55e' : h > 70 ? '#f59e0b' : '#ef4444'
            }} />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20, padding: 15, background: '#111', borderRadius: 10 }}>
        <h3>User Einstellungen ⚙️</h3>

        <label style={{ display: 'block', marginTop: 10 }}>
          Max Entfernung (km):
          <input
            type="number"
            value={userPrefs.maxDistanceKm}
            onChange={(e) => {
              const updated = {
                ...userPrefs,
                maxDistanceKm: Number(e.target.value)
              };
              setUserPrefs(updated);
              localStorage.setItem('lavinia_user_prefs', JSON.stringify(updated));
            }}
            style={{ marginLeft: 10, width: 80 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 10 }}>
          Speicher:
          <select
            value={userPrefs.variant.storage}
            onChange={(e) => {
              const updated = {
                ...userPrefs,
                variant: { ...userPrefs.variant, storage: e.target.value }
              };
              setUserPrefs(updated);
              localStorage.setItem('lavinia_user_prefs', JSON.stringify(updated));
            }}
            style={{ marginLeft: 10 }}
          >
            <option>128GB</option>
            <option>256GB</option>
            <option>512GB</option>
            <option>1TB</option>
          </select>
        </label>

        <label style={{ display: 'block', marginTop: 10 }}>
          Farbe:
          <select
            value={userPrefs.variant.color}
            onChange={(e) => {
              const updated = {
                ...userPrefs,
                variant: { ...userPrefs.variant, color: e.target.value }
              };
              setUserPrefs(updated);
              localStorage.setItem('lavinia_user_prefs', JSON.stringify(updated));
            }}
            style={{ marginLeft: 10 }}
          >
            <option>Titan</option>
            <option>Schwarz</option>
            <option>Weiß</option>
            <option>Blau</option>
          </select>
        </label>
      </div>
      <div style={{
        marginBottom: 15,
        padding: 12,
        background: '#0b0b0b',
        borderRadius: 10,
        border: '1px solid #222'
      }}>
        <div style={{ fontSize: 12, color: '#aaa' }}>Mini Dashboard</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {decision.action === 'buy_now' && '🔥 BUY NOW'}
              {decision.action === 'wait' && '⏳ WAIT'}
              {decision.action === 'monitor' && '👀 MONITOR'}
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {decision.checkout?.store?.id ?? '—'} • {Math.round(context?.availability?.nearbyStores?.find((s:any)=>s.storeId===decision.checkout?.store?.id)?.distanceKm ?? 0)} km
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
            {decision.score}
          </div>
        </div>
      </div>
      {!appMode && (
        <>
          <h1 style={{ fontSize: 18, marginTop: 10 }}>Decision Engine</h1>

          <h2>
            {decision.action === 'buy_now' && "Jetzt zuschlagen 🔥"}
            {decision.action === 'wait' && "Guter Moment kommt ⏳"}
            {decision.action === 'monitor' && "Weiter beobachten 👀"}
          </h2>

          <p style={{ fontSize: 28, fontWeight: 'bold' }}>
            Score: {decision.score}
          </p>

          <div style={{
            marginTop: 10,
            height: 10,
            background: '#333',
            borderRadius: 10
          }}>
            <div style={{
              width: `${decision.score}%`,
              height: '100%',
              background: decision.score > 85 ? '#22c55e' : decision.score > 70 ? '#f59e0b' : '#ef4444',
              borderRadius: 10,
              transition: 'width 0.3s ease'
            }} />
          </div>

          {decision.recoveryTips?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Tipps:</h3>
              {decision.recoveryTips.map((tip: string, i: number) => (
                <p key={i} style={{ color: '#aaa', marginTop: 5 }}>
                  💡 {tip}
                </p>
              ))}
            </div>
          )}

          {decision.pushPayload && (
            <div style={{ marginTop: 20 }}>
              <h3>Push Preview 🔔</h3>
              <p><strong>{decision.pushPayload.title}</strong></p>
              <p>{decision.pushPayload.body}</p>
            </div>
          )}

          {decision.checkout && (
            <div style={{ marginTop: 20 }}>
              <h3>Checkout bereit 🚀</h3>

              <p><strong>Beste Option:</strong> {decision.checkout.store.id}</p>
              <p>Distanz: {Math.round(decision.checkout.store.distance)} km</p>

              <h4 style={{ marginTop: 10 }}>Weitere Stores:</h4>
              {context?.availability?.nearbyStores?.map((s: any, i: number) => (
                <p key={i} style={{ color: '#aaa' }}>
                  {s.storeId} – {s.distanceKm} km ({s.quantity} verfügbar)
                </p>
              ))}

              <button
                onClick={() => alert(`🚀 Checkout gestartet für ${decision.checkout.store.id}`)}
                style={{
                  padding: 16,
                  background: '#22c55e',
                  color: 'white',
                  borderRadius: 10,
                  marginTop: 15,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Jetzt kaufen
              </button>
            </div>
          )}
        </>
      )}

      {decision.hybridPlan && (
        <div style={{ marginTop: 30, padding: 15, background: '#111', borderRadius: 10 }}>
          <h3>Hybrid Strategie 🧠</h3>

          {decision.hybridPlan.steps.map((step: string, i: number) => (
            <p key={i} style={{ color: '#ccc', marginTop: 5 }}>
              {i + 1}. {step}
            </p>
          ))}

          <div style={{ marginTop: 10, color: '#22c55e', fontWeight: 'bold' }}>
            Empfehlung: Schnell sichern + parallel optimieren 🚀
          </div>
        </div>
      )}
    </div>
  );
}