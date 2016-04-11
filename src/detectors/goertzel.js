// TODO: Make me work
// module.exports = function(frequencies, config) {
//   "use strict";
//   config = config || {};

//   /**
//    * If the power in dB is higher than this threshold, the frequency is
//    * present in the signal.
//    */
//   var POWER_THRESHOLD = config.threshold || 35,// in dB
//   /**
//    * Sample rate for the hardware, default to 44.1k
//    */
//   sampleRate = config.sampleRate || 44100,

//   /**
//    * Size of the audio buffer for calculations:
//    */
//   bufferSize = config.bufferSize || 2048,

//   /**
//    * A list of frequencies to detect.
//    */
//   frequenciesToDetect = [],
//   /**
//    * Cached cosine calculations for each frequency to detect.
//    */
//   precalculatedCosines = [],
//   /**
//    * Cached wnk calculations for each frequency to detect.
//    */
//   precalculatedWnk = [],
//   /**
//    * A calculated power for each frequency to detect. This array is reused for
//    * performance reasons.
//    */
//   calculatedPowers = [];

//   frequenciesToDetect = frequencies;
//   precalculatedCosines = new Array(frequencies.length);
//   precalculatedWnk = new Array(frequencies.length);

//   calculatedPowers = new Array(frequencies.length);

//   var i, j, frequenciesToDetectClone;
//   for (i = 0; i < frequenciesToDetect.length; i++) {
//     precalculatedCosines[i] = 2 * Math.cos(2 * Math.PI *
//         frequenciesToDetect[i] / sampleRate);
//     precalculatedWnk[i] = Math.exp(-2 * Math.PI *
//         frequenciesToDetect[i] / sampleRate);
//   }    

//   return function(audioFloatBuffer) {
//     var skn0, skn1, skn2,
//         i, j;
//     var numberOfDetectedFrequencies = 0;
//     for (j = 0; j < frequenciesToDetect.length; j++) {
//       skn0 = skn1 = skn2 = 0;
//       for (i = 0; i < audioFloatBuffer.length; i++) {
//         skn2 = skn1;
//         skn1 = skn0;
//         skn0 = precalculatedCosines[j] * skn1 - skn2 +
//             audioFloatBuffer[i];
//       }
//       var wnk = precalculatedWnk[j];
//       calculatedPowers[j] = 20 * Math.log10(Math.abs(skn0 - wnk * skn1));
//       if (calculatedPowers[j] > POWER_THRESHOLD) {
//         numberOfDetectedFrequencies++;
//       }
//     }

//     if (numberOfDetectedFrequencies > 0) {
//       var hits = [], frequency, power;
//       frequenciesToDetectClone = [].concat(frequenciesToDetect);
//       for (j = 0; j < frequenciesToDetect.length; j++) {
//         if (calculatedPowers[j] > POWER_THRESHOLD) {
//           frequency = frequenciesToDetect[j];
//           power = calculatedPowers[j];
//           hits.push({
//             frequency: frequency,
//             power: power
//           });
//         }
//       }
//       return hits;
//     }
//     // Otherwise, no hits!
//     return -1;
//   };
// }