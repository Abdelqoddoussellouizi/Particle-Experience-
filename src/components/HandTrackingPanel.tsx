import { motion } from 'framer-motion';
import { useHandTracking } from '../hooks/useHandTracking';

const STATUS_LABEL: Record<string, string> = {
  requesting: 'Requesting camera…',
  'loading-model': 'Loading hand model…',
  error: 'Camera unavailable',
  unsupported: 'Not supported in this browser',
};

/**
 * Opt-in webcam hand-tracking control: a single button starts the camera and
 * MediaPipe's HandLandmarker, after which the tracked palm position drives
 * particle repulsion and camera parallax exactly like the mouse would (see
 * useMouse.ts, which reads handTrackingStore). Shows a small mirrored
 * preview with a glowing dot on the tracked point so you can see yourself
 * well enough to stay in frame.
 */
export function HandTrackingPanel() {
  const { status, error, handDetected, enable, disable, previewCanvasRef } = useHandTracking();

  const isBusy = status === 'requesting' || status === 'loading-model';
  const isActive = status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, duration: 0.8 }}
      className="pointer-events-auto flex w-fit flex-col items-end gap-2"
    >
      {isActive && (
        <div
          className={`overflow-hidden rounded-lg border backdrop-blur-sm transition-colors ${
            handDetected ? 'border-cyan-400/60' : 'border-white/10'
          }`}
        >
          <canvas ref={previewCanvasRef} width={176} height={132} className="block bg-black/60" />
          <div className="bg-black/50 px-2 py-1 text-center text-[10px] tracking-wide text-cyan-100/70">
            {handDetected ? 'HAND TRACKED' : 'SHOW YOUR HAND'}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={isActive ? disable : enable}
        disabled={isBusy || status === 'unsupported'}
        className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[11px] font-medium tracking-wide text-cyan-100/80 backdrop-blur-sm transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isActive
          ? 'DISABLE HAND TRACKING'
          : isBusy
            ? STATUS_LABEL[status]
            : status === 'unsupported'
              ? STATUS_LABEL.unsupported
              : '✋ ENABLE HAND TRACKING'}
      </button>

      {status === 'error' && error && (
        <span className="max-w-[220px] text-right text-[10px] leading-snug text-red-300/80">{error}</span>
      )}
    </motion.div>
  );
}
