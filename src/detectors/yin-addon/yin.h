#ifndef YIN_H
#define YIN_H

#include <nan.h>

#define DEFAULT_YIN_THRESHOLD 0.10
#define DEFAULT_YIN_SAMPLE_RATE 44100
#define DEFAULT_YIN_PROBABILITY_THRESHOLD 0.1

class Yin : public Nan::ObjectWrap {
public:
  static void Init(v8::Local<v8::Object> exports);
  static v8::Local<v8::Object> NewInstance(v8::Local<v8::Value> arg);

private:

  void init(double sampleRate, double threshold, double probabilityThreshold);
  Yin();
  Yin(double sampleRate, double threshold, double probabilityThreshold);
  ~Yin();
  double threshold;
  double sampleRate;
  double probabilityThreshold;

  double calculatePitch (double* data, size_t dataSize);

  static Nan::Persistent<v8::Function> constructor;
  static void New(const Nan::FunctionCallbackInfo<v8::Value>& info);
  static void getPitch(const Nan::FunctionCallbackInfo<v8::Value>& info);
};

#endif
