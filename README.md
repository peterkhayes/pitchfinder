pitchfinder.js
==============

A compilation of pitch-finding algorithms for Javascript.  Throw out your old FFTs and zero-crossings, and make way for YIN, McLeod Pitch Method, Dynamic Wavelet, and more!  Used in app Tunesmith.

How to use
==========

* Include pitchfinder.js in your project.
* Call its generator functions to return pitch detector functions.
* Pass config objects to set properties of the function you want, including sample rate, buffer size, and more.
* Call your functions with Float32Arrays as inputs - NOT audioBuffer objects (support for that coming soon).  Conversion from audioBuffer to Float32Array is relatively trivial, like this: floatArray = buffer.getChannelData(0)
* ???
* Profit!
* Send me your app!

Thanks
=======
These algorithms were ported from Jonas Six's excellent TarsosDSP library (written in Java).  If you're looking for a far deeper set of tools than this, check out his work.
 
