/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import {
  WebGLConstants_default
} from "./chunk-LSF6MAVT.js";
import {
  RuntimeError_default
} from "./chunk-JQQW5OSU.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  __commonJS,
  __require,
  __toESM,
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/ThirdParty/Workers/basis_transcoder.js
var require_basis_transcoder = __commonJS({
  "packages/engine/Source/ThirdParty/Workers/basis_transcoder.js"(exports, module) {
    var BASIS = function() {
      var _scriptDir = typeof document !== "undefined" && document.currentScript ? document.currentScript.src : void 0;
      if (typeof __filename !== "undefined")
        _scriptDir = _scriptDir || __filename;
      return function(BASIS2) {
        BASIS2 = BASIS2 || {};
        var Module = typeof BASIS2 !== "undefined" ? BASIS2 : {};
        var readyPromiseResolve, readyPromiseReject;
        Module["ready"] = new Promise(function(resolve, reject) {
          readyPromiseResolve = resolve;
          readyPromiseReject = reject;
        });
        var moduleOverrides = {};
        var key;
        for (key in Module) {
          if (Module.hasOwnProperty(key)) {
            moduleOverrides[key] = Module[key];
          }
        }
        var arguments_ = [];
        var thisProgram = "./this.program";
        var quit_ = function(status, toThrow) {
          throw toThrow;
        };
        var ENVIRONMENT_IS_WEB = false;
        var ENVIRONMENT_IS_WORKER = false;
        var ENVIRONMENT_IS_NODE = false;
        var ENVIRONMENT_IS_SHELL = false;
        ENVIRONMENT_IS_WEB = typeof window === "object";
        ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
        ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
        ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
        var scriptDirectory = "";
        function locateFile(path) {
          if (Module["locateFile"]) {
            return Module["locateFile"](path, scriptDirectory);
          }
          return scriptDirectory + path;
        }
        var read_, readAsync, readBinary, setWindowTitle;
        var nodeFS;
        var nodePath;
        if (ENVIRONMENT_IS_NODE) {
          if (ENVIRONMENT_IS_WORKER) {
            scriptDirectory = __require("path").dirname(scriptDirectory) + "/";
          } else {
            scriptDirectory = __dirname + "/";
          }
          read_ = function shell_read(filename, binary) {
            if (!nodeFS)
              nodeFS = __require("fs");
            if (!nodePath)
              nodePath = __require("path");
            filename = nodePath["normalize"](filename);
            return nodeFS["readFileSync"](filename, binary ? null : "utf8");
          };
          readBinary = function readBinary2(filename) {
            var ret = read_(filename, true);
            if (!ret.buffer) {
              ret = new Uint8Array(ret);
            }
            assert(ret.buffer);
            return ret;
          };
          if (process["argv"].length > 1) {
            thisProgram = process["argv"][1].replace(/\\/g, "/");
          }
          arguments_ = process["argv"].slice(2);
          process["on"]("uncaughtException", function(ex) {
            if (!(ex instanceof ExitStatus)) {
              throw ex;
            }
          });
          process["on"]("unhandledRejection", abort);
          quit_ = function(status) {
            process["exit"](status);
          };
          Module["inspect"] = function() {
            return "[Emscripten Module object]";
          };
        } else if (ENVIRONMENT_IS_SHELL) {
          if (typeof read != "undefined") {
            read_ = function shell_read(f) {
              return read(f);
            };
          }
          readBinary = function readBinary2(f) {
            var data;
            if (typeof readbuffer === "function") {
              return new Uint8Array(readbuffer(f));
            }
            data = read(f, "binary");
            assert(typeof data === "object");
            return data;
          };
          if (typeof scriptArgs != "undefined") {
            arguments_ = scriptArgs;
          } else if (typeof arguments != "undefined") {
            arguments_ = arguments;
          }
          if (typeof quit === "function") {
            quit_ = function(status) {
              quit(status);
            };
          }
          if (typeof print !== "undefined") {
            if (typeof console === "undefined")
              console = {};
            console.log = print;
            console.warn = console.error = typeof printErr !== "undefined" ? printErr : print;
          }
        } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
          if (ENVIRONMENT_IS_WORKER) {
            scriptDirectory = self.location.href;
          } else if (typeof document !== "undefined" && document.currentScript) {
            scriptDirectory = document.currentScript.src;
          }
          if (_scriptDir) {
            scriptDirectory = _scriptDir;
          }
          if (scriptDirectory.indexOf("blob:") !== 0) {
            scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
          } else {
            scriptDirectory = "";
          }
          {
            read_ = function(url) {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, false);
              xhr.send(null);
              return xhr.responseText;
            };
            if (ENVIRONMENT_IS_WORKER) {
              readBinary = function(url) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response);
              };
            }
            readAsync = function(url, onload, onerror) {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "arraybuffer";
              xhr.onload = function() {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                  onload(xhr.response);
                  return;
                }
                onerror();
              };
              xhr.onerror = onerror;
              xhr.send(null);
            };
          }
          setWindowTitle = function(title) {
            document.title = title;
          };
        } else {
        }
        var out = Module["print"] || console.log.bind(console);
        var err = Module["printErr"] || console.warn.bind(console);
        for (key in moduleOverrides) {
          if (moduleOverrides.hasOwnProperty(key)) {
            Module[key] = moduleOverrides[key];
          }
        }
        moduleOverrides = null;
        if (Module["arguments"])
          arguments_ = Module["arguments"];
        if (Module["thisProgram"])
          thisProgram = Module["thisProgram"];
        if (Module["quit"])
          quit_ = Module["quit"];
        var tempRet0 = 0;
        var setTempRet0 = function(value) {
          tempRet0 = value;
        };
        var wasmBinary;
        if (Module["wasmBinary"])
          wasmBinary = Module["wasmBinary"];
        var noExitRuntime = Module["noExitRuntime"] || true;
        if (typeof WebAssembly !== "object") {
          abort("no native wasm support detected");
        }
        var wasmMemory;
        var ABORT = false;
        var EXITSTATUS;
        function assert(condition, text) {
          if (!condition) {
            abort("Assertion failed: " + text);
          }
        }
        var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : void 0;
        function UTF8ArrayToString(heap, idx, maxBytesToRead) {
          var endIdx = idx + maxBytesToRead;
          var endPtr = idx;
          while (heap[endPtr] && !(endPtr >= endIdx))
            ++endPtr;
          if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
            return UTF8Decoder.decode(heap.subarray(idx, endPtr));
          } else {
            var str = "";
            while (idx < endPtr) {
              var u0 = heap[idx++];
              if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue;
              }
              var u1 = heap[idx++] & 63;
              if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue;
              }
              var u2 = heap[idx++] & 63;
              if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2;
              } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63;
              }
              if (u0 < 65536) {
                str += String.fromCharCode(u0);
              } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
              }
            }
          }
          return str;
        }
        function UTF8ToString(ptr, maxBytesToRead) {
          return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
        }
        function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
          if (!(maxBytesToWrite > 0))
            return 0;
          var startIdx = outIdx;
          var endIdx = outIdx + maxBytesToWrite - 1;
          for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) {
              var u1 = str.charCodeAt(++i);
              u = 65536 + ((u & 1023) << 10) | u1 & 1023;
            }
            if (u <= 127) {
              if (outIdx >= endIdx)
                break;
              heap[outIdx++] = u;
            } else if (u <= 2047) {
              if (outIdx + 1 >= endIdx)
                break;
              heap[outIdx++] = 192 | u >> 6;
              heap[outIdx++] = 128 | u & 63;
            } else if (u <= 65535) {
              if (outIdx + 2 >= endIdx)
                break;
              heap[outIdx++] = 224 | u >> 12;
              heap[outIdx++] = 128 | u >> 6 & 63;
              heap[outIdx++] = 128 | u & 63;
            } else {
              if (outIdx + 3 >= endIdx)
                break;
              heap[outIdx++] = 240 | u >> 18;
              heap[outIdx++] = 128 | u >> 12 & 63;
              heap[outIdx++] = 128 | u >> 6 & 63;
              heap[outIdx++] = 128 | u & 63;
            }
          }
          heap[outIdx] = 0;
          return outIdx - startIdx;
        }
        function stringToUTF8(str, outPtr, maxBytesToWrite) {
          return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
        }
        function lengthBytesUTF8(str) {
          var len = 0;
          for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343)
              u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
            if (u <= 127)
              ++len;
            else if (u <= 2047)
              len += 2;
            else if (u <= 65535)
              len += 3;
            else
              len += 4;
          }
          return len;
        }
        var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : void 0;
        function UTF16ToString(ptr, maxBytesToRead) {
          var endPtr = ptr;
          var idx = endPtr >> 1;
          var maxIdx = idx + maxBytesToRead / 2;
          while (!(idx >= maxIdx) && HEAPU16[idx])
            ++idx;
          endPtr = idx << 1;
          if (endPtr - ptr > 32 && UTF16Decoder) {
            return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
          } else {
            var str = "";
            for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
              var codeUnit = HEAP16[ptr + i * 2 >> 1];
              if (codeUnit == 0)
                break;
              str += String.fromCharCode(codeUnit);
            }
            return str;
          }
        }
        function stringToUTF16(str, outPtr, maxBytesToWrite) {
          if (maxBytesToWrite === void 0) {
            maxBytesToWrite = 2147483647;
          }
          if (maxBytesToWrite < 2)
            return 0;
          maxBytesToWrite -= 2;
          var startPtr = outPtr;
          var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
          for (var i = 0; i < numCharsToWrite; ++i) {
            var codeUnit = str.charCodeAt(i);
            HEAP16[outPtr >> 1] = codeUnit;
            outPtr += 2;
          }
          HEAP16[outPtr >> 1] = 0;
          return outPtr - startPtr;
        }
        function lengthBytesUTF16(str) {
          return str.length * 2;
        }
        function UTF32ToString(ptr, maxBytesToRead) {
          var i = 0;
          var str = "";
          while (!(i >= maxBytesToRead / 4)) {
            var utf32 = HEAP32[ptr + i * 4 >> 2];
            if (utf32 == 0)
              break;
            ++i;
            if (utf32 >= 65536) {
              var ch = utf32 - 65536;
              str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
            } else {
              str += String.fromCharCode(utf32);
            }
          }
          return str;
        }
        function stringToUTF32(str, outPtr, maxBytesToWrite) {
          if (maxBytesToWrite === void 0) {
            maxBytesToWrite = 2147483647;
          }
          if (maxBytesToWrite < 4)
            return 0;
          var startPtr = outPtr;
          var endPtr = startPtr + maxBytesToWrite - 4;
          for (var i = 0; i < str.length; ++i) {
            var codeUnit = str.charCodeAt(i);
            if (codeUnit >= 55296 && codeUnit <= 57343) {
              var trailSurrogate = str.charCodeAt(++i);
              codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
            }
            HEAP32[outPtr >> 2] = codeUnit;
            outPtr += 4;
            if (outPtr + 4 > endPtr)
              break;
          }
          HEAP32[outPtr >> 2] = 0;
          return outPtr - startPtr;
        }
        function lengthBytesUTF32(str) {
          var len = 0;
          for (var i = 0; i < str.length; ++i) {
            var codeUnit = str.charCodeAt(i);
            if (codeUnit >= 55296 && codeUnit <= 57343)
              ++i;
            len += 4;
          }
          return len;
        }
        function alignUp(x, multiple) {
          if (x % multiple > 0) {
            x += multiple - x % multiple;
          }
          return x;
        }
        var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
        function updateGlobalBufferAndViews(buf) {
          buffer = buf;
          Module["HEAP8"] = HEAP8 = new Int8Array(buf);
          Module["HEAP16"] = HEAP16 = new Int16Array(buf);
          Module["HEAP32"] = HEAP32 = new Int32Array(buf);
          Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
          Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
          Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
          Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
          Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
        }
        var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
        var wasmTable;
        var __ATPRERUN__ = [];
        var __ATINIT__ = [];
        var __ATMAIN__ = [];
        var __ATPOSTRUN__ = [];
        var runtimeInitialized = false;
        function preRun() {
          if (Module["preRun"]) {
            if (typeof Module["preRun"] == "function")
              Module["preRun"] = [Module["preRun"]];
            while (Module["preRun"].length) {
              addOnPreRun(Module["preRun"].shift());
            }
          }
          callRuntimeCallbacks(__ATPRERUN__);
        }
        function initRuntime() {
          runtimeInitialized = true;
          callRuntimeCallbacks(__ATINIT__);
        }
        function preMain() {
          callRuntimeCallbacks(__ATMAIN__);
        }
        function postRun() {
          if (Module["postRun"]) {
            if (typeof Module["postRun"] == "function")
              Module["postRun"] = [Module["postRun"]];
            while (Module["postRun"].length) {
              addOnPostRun(Module["postRun"].shift());
            }
          }
          callRuntimeCallbacks(__ATPOSTRUN__);
        }
        function addOnPreRun(cb) {
          __ATPRERUN__.unshift(cb);
        }
        function addOnInit(cb) {
          __ATINIT__.unshift(cb);
        }
        function addOnPostRun(cb) {
          __ATPOSTRUN__.unshift(cb);
        }
        var runDependencies = 0;
        var runDependencyWatcher = null;
        var dependenciesFulfilled = null;
        function addRunDependency(id) {
          runDependencies++;
          if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies);
          }
        }
        function removeRunDependency(id) {
          runDependencies--;
          if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies);
          }
          if (runDependencies == 0) {
            if (runDependencyWatcher !== null) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
            }
            if (dependenciesFulfilled) {
              var callback = dependenciesFulfilled;
              dependenciesFulfilled = null;
              callback();
            }
          }
        }
        Module["preloadedImages"] = {};
        Module["preloadedAudios"] = {};
        function abort(what) {
          if (Module["onAbort"]) {
            Module["onAbort"](what);
          }
          what += "";
          err(what);
          ABORT = true;
          EXITSTATUS = 1;
          what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
          var e = new WebAssembly.RuntimeError(what);
          readyPromiseReject(e);
          throw e;
        }
        function hasPrefix(str, prefix) {
          return String.prototype.startsWith ? str.startsWith(prefix) : str.indexOf(prefix) === 0;
        }
        var dataURIPrefix = "data:application/octet-stream;base64,";
        function isDataURI(filename) {
          return hasPrefix(filename, dataURIPrefix);
        }
        var fileURIPrefix = "file://";
        function isFileURI(filename) {
          return hasPrefix(filename, fileURIPrefix);
        }
        var wasmBinaryFile = "basis_transcoder.wasm";
        if (!isDataURI(wasmBinaryFile)) {
          wasmBinaryFile = locateFile(wasmBinaryFile);
        }
        function getBinary(file) {
          try {
            if (file == wasmBinaryFile && wasmBinary) {
              return new Uint8Array(wasmBinary);
            }
            if (readBinary) {
              return readBinary(file);
            } else {
              throw "both async and sync fetching of the wasm failed";
            }
          } catch (err2) {
            abort(err2);
          }
        }
        function getBinaryPromise() {
          if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
            if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
              return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
                if (!response["ok"]) {
                  throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
                }
                return response["arrayBuffer"]();
              }).catch(function() {
                return getBinary(wasmBinaryFile);
              });
            } else {
              if (readAsync) {
                return new Promise(function(resolve, reject) {
                  readAsync(wasmBinaryFile, function(response) {
                    resolve(new Uint8Array(response));
                  }, reject);
                });
              }
            }
          }
          return Promise.resolve().then(function() {
            return getBinary(wasmBinaryFile);
          });
        }
        function createWasm() {
          var info = { "a": asmLibraryArg };
          function receiveInstance(instance, module2) {
            var exports3 = instance.exports;
            Module["asm"] = exports3;
            wasmMemory = Module["asm"]["K"];
            updateGlobalBufferAndViews(wasmMemory.buffer);
            wasmTable = Module["asm"]["O"];
            addOnInit(Module["asm"]["L"]);
            removeRunDependency("wasm-instantiate");
          }
          addRunDependency("wasm-instantiate");
          function receiveInstantiatedSource(output) {
            receiveInstance(output["instance"]);
          }
          function instantiateArrayBuffer(receiver) {
            return getBinaryPromise().then(function(binary) {
              var result = WebAssembly.instantiate(binary, info);
              return result;
            }).then(receiver, function(reason) {
              err("failed to asynchronously prepare wasm: " + reason);
              abort(reason);
            });
          }
          function instantiateAsync() {
            if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
              return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
                var result = WebAssembly.instantiateStreaming(response, info);
                return result.then(receiveInstantiatedSource, function(reason) {
                  err("wasm streaming compile failed: " + reason);
                  err("falling back to ArrayBuffer instantiation");
                  return instantiateArrayBuffer(receiveInstantiatedSource);
                });
              });
            } else {
              return instantiateArrayBuffer(receiveInstantiatedSource);
            }
          }
          if (Module["instantiateWasm"]) {
            try {
              var exports2 = Module["instantiateWasm"](info, receiveInstance);
              return exports2;
            } catch (e) {
              err("Module.instantiateWasm callback failed with error: " + e);
              return false;
            }
          }
          instantiateAsync().catch(readyPromiseReject);
          return {};
        }
        function callRuntimeCallbacks(callbacks) {
          while (callbacks.length > 0) {
            var callback = callbacks.shift();
            if (typeof callback == "function") {
              callback(Module);
              continue;
            }
            var func = callback.func;
            if (typeof func === "number") {
              if (callback.arg === void 0) {
                wasmTable.get(func)();
              } else {
                wasmTable.get(func)(callback.arg);
              }
            } else {
              func(callback.arg === void 0 ? null : callback.arg);
            }
          }
        }
        var structRegistrations = {};
        function runDestructors(destructors) {
          while (destructors.length) {
            var ptr = destructors.pop();
            var del = destructors.pop();
            del(ptr);
          }
        }
        function simpleReadValueFromPointer(pointer) {
          return this["fromWireType"](HEAPU32[pointer >> 2]);
        }
        var awaitingDependencies = {};
        var registeredTypes = {};
        var typeDependencies = {};
        var char_0 = 48;
        var char_9 = 57;
        function makeLegalFunctionName(name) {
          if (void 0 === name) {
            return "_unknown";
          }
          name = name.replace(/[^a-zA-Z0-9_]/g, "$");
          var f = name.charCodeAt(0);
          if (f >= char_0 && f <= char_9) {
            return "_" + name;
          } else {
            return name;
          }
        }
        function createNamedFunction(name, body) {
          name = makeLegalFunctionName(name);
          return new Function("body", "return function " + name + '() {\n    "use strict";    return body.apply(this, arguments);\n};\n')(body);
        }
        function extendError(baseErrorType, errorName) {
          var errorClass = createNamedFunction(errorName, function(message) {
            this.name = errorName;
            this.message = message;
            var stack = new Error(message).stack;
            if (stack !== void 0) {
              this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
            }
          });
          errorClass.prototype = Object.create(baseErrorType.prototype);
          errorClass.prototype.constructor = errorClass;
          errorClass.prototype.toString = function() {
            if (this.message === void 0) {
              return this.name;
            } else {
              return this.name + ": " + this.message;
            }
          };
          return errorClass;
        }
        var InternalError = void 0;
        function throwInternalError(message) {
          throw new InternalError(message);
        }
        function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
          myTypes.forEach(function(type) {
            typeDependencies[type] = dependentTypes;
          });
          function onComplete(typeConverters2) {
            var myTypeConverters = getTypeConverters(typeConverters2);
            if (myTypeConverters.length !== myTypes.length) {
              throwInternalError("Mismatched type converter count");
            }
            for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
            }
          }
          var typeConverters = new Array(dependentTypes.length);
          var unregisteredTypes = [];
          var registered = 0;
          dependentTypes.forEach(function(dt, i) {
            if (registeredTypes.hasOwnProperty(dt)) {
              typeConverters[i] = registeredTypes[dt];
            } else {
              unregisteredTypes.push(dt);
              if (!awaitingDependencies.hasOwnProperty(dt)) {
                awaitingDependencies[dt] = [];
              }
              awaitingDependencies[dt].push(function() {
                typeConverters[i] = registeredTypes[dt];
                ++registered;
                if (registered === unregisteredTypes.length) {
                  onComplete(typeConverters);
                }
              });
            }
          });
          if (0 === unregisteredTypes.length) {
            onComplete(typeConverters);
          }
        }
        function __embind_finalize_value_object(structType) {
          var reg = structRegistrations[structType];
          delete structRegistrations[structType];
          var rawConstructor = reg.rawConstructor;
          var rawDestructor = reg.rawDestructor;
          var fieldRecords = reg.fields;
          var fieldTypes = fieldRecords.map(function(field) {
            return field.getterReturnType;
          }).concat(fieldRecords.map(function(field) {
            return field.setterArgumentType;
          }));
          whenDependentTypesAreResolved([structType], fieldTypes, function(fieldTypes2) {
            var fields = {};
            fieldRecords.forEach(function(field, i) {
              var fieldName = field.fieldName;
              var getterReturnType = fieldTypes2[i];
              var getter = field.getter;
              var getterContext = field.getterContext;
              var setterArgumentType = fieldTypes2[i + fieldRecords.length];
              var setter = field.setter;
              var setterContext = field.setterContext;
              fields[fieldName] = { read: function(ptr) {
                return getterReturnType["fromWireType"](getter(getterContext, ptr));
              }, write: function(ptr, o) {
                var destructors = [];
                setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
                runDestructors(destructors);
              } };
            });
            return [{ name: reg.name, "fromWireType": function(ptr) {
              var rv = {};
              for (var i in fields) {
                rv[i] = fields[i].read(ptr);
              }
              rawDestructor(ptr);
              return rv;
            }, "toWireType": function(destructors, o) {
              for (var fieldName in fields) {
                if (!(fieldName in o)) {
                  throw new TypeError('Missing field:  "' + fieldName + '"');
                }
              }
              var ptr = rawConstructor();
              for (fieldName in fields) {
                fields[fieldName].write(ptr, o[fieldName]);
              }
              if (destructors !== null) {
                destructors.push(rawDestructor, ptr);
              }
              return ptr;
            }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: rawDestructor }];
          });
        }
        function getShiftFromSize(size) {
          switch (size) {
            case 1:
              return 0;
            case 2:
              return 1;
            case 4:
              return 2;
            case 8:
              return 3;
            default:
              throw new TypeError("Unknown type size: " + size);
          }
        }
        function embind_init_charCodes() {
          var codes = new Array(256);
          for (var i = 0; i < 256; ++i) {
            codes[i] = String.fromCharCode(i);
          }
          embind_charCodes = codes;
        }
        var embind_charCodes = void 0;
        function readLatin1String(ptr) {
          var ret = "";
          var c = ptr;
          while (HEAPU8[c]) {
            ret += embind_charCodes[HEAPU8[c++]];
          }
          return ret;
        }
        var BindingError = void 0;
        function throwBindingError(message) {
          throw new BindingError(message);
        }
        function registerType(rawType, registeredInstance, options) {
          options = options || {};
          if (!("argPackAdvance" in registeredInstance)) {
            throw new TypeError("registerType registeredInstance requires argPackAdvance");
          }
          var name = registeredInstance.name;
          if (!rawType) {
            throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
          }
          if (registeredTypes.hasOwnProperty(rawType)) {
            if (options.ignoreDuplicateRegistrations) {
              return;
            } else {
              throwBindingError("Cannot register type '" + name + "' twice");
            }
          }
          registeredTypes[rawType] = registeredInstance;
          delete typeDependencies[rawType];
          if (awaitingDependencies.hasOwnProperty(rawType)) {
            var callbacks = awaitingDependencies[rawType];
            delete awaitingDependencies[rawType];
            callbacks.forEach(function(cb) {
              cb();
            });
          }
        }
        function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
          var shift = getShiftFromSize(size);
          name = readLatin1String(name);
          registerType(rawType, { name, "fromWireType": function(wt) {
            return !!wt;
          }, "toWireType": function(destructors, o) {
            return o ? trueValue : falseValue;
          }, "argPackAdvance": 8, "readValueFromPointer": function(pointer) {
            var heap;
            if (size === 1) {
              heap = HEAP8;
            } else if (size === 2) {
              heap = HEAP16;
            } else if (size === 4) {
              heap = HEAP32;
            } else {
              throw new TypeError("Unknown boolean type size: " + name);
            }
            return this["fromWireType"](heap[pointer >> shift]);
          }, destructorFunction: null });
        }
        function ClassHandle_isAliasOf(other) {
          if (!(this instanceof ClassHandle)) {
            return false;
          }
          if (!(other instanceof ClassHandle)) {
            return false;
          }
          var leftClass = this.$$.ptrType.registeredClass;
          var left = this.$$.ptr;
          var rightClass = other.$$.ptrType.registeredClass;
          var right = other.$$.ptr;
          while (leftClass.baseClass) {
            left = leftClass.upcast(left);
            leftClass = leftClass.baseClass;
          }
          while (rightClass.baseClass) {
            right = rightClass.upcast(right);
            rightClass = rightClass.baseClass;
          }
          return leftClass === rightClass && left === right;
        }
        function shallowCopyInternalPointer(o) {
          return { count: o.count, deleteScheduled: o.deleteScheduled, preservePointerOnDelete: o.preservePointerOnDelete, ptr: o.ptr, ptrType: o.ptrType, smartPtr: o.smartPtr, smartPtrType: o.smartPtrType };
        }
        function throwInstanceAlreadyDeleted(obj) {
          function getInstanceTypeName(handle) {
            return handle.$$.ptrType.registeredClass.name;
          }
          throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
        }
        var finalizationGroup = false;
        function detachFinalizer(handle) {
        }
        function runDestructor($$) {
          if ($$.smartPtr) {
            $$.smartPtrType.rawDestructor($$.smartPtr);
          } else {
            $$.ptrType.registeredClass.rawDestructor($$.ptr);
          }
        }
        function releaseClassHandle($$) {
          $$.count.value -= 1;
          var toDelete = 0 === $$.count.value;
          if (toDelete) {
            runDestructor($$);
          }
        }
        function attachFinalizer(handle) {
          if ("undefined" === typeof FinalizationGroup) {
            attachFinalizer = function(handle2) {
              return handle2;
            };
            return handle;
          }
          finalizationGroup = new FinalizationGroup(function(iter) {
            for (var result = iter.next(); !result.done; result = iter.next()) {
              var $$ = result.value;
              if (!$$.ptr) {
                console.warn("object already deleted: " + $$.ptr);
              } else {
                releaseClassHandle($$);
              }
            }
          });
          attachFinalizer = function(handle2) {
            finalizationGroup.register(handle2, handle2.$$, handle2.$$);
            return handle2;
          };
          detachFinalizer = function(handle2) {
            finalizationGroup.unregister(handle2.$$);
          };
          return attachFinalizer(handle);
        }
        function ClassHandle_clone() {
          if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
          }
          if (this.$$.preservePointerOnDelete) {
            this.$$.count.value += 1;
            return this;
          } else {
            var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), { $$: { value: shallowCopyInternalPointer(this.$$) } }));
            clone.$$.count.value += 1;
            clone.$$.deleteScheduled = false;
            return clone;
          }
        }
        function ClassHandle_delete() {
          if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
          }
          if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError("Object already scheduled for deletion");
          }
          detachFinalizer(this);
          releaseClassHandle(this.$$);
          if (!this.$$.preservePointerOnDelete) {
            this.$$.smartPtr = void 0;
            this.$$.ptr = void 0;
          }
        }
        function ClassHandle_isDeleted() {
          return !this.$$.ptr;
        }
        var delayFunction = void 0;
        var deletionQueue = [];
        function flushPendingDeletes() {
          while (deletionQueue.length) {
            var obj = deletionQueue.pop();
            obj.$$.deleteScheduled = false;
            obj["delete"]();
          }
        }
        function ClassHandle_deleteLater() {
          if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
          }
          if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError("Object already scheduled for deletion");
          }
          deletionQueue.push(this);
          if (deletionQueue.length === 1 && delayFunction) {
            delayFunction(flushPendingDeletes);
          }
          this.$$.deleteScheduled = true;
          return this;
        }
        function init_ClassHandle() {
          ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
          ClassHandle.prototype["clone"] = ClassHandle_clone;
          ClassHandle.prototype["delete"] = ClassHandle_delete;
          ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
          ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater;
        }
        function ClassHandle() {
        }
        var registeredPointers = {};
        function ensureOverloadTable(proto, methodName, humanName) {
          if (void 0 === proto[methodName].overloadTable) {
            var prevFunc = proto[methodName];
            proto[methodName] = function() {
              if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
              }
              return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
            };
            proto[methodName].overloadTable = [];
            proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
          }
        }
        function exposePublicSymbol(name, value, numArguments) {
          if (Module.hasOwnProperty(name)) {
            if (void 0 === numArguments || void 0 !== Module[name].overloadTable && void 0 !== Module[name].overloadTable[numArguments]) {
              throwBindingError("Cannot register public name '" + name + "' twice");
            }
            ensureOverloadTable(Module, name, name);
            if (Module.hasOwnProperty(numArguments)) {
              throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
            }
            Module[name].overloadTable[numArguments] = value;
          } else {
            Module[name] = value;
            if (void 0 !== numArguments) {
              Module[name].numArguments = numArguments;
            }
          }
        }
        function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
          this.name = name;
          this.constructor = constructor;
          this.instancePrototype = instancePrototype;
          this.rawDestructor = rawDestructor;
          this.baseClass = baseClass;
          this.getActualType = getActualType;
          this.upcast = upcast;
          this.downcast = downcast;
          this.pureVirtualFunctions = [];
        }
        function upcastPointer(ptr, ptrClass, desiredClass) {
          while (ptrClass !== desiredClass) {
            if (!ptrClass.upcast) {
              throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
            }
            ptr = ptrClass.upcast(ptr);
            ptrClass = ptrClass.baseClass;
          }
          return ptr;
        }
        function constNoSmartPtrRawPointerToWireType(destructors, handle) {
          if (handle === null) {
            if (this.isReference) {
              throwBindingError("null is not a valid " + this.name);
            }
            return 0;
          }
          if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
          }
          if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
          }
          var handleClass = handle.$$.ptrType.registeredClass;
          var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
          return ptr;
        }
        function genericPointerToWireType(destructors, handle) {
          var ptr;
          if (handle === null) {
            if (this.isReference) {
              throwBindingError("null is not a valid " + this.name);
            }
            if (this.isSmartPointer) {
              ptr = this.rawConstructor();
              if (destructors !== null) {
                destructors.push(this.rawDestructor, ptr);
              }
              return ptr;
            } else {
              return 0;
            }
          }
          if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
          }
          if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
          }
          if (!this.isConst && handle.$$.ptrType.isConst) {
            throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
          }
          var handleClass = handle.$$.ptrType.registeredClass;
          ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
          if (this.isSmartPointer) {
            if (void 0 === handle.$$.smartPtr) {
              throwBindingError("Passing raw pointer to smart pointer is illegal");
            }
            switch (this.sharingPolicy) {
              case 0:
                if (handle.$$.smartPtrType === this) {
                  ptr = handle.$$.smartPtr;
                } else {
                  throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
                }
                break;
              case 1:
                ptr = handle.$$.smartPtr;
                break;
              case 2:
                if (handle.$$.smartPtrType === this) {
                  ptr = handle.$$.smartPtr;
                } else {
                  var clonedHandle = handle["clone"]();
                  ptr = this.rawShare(ptr, __emval_register(function() {
                    clonedHandle["delete"]();
                  }));
                  if (destructors !== null) {
                    destructors.push(this.rawDestructor, ptr);
                  }
                }
                break;
              default:
                throwBindingError("Unsupporting sharing policy");
            }
          }
          return ptr;
        }
        function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
          if (handle === null) {
            if (this.isReference) {
              throwBindingError("null is not a valid " + this.name);
            }
            return 0;
          }
          if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
          }
          if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
          }
          if (handle.$$.ptrType.isConst) {
            throwBindingError("Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name);
          }
          var handleClass = handle.$$.ptrType.registeredClass;
          var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
          return ptr;
        }
        function RegisteredPointer_getPointee(ptr) {
          if (this.rawGetPointee) {
            ptr = this.rawGetPointee(ptr);
          }
          return ptr;
        }
        function RegisteredPointer_destructor(ptr) {
          if (this.rawDestructor) {
            this.rawDestructor(ptr);
          }
        }
        function RegisteredPointer_deleteObject(handle) {
          if (handle !== null) {
            handle["delete"]();
          }
        }
        function downcastPointer(ptr, ptrClass, desiredClass) {
          if (ptrClass === desiredClass) {
            return ptr;
          }
          if (void 0 === desiredClass.baseClass) {
            return null;
          }
          var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
          if (rv === null) {
            return null;
          }
          return desiredClass.downcast(rv);
        }
        function getInheritedInstanceCount() {
          return Object.keys(registeredInstances).length;
        }
        function getLiveInheritedInstances() {
          var rv = [];
          for (var k in registeredInstances) {
            if (registeredInstances.hasOwnProperty(k)) {
              rv.push(registeredInstances[k]);
            }
          }
          return rv;
        }
        function setDelayFunction(fn) {
          delayFunction = fn;
          if (deletionQueue.length && delayFunction) {
            delayFunction(flushPendingDeletes);
          }
        }
        function init_embind() {
          Module["getInheritedInstanceCount"] = getInheritedInstanceCount;
          Module["getLiveInheritedInstances"] = getLiveInheritedInstances;
          Module["flushPendingDeletes"] = flushPendingDeletes;
          Module["setDelayFunction"] = setDelayFunction;
        }
        var registeredInstances = {};
        function getBasestPointer(class_, ptr) {
          if (ptr === void 0) {
            throwBindingError("ptr should not be undefined");
          }
          while (class_.baseClass) {
            ptr = class_.upcast(ptr);
            class_ = class_.baseClass;
          }
          return ptr;
        }
        function getInheritedInstance(class_, ptr) {
          ptr = getBasestPointer(class_, ptr);
          return registeredInstances[ptr];
        }
        function makeClassHandle(prototype, record) {
          if (!record.ptrType || !record.ptr) {
            throwInternalError("makeClassHandle requires ptr and ptrType");
          }
          var hasSmartPtrType = !!record.smartPtrType;
          var hasSmartPtr = !!record.smartPtr;
          if (hasSmartPtrType !== hasSmartPtr) {
            throwInternalError("Both smartPtrType and smartPtr must be specified");
          }
          record.count = { value: 1 };
          return attachFinalizer(Object.create(prototype, { $$: { value: record } }));
        }
        function RegisteredPointer_fromWireType(ptr) {
          var rawPointer = this.getPointee(ptr);
          if (!rawPointer) {
            this.destructor(ptr);
            return null;
          }
          var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
          if (void 0 !== registeredInstance) {
            if (0 === registeredInstance.$$.count.value) {
              registeredInstance.$$.ptr = rawPointer;
              registeredInstance.$$.smartPtr = ptr;
              return registeredInstance["clone"]();
            } else {
              var rv = registeredInstance["clone"]();
              this.destructor(ptr);
              return rv;
            }
          }
          function makeDefaultHandle() {
            if (this.isSmartPointer) {
              return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this.pointeeType, ptr: rawPointer, smartPtrType: this, smartPtr: ptr });
            } else {
              return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this, ptr });
            }
          }
          var actualType = this.registeredClass.getActualType(rawPointer);
          var registeredPointerRecord = registeredPointers[actualType];
          if (!registeredPointerRecord) {
            return makeDefaultHandle.call(this);
          }
          var toType;
          if (this.isConst) {
            toType = registeredPointerRecord.constPointerType;
          } else {
            toType = registeredPointerRecord.pointerType;
          }
          var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
          if (dp === null) {
            return makeDefaultHandle.call(this);
          }
          if (this.isSmartPointer) {
            return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp, smartPtrType: this, smartPtr: ptr });
          } else {
            return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp });
          }
        }
        function init_RegisteredPointer() {
          RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
          RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
          RegisteredPointer.prototype["argPackAdvance"] = 8;
          RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
          RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
          RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType;
        }
        function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
          this.name = name;
          this.registeredClass = registeredClass;
          this.isReference = isReference;
          this.isConst = isConst;
          this.isSmartPointer = isSmartPointer;
          this.pointeeType = pointeeType;
          this.sharingPolicy = sharingPolicy;
          this.rawGetPointee = rawGetPointee;
          this.rawConstructor = rawConstructor;
          this.rawShare = rawShare;
          this.rawDestructor = rawDestructor;
          if (!isSmartPointer && registeredClass.baseClass === void 0) {
            if (isConst) {
              this["toWireType"] = constNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
            } else {
              this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
            }
          } else {
            this["toWireType"] = genericPointerToWireType;
          }
        }
        function replacePublicSymbol(name, value, numArguments) {
          if (!Module.hasOwnProperty(name)) {
            throwInternalError("Replacing nonexistant public symbol");
          }
          if (void 0 !== Module[name].overloadTable && void 0 !== numArguments) {
            Module[name].overloadTable[numArguments] = value;
          } else {
            Module[name] = value;
            Module[name].argCount = numArguments;
          }
        }
        function dynCallLegacy(sig, ptr, args) {
          var f = Module["dynCall_" + sig];
          return args && args.length ? f.apply(null, [ptr].concat(args)) : f.call(null, ptr);
        }
        function dynCall(sig, ptr, args) {
          if (sig.indexOf("j") != -1) {
            return dynCallLegacy(sig, ptr, args);
          }
          return wasmTable.get(ptr).apply(null, args);
        }
        function getDynCaller(sig, ptr) {
          var argCache = [];
          return function() {
            argCache.length = arguments.length;
            for (var i = 0; i < arguments.length; i++) {
              argCache[i] = arguments[i];
            }
            return dynCall(sig, ptr, argCache);
          };
        }
        function embind__requireFunction(signature, rawFunction) {
          signature = readLatin1String(signature);
          function makeDynCaller() {
            if (signature.indexOf("j") != -1) {
              return getDynCaller(signature, rawFunction);
            }
            return wasmTable.get(rawFunction);
          }
          var fp = makeDynCaller();
          if (typeof fp !== "function") {
            throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
          }
          return fp;
        }
        var UnboundTypeError = void 0;
        function getTypeName(type) {
          var ptr = ___getTypeName(type);
          var rv = readLatin1String(ptr);
          _free(ptr);
          return rv;
        }
        function throwUnboundTypeError(message, types) {
          var unboundTypes = [];
          var seen = {};
          function visit(type) {
            if (seen[type]) {
              return;
            }
            if (registeredTypes[type]) {
              return;
            }
            if (typeDependencies[type]) {
              typeDependencies[type].forEach(visit);
              return;
            }
            unboundTypes.push(type);
            seen[type] = true;
          }
          types.forEach(visit);
          throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]));
        }
        function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
          name = readLatin1String(name);
          getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
          if (upcast) {
            upcast = embind__requireFunction(upcastSignature, upcast);
          }
          if (downcast) {
            downcast = embind__requireFunction(downcastSignature, downcast);
          }
          rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
          var legalFunctionName = makeLegalFunctionName(name);
          exposePublicSymbol(legalFunctionName, function() {
            throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [baseClassRawType]);
          });
          whenDependentTypesAreResolved([rawType, rawPointerType, rawConstPointerType], baseClassRawType ? [baseClassRawType] : [], function(base) {
            base = base[0];
            var baseClass;
            var basePrototype;
            if (baseClassRawType) {
              baseClass = base.registeredClass;
              basePrototype = baseClass.instancePrototype;
            } else {
              basePrototype = ClassHandle.prototype;
            }
            var constructor = createNamedFunction(legalFunctionName, function() {
              if (Object.getPrototypeOf(this) !== instancePrototype) {
                throw new BindingError("Use 'new' to construct " + name);
              }
              if (void 0 === registeredClass.constructor_body) {
                throw new BindingError(name + " has no accessible constructor");
              }
              var body = registeredClass.constructor_body[arguments.length];
              if (void 0 === body) {
                throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
              }
              return body.apply(this, arguments);
            });
            var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
            constructor.prototype = instancePrototype;
            var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
            var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
            var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
            var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
            registeredPointers[rawType] = { pointerType: pointerConverter, constPointerType: constPointerConverter };
            replacePublicSymbol(legalFunctionName, constructor);
            return [referenceConverter, pointerConverter, constPointerConverter];
          });
        }
        function heap32VectorToArray(count, firstElement) {
          var array = [];
          for (var i = 0; i < count; i++) {
            array.push(HEAP32[(firstElement >> 2) + i]);
          }
          return array;
        }
        function __embind_register_class_constructor(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
          assert(argCount > 0);
          var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
          invoker = embind__requireFunction(invokerSignature, invoker);
          var args = [rawConstructor];
          var destructors = [];
          whenDependentTypesAreResolved([], [rawClassType], function(classType) {
            classType = classType[0];
            var humanName = "constructor " + classType.name;
            if (void 0 === classType.registeredClass.constructor_body) {
              classType.registeredClass.constructor_body = [];
            }
            if (void 0 !== classType.registeredClass.constructor_body[argCount - 1]) {
              throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount - 1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
            }
            classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
              throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes);
            };
            whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
              classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                if (arguments.length !== argCount - 1) {
                  throwBindingError(humanName + " called with " + arguments.length + " arguments, expected " + (argCount - 1));
                }
                destructors.length = 0;
                args.length = argCount;
                for (var i = 1; i < argCount; ++i) {
                  args[i] = argTypes[i]["toWireType"](destructors, arguments[i - 1]);
                }
                var ptr = invoker.apply(null, args);
                runDestructors(destructors);
                return argTypes[0]["fromWireType"](ptr);
              };
              return [];
            });
            return [];
          });
        }
        function new_(constructor, argumentList) {
          if (!(constructor instanceof Function)) {
            throw new TypeError("new_ called with constructor type " + typeof constructor + " which is not a function");
          }
          var dummy = createNamedFunction(constructor.name || "unknownFunctionName", function() {
          });
          dummy.prototype = constructor.prototype;
          var obj = new dummy();
          var r = constructor.apply(obj, argumentList);
          return r instanceof Object ? r : obj;
        }
        function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
          var argCount = argTypes.length;
          if (argCount < 2) {
            throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
          }
          var isClassMethodFunc = argTypes[1] !== null && classType !== null;
          var needsDestructorStack = false;
          for (var i = 1; i < argTypes.length; ++i) {
            if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
              needsDestructorStack = true;
              break;
            }
          }
          var returns = argTypes[0].name !== "void";
          var argsList = "";
          var argsListWired = "";
          for (var i = 0; i < argCount - 2; ++i) {
            argsList += (i !== 0 ? ", " : "") + "arg" + i;
            argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired";
          }
          var invokerFnBody = "return function " + makeLegalFunctionName(humanName) + "(" + argsList + ") {\nif (arguments.length !== " + (argCount - 2) + ") {\nthrowBindingError('function " + humanName + " called with ' + arguments.length + ' arguments, expected " + (argCount - 2) + " args!');\n}\n";
          if (needsDestructorStack) {
            invokerFnBody += "var destructors = [];\n";
          }
          var dtorStack = needsDestructorStack ? "destructors" : "null";
          var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
          var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
          if (isClassMethodFunc) {
            invokerFnBody += "var thisWired = classParam.toWireType(" + dtorStack + ", this);\n";
          }
          for (var i = 0; i < argCount - 2; ++i) {
            invokerFnBody += "var arg" + i + "Wired = argType" + i + ".toWireType(" + dtorStack + ", arg" + i + "); // " + argTypes[i + 2].name + "\n";
            args1.push("argType" + i);
            args2.push(argTypes[i + 2]);
          }
          if (isClassMethodFunc) {
            argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
          }
          invokerFnBody += (returns ? "var rv = " : "") + "invoker(fn" + (argsListWired.length > 0 ? ", " : "") + argsListWired + ");\n";
          if (needsDestructorStack) {
            invokerFnBody += "runDestructors(destructors);\n";
          } else {
            for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
              var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
              if (argTypes[i].destructorFunction !== null) {
                invokerFnBody += paramName + "_dtor(" + paramName + "); // " + argTypes[i].name + "\n";
                args1.push(paramName + "_dtor");
                args2.push(argTypes[i].destructorFunction);
              }
            }
          }
          if (returns) {
            invokerFnBody += "var ret = retType.fromWireType(rv);\nreturn ret;\n";
          } else {
          }
          invokerFnBody += "}\n";
          args1.push(invokerFnBody);
          var invokerFunction = new_(Function, args1).apply(null, args2);
          return invokerFunction;
        }
        function __embind_register_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual) {
          var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
          methodName = readLatin1String(methodName);
          rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
          whenDependentTypesAreResolved([], [rawClassType], function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + methodName;
            if (isPureVirtual) {
              classType.registeredClass.pureVirtualFunctions.push(methodName);
            }
            function unboundTypesHandler() {
              throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes);
            }
            var proto = classType.registeredClass.instancePrototype;
            var method = proto[methodName];
            if (void 0 === method || void 0 === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
              unboundTypesHandler.argCount = argCount - 2;
              unboundTypesHandler.className = classType.name;
              proto[methodName] = unboundTypesHandler;
            } else {
              ensureOverloadTable(proto, methodName, humanName);
              proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
            }
            whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
              var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
              if (void 0 === proto[methodName].overloadTable) {
                memberFunction.argCount = argCount - 2;
                proto[methodName] = memberFunction;
              } else {
                proto[methodName].overloadTable[argCount - 2] = memberFunction;
              }
              return [];
            });
            return [];
          });
        }
        function __embind_register_constant(name, type, value) {
          name = readLatin1String(name);
          whenDependentTypesAreResolved([], [type], function(type2) {
            type2 = type2[0];
            Module[name] = type2["fromWireType"](value);
            return [];
          });
        }
        var emval_free_list = [];
        var emval_handle_array = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }];
        function __emval_decref(handle) {
          if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
            emval_handle_array[handle] = void 0;
            emval_free_list.push(handle);
          }
        }
        function count_emval_handles() {
          var count = 0;
          for (var i = 5; i < emval_handle_array.length; ++i) {
            if (emval_handle_array[i] !== void 0) {
              ++count;
            }
          }
          return count;
        }
        function get_first_emval() {
          for (var i = 5; i < emval_handle_array.length; ++i) {
            if (emval_handle_array[i] !== void 0) {
              return emval_handle_array[i];
            }
          }
          return null;
        }
        function init_emval() {
          Module["count_emval_handles"] = count_emval_handles;
          Module["get_first_emval"] = get_first_emval;
        }
        function __emval_register(value) {
          switch (value) {
            case void 0: {
              return 1;
            }
            case null: {
              return 2;
            }
            case true: {
              return 3;
            }
            case false: {
              return 4;
            }
            default: {
              var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
              emval_handle_array[handle] = { refcount: 1, value };
              return handle;
            }
          }
        }
        function __embind_register_emval(rawType, name) {
          name = readLatin1String(name);
          registerType(rawType, { name, "fromWireType": function(handle) {
            var rv = emval_handle_array[handle].value;
            __emval_decref(handle);
            return rv;
          }, "toWireType": function(destructors, value) {
            return __emval_register(value);
          }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: null });
        }
        function enumReadValueFromPointer(name, shift, signed) {
          switch (shift) {
            case 0:
              return function(pointer) {
                var heap = signed ? HEAP8 : HEAPU8;
                return this["fromWireType"](heap[pointer]);
              };
            case 1:
              return function(pointer) {
                var heap = signed ? HEAP16 : HEAPU16;
                return this["fromWireType"](heap[pointer >> 1]);
              };
            case 2:
              return function(pointer) {
                var heap = signed ? HEAP32 : HEAPU32;
                return this["fromWireType"](heap[pointer >> 2]);
              };
            default:
              throw new TypeError("Unknown integer type: " + name);
          }
        }
        function __embind_register_enum(rawType, name, size, isSigned) {
          var shift = getShiftFromSize(size);
          name = readLatin1String(name);
          function ctor() {
          }
          ctor.values = {};
          registerType(rawType, { name, constructor: ctor, "fromWireType": function(c) {
            return this.constructor.values[c];
          }, "toWireType": function(destructors, c) {
            return c.value;
          }, "argPackAdvance": 8, "readValueFromPointer": enumReadValueFromPointer(name, shift, isSigned), destructorFunction: null });
          exposePublicSymbol(name, ctor);
        }
        function requireRegisteredType(rawType, humanName) {
          var impl = registeredTypes[rawType];
          if (void 0 === impl) {
            throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
          }
          return impl;
        }
        function __embind_register_enum_value(rawEnumType, name, enumValue) {
          var enumType = requireRegisteredType(rawEnumType, "enum");
          name = readLatin1String(name);
          var Enum = enumType.constructor;
          var Value = Object.create(enumType.constructor.prototype, { value: { value: enumValue }, constructor: { value: createNamedFunction(enumType.name + "_" + name, function() {
          }) } });
          Enum.values[enumValue] = Value;
          Enum[name] = Value;
        }
        function _embind_repr(v) {
          if (v === null) {
            return "null";
          }
          var t = typeof v;
          if (t === "object" || t === "array" || t === "function") {
            return v.toString();
          } else {
            return "" + v;
          }
        }
        function floatReadValueFromPointer(name, shift) {
          switch (shift) {
            case 2:
              return function(pointer) {
                return this["fromWireType"](HEAPF32[pointer >> 2]);
              };
            case 3:
              return function(pointer) {
                return this["fromWireType"](HEAPF64[pointer >> 3]);
              };
            default:
              throw new TypeError("Unknown float type: " + name);
          }
        }
        function __embind_register_float(rawType, name, size) {
          var shift = getShiftFromSize(size);
          name = readLatin1String(name);
          registerType(rawType, { name, "fromWireType": function(value) {
            return value;
          }, "toWireType": function(destructors, value) {
            if (typeof value !== "number" && typeof value !== "boolean") {
              throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
            }
            return value;
          }, "argPackAdvance": 8, "readValueFromPointer": floatReadValueFromPointer(name, shift), destructorFunction: null });
        }
        function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn) {
          var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
          name = readLatin1String(name);
          rawInvoker = embind__requireFunction(signature, rawInvoker);
          exposePublicSymbol(name, function() {
            throwUnboundTypeError("Cannot call " + name + " due to unbound types", argTypes);
          }, argCount - 1);
          whenDependentTypesAreResolved([], argTypes, function(argTypes2) {
            var invokerArgsArray = [argTypes2[0], null].concat(argTypes2.slice(1));
            replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn), argCount - 1);
            return [];
          });
        }
        function integerReadValueFromPointer(name, shift, signed) {
          switch (shift) {
            case 0:
              return signed ? function readS8FromPointer(pointer) {
                return HEAP8[pointer];
              } : function readU8FromPointer(pointer) {
                return HEAPU8[pointer];
              };
            case 1:
              return signed ? function readS16FromPointer(pointer) {
                return HEAP16[pointer >> 1];
              } : function readU16FromPointer(pointer) {
                return HEAPU16[pointer >> 1];
              };
            case 2:
              return signed ? function readS32FromPointer(pointer) {
                return HEAP32[pointer >> 2];
              } : function readU32FromPointer(pointer) {
                return HEAPU32[pointer >> 2];
              };
            default:
              throw new TypeError("Unknown integer type: " + name);
          }
        }
        function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
          name = readLatin1String(name);
          if (maxRange === -1) {
            maxRange = 4294967295;
          }
          var shift = getShiftFromSize(size);
          var fromWireType = function(value) {
            return value;
          };
          if (minRange === 0) {
            var bitshift = 32 - 8 * size;
            fromWireType = function(value) {
              return value << bitshift >>> bitshift;
            };
          }
          var isUnsignedType = name.indexOf("unsigned") != -1;
          registerType(primitiveType, { name, "fromWireType": fromWireType, "toWireType": function(destructors, value) {
            if (typeof value !== "number" && typeof value !== "boolean") {
              throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
            }
            if (value < minRange || value > maxRange) {
              throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ", " + maxRange + "]!");
            }
            return isUnsignedType ? value >>> 0 : value | 0;
          }, "argPackAdvance": 8, "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0), destructorFunction: null });
        }
        function __embind_register_memory_view(rawType, dataTypeIndex, name) {
          var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
          var TA = typeMapping[dataTypeIndex];
          function decodeMemoryView(handle) {
            handle = handle >> 2;
            var heap = HEAPU32;
            var size = heap[handle];
            var data = heap[handle + 1];
            return new TA(buffer, data, size);
          }
          name = readLatin1String(name);
          registerType(rawType, { name, "fromWireType": decodeMemoryView, "argPackAdvance": 8, "readValueFromPointer": decodeMemoryView }, { ignoreDuplicateRegistrations: true });
        }
        function __embind_register_std_string(rawType, name) {
          name = readLatin1String(name);
          var stdStringIsUTF8 = name === "std::string";
          registerType(rawType, { name, "fromWireType": function(value) {
            var length = HEAPU32[value >> 2];
            var str;
            if (stdStringIsUTF8) {
              var decodeStartPtr = value + 4;
              for (var i = 0; i <= length; ++i) {
                var currentBytePtr = value + 4 + i;
                if (i == length || HEAPU8[currentBytePtr] == 0) {
                  var maxRead = currentBytePtr - decodeStartPtr;
                  var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                  if (str === void 0) {
                    str = stringSegment;
                  } else {
                    str += String.fromCharCode(0);
                    str += stringSegment;
                  }
                  decodeStartPtr = currentBytePtr + 1;
                }
              }
            } else {
              var a = new Array(length);
              for (var i = 0; i < length; ++i) {
                a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
              }
              str = a.join("");
            }
            _free(value);
            return str;
          }, "toWireType": function(destructors, value) {
            if (value instanceof ArrayBuffer) {
              value = new Uint8Array(value);
            }
            var getLength;
            var valueIsOfTypeString = typeof value === "string";
            if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
              throwBindingError("Cannot pass non-string to std::string");
            }
            if (stdStringIsUTF8 && valueIsOfTypeString) {
              getLength = function() {
                return lengthBytesUTF8(value);
              };
            } else {
              getLength = function() {
                return value.length;
              };
            }
            var length = getLength();
            var ptr = _malloc(4 + length + 1);
            HEAPU32[ptr >> 2] = length;
            if (stdStringIsUTF8 && valueIsOfTypeString) {
              stringToUTF8(value, ptr + 4, length + 1);
            } else {
              if (valueIsOfTypeString) {
                for (var i = 0; i < length; ++i) {
                  var charCode = value.charCodeAt(i);
                  if (charCode > 255) {
                    _free(ptr);
                    throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
                  }
                  HEAPU8[ptr + 4 + i] = charCode;
                }
              } else {
                for (var i = 0; i < length; ++i) {
                  HEAPU8[ptr + 4 + i] = value[i];
                }
              }
            }
            if (destructors !== null) {
              destructors.push(_free, ptr);
            }
            return ptr;
          }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
            _free(ptr);
          } });
        }
        function __embind_register_std_wstring(rawType, charSize, name) {
          name = readLatin1String(name);
          var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
          if (charSize === 2) {
            decodeString = UTF16ToString;
            encodeString = stringToUTF16;
            lengthBytesUTF = lengthBytesUTF16;
            getHeap = function() {
              return HEAPU16;
            };
            shift = 1;
          } else if (charSize === 4) {
            decodeString = UTF32ToString;
            encodeString = stringToUTF32;
            lengthBytesUTF = lengthBytesUTF32;
            getHeap = function() {
              return HEAPU32;
            };
            shift = 2;
          }
          registerType(rawType, { name, "fromWireType": function(value) {
            var length = HEAPU32[value >> 2];
            var HEAP = getHeap();
            var str;
            var decodeStartPtr = value + 4;
            for (var i = 0; i <= length; ++i) {
              var currentBytePtr = value + 4 + i * charSize;
              if (i == length || HEAP[currentBytePtr >> shift] == 0) {
                var maxReadBytes = currentBytePtr - decodeStartPtr;
                var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
                if (str === void 0) {
                  str = stringSegment;
                } else {
                  str += String.fromCharCode(0);
                  str += stringSegment;
                }
                decodeStartPtr = currentBytePtr + charSize;
              }
            }
            _free(value);
            return str;
          }, "toWireType": function(destructors, value) {
            if (!(typeof value === "string")) {
              throwBindingError("Cannot pass non-string to C++ string type " + name);
            }
            var length = lengthBytesUTF(value);
            var ptr = _malloc(4 + length + charSize);
            HEAPU32[ptr >> 2] = length >> shift;
            encodeString(value, ptr + 4, length + charSize);
            if (destructors !== null) {
              destructors.push(_free, ptr);
            }
            return ptr;
          }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
            _free(ptr);
          } });
        }
        function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
          structRegistrations[rawType] = { name: readLatin1String(name), rawConstructor: embind__requireFunction(constructorSignature, rawConstructor), rawDestructor: embind__requireFunction(destructorSignature, rawDestructor), fields: [] };
        }
        function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
          structRegistrations[structType].fields.push({ fieldName: readLatin1String(fieldName), getterReturnType, getter: embind__requireFunction(getterSignature, getter), getterContext, setterArgumentType, setter: embind__requireFunction(setterSignature, setter), setterContext });
        }
        function __embind_register_void(rawType, name) {
          name = readLatin1String(name);
          registerType(rawType, { isVoid: true, name, "argPackAdvance": 0, "fromWireType": function() {
            return void 0;
          }, "toWireType": function(destructors, o) {
            return void 0;
          } });
        }
        function requireHandle(handle) {
          if (!handle) {
            throwBindingError("Cannot use deleted val. handle = " + handle);
          }
          return emval_handle_array[handle].value;
        }
        function __emval_as(handle, returnType, destructorsRef) {
          handle = requireHandle(handle);
          returnType = requireRegisteredType(returnType, "emval::as");
          var destructors = [];
          var rd = __emval_register(destructors);
          HEAP32[destructorsRef >> 2] = rd;
          return returnType["toWireType"](destructors, handle);
        }
        var emval_symbols = {};
        function getStringOrSymbol(address) {
          var symbol = emval_symbols[address];
          if (symbol === void 0) {
            return readLatin1String(address);
          } else {
            return symbol;
          }
        }
        var emval_methodCallers = [];
        function __emval_call_void_method(caller, handle, methodName, args) {
          caller = emval_methodCallers[caller];
          handle = requireHandle(handle);
          methodName = getStringOrSymbol(methodName);
          caller(handle, methodName, null, args);
        }
        function emval_get_global() {
          if (typeof globalThis === "object") {
            return globalThis;
          }
          return function() {
            return Function;
          }()("return this")();
        }
        function __emval_get_global(name) {
          if (name === 0) {
            return __emval_register(emval_get_global());
          } else {
            name = getStringOrSymbol(name);
            return __emval_register(emval_get_global()[name]);
          }
        }
        function __emval_addMethodCaller(caller) {
          var id = emval_methodCallers.length;
          emval_methodCallers.push(caller);
          return id;
        }
        function __emval_lookupTypes(argCount, argTypes) {
          var a = new Array(argCount);
          for (var i = 0; i < argCount; ++i) {
            a[i] = requireRegisteredType(HEAP32[(argTypes >> 2) + i], "parameter " + i);
          }
          return a;
        }
        function __emval_get_method_caller(argCount, argTypes) {
          var types = __emval_lookupTypes(argCount, argTypes);
          var retType = types[0];
          var signatureName = retType.name + "_$" + types.slice(1).map(function(t) {
            return t.name;
          }).join("_") + "$";
          var params = ["retType"];
          var args = [retType];
          var argsList = "";
          for (var i = 0; i < argCount - 1; ++i) {
            argsList += (i !== 0 ? ", " : "") + "arg" + i;
            params.push("argType" + i);
            args.push(types[1 + i]);
          }
          var functionName = makeLegalFunctionName("methodCaller_" + signatureName);
          var functionBody = "return function " + functionName + "(handle, name, destructors, args) {\n";
          var offset = 0;
          for (var i = 0; i < argCount - 1; ++i) {
            functionBody += "    var arg" + i + " = argType" + i + ".readValueFromPointer(args" + (offset ? "+" + offset : "") + ");\n";
            offset += types[i + 1]["argPackAdvance"];
          }
          functionBody += "    var rv = handle[name](" + argsList + ");\n";
          for (var i = 0; i < argCount - 1; ++i) {
            if (types[i + 1]["deleteObject"]) {
              functionBody += "    argType" + i + ".deleteObject(arg" + i + ");\n";
            }
          }
          if (!retType.isVoid) {
            functionBody += "    return retType.toWireType(destructors, rv);\n";
          }
          functionBody += "};\n";
          params.push(functionBody);
          var invokerFunction = new_(Function, params).apply(null, args);
          return __emval_addMethodCaller(invokerFunction);
        }
        function __emval_get_module_property(name) {
          name = getStringOrSymbol(name);
          return __emval_register(Module[name]);
        }
        function __emval_get_property(handle, key2) {
          handle = requireHandle(handle);
          key2 = requireHandle(key2);
          return __emval_register(handle[key2]);
        }
        function __emval_incref(handle) {
          if (handle > 4) {
            emval_handle_array[handle].refcount += 1;
          }
        }
        function craftEmvalAllocator(argCount) {
          var argsList = "";
          for (var i = 0; i < argCount; ++i) {
            argsList += (i !== 0 ? ", " : "") + "arg" + i;
          }
          var functionBody = "return function emval_allocator_" + argCount + "(constructor, argTypes, args) {\n";
          for (var i = 0; i < argCount; ++i) {
            functionBody += "var argType" + i + " = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + " + i + '], "parameter ' + i + '");\nvar arg' + i + " = argType" + i + ".readValueFromPointer(args);\nargs += argType" + i + "['argPackAdvance'];\n";
          }
          functionBody += "var obj = new constructor(" + argsList + ");\nreturn __emval_register(obj);\n}\n";
          return new Function("requireRegisteredType", "Module", "__emval_register", functionBody)(requireRegisteredType, Module, __emval_register);
        }
        var emval_newers = {};
        function __emval_new(handle, argCount, argTypes, args) {
          handle = requireHandle(handle);
          var newer = emval_newers[argCount];
          if (!newer) {
            newer = craftEmvalAllocator(argCount);
            emval_newers[argCount] = newer;
          }
          return newer(handle, argTypes, args);
        }
        function __emval_new_cstring(v) {
          return __emval_register(getStringOrSymbol(v));
        }
        function __emval_run_destructors(handle) {
          var destructors = emval_handle_array[handle].value;
          runDestructors(destructors);
          __emval_decref(handle);
        }
        function _abort() {
          abort();
        }
        function _emscripten_memcpy_big(dest, src, num) {
          HEAPU8.copyWithin(dest, src, src + num);
        }
        function emscripten_realloc_buffer(size) {
          try {
            wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
            updateGlobalBufferAndViews(wasmMemory.buffer);
            return 1;
          } catch (e) {
          }
        }
        function _emscripten_resize_heap(requestedSize) {
          var oldSize = HEAPU8.length;
          requestedSize = requestedSize >>> 0;
          var maxHeapSize = 2147483648;
          if (requestedSize > maxHeapSize) {
            return false;
          }
          for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
            var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
            overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
            var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
            var replacement = emscripten_realloc_buffer(newSize);
            if (replacement) {
              return true;
            }
          }
          return false;
        }
        var SYSCALLS = { mappings: {}, buffers: [null, [], []], printChar: function(stream, curr) {
          var buffer2 = SYSCALLS.buffers[stream];
          if (curr === 0 || curr === 10) {
            (stream === 1 ? out : err)(UTF8ArrayToString(buffer2, 0));
            buffer2.length = 0;
          } else {
            buffer2.push(curr);
          }
        }, varargs: void 0, get: function() {
          SYSCALLS.varargs += 4;
          var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
          return ret;
        }, getStr: function(ptr) {
          var ret = UTF8ToString(ptr);
          return ret;
        }, get64: function(low, high) {
          return low;
        } };
        function _fd_close(fd) {
          return 0;
        }
        function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
        }
        function _fd_write(fd, iov, iovcnt, pnum) {
          var num = 0;
          for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            for (var j = 0; j < len; j++) {
              SYSCALLS.printChar(fd, HEAPU8[ptr + j]);
            }
            num += len;
          }
          HEAP32[pnum >> 2] = num;
          return 0;
        }
        function _setTempRet0($i) {
          setTempRet0($i | 0);
        }
        InternalError = Module["InternalError"] = extendError(Error, "InternalError");
        embind_init_charCodes();
        BindingError = Module["BindingError"] = extendError(Error, "BindingError");
        init_ClassHandle();
        init_RegisteredPointer();
        init_embind();
        UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
        init_emval();
        var asmLibraryArg = { "t": __embind_finalize_value_object, "I": __embind_register_bool, "x": __embind_register_class, "w": __embind_register_class_constructor, "d": __embind_register_class_function, "k": __embind_register_constant, "H": __embind_register_emval, "n": __embind_register_enum, "a": __embind_register_enum_value, "A": __embind_register_float, "i": __embind_register_function, "j": __embind_register_integer, "h": __embind_register_memory_view, "B": __embind_register_std_string, "v": __embind_register_std_wstring, "u": __embind_register_value_object, "c": __embind_register_value_object_field, "J": __embind_register_void, "m": __emval_as, "s": __emval_call_void_method, "b": __emval_decref, "y": __emval_get_global, "p": __emval_get_method_caller, "r": __emval_get_module_property, "e": __emval_get_property, "g": __emval_incref, "q": __emval_new, "f": __emval_new_cstring, "l": __emval_run_destructors, "o": _abort, "E": _emscripten_memcpy_big, "F": _emscripten_resize_heap, "G": _fd_close, "C": _fd_seek, "z": _fd_write, "D": _setTempRet0 };
        var asm = createWasm();
        var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
          return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["L"]).apply(null, arguments);
        };
        var _malloc = Module["_malloc"] = function() {
          return (_malloc = Module["_malloc"] = Module["asm"]["M"]).apply(null, arguments);
        };
        var _free = Module["_free"] = function() {
          return (_free = Module["_free"] = Module["asm"]["N"]).apply(null, arguments);
        };
        var ___getTypeName = Module["___getTypeName"] = function() {
          return (___getTypeName = Module["___getTypeName"] = Module["asm"]["P"]).apply(null, arguments);
        };
        var ___embind_register_native_and_builtin_types = Module["___embind_register_native_and_builtin_types"] = function() {
          return (___embind_register_native_and_builtin_types = Module["___embind_register_native_and_builtin_types"] = Module["asm"]["Q"]).apply(null, arguments);
        };
        var dynCall_jiji = Module["dynCall_jiji"] = function() {
          return (dynCall_jiji = Module["dynCall_jiji"] = Module["asm"]["R"]).apply(null, arguments);
        };
        var calledRun;
        function ExitStatus(status) {
          this.name = "ExitStatus";
          this.message = "Program terminated with exit(" + status + ")";
          this.status = status;
        }
        dependenciesFulfilled = function runCaller() {
          if (!calledRun)
            run();
          if (!calledRun)
            dependenciesFulfilled = runCaller;
        };
        function run(args) {
          args = args || arguments_;
          if (runDependencies > 0) {
            return;
          }
          preRun();
          if (runDependencies > 0) {
            return;
          }
          function doRun() {
            if (calledRun)
              return;
            calledRun = true;
            Module["calledRun"] = true;
            if (ABORT)
              return;
            initRuntime();
            preMain();
            readyPromiseResolve(Module);
            if (Module["onRuntimeInitialized"])
              Module["onRuntimeInitialized"]();
            postRun();
          }
          if (Module["setStatus"]) {
            Module["setStatus"]("Running...");
            setTimeout(function() {
              setTimeout(function() {
                Module["setStatus"]("");
              }, 1);
              doRun();
            }, 1);
          } else {
            doRun();
          }
        }
        Module["run"] = run;
        if (Module["preInit"]) {
          if (typeof Module["preInit"] == "function")
            Module["preInit"] = [Module["preInit"]];
          while (Module["preInit"].length > 0) {
            Module["preInit"].pop()();
          }
        }
        run();
        return BASIS2.ready;
      };
    }();
    if (typeof exports === "object" && typeof module === "object")
      module.exports = BASIS;
    else if (typeof define === "function" && define["amd"])
      define([], function() {
        return BASIS;
      });
    else if (typeof exports === "object")
      exports["BASIS"] = BASIS;
  }
});

