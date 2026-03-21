import { useQuery } from '@tanstack/react-query';
import { fetchRuns, fetchRun, MOCK_ANALYTICS, MOCK_NODE_METRICS } from '../lib/api';

export function useRuns(workspaceId?: string) {
    return useQuery({
        queryKey: ['runs', workspaceId],
        queryFn: () => fetchRuns(workspaceId),
        refetchInterval: 5000,
    });
}

export function useRun(id: string, workspaceId?: string) {
    return useQuery({
        queryKey: ['run', id, workspaceId],
        queryFn: () => fetchRun(id, workspaceId),
        enabled: Boolean(id),
    });
}

export function useAnalytics() {
    return useQuery({
        queryKey: ['analytics'],
        queryFn: async () => MOCK_ANALYTICS,
        staleTime: 60_000,
    });
}

export function useNodeMetrics() {
    return useQuery({
        queryKey: ['node-metrics'],
        queryFn: async () => MOCK_NODE_METRICS,
        staleTime: 30_000,
    });
}
