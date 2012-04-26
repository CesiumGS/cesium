/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.common"]){
dojo._hasResource["dojox.charting.plot2d.common"]=true;
dojo.provide("dojox.charting.plot2d.common");
dojo.require("dojo.colors");
dojo.require("dojox.gfx");
dojo.require("dojox.lang.functional");
(function(){
var df=dojox.lang.functional,dc=dojox.charting.plot2d.common;
dojo.mixin(dojox.charting.plot2d.common,{makeStroke:function(_1){
if(!_1){
return _1;
}
if(typeof _1=="string"||_1 instanceof dojo.Color){
_1={color:_1};
}
return dojox.gfx.makeParameters(dojox.gfx.defaultStroke,_1);
},augmentColor:function(_2,_3){
var t=new dojo.Color(_2),c=new dojo.Color(_3);
c.a=t.a;
return c;
},augmentStroke:function(_4,_5){
var s=dc.makeStroke(_4);
if(s){
s.color=dc.augmentColor(s.color,_5);
}
return s;
},augmentFill:function(_6,_7){
var fc,c=new dojo.Color(_7);
if(typeof _6=="string"||_6 instanceof dojo.Color){
return dc.augmentColor(_6,_7);
}
return _6;
},defaultStats:{vmin:Number.POSITIVE_INFINITY,vmax:Number.NEGATIVE_INFINITY,hmin:Number.POSITIVE_INFINITY,hmax:Number.NEGATIVE_INFINITY},collectSimpleStats:function(_8){
var _9=dojo.delegate(dc.defaultStats);
for(var i=0;i<_8.length;++i){
var _a=_8[i];
for(var j=0;j<_a.data.length;j++){
if(_a.data[j]!==null){
if(typeof _a.data[j]=="number"){
var _b=_9.vmin,_c=_9.vmax;
if(!("ymin" in _a)||!("ymax" in _a)){
dojo.forEach(_a.data,function(_d,i){
if(_d!==null){
var x=i+1,y=_d;
if(isNaN(y)){
y=0;
}
_9.hmin=Math.min(_9.hmin,x);
_9.hmax=Math.max(_9.hmax,x);
_9.vmin=Math.min(_9.vmin,y);
_9.vmax=Math.max(_9.vmax,y);
}
});
}
if("ymin" in _a){
_9.vmin=Math.min(_b,_a.ymin);
}
if("ymax" in _a){
_9.vmax=Math.max(_c,_a.ymax);
}
}else{
var _e=_9.hmin,_f=_9.hmax,_b=_9.vmin,_c=_9.vmax;
if(!("xmin" in _a)||!("xmax" in _a)||!("ymin" in _a)||!("ymax" in _a)){
dojo.forEach(_a.data,function(val,i){
if(val!==null){
var x="x" in val?val.x:i+1,y=val.y;
if(isNaN(x)){
x=0;
}
if(isNaN(y)){
y=0;
}
_9.hmin=Math.min(_9.hmin,x);
_9.hmax=Math.max(_9.hmax,x);
_9.vmin=Math.min(_9.vmin,y);
_9.vmax=Math.max(_9.vmax,y);
}
});
}
if("xmin" in _a){
_9.hmin=Math.min(_e,_a.xmin);
}
if("xmax" in _a){
_9.hmax=Math.max(_f,_a.xmax);
}
if("ymin" in _a){
_9.vmin=Math.min(_b,_a.ymin);
}
if("ymax" in _a){
_9.vmax=Math.max(_c,_a.ymax);
}
}
break;
}
}
}
return _9;
},calculateBarSize:function(_10,opt,_11){
if(!_11){
_11=1;
}
var gap=opt.gap,_12=(_10-2*gap)/_11;
if("minBarSize" in opt){
_12=Math.max(_12,opt.minBarSize);
}
if("maxBarSize" in opt){
_12=Math.min(_12,opt.maxBarSize);
}
_12=Math.max(_12,1);
gap=(_10-_12*_11)/2;
return {size:_12,gap:gap};
},collectStackedStats:function(_13){
var _14=dojo.clone(dc.defaultStats);
if(_13.length){
_14.hmin=Math.min(_14.hmin,1);
_14.hmax=df.foldl(_13,"seed, run -> Math.max(seed, run.data.length)",_14.hmax);
for(var i=0;i<_14.hmax;++i){
var v=_13[0].data[i];
v=v&&(typeof v=="number"?v:v.y);
if(isNaN(v)){
v=0;
}
_14.vmin=Math.min(_14.vmin,v);
for(var j=1;j<_13.length;++j){
var t=_13[j].data[i];
t=t&&(typeof t=="number"?t:t.y);
if(isNaN(t)){
t=0;
}
v+=t;
}
_14.vmax=Math.max(_14.vmax,v);
}
}
return _14;
},curve:function(a,_15){
var arr=a.slice(0);
if(_15=="x"){
arr[arr.length]=arr[0];
}
var p=dojo.map(arr,function(_16,i){
if(i==0){
return "M"+_16.x+","+_16.y;
}
if(!isNaN(_15)){
var dx=_16.x-arr[i-1].x,dy=arr[i-1].y;
return "C"+(_16.x-(_15-1)*(dx/_15))+","+dy+" "+(_16.x-(dx/_15))+","+_16.y+" "+_16.x+","+_16.y;
}else{
if(_15=="X"||_15=="x"||_15=="S"){
var p0,p1=arr[i-1],p2=arr[i],p3;
var _17,_18,_19,_1a;
var f=1/6;
if(i==1){
if(_15=="x"){
p0=arr[arr.length-2];
}else{
p0=p1;
}
f=1/3;
}else{
p0=arr[i-2];
}
if(i==(arr.length-1)){
if(_15=="x"){
p3=arr[1];
}else{
p3=p2;
}
f=1/3;
}else{
p3=arr[i+1];
}
var _1b=Math.sqrt((p2.x-p1.x)*(p2.x-p1.x)+(p2.y-p1.y)*(p2.y-p1.y));
var _1c=Math.sqrt((p2.x-p0.x)*(p2.x-p0.x)+(p2.y-p0.y)*(p2.y-p0.y));
var _1d=Math.sqrt((p3.x-p1.x)*(p3.x-p1.x)+(p3.y-p1.y)*(p3.y-p1.y));
var _1e=_1c*f;
var _1f=_1d*f;
if(_1e>_1b/2&&_1f>_1b/2){
_1e=_1b/2;
_1f=_1b/2;
}else{
if(_1e>_1b/2){
_1e=_1b/2;
_1f=_1b/2*_1d/_1c;
}else{
if(_1f>_1b/2){
_1f=_1b/2;
_1e=_1b/2*_1c/_1d;
}
}
}
if(_15=="S"){
if(p0==p1){
_1e=0;
}
if(p2==p3){
_1f=0;
}
}
_17=p1.x+_1e*(p2.x-p0.x)/_1c;
_18=p1.y+_1e*(p2.y-p0.y)/_1c;
_19=p2.x-_1f*(p3.x-p1.x)/_1d;
_1a=p2.y-_1f*(p3.y-p1.y)/_1d;
}
}
return "C"+(_17+","+_18+" "+_19+","+_1a+" "+p2.x+","+p2.y);
});
return p.join(" ");
},getLabel:function(_20,_21,_22){
if(dojo.number){
return (_21?dojo.number.format(_20,{places:_22}):dojo.number.format(_20))||"";
}
return _21?_20.toFixed(_22):_20.toString();
}});
})();
}
