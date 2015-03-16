(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/lib/esmangle.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, exports:true, define:true*/

(function () {
    'use strict';

    var VERSION,
        escope,
        common,
        Syntax,
        annotateDirective;

    // Sync with package.json.
    VERSION = '0.0.10-dev';

    escope = require('escope');
    common = require('./common');
    annotateDirective = require('./annotate-directive');
    Syntax = common.Syntax;

    // simple visitor implementation

    function passAsUnique(scope, name) {
        var i, iz;
        if (common.isKeyword(name) || common.isRestrictedWord(name)) {
            return false;
        }
        if (scope.taints.has(name)) {
            return false;
        }
        for (i = 0, iz = scope.through.length; i < iz; ++i) {
            if (scope.through[i].identifier.name === name) {
                return false;
            }
        }
        return true;
    }

    function generateName(scope, tip) {
        do {
            tip = common.generateNextName(tip);
        } while (!passAsUnique(scope, tip));
        return tip;
    }

    function run(scope) {
        var i, iz, j, jz, variable, name, def, ref;

        if (scope.isStatic()) {
            name = '9';

            scope.variables.sort(function (a, b) {
                if (a.tainted) {
                    return 1;
                }
                if (b.tainted) {
                    return -1;
                }
                return (b.identifiers.length + b.references.length) - (a.identifiers.length + a.references.length);
            });

            for (i = 0, iz = scope.variables.length; i < iz; ++i) {
                variable = scope.variables[i];

                if (variable.tainted) {
                    continue;
                }

                // Because `arguments` definition is nothing.
                // But if `var arguments` is defined, identifiers.length !== 0
                // and this doesn't indicate arguments.
                if (variable.identifiers.length === 0) {
                    // do not change names because this is special name
                    continue;
                }

                name = generateName(scope, name);

                for (j = 0, jz = variable.identifiers.length; j < jz; ++j) {
                    def = variable.identifiers[j];
                    // change definition's name
                    def.name = name;
                }

                for (j = 0, jz = variable.references.length; j < jz; ++j) {
                    ref = variable.references[j];
                    // change reference's name
                    ref.identifier.name = name;
                }
            }
        }
    }

    function mangle(tree, options) {
        var result, manager, i, iz;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        manager = escope.analyze(result);

        // mangling names
        for (i = 0, iz = manager.scopes.length; i < iz; ++i) {
            run(manager.scopes[i]);
        }

        return result;
    }

    // recover some broken AST

    function recover(tree, useDirectiveStatement) {
        function trailingIf(node) {
            while (true) {
                switch (node.type) {
                case Syntax.IfStatement:
                    if (!node.alternate) {
                        return true;
                    }
                    node = node.alternate;
                    continue;

                case Syntax.LabeledStatement:
                case Syntax.ForStatement:
                case Syntax.ForInStatement:
                case Syntax.WhileStatement:
                case Syntax.WithStatement:
                    node = node.body;
                    continue;
                }
                return false;
            }
        }

        common.traverse(tree, {
            leave: function leave(node) {
                var expr;
                if (node.type === Syntax.IfStatement && node.alternate) {
                    // force wrap up or not
                    if (node.consequent.type !== Syntax.BlockStatement) {
                        if (trailingIf(node.consequent)) {
                            node.consequent = {
                                type: Syntax.BlockStatement,
                                body: [ node.consequent ]
                            };
                        }
                    }
                }
                if (!useDirectiveStatement && node.type === Syntax.DirectiveStatement) {
                    node.type = Syntax.ExpressionStatement;
                    node.expression = common.moveLocation(node, {
                        type: Syntax.Literal,
                        value: node.value,
                        raw: node.raw
                    });
                    delete node.directive;
                    delete node.value;
                    delete node.raw;
                }
            }
        });

        return tree;
    }

    function iteration(tree, p, options) {
        var i, iz, pass, res, changed, statuses, passes, result;

        function addPass(pass) {
            var name;
            if (typeof pass !== 'function') {
                // automatic lookup pass (esmangle pass format)
                name = Object.keys(pass)[0];
                pass = pass[name];
            }
            if (pass.hasOwnProperty('passName')) {
                name = pass.passName;
            } else {
                name = pass.name;
            }
            passes.push(pass);
            statuses.push(true);
        }

        function fillStatuses(bool) {
            var i, iz;
            for (i = 0, iz = statuses.length; i < iz; ++i) {
                statuses[i] = bool;
            }
        }

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);

        statuses = [];
        passes = [];


        for (i = 0, iz = p.length; i < iz; ++i) {
            addPass(p[i]);
        }

        do {
            changed = false;
            for (i = 0, iz = passes.length; i < iz; ++i) {
                pass = passes[i];
                if (statuses[i]) {
                    res = pass(result, { destructive: true });
                    if (res.modified) {
                        changed = true;
                        fillStatuses(true);
                    } else {
                        statuses[i] = false;
                    }
                    result = res.result;
                }
            }
        } while (changed);

        return result;
    }

    function optimize(tree, pipeline, options) {
        var i, iz, j, jz, section, pass;

        tree = annotateDirective(tree, { destructive: false });

        if (null == pipeline) {
            pipeline = [
                [
                    'pass/hoist-variable-to-arguments',
                    'pass/transform-dynamic-to-static-property-access',
                    'pass/transform-dynamic-to-static-property-definition',
                    'pass/transform-immediate-function-call',
                    'pass/transform-logical-association',
                    'pass/reordering-function-declarations',
                    'pass/remove-unused-label',
                    'pass/remove-empty-statement',
                    'pass/remove-wasted-blocks',
                    'pass/transform-to-compound-assignment',
                    'pass/transform-to-sequence-expression',
                    'pass/transform-branch-to-expression',
                    'pass/transform-typeof-undefined',
                    'pass/reduce-sequence-expression',
                    'pass/reduce-branch-jump',
                    'pass/reduce-multiple-if-statements',
                    'pass/dead-code-elimination',
                    'pass/remove-side-effect-free-expressions',
                    'pass/remove-context-sensitive-expressions',
                    'pass/tree-based-constant-folding',
                    'pass/drop-variable-definition',
                    'pass/remove-unreachable-branch'
                ].map(esmangle_require),
                {
                    once: true,
                    pass: [
                        'post/transform-static-to-dynamic-property-access',
                        'post/transform-infinity',
                        'post/rewrite-boolean',
                        'post/rewrite-conditional-expression'
                    ].map(esmangle_require)
                }
            ];
        }

        if (options == null) {
            options = {};
        }

        for (i = 0, iz = pipeline.length; i < iz; ++i) {
            section = pipeline[i];
            // simple iterative pass
            if (common.isArray(section)) {
                tree = iteration(tree, section, options);
            } else if (section.once) {
                pass = section.pass;
                for (j = 0, jz = pass.length; j < jz; ++j) {
                    tree = pass[j](tree, options).result;
                }
            }
        }

        return recover(tree, options.directive);
    }

    function esmangle_require() {
        var args = ['./' + arguments[0]].concat([].slice.call(arguments, 1));
        return require.apply(null, args);
    }

    exports.version = VERSION;
    exports.mangle = mangle;
    exports.optimize = optimize;
    exports.require = esmangle_require;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/node_modules/escope/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"escope.js"}
});

require.define("/node_modules/escope/escope.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global escope:true, exports:true, define:true*/
(function (factory, global) {
    'use strict';

    function namespace(str, obj) {
        var i, iz, names, name;
        names = str.split('.');
        for (i = 0, iz = names.length; i < iz; ++i) {
            name = names[i];
            if (obj.hasOwnProperty(name)) {
                obj = obj[name];
            } else {
                obj = (obj[name] = {});
            }
        }
        return obj;
    }

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define('escope', ['exports'], function (exports) {
            factory(exports, global);
        });
    } else if (typeof exports !== 'undefined') {
        factory(exports, global);
    } else {
        factory(namespace('escope', global), global);
    }
}(function (exports, global) {
    'use strict';

    var estraverse,
        Syntax,
        Map,
        currentScope,
        scopes;

    estraverse = require('estraverse');
    Syntax = estraverse.Syntax;

    if (typeof global.Map !== 'undefined') {
        // ES6 Map
        Map = global.Map;
    } else {
        Map = function Map() {
            this.__data = {};
        };

        Map.prototype.get = function MapGet(key) {
            key = '$' + key;
            if (this.__data.hasOwnProperty(key)) {
                return this.__data[key];
            }
            return undefined;
        };

        Map.prototype.has = function MapHas(key) {
            key = '$' + key;
            return this.__data.hasOwnProperty(key);
        };

        Map.prototype.set = function MapSet(key, val) {
            key = '$' + key;
            this.__data[key] = val;
        };

        Map.prototype['delete'] = function MapDelete(key) {
            key = '$' + key;
            return delete this.__data[key];
        };
    }

    function assert(cond, text) {
        if (!cond) {
            throw new Error(text);
        }
    }

    function unreachable() {
        throw new Error('Unreachable point. logically broken.');
    }

    function Reference(ident, scope, flag, writeExpr) {
        this.identifier = ident;
        this.from = scope;
        this.tainted = false;
        this.resolved = null;
        this.flag = flag;
        if (this.isWrite()) {
            this.writeExpr = writeExpr;
        }
    }

    Reference.READ = 0x1;
    Reference.WRITE = 0x2;
    Reference.RW = 0x3;

    Reference.prototype.isStatic = function isStatic() {
        return !this.tainted && this.resolved && this.resolved.scope.isStatic();
    };

    Reference.prototype.isWrite = function isWrite() {
        return this.flag & Reference.WRITE;
    };

    Reference.prototype.isRead = function isRead() {
        return this.flag & Reference.READ;
    };

    Reference.prototype.isReadOnly = function isReadOnly() {
        return this.flag === Reference.READ;
    };

    Reference.prototype.isWriteOnly = function isWriteOnly() {
        return this.flag === Reference.WRITE;
    };

    Reference.prototype.isReadWrite = function isReadWrite() {
        return this.flag === Reference.RW;
    };

    function Variable(name, scope) {
        this.name = name;
        this.identifiers = [];
        this.references = [];

        this.defs = [];

        this.tainted = false;
        this.stack = true;
        this.scope = scope;
    }

    Variable.CatchClause = 'CatchClause';
    Variable.Parameter = 'Parameter';
    Variable.FunctionName = 'FunctionName';
    Variable.Variable = 'Variable';

    function Scope(block, opt) {
        var variable;

        this.type =
            (block.type === Syntax.CatchClause) ? 'catch' :
            (block.type === Syntax.WithStatement) ? 'with' :
            (block.type === Syntax.Program) ? 'global' : 'function';
        this.set = new Map;
        this.taints = new Map;
        this.dynamic = this.type === 'global' || this.type === 'with';
        this.block = block;
        this.through = [];
        this.variables = [];
        this.references = [];
        this.left = [];
        this.variableScope =
            (this.type === 'global' || this.type === 'function') ? this : currentScope.variableScope;
        this.functionExpressionScope = false;
        this.directCallToEvalScope = false;
        this.thisFound = false;

        if (opt.naming) {
            this.__define(block.id, {
                type: Variable.FunctionName,
                name: block.id,
                node: block
            });
            this.functionExpressionScope = true;
        } else {
            if (this.type === 'function') {
                variable = new Variable('arguments', this);
                this.taints.set('arguments', true);
                this.set.set('arguments', variable);
                this.variables.push(variable);
            }

            if (block.type === Syntax.FunctionExpression && block.id) {
                new Scope(block, { naming: true });
            }
        }

        // RAII
        this.upper = currentScope;
        currentScope = this;
        scopes.push(this);
    }

    Scope.prototype.__close = function __close() {
        var i, iz, ref, set, current;

        // Because if this is global environment, upper is null
        if (!this.dynamic) {
            // static resolve
            for (i = 0, iz = this.left.length; i < iz; ++i) {
                ref = this.left[i];
                if (!this.__resolve(ref)) {
                    this.__delegateToUpperScope(ref);
                }
            }
        } else {
            // this is global / with / function with eval environment
            if (this.type === 'with') {
                for (i = 0, iz = this.left.length; i < iz; ++i) {
                    ref = this.left[i];
                    ref.tainted = true;
                    this.__delegateToUpperScope(ref);
                }
            } else {
                for (i = 0, iz = this.left.length; i < iz; ++i) {
                    // notify all names are through to global
                    ref = this.left[i];
                    current = this;
                    do {
                        current.through.push(ref);
                        current = current.upper;
                    } while (current);
                }
            }
        }
        this.left = null;
        currentScope = this.upper;
    };

    Scope.prototype.__resolve = function __resolve(ref) {
        var i, iz, variable, name;
        name = ref.identifier.name;
        if (this.set.has(name)) {
            variable = this.set.get(name);
            variable.references.push(ref);
            variable.stack = variable.stack && ref.from.variableScope === this.variableScope;
            if (ref.tainted) {
                variable.tainted = true;
                this.taints.set(variable.name, true);
            }
            ref.resolved = variable;
            return true;
        }
        return false;
    };

    Scope.prototype.__delegateToUpperScope = function __delegateToUpperScope(ref) {
        assert(this.upper, 'upper should be here');
        this.upper.left.push(ref);
        this.through.push(ref);
    };

    Scope.prototype.__define = function __define(node, info) {
        var name, variable;
        if (node && node.type === Syntax.Identifier) {
            name = node.name;
            if (!this.set.has(name)) {
                variable = new Variable(name, this);
                variable.identifiers.push(node);
                variable.defs.push(info);
                this.set.set(name, variable);
                this.variables.push(variable);
            } else {
                variable = this.set.get(name);
                variable.identifiers.push(node);
                variable.defs.push(info);
            }
        }
    };

    Scope.prototype.__referencing = function __referencing(node, assign, writeExpr) {
        var ref;
        // because Array element may be null
        if (node && node.type === Syntax.Identifier) {
            ref = new Reference(node, this, assign || Reference.READ, writeExpr);
            this.references.push(ref);
            this.left.push(ref);
        }
    };

    Scope.prototype.__detectEval = function __detectEval() {
        var current;
        current = this;
        this.directCallToEvalScope = true;
        do {
            current.dynamic = true;
            current = current.upper;
        } while (current);
    };

    Scope.prototype.__detectThis = function __detectThis() {
        this.thisFound = true;
    };

    Scope.prototype.__isClosed = function isClosed() {
        return this.left === null;
    };

    // API Scope#resolve(name)
    // returns resolved reference
    Scope.prototype.resolve = function resolve(ident) {
        var ref, i, iz;
        assert(this.__isClosed(), "scope should be closed");
        assert(ident.type === Syntax.Identifier, "target should be identifier");
        for (i = 0, iz = this.references.length; i < iz; ++i) {
            ref = this.references[i];
            if (ref.identifier === ident) {
                return ref;
            }
        }
        unreachable();
    };

    // API Scope#isStatic
    // returns this scope is static
    Scope.prototype.isStatic = function isStatic() {
        return !this.dynamic;
    };

    // API Scope#isArgumentsMaterialized
    // return this scope has materialized arguments
    Scope.prototype.isArgumentsMaterialized = function isArgumentsMaterialized() {
        // TODO(Constellation)
        // We can more aggressive on this condition like this.
        //
        // function t() {
        //     // arguments of t is always hidden.
        //     function arguments() {
        //     }
        // }
        var variable;

        // This is not function scope
        if (this.type !== 'function') {
            return true;
        }

        if (!this.isStatic()) {
            return true;
        }

        variable = this.set.get('arguments');
        assert(variable, 'always have arguments variable');
        return variable.tainted || variable.references.length  !== 0;
    };

    // API Scope#isThisMaterialized
    // return this scope has materialized `this` reference
    Scope.prototype.isThisMaterialized = function isThisMaterialized() {
        // This is not function scope
        if (this.type !== 'function') {
            return true;
        }
        if (!this.isStatic()) {
            return true;
        }
        return this.thisFound;
    };

    Scope.mangledName = '__$escope$__';

    Scope.prototype.attach = function attach() {
        if (!this.functionExpressionScope) {
            this.block[Scope.mangledName] = this;
        }
    };

    Scope.prototype.detach = function detach() {
        if (!this.functionExpressionScope) {
            delete this.block[Scope.mangledName];
        }
    };

    function ScopeManager(scopes) {
        this.scopes = scopes;
        this.attached = false;
    }

    // Returns appropliate scope for this node
    ScopeManager.prototype.__get = function __get(node) {
        var i, iz, scope;
        if (this.attached) {
            return node[Scope.mangledName] || null;
        }
        if (Scope.isScopeRequired(node)) {
            for (i = 0, iz = this.scopes.length; i < iz; ++i) {
                scope = this.scopes[i];
                if (!scope.functionExpressionScope) {
                    if (scope.block === node) {
                        return scope;
                    }
                }
            }
        }
        return null;
    };

    ScopeManager.prototype.acquire = function acquire(node) {
        return this.__get(node);
    };

    ScopeManager.prototype.release = function release(node) {
        var scope = this.__get(node);
        if (scope) {
            scope = scope.upper;
            while (scope) {
                if (!scope.functionExpressionScope) {
                    return scope;
                }
                scope = scope.upper;
            }
        }
        return null;
    };

    ScopeManager.prototype.attach = function attach() {
        var i, iz;
        for (i = 0, iz = this.scopes.length; i < iz; ++i) {
            this.scopes[i].attach();
        }
        this.attached = true;
    };

    ScopeManager.prototype.detach = function detach() {
        var i, iz;
        for (i = 0, iz = this.scopes.length; i < iz; ++i) {
            this.scopes[i].detach();
        }
        this.attached = false;
    };

    Scope.isScopeRequired = function isScopeRequired(node) {
        return Scope.isVariableScopeRequired(node) || node.type === Syntax.WithStatement || node.type === Syntax.CatchClause;
    };

    Scope.isVariableScopeRequired = function isVariableScopeRequired(node) {
        return node.type === Syntax.Program || node.type === Syntax.FunctionExpression || node.type === Syntax.FunctionDeclaration;
    };

    function analyze(tree) {
        scopes = [];
        currentScope = null;

        // attach scope and collect / resolve names
        estraverse.traverse(tree, {
            enter: function enter(node, parent) {
                var i, iz, decl;
                if (Scope.isScopeRequired(node)) {
                    new Scope(node, {});
                }

                switch (node.type) {
                case Syntax.AssignmentExpression:
                    currentScope.__referencing(node.left, Reference.WRITE, node.right);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.ArrayExpression:
                    for (i = 0, iz = node.elements.length; i < iz; ++i) {
                        currentScope.__referencing(node.elements[i]);
                    }
                    break;

                case Syntax.BlockStatement:
                    break;

                case Syntax.BinaryExpression:
                    currentScope.__referencing(node.left);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.BreakStatement:
                    break;

                case Syntax.CallExpression:
                    currentScope.__referencing(node.callee);
                    for (i = 0, iz = node['arguments'].length; i < iz; ++i) {
                        currentScope.__referencing(node['arguments'][i]);
                    }

                    // check this is direct call to eval
                    if (node.callee.type === Syntax.Identifier && node.callee.name === 'eval') {
                        currentScope.variableScope.__detectEval();
                    }
                    break;

                case Syntax.CatchClause:
                    currentScope.__define(node.param, {
                        type: Variable.CatchClause,
                        name: node.param,
                        node: node
                    });
                    break;

                case Syntax.ConditionalExpression:
                    currentScope.__referencing(node.test);
                    currentScope.__referencing(node.consequent);
                    currentScope.__referencing(node.alternate);
                    break;

                case Syntax.ContinueStatement:
                    break;

                case Syntax.DirectiveStatement:
                    break;

                case Syntax.DoWhileStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.DebuggerStatement:
                    break;

                case Syntax.EmptyStatement:
                    break;

                case Syntax.ExpressionStatement:
                    currentScope.__referencing(node.expression);
                    break;

                case Syntax.ForStatement:
                    currentScope.__referencing(node.init);
                    currentScope.__referencing(node.test);
                    currentScope.__referencing(node.update);
                    break;

                case Syntax.ForInStatement:
                    if (node.left.type === Syntax.VariableDeclaration) {
                        currentScope.__referencing(node.left.declarations[0].id, Reference.WRITE, null);
                    } else {
                        currentScope.__referencing(node.left, Reference.WRITE, null);
                    }
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.FunctionDeclaration:
                    // FunctionDeclaration name is defined in upper scope
                    currentScope.upper.__define(node.id, {
                        type: Variable.FunctionName,
                        name: node.id,
                        node: node
                    });
                    for (i = 0, iz = node.params.length; i < iz; ++i) {
                        currentScope.__define(node.params[i], {
                            type: Variable.Parameter,
                            name: node.params[i],
                            node: node,
                            index: i
                        });
                    }
                    break;

                case Syntax.FunctionExpression:
                    // id is defined in upper scope
                    for (i = 0, iz = node.params.length; i < iz; ++i) {
                        currentScope.__define(node.params[i], {
                            type: Variable.Parameter,
                            name: node.params[i],
                            node: node,
                            index: i
                        });
                    }
                    break;

                case Syntax.Identifier:
                    break;

                case Syntax.IfStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.Literal:
                    break;

                case Syntax.LabeledStatement:
                    break;

                case Syntax.LogicalExpression:
                    currentScope.__referencing(node.left);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.MemberExpression:
                    currentScope.__referencing(node.object);
                    if (node.computed) {
                        currentScope.__referencing(node.property);
                    }
                    break;

                case Syntax.NewExpression:
                    currentScope.__referencing(node.callee);
                    for (i = 0, iz = node['arguments'].length; i < iz; ++i) {
                        currentScope.__referencing(node['arguments'][i]);
                    }
                    break;

                case Syntax.ObjectExpression:
                    break;

                case Syntax.Program:
                    break;

                case Syntax.Property:
                    currentScope.__referencing(node.value);
                    break;

                case Syntax.ReturnStatement:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.SequenceExpression:
                    for (i = 0, iz = node.expressions.length; i < iz; ++i) {
                        currentScope.__referencing(node.expressions[i]);
                    }
                    break;

                case Syntax.SwitchStatement:
                    currentScope.__referencing(node.discriminant);
                    break;

                case Syntax.SwitchCase:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.ThisExpression:
                    currentScope.variableScope.__detectThis();
                    break;

                case Syntax.ThrowStatement:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.TryStatement:
                    break;

                case Syntax.UnaryExpression:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.UpdateExpression:
                    currentScope.__referencing(node.argument, Reference.RW, null);
                    break;

                case Syntax.VariableDeclaration:
                    for (i = 0, iz = node.declarations.length; i < iz; ++i) {
                        decl = node.declarations[i];
                        currentScope.variableScope.__define(decl.id, {
                            type: Variable.Variable,
                            name: decl.id,
                            node: decl,
                            index: i,
                            parent: node
                        });
                        if (decl.init) {
                            // initializer is found
                            currentScope.__referencing(decl.id, Reference.WRITE, decl.init);
                            currentScope.__referencing(decl.init);
                        }
                    }
                    break;

                case Syntax.VariableDeclarator:
                    break;

                case Syntax.WhileStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.WithStatement:
                    currentScope.__referencing(node.object);
                    break;
                }
            },

            leave: function leave(node) {
                while (currentScope && node === currentScope.block) {
                    currentScope.__close();
                }
            }
        });
        assert(currentScope === null);

        return new ScopeManager(scopes);
    }

    exports.version = '0.0.10';
    exports.Reference = Reference;
    exports.Variable = Variable;
    exports.Scope = Scope;
    exports.ScopeManager = ScopeManager;
    exports.analyze = analyze;
}, this));
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/node_modules/estraverse/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"estraverse.js"}
});

