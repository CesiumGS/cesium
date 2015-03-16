### util.operators

> Functions which wrap JavaScript's operators.

--------------------------------------------------------------------------------

#### add

**Signature:** `_.add(value:Number, value:Number[, value:Number...])`

Returns the sum of the arguments.

```javascript
_.add(1, 2, 3, 4);
// => 10
```

--------------------------------------------------------------------------------

#### bitwiseAnd

**Signature:** `_.bitwiseAnd(value:Any, value:Any[, value:Any...])`

Returns the result of using the `&` operator on the arguments.

```javascript
_.bitwiseAnd(1, 3);
// => 1

_.bitwiseAnd(1, 3, 2);
// => 0
```

--------------------------------------------------------------------------------

#### bitwiseLeft

**Signature:** `_.bitwiseLeft(value:Any, value:Any[, value:Any...])`

Returns the result of using the `<<` operator on the arguments.

```javascript
_.bitwiseLeft(1, 3);
// => 8

_.bitwiseLeft(1, 3, 2);
// => 32
```

--------------------------------------------------------------------------------

#### bitwiseRight

**Signature:** `_.bitwiseRight(value:Any, value:Any[, value:Any...])`

Returns the result of using the `>>` operator on the arguments.

```javascript
_.bitwiseRight(3, 1);
// => 1

_.bitwiseRight(3, 1, 3);
// => 0
```

--------------------------------------------------------------------------------

#### bitwiseNot

**Signature:** `_.bitwiseNot(value:Any)`

Returns the result of using the `~` operator on the value.

```javascript
_.bitwiseNot(1);
// => -2

_.bitwiseOr(2);
// => -3
```

--------------------------------------------------------------------------------

#### bitwiseOr

**Signature:** `_.bitwiseOr(value:Any, value:Any[, value:Any...])`

Returns the result of using the `|` operator on the arguments.

```javascript
_.bitwiseOr(1, 3);
// => 3

_.bitwiseOr(1, 3, 4);
// => 7
```

--------------------------------------------------------------------------------

#### bitwiseXor

**Signature:** `_.bitwiseXor(value:Any, value:Any[, value:Any...])`

Returns the result of using the `^` operator on the arguments.

```javascript
_.bitwiseXor(1, 3);
// => 2

_.bitwiseXor(1, 3, 3);
// => 1
```

--------------------------------------------------------------------------------

#### bitwiseZ

**Signature:** `_.bitwiseZ(value:Any, value:Any[, value:Any...])`

Returns the result of using the `>>>` operator on the arguments.

```javascript
_.bitwiseZ(72, 32);
// => 72

_.bitwiseZ(72, 32, 2);
// => 18
```

--------------------------------------------------------------------------------

#### dec

**Signature:** `_.dec(value:Number)`

Returns the result of decrementing the value by `1`.

```javascript
_.dec(2);
// => 1
```

--------------------------------------------------------------------------------

#### div

**Signature:** `_.div(value:Number, value:Number[, value:Number...])`

Returns the quotient of the arguments.

```javascript
_.div(8, 2);
// => 4

_.div(8, 2, 2);
// => 2
```

--------------------------------------------------------------------------------

#### eq

**Signature:** `_.eq(value:Any, value:Any[, value:Any...])`

Compares the arguments with loose equality (`==`).

```javascript
_.eq(1, "1");
// => true

_.eq(1, 15);
// => false

_.eq(1, true, "1");
// => true

_.eq(1, 1, 15);
// => false
```

--------------------------------------------------------------------------------

#### gt

**Signature:** `_.gt(value:Any, value:Any[, value:Any...])`

Checks whether each argument is greater than the previous argument.

```javascript
_.gt(1, 2);
// => true

_.gt(1, 2, 3);
// => true

_.gt(1, 6, 2);
// => false

```

--------------------------------------------------------------------------------

#### gte

**Signature:** `_.gte(value:Any, value:Any[, value:Any...])`

Checks whether each argument is greater than or equal to the previous argument.

```javascript
_.gte(1, 2);
// => true

_.gte(1, 1, 3);
// => true

_.gte(1, 6, 2);
// => false

```

--------------------------------------------------------------------------------

#### inc

**Signature:** `_.inc(value:Number)`

Returns the result of incrementing the value by `1`.

```javascript
_.inc(2);
// => 3
```

--------------------------------------------------------------------------------

#### lt

**Signature:** `_.lt(value:Any, value:Any[, value:Any...])`

Checks whether each argument is less than the previous argument.

```javascript
_.lt(2, 1);
// => true

_.lt(2, 1, 0);
// => true

_.lt(2, 1, 12);
// => false

```

--------------------------------------------------------------------------------

#### lte

**Signature:** `_.lte(value:Any, value:Any[, value:Any...])`

Checks whether each argument is less than or equal to the previous argument.

```javascript
_.lte(2, 1);
// => true

_.lte(2, 1, 1);
// => true

_.lte(2, 1, 12);
// => false

```

--------------------------------------------------------------------------------

#### mul

**Signature:** `_.mul(value:Number, value:Number[, value:Number...])`

Returns the product of the arguments.

```javascript
_.mul(1, 2, 3, 4);
// => 24
```

--------------------------------------------------------------------------------

#### mod

**Signature:** `_.mod(dividend:Number, divisor:Number)`

Returns the remainder of dividing `dividend` by `divisor`.

```javascript
_.mod(26, 5);
// => 1

_.mod(14, 3);
// => 2
```

--------------------------------------------------------------------------------

#### neg

**Signature:** `_.neg(num:Number)`

Returns a new number with the opposite sign value of `num`.

```javascript
_.neg(5);
// => -5

_.neg(-3);
// => 3
```

--------------------------------------------------------------------------------

#### neq

**Signature:** `_.neq(value:Any, value:Any[, value:Any...])`

Checks whether each argument is not equal to the previous argument, using loose
inequality (`!=`).

```javascript
_.neq(2, 1);
// => true

_.neq(2, 1, 1);
// => true

_.neq(1, 1);
// => false

```

--------------------------------------------------------------------------------

#### not

**Signature:** `_.not(value:Any)`

Returns a boolean which is the opposite of the truthiness of the original value.

```javascript
_.not(0);
// => true

_.not(1);
// => false

_.not(true);
// => false

_.not(false);
// => true

_.not({});
// => false

_.not(null);
// => true
```

--------------------------------------------------------------------------------

#### seq

**Signature:** `_.seq(value:Any, value:Any[, value:Any...])`

Checks whether the arguments are strictly equal (`===`) to each other.

```javascript
_.seq(2, 2);
// => true

_.seq(2, "2");
// => false

_.seq(2, 2, 2);
// => true

```

--------------------------------------------------------------------------------

#### sneq

**Signature:** `_.sneq(value:Any, value:Any[, value:Any...])`

Checks whether the arguments are strictly not equal (`!==`) to each other.

```javascript
_.sneq(2, 2);
// => false

_.sneq(2, "2");
// => true

_.sneq(2, 2, 2);
// => false

```

--------------------------------------------------------------------------------

#### sub

**Signature:** `_.sub(value:Number, value:Number[, value:Number...])`

Returns the difference of the arguments.

```javascript
_.sub(10, 3);
// => 7

_.sub(10, 3, 5);
// => 2
``` 