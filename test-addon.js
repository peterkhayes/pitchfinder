const Pitchfinder = require('./index')

let sine = []
let fs = 47000
let f = 440
let bufferSize = 2048

for (let i = 0; i < bufferSize; i++) {
  sine.push(100 * Math.sin(2 * Math.PI * f / fs * i))
}

let yinJs = new Pitchfinder.YIN({ sampleRate: fs })
console.time('JS')
let pitch
for (let i = 0; i < 1000; i++) {
  pitch = yinJs(sine)
}
console.timeEnd('JS')
console.log(pitch, 440 - pitch)

let macLeod = new Pitchfinder.MACLEOD({ bufferSize, sampleRate: fs })
console.time('Addon')
for (let i = 0; i < 1000; i++) {
  pitch = macLeod(Float64Array.from(sine))
}
console.timeEnd('Addon')
console.log(pitch, 440 - pitch)