// packages/engine/Source/Renderer/PixelDatatype.js
var PixelDatatype = {
  UNSIGNED_BYTE: WebGLConstants_default.UNSIGNED_BYTE,
  UNSIGNED_SHORT: WebGLConstants_default.UNSIGNED_SHORT,
  UNSIGNED_INT: WebGLConstants_default.UNSIGNED_INT,
  FLOAT: WebGLConstants_default.FLOAT,
  HALF_FLOAT: WebGLConstants_default.HALF_FLOAT_OES,
  UNSIGNED_INT_24_8: WebGLConstants_default.UNSIGNED_INT_24_8,
  UNSIGNED_SHORT_4_4_4_4: WebGLConstants_default.UNSIGNED_SHORT_4_4_4_4,
  UNSIGNED_SHORT_5_5_5_1: WebGLConstants_default.UNSIGNED_SHORT_5_5_5_1,
  UNSIGNED_SHORT_5_6_5: WebGLConstants_default.UNSIGNED_SHORT_5_6_5
};
PixelDatatype.toWebGLConstant = function(pixelDatatype, context) {
  switch (pixelDatatype) {
    case PixelDatatype.UNSIGNED_BYTE:
      return WebGLConstants_default.UNSIGNED_BYTE;
    case PixelDatatype.UNSIGNED_SHORT:
      return WebGLConstants_default.UNSIGNED_SHORT;
    case PixelDatatype.UNSIGNED_INT:
      return WebGLConstants_default.UNSIGNED_INT;
    case PixelDatatype.FLOAT:
      return WebGLConstants_default.FLOAT;
    case PixelDatatype.HALF_FLOAT:
      return context.webgl2 ? WebGLConstants_default.HALF_FLOAT : WebGLConstants_default.HALF_FLOAT_OES;
    case PixelDatatype.UNSIGNED_INT_24_8:
      return WebGLConstants_default.UNSIGNED_INT_24_8;
    case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
      return WebGLConstants_default.UNSIGNED_SHORT_4_4_4_4;
    case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
      return WebGLConstants_default.UNSIGNED_SHORT_5_5_5_1;
    case PixelDatatype.UNSIGNED_SHORT_5_6_5:
      return PixelDatatype.UNSIGNED_SHORT_5_6_5;
  }
};
PixelDatatype.isPacked = function(pixelDatatype) {
  return pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8 || pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4 || pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1 || pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5;
};
PixelDatatype.sizeInBytes = function(pixelDatatype) {
  switch (pixelDatatype) {
    case PixelDatatype.UNSIGNED_BYTE:
      return 1;
    case PixelDatatype.UNSIGNED_SHORT:
    case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
    case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
    case PixelDatatype.UNSIGNED_SHORT_5_6_5:
    case PixelDatatype.HALF_FLOAT:
      return 2;
    case PixelDatatype.UNSIGNED_INT:
    case PixelDatatype.FLOAT:
    case PixelDatatype.UNSIGNED_INT_24_8:
      return 4;
  }
};
PixelDatatype.validate = function(pixelDatatype) {
  return pixelDatatype === PixelDatatype.UNSIGNED_BYTE || pixelDatatype === PixelDatatype.UNSIGNED_SHORT || pixelDatatype === PixelDatatype.UNSIGNED_INT || pixelDatatype === PixelDatatype.FLOAT || pixelDatatype === PixelDatatype.HALF_FLOAT || pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8 || pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4 || pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1 || pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5;
};
var PixelDatatype_default = Object.freeze(PixelDatatype);

