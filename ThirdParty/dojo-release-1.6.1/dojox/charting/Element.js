/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.Element"]){
dojo._hasResource["dojox.charting.Element"]=true;
dojo.provide("dojox.charting.Element");
dojo.require("dojox.gfx");
dojo.declare("dojox.charting.Element",null,{chart:null,group:null,htmlElements:null,dirty:true,constructor:function(_1){
this.chart=_1;
this.group=null;
this.htmlElements=[];
this.dirty=true;
this.trailingSymbol="...";
this._events=[];
},createGroup:function(_2){
if(!_2){
_2=this.chart.surface;
}
if(!this.group){
this.group=_2.createGroup();
}
return this;
},purgeGroup:function(){
this.destroyHtmlElements();
if(this.group){
this.group.clear();
this.group.removeShape();
this.group=null;
}
this.dirty=true;
if(this._events.length){
dojo.forEach(this._events,function(_3){
_3.shape.disconnect(_3.handle);
});
this._events=[];
}
return this;
},cleanGroup:function(_4){
this.destroyHtmlElements();
if(!_4){
_4=this.chart.surface;
}
if(this.group){
this.group.clear();
}else{
this.group=_4.createGroup();
}
this.dirty=true;
return this;
},destroyHtmlElements:function(){
if(this.htmlElements.length){
dojo.forEach(this.htmlElements,dojo.destroy);
this.htmlElements=[];
}
},destroy:function(){
this.purgeGroup();
},getTextWidth:function(s,_5){
return dojox.gfx._base._getTextBox(s,{font:_5}).w||0;
},getTextWithLimitLength:function(s,_6,_7,_8){
if(!s||s.length<=0){
return {text:"",truncated:_8||false};
}
if(!_7||_7<=0){
return {text:s,truncated:_8||false};
}
var _9=2,_a=0.618,_b=s.substring(0,1)+this.trailingSymbol,_c=this.getTextWidth(_b,_6);
if(_7<=_c){
return {text:_b,truncated:true};
}
var _d=this.getTextWidth(s,_6);
if(_d<=_7){
return {text:s,truncated:_8||false};
}else{
var _e=0,_f=s.length;
while(_e<_f){
if(_f-_e<=_9){
while(this.getTextWidth(s.substring(0,_e)+this.trailingSymbol,_6)>_7){
_e-=1;
}
return {text:(s.substring(0,_e)+this.trailingSymbol),truncated:true};
}
var _10=_e+Math.round((_f-_e)*_a),_11=this.getTextWidth(s.substring(0,_10),_6);
if(_11<_7){
_e=_10;
_f=_f;
}else{
_e=_e;
_f=_10;
}
}
}
},getTextWithLimitCharCount:function(s,_12,_13,_14){
if(!s||s.length<=0){
return {text:"",truncated:_14||false};
}
if(!_13||_13<=0||s.length<=_13){
return {text:s,truncated:_14||false};
}
return {text:s.substring(0,_13)+this.trailingSymbol,truncated:true};
},_plotFill:function(_15,dim,_16){
if(!_15||!_15.type||!_15.space){
return _15;
}
var _17=_15.space;
switch(_15.type){
case "linear":
if(_17==="plot"||_17==="shapeX"||_17==="shapeY"){
_15=dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient,_15);
_15.space=_17;
if(_17==="plot"||_17==="shapeX"){
var _18=dim.height-_16.t-_16.b;
_15.y1=_16.t+_18*_15.y1/100;
_15.y2=_16.t+_18*_15.y2/100;
}
if(_17==="plot"||_17==="shapeY"){
var _18=dim.width-_16.l-_16.r;
_15.x1=_16.l+_18*_15.x1/100;
_15.x2=_16.l+_18*_15.x2/100;
}
}
break;
case "radial":
if(_17==="plot"){
_15=dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient,_15);
_15.space=_17;
var _19=dim.width-_16.l-_16.r,_1a=dim.height-_16.t-_16.b;
_15.cx=_16.l+_19*_15.cx/100;
_15.cy=_16.t+_1a*_15.cy/100;
_15.r=_15.r*Math.sqrt(_19*_19+_1a*_1a)/200;
}
break;
case "pattern":
if(_17==="plot"||_17==="shapeX"||_17==="shapeY"){
_15=dojox.gfx.makeParameters(dojox.gfx.defaultPattern,_15);
_15.space=_17;
if(_17==="plot"||_17==="shapeX"){
var _18=dim.height-_16.t-_16.b;
_15.y=_16.t+_18*_15.y/100;
_15.height=_18*_15.height/100;
}
if(_17==="plot"||_17==="shapeY"){
var _18=dim.width-_16.l-_16.r;
_15.x=_16.l+_18*_15.x/100;
_15.width=_18*_15.width/100;
}
}
break;
}
return _15;
},_shapeFill:function(_1b,_1c){
if(!_1b||!_1b.space){
return _1b;
}
var _1d=_1b.space;
switch(_1b.type){
case "linear":
if(_1d==="shape"||_1d==="shapeX"||_1d==="shapeY"){
_1b=dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient,_1b);
_1b.space=_1d;
if(_1d==="shape"||_1d==="shapeX"){
var _1e=_1c.width;
_1b.x1=_1c.x+_1e*_1b.x1/100;
_1b.x2=_1c.x+_1e*_1b.x2/100;
}
if(_1d==="shape"||_1d==="shapeY"){
var _1e=_1c.height;
_1b.y1=_1c.y+_1e*_1b.y1/100;
_1b.y2=_1c.y+_1e*_1b.y2/100;
}
}
break;
case "radial":
if(_1d==="shape"){
_1b=dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient,_1b);
_1b.space=_1d;
_1b.cx=_1c.x+_1c.width/2;
_1b.cy=_1c.y+_1c.height/2;
_1b.r=_1b.r*_1c.width/200;
}
break;
case "pattern":
if(_1d==="shape"||_1d==="shapeX"||_1d==="shapeY"){
_1b=dojox.gfx.makeParameters(dojox.gfx.defaultPattern,_1b);
_1b.space=_1d;
if(_1d==="shape"||_1d==="shapeX"){
var _1e=_1c.width;
_1b.x=_1c.x+_1e*_1b.x/100;
_1b.width=_1e*_1b.width/100;
}
if(_1d==="shape"||_1d==="shapeY"){
var _1e=_1c.height;
_1b.y=_1c.y+_1e*_1b.y/100;
_1b.height=_1e*_1b.height/100;
}
}
break;
}
return _1b;
},_pseudoRadialFill:function(_1f,_20,_21,_22,end){
if(!_1f||_1f.type!=="radial"||_1f.space!=="shape"){
return _1f;
}
var _23=_1f.space;
_1f=dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient,_1f);
_1f.space=_23;
if(arguments.length<4){
_1f.cx=_20.x;
_1f.cy=_20.y;
_1f.r=_1f.r*_21/100;
return _1f;
}
var _24=arguments.length<5?_22:(end+_22)/2;
return {type:"linear",x1:_20.x,y1:_20.y,x2:_20.x+_1f.r*_21*Math.cos(_24)/100,y2:_20.y+_1f.r*_21*Math.sin(_24)/100,colors:_1f.colors};
return _1f;
}});
}
