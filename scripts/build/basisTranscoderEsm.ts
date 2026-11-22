// The Basis Universal transcoder's Emscripten glue (vendored from 1.x) as
// an ES module that never generates code at runtime, so content workers
// run under a Content Security Policy without 'unsafe-eval' (only
// 'wasm-unsafe-eval'). Import it as `…/basis_transcoder.js?basis-esm`.
//
// The glue is a UMD script whose embind runtime builds functions from
// strings (`new Function`) in four places; each is replaced with the
// closure Emscripten itself emits with `-s DYNAMIC_EXECUTION=0`. Every
// replacement must match exactly once, so a different copy of the glue
// fails the build instead of shipping half patched.
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

const QUERY = "?basis-esm";

/** Apache-2.0 §4(b): a modified file says so. Minifiers keep it (`/*!`). */
const NOTICE = `/*! @license basis_transcoder.js: the Basis Universal transcoder
 * (https://github.com/BinomialLLC/basis_universal, Apache-2.0) and its
 * Emscripten runtime (MIT). Modified for CesiumJS 2.0: the embind runtime's
 * code generation (new Function) is replaced with closures, and the UMD
 * wrapper with an ES module export (basisTranscoderEsm.ts). */`;

/** [start marker, end marker (inclusive), replacement]. */
const PATCHES: Array<[string, string, string]> = [
  // Names a function by generating it; the name is only cosmetic.
  [
    "function createNamedFunction(name,body){",
    '"};\\n")(body)}',
    "function createNamedFunction(name,body){return function(){return body.apply(this,arguments)}}",
  ],
  // The invoker for every bound function and method.
  [
    "function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){",
    "var invokerFunction=new_(Function,args1).apply(null,args2);return invokerFunction}",
    `function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){
var argCount=argTypes.length;
if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!")}
var isClassMethodFunc=argTypes[1]!==null&&classType!==null;
var needsDestructorStack=false;
for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}
var returns=argTypes[0].name!=="void";
var expected=argCount-2;
return function(){
if(arguments.length!==expected){throwBindingError("function "+humanName+" called with "+arguments.length+" arguments, expected "+expected+" args!")}
var destructors=needsDestructorStack?[]:null;
var wired=[cppTargetFunc];
var thisWired;
if(isClassMethodFunc){thisWired=argTypes[1].toWireType(destructors,this);wired.push(thisWired)}
for(var i=0;i<expected;++i){wired.push(argTypes[i+2].toWireType(destructors,arguments[i]))}
var rv=cppInvokerFunc.apply(null,wired);
if(needsDestructorStack){runDestructors(destructors)}
else{for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){if(argTypes[i].destructorFunction!==null){argTypes[i].destructorFunction(i===1?thisWired:wired[isClassMethodFunc?i:i-1])}}}
if(returns){return argTypes[0].fromWireType(rv)}
}}`,
  ],
  // \`new\` on a JS value from C++ (emval).
  [
    "function craftEmvalAllocator(argCount){",
    "(requireRegisteredType,Module,__emval_register)}",
    `function craftEmvalAllocator(argCount){return function(constructor,argTypes,args){
var argv=new Array(argCount);
for(var i=0;i<argCount;++i){var argType=requireRegisteredType(Module['HEAP32'][(argTypes>>>2)+i],"parameter "+i);argv[i]=argType.readValueFromPointer(args);args+=argType['argPackAdvance']}
return __emval_register(Reflect.construct(constructor,argv))}}`,
  ],
  // Calls a JS method from C++ (emval).
  [
    "function __emval_get_method_caller(argCount,argTypes){",
    "return __emval_addMethodCaller(invokerFunction)}",
    `function __emval_get_method_caller(argCount,argTypes){
var types=__emval_lookupTypes(argCount,argTypes);var retType=types[0];
var invokerFunction=function(handle,name,destructors,args){
var argv=new Array(argCount-1);var offset=0;
for(var i=0;i<argCount-1;++i){argv[i]=types[i+1].readValueFromPointer(args+offset);offset+=types[i+1]["argPackAdvance"]}
var rv=handle[name].apply(handle,argv);
for(var i=0;i<argCount-1;++i){if(types[i+1]["deleteObject"]){types[i+1].deleteObject(argv[i])}}
if(!retType.isVoid){return retType.toWireType(destructors,rv)}};
return __emval_addMethodCaller(invokerFunction)}`,
  ],
];

/** The glue's source, patched and exporting its factory. */
export function basisTranscoderModule(source: string): string {
  let code = source;
  for (const [start, end, replacement] of PATCHES) {
    const at = code.indexOf(start);
    if (at < 0 || code.indexOf(start, at + 1) >= 0) {
      throw new Error(`basis transcoder: "${start}" not found exactly once`);
    }
    const stop = code.indexOf(end, at);
    if (stop < 0) {
      throw new Error(`basis transcoder: end of "${start}" not found`);
    }
    code = code.slice(0, at) + replacement + code.slice(stop + end.length);
  }
  if (/new Function|new_\(Function|\beval\(/.test(code)) {
    throw new Error("basis transcoder: runtime code generation left");
  }
  // The UMD tail sees no `module`, `exports` or `define` here.
  return `${NOTICE}\n${code}\nexport default BASIS;\n`;
}

/** Loads `…/basis_transcoder.js?basis-esm` as the patched module. */
export function basisTranscoderEsm(): Plugin {
  return {
    name: "basis-transcoder-esm",
    enforce: "pre",
    load(id) {
      if (!id.endsWith(QUERY)) {
        return null;
      }
      const file = id.slice(0, -QUERY.length);
      return basisTranscoderModule(readFileSync(file, "utf8"));
    },
  };
}
