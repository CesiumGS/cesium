/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.ui.dom.Zoom"]){
dojo._hasResource["dojox.drawing.ui.dom.Zoom"]=true;
dojo.provide("dojox.drawing.ui.dom.Zoom");
dojo.require("dojox.drawing.plugins._Plugin");
dojox.drawing.ui.dom.Zoom=dojox.drawing.util.oo.declare(dojox.drawing.plugins._Plugin,function(_1){
var _2=_1.node.className;
var _3=_1.node.innerHTML;
this.domNode=dojo.create("div",{id:"btnZoom","class":"toolCombo"},_1.node,"replace");
this.makeButton("ZoomIn",this.topClass);
this.makeButton("Zoom100",this.midClass);
this.makeButton("ZoomOut",this.botClass);
},{type:"dojox.drawing.ui.dom.Zoom",zoomInc:0.1,maxZoom:10,minZoom:0.1,zoomFactor:1,baseClass:"drawingButton",topClass:"toolComboTop",midClass:"toolComboMid",botClass:"toolComboBot",makeButton:function(_4,_5){
var _6=dojo.create("div",{id:"btn"+_4,"class":this.baseClass+" "+_5,innerHTML:"<div title=\"Zoom In\" class=\"icon icon"+_4+"\"></div>"},this.domNode);
dojo.connect(document,"mouseup",function(_7){
dojo.stopEvent(_7);
dojo.removeClass(_6,"active");
});
dojo.connect(_6,"mouseup",this,function(_8){
dojo.stopEvent(_8);
dojo.removeClass(_6,"active");
this["on"+_4]();
});
dojo.connect(_6,"mouseover",function(_9){
dojo.stopEvent(_9);
dojo.addClass(_6,"hover");
});
dojo.connect(_6,"mousedown",this,function(_a){
dojo.stopEvent(_a);
dojo.addClass(_6,"active");
});
dojo.connect(_6,"mouseout",this,function(_b){
dojo.stopEvent(_b);
dojo.removeClass(_6,"hover");
});
},onZoomIn:function(_c){
this.zoomFactor+=this.zoomInc;
this.zoomFactor=Math.min(this.zoomFactor,this.maxZoom);
this.canvas.setZoom(this.zoomFactor);
this.mouse.setZoom(this.zoomFactor);
},onZoom100:function(_d){
this.zoomFactor=1;
this.canvas.setZoom(this.zoomFactor);
this.mouse.setZoom(this.zoomFactor);
},onZoomOut:function(_e){
this.zoomFactor-=this.zoomInc;
this.zoomFactor=Math.max(this.zoomFactor,this.minZoom);
this.canvas.setZoom(this.zoomFactor);
this.mouse.setZoom(this.zoomFactor);
}});
}
