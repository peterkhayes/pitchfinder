import { PitchDetector } from '../detectors/types';

export const DEFAULT_FREQUENCIES_PARAMS: FrequenciesParams = {
  tempo: 120,
  quantization: 4,
  sampleRate: 44100,
};

export function consensusPitchDetector(detectors: Array<PitchDetector>): PitchDetector {
  return (chunk: Float32Array): number | null => {
    const pitches: Array<number> = detectors
      .map((fn) => fn(chunk))
      .filter(<T>(value: T | null): value is T => value !== null)
      .sort((a: number, b: number) => a - b);

    // In the case of one pitch, return it.
    if (pitches.length === 1) {
      return pitches[0];

      // In the case of two pitches, return the geometric mean if they
      // are close to each other, and the lower pitch otherwise.
    } else if (pitches.length === 2) {
      const [first, second] = pitches;
      return first * 2 > second ? Math.sqrt(first * second) : first;

      // In the case of three or more pitches, filter away the extremes
      // if they are very extreme, then take the geometric mean.
    } else {
      const first = pitches[0];
      const second = pitches[1];
      const secondToLast = pitches[pitches.length - 2];
      const last = pitches[pitches.length - 1];

      const filtered1 = first * 2 > second ? pitches : pitches.slice(1);
      const filtered2 = secondToLast * 2 > last ? filtered1 : filtered1.slice(0, -1);
      return Math.pow(
        filtered2.reduce((t, p) => t * p, 1),
        1 / filtered2.length,
      );
    }
  };
}

export interface FrequenciesParams {
  tempo: number;
  quantization: number;
  sampleRate: number;
}

export function frequencies(
  detector: PitchDetector | Array<PitchDetector>,
  float32AudioBuffer: Float32Array,
  options: Partial<FrequenciesParams> = {},
): Array<number | null> {
  const config = {
    ...DEFAULT_FREQUENCIES_PARAMS,
    ...options,
  };
  const { tempo, quantization, sampleRate } = config;

  const bufferLength = float32AudioBuffer.length;
  const chunkSize = Math.round((sampleRate * 60) / (quantization * tempo));

  const getPitch: PitchDetector = Array.isArray(detector)
    ? consensusPitchDetector(detector)
    : detector;

  const pitches: Array<number | null> = [];
  for (let i = 0, max = bufferLength - chunkSize; i <= max; i += chunkSize) {
    const chunk = float32AudioBuffer.slice(i, i + chunkSize);
    const pitch = getPitch(chunk);
    pitches.push(pitch);
  }

  return pitches;
}
