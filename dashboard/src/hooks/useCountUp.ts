import { useState, useEffect, useRef } from 'react';

/**
 * Animated count-up hook. Counts from 0 to `target` over `duration`ms
 * with easeOut timing. Returns the current animated value.
 */
export function useCountUp(target: number, duration = 600): number {
    const [value, setValue] = useState(0);
    const startRef = useRef<number | null>(null);
    const rafRef = useRef(0);

    useEffect(() => {
        startRef.current = null;

        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

        const step = (timestamp: number) => {
            if (startRef.current === null) startRef.current = timestamp;
            const elapsed = timestamp - startRef.current;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOut(progress);

            setValue(Math.round(easedProgress * target));

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(step);
            }
        };

        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);

    return value;
}
