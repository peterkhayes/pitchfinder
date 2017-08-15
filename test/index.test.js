const fs = require('mz/fs')
const Pitchfinder = require('../src')

const path = (...args) => require('path').resolve(__dirname, ...args)
const decode = (file) => require('wav-decoder').decode(file).then((decoded) => decoded.channelData[0])

const expectedAMDF = [260.9467, 260.9467, 260.9467, 260.9467, 294, 294, 294, 294, 329.1044, 329.1044, 329.1044, 329.1044, 350, 350, 350, 350, 393.75, 393.75, 393.75, 393.75, 441, 441, 441, 441, 495.5056, 495.5056, 495.5056, 495.5056, 525, 525, 525]

const detectors = {
  AMDF: Pitchfinder.AMDF(),
  DynamicWavelet: Pitchfinder.DynamicWavelet(),
  YIN: Pitchfinder.YIN(),
  MacLeod: Pitchfinder.MacLeod({bufferSize: 16759})
}

const pitchSamples = fs.readdirSync(path('pitches'))

describe('Detectors', () => {
  Object.keys(detectors).forEach((name) => {
    const detector = detectors[name]
    describe(name, () => {
      pitchSamples.forEach((fileName) => {
        const [hz, type] = fileName.replace('.wav', '').spltest('_')

        test(`Detects ${type} wave at ${hz} hz`, () => {
          return fs.readFile(path('pitches', fileName))
            .then(decode)
            .then(detector)
            .then((pitch) => {
              if (pitch == null) throw new Error('No frequency detected')
              const diff = Math.abs(pitch - Number(hz))
              if (diff > 10) throw new Error(`Too large an error - detected wave at ${hz} as ${pitch} hz`)
            })
        })
      })
    })
  })
})

