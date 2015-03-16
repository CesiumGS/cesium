$(document).ready(function() {

  module("underscore.function.combinators");

  test("always", function() {
    equal(_.always(42)(10000), 42, 'should return a function that always returns the same value');
    equal(_.always(42)(1,2,3), 42, 'should return a function that always returns the same value');
    deepEqual(_.map([1,2,3], _.always(42)), [42,42,42], 'should return a function that always returns the same value');
  });

  test("pipeline", function() {
    var run  = _.pipeline(function(n) { return -n; }, function(n) { return "" + n; });
    var run2 = _.pipeline([function(n) { return -n; }, function(n) { return "" + n; }]);
    equal(run(42), "-42", 'should apply a series of functions, originall given variadically to an initial value');
    equal(run2(42), "-42", 'should apply a series of functions, originally given in an array to an initial value');
  });

  test("conjoin", function() {
    var isPositiveEven = _.conjoin(function(x) { return x > 0; }, function(x) { return (x & 1) === 0; });

    equal(isPositiveEven([2,4,6,8]), true, 'should recognize when all elements satisfy a conjunction');
    equal(isPositiveEven([2,4,6,7,8]), false, 'should recognize when an element fails to satisfy a conjunction');
  });

  test("disjoin", function() {
    var orPositiveEven = _.disjoin(function(x) { return x > 0; }, function(x) { return (x & 1) === 0; });

    equal(orPositiveEven([-1,2,3,4,5,6]), true, 'should recognize when all elements satisfy a disjunction');
    equal(orPositiveEven([-1,-3]), false, 'should recognize when an element fails to satisfy a disjunction');
  });

  test("comparator", function() {
    var lessOrEqual = function(x, y) { return x <= y; };
    var a = [0, 1, -2];
    var b = [100, 1, 0, 10, -1, -2, -1];

    deepEqual(a.sort(_.comparator(lessOrEqual)), [-2, 0, 1], 'should return a function to convert a predicate to a comparator');
    deepEqual(b.sort(_.comparator(lessOrEqual)), [-2, -1, -1, 0, 1, 10, 100], 'should return a function to convert a predicate to a comparator');
  });

  test("complement", function() {
    var notOdd = _.complement(function(n) { return (n & 1) === 1; });

    equal(notOdd(2), true, 'should return a function that is the opposite of the function given');
    equal(notOdd(3), false, 'should return a function that is the opposite of the function given');

    var obj = {
      num: 1,
      numIsPositive: function () { return this.num > 0; }
    };
    obj.numIsNotPositive = _.complement(obj.numIsPositive);

    equal(obj.numIsNotPositive(), false, 'should function as a method combinator');
  });

  test('splat', function() {
    var sumArgs = function () {
      return _.reduce(arguments, function (a, b) { return a + b; }, 0);
    };

    var sumArray = _.splat(sumArgs);

    equal(sumArray([1, 2, 3]), 6, 'should return a function that takes array elements as the arguments for the original function');

    var obj = {
      a: 1,
      b: 2,
      getPropsByName: function () {
        var props = [];
        for (var i = 0; i < arguments.length; i++) {
          props.push(this[arguments[i]]);
        }
        return props;
      }
    };
    obj.getPropsByNameArray = _.splat(obj.getPropsByName);

    deepEqual(obj.getPropsByNameArray(['a', 'b']), [1, 2], 'should function as a method combinator');
  });

  test("unsplat", function() {
    var echo  = _.unsplat(function (args) { return args; }),
        echo2 = _.unsplat(function (first, rest) { return [first, rest]; }),
        echo3 = _.unsplat(function (first, second, rest) { return [first, second, rest]; });

    deepEqual(echo(), [], 'should return no arguments');
    deepEqual(echo(1), [1], 'should return the arguments provded');
    deepEqual(echo(1,2), [1,2], 'should return the arguments provded');
    deepEqual(echo(1,2,3), [1,2,3], 'should return the arguments provded');

    deepEqual(echo2(), [void 0, []], 'should return no arguments');
    deepEqual(echo2(1), [1, []], 'should return the arguments provded');
    deepEqual(echo2(1,2), [1,[2]], 'should return the arguments provded');
    deepEqual(echo2(1,2,3), [1,[2,3]], 'should return the arguments provded');
    deepEqual(echo2(1,2,3,4), [1,[2,3,4]], 'should return the arguments provded');

    deepEqual(echo3(), [void 0, void 0, []], 'should return no arguments');
    deepEqual(echo3(1), [1, void 0, []], 'should return the arguments provded');
    deepEqual(echo3(1,2), [1,2,[]], 'should return the arguments provded');
    deepEqual(echo3(1,2,3), [1,2,[3]], 'should return the arguments provded');
    deepEqual(echo3(1,2,3,4), [1,2,[3,4]], 'should return the arguments provded');
  });

  test("unsplatl", function() {
    var echo  = _.unsplatl(function (args) { return args; }),
        echo2 = _.unsplatl(function (rest, ultimate) { return [rest, ultimate]; }),
        echo3 = _.unsplatl(function (rest, penultimate, ultimate) { return [rest, penultimate, ultimate]; });

    deepEqual(echo(), [], 'should return no arguments');
    deepEqual(echo(1), [1], 'should return the arguments provded');
    deepEqual(echo(1,2), [1,2], 'should return the arguments provded');
    deepEqual(echo(1,2,3), [1,2,3], 'should return the arguments provded');

    deepEqual(echo2(), [[], void 0], 'should return no arguments');
    deepEqual(echo2(1), [[], 1], 'should return the arguments provded');
    deepEqual(echo2(1,2), [[1], 2], 'should return the arguments provded');
    deepEqual(echo2(1,2,3), [[1, 2], 3], 'should return the arguments provded');
    deepEqual(echo2(1,2,3,4), [[1, 2, 3], 4], 'should return the arguments provded');

    deepEqual(echo3(), [[], void 0, void 0], 'should return no arguments');
    deepEqual(echo3(1), [[], 1, void 0], 'should return the arguments provded');
    deepEqual(echo3(1,2), [[], 1, 2], 'should return the arguments provded');
    deepEqual(echo3(1,2,3), [[1], 2, 3], 'should return the arguments provded');
    deepEqual(echo3(1,2,3,4), [[1, 2], 3, 4], 'should return the arguments provded');
  });
  
  test("mapArgsWith", function () {
    var echo  = _.unsplatl(function (args) { return args; });
    function timesTwo (n) { return n * 2; }
    function plusOne (n) { return n + 1; }
    
    deepEqual(_.mapArgsWith(timesTwo, echo)(), [], "should handle the empty case");
    deepEqual(_.mapArgsWith(timesTwo, echo)(42), [84], "should handle one arg");
    deepEqual(_.mapArgsWith(plusOne, echo)(1, 2, 3), [2, 3, 4], "should handle many args");
    
    deepEqual(_.mapArgsWith(timesTwo)(echo)(), [], "should handle the empty case");
    deepEqual(_.mapArgsWith(timesTwo)(echo)(42), [84], "should handle one arg");
    deepEqual(_.mapArgsWith(plusOne)(echo)(1, 2, 3), [2, 3, 4], "should handle many args");
  });

  test("flip2", function() {
    var div = function(n, d) { return n/d; };

    equal(_.flip2(div)(10,2), 0.2, 'should return a function that flips the first two args to a function');

    var obj = {
      num: 5,
      addToNum: function (a, b) { return [a + this.num, b + this.num]; }
    };

    obj.reversedAddToNum = _.flip2(obj.addToNum);

    deepEqual(obj.reversedAddToNum(1, 2), [7, 6], 'should function as a method combinator.');
  });

  test("flip", function() {
    var echo = function() { return Array.prototype.slice.call(arguments, 0); };

    deepEqual(_.flip(echo)(1, 2, 3, 4), [4, 3, 2, 1], 'should return a function that flips the first three or more args to a function');

    var obj = {
      num: 5,
      addToNum: function (a, b) { return [a + this.num, b + this.num]; }
    };

    obj.reversedAddToNum = _.flip(obj.addToNum);

    deepEqual(obj.reversedAddToNum(1, 2), [7, 6], 'should function as a method combinator.');
  });

  test("fnull", function() {
    var a = [1,2,3,null,5];
    var b = [1,2,3,undefined,5];
    var safeMult = _.fnull(function(total, n) { return total * n; }, 1, 1);

    equal(_.reduce([1,2,3,5], safeMult), 30, 'should not fill in defaults when not needed');
    equal(_.reduce(a, safeMult), 30, 'should fill in defaults for null');
    equal(_.reduce(b, safeMult), 30, 'should fill in defaults for undefined');

    var obj = {
      a: 1,
      fallback: "fallback value",
      getPropByName: function (name) { return this[name]; }
    };

    obj.getPropByNameOrDefault = _.fnull(obj.getPropByName, "fallback");

    equal(obj.getPropByNameOrDefault(), "fallback value", 'should function as a method combinator.');
  });

  test("juxt", function() {
    var run = _.juxt(function(s, n) { return s.length + n; }, parseInt, _.always(108));

    deepEqual(run('42', 10), [12, 42, 108], 'should return a function that returns an array of the originally supplied functions called');

    var obj = {
      name: "Elizabeth 1",
      firstChar: function () { return this.name[0]; },
      lastChar: function () { return this.name[this.name.length - 1]; }
    };

    obj.firstAndLastChars = _.juxt(obj.firstChar, obj.lastChar);

    deepEqual(obj.firstAndLastChars(), ['E', '1'], 'should function as a method combinator.');
  });

  test("accessor", function() {
    var f = _.accessor('a');

    equal(f({a: 42}), 42, 'should retrieve a pluckable field');
    equal(f({z: 42}), undefined, 'should fail to retrieve a field if not there');
  });

  test("bound", function() {
    var obj = {
      fun: function(b) {
        return this.a + b;
      },

      a: 'hello ',

      nofun: null
    };

    var f = _.bound(obj, 'fun');

    equal(f('there'), 'hello there', 'should return concatenation of obj.a and string argument');
    throws(function() {
      _.bound(obj, 'nofun');
    }, TypeError, 'should throw for non-function properties');
  });

  test("functionalize", function() {
    var rect = {
      x: 2,
      y: 3,
      area: function() {return this.x * this.y;},
      extrude: function(z) {return _.merge(this, {z: z});}
    };
    var areaFunc = _.functionalize(rect.area),
        extrudeFunc = _.functionalize(rect.extrude);
    equal(areaFunc(rect), 6, "returned function's first arg becomes original method's `this`");
    equal(extrudeFunc(rect, 4).z, 4, "all arguments are passed along");
  });

  test("methodize", function() {
    function area(rect) {return rect.x * rect.y;}
    function extrude(rect, z) {return _.merge(rect, {z: z});}
    var rect = {
      x: 2,
      y: 3,
      area: _.methodize(area),
      extrude: _.methodize(extrude)
    };
    equal(rect.area(), 6, "returned method passes its receiver (`this`) as first arg to original function");
    equal(rect.extrude(4).z, 4, "all arguments are passed along");
  });
});
