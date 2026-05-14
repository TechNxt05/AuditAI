"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

export function ColdStartBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // Set a timer. If health check hasn't completed in 3 seconds, show banner.
    const timer = setTimeout(() => {
      setShow(true);
    }, 3000);

    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/health`);
        if (res.ok) {
          clearTimeout(timer);
          setShow(false);
        } else {
          // Keep polling if not okay
          setTimeout(checkHealth, 2000);
        }
      } catch (error) {
        // If it fails (backend warming up), we will hit the 3s timer and show the banner
        setTimeout(checkHealth, 2000);
      }
    };

    checkHealth();

    return () => clearTimeout(timer);
  }, [dismissed]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500 shadow-lg backdrop-blur-md">
      <AlertCircle className="h-5 w-5" />
      <p>Backend warming up — this takes ~15s on first load. Hang tight.</p>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 rounded-md p-1 hover:bg-amber-500/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
