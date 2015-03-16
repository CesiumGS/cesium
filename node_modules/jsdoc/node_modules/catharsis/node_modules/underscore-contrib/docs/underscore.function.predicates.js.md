### function.predicates

> Functions which return whether the input meets a condition.

--------------------------------------------------------------------------------

#### isAssociative

**Signature:** `isAssociative(value:Any)`

Returns a boolean indicating whether or not the value is an associative object.
An associative object is one where its elements can be accessed via a key or
index (e.g. arrays, `arguments`, objects).

```javascript
_.isAssociative(["Athens", "Sparta"]);
// => true

_.isAssociative(42);
// => false
```
--------------------------------------------------------------------------------

#### isDecreasing

**Signature:** `_.isDecreasing(values:Any...)`

Checks whether the arguments are monotonically decreasing values (i.e. whether
each argument is less than the previous argument.)

```javascript
_.isDecreasing(3, 2, 1);
// => true

_.isDecreasing(15, 12, 2);
// => true

_.isDecreasing(2, 3);
// => false
```

--------------------------------------------------------------------------------

#### isEven

**Signature:** `_.isEven(value:Any)`

Checks whether the value is an even number.

```javascript
_.isEven(12);
// => true

_.isEven(3);
// => false

_.isEven({});
// => false
```

--------------------------------------------------------------------------------

#### isFloat

**Signature:** `_.isFloat(value:Any)`

Checks whether the value is a "float." For the purposes of this function, a float
is a numeric value that is not an integer. A numeric value may be a number, a
string containing a number, a `Number` object, etc.

**NOTE:** JavaScript itself makes no distinction between integers and floats. For
the purposes of this function both `1` and `1.0` are considered integers.

```javascript
_.isFloat(1.1);
// => true

_.isFloat(1);
// => false

_.isFloat(1.0);
// => false

_.isFloat("2.15");
// => true
```

--------------------------------------------------------------------------------

#### isIncreasing

**Signature:** `_.isIncreasing(value:Any...)`

Checks whether the arguments are monotonically increasing values (i.e. each
argument is greater than the previous argument.)

```javascript
_.isIncreasing(1, 12, 15);
// => true

_.isIncreasing(1);
// => true

_.isIncreasing(5, 4);
// => false
```

--------------------------------------------------------------------------------

#### isIndexed

**Signature:** `_.isIndexed(value:Any)`

Checks whether the value is "indexed." An indexed value is one which accepts a
numerical index to access its elements. (e.g. arrays and strings)

**NOTE:** Underscore does not support cross-browser consistent use of strings as
array-like values, so be wary in IE 8 when using string objects and in IE7 and
earlier when using string literals & objects.

```javascript
_.isIndexed("Socrates");
// => true

_.isIndexed({poison: "hemlock"});
// => false
```

--------------------------------------------------------------------------------

#### isInstanceOf

**Signature:** `_.isInstanceOf(value:Any, constructor:Function)`

Checks whether the value is an instance of the constructor.

```javascript
_.isInstanceOf(new Date(), Date);
// => true

_.isInstanceOf("Hippocrates", RegExp);
// => false
```

--------------------------------------------------------------------------------

#### isInteger

**Signature:** `_.isInteger(value:Any)`

Checks whether the value is a numeric integer. A numeric value can be a string
containing a number, a `Number` object, etc.

```javascript
_.isInteger(18);
// => true

_.isInteger("18");
// => true

_.isInteger(2.5);
// => false

_.isInteger(-1);
// => true
``` 

--------------------------------------------------------------------------------

#### isJSON

**Signature:** `_.isJSON(value:Any)`

Checks whether the value is valid JSON. [See the spec](http://www.json.org/) for
more information on what constitutes valid JSON.

**NOTE:** This function relies on `JSON.parse` which is not available in IE7 and
earlier.

```javascript
_.isJSON('{ "name": "Crockford" }');
// => true

_.isJSON({ name: "Crocket" });
// => false
```

--------------------------------------------------------------------------------

#### isNegative

**Signature:** `_.isNegative(value:Any)`

Checks whether the value is a negative number.

```javascript
_.isNegative(-2);
// => true

_.isNegative(5);
// => false
```

--------------------------------------------------------------------------------

#### isNumeric

**Signature:** `_.isNumeric(value:Any)`

A numeric is something that contains a numeric value, regardless of its type. It
can be a string containing a numeric value, exponential notation, a `Number`
object, etc.

```javascript
_.isNumeric("14");
// => true

_.isNumeric("fourteen");
// => false
```

--------------------------------------------------------------------------------

#### isOdd

**Signature:** `_.isOdd(value:Any)`

Checks whether the value is an odd number.

```javascript
_.isOdd(3);
// => true

_.isOdd(2);
// => false

_.isOdd({});
// => false
```

--------------------------------------------------------------------------------

#### isPlainObject

**Signature:** `_.isPlainObject(value:Any);`

Checks whether the value is a "plain" object created as an object literal (`{}`)
or explicitly constructed with `new Object()`. Instances of other constructors
are **not** plain objects.

```javascript
_.isPlainObject({});
// => true

_.isPlainObject(new Date());
// => false

_.isPlainObject([]);
// => false
```

--------------------------------------------------------------------------------

#### isPositive

**Signature:** `_.isPositive(value:Any)`

Checks whether the value is a positive number.

```javascript
_.isPositive(21);
// => true

_.isPositive(-3);
// => false
```

--------------------------------------------------------------------------------

#### isSequential

**Signature:** `_.isSequential(value:Any)`

Checks whether the value is a sequential composite type (i.e. arrays and
`arguments`).

```javascript
_.isSequential(["Herodotus", "Thucidydes");
// => true

_.isSequential(new Date);
// => false
```

--------------------------------------------------------------------------------

#### isValidDate

**Signature:** `_.isValidDate(value:Any)`

Checks whether the value is a valid date. That is, the value is both an instance
of `Date` and it represents an actual date.

<span class="label label-danger">Warning:</span> This function does not verify
whether the original input to `Date` is a real date. For instance,
`new Date("02/30/2014")` is considered a valid date because `Date` coerces that
into a representation of 03/02/2014. To validate strings representing a date,
consider using a date/time library like [Moment.js.][momentjs]

```javascript
_.isValidDate(new Date("January 1, 1900"));
// => true

_.isValidDate(new Date("The Last Great Time War"));
// => false
```

--------------------------------------------------------------------------------

#### isZero

**Signature:** `_.isZero(value:Any)`

Checks whether the value is `0`.

```javascript
_.isZero(0);
// => true

_.isZero("Pythagoras");
// => false
```

--------------------------------------------------------------------------------

[momentjs]:http://momentjs.com/