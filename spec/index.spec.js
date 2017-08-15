const fs = require('mz/fs')
const Pitchfinder = require('../src')

const resolve = require('path').resolve
const path = resolve.bind(null, __dirname)
const decode = (file) => require('wav-decoder').decode(file).then((decoded) => decoded.channelData[0])

const { expectedAMDF, expectedDynamicWavelet, expectedYIN } = require('./constants')

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
        const [hz, type] = fileName.replace('.wav', '').split('_')

        it(`Detects ${type} wave at ${hz} hz`, () => {
          return fs.readFile(path('pitches', fileName))
            .then(decode)
            .then(detector)
            .then(pitch => {
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
      it('AMDF slow and somewhat inaccurate, but gets all frequencies', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then(data => Pitchfinder.frequencies(detectors.AMDF, data))
          .then(frequencies => {
            expectedAMDF.forEach((value, i) => {
              if (value) expect(value).toBeCloseTo(frequencies[i])
            })
          })
      })

      it('Dynamic Wavelet is fast and pretty accurate but misses the beginnings of low frequencies', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then(data => Pitchfinder.frequencies(detectors.DynamicWavelet, data))
          .then(frequencies => {
            expectedDynamicWavelet.forEach((value, i) => {
              if (value) expect(value).toBeCloseTo(frequencies[i])
            })
          }).catch(console.error)
      })

      it('YIN is accurate but misses one frequency', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then(data => Pitchfinder.frequencies(detectors.YIN, data))
          .then(frequencies => {
            expectedYIN.forEach((value, i) => {
              if (value) expect(value).toBeCloseTo(frequencies[i])
            })
          })
      })
    })

    describe('quarter-note quantization', () => {
      it('AMDF slow and somewhat inaccurate, but gets all frequencies', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.AMDF, data, {quantization: 1}))
          .then((frequencies) => expect(frequencies).toEqual([260.94674556213016, 294, 329.1044776119403, 350, 393.75, 441, 495.5056179775281, 525]))
      })

      it('Dynamic Wavelet misses the low frequencies and has accuracy issues', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.DynamicWavelet, data, {quantization: 1}))
          .then((frequencies) => expect(frequencies).toEqual([null, null, 310.5633802816901, 346.9405594405594, 390.75949367088606, 428.15533980582524, 483.55263157894734, 523.9603960396039]))
      })

      it('YIN is good but slow', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.frequencies(detectors.YIN, data, {quantization: 1}))
          .then(frequencies => {
            const expected = [261.6966565733752, 293.3618507967704, 329.40285864214104, 349.3471287425144, 392.2133911815867, 439.9718747496486, 493.0455961889455, 523.2900882847541]
            expected.forEach((value, i) => {
              expect(value).toBeCloseTo(frequencies[i])
            })
          })
      })
    })
  })
})

xdescribe('Notes tool', () => {
  describe('C-major scale, electric piano, quarter notes, 120 bpm', () => {
    const sample = 'c_major_scale_electric_piano_120.wav'
    const getMIDI = (note) => note == null ? null : note.midi()

    describe('16th-note quantization (default)', () => {
      it('AMDF is slow but gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.AMDF, data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 60, 60, 60, 62, 62, 62, 62, 64, 64, 64, 64, 65, 65, 65, 65, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })

      it('Dynamic Wavelet is pretty accurate but misses the beginnings of low notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.DynamicWavelet, data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([null, null, 60, 60, null, null, 62, 62, 63, 64, 64, 64, 65, 65, 65, 65, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })

      it('YIN misses one note', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.YIN, data))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 60, 60, 60, 62, 62, 62, 62, 64, 64, 64, 64, 65, 65, 65, 134, 67, 67, 67, 67, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72]))
      })
    })

    describe('quarter-note quantization', () => {
      it('AMDF slow but gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.AMDF, data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]))
      })

      it('Dynamic Wavelet misses the low notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.DynamicWavelet, data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([null, null, 63, 65, 67, 69, 71, 72]))
      })

      it('YIN is slow but gets all notes', () => {
        return fs.readFile(path('melodies', sample))
          .then(decode)
          .then((data) => Pitchfinder.notes(detectors.YIN, data, {quantization: 1}))
          .then((notes) => expect(notes.map(getMIDI)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]))
      })
    })
  })
})
