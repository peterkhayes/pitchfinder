
module.exports = function(config) {

  config = config || {};

  /**
   * The expected size of an audio buffer (in samples).
   */
  const DEFAULT_BUFFER_SIZE = 1024;

  /**
   * Defines the relative size the chosen peak (pitch) has. 0.93 means: choose
   * the first peak that is higher than 93% of the highest peak detected. 93%
   * is the default value used in the Tartini user interface.
   */
  const DEFAULT_CUTOFF = 0.97;

  const DEFAULT_SAMPLE_RATE = 44100;

  /**
   * For performance reasons, peaks below this cutoff are not even considered.
   */
  const SMALL_CUTOFF = 0.5;

  /**
   * Pitch annotations below this threshold are considered invalid, they are
   * ignored.
   */
  const LOWER_PITCH_CUTOFF = 80;

  /**
   * Defines the relative size the chosen peak (pitch) has.
   */
  const cutoff = config.cutoff || DEFAULT_CUTOFF;

  /**
   * The audio sample rate. Most audio has a sample rate of 44.1kHz.
   */
  const sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE;

  /**
   * Size of the input buffer.
   */
  const bufferSize = config.bufferSize || DEFAULT_BUFFER_SIZE;

  /**
   * Contains a normalized square difference function value for each delay
   * (tau).
   */
  const nsdf = new Float32Array(bufferSize);

  /**
   * The x and y coordinate of the top of the curve (nsdf).
   */
  let turningPointX;
  let turningPointY;

  /**
   * A list with minimum and maximum values of the nsdf curve.
   */
  let maxPositions = [];

  /**
   * A list of estimates of the period of the signal (in samples).
   */
  let periodEstimates = [];

  /**
   * A list of estimates of the amplitudes corresponding with the period
   * estimates.
   */
  let ampEstimates = [];

  /**
   * The result of the pitch detection iteration.
   */
  const result = {};

  /**
   * Implements the normalized square difference function. See section 4 (and
   * the explanation before) in the MPM article. This calculation can be
   * optimized by using an FFT. The results should remain the same.
   */
  const normalizedSquareDifference = function(float32AudioBuffer) {
    for (let tau = 0; tau < float32AudioBuffer.length; tau++) {
      let acf = 0;
      let divisorM = 0;
      for (let i = 0; i < float32AudioBuffer.length - tau; i++) {
        acf += float32AudioBuffer[i] * float32AudioBuffer[i+tau];
        divisorM += float32AudioBuffer[i] * float32AudioBuffer[i] + float32AudioBuffer[i + tau] * float32AudioBuffer[i + tau];
      }
      nsdf[tau] = 2 * acf / divisorM;
    }
  };

  /**
   * Finds the x value corresponding with the peak of a parabola.
   * Interpolates between three consecutive points centered on tau.
   */
  const parabolicInterpolation = function(tau) {
    const nsdfa = nsdf[tau - 1],
        nsdfb = nsdf[tau],
        nsdfc = nsdf[tau + 1],
        bValue = tau,
        bottom = nsdfc + nsdfa - 2 * nsdfb;
    if (bottom === 0) {
      turningPointX = bValue;
      turningPointY = nsdfb;
    } else {
      const delta = nsdfa - nsdfc;
      turningPointX = bValue + delta / (2 * bottom);
      turningPointY = nsdfb - delta * delta / (8 * bottom);
    }
  };

  // Finds the highest value between each pair of positive zero crossings.
  const peakPicking = function() {
    let pos = 0;
    let curMaxPos = 0;

    // find the first negative zero crossing.
    while (pos < (nsdf.length - 1) / 3 && nsdf[pos] > 0) {
      pos++;
    }

    // loop over all the values below zero.
    while (pos < nsdf.length - 1 && nsdf[pos] <= 0) {
      pos++;
    }

    // can happen if output[0] is NAN
    if (pos == 0) {
      pos = 1;
    }

    while (pos < nsdf.length - 1) {
      if (nsdf[pos] > nsdf[pos - 1] && nsdf[pos] >= nsdf[pos + 1]) {
        if (curMaxPos == 0) {
          // the first max (between zero crossings)
          curMaxPos = pos;
        } else if (nsdf[pos] > nsdf[curMaxPos]) {
          // a higher max (between the zero crossings)
          curMaxPos = pos;
        }
      }
      pos++;
      // a negative zero crossing
      if (pos < nsdf.length - 1 && nsdf[pos] <= 0) {
        // if there was a maximum add it to the list of maxima
        if (curMaxPos > 0) {
          maxPositions.push(curMaxPos);
          curMaxPos = 0; // clear the maximum position, so we start
          // looking for a new ones
        }
        while (pos < nsdf.length - 1 && nsdf[pos] <= 0) {
          pos++; // loop over all the values below zero
        }
      }
    }
    if (curMaxPos > 0) {
      maxPositions.push(curMaxPos);
    }
  };

  return function(float32AudioBuffer) {

    // 0. Clear old results.
    let pitch;
    maxPositions = [];
    periodEstimates = [];
    ampEstimates = [];

    // 1. Calculute the normalized square difference for each Tau value.
    normalizedSquareDifference(float32AudioBuffer);
    // 2. Peak picking time: time to pick some peaks.
    peakPicking();

    let highestAmplitude = -Infinity;

    for (let i = 0; i < maxPositions.length; i++) {
      const tau = maxPositions[i];
      // make sure every annotation has a probability attached
      highestAmplitude = Math.max(highestAmplitude, nsdf[tau]);

      if (nsdf[tau] > SMALL_CUTOFF) {
        // calculates turningPointX and Y
        parabolicInterpolation(tau);
        // store the turning points
        ampEstimates.push(turningPointY);
        periodEstimates.push(turningPointX);
        // remember the highest amplitude
        highestAmplitude = Math.max(highestAmplitude, turningPointY);
      }
    }

    if (periodEstimates.length) {
      // use the overall maximum to calculate a cutoff.
      // The cutoff value is based on the highest value and a relative
      // threshold.
      const actualCutoff = cutoff * highestAmplitude;
      let periodIndex = 0;

      for (let i = 0; i < ampEstimates.length; i++) {
        if (ampEstimates[i] >= actualCutoff) {
          periodIndex = i;
          break;
        }
      }

      const period = periodEstimates[periodIndex],
          pitchEstimate = sampleRate / period;

      if (pitchEstimate > LOWER_PITCH_CUTOFF) {
        pitch = pitchEstimate;
      } else {
        pitch = -1;
      }

    } else {
      // no pitch detected.
      pitch = -1;
    }

    result.probability = highestAmplitude;
    result.freq = pitch;
    return result;
  };
};
