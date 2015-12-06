# Coding Guide

Cesium is one of the largest JavaScript codebases in the world.  Since its start, we have maintained a high standard for code quality, which has made the codebase easier to work with for both new and experienced contributors.  We hope you find the codebase to be clean and consistent.

In addition to describing typical coding conventions, this guide also covers best practices for design, maintainability, and performance.

:art: The color palette icon indicates a design tip.

:house: The house icon indicates a maintainability tip.

:speedboat: The speedboat indicates a performance tip.

This guide can be summarized as _make new code similar to existing code_.

_TODO: TOC_

## Naming

_TODO_

## GLSL

### Naming

* GLSL files end with `.glsl` and are in the [Shaders](https://github.com/AnalyticalGraphicsInc/cesium/tree/master/Source/Shaders) directory.
* Files for vertex shaders have a `VS` suffix; fragment shaders have an `FS` suffix.  For example: `BillboardCollectionVS.glsl` and `BillboardCollectionFS.glsl`.
* Generally, identifiers, such as functions and variables, use `camelCase`.
* Cesium built-in identifiers start with `czm_`, for example, [czm_material](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Shaders/Builtin/Structs/material.glsl).  Files have the same name without the `czm_` prefix, e.g., `material.glsl`.
* Varyings start with `v_`, e.g., `varying vec2 v_textureCoordinates;`.
* Uniforms start with `u_`, e.g., `uniform sampler2D u_atlas;`.
* An `EC` suffix indicates the point or vector is in eye coordiantes, e.g.,
```glsl
varying vec3 v_positionEC;
// ...
v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
```
* When [GPU RTE](http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/) is used `High` and `Low` suffixes define the high and low bits, respectively, e.g.,
```glsl
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
```
* 2D texture coordinates are `s` and `t`, not `u` and `v`, e.g., `attribute vec2 st;`.

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

* :speedboat: Compute expensive value as least frequently as possible, e.g., prefer computing a value in JavaScript and passing it in a uniform to redundantly computing the same value per-vertex.  Likewise, prefer to compute a value per-vertex and pass a varying, instead of computing per-fragment when possible.
* :speedboat: Use `discard` sparingly since it disables early-z GPU optimizations.

## Resources

See Section 4.1 to 4.3 of [Getting Serious with JavaScript](http://webglinsights.github.io/downloads/WebGL-Insights-Chapter-4.pdf) by Cesium contributors Matthew Amato and Kevin Ring in _WebGL Insights_ for a deeper coverage of modules and performance.

Watch [From Console to Chrome](https://www.youtube.com/watch?v=XAqIpGU8ZZk) by Lilli Thompson for even deeper performance coverage.

---

_TODO: use defined_
_TODO: destroy pattern_
_TODO: promises_
_TODO: web workers_
_TODO: comment why, not what_
_TODO: create WebGL resources in update()_
_TODO: Pascal case for classes, camel case for functions_
_TODO: passing options to functions_
_TODO: constructors vs from functions_
_TODO: prototype vs. non prototype function_
_TODO: implement equals_
_TODO: underscore for private_
_TODO: file-scope functions_
_TOOD: compare with ===_
_TODO: property getters_
_TODO: when to throw DeveloperError_
_TODO: use includeStart for exceptions_
_TODO: only make public if useful_
_TODO: create enums with freezeObject_
_TODO: loose coupling, high cohesion_
_TODO: Don't merge code with TODO, PERFORMANCE_IDEA is OK_
_TODO: declare variables where they are used, even though they are hoisted_
_TODO: hoisting functions is OK_
_TOOD: constants with freezeObject_
_TODO: do not dynamically add members_
_TODO: scratch variables, results parameters, avoid GC_
_TODO: smaller functions get optimized_
_TODO: single return to inline_
_TODO: profiling/debugging tools - separate guide?_
_TODO: Cesium stack screenshot like this http://cesiumjs.org/2015/05/26/Graphics-Tech-in-Cesium-Stack/_
_TODO: UI_
_TODO: remove old wiki guide_

_TODO: from old guide:_

**This is now out-of-date.  There will be a new version as part of [#1683](https://github.com/AnalyticalGraphicsInc/cesium/issues/1683).**

## Units

* Use meters for distances.
* Use radians, not degrees, for angles.
* Use seconds for time durations.

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

* If a sensible default exists for a function argument or object property, don't require the user to provide it.  Examples:
   * ellipsoid - `Ellipsoid.getWgs84()`
   * granularity - `CesiumMath.toRadians(1.0)`
   * height - `0.0`
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

## Formatting

In general, format new code the same as the existing code.

* Use four (4) spaces for indentation.  Do not use [tab characters](http://www.jwz.org/doc/tabs-vs-spaces.html).
* Use single quotes, `'`, instead of double quotes, `"`.  `"use strict"` is an exception and should use double quotes.
* Where possible, eliminate all `jsHint` warnings.  The [[Contributor's Guide]] explains how to set up Eclipse to display these warnings.
