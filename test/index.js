const fs = require("mz/fs");
const path = require("path");
const Pitchfinder = require("../src");
const WavDecoder = require("wav-decoder");

describe("Pitchfinder", () => {

  const detectors = [
    {name: "AMDF", detector: Pitchfinder.AMDF()},
    {name: "DynamicWavelet", detector: Pitchfinder.DynamicWavelet()},
    {name: "YIN", detector: Pitchfinder.YIN()},
    // {name: "MPM", detector: Pitchfinder.MPM()}
  ];

  const files = fs.readdirSync(path.resolve(__dirname, "./audio"));

  detectors.forEach(({name, detector}) => {

    describe(name, () => {
      files.forEach((fileName) => {
        const [hz, type] = fileName.replace(".wav", "").split("_");

        it(`Detects ${type} wave at ${hz} hz`, () => {
          return fs.readFile(path.resolve(__dirname, "audio", fileName))
            .then(WavDecoder.decode.bind(WavDecoder))
            .then((decoded) => {
              const float32arr = decoded.channelData[0]; 
              const pitch = detector(float32arr);
              if (pitch == null) throw new Error("No frequency detected");
              const diff = Math.abs(pitch - Number(hz));
              if (diff > 10) throw new Error(`Too large an error - detected wave at ${hz} as ${pitch} hz`);
            });
        });
      });
    });
  });

});