// underscore-contrib v0.3.0
// =========================

// > https://github.com/documentcloud/underscore-contrib
// > (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// > underscore-contrib may be freely distributed under the MIT license.

// Underscore-contrib (underscore.array.builders.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------
  
  // Create quick reference variables for speed access to core prototypes.
  var slice   = Array.prototype.slice,
      concat  = Array.prototype.concat;

  var existy = function(x) { return x != null; };

  // Mixing in the array builders
  // ----------------------------

  _.mixin({
    // Concatenates one or more arrays given as arguments.  If given objects and
    // scalars as arguments `cat` will plop them down in place in the result 
    // array.  If given an `arguments` object, `cat` will treat it like an array
    // and concatenate it likewise.
    cat: function() {
      return _.reduce(arguments, function(acc, elem) {
        if (_.isArguments(elem)) {
          return concat.call(acc, slice.call(elem));
        }
        else {
          return concat.call(acc, elem);
        }
      }, []);
    },

    // 'Constructs' an array by putting an element at its front
    cons: function(head, tail) {
      return _.cat([head], tail);
    },

    // Takes an array and chunks it some number of times into
    // sub-arrays of size n.  Allows and optional padding array as
    // the third argument to fill in the tail chunk when n is
    // not sufficient to build chunks of the same size.
    chunk: function(array, n, pad) {
      var p = function(array) {
        if (array == null) return [];

        var part = _.take(array, n);

        if (n === _.size(part)) {
          return _.cons(part, p(_.drop(array, n)));
        }
        else {
          return pad ? [_.take(_.cat(part, pad), n)] : [];
        }
      };

      return p(array);
    },

    // Takes an array and chunks it some number of times into
    // sub-arrays of size n.  If the array given cannot fill the size
    // needs of the final chunk then a smaller chunk is used
    // for the last.
    chunkAll: function(array, n, step) {
      step = (step != null) ? step : n;

      var p = function(array, n, step) {
        if (_.isEmpty(array)) return [];

        return _.cons(_.take(array, n),
                      p(_.drop(array, step), n, step));
      };

      return p(array, n, step);
    },

    // Maps a function over an array and concatenates all of the results.
    mapcat: function(array, fun) {
      return _.cat.apply(null, _.map(array, fun));
    },

    // Returns an array with some item between each element
    // of a given array.
    interpose: function(array, inter) {
      if (!_.isArray(array)) throw new TypeError;
      var sz = _.size(array);
      if (sz === 0) return array;
      if (sz === 1) return array;

      return slice.call(_.mapcat(array, function(elem) { 
        return _.cons(elem, [inter]);
      }), 0, -1);
    },

    // Weaves two or more arrays together
    weave: function(/* args */) {
      if (!_.some(arguments)) return [];
      if (arguments.length == 1) return arguments[0];

      return _.filter(_.flatten(_.zip.apply(null, arguments), true), function(elem) {
        return elem != null;
      });
    },
    interleave: _.weave,

    // Returns an array of a value repeated a certain number of
    // times.
    repeat: function(t, elem) {
      return _.times(t, function() { return elem; });
    },

    // Returns an array built from the contents of a given array repeated
    // a certain number of times.
    cycle: function(t, elems) {
      return _.flatten(_.times(t, function() { return elems; }), true);
    },

    // Returns an array with two internal arrays built from
    // taking an original array and spliting it at an index.
    splitAt: function(array, index) {
      return [_.take(array, index), _.drop(array, index)];
    },

    // Call a function recursively f(f(f(args))) until a second
    // given function goes falsey.  Expects a seed value to start.
    iterateUntil: function(doit, checkit, seed) {
      var ret = [];
      var result = doit(seed);

      while (checkit(result)) {
        ret.push(result);
        result = doit(result);
      }

      return ret;
    },

    // Takes every nth item from an array, returning an array of
    // the results.
    takeSkipping: function(array, n) {
      var ret = [];
      var sz = _.size(array);

      if (n <= 0) return [];
      if (n === 1) return array;

      for(var index = 0; index < sz; index += n) {
        ret.push(array[index]);
      }

      return ret;
    },

    // Returns an array of each intermediate stage of a call to
    // a `reduce`-like function.
    reductions: function(array, fun, init) {
      var ret = [];
      var acc = init;

      _.each(array, function(v,k) {
        acc = fun(acc, array[k]);
        ret.push(acc);
      });

      return ret;
    },

    // Runs its given function on the index of the elements rather than 
    // the elements themselves, keeping all of the truthy values in the end.
    keepIndexed: function(array, pred) {
      return _.filter(_.map(_.range(_.size(array)), function(i) {
        return pred(i, array[i]);
      }),
      existy);
    },

    // Accepts an array-like object (other than strings) as an argument and
    // returns an array whose elements are in the reverse order. Unlike the
    // built-in `Array.prototype.reverse` method, this does not mutate the
    // original object. Note: attempting to use this method on a string will
    // result in a `TypeError`, as it cannot properly reverse unicode strings.

    reverseOrder: function(obj) {
      if (typeof obj == 'string')
        throw new TypeError('Strings cannot be reversed by _.reverseOrder');
      return slice.call(obj).reverse();
    }
  });

})(this);

