### array.builders 

> Functions to build arrays. <a href="docs/underscore.array.builders.js.html" class="btn btn-primary btn-xs">View Annotated Source</a>

--------------------------------------------------------------------------------

#### cat

Signature: `_.cat(... arrays:Array ...)`

The `_.cat` function provides a way to concatenate zero or more heterogeneous arrays into one.

```javascript
_.cat();                    // 0-args
//=> []

_.cat([]);                  // 1-arg, empty array
//=> []

_.cat([1,2,3]);             // 1-arg
//=> [1,2,3]

_.cat([1,2,3],[4,5,6]);     // 2-args
//=> [1,2,3,4,5,6]

_.cat([1,2,3],[4,5,6],[7]); // 3+ args
//=> [1,2,3,4,5,6,7]
```

Not every argument to `_.cat` needs to be an array; other types are accepted.

Signature: `_.cat(... elems:Any ...)`

```javascript
_.cat(1,[2],3,4);           // mixed args
//=> [1,2,3,4]
```

The `_.cat` function will also work with the `arguments` object as if it were an array.

Signature: `_.cat(... elems:Arguments ...)`

```javascript
function f(){ return _.cat(arguments, 4,5,6); }

f(1,2,3);
//=> [1,2,3,4,5,6]
```

--------------------------------------------------------------------------------

#### chunk

The `_.chunk` function, by default, accepts an array and a number and splits and returns a new array representing the original array split into some number of arrays of the given size:

```javascript
_.chunk([0,1,2,3], 2);
//=> , [[0,1],[2,3]]
```

If the original array cannot completely fulfill the chunk scheme then the array returned will drop the undersized final chunk:

```javascript
_.chunk([0,1,2,3,4], 2);
//=> , [[0,1],[2,3]]
```

You can pass an optional third argument to `_.chunk` to pad out the final array chunk should it fall short.  If the value given as the third argument is *not* an array then it is repeated the needed number of times:

```javascript
_.chunk([0,1,2,3,4], 3, '_');
//=> , [[0,1,2],[3,'_','_']]
```

If you given an array as the optional third argument then that array is used to pad in-place as needed:

```javascript
_.chunk([0,1,2,3,4], 3, ['a', 'b']);
//=> , [[0,1,2],[3,'a','b']]
```

--------------------------------------------------------------------------------

#### chunkAll

The `_.chunkAll` function is similar to `_.chunk` except for the following.  First, `_.chunkAll` will never drop short chunks from the end:

```javascript
_.chunkAll([0,1,2,3,4], 3);
//=> , [[0,1,2],[3]]
```

Also, `_.chunkAll` takes an optional third argument signifying that paritions should be built from skipped regions:

```javascript
_.chunkAll(_.range(1), 2, 4);
//=> [[0,1],[4,5],[8,9]]
```

--------------------------------------------------------------------------------

#### cons

Signature: `_.cons(head:Any, tail:Array)`

The `_.cons` function provides a way to "construct" a new array by taking some element and putting it at the front of another array.

```javascript
_.cons(0, []);
//=> [0]

_.cons(1, [2]);
//=> [1,2]

_.cons([0], [1,2,3]);
//=> [0,1,2,3]
```

The `_.cons` function also can be used to create pairs if the second argument is not an array.

Signature: `_.cons(head:Any, tail:Any)`

```javascript
_.cons(1, 2);
//=> [1,2]

_.cons([1], 2);
//=> [[1],2]
```

Finally, `_.cons` will operate with the `arguments` object.

Signature: `_.cons(head:Any, tail:Arguments)`

```javascript
function f() { return _.cons(0, arguments) }

f(1,2,3);
//=> [0,1,2,3]
```

--------------------------------------------------------------------------------

#### cycle

The `_.cycle` function takes an integer value used to build an array of that size containing the number of iterations through the given array, strung end-to-end as many times as needed.  An example is probably more instructive:

```javascript
_.cycle(5, [1,2,3]);
//=> [1,2,3,1,2]
```

--------------------------------------------------------------------------------

#### interpose

The `_.interpose` function takes an array and an element and returns a new array with the given element inserted betwixt every element in the original array:

```javascript
_.interpose([1,2,3], 0);
//=> [1,0,2,0,3]
```

If there are no betweens (i.e. empty and single-element arrays), then the original array is returned:

```javascript
_.interpose([1], 0);
//=> [1]

_.interpose([], 0);
//=> []
```

--------------------------------------------------------------------------------

#### iterateUntil

