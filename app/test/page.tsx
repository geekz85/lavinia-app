'use client';

// Helper: random human-like delay (ms)
function randomDelay(min = 800, max = 2500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function isAppleLink(url: string) {
  return url.includes('apple.com');
}

// 🔧 Global fallback (fix for build – real ref is inside component)
const storePriorityRef: { current: Record<string, number> } = { current: {} };

// 🌐 Smart Domain Profiles v2
function getDomainProfile(url: string) {
  const domainStats = storePriorityRef.current || {};

  if (url.includes('apple.com')) {
    return { name: 'apple', sniper: false, aggressiveness: 'safe' };
  }

  if (url.includes('amazon')) {
    const score = domainStats['amazon'] || 0;

    let aggressiveness = 'medium';

    if (score > 30) aggressiveness = 'aggressive';
    else if (score < 5) aggressiveness = 'low';

    return {
      name: 'amazon',
      sniper: true,
      aggressiveness
    };
  }

  if (url.includes('mediamarkt') || url.includes('saturn')) {
    return { name: 'retail', sniper: true, aggressiveness: 'medium' };
  }

  return { name: 'default', sniper: true, aggressiveness: 'normal' };
}

// 🏹 Checkout Sniper Mode: Auto-clicks checkout/buy buttons in DOM (best effort)
function startCheckoutSniper() {
  const CLICK_TEXTS = ['in den warenkorb', 'kaufen', 'add to bag', 'buy'];

  // --- Queue detection helper ---
  const detectQueue = () => {
    const text = document.body.innerText.toLowerCase();

    if (
      text.includes('warteschlange') ||
      text.includes('queue') ||
      text.includes('bitte warten') ||
      text.includes('you are in line') ||
      text.includes('high demand')
    ) {
      console.log('⏳ Queue erkannt');
      return 'queue';
    }

    if (
      text.includes('nicht verfügbar') ||
      text.includes('currently unavailable') ||
      text.includes('out of stock')
    ) {
      console.log('❌ Kein Stock');
      return 'no_stock';
    }

    return 'ok';
  };

  const tryClick = () => {
    // 🔍 Check queue first
    const queueState = detectQueue();
    if (queueState === 'queue') {
      return false;
    }

    const elements = Array.from(document.querySelectorAll('button, a')) as HTMLElement[];

    const target = elements.find(el => {
      const text = el.innerText?.toLowerCase() || '';
      return CLICK_TEXTS.some(t => text.includes(t));
    });

    if (target) {
      console.log('🎯 Ultra Sniper: Button gefunden → klick');

      // 🧠 Human-like delay before click
      setTimeout(() => {
        target.click();
      }, randomDelay(100, 400));

      return true;
    }

    return false;
  };

  // 🚀 Instant check first
  if (tryClick()) return;

  // 👀 Observe DOM changes (react instantly)
  const observer = new MutationObserver(() => {
    const success = tryClick();
    if (success) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // ⏱ fallback interval (safety)
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;

    const state = detectQueue();

    // 🧠 Queue Breaker Logic
    if (state === 'queue') {
      const delay = randomDelay(2000, 5000);

      if (attempts % 5 === 0) {
        console.log('🔄 Smart refresh (queue)');
        setTimeout(() => location.reload(), delay);
      }

      if (attempts % 9 === 0) {
        console.log('⏳ Human wait (queue)');
        return;
      }
    }

    if (state === 'no_stock') {
      // faster retry when no stock
      if (attempts % 3 === 0) {
        console.log('⚡ Fast retry (no stock)');
        location.reload();
      }
    }

    if (document.visibilityState !== 'visible') return;

    const success = tryClick();

    if (success || attempts > 80) {
      clearInterval(interval);
      observer.disconnect();
    }
  }, 300);
}

// 🔑 SKU Mapping (Model + Storage + Color → Apple Part Number)
const SKU_MAP: Record<string, string> = {
  // iPhone 17 Pro
  'iPhone 17 Pro_128GB_Titan': 'MTW01ZD/A',
  'iPhone 17 Pro_256GB_Titan': 'MTW03ZD/A',
  'iPhone 17 Pro_512GB_Titan': 'MTW13ZD/A',
  'iPhone 17 Pro_1TB_Titan': 'MTW23ZD/A',

  // iPhone 17 Pro Max
  'iPhone 17 Pro Max_256GB_Titan': 'MTW43ZD/A',
  'iPhone 17 Pro Max_512GB_Titan': 'MTW53ZD/A',
  'iPhone 17 Pro Max_1TB_Titan': 'MTW63ZD/A',

  // iPhone 16 Pro
  'iPhone 16 Pro_128GB_Titan': 'MTV01ZD/A',
  'iPhone 16 Pro_256GB_Titan': 'MTV03ZD/A',
  'iPhone 16 Pro_512GB_Titan': 'MTV13ZD/A',
  'iPhone 16 Pro_1TB_Titan': 'MTV23ZD/A',

  // iPhone 16 Pro Max
  'iPhone 16 Pro Max_256GB_Titan': 'MTV43ZD/A',
  'iPhone 16 Pro Max_512GB_Titan': 'MTV53ZD/A',
  'iPhone 16 Pro Max_1TB_Titan': 'MTV63ZD/A',

  // iPhone 16 (Base)
  'iPhone 16_128GB_Schwarz': 'MTRX3ZD/A',
  'iPhone 16_256GB_Schwarz': 'MTRY3ZD/A',
  'iPhone 16_512GB_Schwarz': 'MTRZ3ZD/A',

  // iPhone 16 Plus
  'iPhone 16 Plus_128GB_Schwarz': 'MTT13ZD/A',
  'iPhone 16 Plus_256GB_Schwarz': 'MTT23ZD/A',
  'iPhone 16 Plus_512GB_Schwarz': 'MTT33ZD/A',

  // iPhone 15 Pro (Fallback)
  'iPhone 15 Pro_256GB_Titan': 'MTV03ZD/A',
  'iPhone 15 Pro_512GB_Titan': 'MTV13ZD/A',
};

function getSkuFromPrefs(prefs: any): string | null {
  const model = prefs?.variant?.model;
  const storage = prefs?.variant?.storage;
  const color = prefs?.variant?.color;
  const key = `${model}_${storage}_${color}`;
  return SKU_MAP[key] || null;
}

// Helper: get multiple SKUs matching model + storage (ignore color for robustness)
function getSkusFromPrefs(prefs: any): string[] {
  const model = prefs?.variant?.model;
  const storage = prefs?.variant?.storage;

  // collect all SKUs that match model + storage (ignore color for robustness)
  const entries = Object.entries(SKU_MAP);
  const matches = entries
    .filter(([key]) => key.startsWith(`${model}_${storage}`))
    .map(([, sku]) => sku);

  // fallback: if none found, try any SKU for that model
  if (matches.length === 0) {
    return entries
      .filter(([key]) => key.startsWith(`${model}_`))
      .map(([, sku]) => sku)
      .slice(0, 3); // limit
  }

  return matches;
}

// 📍 Rough distance estimation (placeholder until real geo)
function estimateDistanceKm(storeName: string): number {
  const map: Record<string, number> = {
    'Köln': 12,
    'Duesseldorf': 25,
    'Düsseldorf': 25,
    'Bonn': 18,
  };

  const entry = Object.entries(map).find(([city]) => storeName?.includes(city));
  return entry ? entry[1] : 50; // fallback
}

// 🌍 User Location (GPS – optional, fallback bleibt aktiv)
async function getUserLocation(): Promise<{ lat: number; lon: number } | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 3000 }
    );
  });
}

