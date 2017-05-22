# cesium 渲染流程
首先在`viewer`中是自动控制渲染的，关键的参数是`useDefaultRenderLoop`。这个参数继承自ceisumWidget,这个参数控制是否调用`startRenderLoop`。
