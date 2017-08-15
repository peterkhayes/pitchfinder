#include <nan.h>
#include "yin.h"

Nan::Persistent<v8::Function> Yin::constructor;

void Yin::Init(v8::Local<v8::Object> exports) {
  Nan::HandleScope scope;

  // Prepare constructor template
  v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("Yin").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  Nan::SetPrototypeMethod(tpl, "getPitch", getPitch);

  constructor.Reset(tpl->GetFunction());
  exports->Set(Nan::New("Yin").ToLocalChecked(), tpl->GetFunction());
}

void Yin::New(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  if (info.IsConstructCall()) {
    // Invoked as constructor: `new MyObject(...)`
    double sampleRate = info[0]->IsUndefined() ? DEFAULT_YIN_SAMPLE_RATE : info[0]->NumberValue();
    double threshold = info[1]->IsUndefined() ? DEFAULT_YIN_THRESHOLD : info[1]->NumberValue();
    double probabilityThreshold = info[2]->IsUndefined() ? DEFAULT_YIN_PROBABILITY_THRESHOLD : info[2]->NumberValue();
    Yin* obj = new Yin(sampleRate, threshold, probabilityThreshold);
    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  } else {
    // Invoked as plain function `MyObject(...)`, turn into construct call.
    const int argc = 1;
    v8::Local<v8::Value> argv[argc] = { info[0] };
    v8::Local<v8::Function> cons = Nan::New<v8::Function>(constructor);
    info.GetReturnValue().Set(cons->NewInstance(argc, argv));
  }
}

void Yin::init(double sampleRate, double threshold, double probabilityThreshold) {
  this->sampleRate = sampleRate;
  this->threshold = threshold;
  this->probabilityThreshold = probabilityThreshold;
}

Yin::Yin() {
  init(DEFAULT_YIN_SAMPLE_RATE, DEFAULT_YIN_THRESHOLD, DEFAULT_YIN_PROBABILITY_THRESHOLD);
};
Yin::Yin(double sampleRate, double threshold, double probabilityThreshold) {
  init(sampleRate, threshold, probabilityThreshold);
};
Yin::~Yin() {};

void Yin::getPitch(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  Yin* obj = ObjectWrap::Unwrap<Yin>(info.Holder());
  assert(info[0]->IsFloat64Array());
  v8::Local<v8::Float64Array> input = info[0].As<v8::Float64Array>();
  Nan::TypedArrayContents<double> inputData(input);
  info.GetReturnValue().Set(Nan::New(obj->calculatePitch((*inputData), input->Length())));
}

double Yin::calculatePitch (double* data, size_t dataSize) {
  unsigned int bufferSize;
  for (bufferSize = 1; bufferSize < dataSize; bufferSize *= 2);
  bufferSize /= 4;

  // Set up the buffer as described in step one of the YIN paper.
  double buffer[bufferSize];

  double probability = 0;
  long tau;
  unsigned int i, t;
  // Compute the difference function as described in step 2 of the YIN paper.
  for (t = 0; t < bufferSize; t++) {
    buffer[t] = 0;
  }
  for (t = 1; t < bufferSize; t++) {
    for (i = 0; i < bufferSize; i++) {
      double delta = data[i] - data[i + t];
      buffer[t] += delta * delta;
    }
  }

  // Compute the cumulative mean normalized difference as described in step 3 of the paper.
  buffer[0] = 1;
  buffer[1] = 1;
  double runningSum = 0;
  for (t = 1; t < bufferSize; t++) {
    runningSum += buffer[t];
    buffer[t] *= t / runningSum;
  }

  // Compute the absolute threshold as described in step 4 of the paper.
  // Since the first two positions in the array are 1,
  // we can start at the third position.
  for (tau = 2; tau < bufferSize; tau++) {
    if (buffer[tau] < threshold) {
      while (tau + 1 < bufferSize && buffer[tau + 1] < buffer[tau]) {
        tau++;
      }
      // found tau, exit loop and return
      // store the probability
      // From the YIN paper: The threshold determines the list of
      // candidates admitted to the set, and can be interpreted as the
      // proportion of aperiodic power tolerated
      // within a periodic signal.
      //
      // Since we want the periodicity and and not aperiodicity:
      // periodicity = 1 - aperiodicity
      probability = 1 - buffer[tau];
      break;
    }
  }

  // if no pitch found, return -1
  if (tau == bufferSize || buffer[tau] >= threshold) {
    return -1;
  }

  // If probability too low, return -1.
  if (probability < probabilityThreshold) {
    return -1;
  }

  /**
   * Implements step 5 of the AUBIO_YIN paper. It refines the estimated tau
   * value using parabolic interpolation. This is needed to detect higher
   * frequencies more precisely. See http://fizyka.umk.pl/nrbook/c10-2.pdf and
   * for more background
   * http://fedc.wiwi.hu-berlin.de/xplore/tutorials/xegbohtmlnode62.html
   */
  double betterTau;
  long x0, x2;
  if (tau < 1) {
    x0 = tau;
  } else {
    x0 = tau - 1;
  }
  if (tau + 1 < bufferSize) {
    x2 = tau + 1;
  } else {
    x2 = tau;
  }
  if (x0 == tau) {
    if (buffer[tau] <= buffer[x2]) {
      betterTau = tau;
    } else {
      betterTau = x2;
    }
  } else if (x2 == tau) {
    if (buffer[tau] <= buffer[x0]) {
      betterTau = tau;
    } else {
      betterTau = x0;
    }
  } else {
    double s0 = buffer[x0];
    double s1 = buffer[tau];
    double s2 = buffer[x2];
    // fixed AUBIO implementation, thanks to Karl Helgason:
    // (2.0f * s1 - s2 - s0) was incorrectly multiplied with -1
    betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  return sampleRate / betterTau;
}
