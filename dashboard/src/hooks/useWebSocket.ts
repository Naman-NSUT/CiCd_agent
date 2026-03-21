import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PipelineRun } from '../types/pipeline';

let reconnectAttempts = 0;

export function useWebSocket(url: string) {
    const ws = useRef<WebSocket | null>(null);
    const qc = useQueryClient();

    const connect = useCallback(() => {
        try {
            ws.current = new WebSocket(url);

            ws.current.onmessage = (event: MessageEvent) => {
                const msg = JSON.parse(event.data as string) as {
                    type: string;
                    run?: Partial<PipelineRun>;
                };

                if (msg.type === 'run_update' && msg.run) {
                    qc.setQueryData<PipelineRun[]>(['runs'], (old = []) =>
                        old.map(r => r.id === msg.run?.id ? { ...r, ...msg.run } : r)
                    );
                    if (msg.run.id) {
                        qc.setQueryData<PipelineRun>(['run', msg.run.id], old =>
                            old ? { ...old, ...msg.run } : (msg.run as PipelineRun)
                        );
                    }
                }

                if (msg.type === 'run_created') {
                    void qc.invalidateQueries({ queryKey: ['runs'] });
                }

                if (msg.type === 'review_required' && msg.run) {
                    window.dispatchEvent(new CustomEvent('review-required', { detail: msg.run }));
                }
            };

            ws.current.onclose = () => {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                reconnectAttempts++;
                setTimeout(connect, delay);
            };

            ws.current.onopen = () => { reconnectAttempts = 0; };
        } catch {
            // WebSocket unavailable in dev — silently continue
        }
    }, [url, qc]);

    useEffect(() => {
        connect();
        return () => ws.current?.close();
    }, [connect]);
}
