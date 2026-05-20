import { useEffect, useMemo, useRef, useState } from "react";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;

  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

export default function AnimatedStatNumber({
  value,
  duration = 950,
  prefix = "",
  suffix = "",
  decimals = 0,
  compact = false,
  className = "",
}) {
  const target = useMemo(() => toNumber(value), [value]);
  const [displayValue, setDisplayValue] = useState(0);
  const animationFrameRef = useRef(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    window.cancelAnimationFrame(animationFrameRef.current);

    if (hasAnimatedRef.current) {
      setDisplayValue(target);
      return undefined;
    }

    hasAnimatedRef.current = true;
    const startedAt = window.performance.now();
    const safeDuration = Math.max(0, Number(duration) || 0);

    const tick = (now) => {
      const progress = safeDuration > 0 ? Math.min(1, (now - startedAt) / safeDuration) : 1;
      setDisplayValue(target * easeOutCubic(progress));

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameRef.current);
  }, [duration, target]);

  const formatted = useMemo(() => {
    const fractionDigits = Math.max(0, Number(decimals) || 0);
    const formatter = new Intl.NumberFormat(undefined, {
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    });

    return formatter.format(displayValue);
  }, [compact, decimals, displayValue]);

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