// Underscore-contrib (underscore.array.selectors.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  // Create quick reference variables for speed access to core prototypes.
  var slice   = Array.prototype.slice,
      concat  = Array.prototype.concat;

  var existy = function(x) { return x != null; };
  var truthy = function(x) { return (x !== false) && existy(x); };
  var isSeq = function(x) { return (_.isArray(x)) || (_.isArguments(x)); };

  // Mixing in the array selectors
  // ----------------------------

  _.mixin({
    // Returns the second element of an array. Passing **n** will return all but
    // the first of the head N values in the array.  The **guard** check allows it
    // to work with `_.map`.
    second: function(array, n, guard) {
      if (array == null) return void 0;
      return (n != null) && !guard ? slice.call(array, 1, n) : array[1];
    },

    // Returns the third element of an array. Passing **n** will return all but
    // the first two of the head N values in the array.  The **guard** check allows it
    // to work with `_.map`.
    third: function(array, n, guard) {
      if (array == null) return void 0;
      return (n != null) && !guard ? slice.call(array, 2, n) : array[2];
    },

    // A function to get at an index into an array
    nth: function(array, index, guard) {
      if ((index != null) && !guard) return array[index];
    },

    // Takes all items in an array while a given predicate returns truthy.
    takeWhile: function(array, pred) {
      if (!isSeq(array)) throw new TypeError;

      var sz = _.size(array);

      for (var index = 0; index < sz; index++) {
        if(!truthy(pred(array[index]))) {
          break;
        }
      }

      return _.take(array, index);
    },

    // Drops all items from an array while a given predicate returns truthy.
    dropWhile: function(array, pred) {
      if (!isSeq(array)) throw new TypeError;

      var sz = _.size(array);

      for (var index = 0; index < sz; index++) {
        if(!truthy(pred(array[index])))
          break;
      }

      return _.drop(array, index);
    },

    // Returns an array with two internal arrays built from
    // taking an original array and spliting it at the index
    // where a given function goes falsey.
    splitWith: function(array, pred) {
      return [_.takeWhile(array, pred), _.dropWhile(array, pred)];
    },

    // Takes an array and partitions it as the given predicate changes
    // truth sense.
    partitionBy: function(array, fun){
      if (_.isEmpty(array) || !existy(array)) return [];

      var fst    = _.first(array);
      var fstVal = fun(fst);
      var run    = concat.call([fst], _.takeWhile(_.rest(array), function(e) {
        return _.isEqual(fstVal, fun(e));
      }));

      return concat.call([run], _.partitionBy(_.drop(array, _.size(run)), fun));
    },

    // Returns the 'best' value in an array based on the result of a
    // given function.
    best: function(array, fun) {
      return _.reduce(array, function(x, y) {
        return fun(x, y) ? x : y;
      });
    },

    // Returns an array of existy results of a function over an source array.
    keep: function(array, fun) {
      if (!isSeq(array)) throw new TypeError("expected an array as the first argument");

      return _.filter(_.map(array, function(e) {
        return fun(e);
      }), existy);
    }
  });

})(this);

// Underscore-contrib (underscore.collections.walk.js 0.3.0)
// (c) 2013 Patrick Dubroy
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  // An internal object that can be returned from a visitor function to
  // prevent a top-down walk from walking subtrees of a node.
  var stopRecursion = {};

  // An internal object that can be returned from a visitor function to
  // cause the walk to immediately stop.
  var stopWalk = {};

  var notTreeError = 'Not a tree: same object found in two different branches';

  // Implements the default traversal strategy: if `obj` is a DOM node, walk
  // its DOM children; otherwise, walk all the objects it references.
  function defaultTraversal(obj) {
    return _.isElement(obj) ? obj.children : obj;
  }

  // Walk the tree recursively beginning with `root`, calling `beforeFunc`
  // before visiting an objects descendents, and `afterFunc` afterwards.
  // If `collectResults` is true, the last argument to `afterFunc` will be a
  // collection of the results of walking the node's subtrees.
  function walkImpl(root, traversalStrategy, beforeFunc, afterFunc, context, collectResults) {
    var visited = [];
    return (function _walk(value, key, parent) {
      // Keep track of objects that have been visited, and throw an exception
      // when trying to visit the same object twice.
      if (_.isObject(value)) {
        if (visited.indexOf(value) >= 0) throw new TypeError(notTreeError);
        visited.push(value);
      }

      if (beforeFunc) {
        var result = beforeFunc.call(context, value, key, parent);
        if (result === stopWalk) return stopWalk;
        if (result === stopRecursion) return;
      }

      var subResults;
      var target = traversalStrategy(value);
      if (_.isObject(target) && !_.isEmpty(target)) {
        // If collecting results from subtrees, collect them in the same shape
        // as the parent node.
        if (collectResults) subResults = _.isArray(value) ? [] : {};

        var stop = _.any(target, function(obj, key) {
          var result = _walk(obj, key, value);
          if (result === stopWalk) return true;
          if (subResults) subResults[key] = result;
        });
        if (stop) return stopWalk;
      }
      if (afterFunc) return afterFunc.call(context, value, key, parent, subResults);
    })(root);
  }

  // Internal helper providing the implementation for `pluck` and `pluckRec`.
  function pluck(obj, propertyName, recursive) {
    var results = [];
    this.preorder(obj, function(value, key) {
      if (!recursive && key == propertyName)
        return stopRecursion;
      if (_.has(value, propertyName))
        results[results.length] = value[propertyName];
    });
    return results;
  }

  var exports = {
    // Performs a preorder traversal of `obj` and returns the first value
    // which passes a truth test.
    find: function(obj, visitor, context) {
      var result;
      this.preorder(obj, function(value, key, parent) {
        if (visitor.call(context, value, key, parent)) {
          result = value;
          return stopWalk;
        }
      }, context);
      return result;
    },

    // Recursively traverses `obj` and returns all the elements that pass a
    // truth test. `strategy` is the traversal function to use, e.g. `preorder`
    // or `postorder`.
    filter: function(obj, strategy, visitor, context) {
      var results = [];
      if (obj == null) return results;
      strategy(obj, function(value, key, parent) {
        if (visitor.call(context, value, key, parent)) results.push(value);
      }, null, this._traversalStrategy);
      return results;
    },

    // Recursively traverses `obj` and returns all the elements for which a
    // truth test fails.
    reject: function(obj, strategy, visitor, context) {
      return this.filter(obj, strategy, function(value, key, parent) {
        return !visitor.call(context, value, key, parent);
      });
    },

    // Produces a new array of values by recursively traversing `obj` and
    // mapping each value through the transformation function `visitor`.
    // `strategy` is the traversal function to use, e.g. `preorder` or
    // `postorder`.
    map: function(obj, strategy, visitor, context) {
      var results = [];
      strategy(obj, function(value, key, parent) {
        results[results.length] = visitor.call(context, value, key, parent);
      }, null, this._traversalStrategy);
      return results;
    },

    // Return the value of properties named `propertyName` reachable from the
    // tree rooted at `obj`. Results are not recursively searched; use
    // `pluckRec` for that.
    pluck: function(obj, propertyName) {
      return pluck.call(this, obj, propertyName, false);
    },

    // Version of `pluck` which recursively searches results for nested objects
    // with a property named `propertyName`.
    pluckRec: function(obj, propertyName) {
      return pluck.call(this, obj, propertyName, true);
    },

    // Recursively traverses `obj` in a depth-first fashion, invoking the
    // `visitor` function for each object only after traversing its children.
    // `traversalStrategy` is intended for internal callers, and is not part
    // of the public API.
    postorder: function(obj, visitor, context, traversalStrategy) {
      traversalStrategy = traversalStrategy || this._traversalStrategy;
      walkImpl(obj, traversalStrategy, null, visitor, context);
    },

    // Recursively traverses `obj` in a depth-first fashion, invoking the
    // `visitor` function for each object before traversing its children.
    // `traversalStrategy` is intended for internal callers, and is not part
    // of the public API.
    preorder: function(obj, visitor, context, traversalStrategy) {
      traversalStrategy = traversalStrategy || this._traversalStrategy;
      walkImpl(obj, traversalStrategy, visitor, null, context);
    },

    // Builds up a single value by doing a post-order traversal of `obj` and
    // calling the `visitor` function on each object in the tree. For leaf
    // objects, the `memo` argument to `visitor` is the value of the `leafMemo`
    // argument to `reduce`. For non-leaf objects, `memo` is a collection of
    // the results of calling `reduce` on the object's children.
    reduce: function(obj, visitor, leafMemo, context) {
      var reducer = function(value, key, parent, subResults) {
        return visitor(subResults || leafMemo, value, key, parent);
      };
      return walkImpl(obj, this._traversalStrategy, null, reducer, context, true);
    }
  };

  // Set up aliases to match those in underscore.js.
  exports.collect = exports.map;
  exports.detect = exports.find;
  exports.select = exports.filter;

  // Returns an object containing the walk functions. If `traversalStrategy`
  // is specified, it is a function determining how objects should be
  // traversed. Given an object, it returns the object to be recursively
  // walked. The default strategy is equivalent to `_.identity` for regular
  // objects, and for DOM nodes it returns the node's DOM children.
  _.walk = function(traversalStrategy) {
    var walker = _.clone(exports);

    // Bind all of the public functions in the walker to itself. This allows
    // the traversal strategy to be dynamically scoped.
    _.bindAll.apply(null, [walker].concat(_.keys(walker)));

    walker._traversalStrategy = traversalStrategy || defaultTraversal;
    return walker;
  };

  // Use `_.walk` as a namespace to hold versions of the walk functions which
  // use the default traversal strategy.
  _.extend(_.walk, _.walk());
})(this);

