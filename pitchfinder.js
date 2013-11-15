/* An Javascript port of Tarsos's JAVA implementation
 * of various pitch detection algorithms, created by
 * Joren Six of University College Ghent.
 *
 * Contains the following algorithms:
 * YIN (with and without FFT; the version with requires an external FFT library)
 * Average Magnitude Difference
 * Dynamic Wavelet
 * McLeod Pitch Method
 *
 * Since this Javascript and we have first-class functions,
 * each method creates and returns a pitch detector function
 * with the given configuration.  When called with a float32Array
 * representing an audio buffer, it returns the pitch.
 *
 * Methods vary in accuracy and speed.  I have found the best results with YIN.
 *
 * Find the original project at http://tarsos.0110.be/tag/TarsosDSP
 * or on Github at https://github.com/JorenSix/TarsosDSP
 */

'use strict';

var AMDF = function(config) {
  config = config || {};

  var AMDF = {};

  var DEFAULT_MIN_FREQUENCY = 82,
      DEFAULT_MAX_FREQUENCY = 1000,
      DEFAULT_RATIO = 5,
      DEFAULT_SENSITIVITY = 0.1,
      DEFAULT_SAMPLE_RATE = 44100,
      sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE,
      minFrequency = config.minFrequency || DEFAULT_MIN_FREQUENCY,
      maxFrequency = config.maxFrequency || DEFAULT_MAX_FREQUENCY,
      sensitivity = config.sensitivity || DEFAULT_SENSITIVITY,
      ratio = config.ratio || DEFAULT_RATIO,
      amd = [],
      maxPeriod = Math.round(sampleRate / minFrequency +0.5),
      minPeriod = Math.round(sampleRate / maxFrequency +0.5),
      result = {};

  return function(float32AudioBuffer) {
    var t,
        minval = Infinity,
        maxval = -Infinity,
        frames1,
        frames2,
        calcSub,
        maxShift = float32AudioBuffer.length;

    // Find the average magnitude difference for each possible period offset.
    for (var i = 0; i < maxShift; i++) {
      if (minPeriod <= i && i <= maxPeriod) {
        t = 0;
        frames1 = []; // The magnitudes from the start of the buffer.
        frames2 = []; // The magnitudes from the start of the buffer plus the offset.
        for (var aux1 = 0, aux2 = i, t = 0; aux1 < maxShift - i; t++, aux2++, aux1++) {
          frames1[t] = float32AudioBuffer[aux1]
          frames2[t] = float32AudioBuffer[aux2]
        }

        // Take the difference between these frames.
        var frameLength = frames1.length
        calcSub = [];
        for (var u = 0; u < frameLength; u++) {
          calcSub[u] = frames1[u] - frames2[u];
        }

        // Sum the differences.
        var summation = 0;
        for (var l = 0; l < frameLength; l++) {
          summation += Math.abs(calcSub[l]);
        }
        amd[i] = summation;
      }
    }

    for (var j = minPeriod; j < maxPeriod; j++) {
      if(amd[j] < minval) minval = amd[j];
      if(amd[j] > maxval) maxval = amd[j];
    }

    var cutoff = Math.round((sensitivity * (maxval - minval)) + minval);
    for (j = minPeriod; j <= maxPeriod && amd[j] > cutoff; j++);

    var search_length = minPeriod / 2;
    minval = amd[j];
    var minpos = j;
    for (i = j - 1; i < j + search_length && i <= maxPeriod; i++) {
      if (amd[i] < minval) {
        minval = amd[i];
        minpos = i;
      }
    }

    if (Math.round(amd[minpos] * ratio) < maxval) {
      return {freq: sampleRate/minpos};
    } else {
      return {freq: -1};
    }
  };
};


