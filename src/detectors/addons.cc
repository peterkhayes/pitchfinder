#include <nan.h>
#include "yin-addon/yin.h"

void InitAll(v8::Local<v8::Object> exports) {
  Yin::Init(exports);
}

NODE_MODULE(addon, InitAll)
