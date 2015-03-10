### function.iterators

> Functions to iterate over collections.

--------------------------------------------------------------------------------

#### iterators.accumulate

**Signature:** `_.iterators.accumulate(iter:Function, binaryFn:Function, initial:Any)`

Returns a function that when called will iterate one step with `iter` and return
the value currently accumulated by using `binaryFn`. The function will return `undefined` once all values have been iterated over.

```javascript
var generalsIterator = _.iterators.List(["Hannibal", "Scipio"]);

function countLetters(memo, element) {
     return memo + element.length;
}

var generalsAcc = _.iterators.accumulate(generalsIterator, countLetters, 0);

generalsAcc();
// => 8

generalsAcc();
// => 14

generalsAcc();
// => undefined
```

--------------------------------------------------------------------------------

#### iterators.accumulateWithReturn

**Signature:** `_.iterators.accumulateWithReturn(iter:Function, binaryFn:Function, initial:Any)`

Acts similarly to accumulate, except that `binaryFn` is expected to return an
array of two elements. The value of the first element is given to the next run
of `binaryFn`. The value of the second element is yielded by the iterator.


```javascript
var fiveIter = _.iterators.List([1, 2, 3, 4, 5]);

function adderWithMessage (state, element) {
    return [state + element, 'Total is ' + (state + element)];
}

var i = _.iterators.accumulateWithReturn(fiveIter, adderWithMessage, 0);

i();
// => "Total is 1"

i();
// => "Total is 3"

i();
// => "Total is 6"
```

--------------------------------------------------------------------------------

#### iterators.drop

**Signature:** `_.iterators.drop(iter:Function[, numberToDrop:Number])`

Given an iterator function `iter`, will return a new iterator which iterates
over the same values as `iter`, except that the first `numberToDrop` values
will be omitted. If `numberToDrop` is not provided, it will default to `1`.

```javascript
var deityIter = _.iterators.List(["Zeus", "Apollo", "Athena", "Aphrodite"]);

var goddessIter = _.iterators.drop(deityIter, 2);

goddessIter();
// => "Athena"

goddessIter();
// => "Aphrodite"
```

--------------------------------------------------------------------------------

#### iterators.foldl

**Signature:** `_.iterators.foldl(iter:Function, binaryFn:Function[, seed:Any])`

**Aliases:** `iterators.reduce`

Boils down the values given by `iter` into a single value. The `seed` is the
initial state. The `binaryFn` is given two arguments: the `seed` and the
current value yielded by `iter`.

```javascript
var sybylIter = _.iterators.List(["cumaean", "tiburtine"]);

function commaString (a, b) { return a + ", " + b; }

_.iterators.foldl(sybylIter, commaString);
// => "cumaean, tiburtine"
```

--------------------------------------------------------------------------------

#### iterators.K

**Signature:** `_.iterators.K(value:Any)`

**Aliases:** `iterators.constant`

Returns a function that when invoked will always return `value`.

```javascript
var ceasar = _.iterators.K("Ceasar");

ceasar();
// => "ceasar"
```

--------------------------------------------------------------------------------

#### iterators.List

**Signature:** `_.iterators.List(array:Array)`

Returns an iterater that when invoked will iterate over the contents of `array`.

```javascript
var triumvirIter = _.iterators.List(["Ceasar", "Pompey", "Crassus"];

triumvirIter();
// => "Ceasar"

triumvirIter();
// => "Pompey"

triumvirIter();
// => "Crassus"
```

--------------------------------------------------------------------------------

#### iterators.map

**Signature:** `_.iterators.map(iter:Function, unaryFn:Function)`

Returns a new iterator function which on each iteration will return the result
of running `iter`'s current value through `unaryFn`.

```javascript
var notablesIter = _.iterators.List(["Socrates", "Plato"]);

function postfixAthenian (val) {
    return val + ", Athenian";
}

var notableAtheniansIter = _.iterators.map(notablesIter, postfixAthenian);

notableAtheniansIter();
// => "Socrates, Athenian"

notableAtheniansIter();
// => "Plato, Athenian"
```

--------------------------------------------------------------------------------

#### iterators.mapcat

**Signature:** `_.iterators.mapcat(iter:Function, unaryFn:Function)`

Returns an iterator which is the result of flattening the contents of `iter`,
and mapping the results with `unaryFn`.

```javascript
function naturalSmallerThan (x)  {
    return _.iterators.List(_.range(0, x));
}

var treeIter = _.iterators.Tree([1, [2]]);

var smallerThanIter = _.iterators.mapcat(treeIter, naturalSmallerThan);

smallerThanIter();
// => 0

smallerThanIter();
// => 0

smallerThanIter();
// => 1
```

--------------------------------------------------------------------------------

#### iterators.numbers

**Signature:** `_.iterators.numbers([start:Number])`

Returns an iterator of integers which will begin with `start` and increment by
one for each invocation. If `start` is not provided it will default to `1`.

