const DEFAULT_MIN_FREQUENCY = 82;
const DEFAULT_MAX_FREQUENCY = 1000;
const DEFAULT_RATIO = 5;
const DEFAULT_SENSITIVITY = 0.1;
const DEFAULT_SAMPLE_RATE = 44100;

module.exports = function(config = {}) {

  const sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE;
  const minFrequency = config.minFrequency || DEFAULT_MIN_FREQUENCY;
  const maxFrequency = config.maxFrequency || DEFAULT_MAX_FREQUENCY;
  const sensitivity = config.sensitivity || DEFAULT_SENSITIVITY;
  const ratio = config.ratio || DEFAULT_RATIO;
  const amd = [];
  const maxPeriod = Math.round(sampleRate / minFrequency + 0.5);
  const minPeriod = Math.round(sampleRate / maxFrequency + 0.5);

  return function AMDFDetector (float32AudioBuffer) {
    "use strict";

    const maxShift = float32AudioBuffer.length;
    
    let t = 0;
    let minval = Infinity;
    let maxval = -Infinity;
    let frames1, frames2, calcSub, i, j, u, aux1, aux2;

    // Find the average magnitude difference for each possible period offset.
    for (i = 0; i < maxShift; i++) {
      if (minPeriod <= i && i <= maxPeriod) {
        for (aux1 = 0, aux2 = i, t = 0, frames1 = [], frames2 = []; aux1 < maxShift - i; t++, aux2++, aux1++) {
          frames1[t] = float32AudioBuffer[aux1];
          frames2[t] = float32AudioBuffer[aux2];
        }

        // Take the difference between these frames.
        const frameLength = frames1.length;
        calcSub = [];
        for (u = 0; u < frameLength; u++) {
          calcSub[u] = frames1[u] - frames2[u];
        }

        // Sum the differences.
        let summation = 0;
        for (u = 0; u < frameLength; u++) {
          summation += Math.abs(calcSub[u]);
        }
        amd[i] = summation;
      }
    }

    for (j = minPeriod; j < maxPeriod; j++) {
      if (amd[j] < minval) minval = amd[j];
      if (amd[j] > maxval) maxval = amd[j];
    }

    const cutoff = Math.round((sensitivity * (maxval - minval)) + minval);
    for (j = minPeriod; j <= maxPeriod && amd[j] > cutoff; j++);

    const search_length = minPeriod / 2;
    minval = amd[j];
    let minpos = j;
    for (i = j - 1; i < j + search_length && i <= maxPeriod; i++) {
      if (amd[i] < minval) {
        minval = amd[i];
        minpos = i;
      }
    }

    if (Math.round(amd[minpos] * ratio) < maxval) {
      return sampleRate / minpos;
    } else {
      return null;
    }
  };
};