// Underscore-contrib (underscore.function.arity.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  function enforcesUnary (fn) {
    return function mustBeUnary () {
      if (arguments.length === 1) {
        return fn.apply(this, arguments);
      }
      else throw new RangeError('Only a single argument may be accepted.');

    };
  }

  // Curry
  // -------
  var curry = (function () {
    function collectArgs(func, that, argCount, args, newArg, reverse) {
      if (reverse === true) {
        args.unshift(newArg);
      } else {
        args.push(newArg);
      }
      if (args.length == argCount) {
        return func.apply(that, args);
      } else {
        return enforcesUnary(function () {
          return collectArgs(func, that, argCount, args.slice(0), arguments[0], reverse);
        });
      }
    }
    return function curry (func, reverse) {
      var that = this;
      return enforcesUnary(function () {
        return collectArgs(func, that, func.length, [], arguments[0], reverse);
      });
    };
  }());

  // Enforce Arity
  // --------------------
  var enforce = (function () {
    var CACHE = [];
    return function enforce (func) {
      if (typeof func !== 'function') {
        throw new Error('Argument 1 must be a function.');
      }
      var funcLength = func.length;
      if (CACHE[funcLength] === undefined) {
        CACHE[funcLength] = function (enforceFunc) {
          return function () {
            if (arguments.length !== funcLength) {
              throw new RangeError(funcLength + ' arguments must be applied.');
            }
            return enforceFunc.apply(this, arguments);
          };
        };
      }
      return CACHE[funcLength](func);
    };
  }());

  // Mixing in the arity functions
  // -----------------------------

  _.mixin({
    // ### Fixed arguments

    // Fixes the arguments to a function based on the parameter template defined by
    // the presence of values and the `_` placeholder.
    fix: function(fun) {
      var fixArgs = _.rest(arguments);

      var f = function() {
        var args = fixArgs.slice();
        var arg = 0;

        for ( var i = 0; i < (args.length || arg < arguments.length); i++ ) {
          if ( args[i] === _ ) {
            args[i] = arguments[arg++];
          }
        }

        return fun.apply(null, args);
      };

      f._original = fun;

      return f;
    },

    unary: function (fun) {
      return function unary (a) {
        return fun.call(this, a);
      };
    },

    binary: function (fun) {
      return function binary (a, b) {
        return fun.call(this, a, b);
      };
    },

    ternary: function (fun) {
      return function ternary (a, b, c) {
        return fun.call(this, a, b, c);
      };
    },

    quaternary: function (fun) {
      return function quaternary (a, b, c, d) {
        return fun.call(this, a, b, c, d);
      };
    },

    // Flexible curry function with strict arity.
    // Argument application left to right.
    // source: https://github.com/eborden/js-curry
    curry: curry,

    // Flexible right to left curry with strict arity.
    rCurry: function (func) {
      return curry.call(this, func, true);
    },


    curry2: function (fun) {
      return enforcesUnary(function curried (first) {
        return enforcesUnary(function (last) {
          return fun.call(this, first, last);
        });
      });
    },

    curry3: function (fun) {
      return enforcesUnary(function (first) {
        return enforcesUnary(function (second) {
          return enforcesUnary(function (last) {
            return fun.call(this, first, second, last);
          });
        });
      });
    },

      // reverse currying for functions taking two arguments.
    rcurry2: function (fun) {
      return enforcesUnary(function (last) {
        return enforcesUnary(function (first) {
          return fun.call(this, first, last);
        });
      });
    },

    rcurry3: function (fun) {
      return enforcesUnary(function (last) {
        return enforcesUnary(function (second) {
          return enforcesUnary(function (first) {
            return fun.call(this, first, second, last);
          });
        });
      });
    },
    // Dynamic decorator to enforce function arity and defeat varargs.
    enforce: enforce
  });

  _.arity = (function () {
    // Allow 'new Function', as that is currently the only reliable way
    // to manipulate function.length
    /* jshint -W054 */
    var FUNCTIONS = {};
    return function arity (numberOfArgs, fun) {
      if (FUNCTIONS[numberOfArgs] == null) {
        var parameters = new Array(numberOfArgs);
        for (var i = 0; i < numberOfArgs; ++i) {
          parameters[i] = "__" + i;
        }
        var pstr = parameters.join();
        var code = "return function ("+pstr+") { return fun.apply(this, arguments); };";
        FUNCTIONS[numberOfArgs] = new Function(['fun'], code);
      }
      if (fun == null) {
        return function (fun) { return arity(numberOfArgs, fun); };
      }
      else return FUNCTIONS[numberOfArgs](fun);
    };
  })();

})(this);

