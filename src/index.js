const AMDF = require("./detectors/amdf");
const YIN = require("./detectors/yin");
const DynamicWavelet = require("./detectors/dynamic_wavelet");
// const FastYIN = require("./detectors/fast_yin");
// const Macleod = require("./detectors/macleod");

const frequencies = require("./tools/frequencies");
const notes = require("./tools/notes");

module.exports = {
  AMDF,
  YIN,
  DynamicWavelet,

  frequencies,
  notes,
};