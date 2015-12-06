# Coding Guide

Cesium is one of the largest JavaScript codebases in the world.  Since its start, we have maintained a high standard for code quality, which has made the codebase easier to work with for both new and experienced contributors.  We hope you find the codebase to be clean and consistent.

In addition to describing typical coding conventions, this guide also covers best practices for design, maintainability, and performance.

:art: The color palette icon indicates a design tip.

:house: The house icon indicates a maintainability tip.

:speedboat: The speedboat indicates a performance tip.

This guide can be summarized as _make new code similar to existing code_.

_TODO: TOC_

## Naming

* Directory names are `PascalCase`, e.g., `Source/Scene`.
* Constructor functions are `PascalCase`, e.g., `Cartesian3`.
* Functions are `camelCase`, e.g., `defaultValue()`, `Cartesian3.equalsEpsilon()`.
* Files end in `.js` and have the same name as the JavaScript identifier, e.g., `Cartesian3.js` and `defaultValue.js`.
* Variables, including class members, are `camelCase`, e.g.,
```javascript
this.minimumPixelSize = 1.0; // Class member

var bufferViews = model.gltf.bufferViews; // Local variable
```
* Private members start with an underscore, e.g.,
```javascript
this._canvas = canvas;
```
* Constants are in uppercase with underscores, e.g.,
```javascript
Cartesian3.UNIT_X = freezeObject(new Cartesian3(1.0, 0.0, 0.0));
```
* Avoid abbreviations in public identifiers unless the full name is prohibitively cumbersome, e.g., 
```javascript
Cartesian3.maximumComponent() // not Cartesian3.maxComponent()

Ellipsoid.WGS84 // not Ellipsoid.WORLD_GEODETIC_SYSTEM_1984
```
* Prefer short and descriptive names for local variables, e.g., if a function has only one length variable, prefer
```javascript
var length = primitives.length;
```
instead of
```javascript
var primitivesLength = primitives.length;
```

_TODO: make the following links_

More naming conventions are introduced below along with their design pattern, e.g., options parameters, result parameters, from constructors, and scratch variables.

## Formatting

In general, format new code the same as the existing code.