The `_.iterateUntil` function takes a function used as a result generator, a function used as a stop-check and a seed value and returns an array of each generated result.  The operation of `_.iterateUntil` is such that the result generator is passed the seed to start and each subsequent result which will continue **until** a result fails the check function (i.e. returns falsey).  An example is best:

```javascript
var dec = function(n) { return n - 1; };
var isPos = function(n) { return n > 0; };
```

The `dec` result generator takes a number and decrements it by one.  The `isPos` predicate takes a number and returns `true` if it's positive.  Using these two functions you can build an array of every number from `6` to `0`, inclusive:

```javascript
_.iterateUntil(dec, isPos, 6);
//=> [5,4,3,2,1]
```

That is, the array only contains every number from `5` down to `1` because when the result of `dec` got to `0` the `isPos` check failed (i.e. went falsey) thus terminating the execution.

--------------------------------------------------------------------------------

#### keepIndexed

The `_.keepIndexed` function takes an array and a function and returns a new array filled with the *non-null* return results of the given function on the elements or keys in the given array:

```javascript
_.keepIndexed([1,2,3], function(k) { 
  return i === 1 || i === 2;
});

//=> [false, true, true]
```

If you return either `null` or `undefined` then the result is dropped from the resulting array:

```javascript
_.keepIndexed(['a','b','c'], function(k, v) { 
  if (k === 1) return v; 
});

//=> ['b']
```

--------------------------------------------------------------------------------

#### mapcat

There are times when a mapping operation produces results contained in arrays, but the final result should be flattened one level.  For these circumstances you can use `_.mapcat` to produce results:

```javascript
var array = [1,2,null,4,undefined,6];

var errors = _.mapcat(array, function(e,i) {
  if (e == null) {
    return ["Element @" + i + " is bad"];
  }
  else {
    return [];
  }
});
```
Inspecting the contents of `errors` shows:

```javascript
["Element @2 is bad", "Element @4 is bad"]
```

The `_.mapcat` function is equivalent to `_.cat.apply(array, _.map(array,fun))`.

--------------------------------------------------------------------------------

#### reductions

The `_.reductions` function is similar to Underscore's builtin `_.reduce` function except that it returns an array of every intermediate value in the folding operation:

```javascript
_.reductions([1,2,3,4,5], function(agg, n) {
  return agg + n;
}, 0);

//=> [1,3,6,10,15]
```

The last element in the array returned from `_.reductions` is the answer that you would get if you had just chosen to use `_.reduce`.

--------------------------------------------------------------------------------

#### repeat

Signature: `_.repeat(t:Integer, value:Any)`

The `_.repeat` function takes an integer value used to build an array of that size containing the value given:

```javascript
_.repeat(5, 'a');
//=> ['a','a','a','a','a']
```

--------------------------------------------------------------------------------

#### splitAt

The `_.splitAt` function takes an array and a numeric index and returns a new array with two embedded arrays representing a split of the original array at the index provided:

```javascript
_.splitAt([1,2,3,4,5], 2);
//=> [[1,2],[3,4,5]]

_.splitAt([1,2,3,4,5], 0);
//=> [[],[1,2,3,4,5]]
```

The operation of `_.splitAt` is safe if the index provided is outside the range of legal indices:

```javascript
_.splitAt([1,2,3,4,5], 20000);
//=> [[1,2,3,4,5],[]]

_.splitAt([1,2,3,4,5], -1000);
//=> [[],[1,2,3,4,5]]    

_.splitAt([], 0);
//=> [[],[]]
```

--------------------------------------------------------------------------------

#### takeSkipping

The `_.takeSkipping` function takes an array and a number and returns a new array containing every nth element in the original array:

```javascript
_.takeSkipping(_.range(10), 2);
//=> [0,2,4,6,8]
```

The `_.takeSkipping` function is safe against numbers larger or smaller than the array size:

```javascript
_.takeSkipping(_.range(10), 100000);
//=> [0]

_.takeSkipping(_.range(10), -100);
//=> []
```

--------------------------------------------------------------------------------

#### weave

The `_.weave` function works similarly to `_.interpose` (shown above) except that it accepts an array used as the interposition values.  In other words, `_.weave` takes two arrays and returns a new array with the original elements woven together.  An example would help:

```javascript
_.weave(['a','b','c'], [1,2,3]);
//=> ['a',1,'b',2,'c',3]
```

The array returned from `_.weave` will be as long as the longest array given with the woven entries stopping according to the shortest array:

```javascript
_.weave(['a','b','c'], [1]);
//=> ['a',1,'b','c']
```

The `_.interleave` function is an alias for `_.weave`.

--------------------------------------------------------------------------------