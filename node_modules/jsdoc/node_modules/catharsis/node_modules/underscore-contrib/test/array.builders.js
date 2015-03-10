$(document).ready(function() {

  module("underscore.array.builders");

  test("cat", function() {
    // no args
    deepEqual(_.cat(), [], 'should return an empty array when given no args');
    
    // one arg
    deepEqual(_.cat([]), [], 'should concatenate one empty array');
    deepEqual(_.cat([1,2,3]), [1,2,3], 'should concatenate one homogenious array');
    var result = _.cat([1, "2", [3], {n: 4}]);
    deepEqual(result, [1, "2", [3], {n: 4}], 'should concatenate one heterogenious array');
    result = (function(){ return _.cat(arguments); })(1, 2, 3);
    deepEqual(result, [1, 2, 3], 'should concatenate the arguments object');

    // two args
    deepEqual(_.cat([1,2,3],[4,5,6]), [1,2,3,4,5,6], 'should concatenate two arrays');
    result = (function(){ return _.cat(arguments, [4,5,6]); })(1,2,3);
    deepEqual(result, [1,2,3,4,5,6], 'should concatenate an array and an arguments object');

    // > 2 args
    var a = [1,2,3];
    var b = [4,5,6];
    var c = [7,8,9];
    var d = [0,0,0];
    deepEqual(_.cat(a,b,c), [1,2,3,4,5,6,7,8,9], 'should concatenate three arrays');
    deepEqual(_.cat(a,b,c,d), [1,2,3,4,5,6,7,8,9,0,0,0], 'should concatenate four arrays');
    result = (function(){ return _.cat(arguments,b,c,d); }).apply(null, a);
    deepEqual(result, [1,2,3,4,5,6,7,8,9,0,0,0], 'should concatenate four arrays, including an arguments object');

    // heterogenious types
    deepEqual(_.cat([1],2), [1,2], 'should concatenate mixed types');
    deepEqual(_.cat([1],2,3), [1,2,3], 'should concatenate mixed types');
    deepEqual(_.cat(1,2,3), [1,2,3], 'should concatenate mixed types');
    result = (function(){ return _.cat(arguments, 4,5,6); })(1,2,3);
    deepEqual(result, [1,2,3,4,5,6], 'should concatenate mixed types, including an arguments object');
  });

  test("cons", function() {
    deepEqual(_.cons(0, []), [0], 'should insert the first arg into the array given as the second arg');
    deepEqual(_.cons(1, [2]), [1,2], 'should insert the first arg into the array given as the second arg');
    deepEqual(_.cons([0], [1,2,3]), [[0],1,2,3], 'should insert the first arg into the array given as the second arg');
    deepEqual(_.cons(1, 2), [1,2], 'should create a pair if the second is not an array');
    deepEqual(_.cons([1], 2), [[1],2], 'should create a pair if the second is not an array');
    result = (function(){ return _.cons(0, arguments); })(1,2,3);
    deepEqual(result, [0,1,2,3], 'should construct an array given an arguments object as the tail');

    var a = [1,2,3];
    var result = _.cons(0,a);

    deepEqual(a, [1,2,3], 'should not modify the original tail');
  });

  test("chunk", function() {
    var a = _.range(4);
    var b = _.range(5);
    var c = _.range(7);

    deepEqual(_.chunk(a, 2), [[0,1],[2,3]], 'should chunk into the size given');
    deepEqual(_.chunk(b, 2), [[0,1],[2,3]], 'should chunk into the size given. Extras are dropped');

    var result = _.chunk(a, 2);
    deepEqual(a, _.range(4), 'should not modify the original array');

    deepEqual(_.chunk(c, 3, [7,8]), [[0,1,2],[3,4,5],[6,7,8]], 'should allow one to specify a padding array');
    deepEqual(_.chunk(b, 3, 9), [[0,1,2],[3,4,9]], 'should allow one to specify a padding value');
  });

  test("chunkAll", function() {
    var a = _.range(4);
    var b = _.range(10);

    deepEqual(_.chunkAll(a, 2), [[0,1],[2,3]], 'should chunk into the size given');
    deepEqual(_.chunkAll(b, 4), [[0,1,2,3],[4,5,6,7],[8,9]], 'should chunk into the size given, with a small end');

    var result = _.chunkAll(a, 2);
    deepEqual(a, _.range(4), 'should not modify the original array');

    deepEqual(_.chunkAll(b, 2, 4), [[0,1],[4,5],[8,9]], 'should chunk into the size given, with skips');
    deepEqual(_.chunkAll(b, 3, 4), [[0,1,2],[4,5,6],[8,9]], 'should chunk into the size given, with skips and a small end');
  });

  test("mapcat", function() {
    var a = [1,2,3];
    var commaize = function(e) { return _.cons(e, [","]); };

    deepEqual(_.mapcat(a, commaize), [1, ",", 2, ",", 3, ","], 'should return an array with all intermediate mapped arrays concatenated');
  });

  test("interpose", function() {
    var a = [1,2,3];
    var b = [1,2];
    var c = [1];

    deepEqual(_.interpose(a, 0), [1,0,2,0,3], 'should put the 2nd arg between the elements of the array given');
    deepEqual(_.interpose(b, 0), [1,0,2], 'should put the 2nd arg between the elements of the array given');
    deepEqual(_.interpose(c, 0), [1], 'should return the array given if nothing to interpose');
    deepEqual(_.interpose([], 0), [], 'should return an empty array given an empty array');

    var result = _.interpose(b,0);
    deepEqual(b, [1,2], 'should not modify the original array');
  });

  test("weave", function() {
    var a = [1,2,3];
    var b = [1,2];
    var c = ['a', 'b', 'c'];
    var d = [1, [2]];

    // zero
    deepEqual(_.weave(), [], 'should weave zero arrays');

    // one
    deepEqual(_.weave([]), [], 'should weave one array');
    deepEqual(_.weave([1,[2]]), [1,[2]], 'should weave one array');

    // two
    deepEqual(_.weave(a,b), [1,1,2,2,3], 'should weave two arrays');
    deepEqual(_.weave(a,a), [1,1,2,2,3,3], 'should weave two arrays');
    deepEqual(_.weave(c,a), ['a',1,'b',2,'c',3], 'should weave two arrays');
    deepEqual(_.weave(a,d), [1,1,2,[2],3], 'should weave two arrays');

    // > 2
    deepEqual(_.weave(a,b,c), [1,1,'a',2,2,'b',3,'c'], 'should weave more than two arrays');
    deepEqual(_.weave(a,b,c,d), [1,1,'a',1,2,2,'b',[2],3,'c'], 'should weave more than two arrays');
  });

  test("repeat", function() {
    deepEqual(_.repeat(3,1), [1,1,1], 'should build an array of size n with the specified element in each slot');
    deepEqual(_.repeat(0), [], 'should return an empty array if given zero and no repeat arg');
    deepEqual(_.repeat(0,9999), [], 'should return an empty array if given zero and some repeat arg');
  });

  test("cycle", function() {
    var a = [1,2,3];

    deepEqual(_.cycle(3, a), [1,2,3,1,2,3,1,2,3], 'should build an array with the specified array contents repeated n times');
    deepEqual(_.cycle(0, a), [], 'should return an empty array if told to repeat zero times');
    deepEqual(_.cycle(-1000, a), [], 'should return an empty array if told to repeat negative times');
  });

  test("splitAt", function() {
    var a = [1,2,3,4,5];

    deepEqual(_.splitAt(a, 2), [[1,2],[3,4,5]], 'should bifurcate an array at a given index');
    deepEqual(_.splitAt(a, 0), [[], [1,2,3,4,5]], 'should bifurcate an array at a given index');
    deepEqual(_.splitAt(a, 5), [[1,2,3,4,5],[]], 'should bifurcate an array at a given index');
    deepEqual(_.splitAt([], 5), [[],[]], 'should bifurcate an array at a given index');
  });

  test("iterateUntil", function() {
    var dec = function(n) { return n - 1; };
    var isPos = function(n) { return n > 0; };

    deepEqual(_.iterateUntil(dec, isPos, 6), [5,4,3,2,1], 'should build an array, decrementing a number while positive');
  });

  test("takeSkipping", function() {
    deepEqual(_.takeSkipping(_.range(5), 0), [], 'should take nothing if told to skip by zero');
    deepEqual(_.takeSkipping(_.range(5), -1), [], 'should take nothing if told to skip by negative');
    deepEqual(_.takeSkipping(_.range(5), 100), [0], 'should take first element if told to skip by big number');
    deepEqual(_.takeSkipping(_.range(5), 1), [0,1,2,3,4], 'should take every element in an array');
    deepEqual(_.takeSkipping(_.range(10), 2), [0,2,4,6,8], 'should take every 2nd element in an array');
  });

  test("reductions", function() {
    var result = _.reductions([1,2,3,4,5], function(agg, n) {
      return agg + n;
    }, 0);

    deepEqual(result, [1,3,6,10,15], 'should retain each intermediate step in a reduce');
  });

  test("keepIndexed", function() {
    var a = ['a', 'b', 'c', 'd', 'e'];
    var b = [-9, 0, 29, -7, 45, 3, -8];
    var oddy = function(k, v) { return _.isOdd(k) ? v : undefined; };
    var posy = function(k, v) { return _.isPositive(v) ? k : undefined; };

    deepEqual(_.keepIndexed(a, _.isOdd), [false,true,false,true,false], 'runs the predciate on the index, and not the element');

    deepEqual(_.keepIndexed(a, oddy), ['b', 'd'], 'keeps elements whose index passes a truthy test');
    deepEqual(_.keepIndexed(b, posy), [2,4,5], 'keeps elements whose index passes a truthy test');
    deepEqual(_.keepIndexed(_.range(10), oddy), [1,3,5,7,9], 'keeps elements whose index passes a truthy test');
  });

  test('reverseOrder', function() {
    var arr = [1, 2, 3];

    deepEqual(_.reverseOrder(arr), [3, 2, 1], 'returns an array whose elements are in the opposite order of the argument');
    deepEqual(arr, [1, 2, 3], 'should not mutate the argument');

    var throwingFn = function() { _.reverseOrder('string'); };
    throws(throwingFn, TypeError, 'throws a TypeError when given a string');

    var argObj = (function() { return arguments; })(1, 2, 3);
    deepEqual(_.reverseOrder(argObj), [3, 2, 1], 'works with other array-like objects');
  });
});