// Underscore-contrib (underscore.function.combinators.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  var existy = function(x) { return x != null; };
  var truthy = function(x) { return (x !== false) && existy(x); };
  var __reverse = [].reverse;
  var __slice = [].slice;
  var __map = [].map;
  var curry2 = function (fun) {
    return function curried (first, optionalLast) {
      if (arguments.length === 1) {
        return function (last) {
          return fun(first, last);
        };
      }
      else return fun(first, optionalLast);
    };
  };
  
  // n.b. depends on underscore.function.arity.js
    
  // Takes a target function and a mapping function. Returns a function
  // that applies the mapper to its arguments before evaluating the body.
  function baseMapArgs (fun, mapFun) {
    return _.arity(fun.length, function () {
      return fun.apply(this, __map.call(arguments, mapFun));
    });
  }
  
  // Mixing in the combinator functions
  // ----------------------------------

  _.mixin({
    // Provide "always" alias for backwards compatibility
    always: _.constant,

    // Takes some number of functions, either as an array or variadically
    // and returns a function that takes some value as its first argument 
    // and runs it through a pipeline of the original functions given.
    pipeline: function(/*, funs */){
      var funs = (_.isArray(arguments[0])) ? arguments[0] : arguments;

      return function(seed) {
        return _.reduce(funs,
                        function(l,r) { return r(l); },
                        seed);
      };
    },

    // Composes a bunch of predicates into a single predicate that
    // checks all elements of an array for conformance to all of the
    // original predicates.
    conjoin: function(/* preds */) {
      var preds = arguments;

      return function(array) {
        return _.every(array, function(e) {
          return _.every(preds, function(p) {
            return p(e);
          });
        });
      };
    },

    // Composes a bunch of predicates into a single predicate that
    // checks all elements of an array for conformance to any of the
    // original predicates.
    disjoin: function(/* preds */) {
      var preds = arguments;

      return function(array) {
        return _.some(array, function(e) {
          return _.some(preds, function(p) {
            return p(e);
          });
        });
      };
    },

    // Takes a predicate-like and returns a comparator (-1,0,1).
    comparator: function(fun) {
      return function(x, y) {
        if (truthy(fun(x, y)))
          return -1;
        else if (truthy(fun(y, x)))
          return 1;
        else
          return 0;
      };
    },

    // Returns a function that reverses the sense of a given predicate-like.
    complement: function(pred) {
      return function() {
        return !pred.apply(this, arguments);
      };
    },

    // Takes a function expecting varargs and
    // returns a function that takes an array and
    // uses its elements as the args to  the original
    // function
    splat: function(fun) {
      return function(array) {
        return fun.apply(this, array);
      };
    },

    // Takes a function expecting an array and returns
    // a function that takes varargs and wraps all
    // in an array that is passed to the original function.
    unsplat: function(fun) {
      var funLength = fun.length;

      if (funLength < 1) {
        return fun;
      }
      else if (funLength === 1)  {
        return function () {
          return fun.call(this, __slice.call(arguments, 0));
        };
      }
      else {
        return function () {
          var numberOfArgs = arguments.length,
              namedArgs = __slice.call(arguments, 0, funLength - 1),
              numberOfMissingNamedArgs = Math.max(funLength - numberOfArgs - 1, 0),
              argPadding = new Array(numberOfMissingNamedArgs),
              variadicArgs = __slice.call(arguments, fun.length - 1);

          return fun.apply(this, namedArgs.concat(argPadding).concat([variadicArgs]));
        };
      }
    },

    // Same as unsplat, but the rest of the arguments are collected in the
    // first parameter, e.g. unsplatl( function (args, callback) { ... ]})
    unsplatl: function(fun) {
      var funLength = fun.length;

      if (funLength < 1) {
        return fun;
      }
      else if (funLength === 1)  {
        return function () {
          return fun.call(this, __slice.call(arguments, 0));
        };
      }
      else {
        return function () {
          var numberOfArgs = arguments.length,
              namedArgs = __slice.call(arguments, Math.max(numberOfArgs - funLength + 1, 0)),
              variadicArgs = __slice.call(arguments, 0, Math.max(numberOfArgs - funLength + 1, 0));

          return fun.apply(this, [variadicArgs].concat(namedArgs));
        };
      }
    },
    
    // map the arguments of a function
    mapArgs: curry2(baseMapArgs),

    // Returns a function that returns an array of the calls to each
    // given function for some arguments.
    juxt: function(/* funs */) {
      var funs = arguments;

      return function(/* args */) {
        var args = arguments;
        return _.map(funs, function(f) {
          return f.apply(this, args);
        }, this);
      };
    },

    // Returns a function that protects a given function from receiving
    // non-existy values.  Each subsequent value provided to `fnull` acts
    // as the default to the original function should a call receive non-existy
    // values in the defaulted arg slots.
    fnull: function(fun /*, defaults */) {
      var defaults = _.rest(arguments);

      return function(/*args*/) {
        var args = _.toArray(arguments);
        var sz = _.size(defaults);

        for(var i = 0; i < sz; i++) {
          if (!existy(args[i]))
            args[i] = defaults[i];
        }

        return fun.apply(this, args);
      };
    },

    // Flips the first two args of a function
    flip2: function(fun) {
      return function(/* args */) {
        var flipped = __slice.call(arguments);
        flipped[0] = arguments[1];
        flipped[1] = arguments[0];

        return fun.apply(this, flipped);
      };
    },

    // Flips an arbitrary number of args of a function
    flip: function(fun) {
      return function(/* args */) {
        var reversed = __reverse.call(arguments);

        return fun.apply(this, reversed);
      };
    },

    // Takes a method-style function (one which uses `this`) and pushes
    // `this` into the argument list. The returned function uses its first
    // argument as the receiver/context of the original function, and the rest
    // of the arguments are used as the original's entire argument list.
    functionalize: function(method) {
      return function(ctx /*, args */) {
        return method.apply(ctx, _.rest(arguments));
      };
    },

    // Takes a function and pulls the first argument out of the argument
    // list and into `this` position. The returned function calls the original
    // with its receiver (`this`) prepending the argument list. The original
    // is called with a receiver of `null`.
    methodize: function(func) {
      return function(/* args */) {
        return func.apply(null, _.cons(this, arguments));
      };
    },
    
    k: _.always,
    t: _.pipeline
  });
  
  _.unsplatr = _.unsplat;
    
  // map the arguments of a function, takes the mapping function
  // first so it can be used as a combinator
  _.mapArgsWith = curry2(_.flip(baseMapArgs));
  
  // Returns function property of object by name, bound to object
  _.bound = function(obj, fname) {
    var fn = obj[fname];
    if (!_.isFunction(fn))
      throw new TypeError("Expected property to be a function");
    return _.bind(fn, obj);
  };

})(this);

