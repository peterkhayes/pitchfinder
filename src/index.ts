import { YIN } from "./detectors/yin";
import { AMDF } from "./detectors/amdf";
import { ACF2PLUS } from "./detectors/acf2plus";
import { DynamicWavelet } from "./detectors/dynamic_wavelet";
import { Macleod } from "./detectors/macleod";

import { frequencies } from "./tools/frequencies";

export default {
  ACF2PLUS,
  DynamicWavelet,
  frequencies,
  Macleod,
  AMDF,
  YIN
};
