import {YIN} from './detectors/yin';
import {AMDF} from './detectors/amdf';
import {acf2plus} from './detectors/acf2plus';
import {DynamicWavelet} from './detectors/dynamic_wavelet';
import {Macleod} from './detectors/macleod';

import {frequencies} from './tools/frequencies';

export const Pitchfinder = {
  acf2plus,
  DynamicWavelet,
  frequencies,
  Macleod,
  AMDF,
  YIN
};