// Underscore-contrib (underscore.function.dispatch.js 0.3.0)
// (c) 2013 Justin Ridgewell
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  // Create quick reference variable for speed.
  var slice   = Array.prototype.slice;

  // Mixing in the attempt function
  // ------------------------

  _.mixin({
    // If object is not undefined or null then invoke the named `method` function
    // with `object` as context and arguments; otherwise, return undefined.
    attempt: function(object, method) {
      if (object == null) return void 0;
      var func = object[method];
      var args = slice.call(arguments, 2);
      return _.isFunction(func) ? func.apply(object, args) : void 0;
    }
  });

})(this);

// Underscore-contrib (underscore.function.iterators.js 0.3.0)
// (c) 2013 Michael Fogus and DocumentCloud Inc.
// Underscore-contrib may be freely distributed under the MIT license.

(function(root, undefined) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------
  
  var HASNTBEENRUN = {};
  
  function unary (fun) {
    return function (first) {
      return fun.call(this, first);
    };
  }
  
  function binary (fun) {
    return function (first, second) {
      return fun.call(this, first, second);
    };
  }
  
  // Mixing in the iterator functions
  // --------------------------------

  function foldl (iter, binaryFn, seed) {
    var state, element;
    if (seed !== void 0) {
      state = seed;
    }
    else {
      state = iter();
    }
    element = iter();
    while (element != null) {
      state = binaryFn.call(element, state, element);
      element = iter();
    }
    return state;
  }
  
  function unfold (seed, unaryFn) {
    var state = HASNTBEENRUN;
    return function () {
      if (state === HASNTBEENRUN) {
        state = seed;
      } else if (state != null) {
        state = unaryFn.call(state, state);
      }

      return state;
    };
  }
  
  // note that the unfoldWithReturn behaves differently than
  // unfold with respect to the first value returned
  function unfoldWithReturn (seed, unaryFn) {
    var state = seed,
        pair,
        value;
    return function () {
      if (state != null) {
        pair = unaryFn.call(state, state);
        value = pair[1];
        state = value != null ? pair[0] : void 0;
        return value;
      }
      else return void 0;
    };
  }

  function accumulate (iter, binaryFn, initial) {
    var state = initial;
    return function () {
      var element = iter();
      if (element == null) {
        return element;
      }
      else {
        if (state === void 0) {
          state = element;
        } else {
          state = binaryFn.call(element, state, element);
        }
        
        return state;
      }
    };
  }
  
  function accumulateWithReturn (iter, binaryFn, initial) {
    var state = initial,
        stateAndReturnValue,
        element;
    return function () {
      element = iter();
      if (element == null) {
        return element;
      }
      else {
        if (state === void 0) {
          state = element;
          return state;
        }
        else {
          stateAndReturnValue = binaryFn.call(element, state, element);
          state = stateAndReturnValue[0];
          return stateAndReturnValue[1];
        }
      }
    };
  }
  
  function map (iter, unaryFn) {
    return function() {
      var element;
      element = iter();
      if (element != null) {
        return unaryFn.call(element, element);
      } else {
        return void 0;
      }
    };
  }

  function mapcat(iter, unaryFn) {
    var lastIter = null;
    return function() {
      var element;
      var gen;
      if (lastIter == null) {
        gen = iter();
        if (gen == null) {
          lastIter = null;
          return void 0;
        }
        lastIter = unaryFn.call(gen, gen);
      }
      while (element == null) {
        element = lastIter();
        if (element == null) {
          gen = iter();
          if (gen == null) {
            lastIter = null;
            return void 0;
          }
          else {
            lastIter = unaryFn.call(gen, gen);
          }
        }
      }
      return element;
    };
  }

  function select (iter, unaryPredicateFn) {
    return function() {
      var element;
      element = iter();
      while (element != null) {
        if (unaryPredicateFn.call(element, element)) {
          return element;
        }
        element = iter();
      }
      return void 0;
    };
  }
  
  function reject (iter, unaryPredicateFn) {
    return select(iter, function (something) {
      return !unaryPredicateFn(something);
    });
  }
  
  function find (iter, unaryPredicateFn) {
    return select(iter, unaryPredicateFn)();
  }

  function slice (iter, numberToDrop, numberToTake) {
    var count = 0;
    while (numberToDrop-- > 0) {
      iter();
    }
    if (numberToTake != null) {
      return function() {
        if (++count <= numberToTake) {
          return iter();
        } else {
          return void 0;
        }
      };
    }
    else return iter;
  }
  
  function drop (iter, numberToDrop) {
    return slice(iter, numberToDrop == null ? 1 : numberToDrop);
  }

  function take (iter, numberToTake) {
    return slice(iter, 0, numberToTake == null ? 1 : numberToTake);
  }

  function List (array) {
    var index = 0;
    return function() {
      return array[index++];
    };
  }
  
  function Tree (array) {
    var index, myself, state;
    index = 0;
    state = [];
    myself = function() {
      var element, tempState;
      element = array[index++];
      if (element instanceof Array) {
        state.push({
          array: array,
          index: index
        });
        array = element;
        index = 0;
        return myself();
      } else if (element === void 0) {
        if (state.length > 0) {
          tempState = state.pop();
          array = tempState.array;
          index = tempState.index;
          return myself();
        } else {
          return void 0;
        }
      } else {
        return element;
      }
    };
    return myself;
  }
  
  function K (value) {
    return function () {
      return value;
    };
  }

  function upRange (from, to, by) {
    return function () {
      var was;
    
      if (from > to) {
        return void 0;
      }
      else {
        was = from;
        from = from + by;
        return was;
      }
    };
  }

  function downRange (from, to, by) {
    return function () {
      var was;
    
      if (from < to) {
        return void 0;
      }
      else {
        was = from;
        from = from - by;
        return was;
      }
    };
  }
  
  function range (from, to, by) {
    if (from == null) {
      return upRange(1, Infinity, 1);
    }
    else if (to == null) {
      return upRange(from, Infinity, 1);
    }
    else if (by == null) {
      if (from <= to) {
        return upRange(from, to, 1);
      }
      else return downRange(from, to, 1);
    }
    else if (by > 0) {
      return upRange(from, to, by);
    }
    else if (by < 0) {
      return downRange(from, to, Math.abs(by));
    }
    else return k(from);
  }
  
  var numbers = unary(range);

  _.iterators = {
    accumulate: accumulate,
    accumulateWithReturn: accumulateWithReturn,
    foldl: foldl,
    reduce: foldl,
    unfold: unfold,
    unfoldWithReturn: unfoldWithReturn,
    map: map,
    mapcat: mapcat,
    select: select,
    reject: reject,
    filter: select,
    find: find,
    slice: slice,
    drop: drop,
    take: take,
    List: List,
    Tree: Tree,
    constant: K,
    K: K,
    numbers: numbers,
    range: range
  };

})(this, void 0);

