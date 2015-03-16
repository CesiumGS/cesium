$(document).ready(function() {

  module("underscore.function.predicates");

  test("isInstanceOf", function() {
    equal(_.isInstanceOf([], Array),   true,  'should identify arrays');
    equal(_.isInstanceOf(null, Array), false, 'should identify that null is not an array instance');
  });

  test("isAssociative", function() {
    equal(_.isAssociative({}), true, 'should identify that a map is associative');
    equal(_.isAssociative(function(){}), true, 'should identify that a function is associative');
    equal(_.isAssociative([]), true, 'should identify that an array is associative');
    equal(_.isAssociative(new Array(10)), true, 'should identify that an array is associative');

    equal(_.isAssociative(1), false, 'should identify non-associative things');
    equal(_.isAssociative(0), false, 'should identify non-associative things');
    equal(_.isAssociative(-1), false, 'should identify non-associative things');
    equal(_.isAssociative(3.14), false, 'should identify non-associative things');
    equal(_.isAssociative('undefined'), false, 'should identify non-associative things');
    equal(_.isAssociative(''), false, 'should identify non-associative things');
    equal(_.isAssociative(NaN), false, 'should identify non-associative things');
    equal(_.isAssociative(Infinity), false, 'should identify non-associative things');
    equal(_.isAssociative(true), false, 'should identify non-associative things');
  });

  test("isIndexed", function() {
    equal(_.isIndexed([]), true, 'should identify indexed objects');
    equal(_.isIndexed([1,2,3]), true, 'should identify indexed objects');
    equal(_.isIndexed(new Array(10)), true, 'should identify indexed objects');
    equal(_.isIndexed(""), true, 'should identify indexed objects');
    equal(_.isIndexed("abc"), true, 'should identify indexed objects');

    equal(_.isIndexed(1), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(0), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(-1), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(3.14), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(undefined), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(NaN), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(Infinity), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(true), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(false), false, 'should identify when something is not an indexed object');
    equal(_.isIndexed(function(){}), false, 'should identify when something is not an indexed object');
  });

  test("isSequential", function() {
    equal(_.isSequential(new Array(10)), true, 'should identify sequential objects');
    equal(_.isSequential([1,2]), true, 'should identify sequential objects');
    equal(_.isSequential(arguments), true, 'should identify sequential objects');

    equal(_.isSequential({}), false, 'should identify when something is not sequential');
    equal(_.isSequential(function(){}), false, 'should identify when something is not sequential');
    equal(_.isSequential(1), false, 'should identify when something is not sequential');
    equal(_.isSequential(0), false, 'should identify when something is not sequential');
    equal(_.isSequential(-1), false, 'should identify when something is not sequential');
    equal(_.isSequential(3.14), false, 'should identify when something is not sequential');
    equal(_.isSequential('undefined'), false, 'should identify when something is not sequential');
    equal(_.isSequential(''), false, 'should identify when something is not sequential');
    equal(_.isSequential(NaN), false, 'should identify when something is not sequential');
    equal(_.isSequential(Infinity), false, 'should identify when something is not sequential');
    equal(_.isSequential(true), false, 'should identify when something is not sequential');
  });

  test("isPlainObject", function() {
    function SomeConstructor() {}
    equal(_.isPlainObject({}), true, 'should identify empty objects');
    equal(_.isPlainObject({a: 1, b: 2}), true, 'should identify objects');
    equal(_.isPlainObject(Object.create(null)), false, 'should reject objects with no prototype');
    equal(_.isPlainObject(new SomeConstructor), false, 'should reject instances constructed by something other than Object');

    equal(_.isPlainObject([]), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(function(){}), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(null), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(1), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(0), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(-1), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(3.14), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject('undefined'), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(''), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(NaN), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(Infinity), false, 'should identify when something is not a plain object');
    equal(_.isPlainObject(true), false, 'should identify when something is not a plain object');
  });


  test("isEven", function() {
    equal(_.isEven(0), true, 'should identify even numbers');
    equal(_.isEven(2), true, 'should identify even numbers');
    equal(_.isEven(-2), true, 'should identify even numbers');
    equal(_.isEven(1), false, 'should identify non-even numbers');
    equal(_.isEven(null), false, 'should return false for non-numbers');
    equal(_.isEven(undefined), false, 'should return false for non-numbers');
    equal(_.isEven([]), false, 'should return false for non-numbers');
    equal(_.isEven(NaN), false, 'should return false for non-numbers');
  });

  test("isOdd", function() {
    equal(_.isOdd(1), true, 'should identify odd numbers');
    equal(_.isOdd(33), true, 'should identify odd numbers');
    equal(_.isOdd(-55), true, 'should identify odd numbers');
    equal(_.isOdd(10), false, 'should identify non-odd numbers');
    equal(_.isOdd(null), false, 'should return false for non-numbers');
    equal(_.isOdd(undefined), false, 'should return false for non-numbers');
    equal(_.isOdd([]), false, 'should return false for non-numbers');
    equal(_.isOdd(NaN), false, 'should return false for non-numbers');
  });

  test("isPositive", function() {
    equal(_.isPositive(1), true, 'should identify positive numbers');
    equal(_.isPositive(-1), false, 'should identify non-positive numbers');
    equal(_.isPositive(0), false, 'should identify non-positive numbers');
    equal(_.isPositive(+0), false, 'should identify non-positive numbers');
  });

  test("isNegative", function() {
    equal(_.isNegative(-1), true, 'should identify negative numbers');
    equal(_.isNegative(0), false, 'should identify non-negative numbers');
    equal(_.isNegative(110), false, 'should identify non-negative numbers');
    equal(_.isNegative(-0), false, 'should identify non-negative numbers');
  });

  test("isZero", function() {
    equal(_.isZero(0), true, 'should know zero');
    equal(_.isZero(-0), true, 'should know zero');
    equal(_.isZero(+0), true, 'should know zero');
    equal(_.isZero(1), false, 'should know non-zero');
    equal(_.isZero(-1), false, 'should know non-zero');
  });

  test("isNumeric", function() {
    // Integer Literals
    equal(_.isNumeric("-10"), true, "should identify Negative integer string");
    equal(_.isNumeric("0"), true, "should identify Zero string");
    equal(_.isNumeric("5"), true, "should identify Positive integer string");
    equal(_.isNumeric(-16), true, "should identify Negative integer number");
    equal(_.isNumeric(0), true, "should identify Zero integer number");
    equal(_.isNumeric(32), true, "should identify Positive integer number");
    equal(_.isNumeric("040"), true, "should identify Octal integer literal string");
    equal(_.isNumeric(0144), true, "should identify Octal integer literal");
    equal(_.isNumeric("0xFF"), true, "should identify Hexadecimal integer literal string");
    equal(_.isNumeric(0xFFF), true, "should identify Hexadecimal integer literal");

    // Foating-Point Literals
    equal(_.isNumeric("-1.6"), true, "should identify Negative floating point string");
    equal(_.isNumeric("4.536"), true, "should identify Positive floating point string");
    equal(_.isNumeric(-2.6), true, "should identify Negative floating point number");
    equal(_.isNumeric(3.1415), true, "should identify Positive floating point number");
    equal(_.isNumeric(8e5), true, "should identify Exponential notation");
    equal(_.isNumeric("123e-2"), true, "should identify Exponential notation string");

    // Non-Numeric values
    equal(_.isNumeric(""), false, "should identify Empty string");
    equal(_.isNumeric("        "), false, "should identify Whitespace characters string");
    equal(_.isNumeric("\t\t"), false, "should identify Tab characters string");
    equal(_.isNumeric("abcdefghijklm1234567890"), false, "should identify Alphanumeric character string");
    equal(_.isNumeric("xabcdefx"), false, "should identify Non-numeric character string");
    equal(_.isNumeric(true), false, "should identify Boolean true literal");
    equal(_.isNumeric(false), false, "should identify Boolean false literal");
    equal(_.isNumeric("bcfed5.2"), false, "should identify Number with preceding non-numeric characters");
    equal(_.isNumeric("7.2acdgs"), false, "should identify Number with trailling non-numeric characters");
    equal(_.isNumeric(undefined), false, "should identify Undefined value");
    equal(_.isNumeric(null), false, "should identify Null value");
    equal(_.isNumeric(NaN), false, "should identify NaN value");
    equal(_.isNumeric(Infinity), false, "should identify Infinity primitive");
    equal(_.isNumeric(Number.POSITIVE_INFINITY), false, "should identify Positive Infinity");
    equal(_.isNumeric(Number.NEGATIVE_INFINITY), false, "should identify Negative Infinity");
    equal(_.isNumeric(new Date(2009,1,1)), false, "should identify Date object");
    equal(_.isNumeric({}), false, "should identify Empty object");
    equal(_.isNumeric(function(){}), false, "should identify Instance of a function");
  });

  test("isInteger and isFloat", function() {
    var integerChecks = [
      {value: "-10", message: "should identify Negative integer string"},
      {value: "0", message: "should identify Zero string"},
      {value: "5", message: "should identify Positive integer string"},
      {value: -16, message: "should identify Negative integer number"},
      {value: 0, message: "should identify Zero integer number"},
      {value: 32, message: "should identify Positive integer number"},
      {value: "040", message: "should identify Octal integer literal string"},
      {value: 0144, message: "should identify Octal integer literal"},
      {value: "0xFF", message: "should identify Hexadecimal integer literal string"},
      {value: 0xFFF, message: "should identify Hexadecimal integer literal"},
      {value: 1.0, message: "should identify float versions of integers"},
      {value: 8e5, message: "Exponential notation"}
    ];

    var floatChecks = [
      {value: "-1.6", message: "should identify Negative floating point string"},
      {value: "4.536", message: "should identify Positive floating point string"},
      {value: -2.6, message: "should identify Negative floating point number"},
      {value: 3.1415, message: "should identify Positive floating point number"},
      {value: 8.11e1, message: "should identify Exponential notation "},
      {value: "123e-2", message: "should identify Exponential notation string"}
    ];

    var negativeChecks = [
      {value: "abc", message: "should identify non-numeric strings"},
      {value: undefined, message: "should identify undefined"},
      {value: NaN, message: "should identify NaN"},
      {value: null, message: "should identify null"},
      {value: Infinity, message: "should identify Infinity"}
    ];

    var testMultiple = function(cases, fn, result){
      for (var i = 0; i < cases.length; i++) {
        equal(fn(cases[i].value), result, cases[i].message);
      }
    };

    testMultiple(integerChecks, _.isInteger, true);
    testMultiple(floatChecks, _.isInteger, false);
    testMultiple(negativeChecks, _.isInteger, false);

    testMultiple(integerChecks, _.isFloat, false);
    testMultiple(floatChecks, _.isFloat, true);
    testMultiple(negativeChecks, _.isFloat, false);
  });

  test("isIncreasing", function() {
    var inc = [1,2,3];
    var incNM = [1,2,3,3,4];
    var dec = [5,4,3,2,1];

    equal(_.isIncreasing.apply(null, inc), true, 'should identify when its arguments monotonically increase');
    equal(_.isIncreasing.apply(null, incNM), false, 'should identify when its arguments monotonically increase');
    equal(_.isIncreasing.apply(null, dec), false, 'should identify when its arguments do not increase');
  });

  test("isDecreasing", function() {
    var inc = [1,2,3];
    var incNM = [1,2,3,3,4];
    var dec = [5,4,3,2,1];
    var decNM = [5,4,3,3,2,1];

    equal(_.isDecreasing.apply(null, inc), false, 'should identify when its arguments monotonically decrease');
    equal(_.isDecreasing.apply(null, incNM), false, 'should identify when its arguments monotonically decrease');
    equal(_.isDecreasing.apply(null, dec), true, 'should identify when its arguments do not decrease');
    equal(_.isDecreasing.apply(null, decNM), false, 'should identify when its arguments monotonically decrease');
  });

  test("isValidDate", function() {
    equal(_.isValidDate(new Date), true, 'should recognize a fresh Date instance as valid');
    equal(!_.isValidDate(new Date("bad date")), true, 'should recognize a Date constructed with gibberish');
  });

});
