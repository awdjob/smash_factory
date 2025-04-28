#include <napi.h>
#include "processes.h"
#include "memory.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports = RegisterProcessFunctions(env, exports);
  exports = RegisterMemoryFunctions(env, exports);
  return exports;
}

NODE_API_MODULE(sf_native, Init)
