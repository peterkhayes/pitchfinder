const DEFAULT_TEMPO = 120;
const DEFAULT_QUANTIZATION = 4;
const DEFAULT_SAMPLE_RATE = 44100;

function pitchConsensus (detectors, chunk) {
  const pitches = detectors
    .map((fn) => fn(chunk))
    .filter(Boolean)
    .sort((a, b) => a < b ? -1 : 1);
  
  // In the case of one pitch, return it.
  if (pitches.length === 1) {
    return pitches[0];

  // In the case of two pitches, return the geometric mean if they
  // are close to each other, and the lower pitch otherwise.
  } else if (pitches.length === 2) {
    const [first, second] = pitches;
    return first * 2 > second ? Math.sqrt(first * second) : first;
  
  // In the case of three or more pitches, filter away the extremes
  // if they are very extreme, then take the geometric mean. 
  } else {
    const first = pitches[0];
    const second = pitches[1];
    const secondToLast = pitches[pitches.length - 2];
    const last = pitches[pitches.length - 1];

    const filtered1 = first * 2 > second ? pitches : pitches.slice(1);
    const filtered2 = secondToLast * 2 > last ? filtered1 : filtered1.slice(0, -1);
    return Math.pow(filtered2.reduce((t, p) => t * p, 1), 1 / filtered2.length);
  }

}

module.exports = function(detector, float32AudioBuffer, options = {}) {

  const tempo = options.tempo || DEFAULT_TEMPO;
  const quantization = options.quantization || DEFAULT_QUANTIZATION;
  const sampleRate = options.sampleRate || DEFAULT_SAMPLE_RATE;

  const bufferLength = float32AudioBuffer.length;
  const chunkSize = Math.round((sampleRate * 60) / (quantization * tempo));

  let getPitch;
  if (Array.isArray(detector)) {
    getPitch = pitchConsensus.bind(null, detector);
  } else {
    getPitch = detector;
  }

  const pitches = [];
  for (let i = 0, max = bufferLength - chunkSize; i <= max; i += chunkSize) {
    const chunk = float32AudioBuffer.slice(i, i + chunkSize);
    const pitch = getPitch(chunk);
    pitches.push(pitch);
  }

  return pitches;
};