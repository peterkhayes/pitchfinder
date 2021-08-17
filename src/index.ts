import { YIN, YinConfig } from './detectors/yin';
import { AMDF, AMDFConfig } from './detectors/amdf';
import { ACF2PLUS, ACF2Config } from './detectors/acf2plus';
import { DynamicWavelet, DynamicWaveletConfig } from './detectors/dynamic_wavelet';
import { Macleod, MacleodConfig } from './detectors/macleod';
import {
  PitchDetector,
  ProbabalisticPitchDetector,
  ProbabilityPitch,
} from './detectors/types';

import {
  frequencies,
  FrequenciesParams,
  consensusPitchDetector,
} from './tools/frequencies';

export {
  YIN,
  YinConfig,
  AMDF,
  AMDFConfig,
  ACF2PLUS,
  ACF2Config,
  DynamicWavelet,
  DynamicWaveletConfig,
  Macleod,
  MacleodConfig,
  frequencies,
  FrequenciesParams,
  consensusPitchDetector,
  PitchDetector,
  ProbabalisticPitchDetector,
  ProbabilityPitch,
};

export default {
  YIN,
  AMDF,
  ACF2PLUS,
  DynamicWavelet,
  Macleod,
  frequencies,
  consensusPitchDetector,
};
