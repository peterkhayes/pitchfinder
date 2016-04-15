const DEFAULT_SAMPLE_RATE = 44100;
const MAX_FLWT_LEVELS = 6;
const MAX_F = 3000;
const DIFFERENCE_LEVELS_N = 3;
const MAXIMA_THRESHOLD_RATIO = 0.75;


module.exports = function(config = {}) {

  const sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE;

  return function DynamicWaveletDetector (float32AudioBuffer) {
    "use strict";

    const mins = [];
    const maxs = [];
    const bufferLength = float32AudioBuffer.length;

    let freq = null;
    let theDC = 0;
    let minValue = 0;
    let maxValue = 0;

    // Compute max amplitude, amplitude threshold, and the DC.
    for (let i = 0; i < bufferLength; i++) {
      const sample = float32AudioBuffer[i];
      theDC = theDC + sample;
      maxValue = Math.max(maxValue, sample);
      minValue = Math.min(minValue, sample);
    }

    theDC /= bufferLength;
    minValue -= theDC;
    maxValue -= theDC;
    const amplitudeMax = maxValue > -1 * minValue ? maxValue : -1 * minValue;
    const amplitudeThreshold = amplitudeMax*MAXIMA_THRESHOLD_RATIO;

    // levels, start without downsampling...
    let curLevel = 0;
    let curModeDistance = -1;
    let curSamNb = float32AudioBuffer.length;
    let delta, nbMaxs, nbMins;

    // Search:
    while (true) {
      delta = ~~(sampleRate / (Math.pow(2, curLevel) * MAX_F));
      if (curSamNb < 2) break;

      let dv;
      let previousDV = -1000;
      let lastMinIndex = -1000000;
      let lastMaxIndex = -1000000;
      let findMax = false;
      let findMin = false;

      nbMins = 0;
      nbMaxs = 0;

      for (let i = 2; i < curSamNb; i++) {
        const si = float32AudioBuffer[i] - theDC;
        const si1 = float32AudioBuffer[i-1] - theDC;

        if (si1 <= 0 && si > 0) findMax = true;
        if (si1 >= 0 && si < 0) findMin = true;

        // min or max ?
        dv = si - si1;

        if (previousDV > -1000) {
          if (findMin && previousDV < 0 && dv >= 0) {
            // minimum
            if (Math.abs(si) >= amplitudeThreshold) {
              if (i > lastMinIndex + delta) {
                mins[nbMins++] = i;
                lastMinIndex = i;
                findMin = false;
              }
            }
          }

          if (findMax && previousDV > 0 && dv <= 0) {
            // maximum
            if (Math.abs(si) >= amplitudeThreshold) {
              if (i > lastMaxIndex + delta) {
                maxs[nbMaxs++] = i;
                lastMaxIndex = i;
                findMax = false;
              }
            }
          }
        }
        previousDV = dv;
      }

      if (nbMins === 0 && nbMaxs === 0) {
        // No best distance found!
        break;
      }

      let d;
      const distances = [];

      for (let i = 0; i < curSamNb; i++) {
        distances[i] = 0;
      }

      for (let i = 0; i < nbMins; i++) {
        for (let j = 1; j < DIFFERENCE_LEVELS_N; j++) {
          if (i + j < nbMins) {
            d = Math.abs(mins[i] - mins[i + j]);
            distances[d] += 1;
          }
        }
      }

      let bestDistance = -1;
      let bestValue = -1;

      for (let i = 0; i < curSamNb; i++) {
        let summed = 0;
        for (let j = -1 * delta; j <= delta; j++) {
          if (i + j >= 0 && i + j < curSamNb) {
            summed += distances[i+j];
          }
        }

        if (summed === bestValue) {
          if (i === 2 * bestDistance) {
            bestDistance = i;
          }
        } else if (summed > bestValue) {
          bestValue = summed;
          bestDistance = i;
        }
      }

      // averaging
      let distAvg = 0;
      let nbDists = 0;
      for (let j = -delta; j <= delta; j++) {
        if (bestDistance + j >= 0 && bestDistance + j < bufferLength) {
          const nbDist = distances[bestDistance + j];
          if (nbDist > 0) {
            nbDists += nbDist;
            distAvg += (bestDistance + j) * nbDist;
          }
        }
      }

      // This is our mode distance.
      distAvg /= nbDists;

      // Continue the levels?
      if (curModeDistance > -1) {
        if (Math.abs(distAvg*2 - curModeDistance) <= 2 * delta) {
          // two consecutive similar mode distances : ok !
          freq = sampleRate / (Math.pow(2, curLevel - 1) * curModeDistance);
          break;
        }
      }

      // not similar, continue next level;
      curModeDistance = distAvg;

      curLevel++;
      if (curLevel >= MAX_FLWT_LEVELS || curSamNb < 2) {
        break;
      }

      //do not modify original audio buffer, make a copy buffer, if
      //downsampling is needed (only once).
      let newFloat32AudioBuffer = float32AudioBuffer.subarray(0);
      if (curSamNb === distances.length) {
        newFloat32AudioBuffer = new Float32Array(curSamNb / 2);
      }
      for (let i = 0; i < curSamNb/2; i++) {
        newFloat32AudioBuffer[i] = (float32AudioBuffer[2*i] + float32AudioBuffer[2*i + 1])/2;
      }
      float32AudioBuffer = newFloat32AudioBuffer;
      curSamNb /= 2;
    }

    return freq;
  };
};