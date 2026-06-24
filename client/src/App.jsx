import React, { useEffect, useState } from 'react';
import { health } from './api/client.js';

// Minimal app shell. On mount it calls the shared API client to hit /health
// through the dev proxy (or same-origin in prod) and renders the result,
// proving the SPA -> API-client -> backend path works end to end.
export default function App() {
  const [status, setStatus] = useState('loading…');

  useEffect(() => {
    let active = true;
    health()
      .then((data) => {
        if (active) setStatus(data && data.status ? data.status : 'unknown');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <h1>App</h1>
      <p>API: {status}</p>
    </main>
  );
}