* Use four spaces for indentation.  Do not use [tab characters](http://www.jwz.org/doc/tabs-vs-spaces.html).
* Do not include trailing whitespace.
* Put `{` on the same line as the previous statement:
```javascript
var defaultValue = function(a, b) {
   // ...
};

if (!defined(result)) {
   // ...
}
```
* Use parenthesis judiciously, e.g., prefer
```javascript
var foo = (x > 0.0) && (y !== 0.0);
```
instead of
```javascript
var foo = x > 0.0 && y !== 0.0;
```
* Use vertical whitespace to separate functions and group related statements within a function, e.g.,
```javascript
var Model = function(options) {
    // ...
    this._allowPicking = defaultValue(options.allowPicking, true);

    this._ready = false;
    this._readyPromise = when.defer();
    // ...
};
```
* Use single quotes, `'`, instead of double quotes, `"`.  `"use strict"` is an exception and should use double quotes.

_TODO: something about the Eclipse and Web Storm formatters._

## Units

* Use meters for distances.
* Use radians for angles, except for explicit `Degrees` functions such as `Cartesian3.fromDegrees`.
* Use seconds for time durations.

## Functions

* :art: Functions should be **cohesive**; they should only do one task.
* Statements in a function should be at a similar level of abstraction.  If a code block is much lower level than the rest of the statements, it is a good candidate to move to a helper function, e.g., 
```javascript
Cesium3DTileset.prototype.update = function(frameState) {
    var tiles = this._processingQueue;
    var length = tiles.length;

    for (var i = length - 1; i >= 0; --i) {
        tiles[i].process(this, frameState);
    }

    selectTiles(this, frameState);
    updateTiles(this, frameState);
};
```
is better written as
```javascript
Cesium3DTileset.prototype.update = function(frameState) {
    processTiles(this, frameState);
    selectTiles(this, frameState);
    updateTiles(this, frameState);
};

function processTiles(tiles3D, frameState) {
    var tiles = tiles3D._processingQueue;
    var length = tiles.length;

    for (var i = length - 1; i >= 0; --i) {
        tiles[i].process(tiles3D, frameState);
    }
}
```
* :speedboat: Smaller functions are more likely to be optimized by V8.  Consider this for code that is likely to be a hot spot. _(TODO: I heard this on the NodeUp podcast, can someone confirm?)_
* :speedboat: Avoid multiple `return` statements in small hot functions since V8 will not inline them _(TODO: same TODO as above)_

### `options` Parameters

:house: Many Cesium functions take an `options` parameter to support optional parameters, self-documenting code, and forward compatibility.  For example, consider:
```javascript
var sphere = new SphereGeometry(10.0, 32, 16, VertexFormat.POSITION_ONLY);
```
It is not clear what the numeric values represent and the caller needs to know the order of parameters.  If this took an `options` parameter, it would look like:
```javascript
var sphere = new SphereGeometry({
    radius : 10.0,
    stackPartitions : 32,
    slicePartitions : 16,
    vertexFormat : VertexFormat.POSITION_ONLY
);
```
* :speedboat: Using `{ /* ... */ }` creates an object literal, which is a memory allocation.  Avoid creating functions that use an `options` parameter if the function is likely to be a hot spot; otherwise, callers will have to use a scratch variable for performance.  Constructor functions are good candidates for `options` parameters since Cesium avoid constructing objects in hot spots.

### Default Parameter Values

If a sensible default exists for a function parameter or class member, don't require the user to provide it.  For example, `height` defaults to zero in the following function:
```javascript
Cartesian3.fromRadians = function(longitude, latitude, height) {
    height = defaultValue(height, 0.0);
    // ...
};
```
* :speedboat: Use `defaultValue` to assign a default value to a local variable unless doing so could cause an unnecessary memory allocation, e.g.,
```javascript
this._mapProjection = defaultValue(options.mapProjection, new GeographicProjection());
```
is better written as
```javascript
this._mapProjection = defined(options.mapProjection) ? options.mapProjection : new GeographicProjection();
```

Some common sensible defaults are:
* `height`: `0.0`
* `ellipsoid`: `Ellipsoid.WGS84`
* `show`: `true`
* `modelMatrix`: `Matrix4.IDENTITY`
* `scale`: `1.0`

### Throwing Exceptions

_TODO: when to throw DeveloperError_
_TODO: use includeStart for exceptions_

### `result` Parameters and Scratch Variables

:speedboat: In JavaScript, user-defined classes such as `Cartesian3` are reference types and are therefore allocated on the heap.  Frequently allocating these types causes a significant performance problem because it creates GC pressure, which causes the Garbage Collector to run more frequently.

Cesium uses required `result` parameters to avoid implicit memory allocation.  For example,
```javascript
var sum = Cartesian3.add(v0, v1);
```
would have to implicitly allocate a new `Cartesian3` object for the returned sum.  Instead, `Cartesian3.add` requires a `result` parameter:
```javascript
var result = new Cartesian3();
var sum = Cartesian3.add(v0, v1, result); // result and sum reference the same object
```
This makes allocations explicit to the caller, which allows them to, for example, reuse the result object in a file-scoped scratch variable:
```javascript
var scratchDistance = new Cartesian3();

Cartesian3.distance = function(left, right) {
    Cartesian3.subtract(left, right, scratchDistance);
    return Cartesian3.magnitude(scratchDistance);
};
```
The code is not as clean, but the performance improvement is often dramatic.

As described below, from constructors also use optional result parameters.

## Classes

_TODO_

## GLSL

### Naming

* GLSL files end with `.glsl` and are in the [Shaders](https://github.com/AnalyticalGraphicsInc/cesium/tree/master/Source/Shaders) directory.
* Files for vertex shaders have a `VS` suffix; fragment shaders have an `FS` suffix.  For example: `BillboardCollectionVS.glsl` and `BillboardCollectionFS.glsl`.
* Generally, identifiers, such as functions and variables, use `camelCase`.
* Cesium built-in identifiers start with `czm_`, for example, [`czm_material`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Shaders/Builtin/Structs/material.glsl).  Files have the same name without the `czm_` prefix, e.g., `material.glsl`.
* Varyings start with `v_`, e.g.,
```javascript
varying vec2 v_textureCoordinates;
```
* Uniforms start with `u_`, e.g.,
```javascript
uniform sampler2D u_atlas;
```
* An `EC` suffix indicates the point or vector is in eye coordiantes, e.g.,
```glsl
varying vec3 v_positionEC;
// ...
v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
```
* When [GPU RTE](http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/) is used, `High` and `Low` suffixes define the high and low bits, respectively, e.g.,
```glsl
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
```
* 2D texture coordinates are `s` and `t`, not `u` and `v`, e.g.,
```glsl
attribute vec2 st;
```

### Formatting

* Use the same formatting as JavaScript, except put `{` on a new line, e.g.,
```glsl
struct czm_ray
{
    vec3 origin;
    vec3 direction;
};
```

### Performance

* :speedboat: Compute expensive value as least frequently as possible, e.g., prefer computing a value in JavaScript and passing it in a uniform instead of redundantly computing the same value per-vertex.  Likewise, prefer to compute a value per-vertex and pass a varying, instead of computing per-fragment when possible.
* :speedboat: Use `discard` sparingly since it disables early-z GPU optimizations.

## Resources

See Section 4.1 to 4.3 of [Getting Serious with JavaScript](http://webglinsights.github.io/downloads/WebGL-Insights-Chapter-4.pdf) by Cesium contributors Matthew Amato and Kevin Ring in _WebGL Insights_ for a deeper coverage of modules and performance.

Watch [From Console to Chrome](https://www.youtube.com/watch?v=XAqIpGU8ZZk) by Lilli Thompson for even deeper performance coverage.

---

_TODO: use defined_
_TODO: destroy pattern_
_TODO: promises_
_TODO: web workers_
_TODO: create WebGL resources in update()_
_TODO: shadow values_
_TODO: constructors vs from functions_
_TODO: prototype vs. non prototype function_
_TODO: implement equals_
_TODO: file-scope functions_
_TOOD: compare with ===_
_TODO: property getters_
_TODO: only make public if useful_
_TODO: create enums with freezeObject_
_TODO: loose coupling_
_TODO: comment why, not what_
_TODO: Don't merge code with TODO, PERFORMANCE_IDEA is OK_
_TODO: declare variables where they are used, even though they are hoisted_
_TODO: hoisting functions is OK_
_TOOD: constants with freezeObject_
_TODO: do not dynamically add members_
_TODO: profiling/debugging tools - separate guide?_
_TODO: Cesium stack screenshot like this http://cesiumjs.org/2015/05/26/Graphics-Tech-in-Cesium-Stack/_
_TODO: Cesium. vs AMD (or put this in doc guide)_
_TODO: UI_
_TODO: css_
_TODO: remove old wiki guide_

_TODO: from old guide:_

## Constructors

* Constructor functions should take the objects's basic components as parameters, while static helper methods should be provided for constructing an object via other means.  Helper methods should be prefixed with "from":

```javascript
var julianDate = new JulianDate(dayNumber, secondsOfDay, TimeStandard.UTC);
var julianDateFromIso8601 = JulianDate.fromIso8601("2012-04-24T18:08Z");
var julianDateFromDate = JulianDate.fromDate(new Date(1980, 7, 1));
```

* Object methods which create a new instance of a different object should be prefixed with "to":

```javascript
var julianDate = new JulianDate(dayNumber, secondsOfDay, TimeStandard.UTC);
var javaScriptDate = julianDate.toDate();
```

## Making a copy of `this`

If a closure needs a copy of `this`, our convention is to name it `that`.

```javascript
var that = this;
```

Some projects use the name `self` instead of `that` here.  However, `self` is already defined by the browser as a reference to the current window, and we wish to avoid redefining built-in variables.

## `null` vs. `undefined`

Where possible, avoid use of `null` and prefer `undefined`.  To test for this condition, use:

```javascript
if (typeof myVariable === 'undefined') {
    // take action
}
```

or

```javascript
if (typeof myVariable !== 'undefined') {
    // take action
}
```

The problem with comparing `myVariable === undefined` directly is that the variable `undefined` itself
is capable of being re-defined in JavaScript, so the JIT compiler can't make assumptions about what the
meaning of `undefined` will actually be at runtime.  In the recommended comparison, `typeof` is a language keyword, and
`'undefined'` in single quotes is a string literal that can't change at runtime, so the only variable is
`myVariable` itself.  Armed with this, the JIT can avoid string comparisons and optimize the entire statement
into a single machine-language null pointer check (or similar).  Thus, although it looks like asking for a string
comparison, this statement executes faster than a direct comparison with the variable `undefined`.

## Functions

* Likewise if a function argument is required, throw a `DeveloperError` if it is not provided, not in range, etc.
* Public functions should treat Cartesian and Quaternion type arguments as if they are immutable, and also accept the equivalent object literal.  For example these two lines of code have the same effect:

```javascript
foo(new Cartesian3(1.0, 2.0, 3.0));
foo({ x : 1.0, y : 2.0, z : 3.0 });
```

* Public functions should always return a Cartesian or Quaternion type, not an equivalent object literal.  For example:

```javascript
var v = bar();     // Returns a Cartesian3
v = v.normalize(); // Works because it is a Cartesian3, not an object with just x, y, and z properties
```

## Variables

* To aid the human reader, append `.0` to whole numbers intended to be floating-point values, e.g., `var f = 1.0;`.
