/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sketch.UnderlineAnnotation"]){
dojo._hasResource["dojox.sketch.UnderlineAnnotation"]=true;
dojo.provide("dojox.sketch.UnderlineAnnotation");
dojo.require("dojox.sketch.Annotation");
dojo.require("dojox.sketch.Anchor");
(function(){
var ta=dojox.sketch;
ta.UnderlineAnnotation=function(_1,id){
ta.Annotation.call(this,_1,id);
this.transform={dx:0,dy:0};
this.start={x:0,y:0};
this.property("label","#");
this.labelShape=null;
this.lineShape=null;
};
ta.UnderlineAnnotation.prototype=new ta.Annotation;
var p=ta.UnderlineAnnotation.prototype;
p.constructor=ta.UnderlineAnnotation;
p.type=function(){
return "Underline";
};
p.getType=function(){
return ta.UnderlineAnnotation;
};
p.apply=function(_2){
if(!_2){
return;
}
if(_2.documentElement){
_2=_2.documentElement;
}
this.readCommonAttrs(_2);
for(var i=0;i<_2.childNodes.length;i++){
var c=_2.childNodes[i];
if(c.localName=="text"){
this.property("label",c.childNodes[0].nodeValue);
var _3=c.getAttribute("style");
var m=_3.match(/fill:([^;]+);/);
if(m){
var _4=this.property("stroke");
_4.collor=m[1];
this.property("stroke",_4);
this.property("fill",_4.collor);
}
}
}
};
p.initialize=function(_5){
this.apply(_5);
this.shape=this.figure.group.createGroup();
this.shape.getEventSource().setAttribute("id",this.id);
this.labelShape=this.shape.createText({x:0,y:0,text:this.property("label"),decoration:"underline",align:"start"});
this.labelShape.getEventSource().setAttribute("id",this.id+"-labelShape");
this.lineShape=this.shape.createLine({x1:1,x2:this.labelShape.getTextWidth(),y1:2,y2:2});
this.lineShape.getEventSource().setAttribute("shape-rendering","crispEdges");
this.draw();
};
p.destroy=function(){
if(!this.shape){
return;
}
this.shape.remove(this.labelShape);
this.shape.remove(this.lineShape);
this.figure.group.remove(this.shape);
this.shape=this.lineShape=this.labelShape=null;
};
p.getBBox=function(){
var b=this.getTextBox();
var z=this.figure.zoomFactor;
return {x:0,y:(b.h*-1+4)/z,width:(b.w+2)/z,height:b.h/z};
};
p.draw=function(_6){
this.apply(_6);
this.shape.setTransform(this.transform);
this.labelShape.setShape({x:0,y:0,text:this.property("label")}).setFill(this.property("fill"));
this.zoom();
};
p.zoom=function(_7){
if(this.labelShape){
_7=_7||this.figure.zoomFactor;
var _8=dojox.gfx.renderer=="vml"?0:2/_7;
ta.Annotation.prototype.zoom.call(this,_7);
_7=dojox.gfx.renderer=="vml"?1:_7;
this.lineShape.setShape({x1:0,x2:this.getBBox().width-_8,y1:2,y2:2}).setStroke({color:this.property("fill"),width:1/_7});
if(this.mode==ta.Annotation.Modes.Edit){
this.drawBBox();
}
}
};
p.serialize=function(){
var s=this.property("stroke");
return "<g "+this.writeCommonAttrs()+">"+"<text style=\"fill:"+this.property("fill")+";\" font-weight=\"bold\" text-decoration=\"underline\" "+"x=\"0\" y=\"0\">"+this.property("label")+"</text>"+"</g>";
};
dojo.declare("dojox.sketch.UnderlineAnnotationTool",ta.AnnotationTool,{onMouseDown:function(){
},onMouseUp:function(){
var f=this.figure;
if(!f._start){
return;
}
f._end={x:0,y:0};
this._create(f._start,{x:f._start.x+10,y:f._start.y+10});
},onMouseMove:function(){
}});
ta.Annotation.register("Underline",ta.UnderlineAnnotationTool);
})();
}
