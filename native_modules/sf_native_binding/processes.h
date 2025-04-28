#pragma once
#include <napi.h>
#include <windows.h>

// Function declarations
Napi::Array List(const Napi::CallbackInfo& info);

// Function to register all process-related functions
Napi::Object RegisterProcessFunctions(Napi::Env env, Napi::Object exports);
