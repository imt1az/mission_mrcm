import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
export const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const api = axios.create({
  baseURL: `${baseUrl}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});
export async function csrf() {
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true });
}
export function errorMessage(error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 419)
      return 'Your session expired. Refresh the page and try again.';
    const data = error.response?.data;
    if (data?.errors) return Object.values(data.errors).flat().join(' ');
    return data?.message || 'Could not connect. Check your connection and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export function useResource(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api
      .get(path, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (!axios.isCancel(e)) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  return { data, setData, error, loading, reload };
}
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
export const money = (value) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value));
export const human = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