// packages/engine/Source/Core/PixelFormat.js
var PixelFormat = {
  /**
   * A pixel format containing a depth value.
   *
   * @type {number}
   * @constant
   */
  DEPTH_COMPONENT: WebGLConstants_default.DEPTH_COMPONENT,
  /**
   * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
   *
   * @type {number}
   * @constant
   */
  DEPTH_STENCIL: WebGLConstants_default.DEPTH_STENCIL,
  /**
   * A pixel format containing an alpha channel.
   *
   * @type {number}
   * @constant
   */
  ALPHA: WebGLConstants_default.ALPHA,
  /**
   * A pixel format containing a red channel
   *
   * @type {number}
   * @constant
   */
  RED: WebGLConstants_default.RED,
  /**
   * A pixel format containing red and green channels.
   *
   * @type {number}
   * @constant
   */
  RG: WebGLConstants_default.RG,
  /**
   * A pixel format containing red, green, and blue channels.
   *
   * @type {number}
   * @constant
   */
  RGB: WebGLConstants_default.RGB,
  /**
   * A pixel format containing red, green, blue, and alpha channels.
   *
   * @type {number}
   * @constant
   */
  RGBA: WebGLConstants_default.RGBA,
  /**
   * A pixel format containing a luminance (intensity) channel.
   *
   * @type {number}
   * @constant
   */
  LUMINANCE: WebGLConstants_default.LUMINANCE,
  /**
   * A pixel format containing luminance (intensity) and alpha channels.
   *
   * @type {number}
   * @constant
   */
  LUMINANCE_ALPHA: WebGLConstants_default.LUMINANCE_ALPHA,
  /**
   * A pixel format containing red, green, and blue channels that is DXT1 compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_DXT1: WebGLConstants_default.COMPRESSED_RGB_S3TC_DXT1_EXT,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT1 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_DXT1: WebGLConstants_default.COMPRESSED_RGBA_S3TC_DXT1_EXT,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT3 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_DXT3: WebGLConstants_default.COMPRESSED_RGBA_S3TC_DXT3_EXT,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT5 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_DXT5: WebGLConstants_default.COMPRESSED_RGBA_S3TC_DXT5_EXT,
  /**
   * A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_PVRTC_4BPPV1: WebGLConstants_default.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
  /**
   * A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_PVRTC_2BPPV1: WebGLConstants_default.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_PVRTC_4BPPV1: WebGLConstants_default.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_PVRTC_2BPPV1: WebGLConstants_default.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is ASTC compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_ASTC: WebGLConstants_default.COMPRESSED_RGBA_ASTC_4x4_WEBGL,
  /**
   * A pixel format containing red, green, and blue channels that is ETC1 compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_ETC1: WebGLConstants_default.COMPRESSED_RGB_ETC1_WEBGL,
  /**
   * A pixel format containing red, green, and blue channels that is ETC2 compressed.
   *
   * @type {number}
   * @constant
   */
  RGB8_ETC2: WebGLConstants_default.COMPRESSED_RGB8_ETC2,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is ETC2 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA8_ETC2_EAC: WebGLConstants_default.COMPRESSED_RGBA8_ETC2_EAC,
  /**
   * A pixel format containing red, green, blue, and alpha channels that is BC7 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_BC7: WebGLConstants_default.COMPRESSED_RGBA_BPTC_UNORM
};
PixelFormat.componentsLength = function(pixelFormat) {
  switch (pixelFormat) {
    case PixelFormat.RGB:
      return 3;
    case PixelFormat.RGBA:
      return 4;
    case PixelFormat.LUMINANCE_ALPHA:
    case PixelFormat.RG:
      return 2;
    case PixelFormat.ALPHA:
    case PixelFormat.RED:
    case PixelFormat.LUMINANCE:
      return 1;
    default:
      return 1;
  }
};
PixelFormat.validate = function(pixelFormat) {
  return pixelFormat === PixelFormat.DEPTH_COMPONENT || pixelFormat === PixelFormat.DEPTH_STENCIL || pixelFormat === PixelFormat.ALPHA || pixelFormat === PixelFormat.RED || pixelFormat === PixelFormat.RG || pixelFormat === PixelFormat.RGB || pixelFormat === PixelFormat.RGBA || pixelFormat === PixelFormat.LUMINANCE || pixelFormat === PixelFormat.LUMINANCE_ALPHA || pixelFormat === PixelFormat.RGB_DXT1 || pixelFormat === PixelFormat.RGBA_DXT1 || pixelFormat === PixelFormat.RGBA_DXT3 || pixelFormat === PixelFormat.RGBA_DXT5 || pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 || pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 || pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 || pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 || pixelFormat === PixelFormat.RGBA_ASTC || pixelFormat === PixelFormat.RGB_ETC1 || pixelFormat === PixelFormat.RGB8_ETC2 || pixelFormat === PixelFormat.RGBA8_ETC2_EAC || pixelFormat === PixelFormat.RGBA_BC7;
};
PixelFormat.isColorFormat = function(pixelFormat) {
  return pixelFormat === PixelFormat.ALPHA || pixelFormat === PixelFormat.RGB || pixelFormat === PixelFormat.RGBA || pixelFormat === PixelFormat.LUMINANCE || pixelFormat === PixelFormat.LUMINANCE_ALPHA;
};
PixelFormat.isDepthFormat = function(pixelFormat) {
  return pixelFormat === PixelFormat.DEPTH_COMPONENT || pixelFormat === PixelFormat.DEPTH_STENCIL;
};
PixelFormat.isCompressedFormat = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGB_DXT1 || pixelFormat === PixelFormat.RGBA_DXT1 || pixelFormat === PixelFormat.RGBA_DXT3 || pixelFormat === PixelFormat.RGBA_DXT5 || pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 || pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 || pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 || pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 || pixelFormat === PixelFormat.RGBA_ASTC || pixelFormat === PixelFormat.RGB_ETC1 || pixelFormat === PixelFormat.RGB8_ETC2 || pixelFormat === PixelFormat.RGBA8_ETC2_EAC || pixelFormat === PixelFormat.RGBA_BC7;
};
PixelFormat.isDXTFormat = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGB_DXT1 || pixelFormat === PixelFormat.RGBA_DXT1 || pixelFormat === PixelFormat.RGBA_DXT3 || pixelFormat === PixelFormat.RGBA_DXT5;
};
PixelFormat.isPVRTCFormat = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 || pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 || pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 || pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1;
};
PixelFormat.isASTCFormat = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGBA_ASTC;
};
PixelFormat.isETC1Format = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGB_ETC1;
};
PixelFormat.isETC2Format = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGB8_ETC2 || pixelFormat === PixelFormat.RGBA8_ETC2_EAC;
};
PixelFormat.isBC7Format = function(pixelFormat) {
  return pixelFormat === PixelFormat.RGBA_BC7;
};
PixelFormat.compressedTextureSizeInBytes = function(pixelFormat, width, height) {
  switch (pixelFormat) {
    case PixelFormat.RGB_DXT1:
    case PixelFormat.RGBA_DXT1:
    case PixelFormat.RGB_ETC1:
    case PixelFormat.RGB8_ETC2:
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;
    case PixelFormat.RGBA_DXT3:
    case PixelFormat.RGBA_DXT5:
    case PixelFormat.RGBA_ASTC:
    case PixelFormat.RGBA8_ETC2_EAC:
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;
    case PixelFormat.RGB_PVRTC_4BPPV1:
    case PixelFormat.RGBA_PVRTC_4BPPV1:
      return Math.floor((Math.max(width, 8) * Math.max(height, 8) * 4 + 7) / 8);
    case PixelFormat.RGB_PVRTC_2BPPV1:
    case PixelFormat.RGBA_PVRTC_2BPPV1:
      return Math.floor(
        (Math.max(width, 16) * Math.max(height, 8) * 2 + 7) / 8
      );
    case PixelFormat.RGBA_BC7:
      return Math.ceil(width / 4) * Math.ceil(height / 4) * 16;
    default:
      return 0;
  }
};
PixelFormat.textureSizeInBytes = function(pixelFormat, pixelDatatype, width, height) {
  let componentsLength = PixelFormat.componentsLength(pixelFormat);
  if (PixelDatatype_default.isPacked(pixelDatatype)) {
    componentsLength = 1;
  }
  return componentsLength * PixelDatatype_default.sizeInBytes(pixelDatatype) * width * height;
};
PixelFormat.alignmentInBytes = function(pixelFormat, pixelDatatype, width) {
  const mod = PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, width, 1) % 4;
  return mod === 0 ? 4 : mod === 2 ? 2 : 1;
};
PixelFormat.createTypedArray = function(pixelFormat, pixelDatatype, width, height) {
  let constructor;
  const sizeInBytes = PixelDatatype_default.sizeInBytes(pixelDatatype);
  if (sizeInBytes === Uint8Array.BYTES_PER_ELEMENT) {
    constructor = Uint8Array;
  } else if (sizeInBytes === Uint16Array.BYTES_PER_ELEMENT) {
    constructor = Uint16Array;
  } else if (sizeInBytes === Float32Array.BYTES_PER_ELEMENT && pixelDatatype === PixelDatatype_default.FLOAT) {
    constructor = Float32Array;
  } else {
    constructor = Uint32Array;
  }
  const size = PixelFormat.componentsLength(pixelFormat) * width * height;
  return new constructor(size);
};
PixelFormat.flipY = function(bufferView, pixelFormat, pixelDatatype, width, height) {
  if (height === 1) {
    return bufferView;
  }
  const flipped = PixelFormat.createTypedArray(
    pixelFormat,
    pixelDatatype,
    width,
    height
  );
  const numberOfComponents = PixelFormat.componentsLength(pixelFormat);
  const textureWidth = width * numberOfComponents;
  for (let i = 0; i < height; ++i) {
    const row = i * width * numberOfComponents;
    const flippedRow = (height - i - 1) * width * numberOfComponents;
    for (let j = 0; j < textureWidth; ++j) {
      flipped[flippedRow + j] = bufferView[row + j];
    }
  }
  return flipped;
};
PixelFormat.toInternalFormat = function(pixelFormat, pixelDatatype, context) {
  if (!context.webgl2) {
    return pixelFormat;
  }
  if (pixelFormat === PixelFormat.DEPTH_STENCIL) {
    return WebGLConstants_default.DEPTH24_STENCIL8;
  }
  if (pixelFormat === PixelFormat.DEPTH_COMPONENT) {
    if (pixelDatatype === PixelDatatype_default.UNSIGNED_SHORT) {
      return WebGLConstants_default.DEPTH_COMPONENT16;
    } else if (pixelDatatype === PixelDatatype_default.UNSIGNED_INT) {
      return WebGLConstants_default.DEPTH_COMPONENT24;
    }
  }
  if (pixelDatatype === PixelDatatype_default.FLOAT) {
    switch (pixelFormat) {
      case PixelFormat.RGBA:
        return WebGLConstants_default.RGBA32F;
      case PixelFormat.RGB:
        return WebGLConstants_default.RGB32F;
      case PixelFormat.RG:
        return WebGLConstants_default.RG32F;
      case PixelFormat.RED:
        return WebGLConstants_default.R32F;
    }
  }
  if (pixelDatatype === PixelDatatype_default.HALF_FLOAT) {
    switch (pixelFormat) {
      case PixelFormat.RGBA:
        return WebGLConstants_default.RGBA16F;
      case PixelFormat.RGB:
        return WebGLConstants_default.RGB16F;
      case PixelFormat.RG:
        return WebGLConstants_default.RG16F;
      case PixelFormat.RED:
        return WebGLConstants_default.R16F;
    }
  }
  return pixelFormat;
};
var PixelFormat_default = Object.freeze(PixelFormat);

// packages/engine/Source/Core/VulkanConstants.js
var VulkanConstants = {
  VK_FORMAT_UNDEFINED: 0,
  VK_FORMAT_R4G4_UNORM_PACK8: 1,
  VK_FORMAT_R4G4B4A4_UNORM_PACK16: 2,
  VK_FORMAT_B4G4R4A4_UNORM_PACK16: 3,
  VK_FORMAT_R5G6B5_UNORM_PACK16: 4,
  VK_FORMAT_B5G6R5_UNORM_PACK16: 5,
  VK_FORMAT_R5G5B5A1_UNORM_PACK16: 6,
  VK_FORMAT_B5G5R5A1_UNORM_PACK16: 7,
  VK_FORMAT_A1R5G5B5_UNORM_PACK16: 8,
  VK_FORMAT_R8_UNORM: 9,
  VK_FORMAT_R8_SNORM: 10,
  VK_FORMAT_R8_USCALED: 11,
  VK_FORMAT_R8_SSCALED: 12,
  VK_FORMAT_R8_UINT: 13,
  VK_FORMAT_R8_SINT: 14,
  VK_FORMAT_R8_SRGB: 15,
  VK_FORMAT_R8G8_UNORM: 16,
  VK_FORMAT_R8G8_SNORM: 17,
  VK_FORMAT_R8G8_USCALED: 18,
  VK_FORMAT_R8G8_SSCALED: 19,
  VK_FORMAT_R8G8_UINT: 20,
  VK_FORMAT_R8G8_SINT: 21,
  VK_FORMAT_R8G8_SRGB: 22,
  VK_FORMAT_R8G8B8_UNORM: 23,
  VK_FORMAT_R8G8B8_SNORM: 24,
  VK_FORMAT_R8G8B8_USCALED: 25,
  VK_FORMAT_R8G8B8_SSCALED: 26,
  VK_FORMAT_R8G8B8_UINT: 27,
  VK_FORMAT_R8G8B8_SINT: 28,
  VK_FORMAT_R8G8B8_SRGB: 29,
  VK_FORMAT_B8G8R8_UNORM: 30,
  VK_FORMAT_B8G8R8_SNORM: 31,
  VK_FORMAT_B8G8R8_USCALED: 32,
  VK_FORMAT_B8G8R8_SSCALED: 33,
  VK_FORMAT_B8G8R8_UINT: 34,
  VK_FORMAT_B8G8R8_SINT: 35,
  VK_FORMAT_B8G8R8_SRGB: 36,
  VK_FORMAT_R8G8B8A8_UNORM: 37,
  VK_FORMAT_R8G8B8A8_SNORM: 38,
  VK_FORMAT_R8G8B8A8_USCALED: 39,
  VK_FORMAT_R8G8B8A8_SSCALED: 40,
  VK_FORMAT_R8G8B8A8_UINT: 41,
  VK_FORMAT_R8G8B8A8_SINT: 42,
  VK_FORMAT_R8G8B8A8_SRGB: 43,
  VK_FORMAT_B8G8R8A8_UNORM: 44,
  VK_FORMAT_B8G8R8A8_SNORM: 45,
  VK_FORMAT_B8G8R8A8_USCALED: 46,
  VK_FORMAT_B8G8R8A8_SSCALED: 47,
  VK_FORMAT_B8G8R8A8_UINT: 48,
  VK_FORMAT_B8G8R8A8_SINT: 49,
  VK_FORMAT_B8G8R8A8_SRGB: 50,
  VK_FORMAT_A8B8G8R8_UNORM_PACK32: 51,
  VK_FORMAT_A8B8G8R8_SNORM_PACK32: 52,
  VK_FORMAT_A8B8G8R8_USCALED_PACK32: 53,
  VK_FORMAT_A8B8G8R8_SSCALED_PACK32: 54,
  VK_FORMAT_A8B8G8R8_UINT_PACK32: 55,
  VK_FORMAT_A8B8G8R8_SINT_PACK32: 56,
  VK_FORMAT_A8B8G8R8_SRGB_PACK32: 57,
  VK_FORMAT_A2R10G10B10_UNORM_PACK32: 58,
  VK_FORMAT_A2R10G10B10_SNORM_PACK32: 59,
  VK_FORMAT_A2R10G10B10_USCALED_PACK32: 60,
  VK_FORMAT_A2R10G10B10_SSCALED_PACK32: 61,
  VK_FORMAT_A2R10G10B10_UINT_PACK32: 62,
  VK_FORMAT_A2R10G10B10_SINT_PACK32: 63,
  VK_FORMAT_A2B10G10R10_UNORM_PACK32: 64,
  VK_FORMAT_A2B10G10R10_SNORM_PACK32: 65,
  VK_FORMAT_A2B10G10R10_USCALED_PACK32: 66,
  VK_FORMAT_A2B10G10R10_SSCALED_PACK32: 67,
  VK_FORMAT_A2B10G10R10_UINT_PACK32: 68,
  VK_FORMAT_A2B10G10R10_SINT_PACK32: 69,
  VK_FORMAT_R16_UNORM: 70,
  VK_FORMAT_R16_SNORM: 71,
  VK_FORMAT_R16_USCALED: 72,
  VK_FORMAT_R16_SSCALED: 73,
  VK_FORMAT_R16_UINT: 74,
  VK_FORMAT_R16_SINT: 75,
  VK_FORMAT_R16_SFLOAT: 76,
  VK_FORMAT_R16G16_UNORM: 77,
  VK_FORMAT_R16G16_SNORM: 78,
  VK_FORMAT_R16G16_USCALED: 79,
  VK_FORMAT_R16G16_SSCALED: 80,
  VK_FORMAT_R16G16_UINT: 81,
  VK_FORMAT_R16G16_SINT: 82,
  VK_FORMAT_R16G16_SFLOAT: 83,
  VK_FORMAT_R16G16B16_UNORM: 84,
  VK_FORMAT_R16G16B16_SNORM: 85,
  VK_FORMAT_R16G16B16_USCALED: 86,
  VK_FORMAT_R16G16B16_SSCALED: 87,
  VK_FORMAT_R16G16B16_UINT: 88,
  VK_FORMAT_R16G16B16_SINT: 89,
  VK_FORMAT_R16G16B16_SFLOAT: 90,
  VK_FORMAT_R16G16B16A16_UNORM: 91,
  VK_FORMAT_R16G16B16A16_SNORM: 92,
  VK_FORMAT_R16G16B16A16_USCALED: 93,
  VK_FORMAT_R16G16B16A16_SSCALED: 94,
  VK_FORMAT_R16G16B16A16_UINT: 95,
  VK_FORMAT_R16G16B16A16_SINT: 96,
  VK_FORMAT_R16G16B16A16_SFLOAT: 97,
  VK_FORMAT_R32_UINT: 98,
  VK_FORMAT_R32_SINT: 99,
  VK_FORMAT_R32_SFLOAT: 100,
  VK_FORMAT_R32G32_UINT: 101,
  VK_FORMAT_R32G32_SINT: 102,
  VK_FORMAT_R32G32_SFLOAT: 103,
  VK_FORMAT_R32G32B32_UINT: 104,
  VK_FORMAT_R32G32B32_SINT: 105,
  VK_FORMAT_R32G32B32_SFLOAT: 106,
  VK_FORMAT_R32G32B32A32_UINT: 107,
  VK_FORMAT_R32G32B32A32_SINT: 108,
  VK_FORMAT_R32G32B32A32_SFLOAT: 109,
  VK_FORMAT_R64_UINT: 110,
  VK_FORMAT_R64_SINT: 111,
  VK_FORMAT_R64_SFLOAT: 112,
  VK_FORMAT_R64G64_UINT: 113,
  VK_FORMAT_R64G64_SINT: 114,
  VK_FORMAT_R64G64_SFLOAT: 115,
  VK_FORMAT_R64G64B64_UINT: 116,
  VK_FORMAT_R64G64B64_SINT: 117,
  VK_FORMAT_R64G64B64_SFLOAT: 118,
  VK_FORMAT_R64G64B64A64_UINT: 119,
  VK_FORMAT_R64G64B64A64_SINT: 120,
  VK_FORMAT_R64G64B64A64_SFLOAT: 121,
  VK_FORMAT_B10G11R11_UFLOAT_PACK32: 122,
  VK_FORMAT_E5B9G9R9_UFLOAT_PACK32: 123,
  VK_FORMAT_D16_UNORM: 124,
  VK_FORMAT_X8_D24_UNORM_PACK32: 125,
  VK_FORMAT_D32_SFLOAT: 126,
  VK_FORMAT_S8_UINT: 127,
  VK_FORMAT_D16_UNORM_S8_UINT: 128,
  VK_FORMAT_D24_UNORM_S8_UINT: 129,
  VK_FORMAT_D32_SFLOAT_S8_UINT: 130,
  VK_FORMAT_BC1_RGB_UNORM_BLOCK: 131,
  VK_FORMAT_BC1_RGB_SRGB_BLOCK: 132,
  VK_FORMAT_BC1_RGBA_UNORM_BLOCK: 133,
  VK_FORMAT_BC1_RGBA_SRGB_BLOCK: 134,
  VK_FORMAT_BC2_UNORM_BLOCK: 135,
  VK_FORMAT_BC2_SRGB_BLOCK: 136,
  VK_FORMAT_BC3_UNORM_BLOCK: 137,
  VK_FORMAT_BC3_SRGB_BLOCK: 138,
  VK_FORMAT_BC4_UNORM_BLOCK: 139,
  VK_FORMAT_BC4_SNORM_BLOCK: 140,
  VK_FORMAT_BC5_UNORM_BLOCK: 141,
  VK_FORMAT_BC5_SNORM_BLOCK: 142,
  VK_FORMAT_BC6H_UFLOAT_BLOCK: 143,
  VK_FORMAT_BC6H_SFLOAT_BLOCK: 144,
  VK_FORMAT_BC7_UNORM_BLOCK: 145,
  VK_FORMAT_BC7_SRGB_BLOCK: 146,
  VK_FORMAT_ETC2_R8G8B8_UNORM_BLOCK: 147,
  VK_FORMAT_ETC2_R8G8B8_SRGB_BLOCK: 148,
  VK_FORMAT_ETC2_R8G8B8A1_UNORM_BLOCK: 149,
  VK_FORMAT_ETC2_R8G8B8A1_SRGB_BLOCK: 150,
  VK_FORMAT_ETC2_R8G8B8A8_UNORM_BLOCK: 151,
  VK_FORMAT_ETC2_R8G8B8A8_SRGB_BLOCK: 152,
  VK_FORMAT_EAC_R11_UNORM_BLOCK: 153,
  VK_FORMAT_EAC_R11_SNORM_BLOCK: 154,
  VK_FORMAT_EAC_R11G11_UNORM_BLOCK: 155,
  VK_FORMAT_EAC_R11G11_SNORM_BLOCK: 156,
  VK_FORMAT_ASTC_4x4_UNORM_BLOCK: 157,
  VK_FORMAT_ASTC_4x4_SRGB_BLOCK: 158,
  VK_FORMAT_ASTC_5x4_UNORM_BLOCK: 159,
  VK_FORMAT_ASTC_5x4_SRGB_BLOCK: 160,
  VK_FORMAT_ASTC_5x5_UNORM_BLOCK: 161,
  VK_FORMAT_ASTC_5x5_SRGB_BLOCK: 162,
  VK_FORMAT_ASTC_6x5_UNORM_BLOCK: 163,
  VK_FORMAT_ASTC_6x5_SRGB_BLOCK: 164,
  VK_FORMAT_ASTC_6x6_UNORM_BLOCK: 165,
  VK_FORMAT_ASTC_6x6_SRGB_BLOCK: 166,
  VK_FORMAT_ASTC_8x5_UNORM_BLOCK: 167,
  VK_FORMAT_ASTC_8x5_SRGB_BLOCK: 168,
  VK_FORMAT_ASTC_8x6_UNORM_BLOCK: 169,
  VK_FORMAT_ASTC_8x6_SRGB_BLOCK: 170,
  VK_FORMAT_ASTC_8x8_UNORM_BLOCK: 171,
  VK_FORMAT_ASTC_8x8_SRGB_BLOCK: 172,
  VK_FORMAT_ASTC_10x5_UNORM_BLOCK: 173,
  VK_FORMAT_ASTC_10x5_SRGB_BLOCK: 174,
  VK_FORMAT_ASTC_10x6_UNORM_BLOCK: 175,
  VK_FORMAT_ASTC_10x6_SRGB_BLOCK: 176,
  VK_FORMAT_ASTC_10x8_UNORM_BLOCK: 177,
  VK_FORMAT_ASTC_10x8_SRGB_BLOCK: 178,
  VK_FORMAT_ASTC_10x10_UNORM_BLOCK: 179,
  VK_FORMAT_ASTC_10x10_SRGB_BLOCK: 180,
  VK_FORMAT_ASTC_12x10_UNORM_BLOCK: 181,
  VK_FORMAT_ASTC_12x10_SRGB_BLOCK: 182,
  VK_FORMAT_ASTC_12x12_UNORM_BLOCK: 183,
  VK_FORMAT_ASTC_12x12_SRGB_BLOCK: 184,
  VK_FORMAT_G8B8G8R8_422_UNORM: 1000156e3,
  VK_FORMAT_B8G8R8G8_422_UNORM: 1000156001,
  VK_FORMAT_G8_B8_R8_3PLANE_420_UNORM: 1000156002,
  VK_FORMAT_G8_B8R8_2PLANE_420_UNORM: 1000156003,
  VK_FORMAT_G8_B8_R8_3PLANE_422_UNORM: 1000156004,
  VK_FORMAT_G8_B8R8_2PLANE_422_UNORM: 1000156005,
  VK_FORMAT_G8_B8_R8_3PLANE_444_UNORM: 1000156006,
  VK_FORMAT_R10X6_UNORM_PACK16: 1000156007,
  VK_FORMAT_R10X6G10X6_UNORM_2PACK16: 1000156008,
  VK_FORMAT_R10X6G10X6B10X6A10X6_UNORM_4PACK16: 1000156009,
  VK_FORMAT_G10X6B10X6G10X6R10X6_422_UNORM_4PACK16: 1000156010,
  VK_FORMAT_B10X6G10X6R10X6G10X6_422_UNORM_4PACK16: 1000156011,
  VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_420_UNORM_3PACK16: 1000156012,
  VK_FORMAT_G10X6_B10X6R10X6_2PLANE_420_UNORM_3PACK16: 1000156013,
  VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_422_UNORM_3PACK16: 1000156014,
  VK_FORMAT_G10X6_B10X6R10X6_2PLANE_422_UNORM_3PACK16: 1000156015,
  VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_444_UNORM_3PACK16: 1000156016,
  VK_FORMAT_R12X4_UNORM_PACK16: 1000156017,
  VK_FORMAT_R12X4G12X4_UNORM_2PACK16: 1000156018,
  VK_FORMAT_R12X4G12X4B12X4A12X4_UNORM_4PACK16: 1000156019,
  VK_FORMAT_G12X4B12X4G12X4R12X4_422_UNORM_4PACK16: 1000156020,
  VK_FORMAT_B12X4G12X4R12X4G12X4_422_UNORM_4PACK16: 1000156021,
  VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_420_UNORM_3PACK16: 1000156022,
  VK_FORMAT_G12X4_B12X4R12X4_2PLANE_420_UNORM_3PACK16: 1000156023,
  VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_422_UNORM_3PACK16: 1000156024,
  VK_FORMAT_G12X4_B12X4R12X4_2PLANE_422_UNORM_3PACK16: 1000156025,
  VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_444_UNORM_3PACK16: 1000156026,
  VK_FORMAT_G16B16G16R16_422_UNORM: 1000156027,
  VK_FORMAT_B16G16R16G16_422_UNORM: 1000156028,
  VK_FORMAT_G16_B16_R16_3PLANE_420_UNORM: 1000156029,
  VK_FORMAT_G16_B16R16_2PLANE_420_UNORM: 1000156030,
  VK_FORMAT_G16_B16_R16_3PLANE_422_UNORM: 1000156031,
  VK_FORMAT_G16_B16R16_2PLANE_422_UNORM: 1000156032,
  VK_FORMAT_G16_B16_R16_3PLANE_444_UNORM: 1000156033,
  VK_FORMAT_PVRTC1_2BPP_UNORM_BLOCK_IMG: 1000054e3,
  VK_FORMAT_PVRTC1_4BPP_UNORM_BLOCK_IMG: 1000054001,
  VK_FORMAT_PVRTC2_2BPP_UNORM_BLOCK_IMG: 1000054002,
  VK_FORMAT_PVRTC2_4BPP_UNORM_BLOCK_IMG: 1000054003,
  VK_FORMAT_PVRTC1_2BPP_SRGB_BLOCK_IMG: 1000054004,
  VK_FORMAT_PVRTC1_4BPP_SRGB_BLOCK_IMG: 1000054005,
  VK_FORMAT_PVRTC2_2BPP_SRGB_BLOCK_IMG: 1000054006,
  VK_FORMAT_PVRTC2_4BPP_SRGB_BLOCK_IMG: 1000054007,
  VK_FORMAT_ASTC_4x4_SFLOAT_BLOCK_EXT: 1000066e3,
  VK_FORMAT_ASTC_5x4_SFLOAT_BLOCK_EXT: 1000066001,
  VK_FORMAT_ASTC_5x5_SFLOAT_BLOCK_EXT: 1000066002,
  VK_FORMAT_ASTC_6x5_SFLOAT_BLOCK_EXT: 1000066003,
  VK_FORMAT_ASTC_6x6_SFLOAT_BLOCK_EXT: 1000066004,
  VK_FORMAT_ASTC_8x5_SFLOAT_BLOCK_EXT: 1000066005,
  VK_FORMAT_ASTC_8x6_SFLOAT_BLOCK_EXT: 1000066006,
  VK_FORMAT_ASTC_8x8_SFLOAT_BLOCK_EXT: 1000066007,
  VK_FORMAT_ASTC_10x5_SFLOAT_BLOCK_EXT: 1000066008,
  VK_FORMAT_ASTC_10x6_SFLOAT_BLOCK_EXT: 1000066009,
  VK_FORMAT_ASTC_10x8_SFLOAT_BLOCK_EXT: 1000066010,
  VK_FORMAT_ASTC_10x10_SFLOAT_BLOCK_EXT: 1000066011,
  VK_FORMAT_ASTC_12x10_SFLOAT_BLOCK_EXT: 1000066012,
  VK_FORMAT_ASTC_12x12_SFLOAT_BLOCK_EXT: 1000066013,
  VK_FORMAT_G8B8G8R8_422_UNORM_KHR: 1000156e3,
  VK_FORMAT_B8G8R8G8_422_UNORM_KHR: 1000156001,
  VK_FORMAT_G8_B8_R8_3PLANE_420_UNORM_KHR: 1000156002,
  VK_FORMAT_G8_B8R8_2PLANE_420_UNORM_KHR: 1000156003,
  VK_FORMAT_G8_B8_R8_3PLANE_422_UNORM_KHR: 1000156004,
  VK_FORMAT_G8_B8R8_2PLANE_422_UNORM_KHR: 1000156005,
  VK_FORMAT_G8_B8_R8_3PLANE_444_UNORM_KHR: 1000156006,
  VK_FORMAT_R10X6_UNORM_PACK16_KHR: 1000156007,
  VK_FORMAT_R10X6G10X6_UNORM_2PACK16_KHR: 1000156008,
  VK_FORMAT_R10X6G10X6B10X6A10X6_UNORM_4PACK16_KHR: 1000156009,
  VK_FORMAT_G10X6B10X6G10X6R10X6_422_UNORM_4PACK16_KHR: 1000156010,
  VK_FORMAT_B10X6G10X6R10X6G10X6_422_UNORM_4PACK16_KHR: 1000156011,
  VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_420_UNORM_3PACK16_KHR: 1000156012,
  VK_FORMAT_G10X6_B10X6R10X6_2PLANE_420_UNORM_3PACK16_KHR: 1000156013,
  VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_422_UNORM_3PACK16_KHR: 1000156014,
  VK_FORMAT_G10X6_B10X6R10X6_2PLANE_422_UNORM_3PACK16_KHR: 1000156015,
  VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_444_UNORM_3PACK16_KHR: 1000156016,
  VK_FORMAT_R12X4_UNORM_PACK16_KHR: 1000156017,
  VK_FORMAT_R12X4G12X4_UNORM_2PACK16_KHR: 1000156018,
  VK_FORMAT_R12X4G12X4B12X4A12X4_UNORM_4PACK16_KHR: 1000156019,
  VK_FORMAT_G12X4B12X4G12X4R12X4_422_UNORM_4PACK16_KHR: 1000156020,
  VK_FORMAT_B12X4G12X4R12X4G12X4_422_UNORM_4PACK16_KHR: 1000156021,
  VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_420_UNORM_3PACK16_KHR: 1000156022,
  VK_FORMAT_G12X4_B12X4R12X4_2PLANE_420_UNORM_3PACK16_KHR: 1000156023,
  VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_422_UNORM_3PACK16_KHR: 1000156024,
  VK_FORMAT_G12X4_B12X4R12X4_2PLANE_422_UNORM_3PACK16_KHR: 1000156025,
  VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_444_UNORM_3PACK16_KHR: 1000156026,
  VK_FORMAT_G16B16G16R16_422_UNORM_KHR: 1000156027,
  VK_FORMAT_B16G16R16G16_422_UNORM_KHR: 1000156028,
  VK_FORMAT_G16_B16_R16_3PLANE_420_UNORM_KHR: 1000156029,
  VK_FORMAT_G16_B16R16_2PLANE_420_UNORM_KHR: 1000156030,
  VK_FORMAT_G16_B16_R16_3PLANE_422_UNORM_KHR: 1000156031,
  VK_FORMAT_G16_B16R16_2PLANE_422_UNORM_KHR: 1000156032,
  VK_FORMAT_G16_B16_R16_3PLANE_444_UNORM_KHR: 1000156033
};
var VulkanConstants_default = Object.freeze(VulkanConstants);

// node_modules/ktx-parse/dist/ktx-parse.modern.js
var KHR_SUPERCOMPRESSION_NONE = 0;
var KHR_DF_KHR_DESCRIPTORTYPE_BASICFORMAT = 0;
var KHR_DF_VENDORID_KHRONOS = 0;
var KHR_DF_VERSION = 2;
var KHR_DF_MODEL_UNSPECIFIED = 0;
var KHR_DF_FLAG_ALPHA_STRAIGHT = 0;
var KHR_DF_TRANSFER_SRGB = 2;
var KHR_DF_PRIMARIES_BT709 = 1;
var KHR_DF_SAMPLE_DATATYPE_SIGNED = 64;
var VK_FORMAT_UNDEFINED = 0;
var KTX2Container = class {
  constructor() {
    this.vkFormat = VK_FORMAT_UNDEFINED;
    this.typeSize = 1;
    this.pixelWidth = 0;
    this.pixelHeight = 0;
    this.pixelDepth = 0;
    this.layerCount = 0;
    this.faceCount = 1;
    this.supercompressionScheme = KHR_SUPERCOMPRESSION_NONE;
    this.levels = [];
    this.dataFormatDescriptor = [{
      vendorId: KHR_DF_VENDORID_KHRONOS,
      descriptorType: KHR_DF_KHR_DESCRIPTORTYPE_BASICFORMAT,
      descriptorBlockSize: 0,
      versionNumber: KHR_DF_VERSION,
      colorModel: KHR_DF_MODEL_UNSPECIFIED,
      colorPrimaries: KHR_DF_PRIMARIES_BT709,
      transferFunction: KHR_DF_TRANSFER_SRGB,
      flags: KHR_DF_FLAG_ALPHA_STRAIGHT,
      texelBlockDimension: [0, 0, 0, 0],
      bytesPlane: [0, 0, 0, 0, 0, 0, 0, 0],
      samples: []
    }];
    this.keyValue = {};
    this.globalData = null;
  }
};
var BufferReader = class {
  constructor(data, byteOffset, byteLength, littleEndian) {
    this._dataView = void 0;
    this._littleEndian = void 0;
    this._offset = void 0;
    this._dataView = new DataView(data.buffer, data.byteOffset + byteOffset, byteLength);
    this._littleEndian = littleEndian;
    this._offset = 0;
  }
  _nextUint8() {
    const value = this._dataView.getUint8(this._offset);
    this._offset += 1;
    return value;
  }
  _nextUint16() {
    const value = this._dataView.getUint16(this._offset, this._littleEndian);
    this._offset += 2;
    return value;
  }
  _nextUint32() {
    const value = this._dataView.getUint32(this._offset, this._littleEndian);
    this._offset += 4;
    return value;
  }
  _nextUint64() {
    const left = this._dataView.getUint32(this._offset, this._littleEndian);
    const right = this._dataView.getUint32(this._offset + 4, this._littleEndian);
    const value = left + 2 ** 32 * right;
    this._offset += 8;
    return value;
  }
  _nextInt32() {
    const value = this._dataView.getInt32(this._offset, this._littleEndian);
    this._offset += 4;
    return value;
  }
  _nextUint8Array(len) {
    const value = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this._offset, len);
    this._offset += len;
    return value;
  }
  _skip(bytes) {
    this._offset += bytes;
    return this;
  }
  _scan(maxByteLength, term = 0) {
    const byteOffset = this._offset;
    let byteLength = 0;
    while (this._dataView.getUint8(this._offset) !== term && byteLength < maxByteLength) {
      byteLength++;
      this._offset++;
    }
    if (byteLength < maxByteLength)
      this._offset++;
    return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + byteOffset, byteLength);
  }
};
var NUL = new Uint8Array([0]);
var KTX2_ID = [
  // '´', 'K', 'T', 'X', '2', '0', 'ª', '\r', '\n', '\x1A', '\n'
  171,
  75,
  84,
  88,
  32,
  50,
  48,
  187,
  13,
  10,
  26,
  10
];
function decodeText(buffer) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(buffer);
  }
  return Buffer.from(buffer).toString("utf8");
}
function read2(data) {
  const id = new Uint8Array(data.buffer, data.byteOffset, KTX2_ID.length);
  if (id[0] !== KTX2_ID[0] || // '´'
  id[1] !== KTX2_ID[1] || // 'K'
  id[2] !== KTX2_ID[2] || // 'T'
  id[3] !== KTX2_ID[3] || // 'X'
  id[4] !== KTX2_ID[4] || // ' '
  id[5] !== KTX2_ID[5] || // '2'
  id[6] !== KTX2_ID[6] || // '0'
  id[7] !== KTX2_ID[7] || // 'ª'
  id[8] !== KTX2_ID[8] || // '\r'
  id[9] !== KTX2_ID[9] || // '\n'
  id[10] !== KTX2_ID[10] || // '\x1A'
  id[11] !== KTX2_ID[11]) {
    throw new Error("Missing KTX 2.0 identifier.");
  }
  const container = new KTX2Container();
  const headerByteLength = 17 * Uint32Array.BYTES_PER_ELEMENT;
  const headerReader = new BufferReader(data, KTX2_ID.length, headerByteLength, true);
  container.vkFormat = headerReader._nextUint32();
  container.typeSize = headerReader._nextUint32();
  container.pixelWidth = headerReader._nextUint32();
  container.pixelHeight = headerReader._nextUint32();
  container.pixelDepth = headerReader._nextUint32();
  container.layerCount = headerReader._nextUint32();
  container.faceCount = headerReader._nextUint32();
  const levelCount = headerReader._nextUint32();
  container.supercompressionScheme = headerReader._nextUint32();
  const dfdByteOffset = headerReader._nextUint32();
  const dfdByteLength = headerReader._nextUint32();
  const kvdByteOffset = headerReader._nextUint32();
  const kvdByteLength = headerReader._nextUint32();
  const sgdByteOffset = headerReader._nextUint64();
  const sgdByteLength = headerReader._nextUint64();
  const levelByteLength = levelCount * 3 * 8;
  const levelReader = new BufferReader(data, KTX2_ID.length + headerByteLength, levelByteLength, true);
  for (let i = 0; i < levelCount; i++) {
    container.levels.push({
      levelData: new Uint8Array(data.buffer, data.byteOffset + levelReader._nextUint64(), levelReader._nextUint64()),
      uncompressedByteLength: levelReader._nextUint64()
    });
  }
  const dfdReader = new BufferReader(data, dfdByteOffset, dfdByteLength, true);
  const dfd = {
    vendorId: dfdReader._skip(
      4
      /* totalSize */
    )._nextUint16(),
    descriptorType: dfdReader._nextUint16(),
    versionNumber: dfdReader._nextUint16(),
    descriptorBlockSize: dfdReader._nextUint16(),
    colorModel: dfdReader._nextUint8(),
    colorPrimaries: dfdReader._nextUint8(),
    transferFunction: dfdReader._nextUint8(),
    flags: dfdReader._nextUint8(),
    texelBlockDimension: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
    bytesPlane: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
    samples: []
  };
  const sampleStart = 6;
  const sampleWords = 4;
  const numSamples = (dfd.descriptorBlockSize / 4 - sampleStart) / sampleWords;
  for (let i = 0; i < numSamples; i++) {
    const sample = {
      bitOffset: dfdReader._nextUint16(),
      bitLength: dfdReader._nextUint8(),
      channelType: dfdReader._nextUint8(),
      samplePosition: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
      sampleLower: -Infinity,
      sampleUpper: Infinity
    };
    if (sample.channelType & KHR_DF_SAMPLE_DATATYPE_SIGNED) {
      sample.sampleLower = dfdReader._nextInt32();
      sample.sampleUpper = dfdReader._nextInt32();
    } else {
      sample.sampleLower = dfdReader._nextUint32();
      sample.sampleUpper = dfdReader._nextUint32();
    }
    dfd.samples[i] = sample;
  }
  container.dataFormatDescriptor.length = 0;
  container.dataFormatDescriptor.push(dfd);
  const kvdReader = new BufferReader(data, kvdByteOffset, kvdByteLength, true);
  while (kvdReader._offset < kvdByteLength) {
    const keyValueByteLength = kvdReader._nextUint32();
    const keyData = kvdReader._scan(keyValueByteLength);
    const key = decodeText(keyData);
    container.keyValue[key] = kvdReader._nextUint8Array(keyValueByteLength - keyData.byteLength - 1);
    if (key.match(/^ktx/i)) {
      const text = decodeText(container.keyValue[key]);
      container.keyValue[key] = text.substring(0, text.lastIndexOf("\0"));
    }
    const kvPadding = keyValueByteLength % 4 ? 4 - keyValueByteLength % 4 : 0;
    kvdReader._skip(kvPadding);
  }
  if (sgdByteLength <= 0)
    return container;
  const sgdReader = new BufferReader(data, sgdByteOffset, sgdByteLength, true);
  const endpointCount = sgdReader._nextUint16();
  const selectorCount = sgdReader._nextUint16();
  const endpointsByteLength = sgdReader._nextUint32();
  const selectorsByteLength = sgdReader._nextUint32();
  const tablesByteLength = sgdReader._nextUint32();
  const extendedByteLength = sgdReader._nextUint32();
  const imageDescs = [];
  for (let i = 0; i < levelCount; i++) {
    imageDescs.push({
      imageFlags: sgdReader._nextUint32(),
      rgbSliceByteOffset: sgdReader._nextUint32(),
      rgbSliceByteLength: sgdReader._nextUint32(),
      alphaSliceByteOffset: sgdReader._nextUint32(),
      alphaSliceByteLength: sgdReader._nextUint32()
    });
  }
  const endpointsByteOffset = sgdByteOffset + sgdReader._offset;
  const selectorsByteOffset = endpointsByteOffset + endpointsByteLength;
  const tablesByteOffset = selectorsByteOffset + selectorsByteLength;
  const extendedByteOffset = tablesByteOffset + tablesByteLength;
  const endpointsData = new Uint8Array(data.buffer, data.byteOffset + endpointsByteOffset, endpointsByteLength);
  const selectorsData = new Uint8Array(data.buffer, data.byteOffset + selectorsByteOffset, selectorsByteLength);
  const tablesData = new Uint8Array(data.buffer, data.byteOffset + tablesByteOffset, tablesByteLength);
  const extendedData = new Uint8Array(data.buffer, data.byteOffset + extendedByteOffset, extendedByteLength);
  container.globalData = {
    endpointCount,
    selectorCount,
    imageDescs,
    endpointsData,
    selectorsData,
    tablesData,
    extendedData
  };
  return container;
}

