'use client';

import { useEffect, useState } from 'react';

export default function Splash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1115]">
      <img
        src="/icon.png"
        alt="Lavinia"
        className="w-32 h-32 animate-splash"
      />
    </div>
  );
}