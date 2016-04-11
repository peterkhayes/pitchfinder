# Pitchfinder

A compilation of pitch detection algorithms for Javascript. Supports both the browser and node.

## A note on versions

This library previous consisted of a single script tag to be included in the browser.  I'm deprecating that version and replacing it with a new, `npm`/`babel` version.  If you have been using the old version, please check out the `legacy` branch, which consists of the old code.  However, I will not be supporting it going forwards.  Version 2 is bringing many improvements, unit tests, and more.

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
const fs = require("fs"); // promise-based fs
const WavDecoder = require("wav-decoder");
const Pitchfinder = require("pitchfinder");

// see below for optional constructor parameters.
const detectPitch = new Pitchfinder.YIN();

const buffer = fs.readFileSync(PATH_TO_FILE);
const decoded = WavDecoder.decode(buffer); // get audio data from file using `wav-decoder`
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

## Configuration
*TODO*

## Thanks
These algorithms were ported from Jonas Six's excellent TarsosDSP library (written in Java).  If you're looking for a far deeper set of tools than this, check out his work [on his website](http://tarsos.0110.be/tag/TarsosDSP) or [on Github](https://github.com/JorenSix/TarsosDSP). 