// packages/engine/Source/Workers/transcodeKTX2.js
var import_basis_transcoder = __toESM(require_basis_transcoder(), 1);
var faceOrder = [
  "positiveX",
  "negativeX",
  "positiveY",
  "negativeY",
  "positiveZ",
  "negativeZ"
];
var colorModelETC1S = 163;
var colorModelUASTC = 166;
var transcoderModule;
function transcode(parameters, transferableObjects) {
  Check_default.typeOf.object("transcoderModule", transcoderModule);
  const data = parameters.ktx2Buffer;
  const supportedTargetFormats = parameters.supportedTargetFormats;
  let header;
  try {
    header = read2(data);
  } catch (e) {
    throw new RuntimeError_default("Invalid KTX2 file.");
  }
  if (header.layerCount !== 0) {
    throw new RuntimeError_default("KTX2 texture arrays are not supported.");
  }
  if (header.pixelDepth !== 0) {
    throw new RuntimeError_default("KTX2 3D textures are unsupported.");
  }
  const dfd = header.dataFormatDescriptor[0];
  const result = new Array(header.levelCount);
  if (header.vkFormat === 0 && (dfd.colorModel === colorModelETC1S || dfd.colorModel === colorModelUASTC)) {
    transcodeCompressed(
      data,
      header,
      supportedTargetFormats,
      transcoderModule,
      transferableObjects,
      result
    );
  } else {
    transferableObjects.push(data.buffer);
    parseUncompressed(header, result);
  }
  return result;
}
function parseUncompressed(header, result) {
  const internalFormat = header.vkFormat === VulkanConstants_default.VK_FORMAT_R8G8B8_SRGB ? PixelFormat_default.RGB : PixelFormat_default.RGBA;
  let datatype;
  if (header.vkFormat === VulkanConstants_default.VK_FORMAT_R8G8B8A8_UNORM) {
    datatype = PixelDatatype_default.UNSIGNED_BYTE;
  } else if (header.vkFormat === VulkanConstants_default.VK_FORMAT_R16G16B16A16_SFLOAT) {
    datatype = PixelDatatype_default.HALF_FLOAT;
  } else if (header.vkFormat === VulkanConstants_default.VK_FORMAT_R32G32B32A32_SFLOAT) {
    datatype = PixelDatatype_default.FLOAT;
  }
  for (let i = 0; i < header.levels.length; ++i) {
    const level = {};
    result[i] = level;
    const levelBuffer = header.levels[i].levelData;
    const width = header.pixelWidth >> i;
    const height = header.pixelHeight >> i;
    const faceLength = width * height * PixelFormat_default.componentsLength(internalFormat);
    for (let j = 0; j < header.faceCount; ++j) {
      const faceByteOffset = levelBuffer.byteOffset + faceLength * header.typeSize * j;
      let faceView;
      if (!defined_default(datatype) || PixelDatatype_default.sizeInBytes(datatype) === 1) {
        faceView = new Uint8Array(
          levelBuffer.buffer,
          faceByteOffset,
          faceLength
        );
      } else if (PixelDatatype_default.sizeInBytes(datatype) === 2) {
        faceView = new Uint16Array(
          levelBuffer.buffer,
          faceByteOffset,
          faceLength
        );
      } else {
        faceView = new Float32Array(
          levelBuffer.buffer,
          faceByteOffset,
          faceLength
        );
      }
      level[faceOrder[j]] = {
        internalFormat,
        datatype,
        width,
        height,
        levelBuffer: faceView
      };
    }
  }
}
function transcodeCompressed(data, header, supportedTargetFormats, transcoderModule2, transferableObjects, result) {
  const ktx2File = new transcoderModule2.KTX2File(data);
  let width = ktx2File.getWidth();
  let height = ktx2File.getHeight();
  const levels = ktx2File.getLevels();
  const hasAlpha = ktx2File.getHasAlpha();
  if (!(width > 0) || !(height > 0) || !(levels > 0)) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError_default("Invalid KTX2 file");
  }
  let internalFormat, transcoderFormat;
  const dfd = header.dataFormatDescriptor[0];
  const BasisFormat = transcoderModule2.transcoder_texture_format;
  if (dfd.colorModel === colorModelETC1S) {
    if (supportedTargetFormats.etc) {
      internalFormat = hasAlpha ? PixelFormat_default.RGBA8_ETC2_EAC : PixelFormat_default.RGB8_ETC2;
      transcoderFormat = hasAlpha ? BasisFormat.cTFETC2_RGBA : BasisFormat.cTFETC1_RGB;
    } else if (supportedTargetFormats.etc1 && !hasAlpha) {
      internalFormat = PixelFormat_default.RGB_ETC1;
      transcoderFormat = BasisFormat.cTFETC1_RGB;
    } else if (supportedTargetFormats.s3tc) {
      internalFormat = hasAlpha ? PixelFormat_default.RGBA_DXT5 : PixelFormat_default.RGB_DXT1;
      transcoderFormat = hasAlpha ? BasisFormat.cTFBC3_RGBA : BasisFormat.cTFBC1_RGB;
    } else if (supportedTargetFormats.pvrtc) {
      internalFormat = hasAlpha ? PixelFormat_default.RGBA_PVRTC_4BPPV1 : PixelFormat_default.RGB_PVRTC_4BPPV1;
      transcoderFormat = hasAlpha ? BasisFormat.cTFPVRTC1_4_RGBA : BasisFormat.cTFPVRTC1_4_RGB;
    } else if (supportedTargetFormats.astc) {
      internalFormat = PixelFormat_default.RGBA_ASTC;
      transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
    } else if (supportedTargetFormats.bc7) {
      internalFormat = PixelFormat_default.RGBA_BC7;
      transcoderFormat = BasisFormat.cTFBC7_RGBA;
    } else {
      throw new RuntimeError_default(
        "No transcoding format target available for ETC1S compressed ktx2."
      );
    }
  } else if (dfd.colorModel === colorModelUASTC) {
    if (supportedTargetFormats.astc) {
      internalFormat = PixelFormat_default.RGBA_ASTC;
      transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
    } else if (supportedTargetFormats.bc7) {
      internalFormat = PixelFormat_default.RGBA_BC7;
      transcoderFormat = BasisFormat.cTFBC7_RGBA;
    } else if (supportedTargetFormats.s3tc) {
      internalFormat = hasAlpha ? PixelFormat_default.RGBA_DXT5 : PixelFormat_default.RGB_DXT1;
      transcoderFormat = hasAlpha ? BasisFormat.cTFBC3_RGBA : BasisFormat.cTFBC1_RGB;
    } else if (supportedTargetFormats.etc) {
      internalFormat = hasAlpha ? PixelFormat_default.RGBA8_ETC2_EAC : PixelFormat_default.RGB8_ETC2;
      transcoderFormat = hasAlpha ? BasisFormat.cTFETC2_RGBA : BasisFormat.cTFETC1_RGB;
    } else if (supportedTargetFormats.etc1 && !hasAlpha) {
      internalFormat = PixelFormat_default.RGB_ETC1;
      transcoderFormat = BasisFormat.cTFETC1_RGB;
    } else if (supportedTargetFormats.pvrtc) {
      internalFormat = hasAlpha ? PixelFormat_default.RGBA_PVRTC_4BPPV1 : PixelFormat_default.RGB_PVRTC_4BPPV1;
      transcoderFormat = hasAlpha ? BasisFormat.cTFPVRTC1_4_RGBA : BasisFormat.cTFPVRTC1_4_RGB;
    } else {
      throw new RuntimeError_default(
        "No transcoding format target available for UASTC compressed ktx2."
      );
    }
  }
  if (!ktx2File.startTranscoding()) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError_default("startTranscoding() failed");
  }
  for (let i = 0; i < header.levels.length; ++i) {
    const level = {};
    result[i] = level;
    width = header.pixelWidth >> i;
    height = header.pixelHeight >> i;
    const dstSize = ktx2File.getImageTranscodedSizeInBytes(
      i,
      // level index
      0,
      // layer index
      0,
      // face index
      transcoderFormat.value
    );
    const dst = new Uint8Array(dstSize);
    const transcoded = ktx2File.transcodeImage(
      dst,
      i,
      // level index
      0,
      // layer index
      0,
      // face index
      transcoderFormat.value,
      0,
      // get_alpha_for_opaque_formats
      -1,
      // channel0
      -1
      // channel1
    );
    if (!defined_default(transcoded)) {
      throw new RuntimeError_default("transcodeImage() failed.");
    }
    transferableObjects.push(dst.buffer);
    level[faceOrder[0]] = {
      internalFormat,
      width,
      height,
      levelBuffer: dst
    };
  }
  ktx2File.close();
  ktx2File.delete();
  return result;
}
async function initWorker(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  const basisTranscoder = defaultValue_default(import_basis_transcoder.default, self.BASIS);
  if (defined_default(wasmConfig.wasmBinaryFile)) {
    transcoderModule = await basisTranscoder(wasmConfig);
  } else {
    transcoderModule = await basisTranscoder();
  }
  transcoderModule.initializeBasis();
  return true;
}
function transcodeKTX2(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined_default(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }
  return transcode(parameters, transferableObjects);
}
var transcodeKTX2_default = createTaskProcessorWorker_default(transcodeKTX2);
export {
  transcodeKTX2_default as default
};