// Constructor function for the YIN pitch dectector.
var YIN = function(config) {

  config = config || {};

  var YIN = {};

  var DEFAULT_THRESHOLD = 0.10,
  DEFAULT_BUFFER_SIZE = 2048,
  DEFAULT_SAMPLE_RATE = 44100,
  threshold = config.threshold || DEFAULT_THRESHOLD,
  sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE,
  bufferSize = config.bufferSize || DEFAULT_BUFFER_SIZE,
  yinBuffer = new Float32Array(bufferSize / 2),
  yinBufferLength = bufferSize / 2,
  result = {};

  // Implements the difference function as described in step 2 of the YIN paper.
  var difference = function(float32AudioBuffer) {
    var index, delta;
    for (var tau = 0; tau < yinBufferLength; tau++) {
      yinBuffer[tau] = 0;
    }
    for (tau = 1; tau < yinBufferLength; tau++) {
      for (index = 0; index < yinBufferLength; index++) {
        delta = float32AudioBuffer[index] - float32AudioBuffer[index + tau];
        yinBuffer[tau] += delta * delta;
      }
    }
  };

  // Implements the cumulative mean normalized difference as described in step 3 of the paper.
  var cumulativeMeanNormalizedDifference = function() {
    yinBuffer[0] = 1;
    yinBuffer[1] = 1;
    var runningSum = 0;
    for (var tau = 1; tau < yinBufferLength; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }
  };

  var absoluteThreshold = function() {
    // Since the first two positions in the array are 1,
    // we can start at the third position.
    for (var tau = 2; tau < yinBufferLength; tau++) {
      if (yinBuffer[tau] < threshold) {
        while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        // found tau, exit loop and return
        // store the probability
        // From the YIN paper: The threshold determines the list of
        // candidates admitted to the set, and can be interpreted as the
        // proportion of aperiodic power tolerated
        // within a periodic signal.
        //
        // Since we want the periodicity and and not aperiodicity:
        // periodicity = 1 - aperiodicity
        result.probability = 1 - yinBuffer[tau];
        break;
      }
    }

    // if no pitch found, set tau to -1
    if (tau == yinBufferLength || yinBuffer[tau] >= threshold) {
      tau = -1;
      result.probability = 0;
      result.foundPitch = false;
    } else {
      result.foundPitch = true;
    }

    return tau;
  };

  /**
   * Implements step 5 of the AUBIO_YIN paper. It refines the estimated tau
   * value using parabolic interpolation. This is needed to detect higher
   * frequencies more precisely. See http://fizyka.umk.pl/nrbook/c10-2.pdf and
   * for more background
   * http://fedc.wiwi.hu-berlin.de/xplore/tutorials/xegbohtmlnode62.html
   */

   var parabolicInterpolation = function(tauEstimate) {
    var betterTau,
    x0,
    x2;

    if (tauEstimate < 1) {
      x0 = tauEstimate;
    } else {
      x0 = tauEstimate - 1;
    }
    if (tauEstimate + 1 < yinBufferLength) {
      x2 = tauEstimate + 1;
    } else {
      x2 = tauEstimate;
    }
    if (x0 === tauEstimate) {
      if (yinBuffer[tauEstimate] <= yinBuffer[x2]) {
        betterTau = tauEstimate;
      } else {
        betterTau = x2;
      }
    } else if (x2 === tauEstimate) {
      if (yinBuffer[tauEstimate] <= yinBuffer[x0]) {
        betterTau = tauEstimate;
      } else {
        betterTau = x0;
      }
    } else {
      var s0, s1, s2;
      s0 = yinBuffer[x0];
      s1 = yinBuffer[tauEstimate];
      s2 = yinBuffer[x2];
      // fixed AUBIO implementation, thanks to Karl Helgason:
      // (2.0f * s1 - s2 - s0) was incorrectly multiplied with -1
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }
    return betterTau;
  };


  // Return the pitch of a given signal, or -1 if none is detected.
  return function(float32AudioBuffer) {

    // Step 2
    difference(float32AudioBuffer);

    // Step 3
    cumulativeMeanNormalizedDifference();

    // Step 4
    var tauEstimate = absoluteThreshold();

    // Step 5
    if (tauEstimate !== -1) {

      var betterTau = parabolicInterpolation(tauEstimate);

      // TODO: optimization!

      result.freq = sampleRate / betterTau;

    } else {

      result.freq = -1;

    }

    // Good luck!
    return result;
  };
};

