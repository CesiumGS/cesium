/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.path"]){
dojo._hasResource["dojox.gfx.path"]=true;
dojo.provide("dojox.gfx.path");
dojo.require("dojox.gfx.matrix");
dojo.require("dojox.gfx.shape");
dojo.declare("dojox.gfx.path.Path",dojox.gfx.shape.Shape,{constructor:function(_1){
this.shape=dojo.clone(dojox.gfx.defaultPath);
this.segments=[];
this.tbbox=null;
this.absolute=true;
this.last={};
this.rawNode=_1;
this.segmented=false;
},setAbsoluteMode:function(_2){
this._confirmSegmented();
this.absolute=typeof _2=="string"?(_2=="absolute"):_2;
return this;
},getAbsoluteMode:function(){
this._confirmSegmented();
return this.absolute;
},getBoundingBox:function(){
this._confirmSegmented();
return (this.bbox&&("l" in this.bbox))?{x:this.bbox.l,y:this.bbox.t,width:this.bbox.r-this.bbox.l,height:this.bbox.b-this.bbox.t}:null;
},_getRealBBox:function(){
this._confirmSegmented();
if(this.tbbox){
return this.tbbox;
}
var _3=this.bbox,_4=this._getRealMatrix();
this.bbox=null;
for(var i=0,_5=this.segments.length;i<_5;++i){
this._updateWithSegment(this.segments[i],_4);
}
var t=this.bbox;
this.bbox=_3;
this.tbbox=t?[{x:t.l,y:t.t},{x:t.r,y:t.t},{x:t.r,y:t.b},{x:t.l,y:t.b}]:null;
return this.tbbox;
},getLastPosition:function(){
this._confirmSegmented();
return "x" in this.last?this.last:null;
},_applyTransform:function(){
this.tbbox=null;
return this.inherited(arguments);
},_updateBBox:function(x,y,_6){
if(_6){
var t=dojox.gfx.matrix.multiplyPoint(_6,x,y);
x=t.x;
y=t.y;
}
if(this.bbox&&("l" in this.bbox)){
if(this.bbox.l>x){
this.bbox.l=x;
}
if(this.bbox.r<x){
this.bbox.r=x;
}
if(this.bbox.t>y){
this.bbox.t=y;
}
if(this.bbox.b<y){
this.bbox.b=y;
}
}else{
this.bbox={l:x,b:y,r:x,t:y};
}
},_updateWithSegment:function(_7,_8){
var n=_7.args,l=n.length;
switch(_7.action){
case "M":
case "L":
case "C":
case "S":
case "Q":
case "T":
for(var i=0;i<l;i+=2){
this._updateBBox(n[i],n[i+1],_8);
}
this.last.x=n[l-2];
this.last.y=n[l-1];
this.absolute=true;
break;
case "H":
for(var i=0;i<l;++i){
this._updateBBox(n[i],this.last.y,_8);
}
this.last.x=n[l-1];
this.absolute=true;
break;
case "V":
for(var i=0;i<l;++i){
this._updateBBox(this.last.x,n[i],_8);
}
this.last.y=n[l-1];
this.absolute=true;
break;
case "m":
var _9=0;
if(!("x" in this.last)){
this._updateBBox(this.last.x=n[0],this.last.y=n[1],_8);
_9=2;
}
for(var i=_9;i<l;i+=2){
this._updateBBox(this.last.x+=n[i],this.last.y+=n[i+1],_8);
}
this.absolute=false;
break;
case "l":
case "t":
for(var i=0;i<l;i+=2){
this._updateBBox(this.last.x+=n[i],this.last.y+=n[i+1],_8);
}
this.absolute=false;
break;
case "h":
for(var i=0;i<l;++i){
this._updateBBox(this.last.x+=n[i],this.last.y,_8);
}
this.absolute=false;
break;
case "v":
for(var i=0;i<l;++i){
this._updateBBox(this.last.x,this.last.y+=n[i],_8);
}
this.absolute=false;
break;
case "c":
for(var i=0;i<l;i+=6){
this._updateBBox(this.last.x+n[i],this.last.y+n[i+1],_8);
this._updateBBox(this.last.x+n[i+2],this.last.y+n[i+3],_8);
this._updateBBox(this.last.x+=n[i+4],this.last.y+=n[i+5],_8);
}
this.absolute=false;
break;
case "s":
case "q":
for(var i=0;i<l;i+=4){
this._updateBBox(this.last.x+n[i],this.last.y+n[i+1],_8);
this._updateBBox(this.last.x+=n[i+2],this.last.y+=n[i+3],_8);
}
this.absolute=false;
break;
case "A":
for(var i=0;i<l;i+=7){
this._updateBBox(n[i+5],n[i+6],_8);
}
this.last.x=n[l-2];
this.last.y=n[l-1];
this.absolute=true;
break;
case "a":
for(var i=0;i<l;i+=7){
this._updateBBox(this.last.x+=n[i+5],this.last.y+=n[i+6],_8);
}
this.absolute=false;
break;
}
var _a=[_7.action];
for(var i=0;i<l;++i){
_a.push(dojox.gfx.formatNumber(n[i],true));
}
if(typeof this.shape.path=="string"){
this.shape.path+=_a.join("");
}else{
Array.prototype.push.apply(this.shape.path,_a);
}
},_validSegments:{m:2,l:2,h:1,v:1,c:6,s:4,q:4,t:2,a:7,z:0},_pushSegment:function(_b,_c){
this.tbbox=null;
var _d=this._validSegments[_b.toLowerCase()];
if(typeof _d=="number"){
if(_d){
if(_c.length>=_d){
var _e={action:_b,args:_c.slice(0,_c.length-_c.length%_d)};
this.segments.push(_e);
this._updateWithSegment(_e);
}
}else{
var _e={action:_b,args:[]};
this.segments.push(_e);
this._updateWithSegment(_e);
}
}
},_collectArgs:function(_f,_10){
for(var i=0;i<_10.length;++i){
var t=_10[i];
if(typeof t=="boolean"){
_f.push(t?1:0);
}else{
if(typeof t=="number"){
_f.push(t);
}else{
if(t instanceof Array){
this._collectArgs(_f,t);
}else{
if("x" in t&&"y" in t){
_f.push(t.x,t.y);
}
}
}
}
}
},moveTo:function(){
this._confirmSegmented();
var _11=[];
this._collectArgs(_11,arguments);
this._pushSegment(this.absolute?"M":"m",_11);
return this;
},lineTo:function(){
this._confirmSegmented();
var _12=[];
this._collectArgs(_12,arguments);
this._pushSegment(this.absolute?"L":"l",_12);
return this;
},hLineTo:function(){
this._confirmSegmented();
var _13=[];
this._collectArgs(_13,arguments);
this._pushSegment(this.absolute?"H":"h",_13);
return this;
},vLineTo:function(){
this._confirmSegmented();
var _14=[];
this._collectArgs(_14,arguments);
this._pushSegment(this.absolute?"V":"v",_14);
return this;
},curveTo:function(){
this._confirmSegmented();
var _15=[];
this._collectArgs(_15,arguments);
this._pushSegment(this.absolute?"C":"c",_15);
return this;
},smoothCurveTo:function(){
this._confirmSegmented();
var _16=[];
this._collectArgs(_16,arguments);
this._pushSegment(this.absolute?"S":"s",_16);
return this;
},qCurveTo:function(){
this._confirmSegmented();
var _17=[];
this._collectArgs(_17,arguments);
this._pushSegment(this.absolute?"Q":"q",_17);
return this;
},qSmoothCurveTo:function(){
this._confirmSegmented();
var _18=[];
this._collectArgs(_18,arguments);
this._pushSegment(this.absolute?"T":"t",_18);
return this;
},arcTo:function(){
this._confirmSegmented();
var _19=[];
this._collectArgs(_19,arguments);
this._pushSegment(this.absolute?"A":"a",_19);
return this;
},closePath:function(){
this._confirmSegmented();
this._pushSegment("Z",[]);
return this;
},_confirmSegmented:function(){
if(!this.segmented){
var _1a=this.shape.path;
this.shape.path=[];
this._setPath(_1a);
this.shape.path=this.shape.path.join("");
this.segmented=true;
}
},_setPath:function(_1b){
var p=dojo.isArray(_1b)?_1b:_1b.match(dojox.gfx.pathSvgRegExp);
this.segments=[];
this.absolute=true;
this.bbox={};
this.last={};
if(!p){
return;
}
var _1c="",_1d=[],l=p.length;
for(var i=0;i<l;++i){
var t=p[i],x=parseFloat(t);
if(isNaN(x)){
if(_1c){
this._pushSegment(_1c,_1d);
}
_1d=[];
_1c=t;
}else{
_1d.push(x);
}
}
this._pushSegment(_1c,_1d);
},setShape:function(_1e){
this.inherited(arguments,[typeof _1e=="string"?{path:_1e}:_1e]);
this.segmented=false;
this.segments=[];
if(!dojox.gfx.lazyPathSegmentation){
this._confirmSegmented();
}
return this;
},_2PI:Math.PI*2});
dojo.declare("dojox.gfx.path.TextPath",dojox.gfx.path.Path,{constructor:function(_1f){
if(!("text" in this)){
this.text=dojo.clone(dojox.gfx.defaultTextPath);
}
if(!("fontStyle" in this)){
this.fontStyle=dojo.clone(dojox.gfx.defaultFont);
}
},getText:function(){
return this.text;
},setText:function(_20){
this.text=dojox.gfx.makeParameters(this.text,typeof _20=="string"?{text:_20}:_20);
this._setText();
return this;
},getFont:function(){
return this.fontStyle;
},setFont:function(_21){
this.fontStyle=typeof _21=="string"?dojox.gfx.splitFontString(_21):dojox.gfx.makeParameters(dojox.gfx.defaultFont,_21);
this._setFont();
return this;
}});
}
