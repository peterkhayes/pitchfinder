[![Build Status](https://travis-ci.org/peterkhayes/pitchfinder.svg?branch=master)](https://travis-ci.org/peterkhayes/pitchfinder)
# pitchfinder
A compilation of pitch detection algorithms for Javascript. Supports both the browser and node.

## A note on versions

This library previous consisted of a single script tag to be included in the browser.  I'm deprecating that version and replacing it with a new, `npm`/`babel` version.  If you have been using the old version, please check out the `legacy` branch, which consists of the old code.  However, I will not be supporting it going forwards.  Version 2 is bringing many improvements, unit tests, and more.

If you'd like a version that uses compiled C++ code and runs much faster, check out [this repo](https://github.com/cristovao-trevisan/node-pitchfinder). However, it will not work in the browser.

## Provided pitch-finding algorithms
- **YIN** - The best balance of accuracy and speed, in my experience.  Occasionally provides values that are wildly incorrect.
- **AMDF** - Slow and only accurate to around +/- 2%, but finds a frequency more consistenly than others.
- **Dynamic Wavelet** - Very fast, but struggles to identify lower frequencies.
- **YIN w/ FFT** *(coming soon)*
- **Goertzel** *(coming soon)*
- **MacLeod** *(coming soon)*

## Installation
`npm install --save pitchfinder`

## Usage

### Finding the pitch of a wav file in node
All pitchfinding algorithms provided operate on `Float32Array`s. To find the pitch of a `wav` file, we can use the `wav-decoder` library to extract the data into such an array.
```javascript
const fs = require("fs");
const WavDecoder = require("wav-decoder");
const Pitchfinder = require("pitchfinder");

// see below for optional constructor parameters.
const detectPitch = new Pitchfinder.YIN();

const buffer = fs.readFileSync(PATH_TO_FILE);
const decoded = WavDecoder.decode.sync(buffer); // get audio data from file using `wav-decoder`
const float32Array = decoded.channelData[0]; // get a single channel of sound
const pitch = detectPitch(float32Array); // null if pitch cannot be identified
```

### Finding the pitch of a WebAudio AudioBuffer in the browser
This assumes you are using an npm-compatible build system, like Webpack or Browserify, and that your target browser supports WebAudio.  Ample documentation on WebAudio is available online, especially on Mozilla's MDN.
```javascript
const Pitchfinder = require("pitchfinder");
const detectPitch = Pitchfinder.AMDF();

const myAudioBuffer = getAudioBuffer(); // assume this returns a WebAudio AudioBuffer object
const float32Array = myAudioBuffer.getChannelData(0); // get a single channel of sound
const pitch = detectPitch(float32Array); // null if pitch cannot be identified
```

### Finding a series of pitches
Set a tempo and a quantization interval, and an array of pitches at each interval will be returned.

```javascript
const Pitchfinder = require("pitchfinder");
const detectPitch = Pitchfinder.YIN();

const frequencies = Pitchfinder.frequencies(detectPitch, float32Array, {
  tempo: 130, // in BPM, defaults to 120
  quantization: 4, // samples per beat, defaults to 4 (i.e. 16th notes)
});

// or use multiple detectors for better accuracy at the cost of speed.
const detectors = [detectPitch, Pitchfinder.AMDF()];
const moreAccurateFrequencies = Pitchfinder.frequencies(detectors, float32Array, {
  tempo: 130, // in BPM, defaults to 120
  quantization: 4, // samples per beat, defaults to 4 (i.e. 16th notes)
});
```


## Configuration

### All detectors
- `sampleRate` - defaults to 44100

### YIN
- `threshold` - used by the algorithm
- `probabilityThreshold` - don't return a pitch if probability estimate is below this number.

### AMDF
- `minFrequency` - Lowest frequency detectable
- `maxFrequency` - Highest frequency detectable
- `sensitivity`
- `ratio`

### Dynamic Wavelet
*no special config*


## Todo
- Integrate with `teoria` or another music theory tool to add more intelligent parsing.
- Note-onsite algorithms.
- Enable requiring of single detectors.

## Thanks
Several of these algorithms were ported from Jonas Six's excellent TarsosDSP library (written in Java).  If you're looking for a far deeper set of tools than this, check out his work [on his website](https://0110.be/tags/TarsosDSP) or [on Github](https://github.com/JorenSix/TarsosDSP).

Thanks to Aubio for his [YIN code](https://github.com/aubio/aubio/blob/master/src/pitch/pitchyin.c)
