import fs from 'mz/fs';
import expect from 'expect';
import Pitchfinder from '../src';
import { resolve } from 'path';
import WavDecoder from 'wav-decoder';
import { PitchDetector } from '../src/detectors/types';

const path = (...args: Array<string>): string => resolve(__dirname, ...args);
const decode = async (buffer: Buffer): Promise<Float32Array> => {
  const decoded: {
    sampleRate: number;
    channelData: Array<Float32Array>;
  } = await WavDecoder.decode(buffer);
  return decoded.channelData[0];
};
describe('Pitchfinder', () => {
  const detectors = {
    AMDF: Pitchfinder.AMDF(),
    DynamicWavelet: Pitchfinder.DynamicWavelet(),
    YIN: Pitchfinder.YIN(),
    Macleod: Pitchfinder.Macleod(),
    ACF2PLUS: Pitchfinder.ACF2PLUS(),
  };

  const pitchSamples = fs.readdirSync(path('pitches'));

  describe('Detectors', () => {
    Object.keys(detectors).forEach((name) => {
      const detector: PitchDetector = detectors[name];
      describe(name, () => {
        pitchSamples.forEach((fileName) => {
          const [hz, type] = fileName.replace('.wav', '').split('_');

          it(`Detects ${type} wave at ${hz} hz`, () => {
            return fs
              .readFile(path('pitches', fileName))
              .then(decode)
              .then(detector)
              .then((pitch) => {
                if (pitch == null) throw new Error('No frequency detected');
                const diff = Math.abs(pitch - Number(hz));
                if (diff > 10)
                  throw new Error(
                    `Too large an error - detected wave at ${hz} as ${pitch} hz`,
                  );
              });
          });
        });
      });
    });
  });

  describe('AMDF minimum/maximum frequency parameters', () => {
    const detector = (minFreq, maxFreq) =>
      Pitchfinder.AMDF({
        minFrequency: minFreq,
        maxFrequency: maxFreq,
      });
    pitchSamples.forEach((fileName) => {
      const [hzStr, type] = fileName.replace('.wav', '').split('_');
      const hz = Number(hzStr);
      const freqOffset = 100;
      const params = [
        { minFreq: hz, maxFreq: hz + freqOffset },
        { minFreq: hz - freqOffset, maxFreq: hz },
      ];

      params.forEach((freqs) => {
        const minFreq = freqs.minFreq;
        const maxFreq = freqs.maxFreq;
        it(`Detects ${type} wave at ${hzStr} hz with minimumFrequency ${minFreq} hz and maximumFrequency ${maxFreq} hz`, () => {
          return fs
            .readFile(path('pitches', fileName))
            .then(decode)
            .then(detector(minFreq, maxFreq))
            .then((pitch) => {
              if (pitch == null) throw new Error('No frequency detected');
              const diff = Math.abs(pitch - hz);
              if (diff > 10)
                throw new Error(
                  `Too large an error - detected wave at ${hzStr} as ${pitch} hz`,
                );
            });
        });
      });
    });
  });

  describe('Frequencies tool', () => {
    describe('C-major scale, electric piano, quarter notes, 120 bpm', () => {
      const sample = 'c_major_scale_electric_piano_120.wav';
      const round = (x: number | null): number | null =>
        x == null ? null : Number(x.toFixed(4));

      // The actual frequencies are: 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, and 523.25

      describe('16th-note quantization (default)', () => {
        it('AMDF slow and somewhat inaccurate, but gets all frequencies', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) => Pitchfinder.frequencies(detectors.AMDF, data))
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                260.9467,
                260.9467,
                260.9467,
                260.9467,
                294,
                294,
                294,
                294,
                329.1045,
                329.1045,
                329.1045,
                329.1045,
                350,
                350,
                350,
                350,
                393.75,
                393.75,
                393.75,
                393.75,
                441,
                441,
                441,
                441,
                495.5056,
                495.5056,
                495.5056,
                495.5056,
                525,
                525,
                525,
              ]);
            });
        });

        it('Dynamic Wavelet is fast and pretty accurate but misses the beginnings of low frequencies', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) => Pitchfinder.frequencies(detectors.DynamicWavelet, data))
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                null,
                null,
                261.542,
                261.6505,
                null,
                null,
                293.8493,
                293.6737,
                310.5634,
                330.3371,
                329.5516,
                329.7607,
                347.929,
                349.125,
                349.4058,
                349.2769,
                390.7595,
                392.1341,
                392.2812,
                392.3077,
                428.1553,
                440.4966,
                440.1996,
                440.3476,
                483.5526,
                493.9793,
                494.2516,
                494.2099,
                523.9604,
                523.1547,
                523.3227,
              ]);
            });
        });

        it('YIN is accurate but misses one frequency', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) => Pitchfinder.frequencies(detectors.YIN, data))
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                261.7419,
                261.7137,
                261.6266,
                261.6543,
                293.1462,
                293.6443,
                293.6985,
                293.582,
                329.0285,
                329.7834,
                329.6526,
                329.8027,
                349.3526,
                349.2973,
                349.3851,
                19018.1432,
                392.1011,
                391.9778,
                392.2077,
                392.2192,
                439.3881,
                440.3376,
                440.3561,
                440.4005,
                492.092,
                493.6956,
                494.2412,
                494.0726,
                523.069,
                522.9648,
                523.3838,
              ]);
            });
        });

        it('Average of multiple detectors is accurate', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) =>
              Pitchfinder.frequencies(
                [detectors.YIN, detectors.AMDF, detectors.DynamicWavelet],
                data,
              ),
            )
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                261.344,
                261.33,
                261.3716,
                261.417,
                293.5728,
                293.8221,
                293.8493,
                293.7518,
                322.7794,
                329.7413,
                329.4361,
                329.5558,
                349.0928,
                349.4739,
                349.5968,
                349.6382,
                392.2016,
                392.6198,
                392.7457,
                392.7583,
                436.1435,
                440.6113,
                440.5184,
                440.5826,
                490.3576,
                494.3929,
                494.6658,
                494.5956,
                524.0092,
                523.7057,
                523.9016,
              ]);
            });
        });
      });

      describe('quarter-note quantization', () => {
        it('AMDF slow and somewhat inaccurate, but gets all frequencies', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) =>
              Pitchfinder.frequencies(detectors.AMDF, data, { quantization: 1 }),
            )
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                260.9467,
                294,
                329.1045,
                350,
                393.75,
                441,
                495.5056,
                525,
              ]);
            });
        });

        it('Dynamic Wavelet misses the low frequencies and has accuracy issues', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) =>
              Pitchfinder.frequencies(detectors.DynamicWavelet, data, {
                quantization: 1,
              }),
            )
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                null,
                null,
                310.5634,
                346.9406,
                390.7595,
                428.1553,
                483.5526,
                523.9604,
              ]);
            });
        });

        it('YIN is good but slow', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) =>
              Pitchfinder.frequencies(detectors.YIN, data, { quantization: 1 }),
            )
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                261.6967,
                293.3619,
                329.4029,
                349.3471,
                392.2134,
                439.9719,
                493.0456,
                523.2901,
              ]);
            });
        });

        it('Average of multiple detectors is good but very slow', () => {
          return fs
            .readFile(path('melodies', sample))
            .then(decode)
            .then((data) =>
              Pitchfinder.frequencies(
                [detectors.YIN, detectors.AMDF, detectors.DynamicWavelet],
                data,
                { quantization: 1 },
              ),
            )
            .then((frequencies) => {
              expect(frequencies.map(round)).toEqual([
                261.3214,
                293.6808,
                322.9018,
                348.7601,
                392.2391,
                436.3366,
                490.6741,
                524.083,
              ]);
            });
        });
      });
    });
  });

  // xdescribe("Notes tool", () => {
  //   describe("C-major scale, electric piano, quarter notes, 120 bpm", () => {
  //     const sample = "c_major_scale_electric_piano_120.wav";
  //     const getMIDI = note => (note == null ? null : note.midi());

  //     describe("16th-note quantization (default)", () => {
  //       it("AMDF is slow but gets all notes", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data => Pitchfinder.notes(detectors.AMDF, data))
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               60,
  //               60,
  //               60,
  //               60,
  //               62,
  //               62,
  //               62,
  //               62,
  //               64,
  //               64,
  //               64,
  //               64,
  //               65,
  //               65,
  //               65,
  //               65,
  //               67,
  //               67,
  //               67,
  //               67,
  //               69,
  //               69,
  //               69,
  //               69,
  //               71,
  //               71,
  //               71,
  //               71,
  //               72,
  //               72,
  //               72
  //             ])
  //           );
  //       });

  //       it("Dynamic Wavelet is pretty accurate but misses the beginnings of low notes", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data => Pitchfinder.notes(detectors.DynamicWavelet, data))
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               null,
  //               null,
  //               60,
  //               60,
  //               null,
  //               null,
  //               62,
  //               62,
  //               63,
  //               64,
  //               64,
  //               64,
  //               65,
  //               65,
  //               65,
  //               65,
  //               67,
  //               67,
  //               67,
  //               67,
  //               69,
  //               69,
  //               69,
  //               69,
  //               71,
  //               71,
  //               71,
  //               71,
  //               72,
  //               72,
  //               72
  //             ])
  //           );
  //       });

  //       it("YIN misses one note", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data => Pitchfinder.notes(detectors.YIN, data))
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               60,
  //               60,
  //               60,
  //               60,
  //               62,
  //               62,
  //               62,
  //               62,
  //               64,
  //               64,
  //               64,
  //               64,
  //               65,
  //               65,
  //               65,
  //               134,
  //               67,
  //               67,
  //               67,
  //               67,
  //               69,
  //               69,
  //               69,
  //               69,
  //               71,
  //               71,
  //               71,
  //               71,
  //               72,
  //               72,
  //               72
  //             ])
  //           );
  //       });

  //       it("Average of multiple detectors gets all notes", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data =>
  //             Pitchfinder.notes(
  //               [detectors.YIN, detectors.AMDF, detectors.DynamicWavelet],
  //               data
  //             )
  //           )
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               60,
  //               60,
  //               60,
  //               60,
  //               62,
  //               62,
  //               62,
  //               62,
  //               64,
  //               64,
  //               64,
  //               64,
  //               65,
  //               65,
  //               65,
  //               65,
  //               67,
  //               67,
  //               67,
  //               67,
  //               69,
  //               69,
  //               69,
  //               69,
  //               71,
  //               71,
  //               71,
  //               71,
  //               72,
  //               72,
  //               72
  //             ])
  //           );
  //       });
  //     });

  //     describe("quarter-note quantization", () => {
  //       it("AMDF slow but gets all notes", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data =>
  //             Pitchfinder.notes(detectors.AMDF, data, { quantization: 1 })
  //           )
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               60,
  //               62,
  //               64,
  //               65,
  //               67,
  //               69,
  //               71,
  //               72
  //             ])
  //           );
  //       });

  //       it("Dynamic Wavelet misses the low notes", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data =>
  //             Pitchfinder.notes(detectors.DynamicWavelet, data, {
  //               quantization: 1
  //             })
  //           )
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               null,
  //               null,
  //               63,
  //               65,
  //               67,
  //               69,
  //               71,
  //               72
  //             ])
  //           );
  //       });

  //       it("YIN is slow but gets all notes", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data =>
  //             Pitchfinder.notes(detectors.YIN, data, { quantization: 1 })
  //           )
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               60,
  //               62,
  //               64,
  //               65,
  //               67,
  //               69,
  //               71,
  //               72
  //             ])
  //           );
  //       });

  //       it("Average of multiple detectors gets all notes but is very slow", () => {
  //         return fs
  //           .readFile(path("melodies", sample))
  //           .then(decode)
  //           .then(data =>
  //             Pitchfinder.notes(
  //               [detectors.YIN, detectors.AMDF, detectors.DynamicWavelet],
  //               data,
  //               { quantization: 1 }
  //             )
  //           )
  //           .then(notes =>
  //             expect(notes.map(getMIDI)).toEqual([
  //               60,
  //               62,
  //               64,
  //               65,
  //               67,
  //               69,
  //               71,
  //               72
  //             ])
  //           );
  //       });
  //     });
  //   });
  // });

  // describe('Harmony tool', () => {});
});