// 📐 Haversine distance (km)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🗺️ Basic store coordinates (extend as needed)
const STORE_COORDS: Record<string, { lat: number; lon: number }> = {
  'Köln': { lat: 50.9375, lon: 6.9603 },
  'Düsseldorf': { lat: 51.2277, lon: 6.7735 },
  'Duesseldorf': { lat: 51.2277, lon: 6.7735 },
  'Bonn': { lat: 50.7374, lon: 7.0982 },
};

// 🔗 Build Apple deep link (simplified)
function buildAppleDeepLink(storeId: string, sku: string) {

  // NOTE: Apple URLs can change; this is a pragmatic deep link to product + pickup context
  const base = 'https://www.apple.com/de/shop/buy-iphone';
  // we pass sku and a hint of store (best effort)
  return `${base}?part=${encodeURIComponent(sku)}&purchaseOption=fullPrice&pickup=true`;
}

import { useEffect, useState, useRef } from 'react';
// 📦 Apple DB Loader
async function getSkusFromDB(prefs: any): Promise<string[]> {
  try {
    const res = await fetch('/data/apple-products.json');
    const data = await res.json();

    const model = prefs?.variant?.model;
    const storage = prefs?.variant?.storage;

    const devices = data.iPhone || [];
    const device = devices.find((d: any) => d.model === model);

    if (!device) return [];

    const matches = device.variants
      .filter((v: any) => v.storage === storage)
      .map((v: any) => v.sku);

    return matches.length ? matches : device.variants.map((v: any) => v.sku);
  } catch (e) {
    console.log('❌ DB Fehler', e);
    return [];
  }
}
import { makeMasterDecision } from '@/lib/core/master-control';
import { fetchAvailability } from '@/lib/data/fetch-availability';
import { fetchAppleAvailability } from '@/lib/data/apple';

