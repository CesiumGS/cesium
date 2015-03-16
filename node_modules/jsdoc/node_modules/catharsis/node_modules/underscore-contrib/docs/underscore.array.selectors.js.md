### array.selectors

> Functions to take things from arrays. <a href="docs/underscore.array.selectors.js.html" class="btn btn-primary btn-xs">View Annotated Source</a>

--------------------------------------------------------------------------------

#### best

**Signature:** `_.best(array:Array, fun:Function)`

Returns the "best" value in an array based on the result of a given function.

```javascript
_.best([1, 2, 3, 4, 5], function(x, y) {
  return x > y;
});
//=> 5
```

--------------------------------------------------------------------------------

#### dropWhile

**Signature:** `_.dropWhile(array:Array, pred:Function)`

Drops elements for which the given function returns a truthy value.

```javascript
_.dropWhile([-2,-1,0,1,2], isNeg);
//=> [0,1,2]
```

--------------------------------------------------------------------------------

#### keep

**Signature:** `_.keep(array:Array, fun:Function)`

Returns an array of existy results of a function over a source array.

```javascript
_.keep([1, 2, 3, 4, 5], function(val) {
  if (val % 3 === 0) {
    return val;
  }
});
// => [3]
```

--------------------------------------------------------------------------------

#### nth

**Signature:** `_.nth(array:Array, index:Number[, guard:Any])`

The `_.nth` function is a convenience for the equivalent `array[n]`. The
optional `guard` value allows `_.nth` to work correctly as a callback for
`_.map`.

```javascript
_.nth(['a','b','c'], 2);
//=> 'c'
```

If given an index out of bounds then `_.nth` will return `undefined`:

```javascript
_.nth(['a','b','c'], 2000);
//=> undefined
```

The `_.nth` function can also be used in conjunction with `_.map` and `_.compact` like so:

```javascript
var b = [['a'],['b'],[]];

_.compact(_.map(b, function(e) { return _.nth(e,0) }));
//=> ['a','b']
```

If wrapping a function around `_.nth` is too tedious or you'd like to partially apply the index then Underscore-contrib offers any of `_.flip2`, `_.fix` or `rcurry2` to solve this.

--------------------------------------------------------------------------------

#### partitionBy

**Signature:** `_.keep(array:Array, fun:Function)`

Takes an array and partitions it into sub-arrays as the given predicate changes
truth sense.

```javascript
_.partitionBy([1,2,2,3,1,1,5], _.isEven);
// => [[1],[2,2],[3,1,1,5]]

_.partitionBy([1,2,2,3,1,1,5], _.identity);
// => [[1],[2,2],[3],[1,1],[5]]
```

--------------------------------------------------------------------------------

#### second

**Signature:** `_.second(array:Array, index:Number[, guard:Any])`

The `_.second` function is a convenience for the equivalent `array[1]`. The
optional `guard` value allows `_.second` to work correctly as a callback for
`_.map`.

```javascript
_.second(['a','b']);
//=> 'b'

_.map([['a','b'], _.range(10,20)], _.second);
//=> ['b',11]
```

You can also pass an optional number to the `_.second` function to take a number of elements from an array starting with the second element and ending at the given index:

```javascript
_.second(_.range(10), 5)
//=> [1, 2, 3, 4]
```

--------------------------------------------------------------------------------

#### takeWhile

**Signature:** `_.takeWhile(array:Array, pred:Function)`

The `_.takeWhile` function takes an array and a function and returns a new array containing the first n elements in the original array for which the given function returns a truthy value:

```javascript
var isNeg = function(n) { return n < 0; };

_.takeWhile([-2,-1,0,1,2], isNeg);
//=> [-2,-1]
```

--------------------------------------------------------------------------------

#### third

**Signature:** `_.third(array:Array, index:Number[, guard:Any])`

The `_.third` function is a convenience for the equivalent `array[2]`. The
optional `guard` value allows `_.third` to work correctly as a callback for
`_.map`.

```javascript
_.third(['a','b','c']);
//=> 'c'

_.map([['a','b','c'], _.range(10,20)], _.third);
//=> ['c',12]
```

You can also pass an optional number to the `_.third` function to take a number of elements from an array starting with the third element and ending at the given index:

```javascript
_.third(_.range(10), 5)
//=> [2, 3, 4]
```

--------------------------------------------------------------------------------