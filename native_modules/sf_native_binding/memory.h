#pragma once
#include <napi.h>
#include <windows.h>

// Function to register all memory functions
Napi::Object RegisterMemoryFunctions(Napi::Env env, Napi::Object exports);
