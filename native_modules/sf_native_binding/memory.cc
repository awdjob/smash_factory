#include "memory.h"
#include <tlhelp32.h>
#include <psapi.h>
#include <iostream>
#include <sstream>
#include <iomanip>

// Helper function to get the last error message
std::string GetLastErrorAsString() {
  DWORD error = GetLastError();
  if (error == 0) {
    return "No error";
  }
  
  LPSTR messageBuffer = nullptr;
  size_t size = FormatMessageA(
    FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
    NULL,
    error,
    MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
    (LPSTR)&messageBuffer,
    0,
    NULL
  );
  
  std::string message(messageBuffer, size);
  LocalFree(messageBuffer);
  
  std::stringstream ss;
  ss << "Error " << error << ": " << message;
  return ss.str();
}

// Helper to print address in hex
std::string AddressToHexString(uint64_t address) {
  std::stringstream ss;
  ss << "0x" << std::uppercase << std::hex << address;
  return ss.str();
}

// Memory reading function
Napi::Value Read(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 3) {
      Napi::Error::New(env, "readMemory requires 3 arguments: pid, address, size").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    uint64_t addressValue = info[1].As<Napi::Number>().Int64Value();
    LPVOID address = (LPVOID)addressValue;
    SIZE_T size = info[2].As<Napi::Number>().Uint32Value();
    
    std::cout << "Reading memory: PID=" << pid 
              << ", Address=" << AddressToHexString(addressValue)
              << ", Size=" << size << std::endl;
    
    HANDLE hProcess = OpenProcess(PROCESS_VM_READ, FALSE, pid);
    if (hProcess == NULL) {
      std::string errorMsg = "Failed to open process: " + GetLastErrorAsString();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return env.Null();
    }
    
    uint8_t* buffer = nullptr;
    try {
      buffer = new uint8_t[size];
      std::cout << "Allocated buffer at " << buffer << " of size " << size << std::endl;
    } catch (const std::exception& e) {
      CloseHandle(hProcess);
      std::string errorMsg = "Failed to allocate buffer: ";
      errorMsg += e.what();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return env.Null();
    }
    
    std::cout << "Attempting ReadProcessMemory..." << std::endl;
    SIZE_T bytesRead = 0;
    BOOL success = ReadProcessMemory(hProcess, address, buffer, size, &bytesRead);
    DWORD lastError = GetLastError();
    
    CloseHandle(hProcess);
    
    if (!success) {
      std::string errorMsg = "Failed to read memory: " + GetLastErrorAsString() +
                            " (PID=" + std::to_string(pid) + 
                            ", Address=" + AddressToHexString(addressValue) + 
                            ", Size=" + std::to_string(size) + ")";
      std::cerr << errorMsg << std::endl;
      delete[] buffer;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return env.Null();
    }
    
    std::cout << "Successfully read " << bytesRead << " bytes from " 
              << AddressToHexString(addressValue) << std::endl;
    
    // Create a safe fixed-size buffer for the return value
    try {
      // First create a temporary array to copy the data
      uint8_t* safeBuffer = new uint8_t[bytesRead];
      memcpy(safeBuffer, buffer, bytesRead);
      delete[] buffer; // Free the original buffer
      
      std::cout << "Creating Napi::Buffer with " << bytesRead << " bytes" << std::endl;
      
      // Use a safer approach to create a buffer
      Napi::Buffer<uint8_t> resultBuffer;
      
      // The finalizer will delete the buffer when Node.js garbage collects it
      auto finalizer = [](Napi::Env, uint8_t* data) {
        std::cout << "Finalizer called, deleting buffer at " << (void*)data << std::endl;
        delete[] data;
      };
      
      // Create the buffer with explicit size
      resultBuffer = Napi::Buffer<uint8_t>::New(
        env, 
        safeBuffer,  // Data pointer 
        bytesRead,   // Explicit size
        finalizer    // Cleanup callback
      );
      
      std::cout << "Successfully created buffer object to return to Node.js" << std::endl;
      return resultBuffer;
    }
    catch (const std::exception& e) {
      delete[] buffer; // Make sure to free the buffer on error
      std::string errorMsg = "Failed to create return buffer: ";
      errorMsg += e.what();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return env.Null();
    }
  }
  catch (const std::exception& e) {
    std::string errorMsg = "Exception in Read: ";
    errorMsg += e.what();
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }
  catch (...) {
    std::string errorMsg = "Unknown exception in Read";
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// New, simpler memory reading function
Napi::Value ReadAsArray(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 3) {
      Napi::Error::New(env, "readMemoryAsArray requires 3 arguments: pid, address, size").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    uint64_t addressValue = info[1].As<Napi::Number>().Int64Value();
    LPVOID address = (LPVOID)addressValue;
    SIZE_T size = info[2].As<Napi::Number>().Uint32Value();
    
    if (size > 1024) {
      Napi::Error::New(env, "Size too large, maximum is 1024 bytes").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    std::cout << "Reading memory as array: PID=" << pid 
              << ", Address=" << AddressToHexString(addressValue)
              << ", Size=" << size << std::endl;
    
    HANDLE hProcess = OpenProcess(PROCESS_VM_READ, FALSE, pid);
    if (hProcess == NULL) {
      std::string errorMsg = "Failed to open process: " + GetLastErrorAsString();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // Use a fixed buffer on the stack
    uint8_t buffer[1024] = {0};
    SIZE_T bytesRead = 0;
    
    BOOL success = ReadProcessMemory(hProcess, address, buffer, size, &bytesRead);
    CloseHandle(hProcess);
    
    if (!success) {
      std::string errorMsg = "Failed to read memory: " + GetLastErrorAsString();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // Display the data as different types if enough bytes were read
    std::cout << "Successfully read " << bytesRead << " bytes" << std::endl;
    
    // Display raw bytes
    std::cout << "Raw bytes: ";
    for (size_t i = 0; i < bytesRead && i < 16; i++) {
      std::cout << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(buffer[i]) << " ";
    }
    if (bytesRead > 16) std::cout << "...";
    std::cout << std::dec << std::endl;
    
    // Display as different integer types
    if (bytesRead >= 4) {
      int32_t int32Value = *reinterpret_cast<int32_t*>(buffer);
      uint32_t uint32Value = *reinterpret_cast<uint32_t*>(buffer);
      std::cout << "As int32: " << int32Value << " (0x" << std::hex << int32Value << ")" << std::dec << std::endl;
      std::cout << "As uint32: " << uint32Value << " (0x" << std::hex << uint32Value << ")" << std::dec << std::endl;
    }
    
    if (bytesRead >= 8) {
      int64_t int64Value = *reinterpret_cast<int64_t*>(buffer);
      uint64_t uint64Value = *reinterpret_cast<uint64_t*>(buffer);
      std::cout << "As int64: " << int64Value << " (0x" << std::hex << int64Value << ")" << std::dec << std::endl;
      std::cout << "As uint64: " << uint64Value << " (0x" << std::hex << uint64Value << ")" << std::dec << std::endl;
    }
    
    if (bytesRead >= 4) {
      float floatValue = *reinterpret_cast<float*>(buffer);
      std::cout << "As float: " << floatValue << std::endl;
    }
    
    if (bytesRead >= 8) {
      double doubleValue = *reinterpret_cast<double*>(buffer);
      std::cout << "As double: " << doubleValue << std::endl;
    }
    
    // Create a plain JavaScript array with the bytes
    Napi::Array result = Napi::Array::New(env, bytesRead);
    for (size_t i = 0; i < bytesRead; i++) {
      result[i] = Napi::Number::New(env, buffer[i]);
    }
    
    return result;
  }
  catch (const std::exception& e) {
    std::string errorMsg = "Exception in ReadAsArray: ";
    errorMsg += e.what();
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }
  catch (...) {
    std::string errorMsg = "Unknown exception in ReadAsArray";
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// Memory writing function
Napi::Boolean Write(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 3) {
      Napi::Error::New(env, "writeMemory requires 3 arguments: pid, address, buffer").ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    uint64_t addressValue = info[1].As<Napi::Number>().Int64Value();
    LPVOID address = (LPVOID)addressValue;
    Napi::Buffer<uint8_t> bufferObj = info[2].As<Napi::Buffer<uint8_t>>();
    uint8_t* buffer = bufferObj.Data();
    SIZE_T size = bufferObj.Length();
    
    std::cout << "Writing memory: PID=" << pid 
              << ", Address=" << AddressToHexString(addressValue)
              << ", Size=" << size << std::endl;
    
    HANDLE hProcess = OpenProcess(PROCESS_VM_WRITE | PROCESS_VM_OPERATION, FALSE, pid);
    if (hProcess == NULL) {
      std::string errorMsg = "Failed to open process for writing: " + GetLastErrorAsString();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    
    SIZE_T bytesWritten;
    BOOL success = WriteProcessMemory(hProcess, address, buffer, size, &bytesWritten);
    CloseHandle(hProcess);
    
    if (!success) {
      std::string errorMsg = "Failed to write memory: " + GetLastErrorAsString() +
                           " (PID=" + std::to_string(pid) + 
                           ", Address=" + AddressToHexString(addressValue) + 
                           ", Size=" + std::to_string(size) + ")";
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    
    if (bytesWritten != size) {
      std::string errorMsg = "Incomplete memory write: requested " + std::to_string(size) + 
                           " bytes, but wrote " + std::to_string(bytesWritten) + " bytes";
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return Napi::Boolean::New(env, false);
    }
    
    std::cout << "Successfully wrote " << bytesWritten << " bytes to " 
              << AddressToHexString(addressValue) << std::endl;
    
    return Napi::Boolean::New(env, true);
  }
  catch (const std::exception& e) {
    std::string errorMsg = "Exception in Write: ";
    errorMsg += e.what();
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
  catch (...) {
    std::string errorMsg = "Unknown exception in Write";
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
}

// Memory scanning function
Napi::Array Scan(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  try {
    if (info.Length() < 2) {
      Napi::Error::New(env, "scanMemoryForValue requires 2 arguments: pid, valueToFind").ThrowAsJavaScriptException();
      return Napi::Array::New(env);
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    uint32_t valueToFind = info[1].As<Napi::Number>().Uint32Value();
    
    // Display the valueToFind in different formats for clarity
    std::cout << "Scanning memory for value: " << std::endl;
    std::cout << "  As uint32: " << valueToFind << " (0x" << std::hex << valueToFind << ")" << std::dec << std::endl;
    std::cout << "  As int32:  " << static_cast<int32_t>(valueToFind) << " (0x" << std::hex << static_cast<int32_t>(valueToFind) << ")" << std::dec << std::endl;
    std::cout << "  In PID:    " << pid << std::endl;
    
    Napi::Array results = Napi::Array::New(env);
    
    HANDLE hProcess = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, FALSE, pid);
    if (hProcess == NULL) {
      std::string errorMsg = "Failed to open process for scanning: " + GetLastErrorAsString();
      std::cerr << errorMsg << std::endl;
      Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
      return results;
    }
    
    SYSTEM_INFO sysInfo;
    GetSystemInfo(&sysInfo);
    
    std::cout << "System info obtained. Address range: " 
              << AddressToHexString((uint64_t)sysInfo.lpMinimumApplicationAddress) 
              << " - " 
              << AddressToHexString((uint64_t)sysInfo.lpMaximumApplicationAddress) << std::endl;
    
    MEMORY_BASIC_INFORMATION memInfo;
    LPVOID addr = sysInfo.lpMinimumApplicationAddress;
    int resultIndex = 0;
    int regionsScanned = 0;
    
    while (addr < sysInfo.lpMaximumApplicationAddress) {
      if (VirtualQueryEx(hProcess, addr, &memInfo, sizeof(memInfo))) {
        regionsScanned++;
        
        if ((memInfo.State == MEM_COMMIT) && 
            (memInfo.Protect & (PAGE_READWRITE | PAGE_READONLY | PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE))) {
          
          SIZE_T bytesToRead = memInfo.RegionSize;
          
          if (bytesToRead > 1024 * 1024 * 100) {  // Limit to 100MB per region for safety
            std::cout << "Region too large (" << (bytesToRead / (1024 * 1024)) << "MB), limiting to 100MB" << std::endl;
            bytesToRead = 1024 * 1024 * 100;
          }
          
          std::cout << "Scanning region: " << AddressToHexString((uint64_t)memInfo.BaseAddress) 
                    << ", Size: " << bytesToRead 
                    << ", Protection: 0x" << std::hex << memInfo.Protect << std::dec << std::endl;
          
          try {
            // Allocate buffer for memory reading
            void* buffer = malloc(bytesToRead);
            if (!buffer) {
              std::cerr << "Failed to allocate memory for scan buffer" << std::endl;
              addr = (BYTE*)memInfo.BaseAddress + memInfo.RegionSize;
              continue;
            }
            
            SIZE_T bytesRead = 0;
            BOOL success = ReadProcessMemory(hProcess, memInfo.BaseAddress, buffer, bytesToRead, &bytesRead);
            
            if (success && bytesRead > 0) {
              std::cout << "Successfully read " << bytesRead << " bytes. Scanning for value..." << std::endl;
              
              // Only scan up to the bytes we actually read
              for (SIZE_T i = 0; i <= bytesRead - sizeof(uint32_t); i += sizeof(uint32_t)) {
                uint32_t* currentValue = (uint32_t*)((BYTE*)buffer + i);
                if (*currentValue == valueToFind) {
                  uint64_t foundAddress = (uint64_t)memInfo.BaseAddress + i;
                  std::cout << "Found match at " << AddressToHexString(foundAddress) << std::endl;
                  results[resultIndex++] = Napi::Number::New(env, foundAddress);
                }
              }
            } else {
              std::cerr << "Failed to read memory region at " 
                        << AddressToHexString((uint64_t)memInfo.BaseAddress) 
                        << ": " << GetLastErrorAsString() << std::endl;
            }
            
            free(buffer);
          }
          catch (const std::exception& e) {
            std::cerr << "Exception scanning region: " << e.what() << std::endl;
          }
          catch (...) {
            std::cerr << "Unknown exception scanning region" << std::endl;
          }
        }
      } else {
        std::cerr << "VirtualQueryEx failed at " << AddressToHexString((uint64_t)addr) 
                  << ": " << GetLastErrorAsString() << std::endl;
      }
      
      // Move to next region
      addr = (BYTE*)memInfo.BaseAddress + memInfo.RegionSize;
    }
    
    std::cout << "Scan completed. Scanned " << regionsScanned << " memory regions. Found " 
              << resultIndex << " matches." << std::endl;
    
    CloseHandle(hProcess);
    return results;
  }
  catch (const std::exception& e) {
    std::string errorMsg = "Exception in Scan: ";
    errorMsg += e.what();
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return Napi::Array::New(env);
  }
  catch (...) {
    std::string errorMsg = "Unknown exception in Scan";
    std::cerr << errorMsg << std::endl;
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return Napi::Array::New(env);
  }
}

// Register all memory functions
Napi::Object RegisterMemoryFunctions(Napi::Env env, Napi::Object exports) {
  exports.Set("readMemory", Napi::Function::New(env, Read));
  exports.Set("readMemoryAsArray", Napi::Function::New(env, ReadAsArray));
  exports.Set("writeMemory", Napi::Function::New(env, Write));
  exports.Set("scanMemoryForValue", Napi::Function::New(env, Scan));
  return exports;
}
