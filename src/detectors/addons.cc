#include <nan.h>
#include "yin/addon/yin.h"
#include "macleod/addon/macleod.h"

void InitAll(v8::Local<v8::Object> exports) {
  Yin::Init(exports);
  MacLeod::Init(exports);
}

NODE_MODULE(addon, InitAll)