// Underscore-contrib (underscore.function.predicates.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------


  // Mixing in the predicate functions
  // ---------------------------------

  _.mixin({
    // A wrapper around instanceof
    isInstanceOf: function(x, t) { return (x instanceof t); },

    // An associative object is one where its elements are
    // accessed via a key or index. (i.e. array and object)
    isAssociative: function(x) { return _.isArray(x) || _.isObject(x) || _.isArguments(x); },

    // An indexed object is anything that allows numerical index for
    // accessing its elements (e.g. arrays and strings). NOTE: Underscore
    // does not support cross-browser consistent use of strings as array-like
    // objects, so be wary in IE 8 when using  String objects and IE<8.
    // on string literals & objects.
    isIndexed: function(x) { return _.isArray(x) || _.isString(x) || _.isArguments(x); },

    // A seq is something considered a sequential composite type (i.e. arrays and `arguments`).
    isSequential: function(x) { return (_.isArray(x)) || (_.isArguments(x)); },

    // Check if an object is an object literal, since _.isObject(function() {}) === _.isObject([]) === true
    isPlainObject: function(x) { return _.isObject(x) && x.constructor === root.Object; },

    // These do what you think that they do
    isZero: function(x) { return 0 === x; },
    isEven: function(x) { return _.isFinite(x) && (x & 1) === 0; },
    isOdd: function(x) { return _.isFinite(x) && !_.isEven(x); },
    isPositive: function(x) { return x > 0; },
    isNegative: function(x) { return x < 0; },
    isValidDate: function(x) { return _.isDate(x) && !_.isNaN(x.getTime()); },

    // A numeric is a variable that contains a numeric value, regardless its type
    // It can be a String containing a numeric value, exponential notation, or a Number object
    // See here for more discussion: http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric/1830844#1830844
    isNumeric: function(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    },

    // An integer contains an optional minus sign to begin and only the digits 0-9
    // Objects that can be parsed that way are also considered ints, e.g. "123"
    // Floats that are mathematically equal to integers are considered integers, e.g. 1.0
    // See here for more discussion: http://stackoverflow.com/questions/1019515/javascript-test-for-an-integer
    isInteger: function(i) {
      return _.isNumeric(i) && i % 1 === 0;
    },

    // A float is a numbr that is not an integer.
    isFloat: function(n) {
      return _.isNumeric(n) && !_.isInteger(n);
    },

    // checks if a string is a valid JSON
    isJSON: function(str) {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    },

    // Returns true if its arguments are monotonically
    // increaing values; false otherwise.
    isIncreasing: function() {
      var count = _.size(arguments);
      if (count === 1) return true;
      if (count === 2) return arguments[0] < arguments[1];

      for (var i = 1; i < count; i++) {
        if (arguments[i-1] >= arguments[i]) {
          return false;
        }
      }

      return true;
    },

    // Returns true if its arguments are monotonically
    // decreaing values; false otherwise.
    isDecreasing: function() {
      var count = _.size(arguments);
      if (count === 1) return true;
      if (count === 2) return arguments[0] > arguments[1];

      for (var i = 1; i < count; i++) {
        if (arguments[i-1] <= arguments[i]) {
          return false;
        }
      }

      return true;
    }
  });

})(this);

