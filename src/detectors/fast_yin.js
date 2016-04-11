//
// TODO: Finish me!
//

// const FFT = require("fft");

// module.exports = function(config) {

//   throw new Error("Unfinished!");

//   config = config || {};

//   var DEFAULT_THRESHOLD = 0.10,
//       DEFAULT_BUFFER_SIZE = 2048,
//       DEFAULT_SAMPLE_RATE = 44100,
//       threshold = config.threshold || DEFAULT_THRESHOLD,
//       sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE,
//       bufferSize = config.bufferSize || DEFAULT_BUFFER_SIZE,
//       yinBuffer = new Float32Array(bufferSize / 2),
//       yinBufferLength = bufferSize / 2,
//       audioBufferFFT = new Float32Array(2 * bufferSize),
//       kernel = new Float32Array(2 * bufferSize),
//       yinStyleACF = new Float32Array(2 * bufferSize),
//       result = {};

//   // Implements the difference function using an FFT.
//   var difference = function(float32AudioBuffer) {
//     // Power term calculation.
//     var powerTerms = new Float32Array(bufferSize / 2);
//     // First term.
//     for (var j = 0; j < bufferSize/2; j++) {
//       powerTerms[0] += float32AudioBuffer[j] * float32AudioBuffer[j];
//     }
//     // Iteratively calculate later terms.
//     for (var tau = 1; tau < bufferSize/2; tau++) {
//       powerTerms[tau] = powerTerms[tau-1] -
//         float32AudioBuffer[tau-1] * float32AudioBuffer[tau-1] +
//         float32AudioBuffer[tau+(bufferSize/2)] * float32AudioBuffer[tau+(bufferSize/2)];
//     }

//     // YIN-style autocorrelation via FFT
//     // 1. data
//     FFT.complex(audioBufferFFT, float32AudioBuffer, false);

//     // 2. half of the data, disguised as a convolution kernel
//     var halfData = new Float32Array(yinBufferLength);
//     for (var j = 0; j < yinBufferLength; j++) {
//       halfData[j] = float32AudioBuffer[(yinBufferLength-1)-j];
//     }
//     FFT.complex(kernel, halfData, false);

//     // 3. Convolution via complex multiplication

//   };

//   return function() {

//   };
// }