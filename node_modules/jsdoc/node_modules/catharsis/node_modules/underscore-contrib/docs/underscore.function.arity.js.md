### function.arity

> Functions which manipulate the way functions work with their arguments.

--------------------------------------------------------------------------------

#### arity

**Signature:** `_.arity(numberOfArgs:Number, fun:Function)`

Returns a new function which is equivalent to `fun`, except that the new
function's `length` property is equal to `numberOfArgs`. This does **not** limit
the function to using that number of arguments. It's only effect is on the
reported length.

```javascript
function addAll() {
     var sum = 0;
     for (var i = 0; i < arguments.length; i++) {
         sum = sum + arguments[i];
     }
     return sum;
}

addAll.length
// => 0

var addAllWithFixedLength = _.arity(2, addAll);

addAllWithFixedLength.length
// => 2

addAllWithFixedLength(1, 1, 1, 1);
// => 4
```

--------------------------------------------------------------------------------

#### binary

**Signature:** `_.binary(fun:Function)`

Returns a new function which accepts only two arguments and passes these
arguments to `fun`. Additional arguments are discarded.

```javascript
function addAll() {
     var sum = 0;
     for (var i = 0; i < arguments.length; i++) {
         sum = sum + arguments[i];
     }
     return sum;
}

var add2 = _.binary(addAll);

add2(1, 1);
// => 2

add2(1, 1, 1, 1);
// => 2
```

--------------------------------------------------------------------------------

#### curry

**Signature:** `_.curry(func:Function[, reverse:Boolean])`

Returns a curried version of `func`. If `reverse` is true, arguments will be
processed from right to left.

```javascript
function add3 (x, y, z) {
    return x + y + z;
}

var curried = _.curry(add3);
// => function

curried(1);
// => function

curried(1)(2);
// => function

curried(1)(2)(3);
// => 6
```

--------------------------------------------------------------------------------

#### curry2

**Signature:** `_.curry2(fun:Function)`

Returns a curried version of `func`, but will curry exactly two arguments, no
more or less.

```javascript
function add2 (a, b) {
    return a + b;
}

var curried = _.curry2(add2);
// => function

curried(1);
// => function

curried(1)(2);
// => 3
```

--------------------------------------------------------------------------------

#### curry3

**Signature:** `_.curry3(fun:Function)`

Returns a curried version of `func`, but will curry exactly three arguments, no
more or less.

```javascript
function add3 (a, b, c) {
    return a + b + c;
}

var curried = _.curry3(add3);
// => function

curried(1);
// => function

curried(1)(2);
// => function

curried(1)(2)(3);
// => 6
```

--------------------------------------------------------------------------------

#### fix

**Signature:** `_.fix(fun:Function[, value:Any...])`

Fixes the arguments to a function based on the parameter template defined by
the presence of values and the `_` placeholder.

```javascript
function add3 (a, b, c) {
    return a + b + c;
}

var fixedFirstAndLast = _.fix(add3, 1, _, 3);
// => function

fixedFirstAndLast(2);
// => 6

fixedFirstAndLast(10);
// => 14
```

--------------------------------------------------------------------------------

#### quaternary

**Signature:** `_.quaternary(fun:Function)`

Returns a new function which accepts only four arguments and passes these
arguments to `fun`. Additional arguments are discarded.

```javascript
function addAll() {
     var sum = 0;
     for (var i = 0; i < arguments.length; i++) {
         sum = sum + arguments[i];
     }
     return sum;
}

var add4 = _.quaternary(addAll);

add4(1, 1, 1, 1);
// => 4

add4(1, 1, 1, 1, 1, 1);
// => 4
```

--------------------------------------------------------------------------------

#### ternary

**Signature:** `_.ternary(fun:Function)`

Returns a new function which accepts only three arguments and passes these
arguments to `fun`. Additional arguments are discarded.

```javascript
function addAll() {
     var sum = 0;
     for (var i = 0; i < arguments.length; i++) {
         sum = sum + arguments[i];
     }
     return sum;
}

var add3 = _.ternary(addAll);

add3(1, 1, 1);
// => 3

add3(1, 1, 1, 1, 1, 1);
// => 3
```

--------------------------------------------------------------------------------

#### unary

**Signature:** `_.unary(fun:Function)`

Returns a new function which accepts only one argument and passes this
argument to `fun`. Additional arguments are discarded.

```javascript
function logArgs() {
    console.log(arguments);
}

var logOneArg = _.unary(logArgs);

logOneArg("first");
// => ["first"]

logOneArg("first", "second");
// => ["first"]
```

--------------------------------------------------------------------------------

#### rCurry

**Signature:** `_.rCurry(func:Function)`

Returns a curried version of `func` where arguments are processed from right
to left.

```javascript
function divide (a, b) {
    return a / b;
}

var curried = _.rCurry(divide);
// => function

curried(1);
// => function

curried(1)(2);
// => 2

curried(2)(1);
// => 0.5
```

--------------------------------------------------------------------------------

#### rcurry2

**Signature:** `_.rcurry2(func:Function)`

Returns a curried version of `func` where a maxium of two arguments are
processed from right to left.

```javascript
function concat () {
    var str = "";
    
    for (var i = 0; i < arguments.length; i++) {
        str = str + arguments[i];
    }
    
    return str;
}

var curried = _.rcurry2(concat);
// => function

curried("a");
// => function

curried("a")("b");
// => "ba"

```

--------------------------------------------------------------------------------

#### rcurry3

**Signature:** `_.rcurry3(func:Function)`

Returns a curried version of `func` where a maxium of three arguments are
processed from right to left.

```javascript
function concat () {
    var str = "";
    
    for (var i = 0; i < arguments.length; i++) {
        str = str + arguments[i];
    }
    
    return str;
}

var curried = _.rcurry3(concat);
// => function

curried("a");
// => function

curried("a")("b");
// => function

curried("a")("b")("c");
// => "cba"

```
