export function analyzeAudio(samples: Float32Array, sampleRate: number) {
  const duration = samples.length / sampleRate;
  if (duration < 3 || duration > 121)
    throw new Error("Use a recording between 3 and 120 seconds long.");
  const frameSize = Math.round(sampleRate * 0.05);
  let active = 0,
    total = 0,
    sum = 0,
    clipping = 0,
    crossings = 0;
  const waveform: number[] = [];
  for (let i = 0; i < samples.length; i += frameSize) {
    const end = Math.min(samples.length, i + frameSize);
    let energy = 0;
    for (let j = i; j < end; j++) {
      const value = samples[j];
      energy += value * value;
      if (Math.abs(value) > 0.99) clipping++;
      if (j > 0 && value >= 0 !== samples[j - 1] >= 0) crossings++;
    }
    const rms = Math.sqrt(energy / (end - i));
    if (20 * Math.log10(Math.max(rms, 0.000001)) > -50) active++;
    total++;
    sum += energy;
    waveform.push(rms);
  }
  const activity = Math.round((active / total) * 100);
  return {
    duration: Math.round(duration),
    activity,
    silence: 100 - activity,
    rmsDb: Math.round(
      20 * Math.log10(Math.max(Math.sqrt(sum / samples.length), 0.000001)),
    ),
    clipping: Number(((clipping / samples.length) * 100).toFixed(2)),
    zeroCrossingsPerSecond: Math.round(crossings / duration),
    waveform: waveform
      .filter((_, i) => i % Math.max(1, Math.floor(waveform.length / 80)) === 0)
      .slice(0, 80),
  };
}
