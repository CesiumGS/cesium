### function.combinators

> Functions that are combinators.

--------------------------------------------------------------------------------

#### always

**Signature:** `_.always(value:Any)`

**Aliases:** `_.k`

Takes `value` and returns a function that will always return `value`.

```javascript
var platonicForm = _.always("Eternal & Unchangeable");

platonicForm();
// => "Eternal & Unchangeable"
```

--------------------------------------------------------------------------------

#### bound

**Signature:** `_.bound(obj:Object, fname:String)`

Returns function property of an object by name, bound to object.

```javascript
var aristotle = {
    name: "Aristotle",
    telos: "flourishing",
    stateTelos: function() {
        return this.name + "'s telos is " + this.telos;
    }
};

var stateAristotlesTelos = _.bound(aristotle, "stateTelos");

stateAristotlesTelos();
// => "Aristotle's Telos is flourishing"
```

--------------------------------------------------------------------------------

#### comparator

**Signature:** `_.comparator(fun:Function)`

Takes a binary predicate-like function and returns a comparator function (return
values of `-1`, `0`, `1`) which can be used as a callback for `_.sort` or
`Array.prototype.sort`.

```javascript
var lessOrEqual = function(x, y) { return x <= y; };

var arr = [0, 1, -2];

arr.sort(_.comparator(lessOrEqual));
// => [-2, 0, 1]
```

--------------------------------------------------------------------------------

#### complement

**Signature:** `_.complement(pred:Function)`

Returns a function that reverses the sense of a given predicate-like.

```javascript
function isAugustine (val) {
    return val === "Augustine";
}

isNotAugustine = _.complement(isAugustine);

isNotAugustine("Dionysius");
// => True
```

--------------------------------------------------------------------------------

#### conjoin

**Signature:** `_.conjoin(pred:Function...)`

Composes multiple predicates into a single predicate that checks all elements
of an array for conformance to **all** of the original predicates.

```javascript
function startsWithA (val) {
    return val[0] === "A";
}

function endsWithE (val) {
    return val[val.length - 1] === "e";
}

var names = ["Aristotle", "Aquinas", "Plato", "Augustine"];

var startsAAndEndsE = _.conjoin(startsWithA, endsWithE);

startsAAndEndsE(names);
// => ["Aristotle", "Augustine"]
```

--------------------------------------------------------------------------------

#### disjoin

**Signature:** `_.disjoin(pred:Function...)`

Composes multiple predicates into a single predicate that checks all elements
of an array for conformance to **any** of the original predicates.

```javascript
function startsWithA (val) {
    return val[0] === "A";
}

function endsWithE (val) {
    return val[val.length - 1] === "e";
}

var names = ["Aristotle", "Aquinas", "Plato", "Augustine"];

var startsAOrEndsE = _.disjoin(startsWithA, endsWithE);

startsAOrEndsE(names);
// => ["Aristotle", "Aquinas", "Augustine"]
```

--------------------------------------------------------------------------------

#### juxt

**Signature:** `_.juxt(fun:Function...)`

Returns a function whose return value is an array of the results of calling
each of the original functions with the arguments.

```javascript
function firstChar (val) {
    return val[0];
}

function lastChar (val) {
    return val[val.length - 1];
}

var firstAndLastChars = _.juxt(firstChar, lastChar);

firstAndLastChars("Etruria");
// => ["E", "a"]
```

--------------------------------------------------------------------------------

#### flip

**Signature:** `_.flip(fun:Function)`

Returns a function that works identically to `fun`, but accepts the arguments
in reverse order.

```javascript
function regionCapitol (region, capitol) {
    return "The capitol of " + region + " is " + capitol;
}

capitolRegion = _.flip(regionCapitol);

capitolRegion("Thessalonica", "Illyrica");
// => "The capitol of Illyrica is Thessalonica"
```

--------------------------------------------------------------------------------


#### flip2

**Signature:** `_.flip2(fun:Function)`

Returns a function that works identically to `fun`, but accepts the first two
arguments in reverse order. The order of all other arguments remains the same.

```javascript
function regionCapitol (region, capitol) {
    return "The capitol of " + region + " is " + capitol;
}

capitolRegion = _.flip2(regionCapitol);

capitolRegion("Thessalonica", "Illyrica");
// => "The capitol of Illyrica is Thessalonica"
```

--------------------------------------------------------------------------------

#### fnull

**Signature:** `_.fnull(fun:Function[, default:Any...])`

Returns a function that protects `fun` from receiving non-existy values.  Each
subsequent value provided to `fnull` acts as the default to the original
`fun` should a call receive non-existy values in the defaulted arg slots.

```javascript
function getLength (val) {
    return val.length;
}

safeGetLength = _.fnull(getLength, []);

safeGetLength([1, 2, 3]);
// => 3

safeGetLength(null);
// => 0
```

--------------------------------------------------------------------------------