// Underscore-contrib (underscore.object.builders.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  // Create quick reference variables for speed access to core prototypes.
  var slice   = Array.prototype.slice,
      concat  = Array.prototype.concat;

  var existy = function(x) { return x != null; };
  var truthy = function(x) { return (x !== false) && existy(x); };
  var isAssociative = function(x) { return _.isArray(x) || _.isObject(x); };
  var curry2 = function(fun) {
    return function(last) {
      return function(first) {
        return fun(first, last);
      };
    };
  };

  // Mixing in the object builders
  // ----------------------------

  _.mixin({
    // Merges two or more objects starting with the left-most and
    // applying the keys right-word
    // {any:any}* -> {any:any}
    merge: function(/* objs */){
      var dest = _.some(arguments) ? {} : null;

      if (truthy(dest)) {
        _.extend.apply(null, concat.call([dest], _.toArray(arguments)));
      }

      return dest;
    },

    // Takes an object and another object of strings to strings where the second
    // object describes the key renaming to occur in the first object.
    renameKeys: function(obj, kobj) {
      return _.reduce(kobj, function(o, nu, old) {
        if (existy(obj[old])) {
          o[nu] = obj[old];
          return o;
        }
        else
          return o;
      },
      _.omit.apply(null, concat.call([obj], _.keys(kobj))));
    },

    // Snapshots an object deeply. Based on the version by
    // [Keith Devens](http://keithdevens.com/weblog/archive/2007/Jun/07/javascript.clone)
    // until we can find a more efficient and robust way to do it.
    snapshot: function(obj) {
      if(obj == null || typeof(obj) != 'object') {
        return obj;
      }

      var temp = new obj.constructor();

      for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
          temp[key] = _.snapshot(obj[key]);
        }
      }

      return temp;
    },

    // Updates the value at any depth in a nested object based on the
    // path described by the keys given.  The function provided is supplied
    // the current value and is expected to return a value for use as the
    // new value.  If no keys are provided, then the object itself is presented
    // to the given function.
    updatePath: function(obj, fun, ks, defaultValue) {
      if (!isAssociative(obj)) throw new TypeError("Attempted to update a non-associative object.");
      if (!existy(ks)) return fun(obj);

      var deepness = _.isArray(ks);
      var keys     = deepness ? ks : [ks];
      var ret      = deepness ? _.snapshot(obj) : _.clone(obj);
      var lastKey  = _.last(keys);
      var target   = ret;

      _.each(_.initial(keys), function(key) {
        if (defaultValue && !_.has(target, key)) {
          target[key] = _.clone(defaultValue);
        }
        target = target[key];
      });

      target[lastKey] = fun(target[lastKey]);
      return ret;
    },

    // Sets the value at any depth in a nested object based on the
    // path described by the keys given.
    setPath: function(obj, value, ks, defaultValue) {
      if (!existy(ks)) throw new TypeError("Attempted to set a property at a null path.");

      return _.updatePath(obj, function() { return value; }, ks, defaultValue);
    },

    // Returns an object where each element of an array is keyed to
    // the number of times that it occurred in said array.
    frequencies: curry2(_.countBy)(_.identity)
  });

})(this);

// Underscore-contrib (underscore.object.selectors.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  // Create quick reference variables for speed access to core prototypes.
  var concat  = Array.prototype.concat;
  var ArrayProto = Array.prototype;
  var slice = ArrayProto.slice;

  // Mixing in the object selectors
  // ------------------------------

  _.mixin({
    // Returns a function that will attempt to look up a named field
    // in any object that it's given.
    accessor: function(field) {
      return function(obj) {
        return (obj && obj[field]);
      };
    },

    // Given an object, returns a function that will attempt to look up a field
    // that it's given.
    dictionary: function (obj) {
      return function(field) {
        return (obj && field && obj[field]);
      };
    },

    // Like `_.pick` except that it takes an array of keys to pick.
    selectKeys: function (obj, ks) {
      return _.pick.apply(null, concat.call([obj], ks));
    },

    // Returns the key/value pair for a given property in an object, undefined if not found.
    kv: function(obj, key) {
      if (_.has(obj, key)) {
        return [key, obj[key]];
      }

      return void 0;
    },

    // Gets the value at any depth in a nested object based on the
    // path described by the keys given. Keys may be given as an array
    // or as a dot-separated string.
    getPath: function getPath (obj, ks) {
      if (typeof ks == "string") ks = ks.split(".");

      // If we have reached an undefined property
      // then stop executing and return undefined
      if (obj === undefined) return void 0;

      // If the path array has no more elements, we've reached
      // the intended property and return its value
      if (ks.length === 0) return obj;

      // If we still have elements in the path array and the current
      // value is null, stop executing and return undefined
      if (obj === null) return void 0;

      return getPath(obj[_.first(ks)], _.rest(ks));
    },

    // Returns a boolean indicating whether there is a property
    // at the path described by the keys given
    hasPath: function hasPath (obj, ks) {
      if (typeof ks == "string") ks = ks.split(".");

      var numKeys = ks.length;

      if (obj == null && numKeys > 0) return false;

      if (!(ks[0] in obj)) return false;

      if (numKeys === 1) return true;

      return hasPath(obj[_.first(ks)], _.rest(ks));
    },

    pickWhen: function(obj, pred) {
      var copy = {};

      _.each(obj, function(value, key) {
        if (pred(obj[key])) copy[key] = obj[key];
      });

      return copy;
    },

    omitWhen: function(obj, pred) {
      return _.pickWhen(obj, function(e) { return !pred(e); });
    }

  });

})(this);

// Underscore-contrib (underscore.util.existential.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  
  // Mixing in the truthiness
  // ------------------------

  _.mixin({
    exists: function(x) { return x != null; },
    truthy: function(x) { return (x !== false) && _.exists(x); },
    falsey: function(x) { return !_.truthy(x); },
    not:    function(b) { return !b; },
    firstExisting: function() {
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] != null) return arguments[i];
      }
    }
  });

})(this);

