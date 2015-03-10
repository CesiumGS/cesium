### util.existential

> Functions which deal with whether a value "exists."

--------------------------------------------------------------------------------

#### exists

**Signature:** `_.exists(value:Any)`

Checks whether or not the value is "existy." Both `null` and `undefined` are
considered non-existy values. All other values are existy.

```javascript
_.exists(null);
// => false

_.exists(undefined);
// => false

_.exists({});
// = > true

_.exists("Sparta");
// => true
```

--------------------------------------------------------------------------------

#### falsey

**Signature:** `_.falsey(value:Any)`

Checks whether the value is falsey. A falsey value is one which coerces to
`false` in a boolean context.

```javascript
_.falsey(0);
// => true

_.falsey("");
// => true

_.falsey({});
// => false

_.falsey("Corinth");
// => false
```

--------------------------------------------------------------------------------

#### firstExisting

**Signature:** `_.firstExisting(value:Any[, value:Any...])`

Returns the first existy argument from the argument list.

```javascript
_.firstExisting("Socrates", "Plato");
// => "Socrates"

_.firstExisting(null, undefined, "Heraclitus");
// => "Heraclitus"
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

#### truthy

**Signature:** `_.truthy(value:Any)`

Checks whether the value is truthy. A truthy value is one which coerces to
`true` in a boolean context.

```javascript
_.truthy({});
// => true

_.truthy("Athens");
// => true

_.truthy(0);
// => false

_.truthy("");
// => false
```

--------------------------------------------------------------------------------