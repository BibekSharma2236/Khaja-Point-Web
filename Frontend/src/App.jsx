import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setStatus(JSON.stringify(data, null, 2)))
      .catch((e) => setStatus(`Error: ${e?.message || e}`));
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>Khaja Point</h1>
        <p>Food delivery app starter</p>
      </header>

      <section className="card">
        <h2>Backend status</h2>
        <pre className="pre">{status}</pre>
      </section>
    </div>
  );
}