// Underscore-contrib (underscore.function.arity.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Setup for variadic operators
  // ----------------------------

  // Turn a binary math operator into a variadic operator
  function variadicMath(operator) {
    return function() {
      return _.reduce(arguments, operator);
    };
  }

  // Turn a binary comparator into a variadic comparator
  function variadicComparator(comparator) {
    return function() {
      var result;
      for (var i = 0; i < arguments.length - 1; i++) {
        result = comparator(arguments[i], arguments[i + 1]);
        if (result === false) return result;
      }
      return result; 
    };
  }

  // Turn a boolean-returning function into one with the opposite meaning
  function invert(fn) {
    return function() {
      return !fn.apply(this, arguments);
    };
  }

  // Basic math operators
  function add(x, y) {
    return x + y;
  }

  function sub(x, y) {
    return x - y;
  }

  function mul(x, y) {
    return x * y;
  }

  function div(x, y) {
    return x / y;
  }

  function mod(x, y) {
    return x % y;
  }

  function inc(x) {
    return ++x;
  }

  function dec(x) {
    return --x;
  }

  function neg(x) {
    return -x;
  }

  // Bitwise operators
  function bitwiseAnd(x, y) {
    return x & y;
  }

  function bitwiseOr(x, y) {
    return x | y;
  }

  function bitwiseXor(x, y) {
    return x ^ y;
  }

  function bitwiseLeft(x, y) {
    return x << y;
  }

  function bitwiseRight(x, y) {
    return x >> y;
  }

  function bitwiseZ(x, y) {
    return x >>> y;
  }

  function bitwiseNot(x) {
    return ~x;
  }

  // Basic comparators
  function eq(x, y) {
    return x == y;
  }

  function seq(x, y) {
    return x === y;
  }

  // Not
  function not(x) {
    return !x;
  }

  // Relative comparators
  function gt(x, y) {
    return x > y;
  }

  function lt(x, y) {
    return x < y;
  }

  function gte(x, y) {
    return x >= y;
  }

  function lte(x, y) {
    return x <= y;
  }

  // Mixing in the operator functions
  // -----------------------------

  _.mixin({
    add: variadicMath(add),
    sub: variadicMath(sub),
    mul: variadicMath(mul),
    div: variadicMath(div),
    mod: mod,
    inc: inc,
    dec: dec,
    neg: neg,
    eq: variadicComparator(eq),
    seq: variadicComparator(seq),
    neq: invert(variadicComparator(eq)),
    sneq: invert(variadicComparator(seq)),
    not: not,
    gt: variadicComparator(gt),
    lt: variadicComparator(lt),
    gte: variadicComparator(gte),
    lte: variadicComparator(lte),
    bitwiseAnd: variadicMath(bitwiseAnd),
    bitwiseOr: variadicMath(bitwiseOr),
    bitwiseXor: variadicMath(bitwiseXor),
    bitwiseNot: bitwiseNot,
    bitwiseLeft: variadicMath(bitwiseLeft),
    bitwiseRight: variadicMath(bitwiseRight),
    bitwiseZ: variadicMath(bitwiseZ)
  });
})(this);

// Underscore-contrib (underscore.util.strings.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  // No reason to create regex more than once
  var plusRegex = /\+/g;
  var spaceRegex = /\%20/g;
  var bracketRegex = /(?:([^\[]+))|(?:\[(.*?)\])/g;

  var urlDecode = function(s) {
    return decodeURIComponent(s.replace(plusRegex, '%20'));
  };
  var urlEncode = function(s) {
    return encodeURIComponent(s).replace(spaceRegex, '+');
  };

  var buildParams = function(prefix, val, top) {
    if (_.isUndefined(top)) top = true;
    if (_.isArray(val)) {
      return _.map(val, function(value, key) {
        return buildParams(top ? key : prefix + '[]', value, false);
      }).join('&');
    } else if (_.isObject(val)) {
      return _.map(val, function(value, key) {
        return buildParams(top ? key : prefix + '[' + key + ']', value, false);
      }).join('&');
    } else {
      return urlEncode(prefix) + '=' + urlEncode(val);
    }
  };

  // Mixing in the string utils
  // ----------------------------

  _.mixin({
    // Explodes a string into an array of chars
    explode: function(s) {
      return s.split('');
    },

    // Parses a query string into a hash
    fromQuery: function(str) {
      var parameters = str.split('&'),
          obj = {},
          parameter,
          key,
          match,
          lastKey,
          subKey,
          depth;

      // Iterate over key/value pairs
      _.each(parameters, function(parameter) {
        parameter = parameter.split('=');
        key = urlDecode(parameter[0]);
        lastKey = key;
        depth = obj;

        // Reset so we don't have issues when matching the same string
        bracketRegex.lastIndex = 0;

        // Attempt to extract nested values
        while ((match = bracketRegex.exec(key)) !== null) {
          if (!_.isUndefined(match[1])) {

            // If we're at the top nested level, no new object needed
            subKey = match[1];

          } else {

            // If we're at a lower nested level, we need to step down, and make
            // sure that there is an object to place the value into
            subKey = match[2];
            depth[lastKey] = depth[lastKey] || (subKey ? {} : []);
            depth = depth[lastKey];
          }

          // Save the correct key as a hash or an array
          lastKey = subKey || _.size(depth);
        }

        // Assign value to nested object
        depth[lastKey] = urlDecode(parameter[1]);
      });

      return obj;
    },

    // Implodes and array of chars into a string
    implode: function(a) {
      return a.join('');
    },

    // Converts a string to camel case
    camelCase : function( string ){
      return  string.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    },

    // Converts camel case to dashed (opposite of _.camelCase)
    toDash : function( string ){
      string = string.replace(/([A-Z])/g, function($1){return "-"+$1.toLowerCase();});
      // remove first dash
      return  ( string.charAt( 0 ) == '-' ) ? string.substr(1) : string;
    },

    // Creates a query string from a hash
    toQuery: function(obj) {
      return buildParams('', obj);
    },

    // Reports whether a string contains a search string.
    strContains: function(str, search) {
      if (typeof str != 'string') throw new TypeError;
      return (str.indexOf(search) != -1);
    }

  });
})(this);

// Underscore-contrib (underscore.util.trampolines.js 0.3.0)
// (c) 2013 Michael Fogus, DocumentCloud and Investigative Reporters & Editors
// Underscore-contrib may be freely distributed under the MIT license.

(function(root) {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var _ = root._ || require('underscore');

  // Helpers
  // -------

  
  // Mixing in the truthiness
  // ------------------------

  _.mixin({
    done: function(value) {
      var ret = _(value);
      ret.stopTrampoline = true;
      return ret;
    },

    trampoline: function(fun /*, args */) {
      var result = fun.apply(fun, _.rest(arguments));

      while (_.isFunction(result)) {
        result = result();
        if ((result instanceof _) && (result.stopTrampoline)) break;
      }

      return result.value();
    }
  });

})(this);
