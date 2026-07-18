import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { handTrackingStore } from '../state/handTrackingStore';

export type HandTrackingStatus =
  | 'idle'
  | 'requesting'
  | 'loading-model'
  | 'active'
  | 'error'
  | 'unsupported';

export interface HandTrackingState {
  status: HandTrackingStatus;
  error: string | null;
  handDetected: boolean;
  enable: () => void;
  disable: () => void;
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
}

// Pinned to the installed @mediapipe/tasks-vision version so the WASM
// runtime fetched from the CDN always matches the JS bindings bundled here.
const TASKS_VISION_VERSION = '0.10.35';
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const PREVIEW_WIDTH = 176;
const PREVIEW_HEIGHT = 132;

// Landmark 0 (wrist) and 9 (middle-finger MCP) averaged together track the
// center of the palm — much more stable frame-to-frame than a fingertip,
// which keeps the downstream damping in useMouse doing less work smoothing
// out jitter.
const PALM_LANDMARK_A = 0;
const PALM_LANDMARK_B = 9;

/**
 * Wires a webcam feed through MediaPipe's HandLandmarker and republishes the
 * tracked palm position into `handTrackingStore` every frame the model runs.
 * Everything else (raycasting the point into world space, damping, fading
 * repulsion in/out) is already handled by useMouse — this hook only ever
 * needs to answer "where is the hand, right now, in NDC space".
 *
 * Camera access is entirely opt-in: nothing here touches getUserMedia until
 * `enable()` is called from a user gesture (a button click), both because
 * browsers require that and because silently requesting a webcam on page
 * load would be a bad surprise.
 */
export function useHandTracking(): HandTrackingState {
  const [status, setStatus] = useState<HandTrackingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- HandLandmarker type comes from the lazily-imported @mediapipe/tasks-vision module
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const handDetectedRef = useRef(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mountedRef = useRef(true);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const disable = useCallback(() => {
    stopLoop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    handTrackingStore.detected = false;
    handDetectedRef.current = false;
    setHandDetected(false);
    setStatus('idle');
  }, [stopLoop]);

  const drawPreview = useCallback(
    (video: HTMLVideoElement, landmarks: Array<{ x: number; y: number }> | null) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      // Mirror horizontally so the preview reads like a mirror, matching
      // the (1 - x) flip applied to the control point below.
      ctx.translate(PREVIEW_WIDTH, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      ctx.restore();

      if (landmarks) {
        const a = landmarks[PALM_LANDMARK_A];
        const b = landmarks[PALM_LANDMARK_B];
        const cx = ((a.x + b.x) / 2) * PREVIEW_WIDTH;
        const cy = ((a.y + b.y) / 2) * PREVIEW_HEIGHT;

        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 16;
        ctx.fill();
      }
    },
    [],
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0] ?? null;
      const detected = !!landmarks;

      if (detected) {
        const a = landmarks[PALM_LANDMARK_A];
        const b = landmarks[PALM_LANDMARK_B];
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;

        // Flip horizontally (mirror) so moving your hand to your right
        // moves the tracked point to the right on screen.
        handTrackingStore.ndcX = (1 - cx) * 2 - 1;
        handTrackingStore.ndcY = -(cy * 2 - 1);
        handTrackingStore.scale = Math.hypot(a.x - b.x, a.y - b.y);
        handTrackingStore.detected = true;
      } else {
        handTrackingStore.detected = false;
      }

      if (detected !== handDetectedRef.current) {
        handDetectedRef.current = detected;
        setHandDetected(detected);
      }

      drawPreview(video, detected ? landmarks : null);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [drawPreview]);

  const enable = useCallback(() => {
    if (status === 'requesting' || status === 'loading-model' || status === 'active') {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setError('This browser does not support camera access.');
      return;
    }

    setError(null);
    setStatus('requesting');

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (!videoRef.current) {
          videoRef.current = document.createElement('video');
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setStatus('loading-model');

        if (!landmarkerRef.current) {
          const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
          const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

          const loadModel = HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: MODEL_ASSET_URL,
              // CPU is slower per-frame than GPU, but the GPU delegate goes
              // through its own WebGL context and has been observed to
              // silently hang on some driver/browser combinations with no
              // error surfaced at all. A single hand at even 15-20fps reads
              // as perfectly smooth for this kind of ambient interaction,
              // so CPU's reliability is worth far more here than GPU's speed.
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          // Guard against exactly that kind of silent hang: never let the UI
          // wait forever on a promise that may simply never settle.
          const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timed out loading the hand-tracking model.')), 20000);
          });

          landmarkerRef.current = await Promise.race([loadModel, timeout]);
        }

        if (!mountedRef.current) return;

        setStatus('active');
        lastVideoTimeRef.current = -1;
        stopLoop();
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to start hand tracking.';
        setError(message);
        setStatus('error');
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    })();
  }, [status, stopLoop, tick]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopLoop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      handTrackingStore.detected = false;
      landmarkerRef.current?.close?.();
    };
  }, [stopLoop]);

  return { status, error, handDetected, enable, disable, previewCanvasRef };
}
