const AMDF = require("./detectors/amdf");
const YIN = require("./detectors/yin");
const DynamicWavelet = require("./detectors/dynamic_wavelet");
const Macleod = require("./detectors/macleod");
const ACF2PLUS = require("./detectors/acf2plus");

const frequencies = require("./tools/frequencies");

module.exports = {
  AMDF,
  YIN,
  DynamicWavelet,
  Macleod,
  ACF2PLUS,
  frequencies,
};
