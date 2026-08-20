import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'clients'; filter?: { type: 'status' | 'package'; value: string } }
  | { name: 'add-client' }
  | { name: 'client'; id: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  if (hash.startsWith('/clients/')) {
    const id = hash.replace('/clients/', '');
    return { name: 'client', id };
  }
  if (hash.startsWith('/clients')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    const filterType = params.get('filterType');
    const filterValue = params.get('filterValue');
    return filterType && filterValue
      ? { name: 'clients', filter: { type: filterType as 'status' | 'package', value: filterValue } }
      : { name: 'clients' };
  }
  if (hash === '/add-client') return { name: 'add-client' };
  return { name: 'dashboard' };
}

export function navigate(route: Route) {
  let hash = '/';
  if (route.name === 'clients') {
    hash = '/clients';
    if (route.filter) hash += `?filterType=${encodeURIComponent(route.filter.type)}&filterValue=${encodeURIComponent(route.filter.value)}`;
  }
  else if (route.name === 'add-client') hash = '/add-client';
  else if (route.name === 'client') hash = `/clients/${route.id}`;
  window.location.hash = hash;
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = useCallback((r: Route) => navigate(r), []);
  return [route, go];
}
