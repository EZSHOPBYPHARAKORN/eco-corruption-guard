'use client';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MockSource } from '@/lib/mock-source';
import { LiveSource } from '@/lib/live-source';
import type { DataSource } from '@/lib/domain';
export const source: DataSource = process.env.NEXT_PUBLIC_DATA_SOURCE === 'live' ? new LiveSource(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws') : new MockSource();
export function Provider({ children }: { children: React.ReactNode }) { const [client] = useState(() => new QueryClient()); return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
export function useMonitoring() { const client = useQueryClient(); const [streamError, setStreamError] = useState(''); const query = useQuery({ queryKey: ['monitoring'], queryFn: () => source.getSnapshot(), retry: 1 }); useEffect(() => source.subscribe(data => { client.setQueryData(['monitoring'], data); setStreamError(''); }, setStreamError), [client]); return { ...query, streamError }; }
