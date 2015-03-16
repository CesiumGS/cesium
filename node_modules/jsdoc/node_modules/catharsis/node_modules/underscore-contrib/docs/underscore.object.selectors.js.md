### object.selectors

> Functions to select values from an object.

--------------------------------------------------------------------------------

#### accessor

**Signature:** `_.accessor(field:String)`

Returns a function that will attempt to look up a named field in any object
that it is given.

```javascript
var getName = _.accessor('name');

getName({ name: 'Seneca' });
// => 'Seneca'
```

--------------------------------------------------------------------------------

#### dictionary

**Signature:** `_.dictionary(obj:Object)`

Given an object, returns a function that will attempt to look up a field that
it is given.

```javascript
var generals = {
    rome: "Scipio",
    carthage: "Hannibal"
};

var getGeneralOf = _.dictionary(generals);

_.getGeneralOf("rome");
// => "Scipio"
```

--------------------------------------------------------------------------------

#### getPath

**Signature:** `_.getPath(obj:Object, ks:String|Array)`

Gets the value at any depth in a nested object based on the path described by
the keys given. Keys may be given as an array or as a dot-separated string.
Returns `undefined` if the path cannot be reached.

```javascript
var countries = {
        greece: {
            athens: {
                playwright:  "Sophocles"
            }
        }
    }
};

_.getPath(countries, "greece.athens.playwright");
// => "Sophocles"

_.getPath(countries, "greece.sparta.playwright");
// => undefined

_.getPath(countries, ["greece", "athens", "playwright"]);
// => "Sophocles"

_.getPath(countries, ["greece", "sparta", "playwright"]);
// => undefined
```

--------------------------------------------------------------------------------

#### hasPath

**Signature:** `_.hasPath(obj:Object, ks:String|Array)`

Returns a boolean indicating whether there is a property at the path described
by the keys given. Keys may be given as an array or as a dot-separated string.

```javascript
var countries = {
        greece: {
            athens: {
                playwright:  "Sophocles"
            }
        }
    }
};

_.hasPath(countries, "greece.athens.playwright");
// => true

_.hasPath(countries, "greece.sparta.playwright");
// => false

_.hasPath(countries, ["greece", "athens", "playwright"]);
// => true

_.hasPath(countries, ["greece", "sparta", "playwright"]);
// => false
```

--------------------------------------------------------------------------------

#### kv

**Signature:** `_.kv(obj:Object, key:String)`

Returns the key/value pair for a given property in an object, undefined if not found.

```javascript
var playAuthor = {
    "Medea": "Aeschylus"
};

_.kv(playAuthor, "Medea");
// => ["Medea", "Aeschylus"]

_.kv(playAuthor, "Hamlet");
// => undefined
```

--------------------------------------------------------------------------------

#### omitWhen

**Signature:** `_.omitWhen(obj, pred:Function)`

Returns a copy of `obj` omitting any properties that the predicate (`pred`)
function returns `true` for. The predicat function is invoked with each
property value, like so: `pred(propValue)`.

```javascript
var playwrights = {
    euripedes: "Greece",
    shakespere: "England"
};

_.omitWhen(obj, function (country) { return country == "England" });
// => { euripedes: "Greece" }
```

--------------------------------------------------------------------------------

#### pickWhen

**Signature:** `_.pickWhen(obj:Object, pred:Function)`

Returns a copy of `obj` containing only properties that the predicate (`pred`)
function returns `true` for. The predicate function is invoked with each
property value, like so: `pred(propValue)`.

```javascript
var playwrights = {
    euripedes: "Greece",
    shakespere: "England"
};

_.pickWhen(obj, function (country) { return country == "England" });
// => { shakespeare: "England" }
```

--------------------------------------------------------------------------------

#### selectKeys

**Signature:** `_.selectKeys(obj:Object, ks:Array);

Returns a copy of `obj` containing only the properties listed in the `ks` array.

```javascript
var philosopherCities = {
    Philo: "Alexandria",
    Plato: "Athens",
    Plotinus: "Rome"
}

_.selectKeys(philosopherCities, ["Plato", "Plotinus"]);
// => { Plato: "Athens", Plotinus: "Rome" }
```
