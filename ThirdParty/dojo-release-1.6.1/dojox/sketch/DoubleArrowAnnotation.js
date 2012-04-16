/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sketch.DoubleArrowAnnotation"]){
dojo._hasResource["dojox.sketch.DoubleArrowAnnotation"]=true;
dojo.provide("dojox.sketch.DoubleArrowAnnotation");
dojo.require("dojox.sketch.Annotation");
dojo.require("dojox.sketch.Anchor");
(function(){
var ta=dojox.sketch;
ta.DoubleArrowAnnotation=function(_1,id){
ta.Annotation.call(this,_1,id);
this.transform={dx:0,dy:0};
this.start={x:0,y:0};
this.control={x:100,y:-50};
this.end={x:200,y:0};
this.textPosition={x:0,y:0};
this.textOffset=6;
this.textYOffset=10;
this.textAlign="middle";
this.startRotation=0;
this.endRotation=0;
this.labelShape=null;
this.pathShape=null;
this.startArrow=null;
this.startArrowGroup=null;
this.endArrow=null;
this.endArrowGroup=null;
this.anchors.start=new ta.Anchor(this,"start");
this.anchors.control=new ta.Anchor(this,"control");
this.anchors.end=new ta.Anchor(this,"end");
};
ta.DoubleArrowAnnotation.prototype=new ta.Annotation;
var p=ta.DoubleArrowAnnotation.prototype;
p.constructor=ta.DoubleArrowAnnotation;
p.type=function(){
return "DoubleArrow";
};
p.getType=function(){
return ta.DoubleArrowAnnotation;
};
p._rot=function(){
var _2=this.control.y-this.start.y;
var _3=this.control.x-this.start.x;
this.startRotation=Math.atan2(_2,_3);
_2=this.end.y-this.control.y;
_3=this.end.x-this.control.x;
this.endRotation=Math.atan2(_2,_3);
};
p._pos=function(){
var _4=this.textOffset;
if(this.control.y<this.end.y){
_4*=-1;
}else{
_4+=this.textYOffset;
}
var ab={x:((this.control.x-this.start.x)*0.5)+this.start.x,y:((this.control.y-this.start.y)*0.5)+this.start.y};
var bc={x:((this.end.x-this.control.x)*0.5)+this.control.x,y:((this.end.y-this.control.y)*0.5)+this.control.y};
this.textPosition={x:((bc.x-ab.x)*0.5)+ab.x,y:(((bc.y-ab.y)*0.5)+ab.y)+_4};
};
p.apply=function(_5){
if(!_5){
return;
}
if(_5.documentElement){
_5=_5.documentElement;
}
this.readCommonAttrs(_5);
for(var i=0;i<_5.childNodes.length;i++){
var c=_5.childNodes[i];
if(c.localName=="text"){
this.property("label",c.childNodes.length?c.childNodes[0].nodeValue:"");
}else{
if(c.localName=="path"){
var d=c.getAttribute("d").split(" ");
var s=d[0].split(",");
this.start.x=parseFloat(s[0].substr(1),10);
this.start.y=parseFloat(s[1],10);
s=d[1].split(",");
this.control.x=parseFloat(s[0].substr(1),10);
this.control.y=parseFloat(s[1],10);
s=d[2].split(",");
this.end.x=parseFloat(s[0],10);
this.end.y=parseFloat(s[1],10);
var _6=this.property("stroke");
var _7=c.getAttribute("style");
var m=_7.match(/stroke:([^;]+);/);
if(m){
_6.color=m[1];
this.property("fill",m[1]);
}
m=_7.match(/stroke-width:([^;]+);/);
if(m){
_6.width=m[1];
}
this.property("stroke",_6);
}
}
}
};
p.initialize=function(_8){
var _9=(ta.Annotation.labelFont)?ta.Annotation.labelFont:{family:"Times",size:"16px"};
this.apply(_8);
this._rot();
this._pos();
var _a=this.startRotation;
var _b=dojox.gfx.matrix.rotate(_a);
_a=this.endRotation;
var _c=dojox.gfx.matrix.rotateAt(_a,this.end.x,this.end.y);
this.shape=this.figure.group.createGroup();
this.shape.getEventSource().setAttribute("id",this.id);
this.pathShape=this.shape.createPath("M"+this.start.x+" "+this.start.y+"Q"+this.control.x+" "+this.control.y+" "+this.end.x+" "+this.end.y+" l0,0");
this.startArrowGroup=this.shape.createGroup().setTransform({dx:this.start.x,dy:this.start.y});
this.startArrowGroup.applyTransform(_b);
this.startArrow=this.startArrowGroup.createPath();
this.endArrowGroup=this.shape.createGroup().setTransform(_c);
this.endArrow=this.endArrowGroup.createPath();
this.labelShape=this.shape.createText({x:this.textPosition.x,y:this.textPosition.y,text:this.property("label"),align:this.textAlign}).setFill(this.property("fill"));
this.labelShape.getEventSource().setAttribute("id",this.id+"-labelShape");
this.draw();
};
p.destroy=function(){
if(!this.shape){
return;
}
this.startArrowGroup.remove(this.startArrow);
this.endArrowGroup.remove(this.endArrow);
this.shape.remove(this.startArrowGroup);
this.shape.remove(this.endArrowGroup);
this.shape.remove(this.pathShape);
this.shape.remove(this.labelShape);
this.figure.group.remove(this.shape);
this.shape=this.pathShape=this.labelShape=this.startArrowGroup=this.startArrow=this.endArrowGroup=this.endArrow=null;
};
p.draw=function(_d){
this.apply(_d);
this._rot();
this._pos();
var _e=this.startRotation;
var _f=dojox.gfx.matrix.rotate(_e);
_e=this.endRotation;
var _10=dojox.gfx.matrix.rotateAt(_e,this.end.x,this.end.y);
this.shape.setTransform(this.transform);
this.pathShape.setShape("M"+this.start.x+" "+this.start.y+" Q"+this.control.x+" "+this.control.y+" "+this.end.x+" "+this.end.y+" l0,0");
this.startArrowGroup.setTransform({dx:this.start.x,dy:this.start.y}).applyTransform(_f);
this.startArrow.setFill(this.property("fill"));
this.endArrowGroup.setTransform(_10);
this.endArrow.setFill(this.property("fill"));
this.labelShape.setShape({x:this.textPosition.x,y:this.textPosition.y,text:this.property("label")}).setFill(this.property("fill"));
this.zoom();
};
p.zoom=function(pct){
if(this.startArrow){
pct=pct||this.figure.zoomFactor;
ta.Annotation.prototype.zoom.call(this,pct);
var l=pct>1?20:Math.floor(20/pct),w=pct>1?5:Math.floor(5/pct),h=pct>1?3:Math.floor(3/pct);
this.startArrow.setShape("M0,0 l"+l+",-"+w+" -"+h+","+w+" "+h+","+w+" Z");
this.endArrow.setShape("M"+this.end.x+","+this.end.y+" l-"+l+",-"+w+" "+h+","+w+" -"+h+","+w+" Z");
}
};
p.getBBox=function(){
var x=Math.min(this.start.x,this.control.x,this.end.x);
var y=Math.min(this.start.y,this.control.y,this.end.y);
var w=Math.max(this.start.x,this.control.x,this.end.x)-x;
var h=Math.max(this.start.y,this.control.y,this.end.y)-y;
return {x:x,y:y,width:w,height:h};
};
p.serialize=function(){
var s=this.property("stroke");
return "<g "+this.writeCommonAttrs()+">"+"<path style=\"stroke:"+s.color+";stroke-width:"+s.width+";fill:none;\" d=\""+"M"+this.start.x+","+this.start.y+" "+"Q"+this.control.x+","+this.control.y+" "+this.end.x+","+this.end.y+"\" />"+"<g transform=\"translate("+this.start.x+","+this.start.y+") "+"rotate("+(Math.round((this.startRotation*(180/Math.PI))*Math.pow(10,4))/Math.pow(10,4))+")\">"+"<path style=\"fill:"+s.color+";\" d=\"M0,0 l20,-5, -3,5, 3,5 Z\" />"+"</g>"+"<g transform=\"rotate("+(Math.round((this.endRotation*(180/Math.PI))*Math.pow(10,4))/Math.pow(10,4))+", "+this.end.x+", "+this.end.y+")\">"+"<path style=\"fill:"+s.color+";\" d=\"M"+this.end.x+","+this.end.y+" l-20,-5, 3,5, -3,5 Z\" />"+"</g>"+"<text style=\"fill:"+s.color+";text-anchor:"+this.textAlign+"\" font-weight=\"bold\" "+"x=\""+this.textPosition.x+"\" "+"y=\""+this.textPosition.y+"\">"+this.property("label")+"</text>"+"</g>";
};
ta.Annotation.register("DoubleArrow");
})();
}
