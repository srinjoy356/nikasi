import { useEffect, useRef, useState } from 'react';

/** Before/after slider. It sweeps once on its own, then the person can drag it. */
export function Compare({ before, after }: { before: string; after: string }) {
  const [x, setX] = useState(100);
  const manual = useRef(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setX(50); return; }
    const t0 = performance.now() + 500;
    let raf = 0;
    const tick = (t: number) => {
      if (manual.current) return;
      const p = Math.max(0, Math.min(1, (t - t0) / 1700));
      setX(100 - 50 * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="cmp">
      <img src={before} alt="The drain before" draggable={false} />
      <img className="cmp-after" src={after} alt="The drain after" draggable={false} style={{ clipPath: `inset(0 0 0 ${x}%)` }} />
      <i className="cmp-line" style={{ left: `${x}%` }} />
      <span className="cmp-tag l">Before</span>
      <span className="cmp-tag r">After</span>
      <input type="range" min={0} max={100} step={0.1} value={x} aria-label="Slide to compare before and after"
        onPointerDown={() => { manual.current = true; }} onChange={(e) => { manual.current = true; setX(Number(e.target.value)); }} />
    </div>
  );
}
