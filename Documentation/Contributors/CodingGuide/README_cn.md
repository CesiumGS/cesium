# 编码指南

Cesium是世界上最大的JavaScript代码库之一。 自从创建以来，我们保持高标准的代码质量，这使得代码库更加容易被新的和有经验的贡献者使用。 我们希望你找到的代码库是干净和一致的。

除了描述典型的编码约定之外，本指南还介绍了设计，可维护性和性能的最佳实践。 这是来自多年的开发，研究和实验是许多开发商的累积建议。

:art: 调色板图标表示这个提示建议是关于设计。

:house: 房子图标表示可维护性提示。 实际上整个指南也是是关于如何编写可维护的代码的规则。

:speedboat: 快艇表示这是一个性能提示建议。

在某种程度上来说，本指南可以总结为与现有代码相似的新代码。

* [命名](#命名)
* [编码格式](#编码格式)
* [计量单位](#计量单位)
* [基本代码结构](#基本代码结构)
* [功能](#功能)
   * [`options` Parameters](#options-parameters)
   * [Default Parameter Values](#default-parameter-values)
   * [Throwing Exceptions](#throwing-exceptions)
   * [`result` Parameters and Scratch Variables](#result-parameters-and-scratch-variables)
* [Classes](#classes)
   * [Constructor Functions](#constructor-functions)
   * [`from` Constructors](#from-constructors)
   * [`to` Functions](#to-functions)
   * [Use Prototype Functions for Fundamental Classes Sparingly](#use-prototype-functions-for-fundamental-classes-sparingly)
   * [Static Constants](#static-constants)
   * [Private Functions](#private-functions)
   * [Property Getter/Setters](#property-gettersetters)
   * [Shadowed Property](#shadowed-property)
   * [Put the Constructor Function at the Top of the File](#put-the-constructor-function-at-the-top-of-the-file)
* [Design](#design)
   * [Deprecation and Breaking Changes](#deprecation-and-breaking-changes)
* [Third-Party Libraries](#third-party-libraries)
* [Widgets](#widgets)
* [GLSL](#glsl)
   * [Naming](#naming-1)
   * [Formatting](#formatting-1)
   * [Performance](#performance)
* [Resources](#resources)

## 命名

* 目录遵循帕斯卡拼写法， 例如：Source/Scene 
* 构造函数同样遵循帕斯卡拼写法， 例如： Cartesian3
* 功能函数遵循骆驼拼写法， 例如：defaultValue(), Cartesian3.equalsEpsilon()
* 文件名以.js后缀结尾并且和JavaScript描述符一致即类名， 例如：Cartesian3.js 和 defaultValue.js
* 变量名，也包括类的属性都采用骆驼拼写法。 例如：
```JavaScript
this.minimumPixelSize = 1.0; // Class property

var bufferViews = gltf.bufferViews; // Local variable
```
* 私有成员命名以下划线开头（默认惯例）。 例如：
```JavaScript
this._canvas = canvas;
```
* 常量全部使用大写字母和下划线。 例如：
```JavaScript
Cartesian3.UNIT_X = freezeObject(new Cartesian3(1.0, 0.0, 0.0));
```
* 一般不使用缩写以避免在公共标识符中冲突，除非全名过于繁琐并且缩写名称是被大家广泛接受的。 例如：
```JavaScript
Cartesian3.maximumComponent() // 不采用 Cartesian3.maxComponent()

Ellipsoid.WGS84 // 不采用 Ellipsoid.WORLD_GEODETIC_SYSTEM_1984
```
* 建议局部变量更短为好，例如： 当函数体内只有一个length变量时
```JavaScript
var primitivesLength = primitives.length;
```
最好写成
```JavaScript
var length = primitives.length;
```
* 当在一个闭包中访问外部的this变量时，需要改变这个变量名为that。例如：
```JavaScript
var that = this;
this._showTouch = createCommand(function() {
    that._touch = true;
});
```
下面介绍一些命名约定以及它们的设计模式, 例如：options parameters, result parameters and scratch variables, and from constructors.

## 编码格式

通常来讲，新代码的格式与原来的代码格式保持一致。
* 使用缩进四个空格。不要使用制表符tab。
* 代码后面不要加多余空格。
* {和前面的声明放在同一行。
```JavaScript
function defaultValue(a, b) {
   // ...
}

if (!defined(result)) {
   // ...
}
```
* 在if for while 中使用大括号，即使只有一行。
```JavaScript
if (!defined(result))
    result = new Cartesian3();
```
最好写成
```JavaScript
if (!defined(result)) {
    result = new Cartesian3();
}
```
* 尽量使用() 例如：
```JavaScript
var foo = x > 0.0 && y !== 0.0;
```
最好写成
```JavaScript
var foo = (x > 0.0) && (y !== 0.0);
```
*　在一个函数内尽量使用空白行将相同类型的操作归类。　例如：
```JavaScript
function Model(options) {
    // ...
    this._allowPicking = defaultValue(options.allowPicking, true);

    this._ready = false;
    this._readyPromise = when.defer();
    // ...
};
```
* 在JavaScript中一般使用单引号来代替双引号。在html中则使用双引号。
* 在文本编辑中，包括JavaScript文件。在文件的最后使用一个换行符，以降低差异化处理的可能性。

## 计量单位

* Cesium使用国际标准单位
    * 表示距离用米
    * 角用弧度表示
    * 时间及时间间隔用秒
* 如果一个函数使用的参数不是使用标准单位则需要将单位名字写到函数中。 例如：
```JavaScript
Cartesian3.fromDegrees = function(longitude, latitude, height, ellipsoid, result) { /* ... */ }
```
 ## 基本代码结构

* Cesium使用JavaScript的严格模式Cesium uses JavaScript's [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) 所以每个模块（文件）都包含
```javascript
'use strict';
```
* :speedboat: 为了避免类型的强制转换 （隐试强制转换），检测是否相等使用 === 和 !== , 例如：
```javascript
var i = 1;

if (i === 1) {
    // ...
}

if (i !== 1) {
    // ...
}
```
* 为了方便阅读，通常在数字后面加上'.0'作为一个浮点值，类型是整形除外。
```javascript
var f = 1;
```
最好写成
```javascript
var f = 1.0;
```
* 变量的声明放在第一次被使用的地方， 例如：
```javascript
var i;
var m;
var models = [ /* ... */ ];
var length = models.length;
for (i = 0; i < length; ++i) {
    m = models[i];
    // Use m
}
```
最好写成
```javascript
var models = [ /* ... */ ];
var length = models.length;
for (var i = 0; i < length; ++i) {
    var m = models[i];
    // Use m
}
```
* 变量是函数级的作用域，而不是块级作用域。不要依赖变量作用域提升，使用变量要在声明之前，例如：
```javascript
console.log(i); // i is undefined here.  Never use a variable before it is declared.
var i = 0.0;
```
* :speedboat: 避免使用多次属性的嵌套访问。比如
```javascript
scene._state.isSkyAtmosphereVisible = true
scene._state.isSunVisible = true;
scene._state.isMoonVisible = false;
```
最好写成
```javascript
var state = scene._state;
state.isSkyAtmosphereVisible = true
state.isSunVisible = true;
state.isMoonVisible = false;
```
* 当一个变量只是用一次时尽量不要创建它，除非它能够提升较多的可读性， 例如：
```javascript
function radiiEquals(left, right) {
    var leftRadius = left.radius;
    var rightRadius = right.radius;
    return (leftRadius === rightRadius);
}
```
最好写成
```javascript
function radiiEquals(left, right) {
    return (left.radius === right.radius);
}
```
* 使用 `undefined` 代替 `null`.
* 测试一个变量是否被定义使用Cesium的defined函数， 例如：
```javascript
var v = undefined;
if (defined(v)) {
    // False
}

var u = {};
if (defined(u)) {
    // True
}
```
* 使用Cesium的 `freezeObject` 功能来创建枚举变量， 例如：
```javascript
/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    var ModelAnimationState = {
        STOPPED : 0,
        ANIMATING : 1
    };

    return freezeObject(ModelAnimationState);
});
```
* 添加注释在关键或者语义不明显的地方，例如：
```javascript
byteOffset += sizeOfUint32; // Add 4 to byteOffset
```
最好写成
```javascript
byteOffset += sizeOfUint32; // Skip length field
```
* `TODO` 这部分内容需要被移除或者处理在合并到主版本之前。谨慎使用，`PERFORMANCE_IDEA`, 表示它可以等到进行性能分析是再进行。
* 在合并到主版本之前移除被注释掉的代码。

## 功能

* :art: 函数（功能）应该具有内聚性 **cohesive**; 它应该被设计成只完成一个任务。
* 在函数内部，语句应该是相似抽象等级，如果一个代码块的抽象等级比其它代码低太多，建议把它放入单独一个函数中， 例如：
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
最好写成
```javascript
Cesium3DTileset.prototype.update = function(frameState) {
    processTiles(this, frameState);
    selectTiles(this, frameState);
    updateTiles(this, frameState);
};

function processTiles(tileset, frameState) {
    var tiles = tileset._processingQueue;
    var length = tiles.length;

    for (var i = length - 1; i >= 0; --i) {
        tiles[i].process(tileset, frameState);
    }
}
```
* 在函数结尾不要使用多余的 `else` 代码块， 例如：
```javascript
function getTransform(node) {
    if (defined(node.matrix)) {
        return Matrix4.fromArray(node.matrix);
    } else {
        return Matrix4.fromTranslationQuaternionRotationScale(node.translation, node.rotation, node.scale);
    }
}
```
最好写成
```javascript
function getTransform(node) {
    if (defined(node.matrix)) {
        return Matrix4.fromArray(node.matrix);
    }

    return Matrix4.fromTranslationQuaternionRotationScale(node.translation, node.rotation, node.scale);
}
```
* :speedboat: 更小的功能集更容易的被编译引擎优化，编写代码时需要注意这也是很关键的一点。

### `options` 可选参数

:art: 许多Cesium函数使用一个 `options` 对象来作为参数，它可以很方便的支持可选参数、个人文档编程、向前兼容。例如：
```javascript
var sphere = new SphereGeometry(10.0, 32, 16, VertexFormat.POSITION_ONLY);
```
只看上面的代码会并不清楚每个参数表示什么意思，而且参数之间必须是有顺序的。如果使用一个 `options` 对象参数, 就像这样：
```javascript
var sphere = new SphereGeometry({
    radius : 10.0,
    stackPartitions : 32,
    slicePartitions : 16,
    vertexFormat : VertexFormat.POSITION_ONLY
});
```
* :speedboat: 使用 `{ /* ... */ }` 将会创建对象并且分配内存。 如果这个功能需要被频繁使用则在设计时避免使用 `options` 对象参数；否则的话， callers 将会使用一个 scratch variable (see [below](#result-parameters-and-scratch-variables)) 来提升性能。对于非数学的构造函数还是建议使用 `options` 对象参数，这样的话就能尽量避免频繁的构造对象。例如：
```javascript
var p = new Cartesian3({
    x : 1.0,
    y : 2.0,
    z : 3.0
});
```
这种构造 `Cartesian3` 的方式是不推荐的， 从性能上考虑它并不如下面这种形式。
```javascript
var p = new Cartesian3(1.0, 2.0, 3.0);
```

### 默认参数

 如何函数参数和类的属性存在缺省值，即不一定要求指定。 使用后Cesium的`defaultValue` 来分配默认值。比如下面这个例子， `Cartesian3.fromRadians` 的`height`属性默认值是0 ：
```javascript
Cartesian3.fromRadians = function(longitude, latitude, height) {
    height = defaultValue(height, 0.0);
    // ...
};
```
* :speedboat: 如果使用`defaultValue`会不可避免的导致调用函数或者分配内存，那么则不使用。例如：
```javascript
this._mapProjection = defaultValue(options.mapProjection, new GeographicProjection());
```
最好写成
```javascript
this._mapProjection = defined(options.mapProjection) ? options.mapProjection : new GeographicProjection();
```
* 如果`defaultValueIf`的参数是一个`options`对象参数，则参数的默认值通常使用`defaultValue.EMPTY_OBJECT`，例如：
```javascript
function DebugModelMatrixPrimitive(options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);
    this.length = defaultValue(options.length, 10000000.0);
    this.width = defaultValue(options.width, 2.0);
    // ...
}
```

一些常用的默认值
* `height`: `0.0`
* `ellipsoid`: `Ellipsoid.WGS84`
* `show`: `true`

### 异常处理

在用户编码错误时，通常使用Cesium的[Check](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/Check.js) 类来抛出一个`DeveloperError`。 最常见的错误有 缺少参数、参数类型错误、超出范围。

* 例如：检测一个对象是否是制定的定义类型：
```javascript
Cartesian3.maximumComponent = function(cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object('cartesian', cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y, cartesian.z);
};
```

* 对于更加复杂的参数检查，手动检测参数然后抛出一个`DeveloperError`异常。例如：
```javascript
Cartesian3.unpackArray = function(array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined('array', array);
    Check.typeOf.number.greaterThanOrEquals('array.length', array.length, 3);
    if (array.length % 3 !== 0) {
        throw new DeveloperError('array length must be a multiple of 3.');
    }
    //>>includeEnd('debug');

    // ...
};
```

* 关于检测 `DeveloperError` 的所有代码都写在 `includeStart`/`includeEnd`范围内, 如上所示, 这样开发人员就可以将错误检测优化在编译成release版时。不要包含会产生副作用的代码在`includeStart`/`includeEnd`范围内，例如：
```javascript
Cartesian3.maximumComponent = function(cartesian) {
    //>>includeStart('debug', pragmas.debug);
    var c = cartesian;
    Check.typeOf.object('cartesian', cartesian);
    //>>includeEnd('debug');

    // Works in debug. Fails in release since c is optimized out!
    return Math.max(c.x, c.y, c.z);
};
```
* 只有在执行时才会抛出Cesium的`RuntimeError`错误。不同于developer errors，运行时的错误检测在release版时不会被优化。
```javascript
if (typeof WebGLRenderingContext === 'undefined') {
    throw new RuntimeError('The browser does not support WebGL.');
}
```
* :art: 在特殊情况下，不要抛出异常，例如，如果一个折线仅仅只有一个点，这个时候不要抛出异常，只要不渲染它就行了。

### `result` Parameters and Scratch Variables

:speedboat: 在JavaScript中，用户定义的类（如`Cartesian3`）是引用类型，因此在堆上分配。 频繁分配这些类型会导致重大的性能问题，因为它会加大GC（图形上下文）的压力，这会导致垃圾收集器运行时间更长更频繁。

Cesium 通过使用`result`参数来避免隐试内存分配。 例如：
```javascript
var sum = Cartesian3.add(v0, v1);
```
手动创建一个`Cartesian3`对象赋值给`result`来代替直接使用`Cartesian3.add`产生隐试分配，然后把`result`传入`Cartesian3.add`。这样就可以比上面少分配了一次内存。
```javascript
var result = new Cartesian3();
var sum = Cartesian3.add(v0, v1, result); // Result and sum reference the same object
```
显试创建对象分配内存还能够最高效率使用内存，例如，重复使用`result`对象在一个作用域内，把它看做一个草稿变量：
```javascript
var scratchDistance = new Cartesian3();

Cartesian3.distance = function(left, right) {
    Cartesian3.subtract(left, right, scratchDistance);
    return Cartesian3.magnitude(scratchDistance);
};
```
虽然代码看起来不是很简洁，但是却能带来不小的性能提升。

下面要说的也同样如此，在累的构造函数中也使用可选的`result`参数。

## 类

* :art: 类应该具有内聚性**cohesive**。一个类应该可以表示为一个抽象化的实体。
* :art: 类应该具有低耦合性**loosely coupled**。两个类的实现细节应该相互独立；类之间通过定义好的接口进行通信。

### 构造函数

* 创建一个类通常使用一个构造函数：
```javascript
function Cartesian3(x, y, z) {
    this.x = defaultValue(x, 0.0);
    this.y = defaultValue(y, 0.0);
    this.z = defaultValue(z, 0.0);
};
```
* 创建一个类的实例（对象）则使用`new`和构造函数：
```javascript
var p = new Cartesian3(1.0, 2.0, 3.0);
```
* :speedboat: 所有的类属性都写在构造函数中。这样可以让编译引擎使用隐试类并且避免进入字典模式。如果没有初始值就分配为`undefined`。尽量不向对象添加属性，:trollface: 按我的理解就是尽量把属性写入构造函数中方便编译引擎优化，避免频繁的改变类对象结构。例如：
```javascript
var p = new Cartesian3(1.0, 2.0, 3.0);
p.w = 4.0; // Adds the w property to p, slows down property access since the object enters dictionary mode
```
* :speedboat: 同理，尽量不要改变属性的类型， 例如，把一个字符串赋值给一个整形变量，
```javascript
var p = new Cartesian3(1.0, 2.0, 3.0);
p.x = 'Cesium'; // Changes x to a string, slows down property access
```

### `from` 构造函数

:art: 构造函数一般使用基本组件作为类的参数，例如，`Cartesian3` 使用 `x`, `y`, 和 `z`.

为了方便构造对象使用其它类型的参数，但是JavaScript有没有函数重载的概念，所以Cesium使用一个固定的函数前缀`from`来表示构造对象。例如：
```javascript
var p = Cartesian3.fromRadians(-2.007, 0.645); // Construct a Cartesian3 object using longitude and latitude
```
这个实现使用了一个可选参数 `result` ，允许调用者传入一个草稿变量：
```javascript
Cartesian3.fromRadians = function(longitude, latitude, height, result) {
    // Compute x, y, z using longitude, latitude, height

    if (!defined(result)) {
        result = new Cartesian3();
    }

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
};
```
由于调用一个`from` 构造函数不需要建立在对象之上，这个构造函数应该写成`Cartesian3.fromRadians`, 而不是 `Cartesian3.prototype.fromRadians`.

### `to` 函数

带 `to` 前缀的函数一般用来返回一个新的类型的对象，例如：
```javascript
Cartesian3.prototype.toString = function() {
    return '(' + this.x + ', ' + this.y + ', ' + this.z + ')';
};
```

### 通常基础类很少使用原型函数

:art: 基本的数学类比如 `Cartesian3`, `Quaternion`, `Matrix4`, 和 `JulianDate`  一般很少使用原型函数。例如，`Cartesian3`并没有向下面 `add` 这样的原型函数： Fundamental math classes such as `Cartesian3`, `Quaternion`, `Matrix4`, and `JulianDate` use prototype functions sparingly.  For example, `Cartesian3` does not have a prototype `add` function like this:
```javascript
v0.add(v1, result);
```
一般而言写成这样
```javascript
Cartesian3.add(v0, v1, result);
```
但是下面这些除外
* `clone`
* `equals`
* `equalsEpsilon`
* `toString`

但其实这些原型函数也只是非原型函数的静态版本，例如：
```javascript
Cartesian3.equals = function(left, right) {
    return (left === right) ||
           ((defined(left)) &&
            (defined(right)) &&
            (left.x === right.x) &&
            (left.y === right.y) &&
            (left.z === right.z));
};

Cartesian3.prototype.equals = function(right) {
    return Cartesian3.equals(this, right);
};
```
原型版本的好处能够以多态方式使用。

### 常量

使用`freezeObject`来创建常量:
```javascript
Cartesian3.ZERO = freezeObject(new Cartesian3(0.0, 0.0, 0.0));
```

### 私有函数

私有函数和私有属性以 `_`前缀开头。但是在实践中，却很少使用这些。相反，为了更好的封装，使用一个 file-scoped 函数并且把`this`作为第一个参数。
```javascript
Cesium3DTileset.prototype.update = function(frameState) {
    this._processTiles(frameState);
    // ...
};

Cesium3DTileset.prototype._processTiles(tileset, frameState) {
    var tiles = this._processingQueue;
    var length = tiles.length;

    for (var i = length - 1; i >= 0; --i) {
        tiles[i].process(tileset, frameState);
    }
}
```
最好写成
```javascript
Cesium3DTileset.prototype.update = function(frameState) {
    processTiles(this, frameState);
    // ...
};

function processTiles(tileset, frameState) {
    var tiles = tileset._processingQueue;
    var length = tiles.length;

    for (var i = length - 1; i >= 0; --i) {
        tiles[i].process(tileset, frameState);
    }
}
```

### 属性的 Getter/Setters

公共属性可以读写而不需要额外的处理，可以非常简单的直接在构造函数中分配，例如：
```javascript
function Model(options) {
   this.show = defaultValue(options.show, true);
};
```

只读属性创建可以通过创建私有属性和使用`getter`，一般使用Cesium的 `defineProperties`函数创建，例如：
```javascript
function Cesium3DTileset(options) {
    this._url = options.url;
};

defineProperties(Cesium3DTileset.prototype, {
    url : {
        get : function() {
            return this._url;
        }
    }
});
```
在需要返回属性的地方都会触发`Getters`，所以可以在`Getters`中执行任何对返回值的计算，但是从性能上考虑最好内部是能够被快速执行的。

同理在需要设置属性的地方都会触发`Setters`，并且可以在写入私有属性之前添加额外的处理，想设置一个标志来进行延时处理。例如： 
Setters can also perform computation before assigning to a private property, set a flag to delay computation, or both, for example:
```javascript
defineProperties(UniformState.prototype, {
    viewport : {
        get : function() {
            return this._viewport;
        },
        set : function(viewport) {
            if (!BoundingRectangle.equals(viewport, this._viewport)) {
                BoundingRectangle.clone(viewport, this._viewport);

                var v = this._viewport;
                var vc = this._viewportCartesian4;
                vc.x = v.x;
                vc.y = v.y;
                vc.z = v.width;
                vc.w = v.height;

                this._viewportDirty = true;
            }
        }
    }
});
```

* :speedboat: 使用`getter/setter`从性能上来讲是低于直接访问属性的，所以在函数内部可以适当的直接对属性操作。Calling the getter/setter function is slower than direct property access so functions internal to a class can use the private property directly when appropriate.

### 跟踪属性 Shadowed Property

但使用`getter/setter`造成是开销过高时最好使用引用，这样就能够通过传入一个`result`参数来修改属性，可以尝试以一个公共属性和私有属性绑定做成一个跟踪属性，例如：When the overhead of getter/setter functions is prohibitive or reference-type semantics are desired, e.g., the ability to pass a property as a `result` parameter so its properties can be modified, consider combining a public property with a private shadowed property, e.g.,
```javascript
function Model(options) {
    this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
    this._modelMatrix = Matrix4.clone(this.modelMatrix);
};

Model.prototype.update = function(frameState) {
    if (!Matrix4.equals(this._modelMatrix, this.modelMatrix)) {
        // clone() is a deep copy. Not this._modelMatrix = this._modelMatrix
        Matrix4.clone(this.modelMatrix, this._modelMatrix);

        // Do slow operations that need to happen when the model matrix changes
    }
};
```
:trollface: 像上面这个例子就是防止多次设置`_modelMatrix`造成`getter`的多次调用开销过大。上面这种写法只有`update`调用时才会调用`getter`。

### 构造函数要放在文件的最上面

构造函数一般放在文件的头部，即使构造需要调用一些辅助函数但还是要放在前面。:trollface: 我觉得这应该加强代码的友好型，把最重要的放在最前面，例如： `Cesium3DTileset.js`,
```javascript
function loadTileset(tileset, tilesJson, done) {
    // ...
}

function Cesium3DTileset(options) {
    // ...
    loadTileset(this, options.url, function(data) {
       // ...
    });
};
```
最好写成
```javascript
function Cesium3DTileset(options) {
    // ...
    loadTileset(this, options.url, function(data) {
       // ...
    });
};

function loadTileset(tileset, tilesJson, done) {
    // ...
}
```
尽管构造函数调用了`loadTileset`函数但是还是在它前面。实际上它利用的是JavaScript的作用域提升，作用域提升分为变量和函数，前一个容易造成混乱一般不使用。


## 设计架构

* :house: 制作一个类或者函数只有在确定这对最终用户有用的情况下才放入到Cesium库中；避免让一些实现细节作为公共库的一部分，如果随意添加会使得Cesium库越来越庞大，这实际上是臃肿的庞大将会越来越难被看懂学习，而且日后拓展也更加困难，并且需要更多的维护文档。:trollface: 这其实就是质量管理体系，告诉你别什么都往上加。先Think Think。。。。。这是Cesium分支如此多的一部分原因，保证主版本分支是稳定的高质量代码。
* :art: 在Cesium中，创建一个新的类或者函数都应该把它放在正确的位置（目录）。从底层到高层：
   * `Source/Core` - 数值运算，纯数学运算比如 [`Cartesian3`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/Cartesian3.js). 纯几何运算比如 [`CylinderGeometry`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/CylinderGeometry.js). 基础算法比如 [`mergeSort`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/mergeSort.js). 辅助帮助功能 [`loadArrayBuffer`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/loadArrayBuffer.js).
   * `Source/Renderer` - 这个目录一般是 `WebGL` 相关 [`ShaderProgram`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Renderer/ShaderProgram.js) 还有基于`WebGL`一些特点的实用库比如 [`ShaderCache`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Renderer/ShaderCache.js).  这个目录的标识符并不属于公共的Cesium库。Identifiers in this directory are not part of the public Cesium API.
   * `Source/Scene` - 图形引擎，基本图元比如 [Model](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Scene/Model.js). 这个目录下的代码常常会依赖 `Renderer`.
   * `Source/DataSources` - 实体类 Entity API, 比如 [`Entity`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/DataSources/Entity.js), 又比如数据源 [`CzmlDataSource`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/DataSources/CzmlDataSource.js).
   * `Source/Widgets` - 这个目录包含了Cesium中主要的窗口部件类比如 [`Viewer`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Widgets/Viewer/Viewer.js).

通常情况下文件该放在哪是比较明显的。如果不是，那么它大概率是介于`Core`和其它目录之间。如果它是纯数值运算或者是对Cesium非常有实用且具有通用性的功能，那么把它放到`Core`下，例如： [`Matrix4`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/Matrix4.js) 属于 `Core` 应为Cesium的许多类都会用到4x4矩阵转换；另一方面比如， [`BoundingSphereState`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/DataSources/BoundingSphereState.js) 应该放在 `DataSources` 因为它是基于特定数据源的。

![](1.jpg)

模块的依赖应该只限于和它的同级目录或者比它更底层的目录。例如，一个在`Scene`下的模块可以依赖使用在 `Scene`, `Renderer`, 和 `Core`下的所有模块，但是不能够依赖使用在`DataSources` 或者 `Widgets`下的模块。

* `define`中的模块应该按字母顺序排列。可以使用`npm run sortRequires`自动完成， 请看[Build Guide](../BuildGuide/README.md)。比如`Scene/ModelAnimation.js`所依赖的模块是：
```javascript
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/Event',
        '../Core/JulianDate',
        './ModelAnimationLoop',
        './ModelAnimationState'
    ], function(
        defaultValue,
        defineProperties,
        Event,
        JulianDate,
        ModelAnimationLoop,
        ModelAnimationState) { /* ... */ });
```
* 需要明确删除WebGL资源，因此这种类（以及包含这些类的类等）需要具有`destroy`和`isDestroyed`函数，例如：
```javascript
var primitive = new Primitive(/* ... */);
expect(content.isDestroyed()).toEqual(false);
primitive.destroy();
expect(content.isDestroyed()).toEqual(true);
```
`destroy` 函数的实现需要使用Cesium的 `destroyObject` 函数， 例如：
```javascript
SkyBox.prototype.destroy = function() {
    this._vertexArray = this._vertexArray && this._vertexArray.destroy();
    return destroyObject(this);
};
```
* 使用`destroy`仅仅只销毁你创建的对象；外部对象应该交给拥有这个对象的类去实现，并不是这个类。

### 弃用更新 Deprecation and Breaking Changes

每次发布，我们努力保持公众铯API稳定，并且不丢失流动性保持快速发展，且保证API在正确的方向。 因此，每次删除或者替换部分API都是我们经过谨慎考虑的。

A `@private` API is considered a Cesium implementation detail and can be broken immediately without deprecation.

A public identifier (class, function, property) should be deprecated before being removed.  To do so:

* Decide on which future version the deprecated API should be removed.  This is on a case-by-case basis depending on how badly it impacts users and Cesium development.  Most deprecated APIs will removed in 1-3 releases.  This can be discussed in the pull request if needed.
* Use [`deprecationWarning`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Core/deprecationWarning.js) to warn users that the API is deprecated and what proactive changes they can take, e.g.,
```javascript
function Foo() {
    deprecationWarning('Foo', 'Foo was deprecated in Cesium 1.01.  It will be removed in 1.03.  Use newFoo instead.');
    // ...
}
```
* Add the [`@deprecated`](http://usejsdoc.org/tags-deprecated.html) doc tag.
* Remove all use of the deprecated API inside Cesium except for unit tests that specifically test the deprecated API.
* Mention the deprecation in the `Deprecated` section of [`CHANGES.md`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/CHANGES.md).  Include what Cesium version it will be removed in.
* Create an [issue](https://github.com/AnalyticalGraphicsInc/cesium/issues) to remove the API with the appropriate `remove in [version]` label.

## 第三方库 Third-Party Libraries

:house: Cesium 使用第三方库是非常谨慎的。如果你想要新添加一个第三方库，请先看看下面这些 [Cesium forum](http://cesiumjs.org/forum.html) ([example discussion](https://groups.google.com/forum/#!topic/cesium-dev/Bh4BolxlT80)). 第三方库应该具有以下特性
* 证书兼容性强比如像MIT, BSD, or Apache 2.0这样的。
* 第三方提供的功能是Cesium确实需要的并且开发团队没有时间或者技术来开发它。
* 第三库需要是轻量级、经过多次测试、可维护性强、并且已经被广泛使用。
* 不会和全局命名冲突。
* 提供足够的材料来证明确实需要集成一个需要维护的第三方库，因为使用第三方库会让潜在的用户评估Cesiumde时候轻微的反感它。（通常来说，最好尽量少使用第三方库）。

## Widgets

Cesium的`Viewer`中包含了一些标准的小部件，有动画和时间线控制，一个基本的底图选择器，一个地理解析器`geocoder`。这些控件的创建都是使用 [Knockout](http://knockoutjs.com/)) 自动化 UI 刷新完成的.  Knockout 使用 模型-视图-视图模型 设计模式(MVVM).  详细学习这些设计模式参考 [Understanding MVVM - A Guide For JavaScript Developers](https://addyosmani.com/blog/understanding-mvvm-a-guide-for-javascript-developers/)

想要如何使用 Knockout library, 参考 [Get started](http://knockoutjs.com/) 主页相关的部分.  那有个非常不错的教程 [interactive tutorial](http://learn.knockoutjs.com/) 帮助你一步一步使用Knockout。

Cesium也使用了 [Knockout-ES5](http://blog.stevensanderson.com/2013/05/20/knockout-es5-a-plugin-to-simplify-your-syntax/) 插件来简化knockout的语法。 它可以让我们使用其它的变量来实现 knockout observables 相同的效果.  调用 `knockout.track` 来创建 observables.  这个例子来之 [BaseLayerPickerViewModel](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Widgets/BaseLayerPicker/BaseLayerPickerViewModel.js#L73) 这让 observables 拥有 `tooltip`, `showInstructions`和 `_touch` 属性.

``` javascript
knockout.track(this, ['tooltip', 'showInstructions', '_touch']);
```

### Knockout subscriptions

Use a knockout subscription only when you are unable to accomplish what you need to do with a standard binding.  For [example](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Widgets/Viewer/Viewer.js#L588), the `Viewer` subscribes to `FullscreenButtonViewModel.isFullscreenEnabled` because it needs to change the width of the timeline widget when that value changes.  This cannot be done with binding because the value from `FullscreenButtonViewModel` is affecting a value not contained within that widget.

Cesium includes a [`subscribeAndEvaluate`](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Widgets/subscribeAndEvaluate.js) helper function for subscribing to knockout observable.

When using a subscription, always be sure to [dispose the subscription](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/Source/Widgets/Viewer/Viewer.js#L1413) when the viewmodel is no longer using it.  Otherwise the listener will continue to be notified for the lifetime of the observable.

```
fullscreenSubscription = subscribeAndEvaluate(fullscreenButton.viewModel, 'isFullscreenEnabled', function(isFullscreenEnabled) { ... });
// ...then later...
fullscreenSubscription.dispose(); 
```

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
* An `EC` suffix indicates the point or vector is in eye coordinates, e.g.,
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

* :speedboat: Compute expensive values as infrequently as possible, e.g., prefer computing a value in JavaScript and passing it in a uniform instead of redundantly computing the same value per-vertex.  Likewise, prefer to compute a value per-vertex and pass a varying, instead of computing per-fragment when possible.
* :speedboat: Use `discard` sparingly since it disables early-z GPU optimizations.

## Resources

See Section 4.1 to 4.3 of [Getting Serious with JavaScript](http://webglinsights.github.io/downloads/WebGL-Insights-Chapter-4.pdf) by Cesium contributors Matthew Amato and Kevin Ring in _WebGL Insights_ for deeper coverage of modules and performance.

Watch [From Console to Chrome](https://www.youtube.com/watch?v=XAqIpGU8ZZk) by Lilli Thompson for even deeper performance coverage.
>>>>>>> origin/master
