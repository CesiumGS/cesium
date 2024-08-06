/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.107
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

if (typeof self === "undefined") {
  self = {};
}
self.onmessage = function(event) {
  var data = event.data;
  require(data.loaderConfig, [data.workerModule], function(workerModule) {
    self.onmessage = workerModule;
    self.CESIUM_BASE_URL = data.loaderConfig.baseUrl;
  });
};
function setTimeout(fn) {
  fn();
}
/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.20 Copyright (c) 2010-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
var requirejs, require, define;
(function(global) {
  var req, s, head, baseElement, dataMain, src, interactiveScript, currentlyAddingScript, mainScript, subPath, version = "2.1.20", commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g, jsSuffixRegExp = /\.js$/, currDirRegExp = /^\.\//, op = Object.prototype, ostring = op.toString, hasOwn = op.hasOwnProperty, ap = Array.prototype, isBrowser = !!(typeof window !== "undefined" && typeof navigator !== "undefined" && window.document), isWebWorker = !isBrowser && typeof importScripts !== "undefined", readyRegExp = isBrowser && navigator.platform === "PLAYSTATION 3" ? /^complete$/ : /^(complete|loaded)$/, defContextName = "_", isOpera = typeof opera !== "undefined" && opera.toString() === "[object Opera]", contexts = {}, cfg = {}, globalDefQueue = [], useInteractive = false;
  function isFunction(it) {
    return ostring.call(it) === "[object Function]";
  }
  function isArray(it) {
    return ostring.call(it) === "[object Array]";
  }
  function each(ary, func) {
    if (ary) {
      var i;
      for (i = 0; i < ary.length; i += 1) {
        if (ary[i] && func(ary[i], i, ary)) {
          break;
        }
      }
    }
  }
  function eachReverse(ary, func) {
    if (ary) {
      var i;
      for (i = ary.length - 1; i > -1; i -= 1) {
        if (ary[i] && func(ary[i], i, ary)) {
          break;
        }
      }
    }
  }
  function hasProp(obj, prop) {
    return hasOwn.call(obj, prop);
  }
  function getOwn(obj, prop) {
    return hasProp(obj, prop) && obj[prop];
  }
  function eachProp(obj, func) {
    var prop;
    for (prop in obj) {
      if (hasProp(obj, prop)) {
        if (func(obj[prop], prop)) {
          break;
        }
      }
    }
  }
  function mixin(target, source, force, deepStringMixin) {
    if (source) {
      eachProp(source, function(value, prop) {
        if (force || !hasProp(target, prop)) {
          if (deepStringMixin && typeof value === "object" && value && !isArray(value) && !isFunction(value) && !(value instanceof RegExp)) {
            if (!target[prop]) {
              target[prop] = {};
            }
            mixin(target[prop], value, force, deepStringMixin);
          } else {
            target[prop] = value;
          }
        }
      });
    }
    return target;
  }
  function bind(obj, fn) {
    return function() {
      return fn.apply(obj, arguments);
    };
  }
  function scripts() {
    return document.getElementsByTagName("script");
  }
  function defaultOnError(err) {
    throw err;
  }
  function getGlobal(value) {
    if (!value) {
      return value;
    }
    var g = global;
    each(value.split("."), function(part) {
      g = g[part];
    });
    return g;
  }
  function makeError(id, msg, err, requireModules) {
    var e = new Error(msg + "\nhttp://requirejs.org/docs/errors.html#" + id);
    e.requireType = id;
    e.requireModules = requireModules;
    if (err) {
      e.originalError = err;
    }
    return e;
  }
  if (typeof define !== "undefined") {
    return;
  }
  if (typeof requirejs !== "undefined") {
    if (isFunction(requirejs)) {
      return;
    }
    cfg = requirejs;
    requirejs = void 0;
  }
  if (typeof require !== "undefined" && !isFunction(require)) {
    cfg = require;
    require = void 0;
  }
  function newContext(contextName) {
    var inCheckLoaded, Module, context, handlers, checkLoadedTimeoutId, config = {
      //Defaults. Do not set a default for map
      //config to speed up normalize(), which
      //will run faster if there is no default.
      waitSeconds: 7,
      baseUrl: "./",
      paths: {},
      bundles: {},
      pkgs: {},
      shim: {},
      config: {}
    }, registry = {}, enabledRegistry = {}, undefEvents = {}, defQueue = [], defined = {}, urlFetched = {}, bundlesMap = {}, requireCounter = 1, unnormalizedCounter = 1;
    function trimDots(ary) {
      var i, part;
      for (i = 0; i < ary.length; i++) {
        part = ary[i];
        if (part === ".") {
          ary.splice(i, 1);
          i -= 1;
        } else if (part === "..") {
          if (i === 0 || i === 1 && ary[2] === ".." || ary[i - 1] === "..") {
            continue;
          } else if (i > 0) {
            ary.splice(i - 1, 2);
            i -= 2;
          }
        }
      }
    }
    function normalize(name, baseName, applyMap) {
      var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex, foundMap, foundI, foundStarMap, starI, normalizedBaseParts, baseParts = baseName && baseName.split("/"), map = config.map, starMap = map && map["*"];
      if (name) {
        name = name.split("/");
        lastIndex = name.length - 1;
        if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
          name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, "");
        }
        if (name[0].charAt(0) === "." && baseParts) {
          normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
          name = normalizedBaseParts.concat(name);
        }
        trimDots(name);
        name = name.join("/");
      }
      if (applyMap && map && (baseParts || starMap)) {
        nameParts = name.split("/");
        outerLoop:
          for (i = nameParts.length; i > 0; i -= 1) {
            nameSegment = nameParts.slice(0, i).join("/");
            if (baseParts) {
              for (j = baseParts.length; j > 0; j -= 1) {
                mapValue = getOwn(map, baseParts.slice(0, j).join("/"));
                if (mapValue) {
                  mapValue = getOwn(mapValue, nameSegment);
                  if (mapValue) {
                    foundMap = mapValue;
                    foundI = i;
                    break outerLoop;
                  }
                }
              }
            }
            if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
              foundStarMap = getOwn(starMap, nameSegment);
              starI = i;
            }
          }
        if (!foundMap && foundStarMap) {
          foundMap = foundStarMap;
          foundI = starI;
        }
        if (foundMap) {
          nameParts.splice(0, foundI, foundMap);
          name = nameParts.join("/");
        }
      }
      pkgMain = getOwn(config.pkgs, name);
      return pkgMain ? pkgMain : name;
    }
    function removeScript(name) {
      if (isBrowser) {
        each(scripts(), function(scriptNode) {
          if (scriptNode.getAttribute("data-requiremodule") === name && scriptNode.getAttribute("data-requirecontext") === context.contextName) {
            scriptNode.parentNode.removeChild(scriptNode);
            return true;
          }
        });
      }
    }
    function hasPathFallback(id) {
      var pathConfig = getOwn(config.paths, id);
      if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
        pathConfig.shift();
        context.require.undef(id);
        context.makeRequire(null, {
          skipMap: true
        })([id]);
        return true;
      }
    }
    function splitPrefix(name) {
      var prefix, index = name ? name.indexOf("!") : -1;
      if (index > -1) {
        prefix = name.substring(0, index);
        name = name.substring(index + 1, name.length);
      }
      return [prefix, name];
    }
    function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
      var url, pluginModule, suffix, nameParts, prefix = null, parentName = parentModuleMap ? parentModuleMap.name : null, originalName = name, isDefine = true, normalizedName = "";
      if (!name) {
        isDefine = false;
        name = "_@r" + (requireCounter += 1);
      }
      nameParts = splitPrefix(name);
      prefix = nameParts[0];
      name = nameParts[1];
      if (prefix) {
        prefix = normalize(prefix, parentName, applyMap);
        pluginModule = getOwn(defined, prefix);
      }
      if (name) {
        if (prefix) {
          if (pluginModule && pluginModule.normalize) {
            normalizedName = pluginModule.normalize(name, function(name2) {
              return normalize(name2, parentName, applyMap);
            });
          } else {
            normalizedName = name.indexOf("!") === -1 ? normalize(name, parentName, applyMap) : name;
          }
        } else {
          normalizedName = normalize(name, parentName, applyMap);
          nameParts = splitPrefix(normalizedName);
          prefix = nameParts[0];
          normalizedName = nameParts[1];
          isNormalized = true;
          url = context.nameToUrl(normalizedName);
        }
      }
      suffix = prefix && !pluginModule && !isNormalized ? "_unnormalized" + (unnormalizedCounter += 1) : "";
      return {
        prefix,
        name: normalizedName,
        parentMap: parentModuleMap,
        unnormalized: !!suffix,
        url,
        originalName,
        isDefine,
        id: (prefix ? prefix + "!" + normalizedName : normalizedName) + suffix
      };
    }
    function getModule(depMap) {
      var id = depMap.id, mod = getOwn(registry, id);
      if (!mod) {
        mod = registry[id] = new context.Module(depMap);
      }
      return mod;
    }
    function on(depMap, name, fn) {
      var id = depMap.id, mod = getOwn(registry, id);
      if (hasProp(defined, id) && (!mod || mod.defineEmitComplete)) {
        if (name === "defined") {
          fn(defined[id]);
        }
      } else {
        mod = getModule(depMap);
        if (mod.error && name === "error") {
          fn(mod.error);
        } else {
          mod.on(name, fn);
        }
      }
    }
    function onError(err, errback) {
      var ids = err.requireModules, notified = false;
      if (errback) {
        errback(err);
      } else {
        each(ids, function(id) {
          var mod = getOwn(registry, id);
          if (mod) {
            mod.error = err;
            if (mod.events.error) {
              notified = true;
              mod.emit("error", err);
            }
          }
        });
        if (!notified) {
          req.onError(err);
        }
      }
    }
    function takeGlobalQueue() {
      if (globalDefQueue.length) {
        each(globalDefQueue, function(queueItem) {
          var id = queueItem[0];
          if (typeof id === "string") {
            context.defQueueMap[id] = true;
          }
          defQueue.push(queueItem);
        });
        globalDefQueue = [];
      }
    }
    handlers = {
      require: function(mod) {
        if (mod.require) {
          return mod.require;
        } else {
          return mod.require = context.makeRequire(mod.map);
        }
      },
      exports: function(mod) {
        mod.usingExports = true;
        if (mod.map.isDefine) {
          if (mod.exports) {
            return defined[mod.map.id] = mod.exports;
          } else {
            return mod.exports = defined[mod.map.id] = {};
          }
        }
      },
      module: function(mod) {
        if (mod.module) {
          return mod.module;
        } else {
          return mod.module = {
            id: mod.map.id,
            uri: mod.map.url,
            config: function() {
              return getOwn(config.config, mod.map.id) || {};
            },
            exports: mod.exports || (mod.exports = {})
          };
        }
      }
    };
    function cleanRegistry(id) {
      delete registry[id];
      delete enabledRegistry[id];
    }
    function breakCycle(mod, traced, processed) {
      var id = mod.map.id;
      if (mod.error) {
        mod.emit("error", mod.error);
      } else {
        traced[id] = true;
        each(mod.depMaps, function(depMap, i) {
          var depId = depMap.id, dep = getOwn(registry, depId);
          if (dep && !mod.depMatched[i] && !processed[depId]) {
            if (getOwn(traced, depId)) {
              mod.defineDep(i, defined[depId]);
              mod.check();
            } else {
              breakCycle(dep, traced, processed);
            }
          }
        });
        processed[id] = true;
      }
    }
    function checkLoaded() {
      var err, usingPathFallback, waitInterval = config.waitSeconds * 1e3, expired = waitInterval && context.startTime + waitInterval < (/* @__PURE__ */ new Date()).getTime(), noLoads = [], reqCalls = [], stillLoading = false, needCycleCheck = true;
      if (inCheckLoaded) {
        return;
      }
      inCheckLoaded = true;
      eachProp(enabledRegistry, function(mod) {
        var map = mod.map, modId = map.id;
        if (!mod.enabled) {
          return;
        }
        if (!map.isDefine) {
          reqCalls.push(mod);
        }
        if (!mod.error) {
          if (!mod.inited && expired) {
            if (hasPathFallback(modId)) {
              usingPathFallback = true;
              stillLoading = true;
            } else {
              noLoads.push(modId);
              removeScript(modId);
            }
          } else if (!mod.inited && mod.fetched && map.isDefine) {
            stillLoading = true;
            if (!map.prefix) {
              return needCycleCheck = false;
            }
          }
        }
      });
      if (expired && noLoads.length) {
        err = makeError(
          "timeout",
          "Load timeout for modules: " + noLoads,
          null,
          noLoads
        );
        err.contextName = context.contextName;
        return onError(err);
      }
      if (needCycleCheck) {
        each(reqCalls, function(mod) {
          breakCycle(mod, {}, {});
        });
      }
      if ((!expired || usingPathFallback) && stillLoading) {
        if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
          checkLoadedTimeoutId = setTimeout(function() {
            checkLoadedTimeoutId = 0;
            checkLoaded();
          }, 50);
        }
      }
      inCheckLoaded = false;
    }
    Module = function(map) {
      this.events = getOwn(undefEvents, map.id) || {};
      this.map = map;
      this.shim = getOwn(config.shim, map.id);
      this.depExports = [];
      this.depMaps = [];
      this.depMatched = [];
      this.pluginMaps = {};
      this.depCount = 0;
    };
    Module.prototype = {
      init: function(depMaps, factory, errback, options) {
        options = options || {};
        if (this.inited) {
          return;
        }
        this.factory = factory;
        if (errback) {
          this.on("error", errback);
        } else if (this.events.error) {
          errback = bind(this, function(err) {
            this.emit("error", err);
          });
        }
        this.depMaps = depMaps && depMaps.slice(0);
        this.errback = errback;
        this.inited = true;
        this.ignore = options.ignore;
        if (options.enabled || this.enabled) {
          this.enable();
        } else {
          this.check();
        }
      },
      defineDep: function(i, depExports) {
        if (!this.depMatched[i]) {
          this.depMatched[i] = true;
          this.depCount -= 1;
          this.depExports[i] = depExports;
        }
      },
      fetch: function() {
        if (this.fetched) {
          return;
        }
        this.fetched = true;
        context.startTime = (/* @__PURE__ */ new Date()).getTime();
        var map = this.map;
        if (this.shim) {
          context.makeRequire(this.map, {
            enableBuildCallback: true
          })(
            this.shim.deps || [],
            bind(this, function() {
              return map.prefix ? this.callPlugin() : this.load();
            })
          );
        } else {
          return map.prefix ? this.callPlugin() : this.load();
        }
      },
      load: function() {
        var url = this.map.url;
        if (!urlFetched[url]) {
          urlFetched[url] = true;
          context.load(this.map.id, url);
        }
      },
      /**
       * Checks if the module is ready to define itself, and if so,
       * define it.
       * @private
       */
      check: function() {
        if (!this.enabled || this.enabling) {
          return;
        }
        var err, cjsModule, id = this.map.id, depExports = this.depExports, exports = this.exports, factory = this.factory;
        if (!this.inited) {
          if (!hasProp(context.defQueueMap, id)) {
            this.fetch();
          }
        } else if (this.error) {
          this.emit("error", this.error);
        } else if (!this.defining) {
          this.defining = true;
          if (this.depCount < 1 && !this.defined) {
            if (isFunction(factory)) {
              if (this.events.error && this.map.isDefine || req.onError !== defaultOnError) {
                try {
                  exports = context.execCb(id, factory, depExports, exports);
                } catch (e) {
                  err = e;
                }
              } else {
                exports = context.execCb(id, factory, depExports, exports);
              }
              if (this.map.isDefine && exports === void 0) {
                cjsModule = this.module;
                if (cjsModule) {
                  exports = cjsModule.exports;
                } else if (this.usingExports) {
                  exports = this.exports;
                }
              }
              if (err) {
                err.requireMap = this.map;
                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                err.requireType = this.map.isDefine ? "define" : "require";
                return onError(this.error = err);
              }
            } else {
              exports = factory;
            }
            this.exports = exports;
            if (this.map.isDefine && !this.ignore) {
              defined[id] = exports;
              if (req.onResourceLoad) {
                req.onResourceLoad(context, this.map, this.depMaps);
              }
            }
            cleanRegistry(id);
            this.defined = true;
          }
          this.defining = false;
          if (this.defined && !this.defineEmitted) {
            this.defineEmitted = true;
            this.emit("defined", this.exports);
            this.defineEmitComplete = true;
          }
        }
      },
      callPlugin: function() {
        var map = this.map, id = map.id, pluginMap = makeModuleMap(map.prefix);
        this.depMaps.push(pluginMap);
        on(
          pluginMap,
          "defined",
          bind(this, function(plugin) {
            var load, normalizedMap, normalizedMod, bundleId = getOwn(bundlesMap, this.map.id), name = this.map.name, parentName = this.map.parentMap ? this.map.parentMap.name : null, localRequire = context.makeRequire(map.parentMap, {
              enableBuildCallback: true
            });
            if (this.map.unnormalized) {
              if (plugin.normalize) {
                name = plugin.normalize(name, function(name2) {
                  return normalize(name2, parentName, true);
                }) || "";
              }
              normalizedMap = makeModuleMap(
                map.prefix + "!" + name,
                this.map.parentMap
              );
              on(
                normalizedMap,
                "defined",
                bind(this, function(value) {
                  this.init(
                    [],
                    function() {
                      return value;
                    },
                    null,
                    {
                      enabled: true,
                      ignore: true
                    }
                  );
                })
              );
              normalizedMod = getOwn(registry, normalizedMap.id);
              if (normalizedMod) {
                this.depMaps.push(normalizedMap);
                if (this.events.error) {
                  normalizedMod.on(
                    "error",
                    bind(this, function(err) {
                      this.emit("error", err);
                    })
                  );
                }
                normalizedMod.enable();
              }
              return;
            }
            if (bundleId) {
              this.map.url = context.nameToUrl(bundleId);
              this.load();
              return;
            }
            load = bind(this, function(value) {
              this.init(
                [],
                function() {
                  return value;
                },
                null,
                {
                  enabled: true
                }
              );
            });
            load.error = bind(this, function(err) {
              this.inited = true;
              this.error = err;
              err.requireModules = [id];
              eachProp(registry, function(mod) {
                if (mod.map.id.indexOf(id + "_unnormalized") === 0) {
                  cleanRegistry(mod.map.id);
                }
              });
              onError(err);
            });
            load.fromText = bind(this, function(text2, textAlt) {
              var moduleName = map.name, moduleMap = makeModuleMap(moduleName), hasInteractive = useInteractive;
              if (textAlt) {
                text2 = textAlt;
              }
              if (hasInteractive) {
                useInteractive = false;
              }
              getModule(moduleMap);
              if (hasProp(config.config, id)) {
                config.config[moduleName] = config.config[id];
              }
              try {
                req.exec(text2);
              } catch (e) {
                return onError(
                  makeError(
                    "fromtexteval",
                    "fromText eval for " + id + " failed: " + e,
                    e,
                    [id]
                  )
                );
              }
              if (hasInteractive) {
                useInteractive = true;
              }
              this.depMaps.push(moduleMap);
              context.completeLoad(moduleName);
              localRequire([moduleName], load);
            });
            plugin.load(map.name, localRequire, load, config);
          })
        );
        context.enable(pluginMap, this);
        this.pluginMaps[pluginMap.id] = pluginMap;
      },
      enable: function() {
        enabledRegistry[this.map.id] = this;
        this.enabled = true;
        this.enabling = true;
        each(
          this.depMaps,
          bind(this, function(depMap, i) {
            var id, mod, handler;
            if (typeof depMap === "string") {
              depMap = makeModuleMap(
                depMap,
                this.map.isDefine ? this.map : this.map.parentMap,
                false,
                !this.skipMap
              );
              this.depMaps[i] = depMap;
              handler = getOwn(handlers, depMap.id);
              if (handler) {
                this.depExports[i] = handler(this);
                return;
              }
              this.depCount += 1;
              on(
                depMap,
                "defined",
                bind(this, function(depExports) {
                  if (this.undefed) {
                    return;
                  }
                  this.defineDep(i, depExports);
                  this.check();
                })
              );
              if (this.errback) {
                on(depMap, "error", bind(this, this.errback));
              } else if (this.events.error) {
                on(
                  depMap,
                  "error",
                  bind(this, function(err) {
                    this.emit("error", err);
                  })
                );
              }
            }
            id = depMap.id;
            mod = registry[id];
            if (!hasProp(handlers, id) && mod && !mod.enabled) {
              context.enable(depMap, this);
            }
          })
        );
        eachProp(
          this.pluginMaps,
          bind(this, function(pluginMap) {
            var mod = getOwn(registry, pluginMap.id);
            if (mod && !mod.enabled) {
              context.enable(pluginMap, this);
            }
          })
        );
        this.enabling = false;
        this.check();
      },
      on: function(name, cb) {
        var cbs = this.events[name];
        if (!cbs) {
          cbs = this.events[name] = [];
        }
        cbs.push(cb);
      },
      emit: function(name, evt) {
        each(this.events[name], function(cb) {
          cb(evt);
        });
        if (name === "error") {
          delete this.events[name];
        }
      }
    };
    function callGetModule(args) {
      if (!hasProp(defined, args[0])) {
        getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
      }
    }
    function removeListener(node, func, name, ieName) {
      if (node.detachEvent && !isOpera) {
        if (ieName) {
          node.detachEvent(ieName, func);
        }
      } else {
        node.removeEventListener(name, func, false);
      }
    }
    function getScriptData(evt) {
      var node = evt.currentTarget || evt.srcElement;
      removeListener(node, context.onScriptLoad, "load", "onreadystatechange");
      removeListener(node, context.onScriptError, "error");
      return {
        node,
        id: node && node.getAttribute("data-requiremodule")
      };
    }
    function intakeDefines() {
      var args;
      takeGlobalQueue();
      while (defQueue.length) {
        args = defQueue.shift();
        if (args[0] === null) {
          return onError(
            makeError(
              "mismatch",
              "Mismatched anonymous define() module: " + args[args.length - 1]
            )
          );
        } else {
          callGetModule(args);
        }
      }
      context.defQueueMap = {};
    }
    context = {
      config,
      contextName,
      registry,
      defined,
      urlFetched,
      defQueue,
      defQueueMap: {},
      Module,
      makeModuleMap,
      nextTick: req.nextTick,
      onError,
      /**
       * @private
       * Set a configuration for the context.
       * @param {object} cfg config object to integrate.
       */
      configure: function(cfg2) {
        if (cfg2.baseUrl) {
          if (cfg2.baseUrl.charAt(cfg2.baseUrl.length - 1) !== "/") {
            cfg2.baseUrl += "/";
          }
        }
        var shim = config.shim, objs = {
          paths: true,
          bundles: true,
          config: true,
          map: true
        };
        eachProp(cfg2, function(value, prop) {
          if (objs[prop]) {
            if (!config[prop]) {
              config[prop] = {};
            }
            mixin(config[prop], value, true, true);
          } else {
            config[prop] = value;
          }
        });
        if (cfg2.bundles) {
          eachProp(cfg2.bundles, function(value, prop) {
            each(value, function(v) {
              if (v !== prop) {
                bundlesMap[v] = prop;
              }
            });
          });
        }
        if (cfg2.shim) {
          eachProp(cfg2.shim, function(value, id) {
            if (isArray(value)) {
              value = {
                deps: value
              };
            }
            if ((value.exports || value.init) && !value.exportsFn) {
              value.exportsFn = context.makeShimExports(value);
            }
            shim[id] = value;
          });
          config.shim = shim;
        }
        if (cfg2.packages) {
          each(cfg2.packages, function(pkgObj) {
            var location, name;
            pkgObj = typeof pkgObj === "string" ? { name: pkgObj } : pkgObj;
            name = pkgObj.name;
            location = pkgObj.location;
            if (location) {
              config.paths[name] = pkgObj.location;
            }
            config.pkgs[name] = pkgObj.name + "/" + (pkgObj.main || "main").replace(currDirRegExp, "").replace(jsSuffixRegExp, "");
          });
        }
        eachProp(registry, function(mod, id) {
          if (!mod.inited && !mod.map.unnormalized) {
            mod.map = makeModuleMap(id, null, true);
          }
        });
        if (cfg2.deps || cfg2.callback) {
          context.require(cfg2.deps || [], cfg2.callback);
        }
      },
      makeShimExports: function(value) {
        function fn() {
          var ret;
          if (value.init) {
            ret = value.init.apply(global, arguments);
          }
          return ret || value.exports && getGlobal(value.exports);
        }
        return fn;
      },
      makeRequire: function(relMap, options) {
        options = options || {};
        function localRequire(deps, callback, errback) {
          var id, map, requireMod;
          if (options.enableBuildCallback && callback && isFunction(callback)) {
            callback.__requireJsBuild = true;
          }
          if (typeof deps === "string") {
            if (isFunction(callback)) {
              return onError(
                makeError("requireargs", "Invalid require call"),
                errback
              );
            }
            if (relMap && hasProp(handlers, deps)) {
              return handlers[deps](registry[relMap.id]);
            }
            if (req.get) {
              return req.get(context, deps, relMap, localRequire);
            }
            map = makeModuleMap(deps, relMap, false, true);
            id = map.id;
            if (!hasProp(defined, id)) {
              return onError(
                makeError(
                  "notloaded",
                  'Module name "' + id + '" has not been loaded yet for context: ' + contextName + (relMap ? "" : ". Use require([])")
                )
              );
            }
            return defined[id];
          }
          intakeDefines();
          context.nextTick(function() {
            intakeDefines();
            requireMod = getModule(makeModuleMap(null, relMap));
            requireMod.skipMap = options.skipMap;
            requireMod.init(deps, callback, errback, {
              enabled: true
            });
            checkLoaded();
          });
          return localRequire;
        }
        mixin(localRequire, {
          isBrowser,
          /**
           * Converts a module name + .extension into an URL path.
           * *Requires* the use of a module name. It does not support using
           * plain URLs like nameToUrl.
           */
          toUrl: function(moduleNamePlusExt) {
            var ext, index = moduleNamePlusExt.lastIndexOf("."), segment = moduleNamePlusExt.split("/")[0], isRelative = segment === "." || segment === "..";
            if (index !== -1 && (!isRelative || index > 1)) {
              ext = moduleNamePlusExt.substring(
                index,
                moduleNamePlusExt.length
              );
              moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
            }
            return context.nameToUrl(
              normalize(moduleNamePlusExt, relMap && relMap.id, true),
              ext,
              true
            );
          },
          defined: function(id) {
            return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
          },
          specified: function(id) {
            id = makeModuleMap(id, relMap, false, true).id;
            return hasProp(defined, id) || hasProp(registry, id);
          }
        });
        if (!relMap) {
          localRequire.undef = function(id) {
            takeGlobalQueue();
            var map = makeModuleMap(id, relMap, true), mod = getOwn(registry, id);
            mod.undefed = true;
            removeScript(id);
            delete defined[id];
            delete urlFetched[map.url];
            delete undefEvents[id];
            eachReverse(defQueue, function(args, i) {
              if (args[0] === id) {
                defQueue.splice(i, 1);
              }
            });
            delete context.defQueueMap[id];
            if (mod) {
              if (mod.events.defined) {
                undefEvents[id] = mod.events;
              }
              cleanRegistry(id);
            }
          };
        }
        return localRequire;
      },
      /**
       * @private
       * Called to enable a module if it is still in the registry
       * awaiting enablement. A second arg, parent, the parent module,
       * is passed in for context, when this method is overridden by
       * the optimizer. Not shown here to keep code compact.
       */
      enable: function(depMap) {
        var mod = getOwn(registry, depMap.id);
        if (mod) {
          getModule(depMap).enable();
        }
      },
      /**
       * Internal method used by environment adapters to complete a load event.
       * A load event could be a script load or just a load pass from a synchronous
       * load call.
       * @param {string} moduleName the name of the module to potentially complete.
       * @private
       */
      completeLoad: function(moduleName) {
        var found, args, mod, shim = getOwn(config.shim, moduleName) || {}, shExports = shim.exports;
        takeGlobalQueue();
        while (defQueue.length) {
          args = defQueue.shift();
          if (args[0] === null) {
            args[0] = moduleName;
            if (found) {
              break;
            }
            found = true;
          } else if (args[0] === moduleName) {
            found = true;
          }
          callGetModule(args);
        }
        context.defQueueMap = {};
        mod = getOwn(registry, moduleName);
        if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
          if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
            if (hasPathFallback(moduleName)) {
              return;
            } else {
              return onError(
                makeError(
                  "nodefine",
                  "No define call for " + moduleName,
                  null,
                  [moduleName]
                )
              );
            }
          } else {
            callGetModule([moduleName, shim.deps || [], shim.exportsFn]);
          }
        }
        checkLoaded();
      },
      /**
       * @private
       * Converts a module name to a file path. Supports cases where
       * moduleName may actually be just an URL.
       * Note that it **does not** call normalize on the moduleName,
       * it is assumed to have already been normalized. This is an
       * internal API, not a public one. Use toUrl for the public API.
       */
      nameToUrl: function(moduleName, ext, skipExt) {
        var paths, syms, i, parentModule, url, parentPath, bundleId, pkgMain = getOwn(config.pkgs, moduleName);
        if (pkgMain) {
          moduleName = pkgMain;
        }
        bundleId = getOwn(bundlesMap, moduleName);
        if (bundleId) {
          return context.nameToUrl(bundleId, ext, skipExt);
        }
        if (req.jsExtRegExp.test(moduleName)) {
          url = moduleName + (ext || "");
        } else {
          paths = config.paths;
          syms = moduleName.split("/");
          for (i = syms.length; i > 0; i -= 1) {
            parentModule = syms.slice(0, i).join("/");
            parentPath = getOwn(paths, parentModule);
            if (parentPath) {
              if (isArray(parentPath)) {
                parentPath = parentPath[0];
              }
              syms.splice(0, i, parentPath);
              break;
            }
          }
          url = syms.join("/");
          url += ext || (/^data\:|\?/.test(url) || skipExt ? "" : ".js");
          url = (url.charAt(0) === "/" || url.match(/^[\w\+\.\-]+:/) ? "" : config.baseUrl) + url;
        }
        return config.urlArgs ? url + ((url.indexOf("?") === -1 ? "?" : "&") + config.urlArgs) : url;
      },
      //Delegates to req.load. Broken out as a separate function to
      //allow overriding in the optimizer.
      load: function(id, url) {
        req.load(context, id, url);
      },
      /**
       * Executes a module callback function. Broken out as a separate function
       * solely to allow the build system to sequence the files in the built
       * layer in the right sequence.
       *
       * @private
       */
      execCb: function(name, callback, args, exports) {
        return callback.apply(exports, args);
      },
      /**
       * callback for script loads, used to check status of loading.
       * @private
       * @param {Event} evt the event from the browser for the script
       * that was loaded.
       */
      onScriptLoad: function(evt) {
        if (evt.type === "load" || readyRegExp.test((evt.currentTarget || evt.srcElement).readyState)) {
          interactiveScript = null;
          var data = getScriptData(evt);
          context.completeLoad(data.id);
        }
      },
      /**
       * @private
       * Callback for script errors.
       */
      onScriptError: function(evt) {
        var data = getScriptData(evt);
        if (!hasPathFallback(data.id)) {
          return onError(
            makeError("scripterror", "Script error for: " + data.id, evt, [
              data.id
            ])
          );
        }
      }
    };
    context.require = context.makeRequire();
    return context;
  }
  req = requirejs = function(deps, callback, errback, optional) {
    var context, config, contextName = defContextName;
    if (!isArray(deps) && typeof deps !== "string") {
      config = deps;
      if (isArray(callback)) {
        deps = callback;
        callback = errback;
        errback = optional;
      } else {
        deps = [];
      }
    }
    if (config && config.context) {
      contextName = config.context;
    }
    context = getOwn(contexts, contextName);
    if (!context) {
      context = contexts[contextName] = req.s.newContext(contextName);
    }
    if (config) {
      context.configure(config);
    }
    return context.require(deps, callback, errback);
  };
  req.config = function(config) {
    return req(config);
  };
  req.nextTick = typeof setTimeout !== "undefined" ? function(fn) {
    setTimeout(fn, 4);
  } : function(fn) {
    fn();
  };
  if (!require) {
    require = req;
  }
  req.version = version;
  req.jsExtRegExp = /^\/|:|\?|\.js$/;
  req.isBrowser = isBrowser;
  s = req.s = {
    contexts,
    newContext
  };
  req({});
  each(["toUrl", "undef", "defined", "specified"], function(prop) {
    req[prop] = function() {
      var ctx = contexts[defContextName];
      return ctx.require[prop].apply(ctx, arguments);
    };
  });
  if (isBrowser) {
    head = s.head = document.getElementsByTagName("head")[0];
    baseElement = document.getElementsByTagName("base")[0];
    if (baseElement) {
      head = s.head = baseElement.parentNode;
    }
  }
  req.onError = defaultOnError;
  req.createNode = function(config, moduleName, url) {
    var node = config.xhtml ? document.createElementNS("http://www.w3.org/1999/xhtml", "html:script") : document.createElement("script");
    node.type = config.scriptType || "text/javascript";
    node.charset = "utf-8";
    node.async = true;
    return node;
  };
  req.load = function(context, moduleName, url) {
    var config = context && context.config || {}, node;
    if (isBrowser) {
      node = req.createNode(config, moduleName, url);
      if (config.onNodeCreated) {
        config.onNodeCreated(node, config, moduleName, url);
      }
      node.setAttribute("data-requirecontext", context.contextName);
      node.setAttribute("data-requiremodule", moduleName);
      if (node.attachEvent && //Check if node.attachEvent is artificially added by custom script or
      //natively supported by browser
      //read https://github.com/jrburke/requirejs/issues/187
      //if we can NOT find [native code] then it must NOT natively supported.
      //in IE8, node.attachEvent does not have toString()
      //Note the test for "[native code" with no closing brace, see:
      //https://github.com/jrburke/requirejs/issues/273
      !(node.attachEvent.toString && node.attachEvent.toString().indexOf("[native code") < 0) && !isOpera) {
        useInteractive = true;
        node.attachEvent("onreadystatechange", context.onScriptLoad);
      } else {
        node.addEventListener("load", context.onScriptLoad, false);
        node.addEventListener("error", context.onScriptError, false);
      }
      node.src = url;
      currentlyAddingScript = node;
      if (baseElement) {
        head.insertBefore(node, baseElement);
      } else {
        head.appendChild(node);
      }
      currentlyAddingScript = null;
      return node;
    } else if (isWebWorker) {
      try {
        importScripts(url);
        context.completeLoad(moduleName);
      } catch (e) {
        context.onError(
          makeError(
            "importscripts",
            "importScripts failed for " + moduleName + " at " + url,
            e,
            [moduleName]
          )
        );
      }
    }
  };
  function getInteractiveScript() {
    if (interactiveScript && interactiveScript.readyState === "interactive") {
      return interactiveScript;
    }
    eachReverse(scripts(), function(script) {
      if (script.readyState === "interactive") {
        return interactiveScript = script;
      }
    });
    return interactiveScript;
  }
  if (isBrowser && !cfg.skipDataMain) {
    eachReverse(scripts(), function(script) {
      if (!head) {
        head = script.parentNode;
      }
      dataMain = script.getAttribute("data-main");
      if (dataMain) {
        mainScript = dataMain;
        if (!cfg.baseUrl) {
          src = mainScript.split("/");
          mainScript = src.pop();
          subPath = src.length ? src.join("/") + "/" : "./";
          cfg.baseUrl = subPath;
        }
        mainScript = mainScript.replace(jsSuffixRegExp, "");
        if (req.jsExtRegExp.test(mainScript)) {
          mainScript = dataMain;
        }
        cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];
        return true;
      }
    });
  }
  define = function(name, deps, callback) {
    var node, context;
    if (typeof name !== "string") {
      callback = deps;
      deps = name;
      name = null;
    }
    if (!isArray(deps)) {
      callback = deps;
      deps = null;
    }
    if (!deps && isFunction(callback)) {
      deps = [];
      if (callback.length) {
        callback.toString().replace(commentRegExp, "").replace(cjsRequireRegExp, function(match, dep) {
          deps.push(dep);
        });
        deps = (callback.length === 1 ? ["require"] : ["require", "exports", "module"]).concat(deps);
      }
    }
    if (useInteractive) {
      node = currentlyAddingScript || getInteractiveScript();
      if (node) {
        if (!name) {
          name = node.getAttribute("data-requiremodule");
        }
        context = contexts[node.getAttribute("data-requirecontext")];
      }
    }
    if (context) {
      context.defQueue.push([name, deps, callback]);
      context.defQueueMap[name] = true;
    } else {
      globalDefQueue.push([name, deps, callback]);
    }
  };
  define.amd = {
    jQuery: true
  };
  req.exec = function(text) {
    return eval(text);
  };
  req(cfg);
})(this);
