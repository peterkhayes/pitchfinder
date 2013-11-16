pitchfinder.js
==============

A compilation of pitch detection algorithms for Javascript.  Throw out your old FFTs and zero-crossings, and make way for YIN, McLeod Pitch Method, Dynamic Wavelet, and more!  Used in my app [Tunesmith](https://github.com/peterkhayes/Tunesmith "Tunesmith").

How to use
==========

* Include pitchfinder.js in your project.
* Call its generator functions to return pitch detector functions.
* Pass config objects to set properties of the function you want, including sample rate, buffer size, and more.
* Call your functions with Float32Arrays as inputs - NOT audioBuffer objects (support for that coming soon).  Conversion from audioBuffer to Float32Array is relatively trivial, like this: 
    floatArray = buffer.getChannelData(0)
* Extract the pitch from the returned object's 'freq' key.  Some methods provide other info, such as probability.
* ???
* Profit!
* Send me your app to check out!

Code examples
========

Making a pitch detector with default settings:
---------
    var YINDetector = PITCHFINDER.YIN();
    var estimate = YINDetector(float32Array);
    console.log(estimate.freq);

Making a pitch detector with custom settings:
---------
    var McLeod = PITCHFINDER.MPM({
      samplerate: 48000,
      bufferSize: 3456,
      etc, etc.
    })
<em>(full list of parameters coming soon)</em>



Thanks
=======
These algorithms were ported from Jonas Six's excellent TarsosDSP library (written in Java).  If you're looking for a far deeper set of tools than this, check out his work.
 
