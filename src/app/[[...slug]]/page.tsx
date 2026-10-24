import Dashboard from '@/components/dashboard';
export function generateStaticParams() {
  return ['', 'live', 'stations', 'map', 'alerts', 'events', 'history', 'integrity', 'health', 'public'].map(path => ({ slug: path ? [path] : [] }));
}
export const dynamicParams = false;
export default function Page() { return <Dashboard />; }
