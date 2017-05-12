编码规则
==========

Cesium是世界上最大的JavaScript代码库之一。 自从创建以来，我们希望保持高标准的代码质量，这使得代码库更加容易被新的和有经验的贡献者使用。 我们希望你找到的代码库是干净和一致的。

除了描述典型的编码约定之外，本指南还介绍了设计，可维护性和性能的最佳实践。 这是来自多年的开发，研究和实验是许多开发商的累积建议。

:art: 调色板图标表示这个提示建议是关于设计。

:house: 房子图标表示可维护性提示。 实际上整个指南也是是关于如何编写可维护的代码的规则。

:speedboat: 快艇表示这是一个性能提示建议。

在某种程度上来说，本指南可以总结为与现有代码相似的新代码。


命名
----
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

编码格式
-----------
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
计量单位
---------
* Cesium使用国际标准单位
 * 表示距离用米
 * 角用弧度表示
 * 时间及时间间隔用秒
* 如果一个函数使用的参数不是使用标准单位则需要将单位名字写到函数中。 例如：
```JavaScript
Cartesian3.fromDegrees = function(longitude, latitude, height, ellipsoid, result) { /* ... */ }
```
 
