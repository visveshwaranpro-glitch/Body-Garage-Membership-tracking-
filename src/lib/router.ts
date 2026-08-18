import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'clients' }
  | { name: 'add-client' }
  | { name: 'client'; id: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  if (hash.startsWith('/clients/')) {
    const id = hash.replace('/clients/', '');
    return { name: 'client', id };
  }
  if (hash === '/clients') return { name: 'clients' };
  if (hash === '/add-client') return { name: 'add-client' };
  return { name: 'dashboard' };
}

export function navigate(route: Route) {
  let hash = '/';
  if (route.name === 'clients') hash = '/clients';
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
