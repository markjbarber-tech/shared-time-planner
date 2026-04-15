import { useEffect } from 'react';

let initialHtml: string | null = null;

async function checkForUpdate() {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, { cache: 'no-store' });
    const html = await res.text();
    if (initialHtml === null) {
      initialHtml = html;
    } else if (html !== initialHtml) {
      console.log('[version-check] New build detected, reloading…');
      window.location.reload();
    }
  } catch {
    // Network error — skip
  }
}

export function useVersionCheck() {
  useEffect(() => {
    // Check on mount
    checkForUpdate();
  }, []);
}
