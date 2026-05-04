import { useState, useEffect, useCallback, useRef } from 'react';

// GitHub Pages is a static host — no proxy available.
// REACT_APP_API_URL must point to your deployed backend (e.g. Render.com).
// Set it in your .env file before building: REACT_APP_API_URL=https://your-backend.onrender.com
const API = process.env.REACT_APP_API_URL || '';

if (!API) {
  console.warn(
    '[Inboxious] REACT_APP_API_URL is not set. ' +
    'Create a .env file with REACT_APP_API_URL=https://your-backend-url and rebuild.'
  );
}

export function useEmails(filter, search) {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const cacheRef = useRef({});

  const fetchData = useCallback(async (showLoader = false) => {
    if (!API) {
      setError('Backend URL not configured. Set REACT_APP_API_URL in your .env and rebuild.');
      setLoading(false);
      return;
    }

    const cacheKey = `${filter}__${search}`;
    try {
      // Show cached data instantly while fetching fresh
      if (cacheRef.current[cacheKey] && !showLoader) {
        setAccounts(cacheRef.current[cacheKey].accounts);
        setStats(cacheRef.current[cacheKey].stats);
      } else if (showLoader) {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (filter && filter !== 'all') params.set('filter', filter);
      if (search) params.set('search', search);

      const [emailsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/emails?${params}`),
        fetch(`${API}/api/stats`),
      ]);

      if (!emailsRes.ok || !statsRes.ok) throw new Error('API error');

      const [emailsData, statsData] = await Promise.all([
        emailsRes.json(),
        statsRes.json(),
      ]);

      // Update cache
      cacheRef.current[cacheKey] = { accounts: emailsData, stats: statsData };

      setAccounts(emailsData);
      setStats(statsData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Auto-refresh every 60 seconds (matches backend poll interval)
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const triggerPoll = async () => {
    if (!API) return;
    setPolling(true);
    try {
      await fetch(`${API}/api/poll`, { method: 'POST' });
      // Wait for backend to finish fetching
      await new Promise(r => setTimeout(r, 5000));
      await fetchData(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setPolling(false);
    }
  };

  return { accounts, stats, loading, polling, error, lastUpdated, triggerPoll, refresh: fetchData };
}
