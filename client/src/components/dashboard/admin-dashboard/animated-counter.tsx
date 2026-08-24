'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
}

export function AnimatedCounter({
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    className,
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 30,
        stiffness: 100,
    });
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [motionValue, isInView, value]);

    useEffect(() => {
        const unsubscribe = springValue.on('change', (latest) => {
            if (ref.current) {
                const formattedNumber = latest.toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                });
                ref.current.textContent = `${prefix}${formattedNumber}${suffix}`;
            }
        });
        return () => unsubscribe();
    }, [springValue, decimals, prefix, suffix]);

    return (
        <span ref={ref} className={className}>
            {prefix}
            {value.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            })}
            {suffix}
        </span>
    );
}
