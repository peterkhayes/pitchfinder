#ifndef MACLEOD_H
#define MACLEOD_H

#include <nan.h>
#include <vector>

#define DEFAULT_MACLEOD_BUFFER_SIZE 1024
#define DEFAULT_MACLEOD_SAMPLE_RATE 44100
#define DEFAULT_MACLEOD_CUTOFF 0.97
#define DEFAULT_MACLEOD_LOWER_PITCH_CUTOFF 0.5

#define MACLEOD_SMALL_CUTOFF 0.5

class MacLeod : public Nan::ObjectWrap {
public:
  static void Init(v8::Local<v8::Object> exports);
  static v8::Local<v8::Object> NewInstance(v8::Local<v8::Value> arg);

private:

  void init(unsigned int bufferSize, double sampleRate, double cutoff, double freqCutoff);
  MacLeod();
  MacLeod(unsigned int bufferSize, double sampleRate, double cutoff, double freqCutoff);
  ~MacLeod();
  unsigned int bufferSize;
  double* nsdf;
  double sampleRate;
  double cutoff;
  double probability;
  double lowerPitchCutoff;
  double turningPointX;
  double turningPointY;
  std::vector<double> maxPositions;
  std::vector<double> periodEstimates;
  std::vector<double> ampEstimates;

  double normalizedSquareDifference(double* data, size_t dataSize);
  void parabolicInterpolation(unsigned int tau);
  void peakPicking();
  double calculatePitch (double* data, size_t dataSize);

  static Nan::Persistent<v8::Function> constructor;
  static void New(const Nan::FunctionCallbackInfo<v8::Value>& info);
  static void getPitch(const Nan::FunctionCallbackInfo<v8::Value>& info);
};

#endif
