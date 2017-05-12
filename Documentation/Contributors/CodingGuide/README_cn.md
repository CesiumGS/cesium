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
