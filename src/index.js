const AMDF = require('./detectors/amdf')
const YIN = require('./detectors/yin')
const MacLeod = require('./detectors/macleod')
const DynamicWavelet = require('./detectors/dynamic_wavelet')

const frequencies = require('./tools/frequencies')

module.exports = {
  AMDF,
  YIN,
  MacLeod,
  DynamicWavelet,

  frequencies
}
