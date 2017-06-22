# cesium 渲染流程
首先在`viewer`中是自动控制渲染的，关键的参数是`useDefaultRenderLoop`。这个参数继承自ceisumWidget,这个参数控制是否调用`startRenderLoop`。
每一帧的渲染过程基本都在`scene.render()`函数中，这个函数接受一个`scene`和`time`作为输入参数。接下来一步一步看这个函数都做了什么。

---------------------
```JavaScript
if (!defined(time)) {
    time = JulianDate.now();
}
```
首先判断`time`是否被定义，没有就把当前时间赋给`time`。
<br><br>
```JavaScript
var camera = scene._camera;
if (!cameraEqual(camera, scene._cameraClone, CesiumMath.EPSILON6)) {
    if (!scene._cameraStartFired) {
        camera.moveStart.raiseEvent();
        scene._cameraStartFired = true;
    }
    scene._cameraMovedTime = getTimestamp();
    Camera.clone(camera, scene._cameraClone);
} else if (scene._cameraStartFired && getTimestamp() - scene._cameraMovedTime > scene.cameraEventWaitTime) {
    camera.moveEnd.raiseEvent();
    scene._cameraStartFired = false;
}
```
`_cameraStartFired`是一个标记表示是否在处理过相机变动的过程中。
这段主要是启动相机开始移动事件和相机结束移动事件。首先判断相机是否相等，如果`_cameraStartFired`不为真那么启动相机开始移动事件，并且设置`_cameraStartFired`为真。然后记录移动的时间，保存当前相机状态。默认是当相机超过500毫秒没有移动时则表示整个相机移动事件结束。

:bulb: 其中`cameraEqual`函数中对`camera.position`特殊处理是为了保证以相同的精度标准来判断相机各属性是否相等。