describe('Frequencies tool', () => {
  describe('C-major scale, electric piano, quarter notes, 120 bpm', () => {
    const sample = 'c_major_scale_electric_piano_120.wav'

    // The actual frequencies are: 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, and 523.25

    describe('16th-note quantization (default)', () => {
      test('AMDF slow and somewhat inaccurate, but gets all frequencies', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.AMDF, data))
          .then((frequencies) => {
            expectedAMDF.forEach((value, i) => {
              expect(value).toBeCloseTo(frequencies[i])
            })
          })
      })

      test('Dynamic Wavelet is fast and pretty accurate but misses the beginnings of low frequencies', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.DynamicWavelet, data))
          .then((frequencies) => expect(frequencies).toEqual([null, null, 261.5419, 261.6504, null, null, 293.8493, 293.6736, 310.5633, 330.3370, 329.5516, 329.7607, 347.9289, 349.125, 349.4057, 349.2768, 390.7594, 392.1340, 392.2812, 392.3076, 428.1553, 440.4965, 440.1996, 440.3476, 483.5526, 493.9792, 494.2516, 494.2099, 523.9603, 523.1546, 523.3226]))
      })

      test('YIN is accurate but misses one frequency', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.YIN, data))
          .then((frequencies) => expect(frequencies).toEqual([261.7419302955377, 261.7137455047282, 261.6266205000512, 261.65433194069925, 293.14615190240534, 293.6443330040375, 293.6985297578121, 293.5820039861225, 329.0284798152372, 329.7834233903462, 329.65257484615125, 329.80268424989015, 349.35256877998967, 349.2973273779877, 349.3851205233371, 19018.143159177806, 392.1011206584966, 391.9778193277052, 392.2076889218426, 392.21915047332595, 439.3880734132198, 440.3375974897653, 440.3560913531936, 440.4005199413173, 492.0920270151567, 493.6956411818632, 494.2411681286806, 494.07255438581495, 523.0690363524179, 522.9648041624112, 523.383777234472]))
      })

      test('Average of multiple detectors is accurate', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies([detectors.YIN, detectors.AMDF, detectors.DynamicWavelet], data))
          .then((frequencies) => expect(frequencies).toEqual([261.34403549300777, 261.3299641417616, 261.3716037868573, 261.41697586476863, 293.57276552723204, 293.8221126858682, 293.8492534942457, 293.7518452017881, 322.7794240858381, 329.7412745496943, 329.4361415079014, 329.5558047578726, 349.0927817470265, 349.4739042921809, 349.5968481217927, 349.63824279738947, 392.201631721436, 392.6198108394992, 392.74565615958517, 392.7583212679446, 436.1435018066006, 440.6113004988913, 440.51844000600835, 440.5826183905655, 490.3575737303981, 494.3928736993009, 494.66578168780325, 494.59561516742747, 524.0092167246662, 523.7056833405835, 523.901578313843]))
      })
    })

    describe('quarter-note quantization', () => {
      test('AMDF slow and somewhat inaccurate, but gets all frequencies', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.AMDF, data, {quantization: 1}))
          .then((frequencies) => expect(frequencies).toEqual([260.94674556213016, 294, 329.1044776119403, 350, 393.75, 441, 495.5056179775281, 525]))
      })

      test('Dynamic Wavelet misses the low frequencies and has accuracy issues', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.DynamicWavelet, data, {quantization: 1}))
          .then((frequencies) => expect(frequencies).toEqual([null, null, 310.5633802816901, 346.9405594405594, 390.75949367088606, 428.15533980582524, 483.55263157894734, 523.9603960396039]))
      })

      test('YIN is good but slow', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.YIN, data, {quantization: 1}))
          .then((frequencies) => expect(frequencies).toEqual([261.6966565733752, 293.3618507967704, 329.40285864214104, 349.3471287425144, 392.2133911815867, 439.9718747496486, 493.0455961889455, 523.2900882847541]))
      })

      test('Average of multiple detectors is good but very slow', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies([detectors.YIN, detectors.AMDF, detectors.DynamicWavelet], data, {quantization: 1}))
          .then((frequencies) => expect(frequencies).toEqual([261.32143206655036, 293.68075206633904, 322.9018005020524, 348.76007762751016, 392.23906125008307, 436.3365797777694, 490.67410541944446, 524.0830227479873]))
      })
    })
  })
})

xdescribe('Notes tool', () => {
  describe('C-major scale, electric piano, quarter notes, 120 bpm', () => {
    const sample = 'c_major_scale_electric_piano_120.wav'
    const getMIDI = (note) => note == null ? null : note.midi()

    describe('16th-note quantization (default)', () => {
      test('AMDF is slow but gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.AMDF, data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 60, 60, 60, 62, 62, 62, 62, 64, 64, 64, 64, 65, 65, 65, 65, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })

      test('Dynamic Wavelet is pretty accurate but misses the beginnings of low notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.DynamicWavelet, data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([null, null, 60, 60, null, null, 62, 62, 63, 64, 64, 64, 65, 65, 65, 65, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })

      test('YIN misses one note', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.YIN, data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 60, 60, 60, 62, 62, 62, 62, 64, 64, 64, 64, 65, 65, 65, 134, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })

      test('Average of multiple detectors gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes([detectors.YIN, detectors.AMDF, detectors.DynamicWavelet], data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 60, 60, 60, 62, 62, 62, 62, 64, 64, 64, 64, 65, 65, 65, 65, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })
    })

    describe('quarter-note quantization', () => {
      test('AMDF slow but gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.AMDF, data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]))
      })

      test('Dynamic Wavelet misses the low notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.DynamicWavelet, data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([null, null, 63, 65, 67, 69, 71, 72]))
      })

      test('YIN is slow but gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.YIN, data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]))
      })

      test('Average of multiple detectors gets all notes but is very slow', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes([detectors.YIN, detectors.AMDF, detectors.DynamicWavelet], data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]))
      })
    })
  })
})

describe('Harmony tool', () => {

})