```javascript
var twoAndUp = _.iterators.numbers(2);

twoAndUp();
// => 2

twoAndUp();
// => 3

twoAndUp();
// => 4
```

--------------------------------------------------------------------------------

#### iterators.range

**Signature:** `_.iterators.range([from:Number, to:Number, by:Number]);

Returns an iterator whose values consist of numbers beginning with `from`, ending with `to`, in steps of size `by`.

```javascript
var by5 = _.iterators.range(5, Infinity, 5);

by5();
// => 5

by5();
// => 10

by5();
// => 15
```

--------------------------------------------------------------------------------

#### iterators.reject

**Signature:** `_.iterators.reject(iter:Function, unaryPredicatFn:Function)`

Returns an iterator consisting of the values of `iter` which are not flagged
`true` by `unaryPredicateFn`.

```javascript
var philosophers = ["Anaximander", "Socrates", "Heraclitus"];

var philosophersIter = _.iterators.List(philosophers);

function isSocrates (val) {
    return val === "Socrates";
}

var preSocraticsIter = _.iterators.reject(philosophersIter, isSocrates);

preSocraticsIter()
// => "Anaximander"

preSocraticsIter()
// => "Heraclitus"
```

--------------------------------------------------------------------------------

#### iterators.select

**Signature:** `_.iterators.select(iter:Function, unaryPredicatFn:Function)`

**Aliases:** `iterators.find`, `iteraters.filter`

Returns an iterator consisting of the values of `iter` which are flagged
`true` by `unaryPredicateFn`.

```javascript
var philosophers = ["Anaximander", "Socrates", "Heraclitus"];

var philosophersIter = _.iterators.List(philosophers);

function isSocrates (val) {
    return val === "Socrates";
}

var socraticIter = _.iterators.select(philosophersIter, isSocrates);

socraticIter()
// => "Socrates"
```

--------------------------------------------------------------------------------

#### iterators.slice

**Signature:** `_.iterators.slice(iter:Function, numberToDrop:Number, numberToTake:Number)`

Returns an iterator whose values consist of `iter`'s after removing
`numberToDrop` from the head, and a maxiumum of `numberToTake` of the remaining.
If `numberToTake` is not specified, all of `iter`'s remaining values will be
used.

```javascript
var emperors = ["Augustus", "Tiberius", "Caligula", "Claudius"];

var emperorsIter = _.iterators.List(emperors);

var middleEmperorsIter = _.iterators.slice(emperorsIter, 1, 2);

middleEmperorsIter();
// => "Tiberius"

middleEmperorsIter();
// => "Caligula"

middleEmperorsIter();
// => undefined
```

--------------------------------------------------------------------------------

#### iterators.take

**Signature:** `_.iterators.take(iter:Function[, numberToTake:Number])`

Returns an iterator consisting of the first `numberToTake` values yielded by
`iter`. If `numberToTake` is not provided, it will default to `1`.

```javascript
var byzantineEmperors = ["Constantine", "Constantius", "Constans"];

var byzantineEmperorsIter = _.iterators.List(byzantineEmperors);

var firstTwoEmperorsIter = _.iterators.take(byzantineEmperorsIter, 2);

firstTwoEmperorsIter();
// => "Constantine"

firstTwoEmperorsIter();
// => "Constantius"

firstTwoEmperorsIter();
// => undefined
```

--------------------------------------------------------------------------------

#### iterators.Tree

**Signature:** `_.iterators.Tree(array:Array);`

Returns an iterator that yields the individual values of a tree `array`.

```javascript
var rulers = ["Augustus", ["Constantine"], ["Leo", ["Charlemagne"]]];

var rulersIter = _.iterators.Tree(rulers);

rulersIter();
// => "Augustus"

rulersIter();
// => "Constantine"

rulersIter();
// => "Leo"

rulersIter();
// => "Charlemagne"
```

--------------------------------------------------------------------------------

#### iterators.unfold

**Signature:** `_.iterators.unfold(seed:Any, unaryFn:Function)`

```javascript
function greatify (val) {
    return val + " the Great";
}

var greatIter = _.iterators.unfold("Constantine", greatify);

greatIter();
// => "Constantine the Great"

greatIter();
// => "Constantine the Great the Great"

greatIter();
// => "Constantine the Great the Great the Great"
```

--------------------------------------------------------------------------------

#### iterators.unfoldWithReturn

**Signature:** `_.iterators.unfold(seed:Any, unaryFn:Function)`

Acts similarly to unfold, except that `unaryFn` is expected to return an array
with two elements. The value of the first element is given to the next run of
`unaryFn`. The value of the second element is yielded by the iterator.

```javascript
var i = _.iterators.unfoldWithReturn(1, function(n) {
    return [n + 1, n * n];
});

i();
// => 1

i();
// => 4

i();
// => 9
```
