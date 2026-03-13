"use client";

import { useEffect, useRef, useState } from "react";

interface StatCounterProps {
    target: number;
    prefix?: string;
    suffix?: string;
}

export default function StatCounter({ target, prefix = "", suffix = "" }: StatCounterProps) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const steps = 60;
                    const duration = 1800;
                    const inc = target / steps;
                    let cur = 0;
                    const timer = setInterval(() => {
                        cur += inc;
                        if (cur >= target) {
                            setCount(target);
                            clearInterval(timer);
                        } else {
                            setCount(Math.floor(cur));
                        }
                    }, duration / steps);
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target]);

    return (
        <span ref={ref}>
            {prefix}
            {count.toLocaleString()}
            {suffix}
        </span>
    );
}
