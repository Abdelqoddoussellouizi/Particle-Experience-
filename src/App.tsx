import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Experience } from './components/Experience';

/**
 * The app shell: mounts the full-viewport particle Experience and layers a
 * GSAP-animated hero title over it on load. Framer Motion (used inside
 * Experience for the HUD) handles state-driven micro-interactions; GSAP
 * handles this one-shot cinematic entrance timeline.
 */
export default function App() {
  const kickerRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(kickerRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8 })
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 1.1 },
          '-=0.5',
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 16 },
          { opacity: 0.7, y: 0, duration: 0.9 },
          '-=0.7',
        );
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-black text-white">
      <Experience />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-start justify-start p-6 sm:p-10">
        <span
          ref={kickerRef}
          className="text-xs font-medium tracking-[0.4em] text-cyan-300/70 opacity-0"
        >
          GPU PARTICLE FIELD
        </span>
        <h1
          ref={titleRef}
          className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-white opacity-0 sm:text-5xl"
          style={{ textShadow: '0 0 30px rgba(0, 229, 255, 0.35)' }}
        >
          100,000 particles,
          <br />
          one continuous breath.
        </h1>
        <p ref={subtitleRef} className="mt-4 max-w-sm text-sm text-white/70 opacity-0 sm:text-base">
          Move your cursor, scroll to zoom, and watch the field drift between nine living shapes.
        </p>
      </div>
    </main>
  );
}
