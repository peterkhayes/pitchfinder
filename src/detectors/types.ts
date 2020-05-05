export type PitchDetector = (float32AudioBuffer: Float32Array) => number | null;
export type ProbabalisticPitchDetector = (
  float32AudioBuffer: Float32Array,
) => ProbabilityPitch;

export interface ProbabilityPitch {
  probability: number;
  freq: number;
}
