#include <napi.h>
#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <string>
#include <vector>
#include "processes.h"

Napi::Array List(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array processes = Napi::Array::New(env);

  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snapshot == INVALID_HANDLE_VALUE) {
    return processes;
  }

  PROCESSENTRY32 processEntry;
  processEntry.dwSize = sizeof(PROCESSENTRY32);

  int index = 0;
  if (Process32First(snapshot, &processEntry)) {
    do {
      Napi::Object process = Napi::Object::New(env);
      process.Set("pid", Napi::Number::New(env, processEntry.th32ProcessID));
      process.Set("name", Napi::String::New(env, processEntry.szExeFile));
      
      processes[index++] = process;
    } while (Process32Next(snapshot, &processEntry));
  }

  CloseHandle(snapshot);
  return processes;
}

Napi::Object RegisterProcessFunctions(Napi::Env env, Napi::Object exports) {
  exports.Set("listProcesses", Napi::Function::New(env, List));
  return exports;
}