require.define("/node_modules/estraverse/estraverse.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global exports:true, define:true, window:true */
(function (factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((window.estraverse = {}));
    }
}(function (exports) {
    'use strict';

    var Syntax,
        isArray,
        VisitorOption,
        VisitorKeys;

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    VisitorKeys = {
        AssignmentExpression: ['left', 'right'],
        ArrayExpression: ['elements'],
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'body'],
        FunctionExpression: ['id', 'params', 'body'],
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handlers', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body']
    };

    VisitorOption = {
        Break: 1,
        Skip: 2
    };

    function traverse(top, visitor) {
        var worklist, leavelist, node, ret, current, current2, candidates, candidate, marker = {};

        worklist = [ top ];
        leavelist = [ null ];

        while (worklist.length) {
            node = worklist.pop();

            if (node === marker) {
                node = leavelist.pop();
                if (visitor.leave) {
                    ret = visitor.leave(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }
                if (ret === VisitorOption.Break) {
                    return;
                }
            } else if (node) {
                if (visitor.enter) {
                    ret = visitor.enter(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }

                if (ret === VisitorOption.Break) {
                    return;
                }

                worklist.push(marker);
                leavelist.push(node);

                if (ret !== VisitorOption.Skip) {
                    candidates = VisitorKeys[node.type];
                    current = candidates.length;
                    while ((current -= 1) >= 0) {
                        candidate = node[candidates[current]];
                        if (candidate) {
                            if (isArray(candidate)) {
                                current2 = candidate.length;
                                while ((current2 -= 1) >= 0) {
                                    if (candidate[current2]) {
                                        worklist.push(candidate[current2]);
                                    }
                                }
                            } else {
                                worklist.push(candidate);
                            }
                        }
                    }
                }
            }
        }
    }

    function replace(top, visitor) {
        var worklist, leavelist, node, target, tuple, ret, current, current2, candidates, candidate, marker = {}, result;

        result = {
            top: top
        };

        tuple = [ top, result, 'top' ];
        worklist = [ tuple ];
        leavelist = [ tuple ];

        function notify(v) {
            ret = v;
        }

        while (worklist.length) {
            tuple = worklist.pop();

            if (tuple === marker) {
                tuple = leavelist.pop();
                ret = undefined;
                if (visitor.leave) {
                    node = tuple[0];
                    target = visitor.leave(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                }
                if (ret === VisitorOption.Break) {
                    return result.top;
                }
            } else if (tuple[0]) {
                ret = undefined;
                node = tuple[0];
                if (visitor.enter) {
                    target = visitor.enter(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                    tuple[0] = node;
                }

                if (ret === VisitorOption.Break) {
                    return result.top;
                }

                if (tuple[0]) {
                    worklist.push(marker);
                    leavelist.push(tuple);

                    if (ret !== VisitorOption.Skip) {
                        candidates = VisitorKeys[node.type];
                        current = candidates.length;
                        while ((current -= 1) >= 0) {
                            candidate = node[candidates[current]];
                            if (candidate) {
                                if (isArray(candidate)) {
                                    current2 = candidate.length;
                                    while ((current2 -= 1) >= 0) {
                                        if (candidate[current2]) {
                                            worklist.push([candidate[current2], candidate, current2]);
                                        }
                                    }
                                } else {
                                    worklist.push([candidate, node, candidates[current]]);
                                }
                            }
                        }
                    }
                }
            }
        }

        return result.top;
    }

    exports.version = '0.0.3';
    exports.Syntax = Syntax;
    exports.traverse = traverse;
    exports.replace = replace;
    exports.VisitorKeys = VisitorKeys;
    exports.VisitorOption = VisitorOption;
}));
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/common.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
(function () {
    'use strict';

    var Syntax,
        Regex,
        isArray,
        arrayFrom,
        arrayOf,
        sameValue,
        estraverse,
        escope,
        NameSequence,
        ZeroSequenceCache;

    estraverse = require('estraverse');
    escope = require('escope');

    Syntax = estraverse.Syntax;

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    // ES6 Array.from
    arrayFrom = (function () {
        var slice = Array.prototype.slice;
        return function arrayFrom(ary) {
            return slice.call(ary);
        };
    }());

    // ES6 Array.of
    arrayOf = (function () {
        var slice = Array.prototype.slice;
        return function arrayOf() {
            return slice.call(arguments);
        };
    }());

    function arrayLast(ary) {
        return ary[ary.length - 1];
    }

    function stringRepeat(str, num) {
        var result = '';

        for (num |= 0; num > 0; num >>>= 1, str += str) {
            if (num & 1) {
                result += str;
            }
        }

        return result;
    }

    // see http://wiki.ecmascript.org/doku.php?id=harmony:egal
    // ECMA262 SameValue algorithm
    if (Object.is) {
        sameValue = Object.is;
    } else {
        sameValue = function sameValue(x, y) {
            if (x === y) {
              // 0 === -0, but they are not identical
              return x !== 0 || 1 / x === 1 / y;
            }

            // NaN !== NaN, but they are identical.
            // NaNs are the only non-reflexive value, i.e., if x !== x,
            // then x is a NaN.
            // isNaN is broken: it converts its argument to number, so
            // isNaN("foo") => true
            return x !== x && y !== y;
        };
    }

    function deepCopy(obj) {
        function deepCopyInternal(obj, result) {
            var key, val;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    val = obj[key];
                    if (typeof val === 'object' && val !== null) {
                        if (val instanceof RegExp) {
                            val = new RegExp(val);
                        } else {
                            val = deepCopyInternal(val, isArray(val) ? [] : {});
                        }
                    }
                    result[key] = val;
                }
            }
            return result;
        }
        return deepCopyInternal(obj, isArray(obj) ? [] : {});
    }

    function assert(cond, text) {
        if (!cond) {
            throw new Error(text);
        }
    }

    function unreachable() {
        throw new Error('Unreachable point. logically broken.');
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }


    function isIdentifier(name) {
        var i, iz;
        // fallback for ES3
        if (isKeyword(name) || isRestrictedWord(name)) {
            return false;
        }
        if (name.length === 0) {
            return false;
        }
        if (!isIdentifierStart(name.charAt(0))) {
            return false;
        }
        for (i = 1, iz = name.length; i < iz; ++i) {
            if (!isIdentifierPart(name.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    function moveLocation(from, to) {
        if (from.loc == null) {
            return to;
        }
        to.loc = deepCopy(from.loc);
        return to;
    }

    function deleteLocation(node) {
        if (node.hasOwnProperty('loc')) {
            return delete node.loc;
        }
        return false;
    }

    function convertToEmptyStatement(node) {
        var i, iz, keys;
        keys = estraverse.VisitorKeys[node.type];
        for (i = 0, iz = keys.length; i < iz; ++i) {
            delete node[keys[i]];
        }
        node.type = Syntax.EmptyStatement;
        return node;
    }

    // generateNextName

    ZeroSequenceCache = [];

    function zeroSequence(num) {
        var res = ZeroSequenceCache[num];
        if (res !== undefined) {
            return res;
        }
        res = stringRepeat('0', num);
        ZeroSequenceCache[num] = res;
        return res;
    }

    NameSequence = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'.split('');

    function generateNextName(name) {
        var ch, index, cur;

        cur = name.length - 1;
        do {
            ch = name.charAt(cur);
            index = NameSequence.indexOf(ch);
            if (index !== (NameSequence.length - 1)) {
                return name.substring(0, cur) + NameSequence[index + 1] + zeroSequence(name.length - (cur + 1));
            }
            --cur;
        } while (cur >= 0);
        return 'a' + zeroSequence(name.length);
    }

    function isNegative(value) {
        return value === value && (value < 0 || (value === 0 && 1 / value < 0));
    }

    function isFunctionBody(node, parent) {
        return node.type === Syntax.BlockStatement && (parent.type === Syntax.FunctionDeclaration || parent.type === Syntax.FunctionExpression);
    }

    function isNumberLiteral(node) {
        return node.type === Syntax.Literal && typeof node.value === 'number';
    }

    function isOptimizedArgument(argument) {
        return isNumberLiteral(argument) && String(argument.value).length === 1;
    }

    function generateNegativeNode(value, node) {
        var result;
        result = {
            type: Syntax.UnaryExpression,
            operator: '-',
            argument: {
                type: Syntax.Literal,
                value: -value
            }
        };
        return (node) ? moveLocation(node, result) : result;
    }

    function isNegativeNode(node) {
        return node.type === Syntax.UnaryExpression && node.operator === '-' && isNumberLiteral(node.argument);
    }

    function generateUndefined(node) {
        var result = {
            type: Syntax.UnaryExpression,
            operator: 'void',
            argument: {
                type: Syntax.Literal,
                value: 0
            }
        };
        return (node) ? moveLocation(node, result) : result;
    }

    function isUndefined(node) {
        return node.type === Syntax.UnaryExpression && node.operator === 'void' && isOptimizedArgument(node.argument);
    }

    function generateNaN(node) {
        var result = {
            type: Syntax.BinaryExpression,
            operator: '/',
            left: {
                type: Syntax.Literal,
                value: 0
            },
            right: {
                type: Syntax.Literal,
                value: 0
            }
        };
        return (node) ? moveLocation(node, result) : result;
    }

    function isNaNNode(node) {
        if (node.type === Syntax.BinaryExpression) {
            if (isOptimizedArgument(node.left) && isOptimizedArgument(node.right)) {
                return node.left.value === 0 && node.right.value === 0;
            }
        }
        return false;
    }

    function generateFromValue(value) {
        if (typeof value === 'number') {
            if (isNaN(value)) {
                return generateNaN();
            }
            if (isNegative(value)) {
                return generateNegativeNode(value);
            }
        }
        if (value === undefined) {
            return generateUndefined();
        }
        return {
            type: Syntax.Literal,
            value: value
        };
    }

    function isReference(node) {
        var type = node.type;
        return type === Syntax.Identifier || type === Syntax.MemberExpression;
    }

    // @param last last element of SequenceExpression
    // @param parent parent element of SequenceExpression
    // @param scope scope
    function canExtractSequence(last, parent, scope) {
        var ref;
        if (parent.type === Syntax.CallExpression) {
            if (last.type === Syntax.Identifier) {
                if (last.name === 'eval') {
                    // This becomes direct call to eval.
                    return false;
                }
                ref = scope.resolve(last);
                return ref && ref.isStatic();
            }
            return last.type !== Syntax.MemberExpression;
        } else if (parent.type === Syntax.UnaryExpression) {
            if (parent.operator === 'delete') {
                return !isReference(last);
            } else if (parent.operator === 'typeof') {
                if (last.type === Syntax.Identifier) {
                    ref = scope.resolve(last);
                    return ref && ref.isStatic();
                }
            }
        } else if (parent.type === Syntax.UpdateExpression) {
            return !isReference(last);
        }
        return true;
    }

    function delegateVariableDeclarations(stmt, func) {
        var i, iz, j, jz, decl, decls, target, elements;

        decls = [];

        estraverse.traverse(stmt, {
            enter: function (node) {
                var i, iz, decl;
                if (node.type === Syntax.VariableDeclaration) {
                    if (node.kind === 'let' || node.kind === 'const') {
                        return;
                    }
                    for (i = 0, iz = node.declarations.length; i < iz; ++i) {
                        decl = node.declarations[i];
                        delete decl.init;
                        decls.push(decl);
                    }
                    return estraverse.VisitorOption.Skip;
                } else if (escope.Scope.isVariableScopeRequired(node)) {
                    return estraverse.VisitorOption.Skip;
                }
            }
        });

        if (!decls.length) {
            return null;
        }

        target = null;

        estraverse.traverse(func.body, {
            enter: function (node, parent) {
                if (node === stmt) {
                    return estraverse.VisitorOption.Skip;
                } else if (escope.Scope.isVariableScopeRequired(node)) {
                    return estraverse.VisitorOption.Skip;
                } else if (node.type === Syntax.VariableDeclaration && node.kind === 'var') {
                    // list is not allowed
                    if (parent.type !== Syntax.ForInStatement) {
                        target = node;
                        return estraverse.VisitorOption.Break;
                    }
                }
            }
        });

        if (target) {
            target.declarations = target.declarations.concat(decls);
            return null;
        } else {
            return {
                type: Syntax.VariableDeclaration,
                kind: 'var',
                declarations: decls
            };
        }
    }

    function isScopedDeclaration(node) {
        if (node.type === Syntax.VariableDeclaration && (node.kind === 'let' || node.kind === 'const')) {
            return true;
        } else if (node.type === Syntax.FunctionDeclaration) {
            return true;
        }
        return false;
    }

    exports.deepCopy = deepCopy;
    exports.stringRepeat = stringRepeat;
    exports.sameValue = sameValue;

    exports.Array = {
        isArray: isArray,
        from: arrayFrom,
        of: arrayOf,
        last: arrayLast
    };
    // deprecated export
    exports.isArray = isArray;

    exports.Syntax = Syntax;
    exports.traverse = estraverse.traverse;
    exports.replace = estraverse.replace;
    exports.VisitorKeys = estraverse.VisitorKeys;
    exports.VisitorOption = estraverse.VisitorOption;

    exports.assert = assert;
    exports.unreachable = unreachable;
    exports.isFutureReservedWord = isFutureReservedWord;
    exports.isStrictModeReservedWord = isStrictModeReservedWord;
    exports.isRestrictedWord = isRestrictedWord;
    exports.isKeyword = isKeyword;
    exports.isIdentifier = isIdentifier;

    exports.isDecimalDigit = isDecimalDigit;
    exports.isHexDigit = isHexDigit;
    exports.isOctalDigit = isOctalDigit;
    exports.isWhiteSpace = isWhiteSpace;
    exports.isLineTerminator= isLineTerminator;
    exports.isIdentifierStart = isIdentifierStart;
    exports.isIdentifierPart = isIdentifierPart;

    exports.moveLocation = moveLocation;
    exports.deleteLocation = deleteLocation;
    exports.convertToEmptyStatement = convertToEmptyStatement;

    exports.generateNextName = generateNextName;

    exports.isNegative = isNegative;

    exports.isFunctionBody = isFunctionBody;
    exports.SpecialNode = {
        generateNegative: generateNegativeNode,
        isNegative: isNegativeNode,
        generateUndefined: generateUndefined,
        isUndefined: isUndefined,
        generateNaN: generateNaN,
        isNaN: isNaNNode,
        isReference: isReference,
        canExtractSequence: canExtractSequence,
        generateFromValue: generateFromValue
    };

    exports.delegateVariableDeclarations = delegateVariableDeclarations;

    exports.isScopedDeclaration = isScopedDeclaration;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/annotate-directive.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common;

    common = require('./common');
    Syntax = common.Syntax;

    function isDirective(stmt) {
        var expr;
        if (stmt.type === Syntax.ExpressionStatement) {
            expr = stmt.expression;
            if (expr.type === Syntax.Literal && typeof expr.value === 'string') {
                return true;
            }
        }
        return false;
    }

    function escapeAllowedCharacter(ch, next) {
        var code = ch.charCodeAt(0), hex = code.toString(16), result = '\\';

        switch (ch) {
        case '\b':
            result += 'b';
            break;
        case '\f':
            result += 'f';
            break;
        case '\t':
            result += 't';
            break;
        default:
            if (code > 0xff) {
                result += 'u' + '0000'.slice(hex.length) + hex;
            } else if (ch === '\u0000' && '0123456789'.indexOf(next) < 0) {
                result += '0';
            } else if (ch === '\v') {
                result += 'v';
            } else {
                result += 'x' + '00'.slice(hex.length) + hex;
            }
            break;
        }

        return result;
    }

    function escapeDisallowedCharacter(ch) {
        var result = '\\';
        switch (ch) {
        case '\\':
            result += '\\';
            break;
        case '\n':
            result += 'n';
            break;
        case '\r':
            result += 'r';
            break;
        case '\u2028':
            result += 'u2028';
            break;
        case '\u2029':
            result += 'u2029';
            break;
        default:
            throw new Error('Incorrectly classified character');
        }

        return result;
    }

    function escapeString(str) {
        var result = '', i, len, ch, next, singleQuotes = 0, doubleQuotes = 0, single;

        if (typeof str[0] === 'undefined') {
            str = common.stringToArray(str);
        }

        for (i = 0, len = str.length; i < len; i += 1) {
            ch = str[i];
            if (ch === '\'') {
                result += '\\\'';
            } else if ('\\\n\r\u2028\u2029'.indexOf(ch) >= 0) {
                result += escapeDisallowedCharacter(ch);
                continue;
            } else if (!(ch >= ' ' && ch <= '~')) {
                result += escapeAllowedCharacter(ch, str[i + 1]);
                continue;
            }
            result += ch;
        }

        return result;
    }

    function annotateDirective(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);

        common.traverse(result, {
            enter: function enter(node, parent) {
                var stmt, i, iz;

                if (!(node.type === Syntax.Program ||
                        (node.type === Syntax.BlockStatement && (parent.type === Syntax.FunctionExpression || parent.type === Syntax.FunctionDeclaration)))) {
                    return;
                }

                for (i = 0, iz = node.body.length; i < iz; ++i) {
                    stmt = node.body[i];
                    if (isDirective(stmt)) {
                        stmt.type = Syntax.DirectiveStatement;
                        if (stmt.expression.raw) {
                            stmt.directive = stmt.expression.raw.substring(1, stmt.expression.raw.length - 1);
                            stmt.value = stmt.expression.value;
                            stmt.raw = stmt.expression.raw;
                        } else {
                            stmt.directive = escapeString(stmt.expression.value);
                            stmt.value = stmt.expression.value;
                            stmt.raw = '\'' + stmt.directive + '\'';
                        }
                        delete stmt.expression;
                    } else {
                        return;
                    }
                }
            }
        });

        return result;
    }

    annotateDirective.passName = 'annotate-directive';
    module.exports = annotateDirective;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/tree-based-constant-folding.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, evaluator, modified;

    common = require('../common');
    evaluator = require('../evaluator');
    Syntax = common.Syntax;


    function isModifiedConstant(node) {
        // consider
        //   (undefined) `void 0`
        //   (negative value) `-1`,
        //   (NaN) `0/0`
        if (common.SpecialNode.isUndefined(node)) {
            return false;
        }
        if (common.SpecialNode.isNegative(node)) {
            return false;
        }
        if (common.SpecialNode.isNaN(node)) {
            return false;
        }
        return evaluator.constant.isConstant(node, false);
    }

    function isFoldableConditional(node) {
        if (node.type !== Syntax.ConditionalExpression) {
            return false;
        }
        return evaluator.constant.isConstant(node.consequent) || evaluator.constant.isConstant(node.alternate);
    }

    function foldConditional(node) {
        var binary, unary, operator, left, right;
        switch (node.type) {
        case Syntax.BinaryExpression:
            if (node.operator === 'in' || node.operator === 'instanceof') {
                // cannot fold this
                return node;
            }

            if (evaluator.constant.isConstant(node.left) && isFoldableConditional(node.right)) {
                modified = true;
                binary = node;
                operator = binary.operator;
                left = evaluator.constant.evaluate(binary.left);

                node = node.right;
                if (evaluator.constant.isConstant(node.consequent)) {
                    node.consequent = common.SpecialNode.generateFromValue(evaluator.constant.doBinary(operator, left, evaluator.constant.evaluate(node.consequent)));
                } else {
                    // cannot fold left
                    binary.right = node.consequent;
                    node.consequent = binary;
                }
                if (evaluator.constant.isConstant(node.alternate)) {
                    node.alternate = common.SpecialNode.generateFromValue(evaluator.constant.doBinary(operator, left, evaluator.constant.evaluate(node.alternate)));
                } else {
                    // cannot fold right
                    binary.right = node.alternate;
                    node.alternate = binary;
                }
            } else if (evaluator.constant.isConstant(node.right) && isFoldableConditional(node.left)) {
                modified = true;
                binary = node;
                operator = binary.operator;
                right = evaluator.constant.evaluate(binary.right);

                node = node.left;
                if (evaluator.constant.isConstant(node.consequent)) {
                    node.consequent = common.SpecialNode.generateFromValue(evaluator.constant.doBinary(operator, evaluator.constant.evaluate(node.consequent), right));
                } else {
                    // cannot fold left
                    binary.left = node.consequent;
                    node.consequent = binary;
                }
                if (evaluator.constant.isConstant(node.alternate)) {
                    node.alternate = common.SpecialNode.generateFromValue(evaluator.constant.doBinary(operator, evaluator.constant.evaluate(node.alternate), right));
                } else {
                    // cannot fold right
                    binary.left = node.alternate;
                    node.alternate = binary;
                }
            }
            break;

        case Syntax.LogicalExpression:
            break;

        case Syntax.UnaryExpression:
            if (isFoldableConditional(node.argument)) {
                modified = true;
                unary = node;
                operator = unary.operator;
                node = unary.argument;
                if (evaluator.constant.isConstant(node.consequent)) {
                    node.consequent = common.SpecialNode.generateFromValue(evaluator.constant.doUnary(operator, evaluator.constant.evaluate(node.consequent)));
                } else {
                    // cannot fold left
                    unary.argument = node.consequent;
                    node.consequent = unary;
                }
                if (evaluator.constant.isConstant(node.alternate)) {
                    node.alternate = common.SpecialNode.generateFromValue(evaluator.constant.doUnary(operator, evaluator.constant.evaluate(node.alternate)));
                } else {
                    // cannot fold right
                    unary.argument = node.alternate;
                    node.alternate = unary;
                }
            }
            break;
        }

        return node;
    }

    function treeBasedConstantFolding(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        result = common.replace(result, {
            leave: function leave(node, parent) {
                var con, alt;
                switch (node.type) {
                case Syntax.BinaryExpression:
                case Syntax.LogicalExpression:
                case Syntax.UnaryExpression:
                    if (isModifiedConstant(node)) {
                        modified = true;
                        return common.moveLocation(node, common.SpecialNode.generateFromValue(evaluator.constant.evaluate(node)));
                    }
                    return foldConditional(node);

                case Syntax.ConditionalExpression:
                    if (evaluator.constant.isConstant(node.consequent) && evaluator.constant.isConstant(node.alternate)) {
                        con = evaluator.constant.evaluate(node.consequent);
                        alt = evaluator.constant.evaluate(node.alternate);
                        if (common.sameValue(con, alt)) {
                            modified = true;
                            return common.moveLocation(node, {
                                type: Syntax.SequenceExpression,
                                expressions: [
                                    node.test,
                                    common.SpecialNode.generateFromValue(con)
                                ]
                            });
                        }
                    }
                    break;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    treeBasedConstantFolding.passName = 'tree-based-constant-folding';
    module.exports = treeBasedConstantFolding;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/evaluator.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function () {
    'use strict';

    var Syntax, common;

    common = require('./common');
    Syntax = common.Syntax;

    // constant

    function isConstant(node, allowRegExp) {
        if (node.type === Syntax.Literal) {
            if (typeof node.value === 'object' && node.value !== null) {
                // This is RegExp
                return allowRegExp;
            }
            return true;
        }
        if (node.type === Syntax.UnaryExpression) {
            if (node.operator === 'void' || node.operator === 'delete' || node.operator === '!' || node.operator === 'typeof') {
                return isConstant(node.argument, true);
            }
            return isConstant(node.argument, false);
        }
        if (node.type === Syntax.BinaryExpression) {
            if (node.operator === 'in' || node.operator === 'instanceof') {
                return false;
            }
            return isConstant(node.left, false) && isConstant(node.right, false);
        }
        if (node.type === Syntax.LogicalExpression) {
            return isConstant(node.left, true) && isConstant(node.right, true);
        }
        return false;
    }

    function getConstant(node) {
        if (node.type === Syntax.Literal) {
            return node.value;
        }
        if (node.type === Syntax.UnaryExpression) {
            return doUnary(node.operator, getConstant(node.argument));
        }
        if (node.type === Syntax.BinaryExpression) {
            return doBinary(node.operator, getConstant(node.left), getConstant(node.right));
        }
        if (node.type === Syntax.LogicalExpression) {
            return doLogical(node.operator, getConstant(node.left), getConstant(node.right));
        }
        common.unreachable();
    }

    function doLogical(operator, left, right) {
        if (operator === '||') {
            return left || right;
        }
        return left && right;
    }

    function doUnary(operator, argument) {
        switch (operator) {
        case '+':
            return +argument;
        case '-':
            return -argument;
        case '~':
            return ~argument;
        case '!':
            return !argument;
        case 'delete':
            // do delete on constant value (not considering identifier in this tree based constant folding)
            return true;
        case 'void':
            return undefined;
        case 'typeof':
            return typeof argument;
        }
    }

    function doBinary(operator, left, right) {
        switch (operator) {
        case '|':
            return left | right;
        case '^':
            return left ^ right;
        case '&':
            return left & right;
        case '==':
            return left == right;
        case '!=':
            return left != right;
        case '===':
            return left === right;
        case '!==':
            return left !== right;
        case '<':
            return left < right;
        case '>':
            return left > right;
        case '<=':
            return left <= right;
        case '>=':
            return left >= right;
        // case 'in':
        //    return left in right;
        // case 'instanceof':
        //    return left instanceof right;
        case '<<':
            return left << right;
        case '>>':
            return left >> right;
        case '>>>':
            return left >>> right;
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            return left / right;
        case '%':
            return left % right;
        }
        common.unreachable();
    }

    exports.constant = {
        doBinary: doBinary,
        doUnary: doUnary,
        doLogical: doLogical,
        evaluate: getConstant,
        isConstant: isConstant
    };

    // has side effect
    function hasSideEffect(expr, scope) {
        function visit(expr) {
            var i, iz, ref;
            switch (expr.type) {
            case Syntax.AssignmentExpression:
                return true;

            case Syntax.ArrayExpression:
                for (i = 0, iz = expr.elements.length; i < iz; ++i) {
                    if (visit(expr.elements[i])) {
                        return true;
                    }
                }
                return false;

            case Syntax.BinaryExpression:
                return !isConstant(expr);

            case Syntax.CallExpression:
                return true;

            case Syntax.ConditionalExpression:
                return visit(expr.test) || visit(expr.consequent) || visit(expr.alternate);

            case Syntax.FunctionExpression:
                return false;

            case Syntax.Identifier:
                ref = scope.resolve(expr);
                if (ref && ref.isStatic()) {
                    return false;
                }
                return true;

            case Syntax.Literal:
                return false;

            case Syntax.LogicalExpression:
                return visit(expr.left) || visit(expr.right);

            case Syntax.MemberExpression:
                return true;

            case Syntax.NewExpression:
                return true;

            case Syntax.ObjectExpression:
                for (i = 0, iz = expr.properties.length; i < iz; ++i) {
                    if (visit(expr.properties[i])) {
                        return true;
                    }
                }
                return false;

            case Syntax.Property:
                return visit(expr.value);

            case Syntax.SequenceExpression:
                for (i = 0, iz = expr.expressions.length; i < iz; ++i) {
                    if (visit(expr.expressions[i])) {
                        return true;
                    }
                }
                return false;

            case Syntax.ThisExpression:
                return false;

            case Syntax.UnaryExpression:
                if (expr.operator === 'void' || expr.operator === 'delete' || expr.operator === 'typeof' || expr.operator === '!') {
                    return visit(expr.argument);
                }
                return !isConstant(expr);

            case Syntax.UpdateExpression:
                return true;
            }
            return true;
        }

        return visit(expr);
    }

    exports.hasSideEffect = hasSideEffect;

    // boolean decision
    // @return {boolean|null} when indeterminate value comes, returns null
    function booleanCondition(expr) {
        var ret;
        switch (expr.type) {
        case Syntax.AssignmentExpression:
            return booleanCondition(expr.right);

        case Syntax.ArrayExpression:
            return true;

        case Syntax.BinaryExpression:
            if (isConstant(expr)) {
                return !!getConstant(expr);
            }
            return null;

        case Syntax.CallExpression:
            return null;

        case Syntax.ConditionalExpression:
            ret = booleanCondition(expr.test);
            if (ret === true) {
                return booleanCondition(expr.consequent);
            }
            if (ret === false) {
                return booleanCondition(expr.alternate);
            }
            ret = booleanCondition(expr.consequent);
            if (ret === booleanCondition(expr.alternate)) {
                return ret;
            }
            return null;

        case Syntax.FunctionExpression:
            return true;

        case Syntax.Identifier:
            return null;

        case Syntax.Literal:
            return !!getConstant(expr);

        case Syntax.LogicalExpression:
            if (expr.operator === '&&') {
                ret = booleanCondition(expr.left);
                if (ret === null) {
                    return null;
                }
                if (!ret) {
                    return false;
                }
                return booleanCondition(expr.right);
            } else {
                ret = booleanCondition(expr.left);
                if (ret === null) {
                    return null;
                }
                if (ret) {
                    return true;
                }
                return booleanCondition(expr.right);
            }
            return null;

        case Syntax.MemberExpression:
            return null;

        case Syntax.NewExpression:
            // always return object
            return true;

        case Syntax.ObjectExpression:
            return true;

        case Syntax.Property:
            common.unreachable();
            return null;

        case Syntax.SequenceExpression:
            return booleanCondition(common.Array.last(expr.expressions));

        case Syntax.ThisExpression:
            // in strict mode, this may be null / undefined
            return null;

        case Syntax.UnaryExpression:
            if (expr.operator === 'void') {
                return false;
            }
            if (expr.operator === 'typeof') {
                return true;
            }
            if (expr.operator === '!') {
                ret = booleanCondition(expr.argument);
                if (ret === null) {
                    return null;
                }
                return !ret;
            }
            if (isConstant(expr)) {
                return !!getConstant(expr);
            }
            return null;

        case Syntax.UpdateExpression:
            return null;
        }

        return null;
    }

    exports.booleanCondition = booleanCondition;
}());

});

require.define("/lib/pass/hoist-variable-to-arguments.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, escope, modified;

    escope = require('escope');
    common = require('../common');

    Syntax = common.Syntax;

    function hoist(callee) {

        function hoisting(ident) {
            var hoisted, i, iz;
            hoisted = false;
            for (i = 0, iz = callee.params.length; i < iz; ++i) {
                if (ident.name === callee.params[i].name) {
                    // already hoisted name
                    hoisted = true;
                    break;
                }
            }
            if (!hoisted) {
                callee.params.push(ident);
            }
        }

        callee.body = common.replace(callee.body, {
            enter: function (node, parent, notify) {
                var i, iz, expressions, declaration, hoisted, forstmt, expr;

                if (node.type === Syntax.FunctionExpression || node.type === Syntax.FunctionDeclaration) {
                    notify(common.VisitorOption.Skip);
                    return;
                }

                if (node.type === Syntax.VariableDeclaration && node.kind === 'var') {
                    // We should consider following pattern
                    //
                    //   for (var i = 0;;);
                    // or
                    //   for (var i in []);
                    // specialize pass for `for-in`
                    if (parent.type === Syntax.ForInStatement) {
                        common.assert(node.declarations.length === 1, 'for-in declaration length should be 1');
                        declaration = node.declarations[0];
                        // not optimize
                        //   for (var i = 1 in []);
                        if (declaration.init) {
                            return;
                        }

                        // TODO(Constellation)
                        // in the future, destructuring pattern may come
                        if (declaration.id.type !== Syntax.Identifier) {
                            return;
                        }
                        hoisting(declaration.id);
                        modified = true;
                        return declaration.id;
                    }

                    forstmt = parent.type === Syntax.ForStatement;

                    expressions = [];
                    for (i = 0, iz = node.declarations.length; i < iz; ++i) {
                        declaration = node.declarations[i];

                        // TODO(Constellation)
                        // in the future, destructuring pattern may come
                        if (declaration.id.type !== Syntax.Identifier) {
                            return;
                        }
                        hoisting(declaration.id);
                        if (declaration.init) {
                            expressions.push(common.moveLocation(declaration, {
                                type: Syntax.AssignmentExpression,
                                operator: '=',
                                left: declaration.id,
                                right: declaration.init
                            }));
                        }
                    }

                    modified = true;
                    if (expressions.length === 0) {
                        if (forstmt) {
                            return null;
                        }
                        return common.moveLocation(node, {
                            type: Syntax.EmptyStatement
                        });
                    }

                    if (expressions.length === 1) {
                        expr = expressions[0];
                    } else {
                        expr = common.moveLocation(node, {
                            type: Syntax.SequenceExpression,
                            expressions: expressions
                        });
                    }

                    if (forstmt) {
                        return expr;
                    }

                    return common.moveLocation(node, {
                        type: Syntax.ExpressionStatement,
                        expression: expr
                    });
                }
            }
        });
    }

    function hoistVariableToArguments(tree, options) {
        var result, scope, manager;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        scope = null;

        manager = escope.analyze(result);
        manager.attach();

        common.traverse(result, {
            enter: function enter(node, parent) {
                var callee;
                if (node.type === Syntax.CallExpression || node.type === Syntax.NewExpression) {
                    callee = node.callee;
                    if (callee.type === Syntax.FunctionExpression && !callee.id) {
                        if (callee.params.length === node['arguments'].length) {
                            scope = manager.acquire(callee);
                            if (!scope.isArgumentsMaterialized() && (node.type !== Syntax.NewExpression || !scope.isThisMaterialized())) {
                                // ok, arguments is not used
                                hoist(callee);
                            }
                        }
                    }
                }
            }
        });

        manager.detach();

        return {
            result: result,
            modified: modified
        };
    }

    hoistVariableToArguments.passName = 'hoist-variable-to-arguments';
    module.exports = hoistVariableToArguments;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-dynamic-to-static-property-access.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function transformDynamicToStaticPropertyAccess(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        if (options.destructive) {
            result = tree;
        } else {
            result = common.deepCopy(tree);
        }

        modified = false;
        common.traverse(result, {
            enter: function enter(node) {
                var property;
                if (node.type === Syntax.MemberExpression && node.computed) {
                    property = node.property;
                    if (property.type === Syntax.Literal && typeof property.value === 'string') {
                        if (common.isIdentifier(property.value)) {
                            modified = true;
                            node.computed = false;
                            node.property = common.moveLocation(property, {
                                type: Syntax.Identifier,
                                name: property.value
                            });
                        } else if (property.value === Number(property.value).toString()) {
                            modified = true;
                            node.computed = true;
                            node.property = common.moveLocation(node.property, common.SpecialNode.generateFromValue(Number(node.property.value)));
                        }
                    }
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformDynamicToStaticPropertyAccess.passName = 'transform-dynamic-to-static-property-access';
    module.exports = transformDynamicToStaticPropertyAccess;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-dynamic-to-static-property-definition.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function transformDynamicToStaticPropertyDefinition(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        common.traverse(result, {
            enter: function enter(node) {
                var property, generated;
                if (node.type === Syntax.Property) {
                    if (node.key.type === Syntax.Literal && typeof node.key.value === 'string') {
                        if (common.isIdentifier(node.key.value)) {
                            modified = true;
                            node.key = common.moveLocation(node.key, {
                                type: Syntax.Identifier,
                                name: node.key.value
                            });
                        } else if (node.key.value === Number(node.key.value).toString()) {
                            // we should not generate
                            // var obj = {
                            //   -20: 20
                            // };
                            generated = common.SpecialNode.generateFromValue(Number(node.key.value));
                            if (generated.type === Syntax.Literal) {
                                modified = true;
                                node.key = common.moveLocation(node.key, generated);
                            }
                        }
                    }
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformDynamicToStaticPropertyDefinition.passName = 'transform-dynamic-to-static-property-definition';
    module.exports = transformDynamicToStaticPropertyDefinition;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-immediate-function-call.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function isEmptyFunctionCall(call) {
        var callee, i, iz, stmt;
        if (call.type !== Syntax.CallExpression) {
            return false;
        }

        callee = call.callee;

        if (callee.type !== Syntax.FunctionExpression) {
            return false;
        }

        if (callee.body.type !== Syntax.BlockStatement) {
            return false;
        }

        // see side effect
        if (callee.body.body.length === 0) {
            return true;
        }

        for (i = 0, iz = callee.body.body.length; i < iz; ++i) {
            stmt = callee.body.body[i];
            if (stmt.type !== Syntax.FunctionDeclaration) {
                return false;
            }
        }

        return true;
    }

    function callToSequence(call) {
        var expressions;
        expressions = common.Array.from(call['arguments']);

        if (expressions.length === 0) {
            return common.SpecialNode.generateUndefined(call);
        }

        expressions.push(common.SpecialNode.generateUndefined());
        return common.moveLocation(call, {
            type: Syntax.SequenceExpression,
            expressions: expressions
        });
    }

    function transformImmediateFunctionCall(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        result = common.replace(result, {
            leave: function leave(node) {
                if (isEmptyFunctionCall(node)) {
                    modified = true;
                    return callToSequence(node);
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformImmediateFunctionCall.passName = 'transform-immediate-function-call';
    module.exports = transformImmediateFunctionCall;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-logical-association.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function transformLogicalAssociation(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        common.traverse(result, {
            enter: function enter(node) {
                if (node.type === Syntax.LogicalExpression) {
                    // transform
                    // a && (b && c) => (a && b) && c
                    // a || (b || c) => (a || b) || c
                    if (node.right.type === Syntax.LogicalExpression && node.operator === node.right.operator) {
                        modified = true;
                        node.left = {
                            type: Syntax.LogicalExpression,
                            operator: node.operator,
                            left: node.left,
                            right: node.right.left
                        };
                        node.right = node.right.right;
                    }
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformLogicalAssociation.passName = 'transform-logical-association';
    module.exports = transformLogicalAssociation;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/reordering-function-declarations.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function reordering(array) {
        var i, iz, node, directives, declarations, others;
        directives = [];
        declarations = [];
        others = [];
        for (i = 0, iz = array.length; i < iz; ++i) {
            node = array[i];
            if (node.type === Syntax.FunctionDeclaration) {
                if ((declarations.length + directives.length) !== i) {
                    modified = true;
                }
                declarations.push(node);
            } else if (node.type === Syntax.DirectiveStatement) {
                directives.push(node);
            } else {
                others.push(node);
            }
        }
        return directives.concat(declarations, others);
    }

    function reorderingFunctionDeclarations(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = options.destructive ? tree : common.deepCopy(tree);
        modified = false;

        common.traverse(result, {
            leave: function leave(node) {
                switch (node.type) {
                    case Syntax.Program:
                        node.body = reordering(node.body);
                        break;

                    case Syntax.FunctionDeclaration:
                    case Syntax.FunctionExpression:
                        node.body.body = reordering(node.body.body);
                        break;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    reorderingFunctionDeclarations.passName = 'reordering-function-declarations';
    module.exports = reorderingFunctionDeclarations;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/remove-unused-label.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, Map, common, scope, modified;

    common = require('../common');
    Map = require('../map');
    Syntax = common.Syntax;

    function Scope(upper) {
        this.set = new Map;
        this.unused = [];
        this.upper = upper;
    }

    Scope.prototype.register = function register(node) {
        var name;
        if (node.type === Syntax.LabeledStatement) {
            name = node.label.name;
            common.assert(!this.set.has(name), 'duplicate label is found');
            this.set.set(name, {
                used: false,
                stmt: node
            });
        }
    };

    Scope.prototype.unregister = function unregister(node) {
        var name, ref;
        if (node.type === Syntax.LabeledStatement) {
            name = node.label.name;
            ref = this.set.get(name);
            this.set['delete'](name);
            if (!ref.used) {
                modified = true;
                return node.body;
            }
        }
        return node;
    };

    Scope.prototype.resolve = function resolve(node) {
        var name;
        if (node.label) {
            name = node.label.name;
            common.assert(this.set.has(name), 'unresolved label');
            this.set.get(name).used = true;
        }
    };

    Scope.prototype.close = function close() {
        return this.upper;
    };

    function removeUnusedLabel(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        scope = null;
        modified = false;

        result = common.replace(result, {
            enter: function enter(node) {
                var i, iz;
                switch (node.type) {
                    case Syntax.Program:
                    case Syntax.FunctionDeclaration:
                    case Syntax.FunctionExpression:
                        scope = new Scope(scope);
                        break;

                    case Syntax.LabeledStatement:
                        scope.register(node);
                        break;

                    case Syntax.BreakStatement:
                    case Syntax.ContinueStatement:
                        scope.resolve(node);
                        break;
                }
            },
            leave: function leave(node) {
                var ret;
                ret = scope.unregister(node);
                if (node.type === Syntax.Program || node.type === Syntax.FunctionDeclaration || node.type === Syntax.FunctionExpression) {
                    scope = scope.close();
                }
                return ret;
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    removeUnusedLabel.passName = 'remove-unused-label';
    module.exports = removeUnusedLabel;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/map.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*global module:true*/
(function () {
    'use strict';

    var Map;

    if (typeof global.Map !== 'undefined') {
        // ES6 Map
        Map = global.Map;
    } else {
        Map = function Map() {
            this.__data = {};
        };

        Map.prototype.get = function MapGet(key) {
            key = '$' + key;
            if (this.__data.hasOwnProperty(key)) {
                return this.__data[key];
            }
        };

        Map.prototype.has = function MapHas(key) {
            key = '$' + key;
            return this.__data.hasOwnProperty(key);
        };

        Map.prototype.set = function MapSet(key, val) {
            key = '$' + key;
            this.__data[key] = val;
        };

        Map.prototype['delete'] = function MapDelete(key) {
            key = '$' + key;
            return delete this.__data[key];
        };

        Map.prototype.clear = function MapClear() {
            this.__data[key] = {};
        };

        Map.prototype.forEach = function MapForEach(callback, thisArg) {
            var real, key;
            for (real in this.__data) {
                if (this.__data.hasOwnProperty(real)) {
                    key = real.substring(1);
                    callback.call(thisArg, this.__data[real], key, this);
                }
            }
        };

        Map.prototype.keys = function MapKeys() {
            var real, result;
            result = [];
            for (real in this.__data) {
                if (this.__data.hasOwnProperty(real)) {
                    result.push(real.substring(1));
                }
            }
            return result;
        };

        Map.prototype.values = function MapValues() {
            var real, result;
            result = [];
            for (real in this.__data) {
                if (this.__data.hasOwnProperty(real)) {
                    result.push(this.__data[real]);
                }
            }
            return result;
        };

        Map.prototype.items = function MapItems() {
            var real, result;
            result = [];
            for (real in this.__data) {
                if (this.__data.hasOwnProperty(real)) {
                    result.push([real.substring(1), this.__data[real]]);
                }
            }
            return result;
        };
    }

    module.exports = Map;
}());

});

require.define("/lib/pass/remove-empty-statement.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function remove(node, array) {
        var i, iz, node, result;
        result = [];
        for (i = 0, iz = array.length; i < iz; ++i) {
            node = array[i];
            if (node.type === Syntax.EmptyStatement) {
                modified = true;
            } else {
                result.push(array[i]);
            }
        }
        return result;
    }

    function removeAlternate(node) {
        if (node.alternate) {
            if (node.alternate.type === Syntax.EmptyStatement) {
                modified = true;
                node.alternate = null;
            } else if (node.consequent.type === Syntax.EmptyStatement) {
                modified = true;
                node.consequent = node.alternate;
                node.alternate = null;
                node.test = common.moveLocation(node.test, {
                    type: Syntax.UnaryExpression,
                    operator: '!',
                    argument: node.test
                });
            }
        }
    }

    function removeEmptyStatement(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        if (options.destructive) {
            result = tree;
        } else {
            result = common.deepCopy(tree);
        }

        modified = false;

        common.traverse(result, {
            enter: function enter(node) {
                var i, iz;
                switch (node.type) {
                    case Syntax.BlockStatement:
                    case Syntax.Program:
                        node.body = remove(node, node.body);
                        break;

                    case Syntax.SwitchCase:
                        node.consequent = remove(node, node.consequent);
                        break;

                    case Syntax.IfStatement:
                        removeAlternate(node);
                        break;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    removeEmptyStatement.passName = 'remove-empty-statement';
    module.exports = removeEmptyStatement;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/remove-wasted-blocks.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function flattenBlockStatement(body) {
        var i, iz, j, jz, result, stmt, inner, ok;
        result = [];
        for (i = 0, iz = body.length; i < iz; ++i) {
            stmt = body[i];
            if (stmt.type === Syntax.BlockStatement) {
                ok = true;
                for (j = 0, jz = stmt.body.length; j < jz; ++j) {
                    inner = stmt.body[j];
                    if (common.isScopedDeclaration(inner)) {
                        // we cannot remove this block
                        ok = false;
                    }
                }
                if (ok) {
                    modified = true;
                    result = result.concat(stmt.body);
                } else {
                    result.push(stmt);
                }
            } else {
                result.push(stmt);
            }
        }
        return result;
    }

    function removeWastedBlocks(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        result = common.replace(result, {
            leave: function leave(node, parent) {
                var i, iz, len, array, stmt;
                // remove nested blocks
                if (node.type === Syntax.BlockStatement || node.type === Syntax.Program) {
                    for (i = 0, iz = node.body.length; i < iz; ++i) {
                        stmt = node.body[i];
                        if (stmt.type === Syntax.BlockStatement) {
                            node.body = flattenBlockStatement(node.body);
                            break;
                        }
                    }
                }

                // These type needs BlockStatement
                if (parent.type === Syntax.FunctionDeclaration || parent.type === Syntax.FunctionExpression || parent.type === Syntax.TryStatement || parent.type === Syntax.CatchClause) {
                    return;
                }

                while (node.type === Syntax.BlockStatement && node.body.length === 1 && !common.isScopedDeclaration(node.body[0])) {
                    modified = true;
                    node = node.body[0];
                }
                // empty body
                if (node.type === Syntax.BlockStatement && node.body.length === 0) {
                    modified = true;
                    return {
                        type: Syntax.EmptyStatement
                    };
                }
                return node;
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    removeWastedBlocks.passName = 'remove-wasted-blocks';
    module.exports = removeWastedBlocks;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-to-compound-assignment.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, escope, scope, modified;

    escope = require('escope');
    common = require('../common');
    Syntax = common.Syntax;

    function equals(lhs, rhs) {
        if (lhs.type !== rhs.type) {
            return false;
        }
        if (lhs.type === Syntax.Identifier) {
            return lhs.name === rhs.name;
        }
        return false;
    }

    function compound(operator) {
        switch (operator) {
            case '*':
            case '/':
            case '%':
            case '+':
            case '-':
            case '<<':
            case '>>':
            case '>>>':
            case '&':
            case '^':
            case '|':
                return operator + '=';
        }
        return null;
    }

    function observableCompound(operator) {
        switch (operator) {
            case '*=':
            case '/=':
            case '%=':
            case '+=':
            case '-=':
            case '<<=':
            case '>>=':
            case '>>>=':
            case '&=':
            case '^=':
            case '|=':
                return operator;
        }
        return null;
    }

    function transformToCompoundAssignment(tree, options) {
        var result, scope, manager;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        scope = null;

        manager = escope.analyze(result);
        manager.attach();

        common.traverse(result, {
            enter: function enter(node) {
                var left, right, operator, ref;
                scope = manager.acquire(node) || scope;
                if (node.type === Syntax.AssignmentExpression && node.operator === '=') {
                    left = node.left;
                    right = node.right;
                    if (right.type === Syntax.BinaryExpression && equals(right.left, left)) {
                        operator = compound(right.operator);
                        if (operator) {
                            modified = true;
                            node.operator = operator;
                            node.right = right.right;
                        }
                    } else if (right.type === Syntax.AssignmentExpression && equals(right.left, left)) {
                        if (observableCompound(right.operator)) {
                            ref = scope.resolve(node.left);
                            if (ref.isStatic()) {
                                modified = true;
                                node.operator = right.operator;
                                node.right = right.right;
                            }
                        }
                    }
                }
            },
            leave: function leave(node) {
                scope = manager.release(node) || scope;
            }
        });

        manager.detach();

        return {
            result: result,
            modified: modified
        };
    }

    transformToCompoundAssignment.passName = 'transform-to-compound-assignment';
    module.exports = transformToCompoundAssignment;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-to-sequence-expression.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function transform(node) {
        var i, iz, expressions, stmt, prev, body;

        function constructSeq(expressions, stmt) {
            var seq;

            if (expressions.length !== 1) {
                modified = true;
                seq = {
                    type: Syntax.SequenceExpression,
                    expressions: expressions
                };

                if (stmt.type === Syntax.ExpressionStatement) {
                    stmt.expression = seq;
                } else {
                    stmt.argument = seq;
                }
            }

            return stmt;
        }

        body = [];
        expressions = [];

        for (i = 0, iz = node.body.length; i < iz; ++i) {
            prev = stmt;
            stmt = node.body[i];

            if (stmt.type === Syntax.ExpressionStatement) {
                expressions.push(stmt.expression);
            } else if ((stmt.type === Syntax.ReturnStatement && stmt.argument !== null) || stmt.type === Syntax.ThrowStatement) {
                expressions.push(stmt.argument);
                body.push(constructSeq(expressions, stmt));
                expressions = [];
            } else if (stmt.type === Syntax.ForStatement && (!stmt.init || stmt.init.type !== Syntax.VariableDeclaration)) {
                // insert expressions to for (<init>;;);
                if (expressions.length) {
                    modified = true;
                    if (stmt.init) {
                        expressions.push(stmt.init);
                    }
                    if (expressions.length === 1) {
                        stmt.init = expressions[0];
                    } else {
                        stmt.init = {
                            type: Syntax.SequenceExpression,
                            expressions: expressions
                        };
                    }
                    expressions = [];
                }
                body.push(stmt);
            } else if (stmt.type === Syntax.IfStatement) {
                if (expressions.length) {
                    modified = true;
                    expressions.push(stmt.test);
                    stmt.test = {
                        type: Syntax.SequenceExpression,
                        expressions: expressions
                    };
                    expressions = [];
                }
                body.push(stmt);
            } else {
                if (expressions.length) {
                    body.push(constructSeq(expressions, prev));
                    expressions = [];
                }
                body.push(stmt);
            }
        }

        if (expressions.length) {
            body.push(constructSeq(expressions, stmt));
        }

        node.body = body;
    }

    function transformToSequenceExpression(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        if (options.destructive) {
            result = tree;
        } else {
            result = common.deepCopy(tree);
        }

        modified = false;
        common.traverse(result, {
            enter: function enter(node) {
                var i, iz;

                switch (node.type) {
                case Syntax.BlockStatement:
                case Syntax.Program:
                    transform(node);
                    break;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformToSequenceExpression.passName = 'transform-to-sequence-expression';
    module.exports = transformToSequenceExpression;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-branch-to-expression.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function transformBranchToExpression(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        result = common.replace(result, {
            leave: function leave(node) {
                var consequent, alternate;
                if (node.type === Syntax.IfStatement) {
                    if (node.alternate) {
                        if (node.consequent.type === Syntax.ExpressionStatement && node.alternate.type === Syntax.ExpressionStatement) {
                            // ok, we can reconstruct this to ConditionalExpression
                            modified = true;
                            return common.moveLocation(node, {
                                type: Syntax.ExpressionStatement,
                                expression: common.moveLocation(node, {
                                    type: Syntax.ConditionalExpression,
                                    test: node.test,
                                    consequent: node.consequent.expression,
                                    alternate: node.alternate.expression
                                })
                            });
                        }
                        if (node.consequent.type === Syntax.ReturnStatement && node.alternate.type === Syntax.ReturnStatement) {
                            // pattern:
                            //   if (cond) return a;
                            //   else return b;
                            modified = true;

                            if (!node.consequent.argument && !node.alternate.argument) {
                                // if (cond) return;
                                // else return;
                                return common.moveLocation(node, {
                                    type: Syntax.ReturnStatement,
                                    argument: common.moveLocation(node, {
                                        type: Syntax.SequenceExpression,
                                        expressions: [node.test, common.SpecialNode.generateUndefined() ]
                                    })
                                });
                            }
                            consequent = node.consequent.argument || common.SpecialNode.generateUndefined();
                            alternate = node.alternate.argument || common.SpecialNode.generateUndefined();

                            return common.moveLocation(node, {
                                type: Syntax.ReturnStatement,
                                argument: common.moveLocation(node, {
                                    type: Syntax.ConditionalExpression,
                                    test: node.test,
                                    consequent: consequent,
                                    alternate: alternate
                                })
                            });
                        }
                        if (node.consequent.type === Syntax.ThrowStatement && node.alternate.type === Syntax.ThrowStatement) {
                            // pattern:
                            //   if (cond) throw a;
                            //   else throw b;
                            modified = true;
                            return common.moveLocation(node, {
                                type: Syntax.ThrowStatement,
                                argument: common.moveLocation(node, {
                                    type: Syntax.ConditionalExpression,
                                    test: node.test,
                                    consequent: node.consequent.argument,
                                    alternate: node.alternate.argument
                                })
                            });
                        }
                    } else {
                        if (node.consequent.type === Syntax.ExpressionStatement) {
                            // ok, we can reconstruct this to LogicalExpression
                            modified = true;
                            return common.moveLocation(node, {
                                type: Syntax.ExpressionStatement,
                                expression: common.moveLocation(node, {
                                    type: Syntax.LogicalExpression,
                                    operator: '&&',
                                    left: node.test,
                                    right: node.consequent.expression
                                })
                            });
                        } else if (node.consequent.type === Syntax.EmptyStatement) {
                            // ok, we can reconstruct this to expression statement
                            modified = true;
                            return common.moveLocation(node, {
                                type: Syntax.ExpressionStatement,
                                expression: node.test
                            });
                        }
                    }
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformBranchToExpression.passName = 'transform-branch-to-expression';
    module.exports = transformBranchToExpression;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/transform-typeof-undefined.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, escope, modified;

    escope = require('escope');
    common = require('../common');
    Syntax = common.Syntax;

    function isUndefinedStringLiteral(node) {
        return node.type === Syntax.Literal && node.value === 'undefined';
    }

    function transformTypeofUndefined(tree, options) {
        var result, manager, scope;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        scope = null;

        manager = escope.analyze(result);
        manager.attach();

        common.traverse(result, {
            enter: function enter(node) {
                var target, undef, argument, ref;
                scope = manager.acquire(node) || scope;
                if (node.type === Syntax.BinaryExpression &&
                    (node.operator === '===' || node.operator === '!==' || node.operator === '==' || node.operator === '!=')) {
                    if (isUndefinedStringLiteral(node.left)) {
                        undef = 'left';
                        target = 'right';
                    } else if (isUndefinedStringLiteral(node.right)) {
                        undef = 'right';
                        target = 'left';
                    } else {
                        return;
                    }

                    if (node[target].type === Syntax.UnaryExpression && node[target].operator === 'typeof') {
                        argument = node[target].argument;
                        if (argument.type === Syntax.Identifier) {
                            ref = scope.resolve(argument);
                            if (!ref || !ref.isStatic() || !ref.resolved) {
                                // may raise ReferenceError
                                return;
                            }
                        }
                        modified = true;
                        node[undef] = common.SpecialNode.generateUndefined();
                        node[target] = argument;
                        node.operator = node.operator.charAt(0) === '!' ? '!==' : '===';
                    }
                }
            },
            leave: function leave(node) {
                scope = manager.release(node) || scope;
            }
        });

        manager.detach();

        return {
            result: result,
            modified: modified
        };
    }

    transformTypeofUndefined.passName = 'transform-typeof-undefined';
    module.exports = transformTypeofUndefined;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/reduce-sequence-expression.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, evaluator, escope, modified;

    escope = require('escope');
    common = require('../common');
    evaluator = require('../evaluator');
    Syntax = common.Syntax;

    function reduce(node) {
        var i, iz, j, jz, expr, result;
        result = [];
        for (i = 0, iz = node.expressions.length; i < iz; ++i) {
            expr = node.expressions[i];
            if (expr.type === Syntax.SequenceExpression) {
                modified = true;
                // delete SequenceExpression location information,
                // because information of SequenceExpression is not used effectively in source-map.
                common.deleteLocation(node);
                for (j = 0, jz = expr.expressions.length; j < jz; ++j) {
                    result.push(expr.expressions[j]);
                }
            } else {
                result.push(expr);
            }
        }
        node.expressions = result;
    }

    function isLoadSideEffectFree(node, scope) {
        var ref, value;
        if (evaluator.constant.isConstant(node)) {
            value = evaluator.constant.evaluate(node);
            if (value === null || typeof value !== 'object') {
                return true;
            }
        }
        if (node.type === Syntax.Identifier) {
            ref = scope.resolve(node);
            return ref && ref.isStatic();
        }
        return false;
    }

    function isStoreSideEffectFree(node, scope) {
        if (!evaluator.hasSideEffect(node, scope)) {
            return true;
        }
        if (node.type === Syntax.Identifier) {
            return true;
        }
        if (node.type === Syntax.MemberExpression) {
            if (!evaluator.hasSideEffect(node.object, scope)) {
                // Because of toString operation
                if (!node.computed || isLoadSideEffectFree(node.property, scope)) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    function reduceSequenceExpression(tree, options) {
        var result, scope, manager;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        scope = null;

        manager = escope.analyze(result);
        manager.attach();

        result = common.replace(result, {
            enter: function enter(node) {
                scope = manager.acquire(node) || scope;
            },
            leave: function leave(node) {
                var result, ref, last;
                switch (node.type) {
                case Syntax.SequenceExpression:
                    reduce(node);
                    break;

                case Syntax.ConditionalExpression:
                    if (node.test.type === Syntax.SequenceExpression) {
                        modified = true;
                        result = node.test;
                        node.test = common.Array.last(result.expressions);
                        result.expressions[result.expressions.length - 1] = node;
                    }
                    break;

                case Syntax.LogicalExpression:
                    if (node.left.type === Syntax.SequenceExpression) {
                        modified = true;
                        result = node.left;
                        node.left = common.Array.last(result.expressions);
                        result.expressions[result.expressions.length - 1] = node;
                    }
                    break;

                case Syntax.BinaryExpression:
                    if (node.left.type === Syntax.SequenceExpression) {
                        modified = true;
                        result = node.left;
                        node.left = common.Array.last(result.expressions);
                        result.expressions[result.expressions.length - 1] = node;
                    } else if (node.right.type === Syntax.SequenceExpression && !evaluator.hasSideEffect(node.left, scope)) {
                        modified = true;
                        result = node.right;
                        node.right = common.Array.last(result.expressions);
                        result.expressions[result.expressions.length - 1] = node;
                    }
                    break;

                case Syntax.UpdateExpression:
                case Syntax.UnaryExpression:
                    if (node.argument.type === Syntax.SequenceExpression) {
                        // Don't transform
                        //   typeof (0, ident)
                        // to
                        //   0, typeof ident
                        //
                        //   delete (0, 1, t.t)
                        // to
                        //   delete t.t
                        last = common.Array.last(node.argument.expressions);
                        if (!common.SpecialNode.canExtractSequence(last, node, scope)) {
                            break;
                        }
                        modified = true;
                        result = node.argument;
                        node.argument = common.Array.last(result.expressions);
                        result.expressions[result.expressions.length - 1] = node;
                    }
                    break;

                case Syntax.AssignmentExpression:
                    if (node.operator === '=' && node.right.type === Syntax.SequenceExpression && isStoreSideEffectFree(node.left, scope)) {
                        modified = true;
                        result = node.right;
                        node.right = common.Array.last(result.expressions);
                        result.expressions[result.expressions.length - 1] = node;
                    }
                    break;
                }
                scope = manager.release(node) || scope;
                return result;
            }
        });

        manager.detach();

        return {
            result: result,
            modified: modified
        };
    }

    reduceSequenceExpression.passName = 'reduce-sequence-expression';
    module.exports = reduceSequenceExpression;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/reduce-branch-jump.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function reduceLast(ary, index) {
        var node, left, right;
        node = ary[index];
        if (node.type === Syntax.IfStatement) {
            if (!node.alternate) {
                if (node.consequent.type === Syntax.ReturnStatement) {
                    modified = true;
                    left = node.consequent.argument;
                    if (!left) {
                        ary[index] = common.moveLocation(node, {
                            type: Syntax.ReturnStatement,
                            argument: {
                                type: Syntax.SequenceExpression,
                                expressions: [
                                    node.test,
                                    common.SpecialNode.generateUndefined()
                                ]
                            }
                        });
                        return true;
                    }
                    ary[index] = common.moveLocation(node, {
                        type: Syntax.ReturnStatement,
                        argument: {
                            type: Syntax.ConditionalExpression,
                            test: node.test,
                            consequent: left,
                            alternate: common.SpecialNode.generateUndefined()
                        }
                    });
                    return true;
                }
            }
        }
    }

    function reduce(ary, index) {
        var node, sibling, left, right;
        node = ary[index];
        sibling = ary[index + 1];
        if (node.type === Syntax.IfStatement) {
            if (!node.alternate) {
                if (node.consequent.type === Syntax.ReturnStatement && sibling.type === Syntax.ReturnStatement) {
                    // pattern:
                    //     if (cond) return v;
                    //     return v2;
                    modified = true;
                    ary.splice(index, 1);
                    left = node.consequent.argument;
                    right = sibling.argument;
                    if (!left && !right) {
                        ary[index] = common.moveLocation(node, {
                            type: Syntax.ReturnStatement,
                            argument: {
                                type: Syntax.SequenceExpression,
                                expressions: [
                                    node.test,
                                    common.SpecialNode.generateUndefined()
                                ]
                            }
                        });
                        return true;
                    }
                    if (!left) {
                        left = common.SpecialNode.generateUndefined();
                    }
                    if (!right) {
                        right = common.SpecialNode.generateUndefined();
                    }
                    ary[index] = common.moveLocation(node, {
                        type: Syntax.ReturnStatement,
                        argument: {
                            type: Syntax.ConditionalExpression,
                            test: node.test,
                            consequent: left,
                            alternate: right
                        }
                    });
                    return true;
                }
            }
        }
        return false;
    }

    function reduceBranchJump(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree)
        modified = false;

        common.traverse(result, {
            leave: function leave(node, parent) {
                var i;
                switch (node.type) {
                case Syntax.BlockStatement:
                case Syntax.Program:
                    i = 0;
                    while (i < (node.body.length - 1)) {
                        if (!reduce(node.body, i)) {
                            ++i;
                        }
                    }

                    if (common.isFunctionBody(node, parent)) {
                        if (node.body.length > 0) {
                            i = node.body.length - 1;
                            reduceLast(node.body, i);
                        }
                    }
                    break;

                case Syntax.SwitchCase:
                    i = 0;
                    while (i < (node.consequent.length - 1)) {
                        if (!reduce(node.consequent, i)) {
                            ++i;
                        }
                    }
                    break;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    reduceBranchJump.passName = 'reduce-branch-jump';
    module.exports = reduceBranchJump;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/reduce-multiple-if-statements.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function reduceMultipleIfStatements(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;

        common.traverse(result, {
            leave: function leave(node) {
                // reduce
                //     if (cond) {
                //         if (cond2) {
                //             ...
                //         }
                //     }
                // to
                //     if (cond && cond2) {
                //         ...
                //     }
                if (node.type === Syntax.IfStatement && !node.alternate &&
                    node.consequent.type === Syntax.IfStatement && !node.consequent.alternate) {
                    modified = true;
                    node.test = {
                        type: Syntax.LogicalExpression,
                        operator: '&&',
                        left: node.test,
                        right: node.consequent.test
                    };
                    node.consequent = node.consequent.consequent;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    reduceMultipleIfStatements.passName = 'reduce-multiple-if-statements';
    module.exports = reduceMultipleIfStatements;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/dead-code-elimination.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true, visitLoopBody:true*/

(function () {
    'use strict';

    var Syntax,
        common,
        status,
        modified;

    common = require('../common');
    Syntax = common.Syntax;

    function JumpTarget(node, status, type) {
        this.node = node;
        this.type = type;
        this.labels = status.labels || [];
        status.labels = null;
    }

    JumpTarget.NAMED_ONLY = 0;  // (00)2
    JumpTarget.ITERATION = 2;   // (10)2
    JumpTarget.SWITCH = 3;      // (11)2

    JumpTarget.prototype.isIteration = function isIteration() {
        return this.type === JumpTarget.ITERATION;
    };

    JumpTarget.prototype.isAnonymous = function isAnonymous() {
        return this.type & 2;
    };

    JumpTarget.prototype.contains = function contains(label) {
        return this.labels.indexOf(label) !== -1;
    };

    function Jumps(upper) {
        this.targets = [];
    }

    Jumps.prototype.lookupContinuableTarget = function lookupContinuableTarget(label) {
        var i, iz, target;
        for (i = this.targets.length - 1; i >= 0; --i) {
            target = this.targets[i];
            if (target.isIteration() && (!label || target.contains(label.name))) {
                return target.node;
            }
        }
        common.unreachable();
    };

    Jumps.prototype.lookupBreakableTarget = function lookupBreakableTarget(label) {
        var i, iz, target;
        for (i = this.targets.length - 1; i >= 0; --i) {
            target = this.targets[i];
            if (label) {
                if (target.contains(label.name)) {
                    return target.node;
                }
            } else {
                if (target.isAnonymous()) {
                    return target.node;
                }
            }
        }
        common.unreachable();
    };

    Jumps.prototype.push = function push(target) {
        this.targets.push(target);
    };

    Jumps.prototype.pop = function pop() {
        this.targets.pop();
    };

    // Status implementation
    //
    // This is based on Constellation/iv lv5 railgun compiler continuation_status.h

    function Status(upper) {
        this.current = [];
        this.upper = upper;
        this.jumps = new Jumps();
        this.labels = null;
        this.next();
    }

    Status.NEXT = {};

    Status.prototype.insert = function insert(stmt) {
        this.current.push(stmt);
    };

    Status.prototype.erase = function erase(stmt) {
        var index = this.current.indexOf(stmt);
        if (index === -1) {
            return false;
        }
        this.current.splice(index, 1);
        return true;
    };

    Status.prototype.kill = function kill() {
        return this.erase(Status.NEXT);
    };

    Status.prototype.has = function has(stmt) {
        return this.current.indexOf(stmt) !== -1;
    };

    Status.prototype.jumpTo = function jumpTo(stmt) {
        this.kill();
        this.insert(stmt);
    };

    Status.prototype.resolveJump = function resolveJump(stmt) {
        var index = this.current.indexOf(stmt);
        if (index !== -1) {
            this.current.splice(index, 1);
            this.insert(Status.NEXT);
        }
    };

    Status.prototype.clear = function clear(stmt) {
        this.current.length = 0;
    };

    Status.prototype.next = function next() {
        this.insert(Status.NEXT);
    };

    Status.prototype.isDead = function isDead() {
        return !this.has(Status.NEXT);
    };

    Status.prototype.revive = function revive() {
        if (this.isDead()) {
            this.next();
            return true;
        }
        return false;
    };

    Status.prototype.register = function register(node) {
        if (!this.labels) {
            this.labels = [];
        }
        this.labels.push(node.label.name);
    };

    Status.prototype.unregister = function unregister(node) {
        this.labels = null;
    };

    Status.isRequired = function isRequired(node) {
        var type = node.type;
        common.assert(node, "should be node");
        return type === Syntax.Program || type === Syntax.FunctionExpression || type === Syntax.FunctionDeclaration
    };

    function Context(node) {
        node.__$context = this;
        this.node = node;
    }

    Context.prototype.detach = function detach() {
        delete this.node.__$context;
    };

    Context.lookup = function lookup(node) {
        return node.__$context;
    };

    function visit(target) {
        var live = false;

        if (!target) {
            return !status.isDead();
        }

        function eliminate(node, array) {
            var i, iz, stmt, ret, info, result;
            result = [];
            for (i = 0, iz = array.length; i < iz; ++i) {
                stmt = array[i];
                if (stmt.type === Syntax.IfStatement) {
                    info = new Context(stmt);
                    ret = visit(stmt);
                    info.detach();
                } else {
                    ret = visit(stmt);
                }
                if (ret) {
                    live |= 1;
                    result.push(stmt);

                    // we transform
                    //     if (cond) {
                    //         #1
                    //         return;
                    //     } else
                    //         #2;
                    //     #3
                    //  to
                    //     if (cond) {
                    //         #1
                    //         return;
                    //     }
                    //     #2
                    //     #3
                    //
                    // and
                    //
                    //     if (cond)
                    //         #1;
                    //     else {
                    //         #2
                    //         return;
                    //     }
                    //     #3
                    //  to
                    //     if (!cond) {
                    //         #2
                    //         return;
                    //     }
                    //     #1
                    //     #3
                    if (stmt.type === Syntax.IfStatement && stmt.alternate) {
                        if ((!info.consequent || !info.alternate) && info.consequent !== info.alternate) {
                            modified = true;
                            if (info.consequent) {
                                stmt.test = common.moveLocation(stmt.test, {
                                    type: Syntax.UnaryExpression,
                                    operator: '!',
                                    argument: stmt.test
                                });
                                result.push(stmt.consequent);
                                stmt.consequent = stmt.alternate;
                                stmt.alternate = null;
                            } else {  // info.alternate
                                result.push(stmt.alternate);
                                stmt.alternate = null;
                            }
                        }
                    }
                } else {
                    // deleted
                    modified = true;
                }
            }
            return result;
        }

        common.traverse(target, {
            enter: function enter(node) {
                var i, iz, stmt, consequent, alternate, ctx, hasDefaultClause;
                if (Status.isRequired(node)) {
                    status = new Status(status);
                }

                live |= !status.isDead();

                switch (node.type) {
                case Syntax.Program:
                    node.body = eliminate(node, node.body);
                    return common.VisitorOption.Skip;

                case Syntax.BlockStatement:
                    status.jumps.push(new JumpTarget(node, status, JumpTarget.NAMED_ONLY));
                    node.body = eliminate(node, node.body);
                    status.jumps.pop();

                    status.resolveJump(node);
                    return common.VisitorOption.Skip;

                case Syntax.BreakStatement:
                    // like
                    //   label: break label;
                    // we treat as like empty statement
                    if (node.label && status.labels && status.labels.indexOf(node.label)) {
                        // change this statement to empty statement
                        modified = true;
                        common.convertToEmptyStatement(node);
                    } else {
                        status.jumpTo(status.jumps.lookupBreakableTarget(node.label));
                    }
                    return common.VisitorOption.Skip;

                case Syntax.CatchClause:
                    live |= visit(node.body);
                    return common.VisitorOption.Skip;

                case Syntax.ContinueStatement:
                    status.jumpTo(status.jumps.lookupContinuableTarget(node.label));
                    return common.VisitorOption.Skip;

                case Syntax.DoWhileStatement:
                    status.jumps.push(new JumpTarget(node, status, JumpTarget.ITERATION));
                    live |= visitLoopBody(node, node.body);
                    status.jumps.pop();

                    live |= visit(node.test);
                    status.resolveJump(node);
                    status.revive();
                    return common.VisitorOption.Skip;

                case Syntax.DebuggerStatement:
                    return common.VisitorOption.Skip;

                case Syntax.EmptyStatement:
                    return common.VisitorOption.Skip;

                case Syntax.ExpressionStatement:
                    break;

                case Syntax.ForStatement:
                    live |= visit(node.init);
                    live |= visit(node.test);

                    status.jumps.push(new JumpTarget(node, status, JumpTarget.ITERATION));
                    live |= visitLoopBody(node, node.body);
                    status.jumps.pop();

                    live |= visit(node.update);
                    status.resolveJump(node);
                    status.revive();
                    return common.VisitorOption.Skip;

                case Syntax.ForInStatement:
                    live |= visit(node.left);
                    live |= visit(node.right);

                    status.jumps.push(new JumpTarget(node, status, JumpTarget.ITERATION));
                    live |= visitLoopBody(node, node.body);
                    status.jumps.pop();

                    status.resolveJump(node);
                    status.revive();
                    return common.VisitorOption.Skip;

                case Syntax.IfStatement:
                    live |= visit(node.test);
                    live |= visit(node.consequent);
                    if (!node.alternate) {
                        status.revive();
                        return common.VisitorOption.Skip;
                    }

                    consequent = !status.isDead();
                    if (!status.revive()) {
                        status.insert(node);
                    }

                    live |= visit(node.alternate);
                    alternate = !status.isDead();
                    if (status.erase(node)) {
                        status.revive();
                    }
                    if (ctx = Context.lookup(node)) {
                        ctx.consequent = consequent;
                        ctx.alternate = alternate;
                    }
                    return common.VisitorOption.Skip;

                case Syntax.LabeledStatement:
                    status.register(node);
                    break;

                case Syntax.ReturnStatement:
                    live |= visit(node.argument);
                    status.kill();
                    return common.VisitorOption.Skip;

                case Syntax.SwitchStatement:
                    visit(node.discriminant);

                    status.jumps.push(new JumpTarget(node, status, JumpTarget.SWITCH));
                    for (i = 0, iz = node.cases.length; i < iz; ++i) {
                        stmt = node.cases[i];
                        live |= visit(stmt);
                        if (!stmt.test) {
                            hasDefaultClause = true;
                        }
                        if (status.isDead() && (i + 1) < iz) {
                            status.next();
                        }
                    }
                    status.jumps.pop();

                    status.resolveJump(node);
                    if (status.isDead() && !hasDefaultClause) {
                        status.next();
                    }
                    return common.VisitorOption.Skip;

                case Syntax.SwitchCase:
                    if (node.test) {
                        live |= visit(node.test);
                    }
                    node.consequent = eliminate(node, node.consequent);
                    return common.VisitorOption.Skip;

                case Syntax.ThrowStatement:
                    live |= visit(node.argument);
                    status.kill();
                    return common.VisitorOption.Skip;

                case Syntax.TryStatement:
                    live |= visit(node.block);

                    if (node.handlers && node.handlers.length) {
                        if (!status.revive()) {
                            status.insert(node);
                        }
                        node.handlers = eliminate(node, node.handlers);
                        if (status.erase(node)) {
                            status.revive();
                        }
                    }

                    if (node.finalizer) {
                        if (!status.revive()) {
                            status.insert(node);
                        }
                        live |= visit(node.finalizer);
                        if (!status.erase(node)) {
                            status.kill();
                        }
                    }
                    return common.VisitorOption.Skip;

                case Syntax.WhileStatement:
                    live |= visit(node.test);

                    status.jumps.push(new JumpTarget(node, status, JumpTarget.ITERATION));
                    live |= visitLoopBody(node, node.body);
                    status.jumps.pop();

                    status.resolveJump(node);
                    status.revive();
                    return common.VisitorOption.Skip;

                case Syntax.WithStatement:
                    break;

                case Syntax.VariableDeclaration:
                case Syntax.FunctionDeclaration:
                    live = true;
                    break;
                }
            },

            leave: function leave(node) {
                if (Status.isRequired(node)) {
                    status = status.upper;
                    return;
                }

                if (node.type === Syntax.LabeledStatement) {
                    status.unregister(node);
                }
            }
        });

        return live;
    }

    function getForwardLastNode(node) {
        while (true) {
            switch (node.type) {
            case Syntax.IfStatement:
                if (node.alternate) {
                    return null;
                }
                node = node.consequent;
                continue;

            case Syntax.WithStatement:
            case Syntax.LabeledStatement:
                node = node.body;
                continue;

            case Syntax.BlockStatement:
                if (node.body.length) {
                    node = common.Array.last(node.body);
                    continue;
                }
                break;
            }
            return node;
        }
    }

    function visitLoopBody(loop, body) {
        var jump, last;
        last = getForwardLastNode(body);
        if (last) {
            if (last.type === Syntax.ContinueStatement) {
                jump = status.jumps.lookupContinuableTarget(last.label);
                if (jump === loop) {
                    // this continue is dead code
                    modified = true;
                    common.convertToEmptyStatement(last);
                }
            }
        }
        return visit(body);
    }

    // This is iv / lv5 / railgun bytecode compiler dead code elimination algorithm
    function deadCodeElimination(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        if (options.destructive) {
            result = tree;
        } else {
            result = common.deepCopy(tree);
        }

        status = null;
        modified = false;

        visit(result);

        common.assert(status === null, "status should be null");

        return {
            result: result,
            modified: modified
        };
    }

    deadCodeElimination.passName = 'dead-code-elimination';
    module.exports = deadCodeElimination;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/remove-side-effect-free-expressions.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, Check, common, escope, evaluator, modified;

    escope = require('escope');
    common = require('../common');
    evaluator = require('../evaluator');
    Syntax = common.Syntax;

    function reduce(node, scope, parent, isResultNeeded) {
        var i, iz, expr, result, ref, prev;

        common.assert(node.expressions.length > 1, 'expressions should be more than one');

        result = [];
        for (i = 0, iz = node.expressions.length; i < iz; ++i) {
            prev = expr;
            expr = node.expressions[i];
            if (((i + 1) !== iz) || !isResultNeeded) {
                if (!evaluator.hasSideEffect(expr, scope)) {
                    continue;
                }
            }
            result.push(expr);
        }

        if (!isResultNeeded && result.length === 0) {
            modified = true;
            return expr;
        }

        common.assert(result.length > 0, 'result should be more than zero');

        // not changed
        do {
            if (iz === result.length) {
                return node;
            }

            if (result.length === 1) {
                if (!common.SpecialNode.canExtractSequence(result[0], parent, scope)) {
                    result.unshift(prev);
                    continue;
                }
                modified = true;
                return result[0];
            }
            modified = true;
            node.expressions = result;
            return node;
        } while (true);
    }

    function isResultNeeded(parent, scope) {
        if (parent.type === Syntax.ExpressionStatement && scope.type !== 'global') {
            return false;
        }
        return true;
    }

    function removeSideEffectFreeExpressions(tree, options) {
        var result, scope, manager;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        scope = null;
        manager = escope.analyze(result);
        manager.attach();

        result = common.replace(result, {
            enter: function enter(node, parent) {
                var res, ref, expr, flag;

                res = node;
                scope = manager.acquire(node) || scope;
                if (res.type === Syntax.SequenceExpression) {
                    res = reduce(res, scope, parent, isResultNeeded(parent, scope));
                }

                // Because eval code should return last evaluated value in
                // ExpressionStatement, we should not remove.
                if (!isResultNeeded(res, scope)) {
                    if (!evaluator.hasSideEffect(res.expression, scope)) {
                        modified = true;
                        res = common.moveLocation(res, {
                            type: Syntax.EmptyStatement
                        });
                    }
                }
                return res;
            },
            leave: function leave(node) {
                scope = manager.release(node) || scope;
            }
        });

        manager.detach();

        return {
            result: result,
            modified: modified
        };
    }

    removeSideEffectFreeExpressions.passName = 'remove-side-effect-free-expressions';
    module.exports = removeSideEffectFreeExpressions;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/remove-context-sensitive-expressions.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Mihai Bazon <mihai.bazon@gmail.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function booleanTransformation(expr) {
        var consequent;
        do {
            if (expr.type === Syntax.UnaryExpression) {
                if (expr.operator === '!' &&
                    expr.argument.type === Syntax.UnaryExpression && expr.argument.operator === '!') {
                    modified = true;
                    expr = expr.argument.argument;
                    continue;
                }
            } else if (expr.type === Syntax.LogicalExpression) {
                if (expr.left.type === Syntax.UnaryExpression && expr.left.operator === '!' &&
                    expr.right.type === Syntax.UnaryExpression && expr.right.operator === '!') {
                    // !cond && !ok() => !(cond || ok())
                    // this introduces more optimizations
                    modified = true;
                    expr.left = expr.left.argument;
                    expr.right = expr.right.argument;
                    expr.operator = (expr.operator === '||') ? '&&' : '||';
                    expr = common.moveLocation(expr, {
                        type: Syntax.UnaryExpression,
                        operator: '!',
                        argument: expr
                    });
                    continue;
                }
            } else if (expr.type === Syntax.ConditionalExpression) {
                if (expr.test.type === Syntax.UnaryExpression && expr.test.operator === '!') {
                    modified = true;
                    expr.test = expr.test.argument;
                    consequent = expr.consequent;
                    expr.consequent = expr.alternate;
                    expr.alternate = consequent;
                }
            }
            break;
        } while (true);
        return expr;
    }

    function voidTransformation(expr) {
        do {
            expr = booleanTransformation(expr);
            if (expr.type === Syntax.UnaryExpression) {
                if (expr.operator === '!' || expr.operator === 'void') {
                    modified = true;
                    expr = expr.argument;
                    continue;
                }
            } else if (expr.type === Syntax.LogicalExpression) {
                if (expr.left.type === Syntax.UnaryExpression && expr.left.operator === '!') {
                    // !cond && ok() => cond || ok()
                    modified = true;
                    expr.left = expr.left.argument;
                    expr.operator = (expr.operator === '||') ? '&&' : '||';
                }
            }
            break;
        } while (true);
        return expr;
    }

    function apply(expr, trans, booleanFunction, voidFunction) {
        var prev;
        do {
            prev = expr;
            expr = trans(expr);
            if (prev !== expr) {
                continue;
            }

            if (expr.type === Syntax.LogicalExpression) {
                expr.left = booleanFunction(expr.left);
                expr.right = voidFunction(expr.right);
            } else if (expr.type === Syntax.ConditionalExpression) {
                expr.consequent = voidFunction(expr.consequent);
                expr.alternate = voidFunction(expr.alternate);
            } else if (expr.type === Syntax.SequenceExpression) {
                expr.expressions[expr.expressions.length - 1] = voidFunction(common.Array.last(expr.expressions));
            }
            break;
        } while (true);
        return expr;
    }

    function voidContext(expr) {
        return apply(expr, voidTransformation, booleanContext, voidContext);
    }

    function booleanContext(expr) {
        return apply(expr, booleanTransformation, booleanContext, booleanContext);
    }

    function removeContextSensitiveExpressions(tree, options) {
        var result, stack;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        stack = [];

        result = common.replace(result, {
            enter: function enter(node, parent) {
                var i, iz;
                if (node.type === Syntax.FunctionExpression || node.type === Syntax.FunctionDeclaration) {
                    stack.push(null);
                }

                switch (node.type) {
                case Syntax.AssignmentExpression:
                    break;

                case Syntax.ArrayExpression:
                    break;

                case Syntax.BlockStatement:
                    break;

                case Syntax.BinaryExpression:
                    break;

                case Syntax.BreakStatement:
                    break;

                case Syntax.CallExpression:
                    break;

                case Syntax.CatchClause:
                    break;

                case Syntax.ConditionalExpression:
                    node.test = booleanContext(node.test);
                    break;

                case Syntax.ContinueStatement:
                    break;

                case Syntax.DoWhileStatement:
                    node.test = booleanContext(node.test);
                    break;

                case Syntax.DebuggerStatement:
                    break;

                case Syntax.EmptyStatement:
                    break;

                case Syntax.ExpressionStatement:
                    if (stack.length !== 0) {
                        // not global context
                        node.expression = voidContext(node.expression);
                    }
                    break;

                case Syntax.ForStatement:
                    break;

                case Syntax.ForInStatement:
                    break;

                case Syntax.FunctionDeclaration:
                    break;

                case Syntax.FunctionExpression:
                    if (node.init && node.init.type !== Syntax.VariableDeclaration) {
                        node.init = voidContext(node.init);
                    }
                    if (node.test) {
                        node.test = booleanContext(node.test);
                    }
                    if (node.update) {
                        node.update = voidContext(node.update);
                    }
                    break;

                case Syntax.Identifier:
                    break;

                case Syntax.IfStatement:
                    node.test = booleanContext(node.test);
                    break;

                case Syntax.Literal:
                    break;

                case Syntax.LabeledStatement:
                    break;

                case Syntax.LogicalExpression:
                    break;

                case Syntax.MemberExpression:
                    break;

                case Syntax.NewExpression:
                    break;

                case Syntax.ObjectExpression:
                    break;

                case Syntax.Program:
                    break;

                case Syntax.Property:
                    break;

                case Syntax.ReturnStatement:
                    break;

                case Syntax.SequenceExpression:
                    for (i = 0, iz = node.expressions.length - 1; i < iz; ++i) {
                        node.expressions[i] = voidContext(node.expressions[i]);
                    }
                    break;

                case Syntax.SwitchStatement:
                    break;

                case Syntax.SwitchCase:
                    break;

                case Syntax.ThisExpression:
                    break;

                case Syntax.ThrowStatement:
                    break;

                case Syntax.TryStatement:
                    break;

                case Syntax.UnaryExpression:
                    if (node.operator === '!') {
                        node.argument = booleanContext(node.argument);
                    } else if (node.operator === 'void') {
                        node.argument = voidContext(node.argument);
                    }
                    break;

                case Syntax.UpdateExpression:
                    break;

                case Syntax.VariableDeclaration:
                    break;

                case Syntax.VariableDeclarator:
                    break;

                case Syntax.WhileStatement:
                    node.test = booleanContext(node.test);
                    break;

                case Syntax.WithStatement:
                    break;

                }
            },

            leave: function leave(node) {
                if (node.type === Syntax.FunctionExpression || node.type === Syntax.FunctionDeclaration) {
                    stack.pop();
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    removeContextSensitiveExpressions.passName = 'remove-context-sensitive-expressions';
    module.exports = removeContextSensitiveExpressions;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/drop-variable-definition.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified, escope, evaluator;

    common = require('../common');
    escope = require('escope');
    evaluator = require('../evaluator');
    Syntax = common.Syntax;

    function getCandidates(scope) {
        var i, iz, j, jz, identifiers, slots, v;

        if (!scope.candidates) {
            slots = [];
            identifiers = [];
            for (i = 0, iz = scope.variables.length; i < iz; ++i) {
                v = scope.variables[i];
                for (j = 0, jz = v.identifiers.length; j < jz; ++j) {
                    identifiers.push(v.identifiers[j]);
                    slots.push(v);
                }
            }

            scope.candidates = {
                slots: slots,
                identifiers: identifiers
            };
        }

        return scope.candidates;
    }

    function isRemovableDefinition(slot, scope) {
        var i, iz, ref, parent;
        if (slot.identifiers.length !== 1) {
            return false;
        }

        if (slot.references.length === 0) {
            return true;
        }

        for (i = 0, iz = slot.references.length; i < iz; ++i) {
            ref = slot.references[i];
            if (ref.isRead()) {
                return false;
            }
            if (ref.isWrite()) {
                if (!ref.writeExpr) {
                    return false;
                }
                parent = ref.writeExpr.__$parent$__;
                if (!parent) {
                    return false;
                }
                if (parent.type !== Syntax.AssignmentExpression &&
                    parent.type !== Syntax.VariableDeclarator) {
                    return false;
                }
                if (evaluator.hasSideEffect(ref.writeExpr, ref.from)) {
                    return false;
                }
            }
        }

        return true;
    }

    function overrideExpression(from, to) {
        var key;
        for (key in from) {
            delete from[key];
        }
        for (key in to) {
            from[key] = to[key];
        }
        return from;
    }

    function removeDefinition(node, index, slot, scope) {
        var i, iz, ref, slot, parent;

        // remove from declaration list
        node.declarations.splice(index, 1);
        for (i = 0, iz = slot.references.length; i < iz; ++i) {
            ref = slot.references[i];
            common.assert(!ref.isRead());
            if (ref.isWrite()) {
                parent = ref.writeExpr.__$parent$__;
                if (parent.type === Syntax.AssignmentExpression) {
                    overrideExpression(ref.writeExpr.__$parent$__, ref.writeExpr);
                }
            }
        }
    }

    function attachParent(tree) {
        return common.traverse(tree, {
            enter: function (node, parent) {
                node.__$parent$__ = parent;
            }
        });
    }

    function removeParent(tree) {
        return common.traverse(tree, {
            enter: function (node, parent) {
                delete node.__$parent$__;
            }
        });
    }

    function dropVariableDefinition(tree, options) {
        var result, manager, scope, candidates;

        if (options == null) {
            options = { destructive: false };
        }

        result = options.destructive ? tree : common.deepCopy(tree);
        modified = false;
        scope = null;

        manager = escope.analyze(result);
        manager.attach();
        attachParent(tree);

        result = common.replace(result, {
            enter: function enter(node, parent) {
                var i, iz, decl, ref, cand, index, slot, ret;
                ret = node;
                if (scope) {
                    if (scope.variableScope.isStatic()) {
                        cand = getCandidates(scope.variableScope);

                        // remove unused variable
                        if (node.type === Syntax.VariableDeclaration && node.kind === 'var') {
                            i = node.declarations.length;
                            while (i--) {
                                decl = node.declarations[i];
                                index = cand.identifiers.indexOf(decl.id);
                                common.assert(index !== -1);
                                slot = cand.slots[index];
                                if (isRemovableDefinition(slot, scope)) {
                                    // ok, remove this variable
                                    modified = true;
                                    removeDefinition(node, i, slot, scope);
                                    continue;
                                }
                            }
                            if (node.declarations.length === 0) {
                                if (parent.type === Syntax.ForStatement) {
                                    ret = null;
                                } else {
                                    ret = common.moveLocation(node, {
                                        type: Syntax.EmptyStatement
                                    });
                                }
                            }
                        }

                        // remove unused function declaration
                        if (node.type === Syntax.FunctionDeclaration) {
                            index = cand.identifiers.indexOf(node.id);
                            common.assert(index !== -1);
                            slot = cand.slots[index];
                            if (slot.identifiers.length === 1 && slot.references.length === 0) {
                                // ok, remove this function declaration
                                modified = true;
                                ret = common.moveLocation(node, {
                                    type: Syntax.EmptyStatement
                                });
                                return ret;
                            }
                        }
                    }
                }

                scope = manager.acquire(node) || scope;
                return ret;
            },
            leave: function leave(node) {
                scope = manager.release(node) || scope;
            }
        });

        removeParent(result);
        manager.detach();

        return {
            result: result,
            modified: modified
        };
    }

    dropVariableDefinition.passName = 'drop-variable-definition';
    module.exports = dropVariableDefinition;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/pass/remove-unreachable-branch.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, escope, evaluator, modified;

    escope = require('escope');
    common = require('../common');
    evaluator = require('../evaluator');
    Syntax = common.Syntax;

    function handleIfStatement(func, node) {
        var test, body, decl;
        test = evaluator.booleanCondition(node.test);
        if (!node.alternate) {
            if (typeof test === 'boolean') {
                modified = true;
                body = [];

                if (test) {
                    body.push(common.moveLocation(node.test, {
                        type: Syntax.ExpressionStatement,
                        expression: node.test
                    }), node.consequent);
                    return {
                        type: Syntax.BlockStatement,
                        body: body
                    };
                } else {
                    decl = common.delegateVariableDeclarations(node.consequent, func);
                    if (decl) {
                        body.push(decl);
                    }
                    body.push(common.moveLocation(node.test, {
                        type: Syntax.ExpressionStatement,
                        expression: node.test
                    }));
                    return {
                        type: Syntax.BlockStatement,
                        body: body
                    };
                }
            }
        } else {
            if (typeof test === 'boolean') {
                modified = true;
                body = [];

                if (test) {
                    decl = common.delegateVariableDeclarations(node.alternate, func);
                    if (decl) {
                        body.push(decl);
                    }
                    body.push(common.moveLocation(node.test, {
                        type: Syntax.ExpressionStatement,
                        expression: node.test
                    }), node.consequent);
                    return {
                        type: Syntax.BlockStatement,
                        body: body
                    };
                } else {
                    decl = common.delegateVariableDeclarations(node.consequent, func);
                    if (decl) {
                        body.push(decl);
                    }
                    body.push(common.moveLocation(node.test, {
                        type: Syntax.ExpressionStatement,
                        expression: node.test
                    }), node.alternate);
                    return {
                        type: Syntax.BlockStatement,
                        body: body
                    };
                }
            }
        }
    }

    function handleLogicalExpression(func, node) {
        var test;
        test = evaluator.booleanCondition(node.left);
        if (typeof test === 'boolean') {
            modified = true;
            if (test) {
                if (node.operator === '&&') {
                    return common.moveLocation(node, {
                        type: Syntax.SequenceExpression,
                        expressions: [ node.left, node.right ]
                    });
                } else {
                    return node.left;
                }
            } else {
                if (node.operator === '&&') {
                    return node.left;
                } else {
                    return common.moveLocation(node, {
                        type: Syntax.SequenceExpression,
                        expressions: [ node.left, node.right ]
                    });
                }
            }
        }
    }

    function removeUnreachableBranch(tree, options) {
        var result, stack;

        if (options == null) {
            options = { destructive: false };
        }

        result = (options.destructive) ? tree : common.deepCopy(tree);
        modified = false;
        stack = [];

        result = common.replace(result, {
            enter: function enter(node) {
                var func;

                if (escope.Scope.isVariableScopeRequired(node)) {
                    stack.push(node);
                    return;
                }
                func = common.Array.last(stack);

                switch (node.type) {
                case Syntax.IfStatement:
                    return handleIfStatement(func, node);

                case Syntax.LogicalExpression:
                    return handleLogicalExpression(func, node);
                }
            },
            leave: function leave(node) {
                if (escope.Scope.isVariableScopeRequired(node)) {
                    stack.pop();
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    removeUnreachableBranch.passName = 'remove-unreachable-branch';
    module.exports = removeUnreachableBranch;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/post/transform-static-to-dynamic-property-access.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Michael Ficarra <esmangle.copyright@michael.ficarra.me>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common;

    common = require('../common');
    Syntax = common.Syntax;

    function transformStaticToDynamicPropertyAccess(tree, options) {
        var result, modified;

        if (options == null) {
            options = { destructive: false };
        }

        result = options.destructive ? tree : common.deepCopy(tree);
        modified = false;

        common.traverse(result, {
            enter: function enter(node) {
                var property;
                if (node.type !== Syntax.MemberExpression || node.computed || node.property.type !== Syntax.Identifier) return;
                property = node.property;
                switch (property.name) {
                    case 'undefined':
                        modified = true;
                        node.computed = true;
                        node.property = common.moveLocation(property, {
                            type: Syntax.UnaryExpression,
                            operator: 'void',
                            argument: {type: Syntax.Literal, value: 0}
                        });
                        break;
                    case 'true':
                    case 'false':
                        modified = true;
                        node.computed = true;
                        node.property = common.moveLocation(property, {
                            type: Syntax.Literal,
                            value: property.name === 'true'
                        });
                        break;
                    case 'Infinity':
                        modified = true;
                        node.computed = true;
                        node.property = common.moveLocation(property, {
                            type: Syntax.BinaryExpression,
                            operator: '/',
                            left: {type: Syntax.Literal, value: 1},
                            right: {type: Syntax.Literal, value: 0}
                        });
                        break;
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformStaticToDynamicPropertyAccess.passName = 'transform-static-to-dynamic-property-access';
    module.exports = transformStaticToDynamicPropertyAccess;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/post/transform-infinity.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Michael Ficarra <esmangle.copyright@michael.ficarra.me>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common;

    common = require('../common');
    Syntax = common.Syntax;

    function transformInfinity(tree, options) {
        var result, modified;

        if (options == null) {
            options = { destructive: false };
        }

        result = options.destructive ? tree : common.deepCopy(tree);
        modified = false;

        result = common.replace(result, {
            enter: function enter(node) {
                if (node.type === Syntax.Literal && typeof node.value === 'number') {
                    if (node.value === Infinity) {
                        modified = true;
                        return common.moveLocation(node, {
                            type: Syntax.BinaryExpression,
                            operator: '/',
                            left: {type: Syntax.Literal, value: 1},
                            right: {type: Syntax.Literal, value: 0}
                        });
                    }
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    transformInfinity.passName = 'transform-infinity';
    module.exports = transformInfinity;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/post/rewrite-boolean.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function isBooleanLiteral(node) {
        return node.type === Syntax.Literal && typeof node.value === 'boolean';
    }

    function rewrite(node) {
        if (isBooleanLiteral(node)) {
            modified = true;
            return common.moveLocation(node, {
                type: Syntax.UnaryExpression,
                operator: '!',
                argument: common.moveLocation(node, {
                    type: Syntax.Literal,
                    value: +!node.value
                })
            });
        }

        if (node.type === Syntax.BinaryExpression && node.operator === '==' || node.operator === '!=') {
            if (isBooleanLiteral(node.left)) {
                modified = true;
                node.left = common.moveLocation(node.left, {
                    type: Syntax.Literal,
                    value: +node.left.value
                });
                return node;
            }
            if (isBooleanLiteral(node.right)) {
                modified = true;
                node.right = common.moveLocation(node.right, {
                    type: Syntax.Literal,
                    value: +node.right.value
                });
                return node;
            }
        }

        return node;
    }

    function rewriteBoolean(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        modified = false;
        result = (options.destructive) ? tree : common.deepCopy(tree);

        result = common.replace(result, {
            enter: function enter(node, parent) {
                return rewrite(node);
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    rewriteBoolean.passName = 'rewrite-boolean';
    module.exports = rewriteBoolean;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/lib/post/rewrite-conditional-expression.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global esmangle:true, module:true, define:true, require:true*/
(function () {
    'use strict';

    var Syntax, common, modified;

    common = require('../common');
    Syntax = common.Syntax;

    function rewrite(node) {
        var test, consequent, alternate;
        test = node.test;
        consequent = node.consequent;
        alternate = node.alternate;
        if (test.type === Syntax.UnaryExpression && test.operator === '!') {
            modified = true;
            node.consequent = alternate;
            node.alternate = consequent;
            node.test = test.argument;
        }
    }

    function rewriteConditionalExpression(tree, options) {
        var result;

        if (options == null) {
            options = { destructive: false };
        }

        modified = false;
        result = (options.destructive) ? tree : common.deepCopy(tree);

        common.traverse(result, {
            enter: function enter(node) {
                if (node.type === Syntax.ConditionalExpression) {
                    rewrite(node);
                }
            }
        });

        return {
            result: result,
            modified: modified
        };
    }

    rewriteConditionalExpression.passName = 'rewrite-conditional-expression';
    module.exports = rewriteConditionalExpression;
}());
/* vim: set sw=4 ts=4 et tw=80 : */

});

require.define("/tools/entry.js",function(require,module,exports,__dirname,__filename,process,global){global.esmangle = require('../lib/esmangle');
(function () {
    // entry points
    require('../lib/pass/tree-based-constant-folding');
    require('../lib/pass/hoist-variable-to-arguments');
    require('../lib/pass/transform-dynamic-to-static-property-access');
    require('../lib/pass/transform-dynamic-to-static-property-definition');
    require('../lib/pass/transform-immediate-function-call');
    require('../lib/pass/transform-logical-association');
    require('../lib/pass/reordering-function-declarations');
    require('../lib/pass/remove-unused-label');
    require('../lib/pass/remove-empty-statement');
    require('../lib/pass/remove-wasted-blocks');
    require('../lib/pass/transform-to-compound-assignment');
    require('../lib/pass/transform-to-sequence-expression');
    require('../lib/pass/transform-branch-to-expression');
    require('../lib/pass/transform-typeof-undefined');
    require('../lib/pass/reduce-sequence-expression');
    require('../lib/pass/reduce-branch-jump');
    require('../lib/pass/reduce-multiple-if-statements');
    require('../lib/pass/dead-code-elimination');
    require('../lib/pass/remove-side-effect-free-expressions');
    require('../lib/pass/remove-context-sensitive-expressions');
    require('../lib/pass/drop-variable-definition');
    require('../lib/pass/remove-unreachable-branch');

    require('../lib/post/transform-static-to-dynamic-property-access');
    require('../lib/post/transform-infinity');
    require('../lib/post/rewrite-boolean');
    require('../lib/post/rewrite-conditional-expression');
});

});
require("/tools/entry.js");
})();