// 🛒 Multi-Shop Availability Placeholder
async function fetchMultiShopAvailability(skus: string[]) {
  const results = await Promise.all([
    fetchAppleAvailability({ zip: '50667', models: skus }),

    // 🌍 Amazon EU (vorbereitet für echte APIs)
    fetch('/api/amazon-de').catch(() => null),
    fetch('/api/amazon-fr').catch(() => null),
    fetch('/api/amazon-es').catch(() => null),
    fetch('/api/amazon-it').catch(() => null),
  ]);

  return results;
}
import { registerPush } from '@/lib/push/register';

export default function TestPage() {
  const [decision, setDecision] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [userPrefs, setUserPrefs] = useState<any>({
    maxDistanceKm: 20,
    variant: { model: 'iPhone 17 Pro', storage: '256GB', color: 'Titan' }
  });

  const [appMode, setAppMode] = useState(true);
  const [primarySkuState, setPrimarySkuState] = useState<string | null>(null);
  const [autoBuyAggressive, setAutoBuyAggressive] = useState(false);

  const lastPushRef = useRef<number>(0);
  const lastScoreRef = useRef<number>(0);
  const lastStatusRef = useRef<string | null>(null);
  const lastStockRef = useRef<Record<string, number>>({});
  const lastBestStoreRef = useRef<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [trend, setTrend] = useState<number>(0);
  const historyRef = useRef<number[]>([]);
  const lastCheckRef = useRef<number>(Date.now());
  const storeStatsRef = useRef<Record<string, { hits: number; success: number }>>({});  
  const storePriorityRef = useRef<Record<string, number>>({});
  const timeStatsRef = useRef<Record<number, number>>({});
  const sequenceRef = useRef<string[]>([]);
  const preAlertRef = useRef<number>(0);

  const lastAutoBuyRef = useRef<number>(0);
  const openTabsRef = useRef<number>(0);
  const tabPoolRef = useRef<Window[]>([]);
  const sessionPoolRef = useRef<number>(0);

  // 🧠 Auto-Detection Engine (multi-shop ready)
  const detectGlobalDrop = (stores: any[]) => {
    let signals = 0;

    stores.forEach((s: any) => {
      if (s.quantity > 0) signals += 2;
      if (s.score > 80) signals += 1;
    });

    return signals >= 3; // threshold
  };

  // 🐦 X Signal Detection (placeholder for real API later)
  const detectXSignal = async () => {
    try {
      const res = await fetch('/api/x-signals');
      const data = await res.json();

      if (data?.level === 'strong') return 'strong';
      if (data?.level === 'medium') return 'medium';
      return 'none';
    } catch {
      return 'none';
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
// 🧠 Load AI memory (persistent learning)
const storedStats = typeof window !== 'undefined'
  ? localStorage.getItem('lavinia_ai_stats')
  : null;

if (storedStats) {
  try {
    const parsed = JSON.parse(storedStats);
    storeStatsRef.current = parsed.storeStats || {};
    timeStatsRef.current = parsed.timeStats || {};
    storePriorityRef.current = parsed.storePriority || {};
  } catch {}
}
    let interval: NodeJS.Timeout;

    const load = async () => {
      const userLocation = await getUserLocation();
      // 🌐 Build MULTIPLE SKUs from user preferences
      let skus = await getSkusFromDB(userPrefs);

// fallback wenn DB leer
if (!skus || skus.length === 0) {
  console.log('⚠️ DB leer – fallback auf alte SKU_MAP');
  skus = getSkusFromPrefs(userPrefs);
}

      // 🎯 choose primary SKU for deep link
      const primarySku = skus?.[0] || null;
setPrimarySkuState(primarySku);
      // 🌐 Fetch Apple live data with multiple SKUs
      const data = await fetchAppleAvailability({
        zip: '50667',
        models: skus,
      });

      const stores = data.stores || [];
      const nearbyStores = stores
        .map((s: any) => {
          const quantity = s.partsAvailability?.[0]?.pickupSearchQuote || 0;
          const status = s.partsAvailability?.[0]?.pickupDisplay || 'unavailable';

          // 🔎 resolve store coord by name contains city
          const coordEntry = Object.entries(STORE_COORDS).find(([city]) => s.storeName?.includes(city));

          let distanceKm = estimateDistanceKm(s.storeName);

          if (userLocation && coordEntry) {
            const { lat, lon } = coordEntry[1];
            distanceKm = haversineKm(userLocation.lat, userLocation.lon, lat, lon);
          }

          // 🧠 Smart Score v3
          // --- Adaptive Store Learning: new scoring ---
          const stats = storeStatsRef.current[s.storeId || s.storeName] || { hits: 0, success: 0 };
          const learnedBoost =
            Math.min(stats.hits * 2, 20) +
            Math.min(stats.success * 5, 30);
          const score =
            (status === 'available' ? 70 : 0) +
            Math.max(0, 50 - Math.pow(distanceKm, 1.3)) +
            Math.min(quantity * 8, 40) +
            (distanceKm < 5 ? 20 : 0) +
            learnedBoost; // learning boost
// 🧠 Store Priority AI boost
const priority = storePriorityRef.current[s.storeId || s.storeName] || 0;
          // 🔮 Prediction Signal (v1)
          const predictionBoost =
            score > 80 ? 10 :
            score > 70 ? 5 :
            0;

          // 🔮 Time-based Prediction (v2)
          const currentHour = new Date().getHours();
          const hourHits = timeStatsRef.current[currentHour] || 0;
          const timeBoost = Math.min(hourHits * 2, 15);

          // 🔮 Sequence Prediction (v3)
          const lastStore = sequenceRef.current[sequenceRef.current.length - 1];
          

          let sequenceBoost = 0;
          if (lastStore && s.storeId === lastStore) {
            sequenceBoost = 10;
          }

          return {
            storeId: s.storeId || s.storeName,
            distanceKm,
            quantity,
            status,
            score: score + predictionBoost + timeBoost + sequenceBoost + Math.min(priority * 3, 25),
            predictionBoost,
            timeBoost,
            sequenceBoost
          };
        })
        .filter((s: any) => s.distanceKm <= userPrefs.maxDistanceKm)
        .sort((a, b) => b.score - a.score);

      // 🧠 Learning: track store success
      nearbyStores.forEach((s: any) => {
        const key = s.storeId || s.storeName;
        if (!storeStatsRef.current[key]) {
          storeStatsRef.current[key] = { hits: 0, success: 0 };
        }

        if (s.status === 'available') {
          storeStatsRef.current[key].hits += 1;

          if (s.distanceKm < 15 && s.quantity > 0) {
            storeStatsRef.current[key].success += 1;
          }
        }
      });
// 🧠 Update Store Priority (Top Stores lernen)
// 🧠 Domain Learning (Amazon)
nearbyStores.forEach((s: any) => {
  if (s.storeId?.toLowerCase().includes('amazon')) {
    if (!storePriorityRef.current['amazon']) {
      storePriorityRef.current['amazon'] = 0;
    }

    if (s.quantity > 0) {
      storePriorityRef.current['amazon'] += 2;
    } else {
      storePriorityRef.current['amazon'] -= 1;
    }

    // Begrenzen
    storePriorityRef.current['amazon'] = Math.max(0, Math.min(50, storePriorityRef.current['amazon']));
  }
});
nearbyStores.slice(0, 3).forEach((s: any, index: number) => {
  const key = s.storeId || s.storeName;

  if (!storePriorityRef.current[key]) {
    storePriorityRef.current[key] = 0;
  }

  // Top Store bekommt mehr Gewicht
  storePriorityRef.current[key] += (3 - index);
});
      // 🕒 Learning: track drop times (hour of day)
      const hour = new Date().getHours();
      if (!timeStatsRef.current[hour]) timeStatsRef.current[hour] = 0;
      // count only meaningful signals (availability or high score)
      if (nearbyStores[0]?.status === 'available' || (nearbyStores[0]?.score ?? 0) > 80) {
        timeStatsRef.current[hour] += 1;
      }

      // 🔗 Learning: store sequence of best stores
      if (nearbyStores[0]?.storeId) {
        sequenceRef.current.push(nearbyStores[0].storeId);
        sequenceRef.current = sequenceRef.current.slice(-10);
      }

      // 🧠 Prediction v4: combine signals
      const best = nearbyStores[0];
      const trendScore = trend > 5 ? 20 : 0;
      const timeScore = (timeStatsRef.current[new Date().getHours()] || 0) > 3 ? 15 : 0;
      const sequenceScore = sequenceRef.current.length > 2 ? 15 : 0;
      const baseScore = best?.score ?? 0;

      // 🔮 Prediction AI v5 (trend acceleration + velocity)
      const velocity = historyRef.current.length > 2
        ? historyRef.current[historyRef.current.length - 1] - historyRef.current[historyRef.current.length - 2]
        : 0;

      const acceleration = historyRef.current.length > 3
        ? velocity - (historyRef.current[historyRef.current.length - 2] - historyRef.current[historyRef.current.length - 3])
        : 0;

      const velocityBoost = velocity > 5 ? 10 : velocity > 2 ? 5 : 0;
      const accelerationBoost = acceleration > 3 ? 10 : acceleration > 1 ? 5 : 0;

      const predictionScore = baseScore + trendScore + timeScore + sequenceScore + velocityBoost + accelerationBoost;

      // 🔮 Prediction v6 (EARLY SIGNAL ENGINE)

      // 1. Micro-Spike Detection
      let spikeScore = 0;
      if (historyRef.current.length > 5) {
        const recent = historyRef.current.slice(-5);

        let increases = 0;
        for (let i = 1; i < recent.length; i++) {
          if (recent[i] > recent[i - 1]) increases++;
        }

        if (increases >= 3) spikeScore = 15;
      }

      // 2. Store Heat (mehrere gute Stores gleichzeitig)
      const hotStores = nearbyStores.filter((s: any) => s.score > 70).length;
      const storeHeatScore =
        hotStores >= 3 ? 20 :
        hotStores === 2 ? 10 :
        0;

      // 3. Time Cluster Boost
      const currentHour2 = new Date().getHours();
      const hourHits2 = timeStatsRef.current[currentHour2] || 0;
      const timeClusterScore =
        hourHits2 > 5 ? 20 :
        hourHits2 > 3 ? 10 :
        0;

      // 4. Combined Early Score
      const earlyPredictionScore =
        predictionScore +
        spikeScore +
        storeHeatScore +
        timeClusterScore;

      // 🧠 Smart Cooldown (dynamic)
      const getCooldown = () => {
        if (predictionScore > 120 || earlyPredictionScore > 140) return 3000; // ultra fast
        if (predictionScore > 100 || earlyPredictionScore > 115) return 5000; // fast
        if (predictionScore > 80) return 8000; // medium
        return 12000; // slow
      };

      const cooldownMs = getCooldown();

      // 🌍 Global Drop Detection Trigger
      const xSignal = await detectXSignal();
      const globalDropDetected = detectGlobalDrop(nearbyStores);

      const ultraDropDetected =
        globalDropDetected ||
        xSignal === 'strong' ||
        (xSignal === 'medium' && (nearbyStores[0]?.score ?? 0) > 80);

      if (globalDropDetected) {
        console.log('🌍 Global Drop erkannt → Multi-Sniper aktiviert');
      }

      // 🔮 Pre-Early Signal (ultra früh)
      const microTrend =
        historyRef.current.length > 3
          ? historyRef.current[historyRef.current.length - 1] >
            historyRef.current[historyRef.current.length - 3]
          : false;

      const ultraEarlyScore =
        earlyPredictionScore +
        (microTrend ? 10 : 0) +
        (nearbyStores.length > 2 ? 10 : 0);

      // 🧠 Adaptive Auto-Buy Level (v2)
      const autoBuyLevel =
        ultraDropDetected || ultraEarlyScore > 140
          ? 'sniper'
          : predictionScore > 110 || earlyPredictionScore > 135
          ? 'sniper'
          : predictionScore > 90
          ? 'aggressive'
          : 'normal';

      const maxTabs =
        autoBuyLevel === 'sniper' ? 3 :
        autoBuyLevel === 'aggressive' ? 2 :
        1;

      const delayRange =
        autoBuyLevel === 'sniper' ? [200, 600] :
        autoBuyLevel === 'aggressive' ? [500, 1200] :
        [1000, 2500];

      // 🔔 Pre-Alert (before drop)
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        autoBuyAggressive &&
        primarySku &&
        best &&
        (
  predictionScore > 100 ||
  earlyPredictionScore > 115
) &&
        document.visibilityState === 'visible'
      ) {
        const now = Date.now();

        if (now - lastAutoBuyRef.current > cooldownMs) {
          lastAutoBuyRef.current = now;

          const targets = nearbyStores.slice(0, 2);

          targets.forEach((store: any, index: number) => {
            const link = buildAppleDeepLink(store.storeId, primarySku);
            sessionPoolRef.current++;
const finalLink = link + `&_s=${sessionPoolRef.current}`;

            setTimeout(() => {
              if (openTabsRef.current < maxTabs) {
                openTabsRef.current += 1;

                let newTab: Window | null = null;
                // Tab reuse logic
                if (tabPoolRef.current.length > 0) {
                  newTab = tabPoolRef.current.pop() || null;
                  if (newTab && !newTab.closed) {
                    newTab.location.href = finalLink;
                  } else {
                    newTab = window.open(finalLink, '_blank');
                  }
                } else {
                  newTab = window.open(finalLink, '_blank');
                }
                if (newTab) tabPoolRef.current.push(newTab);

                setTimeout(() => {
                  try {
                    if (newTab) {
                      newTab.focus();

                      // Try to inject sniper into same-origin tab
                      try {
                        const profile = getDomainProfile(link);
                        if (profile.sniper) {
                          newTab.eval(`(${startCheckoutSniper.toString()})();`);
                        }
                      } catch {
                        // fallback → run locally
                        const profile2 = getDomainProfile(link);
                        if (profile2.sniper) {
                          startCheckoutSniper();
                        }
                      }
                    }
                  } catch {}
                }, 1200);

                setTimeout(() => {
                  openTabsRef.current = Math.max(0, openTabsRef.current - 1);
                  // 🧹 Cleanup geschlossene Tabs
                  tabPoolRef.current = tabPoolRef.current.filter(t => t && !t.closed);
                }, 10000);
              }
            }, randomDelay(delayRange[0] + index * 200, delayRange[1] + index * 300));
          });
        }
      }
// 🎯 Pre-Drop Sniping (enter before stock is visible)
if (
  autoBuyAggressive &&
  primarySku &&
  best &&
  best.status !== 'available' &&
  (
    predictionScore > 115 ||
    earlyPredictionScore > 125
  ) &&
  document.visibilityState === 'visible'
) {
  const now2 = Date.now();
  if (now2 - lastAutoBuyRef.current > cooldownMs) {
    lastAutoBuyRef.current = now2;

    const targets = nearbyStores.slice(0, 1); // nur bester Store

    targets.forEach((store: any) => {
      const link = buildAppleDeepLink(store.storeId, primarySku);
      sessionPoolRef.current++;
      const finalLink = link + `&_s=${sessionPoolRef.current}`;
      setTimeout(() => {
        if (openTabsRef.current < maxTabs) {
          openTabsRef.current += 1;

          let newTab: Window | null = null;
          if (tabPoolRef.current.length > 0) {
            newTab = tabPoolRef.current.pop() || null;
            if (newTab && !newTab.closed) {
              newTab.location.href = finalLink;
            } else {
              newTab = window.open(finalLink, '_blank');
            }
          } else {
            newTab = window.open(finalLink, '_blank');
          }
          if (newTab) tabPoolRef.current.push(newTab);

          setTimeout(() => {
            try {
              if (newTab) {
                newTab.focus();

                // Try to inject sniper into same-origin tab
                try {
                  const profile = getDomainProfile(link);
                  if (profile.sniper) {
                    newTab.eval(`(${startCheckoutSniper.toString()})();`);
                  }
                } catch {
                  // fallback → run locally
                  const profile2 = getDomainProfile(link);
                  if (profile2.sniper) {
                    startCheckoutSniper();
                  }
                }
              }
            } catch {}
          }, 1200);

          setTimeout(() => {
            openTabsRef.current = Math.max(0, openTabsRef.current - 1);
            tabPoolRef.current = tabPoolRef.current.filter(t => t && !t.closed);
          }, 10000);
        }
      }, randomDelay(delayRange[0], delayRange[1])); // schneller als normal
    });
  }
}
      if (!nearbyStores.length) {
        console.log('⚠️ No nearby stores found for SKUs:', skus);
      }

      const mockContext = {
        availability: {
          nearbyStores,
          status:
            nearbyStores.length === 0
              ? 'out_of_stock'
              : nearbyStores[0].distanceKm < 10
              ? 'hot'
              : 'limited',
        },
        pricing: {
          currentPrice: 1199,
          avgPrice30d: 1299,
          effectivePriceAfterTradeIn: 899
        },
        prediction: {
          confidence: 0.9
        },
        signals: {
          movementScore: 50,
          flapScore: 50
        },
        userPreferences: userPrefs
      };

      const result = makeMasterDecision(mockContext);

      // 🤖 Auto-Buy Vorbereitung (v1)
      const shouldAutoBuy =
        result?.action === 'buy_now' &&
        (nearbyStores?.[0]?.distanceKm ?? 999) < 10 &&
        (nearbyStores?.[0]?.quantity ?? 0) > 0;
      if (shouldAutoBuy && primarySku && autoBuyAggressive && document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastAutoBuyRef.current > cooldownMs) {
          lastAutoBuyRef.current = now;

          const targets = nearbyStores.slice(0, 2);

          targets.forEach((store: any, index: number) => {
            const link = buildAppleDeepLink(store.storeId, primarySku);
            sessionPoolRef.current++;
            const finalLink = link + `&_s=${sessionPoolRef.current}`;
            setTimeout(() => {
              if (openTabsRef.current < maxTabs) {
                openTabsRef.current += 1;

                let newTab: Window | null = null;
                if (tabPoolRef.current.length > 0) {
                  newTab = tabPoolRef.current.pop() || null;
                  if (newTab && !newTab.closed) {
                    newTab.location.href = finalLink;
                  } else {
                    newTab = window.open(finalLink, '_blank');
                  }
                } else {
                  newTab = window.open(finalLink, '_blank');
                }
                if (newTab) tabPoolRef.current.push(newTab);

                setTimeout(() => {
                  try {
                    if (newTab) {
                      newTab.focus();

                      // Try to inject sniper into same-origin tab
                      try {
                        const profile = getDomainProfile(link);
                        if (profile.sniper) {
                          newTab.eval(`(${startCheckoutSniper.toString()})();`);
                        }
                      } catch {
                        // fallback → run locally
                        const profile2 = getDomainProfile(link);
                        if (profile2.sniper) {
                          startCheckoutSniper();
                        }
                      }
                    }
                  } catch {}
                }, 1200);

                setTimeout(() => {
                  openTabsRef.current = Math.max(0, openTabsRef.current - 1);
                  tabPoolRef.current = tabPoolRef.current.filter(t => t && !t.closed);
                }, 10000);
              }
            }, randomDelay(delayRange[0] + index * 200, delayRange[1] + index * 300));
          });
        }
      }
      setDecision(result);
      setContext(mockContext);

      // ⏱ last check timestamp
      lastCheckRef.current = Date.now();

      // 📊 Verlauf (Realtime + präzise)
      const nextHistory = [...historyRef.current, result?.score ?? 0].slice(-30);
      historyRef.current = nextHistory;
      setHistory(nextHistory);

      // 📈 Realtime Trend (präziser)
      const newTrend =
        nextHistory.length > 5
          ? nextHistory[nextHistory.length - 1] - nextHistory[0]
          : 0;

      setTrend(newTrend);

      // 🔔 Smart Push (Anti-Spam + intelligente Events)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const now = Date.now();
        const COOLDOWN = 60000; // 60s

        const currentScore = result?.score ?? 0;
        const currentStatus = mockContext?.availability?.status ?? null;
        const currentBestStore = result?.checkout?.store?.id ?? null;

        // 🏪 neuer bester Store
        const newBestStore = currentBestStore && currentBestStore !== lastBestStoreRef.current;

        // 🏪 Stock Increase (any store)
        let stockIncreased = false;
        const stores = mockContext?.availability?.nearbyStores ?? [];
        stores.forEach((s: any) => {
          const key = s.storeId || s.storeName;
          const prev = lastStockRef.current[key] ?? 0;
          if ((s.quantity ?? 0) > prev) stockIncreased = true;
          lastStockRef.current[key] = s.quantity ?? 0;
        });

        const becameAvailable = lastStatusRef.current !== 'in_stock' && currentStatus === 'in_stock';
        const bigScoreJump = currentScore - (lastScoreRef.current ?? 0) > 10;

        const best = nearbyStores?.[0];
        const isHotDeal =
          best?.distanceKm < 10 &&
          best?.quantity >= 2 &&
          currentScore > 85;

        if (
          Notification.permission === 'granted' &&
          now - lastPushRef.current > COOLDOWN &&
          (
            becameAvailable ||          // first availability
            newBestStore ||             // better store found
            isHotDeal ||                // hot deal
            bigScoreJump                // strong signal change
          )
        ) {
          lastPushRef.current = now;

          const n = new Notification('Jetzt verfügbar 🔥', {
            body: best?.distanceKm < 10
              ? `🔥 ${best.storeId} • nur ${Math.round(best.distanceKm)} km • ${best.quantity} verfügbar`
              : `${best?.storeId ?? 'in deiner Nähe'} • ${Math.round(best?.distanceKm ?? 0)} km • ${best?.quantity ?? 0} verfügbar`
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
// 💾 Persist AI learning
if (typeof window !== 'undefined') {
  localStorage.setItem('lavinia_ai_stats', JSON.stringify({
  storeStats: storeStatsRef.current,
  timeStats: timeStatsRef.current,
  storePriority: storePriorityRef.current
}));
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
  }, [userPrefs, autoBuyAggressive]);

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
        onClick={registerPush}
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
  Auto-Buy aggressiv:
  <input
    type="checkbox"
    checked={autoBuyAggressive}
    onChange={(e) => setAutoBuyAggressive(e.target.checked)}
    style={{ marginLeft: 10 }}
  />
</label>

        <label style={{ display: 'block', marginTop: 10 }}>
          Modell:
          <select
            value={userPrefs.variant.model}
            onChange={(e) => {
              const updated = {
                ...userPrefs,
                variant: { ...userPrefs.variant, model: e.target.value }
              };
              setUserPrefs(updated);
              localStorage.setItem('lavinia_user_prefs', JSON.stringify(updated));
            }}
            style={{ marginLeft: 10 }}
          >
            <option value="iPhone 17 Pro">iPhone 17 Pro</option>
            <option value="iPhone 17 Pro Max">iPhone 17 Pro Max</option>
            <option value="iPhone 16">iPhone 16</option>
            <option value="iPhone 16 Plus">iPhone 16 Plus</option>
            <option value="iPhone 16 Pro">iPhone 16 Pro</option>
            <option value="iPhone 16 Pro Max">iPhone 16 Pro Max</option>
            <option value="iPhone 15 Pro">iPhone 15 Pro</option>
            <option value="iPhone 15 Pro Max">iPhone 15 Pro Max</option>
          </select>
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
    <option value="128GB">128GB</option>
    <option value="256GB">256GB</option>
    <option value="512GB">512GB</option>
    <option value="1TB">1TB</option>
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
            {decision?.action === 'buy_now' && (
              <div style={{ marginTop: 8, color: '#22c55e', fontSize: 12 }}>
                🤖 Auto-Buy bereit (1-Klick)
              </div>
            )}
            <div style={{ color: '#888', fontSize: 12 }}>
              {decision.checkout?.store?.id ?? '—'} • {Math.round(context?.availability?.nearbyStores?.find((s:any)=>s.storeId===decision.checkout?.store?.id)?.distanceKm ?? 0)} km
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {trend > 5 && '📈 Nachfrage steigt (Trend erkannt)'}
              {trend > 10 && '🔥 Drop wahrscheinlich'}
              {trend < -5 && '📉 Nachfrage sinkt'}
            </div>
            <div style={{ color: '#666', fontSize: 11 }}>
              {timeStatsRef.current[new Date().getHours()] > 3 && '⏱️ Typische Drop-Zeit'}
            </div>
            <div style={{ color: '#555', fontSize: 11 }}>
              {sequenceRef.current.length > 2 && '🔗 Muster erkannt'}
            </div>
            <div style={{ color: '#22c55e', fontSize: 11 }}>
              {(() => {
                // replicate predictionScore calculation
                const best = context?.availability?.nearbyStores?.[0];
                const trendScore = trend > 5 ? 20 : 0;
                const timeScore = (timeStatsRef.current[new Date().getHours()] || 0) > 3 ? 15 : 0;
                const sequenceScore = sequenceRef.current.length > 2 ? 15 : 0;
                const baseScore = best?.score ?? 0;
                const predictionScore = baseScore + trendScore + timeScore + sequenceScore;
                return predictionScore > 100 ? '⚡ Drop imminent' : null;
              })()}
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
                onClick={async () => {
                  console.log('🚀 Manual Buy Triggered:', decision.checkout);
                  const best = context?.availability?.nearbyStores?.[0];
                  const primarySku = primarySkuState;
                  if (best && primarySku) {
                    const link = buildAppleDeepLink(best.storeId, primarySku);
                    let newTab: Window | null = null;
                    if (tabPoolRef.current.length > 0) {
                      newTab = tabPoolRef.current.pop() || null;
                      if (newTab && !newTab.closed) {
                        newTab.location.href = link;
                      } else {
                        newTab = window.open(link, '_blank');
                      }
                    } else {
                      newTab = window.open(link, '_blank');
                    }
                    if (newTab) tabPoolRef.current.push(newTab);
                    setTimeout(() => {
                      try {
                        if (newTab) {
                          newTab.focus();

                          // Try to inject sniper into same-origin tab
                          try {
                            const profile = getDomainProfile(link);
                            if (profile.sniper) {
                              newTab.eval(`(${startCheckoutSniper.toString()})();`);
                            }
                          } catch {
                            // fallback → run locally
                            const profile2 = getDomainProfile(link);
                            if (profile2.sniper) {
                              startCheckoutSniper();
                            }
                          }
                        }
                      } catch {}
                    }, 1200);
                  } else {
                    alert(`🚀 Checkout gestartet für ${decision.checkout.store.id}`);
                  }
                }}
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
              {(() => {
                const best = context?.availability?.nearbyStores?.[0];
                const primarySku = primarySkuState;
                if (!best || !primarySku) return null;
                const link = buildAppleDeepLink(best.storeId, primarySku);
                return (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#888', wordBreak: 'break-all' }}>
                    🔗 {link}
                  </div>
                );
              })()}
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