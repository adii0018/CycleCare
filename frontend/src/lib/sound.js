/**
 * Synthesizes a clean, gentle, premium success chime using the browser's Web Audio API.
 * - 0 KB extra network download (no mp3/wav files).
 * - 0ms latency.
 * - Gentle melodic chord (D5 -> A5 -> D6) with soft exponential decay.
 */
export function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [
      { freq: 587.33, start: 0, duration: 0.6, gain: 0.15 }, // D5
      { freq: 880.0, start: 0.08, duration: 0.7, gain: 0.18 }, // A5
      { freq: 1174.66, start: 0.16, duration: 0.9, gain: 0.2 }, // D6
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    // Clean up audio context
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {
    // Graceful fallback: audio fails silently without interrupting app flow
  }
}
