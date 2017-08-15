const {MacLeod} = require('../../../build/Release/addon')

module.exports = (options = {}) => {
  const detector = new MacLeod(options.bufferSize, options.sampleRate, options.threshold, options.probabilityThreshold)

  return data => {
    let actualData = data
    if (!(data instanceof Float64Array)) actualData = Float64Array.from(data)
    return detector.getPitch(actualData)
  }
}
