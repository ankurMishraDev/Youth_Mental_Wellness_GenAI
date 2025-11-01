'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/contexts/UserContext';

export default function CategoryTestPage() {
  const userId = "dgvvEX9PEWOCQQVoLFh0HwDD8i23";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/categories', {
        headers: {
          'x-user-id': userId
        }
      });
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#f0f0f0' }}>
      <h1>Category API Test Page</h1>
      {userId ? (
        <div>
          <p>Fetching data for user ID: {userId}</p>
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {data && (
            <pre style={{ background: '#fff', padding: '10px', border: '1px solid #ccc' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        <p>Waiting for user ID...</p>
      )}
    </div>
  );
}
