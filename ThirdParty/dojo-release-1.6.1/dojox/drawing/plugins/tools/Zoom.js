/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.plugins.tools.Zoom"]){
dojo._hasResource["dojox.drawing.plugins.tools.Zoom"]=true;
dojo.provide("dojox.drawing.plugins.tools.Zoom");
dojo.require("dojox.drawing.plugins._Plugin");
(function(){
var _1=Math.pow(2,0.25),_2=10,_3=0.1,_4=1,dt=dojox.drawing.plugins.tools;
dt.ZoomIn=dojox.drawing.util.oo.declare(function(_5){
},{});
dt.ZoomIn=dojox.drawing.util.oo.declare(dojox.drawing.plugins._Plugin,function(_6){
},{type:"dojox.drawing.plugins.tools.ZoomIn",onZoomIn:function(){
_4*=_1;
_4=Math.min(_4,_2);
this.canvas.setZoom(_4);
this.mouse.setZoom(_4);
},onClick:function(){
this.onZoomIn();
}});
dt.Zoom100=dojox.drawing.util.oo.declare(dojox.drawing.plugins._Plugin,function(_7){
},{type:"dojox.drawing.plugins.tools.Zoom100",onZoom100:function(){
_4=1;
this.canvas.setZoom(_4);
this.mouse.setZoom(_4);
},onClick:function(){
this.onZoom100();
}});
dt.ZoomOut=dojox.drawing.util.oo.declare(dojox.drawing.plugins._Plugin,function(_8){
},{type:"dojox.drawing.plugins.tools.ZoomOut",onZoomOut:function(){
_4/=_1;
_4=Math.max(_4,_3);
this.canvas.setZoom(_4);
this.mouse.setZoom(_4);
},onClick:function(){
this.onZoomOut();
}});
dt.ZoomIn.setup={name:"dojox.drawing.plugins.tools.ZoomIn",tooltip:"Zoom In"};
dojox.drawing.register(dt.ZoomIn.setup,"plugin");
dt.Zoom100.setup={name:"dojox.drawing.plugins.tools.Zoom100",tooltip:"Zoom to 100%"};
dojox.drawing.register(dt.Zoom100.setup,"plugin");
dt.ZoomOut.setup={name:"dojox.drawing.plugins.tools.ZoomOut",tooltip:"Zoom In"};
dojox.drawing.register(dt.ZoomOut.setup,"plugin");
})();
}
