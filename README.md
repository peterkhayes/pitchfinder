[![Build Status](https://travis-ci.org/peterkhayes/pitchfinder.svg?branch=master)](https://travis-ci.org/cristovao-trevisan/node-pitchfinder)  
# node-pitchfinder
A compilation of pitch detection algorithms for Node (Using native C++ Addon).
Based on [pitchfinder](https://github.com/peterkhayes/pitchfinder)

## Provided pitch-finding algorithms
- **YIN** - The best balance of accuracy and speed, in my experience.  Occasionally provides values that are wildly incorrect.
- **AMDF** - Slow and only accurate to around +/- 2%, but finds a frequency more consistenly than others.
- **Dynamic Wavelet** - Very fast, but struggles to identify lower frequencies.
- **MacLeod** - Best results for instruments
- **MacLeod w/ FFT** *(coming soon)*
- **YIN w/ FFT** *(coming soon)*
- **Goertzel** *(coming soon)*

## Installation
`npm install --save node-pitchfinder`

## Usage

### Finding the pitch of a wav file in node
```javascript
const fs = require('fs')
const WavDecoder = require('wav-decoder')
const Pitchfinder = require('node-pitchfinder')

// see below for optional constructor parameters.
const detectPitch = new Pitchfinder.YIN()

const buffer = fs.readFileSync(PATH_TO_FILE)
const decoded = WavDecoder.decode(buffer) // get audio data from file using `wav-decoder`
const float64Array = decoded.channelData[0] // get a single channel of sound
const pitch = detectPitch(float64Array) // null if pitch cannot be identified
```

### Finding a series of pitches
Set a tempo and a quantization interval, and an array of pitches at each interval will be returned.

```javascript
const Pitchfinder = require('node-pitchfinder')
const detectPitch = Pitchfinder.YIN()

const frequencies = Pitchfinder.frequencies(detectPitch, float64Array, {
  tempo: 130, // in BPM, defaults to 120
  quantization: 4, // samples per beat, defaults to 4 (i.e. 16th notes)
})

// or use multiple detectors for better accuracy at the cost of speed.
const detectors = [detectPitch, Pitchfinder.AMDF()]
const moreAccurateFrequencies = Pitchfinder.frequencies(detectors, float64Array, {
  tempo: 130, // in BPM, defaults to 120
  quantization: 4, // samples per beat, defaults to 4 (i.e. 16th notes)
})
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

### MacLeod
- `bufferSize` - Maximum data size (default 1024)
- `cutoff` - Defines the relative size the chosen peak (pitch) has. 0.93 means: choose
the first peak that is higher than 93% of the highest peak detected. 93% is the default value used in the Tartini user interface.
- `freqCutoff` - Minimum frequency to be detected (default 80Hz)

### Dynamic Wavelet
*no special config*


## Todo
- Integrate with `teoria` or another music theory tool to add more intelligent parsing.
- Note-onsite algorithms.

## Thanks
Several of these algorithms were ported from Jonas Six's excellent TarsosDSP library (written in Java).  If you're looking for a far deeper set of tools than this, check out his work [on his website](http://tarsos.0110.be/tag/TarsosDSP) or [on Github](https://github.com/JorenSix/TarsosDSP).

Thanks to Aubio for his [YIN code](https://github.com/aubio/aubio/blob/master/src/pitch/pitchyin.c)
