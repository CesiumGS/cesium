/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.scaler.linear"]){
dojo._hasResource["dojox.charting.scaler.linear"]=true;
dojo.provide("dojox.charting.scaler.linear");
dojo.require("dojox.charting.scaler.common");
(function(){
var _1=3,dc=dojox.charting,_2=dc.scaler,_3=_2.common,_4=_3.findString,_5=_3.getNumericLabel;
var _6=function(_7,_8,_9,_a,_b,_c,_d){
_9=dojo.delegate(_9);
if(!_a){
if(_9.fixUpper=="major"){
_9.fixUpper="minor";
}
if(_9.fixLower=="major"){
_9.fixLower="minor";
}
}
if(!_b){
if(_9.fixUpper=="minor"){
_9.fixUpper="micro";
}
if(_9.fixLower=="minor"){
_9.fixLower="micro";
}
}
if(!_c){
if(_9.fixUpper=="micro"){
_9.fixUpper="none";
}
if(_9.fixLower=="micro"){
_9.fixLower="none";
}
}
var _e=_4(_9.fixLower,["major"])?Math.floor(_9.min/_a)*_a:_4(_9.fixLower,["minor"])?Math.floor(_9.min/_b)*_b:_4(_9.fixLower,["micro"])?Math.floor(_9.min/_c)*_c:_9.min,_f=_4(_9.fixUpper,["major"])?Math.ceil(_9.max/_a)*_a:_4(_9.fixUpper,["minor"])?Math.ceil(_9.max/_b)*_b:_4(_9.fixUpper,["micro"])?Math.ceil(_9.max/_c)*_c:_9.max;
if(_9.useMin){
_7=_e;
}
if(_9.useMax){
_8=_f;
}
var _10=(!_a||_9.useMin&&_4(_9.fixLower,["major"]))?_7:Math.ceil(_7/_a)*_a,_11=(!_b||_9.useMin&&_4(_9.fixLower,["major","minor"]))?_7:Math.ceil(_7/_b)*_b,_12=(!_c||_9.useMin&&_4(_9.fixLower,["major","minor","micro"]))?_7:Math.ceil(_7/_c)*_c,_13=!_a?0:(_9.useMax&&_4(_9.fixUpper,["major"])?Math.round((_8-_10)/_a):Math.floor((_8-_10)/_a))+1,_14=!_b?0:(_9.useMax&&_4(_9.fixUpper,["major","minor"])?Math.round((_8-_11)/_b):Math.floor((_8-_11)/_b))+1,_15=!_c?0:(_9.useMax&&_4(_9.fixUpper,["major","minor","micro"])?Math.round((_8-_12)/_c):Math.floor((_8-_12)/_c))+1,_16=_b?Math.round(_a/_b):0,_17=_c?Math.round(_b/_c):0,_18=_a?Math.floor(Math.log(_a)/Math.LN10):0,_19=_b?Math.floor(Math.log(_b)/Math.LN10):0,_1a=_d/(_8-_7);
if(!isFinite(_1a)){
_1a=1;
}
return {bounds:{lower:_e,upper:_f,from:_7,to:_8,scale:_1a,span:_d},major:{tick:_a,start:_10,count:_13,prec:_18},minor:{tick:_b,start:_11,count:_14,prec:_19},micro:{tick:_c,start:_12,count:_15,prec:0},minorPerMajor:_16,microPerMinor:_17,scaler:_2.linear};
};
dojo.mixin(dojox.charting.scaler.linear,{buildScaler:function(min,max,_1b,_1c){
var h={fixUpper:"none",fixLower:"none",natural:false};
if(_1c){
if("fixUpper" in _1c){
h.fixUpper=String(_1c.fixUpper);
}
if("fixLower" in _1c){
h.fixLower=String(_1c.fixLower);
}
if("natural" in _1c){
h.natural=Boolean(_1c.natural);
}
}
if("min" in _1c){
min=_1c.min;
}
if("max" in _1c){
max=_1c.max;
}
if(_1c.includeZero){
if(min>0){
min=0;
}
if(max<0){
max=0;
}
}
h.min=min;
h.useMin=true;
h.max=max;
h.useMax=true;
if("from" in _1c){
min=_1c.from;
h.useMin=false;
}
if("to" in _1c){
max=_1c.to;
h.useMax=false;
}
if(max<=min){
return _6(min,max,h,0,0,0,_1b);
}
var mag=Math.floor(Math.log(max-min)/Math.LN10),_1d=_1c&&("majorTickStep" in _1c)?_1c.majorTickStep:Math.pow(10,mag),_1e=0,_1f=0,_20;
if(_1c&&("minorTickStep" in _1c)){
_1e=_1c.minorTickStep;
}else{
do{
_1e=_1d/10;
if(!h.natural||_1e>0.9){
_20=_6(min,max,h,_1d,_1e,0,_1b);
if(_20.bounds.scale*_20.minor.tick>_1){
break;
}
}
_1e=_1d/5;
if(!h.natural||_1e>0.9){
_20=_6(min,max,h,_1d,_1e,0,_1b);
if(_20.bounds.scale*_20.minor.tick>_1){
break;
}
}
_1e=_1d/2;
if(!h.natural||_1e>0.9){
_20=_6(min,max,h,_1d,_1e,0,_1b);
if(_20.bounds.scale*_20.minor.tick>_1){
break;
}
}
return _6(min,max,h,_1d,0,0,_1b);
}while(false);
}
if(_1c&&("microTickStep" in _1c)){
_1f=_1c.microTickStep;
_20=_6(min,max,h,_1d,_1e,_1f,_1b);
}else{
do{
_1f=_1e/10;
if(!h.natural||_1f>0.9){
_20=_6(min,max,h,_1d,_1e,_1f,_1b);
if(_20.bounds.scale*_20.micro.tick>_1){
break;
}
}
_1f=_1e/5;
if(!h.natural||_1f>0.9){
_20=_6(min,max,h,_1d,_1e,_1f,_1b);
if(_20.bounds.scale*_20.micro.tick>_1){
break;
}
}
_1f=_1e/2;
if(!h.natural||_1f>0.9){
_20=_6(min,max,h,_1d,_1e,_1f,_1b);
if(_20.bounds.scale*_20.micro.tick>_1){
break;
}
}
_1f=0;
}while(false);
}
return _1f?_20:_6(min,max,h,_1d,_1e,0,_1b);
},buildTicks:function(_21,_22){
var _23,_24,_25,_26=_21.major.start,_27=_21.minor.start,_28=_21.micro.start;
if(_22.microTicks&&_21.micro.tick){
_23=_21.micro.tick,_24=_28;
}else{
if(_22.minorTicks&&_21.minor.tick){
_23=_21.minor.tick,_24=_27;
}else{
if(_21.major.tick){
_23=_21.major.tick,_24=_26;
}else{
return null;
}
}
}
var _29=1/_21.bounds.scale;
if(_21.bounds.to<=_21.bounds.from||isNaN(_29)||!isFinite(_29)||_23<=0||isNaN(_23)||!isFinite(_23)){
return null;
}
var _2a=[],_2b=[],_2c=[];
while(_24<=_21.bounds.to+_29){
if(Math.abs(_26-_24)<_23/2){
_25={value:_26};
if(_22.majorLabels){
_25.label=_5(_26,_21.major.prec,_22);
}
_2a.push(_25);
_26+=_21.major.tick;
_27+=_21.minor.tick;
_28+=_21.micro.tick;
}else{
if(Math.abs(_27-_24)<_23/2){
if(_22.minorTicks){
_25={value:_27};
if(_22.minorLabels&&(_21.minMinorStep<=_21.minor.tick*_21.bounds.scale)){
_25.label=_5(_27,_21.minor.prec,_22);
}
_2b.push(_25);
}
_27+=_21.minor.tick;
_28+=_21.micro.tick;
}else{
if(_22.microTicks){
_2c.push({value:_28});
}
_28+=_21.micro.tick;
}
}
_24+=_23;
}
return {major:_2a,minor:_2b,micro:_2c};
},getTransformerFromModel:function(_2d){
var _2e=_2d.bounds.from,_2f=_2d.bounds.scale;
return function(x){
return (x-_2e)*_2f;
};
},getTransformerFromPlot:function(_30){
var _31=_30.bounds.from,_32=_30.bounds.scale;
return function(x){
return x/_32+_31;
};
}});
})();
}
