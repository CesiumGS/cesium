$(document).ready(function() {

  module("underscore.array.selectors");

  test("second", function() {
    var a = [1,2,3,4,5];

    equal(_.second(a), 2, 'should retrieve the 2nd element in an array');
    deepEqual(_.second(a, 5), [2,3,4,5], 'should retrieve all but the first element in an array');
    deepEqual(_.map([a,_.rest(a)], _.second), [2,3], 'should be usable in _.map');
  });

  test("third", function() {
    var a = [1,2,3,4,5];

    equal(_.third(a), 3, 'should retrieve the 3rd element in an array');
    deepEqual(_.third(a, 5), [3,4,5], 'should retrieve all but the first and second element in an array');
    deepEqual(_.map([a,_.rest(a)], _.third), [3,4], 'should be usable in _.map');
  });

  test("takeWhile", function() {
    var isNeg = function(n) { return n < 0; };

    deepEqual(_.takeWhile([-2,-1,0,1,2], isNeg), [-2,-1], 'should take elements until a function goes truthy');
    deepEqual(_.takeWhile([1,-2,-1,0,1,2], isNeg), [], 'should take elements until a function goes truthy');
  });

  test("dropWhile", function() {
    var isNeg = function(n) { return n < 0; };

    deepEqual(_.dropWhile([-2,-1,0,1,2], isNeg), [0,1,2], 'should drop elements until a function goes truthy');
    deepEqual(_.dropWhile([0,1,2], isNeg), [0,1,2], 'should drop elements until a function goes truthy');
    deepEqual(_.dropWhile([-2,-1], isNeg), [], 'should drop elements until a function goes truthy');
    deepEqual(_.dropWhile([1,-2,-1,0,1,2], isNeg), [1,-2,-1,0,1,2], 'should take elements until a function goes truthy');
    deepEqual(_.dropWhile([], isNeg), [], 'should handle empty arrays');
  });

  test("splitWith", function() {
    var a = [1,2,3,4,5];
    var lessEq3p = function(n) { return n <= 3; };
    var lessEq3p$ = function(n) { return (n <= 3) ? true : null; };

    deepEqual(_.splitWith(a, lessEq3p), [[1,2,3], [4,5]], 'should split an array when a function goes false');
    deepEqual(_.splitWith(a, lessEq3p$), [[1,2,3], [4,5]], 'should split an array when a function goes false');
    deepEqual(_.splitWith([], lessEq3p$), [[],[]], 'should split an empty array into two empty arrays');
  });

  test("partitionBy", function() {
    var a = [1, 2, null, false, undefined, 3, 4];

    deepEqual(_.partitionBy(a, _.truthy), [[1,2], [null, false, undefined], [3,4]], 'should partition an array as a given predicate changes truth sense');
  });

  test("best", function() {
    var a = [1,2,3,4,5];

    deepEqual(_.best(a, function(x,y) { return x > y; }), 5, 'should identify the best value based on criteria');
  });

  test("keep", function() {
    var a = _.range(10);
    var eveny = function(e) { return (_.isEven(e)) ? e : undefined; };

    deepEqual(_.keep(a, eveny), [0,2,4,6,8], 'should keep only even numbers in a range tagged with null fails');
    deepEqual(_.keep(a, _.isEven), [true, false, true, false, true, false, true, false, true, false], 'should keep all existy values corresponding to a predicate over a range');
  });

  test("nth", function() {
    var a = ['a','b','c'];
    var b = [['a'],['b'],[]];

    equal(_.nth(a,0), 'a', 'should return the element at a given index into an array');
    equal(_.nth(a,100), undefined, 'should return undefined if out of bounds');
    deepEqual(_.map(b,function(e) { return _.nth(e,0); }), ['a','b',undefined], 'should be usable in _.map');
  });
});

