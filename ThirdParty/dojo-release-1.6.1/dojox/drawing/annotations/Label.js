/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.annotations.Label"]){
dojo._hasResource["dojox.drawing.annotations.Label"]=true;
dojo.provide("dojox.drawing.annotations.Label");
dojo.require("dojox.drawing.stencil.Text");
dojox.drawing.annotations.Label=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Text,function(_1){
this.master=_1.stencil;
this.labelPosition=_1.labelPosition||"BR";
if(dojo.isFunction(this.labelPosition)){
this.setLabel=this.setLabelCustom;
}
this.setLabel(_1.text||"");
this.connect(this.master,"onTransform",this,"setLabel");
this.connect(this.master,"destroy",this,"destroy");
if(this.style.labelSameColor){
this.connect(this.master,"attr",this,"beforeAttr");
}
},{_align:"start",drawingType:"label",setLabelCustom:function(_2){
var d=dojo.hitch(this.master,this.labelPosition)();
this.setData({x:d.x,y:d.y,width:d.w||this.style.text.minWidth,height:d.h||this._lineHeight});
if(_2&&!_2.split){
_2=this.getText();
}
this.render(this.typesetter(_2));
},setLabel:function(_3){
var x,y,_4=this.master.getBounds();
if(/B/.test(this.labelPosition)){
y=_4.y2-this._lineHeight;
}else{
y=_4.y1;
}
if(/R/.test(this.labelPosition)){
x=_4.x2;
}else{
y=_4.y1;
this._align="end";
}
if(!this.labelWidth||(_3&&_3.split&&_3!=this.getText())){
this.setData({x:x,y:y,height:this._lineHeight,width:this.style.text.minWidth});
this.labelWidth=this.style.text.minWidth;
this.render(this.typesetter(_3));
}else{
this.setData({x:x,y:y,height:this.data.height,width:this.data.width});
this.render();
}
},beforeAttr:function(_5,_6){
if(_6!==undefined){
var k=_5;
_5={};
_5[k]=_6;
}
delete _5.x;
delete _5.y;
delete _5.width;
delete _5.height;
this.attr(_5);
!this.created&&this.render();
}});
}
