/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.axis2d.Invisible"]){
dojo._hasResource["dojox.charting.axis2d.Invisible"]=true;
dojo.provide("dojox.charting.axis2d.Invisible");
dojo.require("dojox.charting.scaler.linear");
dojo.require("dojox.charting.axis2d.common");
dojo.require("dojox.charting.axis2d.Base");
dojo.require("dojo.string");
dojo.require("dojox.gfx");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.utils");
(function(){
var dc=dojox.charting,df=dojox.lang.functional,du=dojox.lang.utils,g=dojox.gfx,_1=dc.scaler.linear,_2=du.merge,_3=4,_4=45;
dojo.declare("dojox.charting.axis2d.Invisible",dojox.charting.axis2d.Base,{defaultParams:{vertical:false,fixUpper:"none",fixLower:"none",natural:false,leftBottom:true,includeZero:false,fixed:true,majorLabels:true,minorTicks:true,minorLabels:true,microTicks:false,rotation:0},optionalParams:{min:0,max:1,from:0,to:1,majorTickStep:4,minorTickStep:2,microTickStep:1,labels:[],labelFunc:null,maxLabelSize:0,maxLabelCharCount:0,trailingSymbol:null},constructor:function(_5,_6){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_6);
du.updateWithPattern(this.opt,_6,this.optionalParams);
},dependOnData:function(){
return !("min" in this.opt)||!("max" in this.opt);
},clear:function(){
delete this.scaler;
delete this.ticks;
this.dirty=true;
return this;
},initialized:function(){
return "scaler" in this&&!(this.dirty&&this.dependOnData());
},setWindow:function(_7,_8){
this.scale=_7;
this.offset=_8;
return this.clear();
},getWindowScale:function(){
return "scale" in this?this.scale:1;
},getWindowOffset:function(){
return "offset" in this?this.offset:0;
},_groupLabelWidth:function(_9,_a,_b){
if(!_9.length){
return 0;
}
if(dojo.isObject(_9[0])){
_9=df.map(_9,function(_c){
return _c.text;
});
}
if(_b){
_9=df.map(_9,function(_d){
return dojo.trim(_d).length==0?"":_d.substring(0,_b)+this.trailingSymbol;
},this);
}
var s=_9.join("<br>");
return dojox.gfx._base._getTextBox(s,{font:_a}).w||0;
},calculate:function(_e,_f,_10,_11){
if(this.initialized()){
return this;
}
var o=this.opt;
this.labels="labels" in o?o.labels:_11;
this.scaler=_1.buildScaler(_e,_f,_10,o);
var tsb=this.scaler.bounds;
if("scale" in this){
o.from=tsb.lower+this.offset;
o.to=(tsb.upper-tsb.lower)/this.scale+o.from;
if(!isFinite(o.from)||isNaN(o.from)||!isFinite(o.to)||isNaN(o.to)||o.to-o.from>=tsb.upper-tsb.lower){
delete o.from;
delete o.to;
delete this.scale;
delete this.offset;
}else{
if(o.from<tsb.lower){
o.to+=tsb.lower-o.from;
o.from=tsb.lower;
}else{
if(o.to>tsb.upper){
o.from+=tsb.upper-o.to;
o.to=tsb.upper;
}
}
this.offset=o.from-tsb.lower;
}
this.scaler=_1.buildScaler(_e,_f,_10,o);
tsb=this.scaler.bounds;
if(this.scale==1&&this.offset==0){
delete this.scale;
delete this.offset;
}
}
var ta=this.chart.theme.axis,_12=0,_13=o.rotation%360,_14=o.font||(ta.majorTick&&ta.majorTick.font)||(ta.tick&&ta.tick.font),_15=_14?g.normalizedLength(g.splitFontString(_14).size):0,_16=Math.abs(Math.cos(_13*Math.PI/180)),_17=Math.abs(Math.sin(_13*Math.PI/180));
if(_13<0){
_13+=360;
}
if(_15){
if(this.vertical?_13!=0&&_13!=180:_13!=90&&_13!=270){
if(this.labels){
_12=this._groupLabelWidth(this.labels,_14,o.maxLabelCharCount);
}else{
var _18=Math.ceil(Math.log(Math.max(Math.abs(tsb.from),Math.abs(tsb.to)))/Math.LN10),t=[];
if(tsb.from<0||tsb.to<0){
t.push("-");
}
t.push(dojo.string.rep("9",_18));
var _19=Math.floor(Math.log(tsb.to-tsb.from)/Math.LN10);
if(_19>0){
t.push(".");
t.push(dojo.string.rep("9",_19));
}
_12=dojox.gfx._base._getTextBox(t.join(""),{font:_14}).w;
}
_12=o.maxLabelSize?Math.min(o.maxLabelSize,_12):_12;
}else{
_12=_15;
}
switch(_13){
case 0:
case 90:
case 180:
case 270:
break;
default:
var _1a=Math.sqrt(_12*_12+_15*_15),_1b=this.vertical?_15*_16+_12*_17:_12*_16+_15*_17;
_12=Math.min(_1a,_1b);
break;
}
}
this.scaler.minMinorStep=_12+_3;
this.ticks=_1.buildTicks(this.scaler,o);
return this;
},getScaler:function(){
return this.scaler;
},getTicks:function(){
return this.ticks;
}});
})();
}
