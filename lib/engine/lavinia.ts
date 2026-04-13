// =====================================================
// 🧩 1. UTILS / HELPERS
// =====================================================

export function randomDelay(min = 800, max = 2500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


// =====================================================
// 🌐 2. DOMAIN / SHOP PROFILE ENGINE
// =====================================================

export function getDomainProfile(
  url: string,
  domainStats: Record<string, number> = {}
) {
  const u = url.toLowerCase();

  if (u.includes('apple.com')) {
    return { name: 'apple', sniper: false, aggressiveness: 'safe' };
  }

  if (u.includes('amazon')) {
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

  if (u.includes('mediamarkt') || u.includes('saturn')) {
    return { name: 'retail', sniper: true, aggressiveness: 'medium' };
  }

  return { name: 'default', sniper: true, aggressiveness: 'normal' };
}


// =====================================================
// 🏹 3. CHECKOUT SNIPER ENGINE
// =====================================================

export function startCheckoutSniper() {
  if (typeof window === 'undefined') return;

  const CLICK_TEXTS = ['in den warenkorb', 'kaufen', 'add to bag', 'buy'];

  const detectQueue = () => {
    const text = document.body.innerText.toLowerCase();

    if (
      text.includes('warteschlange') ||
      text.includes('queue') ||
      text.includes('bitte warten')
    ) {
      return 'queue';
    }

    if (
      text.includes('nicht verfügbar') ||
      text.includes('out of stock')
    ) {
      return 'no_stock';
    }

    return 'ok';
  };

  const tryClick = () => {
    const queueState = detectQueue();
    if (queueState === 'queue') return false;

    const elements = Array.from(document.querySelectorAll('button, a')) as HTMLElement[];

    const target = elements.find(el => {
      const text = el.innerText?.toLowerCase() || '';
      return CLICK_TEXTS.some(t => text.includes(t));
    });

    if (target) {
      setTimeout(() => target.click(), randomDelay(100, 400));
      return true;
    }

    return false;
  };

  if (tryClick()) return;

  const observer = new MutationObserver(() => {
    if (tryClick()) observer.disconnect();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  let attempts = 0;

  const interval = setInterval(() => {
    attempts++;

    const state = detectQueue();

    if (state === 'queue' && attempts % 5 === 0) {
      setTimeout(() => location.reload(), randomDelay(2000, 5000));
    }

    if (state === 'no_stock' && attempts % 3 === 0) {
      location.reload();
    }

    if (tryClick() || attempts > 80) {
      clearInterval(interval);
      observer.disconnect();
    }
  }, 300);
}


// =====================================================
// 🍏 4. APPLE ENGINE (DEEP LINK)
// =====================================================

export function buildAppleDeepLink(storeId: string, sku: string) {
  const base = 'https://www.apple.com/de/shop/buy-iphone';
  return `${base}?part=${encodeURIComponent(sku)}&pickup=true`;
}


// =====================================================
// 📍 5. GEO / DISTANCE ENGINE
// =====================================================

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  if (
    lat1 === undefined || lon1 === undefined ||
    lat2 === undefined || lon2 === undefined
  ) return 9999;

  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}


// =====================================================
// 🧠 6. GLOBAL DROP DETECTION ENGINE
// =====================================================

type Store = {
  quantity?: number;
  score?: number;
};

export function detectGlobalDrop(stores: Store[]) {
  let signals = 0;

  stores.forEach((s) => {
    if (s.quantity > 0) signals += 2;
    if (s.score > 80) signals += 1;
  });

  return signals >= 3;
}


// =====================================================
// 🚀 7. MAIN ENGINE ENTRY (wird später API nutzen)
// =====================================================

export async function runLaviniaEngine(input: any) {
  // Placeholder – wird gleich aus page.tsx gefüllt
  return {
    ok: true,
    timestamp: Date.now(),
    input
  };
}