#### functionalize

**Signature:** `_.functionalize(fun:Function[, default:Any...])`

Takes a method-style function (one which uses `this`) and pushes `this` into the
argument list. The returned function uses its first argument as the
receiver/context of the original function, and the rest of the arguments are
used as the original's entire argument list.

```javascript
var militaryUnits = {
    centuria: "80 men",
    cohort: "480 men",
    getDescription: function (unitName) {
        return this[unitName];
    }
};

var getDescription = _.functionalize(militaryUnits.getDescription);

var rulers = {
    Leonidas: "King of Sparta",
    Augustus: "First Roman Emperor"
};

getDescription(rulers, "Augustus");
// => "First Roman Emperor"
```

--------------------------------------------------------------------------------

#### mapArgs

**Signature:** `_.mapArgs(fun:Function)`

Takes a target function and returns a new function which accepts a mapping
function, which in turn returns a function that will map its arguments before
calling the original target function.

```javascript
function doubleNum (x) { return 2 * x; }

function squareNum (x) { return x * x; }

var squareThenDouble = _.mapArgs(doubleNum)(squareNum);

squareThenDouble(3);
// => 18
```

--------------------------------------------------------------------------------

#### mapArgsWith

**Signature:** `_.mapArgs(mapFun:Function)`

Takes a mapping function and returns a new combinator function which will take
a target function and return a new version which maps its arguments with the
mapping function before executing the body of the target function.

```javascript
function doubleNum (x) { return 2 * x; }

function squareNum (x) { return x * x; }

var squareArgs = _.mapArgsWith(squareNum);

var squareThenDouble = squareArgs(doubleNum);

squareThenDouble(3);
// => 18
```

--------------------------------------------------------------------------------

#### methodize

**Signature:** `_.methodize(func:Function)`

Takes a function and pulls the first argument out of the argument list and into
`this` position. The returned function calls the original with its receiver
(`this`) prepending the argument list. The original is called with a receiver
of `null`.

```javascript
function describe (obj) {
    return obj.name + ": " + obj.description;
}

var democritus = {
    name: "Democritus",
    description: "originator of the atomic hypothesis",
    describe: _.methodize(describe)
};

democritus.describe();
// => "Democritus: originator of the atomic hypothesis"
```

--------------------------------------------------------------------------------


#### pipeline

**Signature:** `_.pipeline(func:Function[, func2:Function...])` or `_.pipeline(funcArr:Array)`

**Aliases:** `_.t`

Takes a list of functions, either as an array or as individual arguments
and returns a function that takes some value as its first argument and runs it
through a pipeline of the original functions given.

```javascript
function halveNum (x) { return x / 2; };
function squareNum (x) { return x * x; };
function doubleNum (x) { return 2 * x; };

var halveSquareDouble = _.pipeline(halveNum, squareNum, doubleNum);

halveSquareDouble(1);
// => 0.5

var doubleSquareHalve = _.pipeline([doubleNum, squareNum, halveNum]);

doubleSquareHalve(1);
// => 2
```

--------------------------------------------------------------------------------

#### splat

**Signature:** `_.splat(fun:Function)`

Takes a function expecting one or more arguments and returns a function
that takes an array and uses its elements as the arguments to the original
function. This roughly corresponds to the [spread operator][spread] in
ECMAScript 6.

```javascript
function listTwoNames (a, b) {
    return a.name + " & " + b.name;
}

var listTwoNamesFromArray = _.splat(listTwoNames);

listTwoNamesFromArray([{ name: "Zeno" }, { name: "Parmenides"}]);
// => "Zeno & Parmenides"
```

--------------------------------------------------------------------------------

#### unsplat

**Signature:** `_.unsplat(fun:Function)`

**Aliases:** `_.unsplatr`

Takes a function expecting an array as its *last* argument and returns a function
which works identically, but takes a list of trailing arguments instead. Roughly
corresponds to [rest parameters][rest] in ECMAScript 6.

```javascript
function joinWith (joiner, arr) {
    return arr.join(joiner);
}

var joinArgsWith = _.unsplat(joinWith);

joinArgsWith(" & ", "Plutarch", "Proclus");
// => "Plutarch & Proclus"
```

--------------------------------------------------------------------------------

#### unsplatl

**Signature:** `_.unsplatl(fun:Function)`

Similar to [unsplat](#unsplat), but takes a function expecting an array as its
*first* argument and returns a function which works identically, but takes a
list of leading arguments instead. Roughly corresponds to
[rest parameters][rest] in ECMAScript 6.

```javascript
function joinWith (arr, joiner) {
    return arr.join(joiner);
}

var joinArgsWith = _.unsplat(joinWith);

joinArgsWith("Olympiodorus", "Syrianus", " & ");
// => "Olympiodorus & Syrianus"
```

--------------------------------------------------------------------------------

[spread]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator
[rest]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/rest_parameters