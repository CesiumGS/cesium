### util.strings

> Functions for working with strings.

--------------------------------------------------------------------------------

#### camelCase

**Signature:** `_.camelCase(string:String)`

Converts a dash-separated string to camel case. Opposite of [toDash](#todash).

```javascript
_.camelCase("ancient-greece");
// => "ancientGreece"
```

--------------------------------------------------------------------------------

#### explode

**Signature:** `_.explode(s:String)`

Explodes a string into an array of characters. Opposite of [implode](#implode).

```javascript
_.explode("Plato");
// => ["P", "l", "a", "t", "o"]
```

--------------------------------------------------------------------------------

#### fromQuery

**Signature:** `_.fromQuery(str:String)`

Takes a URL query string and converts it into an equivalent JavaScript object.
Opposite of [toQuery](#toquery)

```javascript
_.fromQuery("forms%5Bperfect%5D=circle&forms%5Bimperfect%5D=square");
// => { forms: { perfect: "circle", imperfect: "square" } }
```

--------------------------------------------------------------------------------

#### implode

**Signature:** `_.implode(a:Array)`

Implodes an array of strings into a single string. Opposite of [explode](#explode).

```javascript
_.implode(["H", "o", "m", "e", "r"]);
// => "Homer"
```

--------------------------------------------------------------------------------

#### strContains

**Signature:** `_.strContains(str:String, search:String)`

Reports whether a string contains a search string.

```javascript
_.strContains("Acropolis", "polis");
// => true
```

--------------------------------------------------------------------------------

#### toDash

**Signature:** `_.toDash(string:String)`

Converts a camel case string to a dashed string. Opposite of [camelCase](#camelcase).

```javascript
_.toDash("thisIsSparta");
// => "this-is-sparta"
```

--------------------------------------------------------------------------------

#### toQuery

**Signature:** `_.toQuery(obj:Object)`

Takes an object and converts it into an equivalent URL query string. Opposite
of [fromQuery](#fromquery).

```javascript
_.toQuery({ forms: { perfect: "circle", imperfect: "square" } });
// => "forms%5Bperfect%5D=circle&forms%5Bimperfect%5D=square"
```

--------------------------------------------------------------------------------