// Construtor function for Dynamic Wavelet detector
var DW = function(config) {

  config = config || {};

  var maxFLWTlevels = 6,
      maxF = 3000,
      differenceLevelsN = 3,
      maximaThresholdRatio = 0.75,
      sampleRate = config.sampleRate || 44100,
      bufferLength = config.bufferSize || 1024,
      distances = [],
      mins = [],
      maxs = [],
      result = {};

  return function(float32AudioBuffer) {
    var pitchF = -1,
        curSamNb = float32AudioBuffer.length,
        nbMins,
        nbMaxs,
        amplitudeThreshold,
        theDC = 0,
        minValue = 0,
        maxValue = 0;

    // Compute max amplitude, amplitude threshold, and the DC.
    for (var i = 0; i < bufferLength; i++) {
      var sample = float32AudioBuffer[i];
      theDC = theDC + sample;
      maxValue = Math.max(maxValue, sample);
      minValue = Math.min(minValue, sample);
    }

    theDC = theDC/bufferLength;
    minValue -= theDC;
    maxValue -= theDC;
    var amplitudeMax = (maxValue > -1*minValue ? maxValue : -1*minValue);

    amplitudeThreshold = amplitudeMax*maximaThresholdRatio;

    // levels, start without downsampling...
    var curLevel = 0,
        curModeDistance = -1,
        delta;

    // Search:
    while (true) {
      delta = ~~(sampleRate / (Math.pow(2, curLevel) * maxF));
      if (curSamNb < 2) break;

      var dv,
          previousDV = -1000,
          lastMinIndex = -1000000,
          lastMaxIndex = -1000000,
          findMax = false,
          findMin = false;

      nbMins = 0;
      nbMaxs = 0;

      for (var i = 2; i < curSamNb; i++) {
        var si = float32AudioBuffer[i] - theDC,
            si1 = float32AudioBuffer[i-1] - theDC;

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
              if (i > lastMinIndex + delta) {
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

      var d,
          distances = [];

      for (var i = 0; i < nbMins; i++) {
        for (var j = 1; j < differenceLevelsN; j++) {
          if (i+j < nbMins) {
            d = Math.abs(mins[i] - mins[i+j]);
            distances[d] = distances[d] + 1;
          }
        }
      }

      var bestDistance = -1,
          bestValue = -1;

      for (var i = 0; i < curSamNb; i++) {
        var summed = 0;
        for (var j = -delta; j <= delta; j++) {
          if (i + j >= 0 && i + j < curSamNb) {
            summed += distances[i+j];
          }
        }

        if (summed === bestValue) {
          if (i === 2*bestDistance) {
            bestDistance = i;
          }
        } else if (summed > bestValue) {
          bestValue = summed;
          bestDistance = i;
        }
      }

      // averaging
      var distAvg = 0,
          nbDists = 0;
      for (var j = -delta; j <= delta; j++) {
        if (bestDistance + j >= 0 && bestDistance + j < bufferLength) {
          var nbDist = distances[bestDistance + j];
          if (nbDist > 0) {
            nbDists += nbDist;
            distAvg += (bestDistance + j)*nbDist;
          }
        }
      }

      // This is our mode distance.
      distAvg /= nbDists;

      // Continue the levels?
      if (curModeDistance > -1) {
        var similarity = Math.abs(distAvg*2 - curModeDistance);
        if (similarity <= 2*delta) {
          // two consecutive similar mode distances : ok !
          pitchF = (sampleRate/(Math.pow(2,curLevel-1)*curModeDistance));
          break;
        }
      }

      // not similar, continue next level;
      curModeDistance = distAvg;

      curLevel++;
      if (curLevel >= maxFLWTlevels || curSamNb < 2) {
        break;
      }

      //do not modify original audio buffer, make a copy buffer, if
      //downsampling is needed (only once).
      var newFloat32AudioBuffer = float32AudioBuffer.subarray(0);
      if (curSamNb === distances.length) {
        newFloat32AudioBuffer = new Float32Array(curSamNb/2);
      }
      for (var i = 0; i < curSamNb/2; i++) {
        newFloat32AudioBuffer[i] = (float32AudioBuffer[2*i] + float32AudioBuffer[2*i + 1])/2;
      }
      float32AudioBuffer = newFloat32AudioBuffer;
      curSamNb /= 2;
    }

    result.freq = pitchF;

    return result;
  };
};

// Constructor function for McLeod Pitch Method detector.
// Note: Quite slow..
var MPM = function(config) {

  config = config || {};

      /**
       * The expected size of an audio buffer (in samples).
       */
  var DEFAULT_BUFFER_SIZE = 1024,

      /**
       * Defines the relative size the chosen peak (pitch) has. 0.93 means: choose
       * the first peak that is higher than 93% of the highest peak detected. 93%
       * is the default value used in the Tartini user interface.
       */
      DEFAULT_CUTOFF = 0.97,

      DEFAULT_SAMPLE_RATE = 44100,

      /**
       * For performance reasons, peaks below this cutoff are not even considered.
       */
      SMALL_CUTOFF = 0.5,

      /**
       * Pitch annotations below this threshold are considered invalid, they are
       * ignored.
       */
      LOWER_PITCH_CUTOFF = 88,

      /**
       * Defines the relative size the chosen peak (pitch) has.
       */
      cutoff = config.cutoff,

      /**
       * The audio sample rate. Most audio has a sample rate of 44.1kHz.
       */
      sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE,

      /**
       * Size of the input buffer.
       */
      bufferSize = config.bufferSize || DEFAULT_BUFFER_SIZE,

      /**
       * Contains a normalized square difference function value for each delay
       * (tau).
       */
      nsdf = new Float32Array(bufferSize),

      /**
       * The x and y coordinate of the top of the curve (nsdf).
       */
      turningPointX,
      turningPointY,

      /**
       * A list with minimum and maximum values of the nsdf curve.
       */
      maxPositions = [],

      /**
       * A list of estimates of the period of the signal (in samples).
       */
      periodEstimates = [],

      /**
       * A list of estimates of the amplitudes corresponding with the period
       * estimates.
       */
      ampEstimates = [],

      /**
       * The result of the pitch detection iteration.
       */
      result = {};

  /**
   * Implements the normalized square difference function. See section 4 (and
   * the explanation before) in the MPM article. This calculation can be
   * optimized by using an FFT. The results should remain the same.
   */
  var normalizedSquareDifference = function(float32AudioBuffer) {
    for (var tau = 0; tau < float32AudioBuffer.length; tau++) {
      var acf = 0,
          divisorM = 0;
      for (var i = 0; i < float32AudioBuffer.length - tau; i++) {
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
  var parabolicInterpolation = function(tau) {
    var nsdfa = nsdf[tau - 1],
        nsdfb = nsdf[tau],
        nsdfc = nsdf[tau + 1],
        bValue = tau,
        bottom = nsdfc + nsdfa - 2 * nsdfb;
    if (bottom === 0) {
      turningPointX = bValue;
      turningPointY = nsdfb;
    } else {
      var delta = nsdfa - nsdfc;
      turningPointX = bValue + delta / (2 * bottom);
      turningPointY = nsdfb - delta * delta / (8 * bottom);
    }
  };

  // Finds the highest value between each pair of positive zero crossings.
  var peakPicking = function() {
    var pos = 0,
        curMaxPos = 0;

    // find the first negative zero crossing.
    while (pos < nsdf.length - 1 / 3 && nsdf[pos] > 0) {
      pos++;
    }

    // loop over all the values below zero.
    while (pos < nsdf.length - 1 && nsdf[pos <= 0]) {
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
    var pitch,
        maxPositions = [],
        periodEstimates = [],
        ampEstimates = [];

    // 1. Calculute the normalized square difference for each Tau value.
    normalizedSquareDifference(float32AudioBuffer);
    // 2. Peak picking time: time to pick some peaks.
    peakPicking();

    var highestAmplitude = -Infinity;

    for (var tau = 0; tau < maxPositions.length; i++) {
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
      var actualCutoff = cutoff * highestAmplitude,
          periodIndex = 0;

      for (var i = 0; i < ampEstimates.length; i++) {
        if (ampEstimates[i] >= actualCutoff) {
          periodIndex = i;
          break;
        }
      }

      var period = periodIndex[periodIndex],
          pitchEstimate = sampleRate / period;

      if (pitchEstimate > LOWER_PITCH_CUTOFF) {
        pitch = pitchEstimate;
      } else {
        pitch = -1;
      }

    } else {
      // no pitch detected.
      pitch = -1
    }

    result.probability = highestAmplitude;
    result.freq = pitch;
    return result;
  };
};