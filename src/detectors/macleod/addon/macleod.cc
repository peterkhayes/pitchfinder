#include <nan.h>
#include <limits>
#include "macleod.h"

Nan::Persistent<v8::Function> MacLeod::constructor;

bool max(double a, double b) {
  if (b < a) return a;
  return b;
}

void MacLeod::Init(v8::Local<v8::Object> exports) {
  Nan::HandleScope scope;

  // Prepare constructor template
  v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("MacLeod").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  // Prototype
  Nan::SetPrototypeMethod(tpl, "getPitch", getPitch);

  constructor.Reset(tpl->GetFunction());
  exports->Set(Nan::New("MacLeod").ToLocalChecked(), tpl->GetFunction());
}

void MacLeod::New(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  if (info.IsConstructCall()) {
    // Invoked as constructor: `new MyObject(...)`
    unsigned int bufferSize = info[0]->IsUndefined() ? DEFAULT_MACLEOD_BUFFER_SIZE : info[0]->NumberValue();
    double sampleRate = info[1]->IsUndefined() ? DEFAULT_MACLEOD_SAMPLE_RATE : info[1]->NumberValue();
    double cutoff = info[2]->IsUndefined() ? DEFAULT_MACLEOD_CUTOFF : info[2]->NumberValue();
    double freqCutoff = info[3]->IsUndefined() ? DEFAULT_MACLEOD_LOWER_PITCH_CUTOFF : info[3]->NumberValue();
    MacLeod* obj = new MacLeod(bufferSize, sampleRate, cutoff, freqCutoff);
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

void MacLeod::init(unsigned int bufferSize, double sampleRate, double cutoff, double freqCutoff) {
  this->nsdf = new double[bufferSize];
  this->bufferSize = bufferSize;
  this->sampleRate = sampleRate;
  this->cutoff = cutoff;
  this->lowerPitchCutoff = freqCutoff;
}

MacLeod::MacLeod() {
  init(DEFAULT_MACLEOD_BUFFER_SIZE, DEFAULT_MACLEOD_SAMPLE_RATE, DEFAULT_MACLEOD_CUTOFF, DEFAULT_MACLEOD_LOWER_PITCH_CUTOFF);
};
MacLeod::MacLeod(unsigned int bufferSize, double sampleRate, double cutoff, double freqCutoff) {
  init(bufferSize, sampleRate, cutoff, freqCutoff);
};
MacLeod::~MacLeod() {
  delete[] nsdf;
};

void MacLeod::getPitch(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  MacLeod* obj = ObjectWrap::Unwrap<MacLeod>(info.Holder());
  assert(info[0]->IsFloat64Array());
  v8::Local<v8::Float64Array> input = info[0].As<v8::Float64Array>();
  assert(input->Length() <= obj->bufferSize);
  Nan::TypedArrayContents<double> inputData(input);
  info.GetReturnValue().Set(Nan::New(obj->calculatePitch((*inputData), input->Length())));
}

double MacLeod::normalizedSquareDifference(double* data, size_t dataSize) {
  for (size_t tau = 0; tau < dataSize; tau++) {
    double acf = 0;
    double divisorM = 0;
    for (size_t i = 0; i < dataSize - tau; i++) {
      acf += data[i] * data[i+tau];
      divisorM += data[i] * data[i] + data[i + tau] * data[i + tau];
    }
    nsdf[tau] = 2 * acf / divisorM;
  }
}

void MacLeod::parabolicInterpolation(unsigned int tau) {
  double nsdfa = nsdf[tau - 1];
  double nsdfb = nsdf[tau];
  double nsdfc = nsdf[tau + 1];
  double bValue = tau;
  double bottom = nsdfc + nsdfa - 2 * nsdfb;
  if (bottom == 0) {
    turningPointX = bValue;
    turningPointY = nsdfb;
  } else {
    double delta = nsdfa - nsdfc;
    turningPointX = bValue + delta / (2 * bottom);
    turningPointY = nsdfb - delta * delta / (8 * bottom);
  }
}

void MacLeod::peakPicking() {
  unsigned int pos = 0;
  unsigned int curMaxPos = 0;

  // find the first negative zero crossing.
  while (pos < (bufferSize - 1) / 3 && nsdf[pos] > 0) {
    pos++;
  }

  // loop over all the values below zero.
  while (pos < bufferSize - 1 && nsdf[pos] <= 0) {
    pos++;
  }

  // can happen if output[0] is NAN
  if (pos == 0) {
    pos = 1;
  }

  while (pos < bufferSize - 1) {
    if (nsdf[pos] > nsdf[pos - 1] && nsdf[pos] >= nsdf[pos + 1]) {
      if (curMaxPos == 0) {
        // the first max (between zero crossings)
        curMaxPos = pos;
      } else if (nsdf[pos] > nsdf[curMaxPos]) {
        // a higher max (between the zero crossings)
        curMaxPos = pos;
      }
    }
    pos++;
    // a negative zero crossing
    if (pos < bufferSize - 1 && nsdf[pos] <= 0) {
      // if there was a maximum add it to the list of maxima
      if (curMaxPos > 0) {
        maxPositions.push_back(curMaxPos);
        curMaxPos = 0; // clear the maximum position, so we start
        // looking for a new ones
      }
      while (pos < bufferSize - 1 && nsdf[pos] <= 0) {
        pos++; // loop over all the values below zero
      }
    }
  }
  if (curMaxPos > 0) {
    maxPositions.push_back(curMaxPos);
  }
}

double MacLeod::calculatePitch (double* data, size_t dataSize) {
  double pitch;
  maxPositions.clear();
  periodEstimates.clear();
  ampEstimates.clear();

  // 1. Calculute the normalized square difference for each Tau value.
  normalizedSquareDifference(data, dataSize);
  // 2. Peak picking time: time to pick some peaks.
  peakPicking();

  double highestAmplitude = - std::numeric_limits<double>::infinity();

  unsigned int tau;
  for (unsigned int i = 0; i < maxPositions.size(); i++) {
    tau = maxPositions[i];
    // make sure every annotation has a probability attached
    highestAmplitude = max(highestAmplitude, nsdf[tau]);

    if (nsdf[tau] > MACLEOD_SMALL_CUTOFF) {
      // calculates turningPointX and Y
      parabolicInterpolation(tau);
      // store the turning points
      ampEstimates.push_back(turningPointY);
      periodEstimates.push_back(turningPointX);
      // remember the highest amplitude
      highestAmplitude = max(highestAmplitude, turningPointY);
    }
  }

  if (periodEstimates.size() > 0) {
    // use the overall maximum to calculate a cutoff.
    // The cutoff value is based on the highest value and a relative
    // threshold.
    double actualCutoff = cutoff * highestAmplitude;
    unsigned int periodIndex = 0;

    for (unsigned int i = 0; i < ampEstimates.size(); i++) {
      if (ampEstimates[i] >= actualCutoff) {
        periodIndex = i;
        break;
      }
    }

    double period = periodEstimates[periodIndex];
    double pitchEstimate = sampleRate / period;

    if (pitchEstimate > lowerPitchCutoff) {
      pitch = pitchEstimate;
    } else {
      pitch = -1;
    }

  } else {
    // no pitch detected.
    pitch = -1;
  }

  probability = highestAmplitude;
  return pitch;
}
