import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, ChromaticAberration, Vignette, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Leva } from 'leva';
import { AnimatePresence, motion } from 'framer-motion';
import { Scene } from './Scene';
import { HandTrackingPanel } from './HandTrackingPanel';
import { interactionStore } from '../state/interactionStore';
import { useViewport } from '../hooks/useViewport';

/**
 * The top-level 3D experience: a fixed full-viewport Canvas hosting the
 * particle scene and postprocessing stack, plus the global keyboard/mouse
 * shortcuts (space to pause, double-click to fast-forward the morph, "L" to
 * toggle the Leva panel) and a minimal on-screen instructions HUD.
 */
export function Experience() {
  const viewport = useViewport();
  const [levaVisible, setLevaVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        interactionStore.paused = !interactionStore.paused;
        setPaused(interactionStore.paused);
      } else if (event.key.toLowerCase() === 'l') {
        setLevaVisible((prev) => !prev);
      }
    };

    const handleDoubleClick = () => {
      interactionStore.fastForwardMorph = true;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dblclick', handleDoubleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 h-[100dvh] w-[100dvw] overflow-hidden bg-black">
      <Leva collapsed hidden={!levaVisible} titleBar={{ title: 'Controls' }} />

      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#000000'), 1);
        }}
      >
        <Suspense fallback={null}>
          <Scene />

          <EffectComposer multisampling={0}>
            <Bloom
              mipmapBlur
              luminanceThreshold={0.32}
              luminanceSmoothing={0.25}
              intensity={0.95}
              radius={0.65}
            />
            <ChromaticAberration offset={[0.0006, 0.0006]} radialModulation={false} modulationOffset={0} />
            <Noise premultiply opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.32} darkness={1.15} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 sm:p-8">
        <div className="flex flex-row items-end justify-between gap-4">
          <div className="flex flex-col">
            <AnimatePresence>
              {paused && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-3 w-fit rounded-full border border-cyan-400/30 bg-black/40 px-4 py-1.5 text-xs tracking-[0.2em] text-cyan-300 backdrop-blur-sm"
                >
                  PAUSED
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="flex w-fit flex-col gap-1 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-[11px] tracking-wide text-cyan-100/80 backdrop-blur-sm"
            >
              <span>
                {viewport.isTouch ? 'DRAG · MOVE PARTICLES' : 'MOUSE OR HAND · MOVE PARTICLES'}
              </span>
              <span>HAND LEFT/RIGHT · ROTATE</span>
              <span>HAND NEAR/FAR · ZOOM</span>
              <span>{viewport.isTouch ? 'DOUBLE-TAP · NEXT SHAPE' : 'DOUBLE-CLICK · NEXT SHAPE'}</span>
              {!viewport.isTouch && <span>SCROLL · ZOOM</span>}
              <span>SPACE · PAUSE</span>
              <span>L · TOGGLE CONTROLS</span>
            </motion.div>
          </div>

          <HandTrackingPanel />
        </div>
      </div>
    </div>
  );
}
