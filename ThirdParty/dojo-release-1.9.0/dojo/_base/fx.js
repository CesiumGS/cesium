/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/fx",["./kernel","./config","./lang","../Evented","./Color","../aspect","../sniff","../dom","../dom-style"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
var _a=_3.mixin;
var _b={};
var _c=_b._Line=function(_d,_e){
this.start=_d;
this.end=_e;
};
_c.prototype.getValue=function(n){
return ((this.end-this.start)*n)+this.start;
};
var _f=_b.Animation=function(_10){
_a(this,_10);
if(_3.isArray(this.curve)){
this.curve=new _c(this.curve[0],this.curve[1]);
}
};
_f.prototype=new _4();
_3.extend(_f,{duration:350,repeat:0,rate:20,_percent:0,_startRepeatCount:0,_getStep:function(){
var _11=this._percent,_12=this.easing;
return _12?_12(_11):_11;
},_fire:function(evt,_13){
var a=_13||[];
if(this[evt]){
if(_2.debugAtAllCosts){
this[evt].apply(this,a);
}else{
try{
this[evt].apply(this,a);
}
catch(e){
console.error("exception in animation handler for:",evt);
console.error(e);
}
}
}
return this;
},play:function(_14,_15){
var _16=this;
if(_16._delayTimer){
_16._clearTimer();
}
if(_15){
_16._stopTimer();
_16._active=_16._paused=false;
_16._percent=0;
}else{
if(_16._active&&!_16._paused){
return _16;
}
}
_16._fire("beforeBegin",[_16.node]);
var de=_14||_16.delay,_17=_3.hitch(_16,"_play",_15);
if(de>0){
_16._delayTimer=setTimeout(_17,de);
return _16;
}
_17();
return _16;
},_play:function(_18){
var _19=this;
if(_19._delayTimer){
_19._clearTimer();
}
_19._startTime=new Date().valueOf();
if(_19._paused){
_19._startTime-=_19.duration*_19._percent;
}
_19._active=true;
_19._paused=false;
var _1a=_19.curve.getValue(_19._getStep());
if(!_19._percent){
if(!_19._startRepeatCount){
_19._startRepeatCount=_19.repeat;
}
_19._fire("onBegin",[_1a]);
}
_19._fire("onPlay",[_1a]);
_19._cycle();
return _19;
},pause:function(){
var _1b=this;
if(_1b._delayTimer){
_1b._clearTimer();
}
_1b._stopTimer();
if(!_1b._active){
return _1b;
}
_1b._paused=true;
_1b._fire("onPause",[_1b.curve.getValue(_1b._getStep())]);
return _1b;
},gotoPercent:function(_1c,_1d){
var _1e=this;
_1e._stopTimer();
_1e._active=_1e._paused=true;
_1e._percent=_1c;
if(_1d){
_1e.play();
}
return _1e;
},stop:function(_1f){
var _20=this;
if(_20._delayTimer){
_20._clearTimer();
}
if(!_20._timer){
return _20;
}
_20._stopTimer();
if(_1f){
_20._percent=1;
}
_20._fire("onStop",[_20.curve.getValue(_20._getStep())]);
_20._active=_20._paused=false;
return _20;
},status:function(){
if(this._active){
return this._paused?"paused":"playing";
}
return "stopped";
},_cycle:function(){
var _21=this;
if(_21._active){
var _22=new Date().valueOf();
var _23=_21.duration===0?1:(_22-_21._startTime)/(_21.duration);
if(_23>=1){
_23=1;
}
_21._percent=_23;
if(_21.easing){
_23=_21.easing(_23);
}
_21._fire("onAnimate",[_21.curve.getValue(_23)]);
if(_21._percent<1){
_21._startTimer();
}else{
_21._active=false;
if(_21.repeat>0){
_21.repeat--;
_21.play(null,true);
}else{
if(_21.repeat==-1){
_21.play(null,true);
}else{
if(_21._startRepeatCount){
_21.repeat=_21._startRepeatCount;
_21._startRepeatCount=0;
}
}
}
_21._percent=0;
_21._fire("onEnd",[_21.node]);
!_21.repeat&&_21._stopTimer();
}
}
return _21;
},_clearTimer:function(){
clearTimeout(this._delayTimer);
delete this._delayTimer;
}});
var ctr=0,_24=null,_25={run:function(){
}};
_3.extend(_f,{_startTimer:function(){
if(!this._timer){
this._timer=_6.after(_25,"run",_3.hitch(this,"_cycle"),true);
ctr++;
}
if(!_24){
_24=setInterval(_3.hitch(_25,"run"),this.rate);
}
},_stopTimer:function(){
if(this._timer){
this._timer.remove();
this._timer=null;
ctr--;
}
if(ctr<=0){
clearInterval(_24);
_24=null;
ctr=0;
}
}});
var _26=_7("ie")?function(_27){
var ns=_27.style;
if(!ns.width.length&&_9.get(_27,"width")=="auto"){
ns.width="auto";
}
}:function(){
};
_b._fade=function(_28){
_28.node=_8.byId(_28.node);
var _29=_a({properties:{}},_28),_2a=(_29.properties.opacity={});
_2a.start=!("start" in _29)?function(){
return +_9.get(_29.node,"opacity")||0;
}:_29.start;
_2a.end=_29.end;
var _2b=_b.animateProperty(_29);
_6.after(_2b,"beforeBegin",_3.partial(_26,_29.node),true);
return _2b;
};
_b.fadeIn=function(_2c){
return _b._fade(_a({end:1},_2c));
};
_b.fadeOut=function(_2d){
return _b._fade(_a({end:0},_2d));
};
_b._defaultEasing=function(n){
return 0.5+((Math.sin((n+1.5)*Math.PI))/2);
};
var _2e=function(_2f){
this._properties=_2f;
for(var p in _2f){
var _30=_2f[p];
if(_30.start instanceof _5){
_30.tempColor=new _5();
}
}
};
_2e.prototype.getValue=function(r){
var ret={};
for(var p in this._properties){
var _31=this._properties[p],_32=_31.start;
if(_32 instanceof _5){
ret[p]=_5.blendColors(_32,_31.end,r,_31.tempColor).toCss();
}else{
if(!_3.isArray(_32)){
ret[p]=((_31.end-_32)*r)+_32+(p!="opacity"?_31.units||"px":0);
}
}
}
return ret;
};
_b.animateProperty=function(_33){
var n=_33.node=_8.byId(_33.node);
if(!_33.easing){
_33.easing=_1._defaultEasing;
}
var _34=new _f(_33);
_6.after(_34,"beforeBegin",_3.hitch(_34,function(){
var pm={};
for(var p in this.properties){
if(p=="width"||p=="height"){
this.node.display="block";
}
var _35=this.properties[p];
if(_3.isFunction(_35)){
_35=_35(n);
}
_35=pm[p]=_a({},(_3.isObject(_35)?_35:{end:_35}));
if(_3.isFunction(_35.start)){
_35.start=_35.start(n);
}
if(_3.isFunction(_35.end)){
_35.end=_35.end(n);
}
var _36=(p.toLowerCase().indexOf("color")>=0);
function _37(_38,p){
var v={height:_38.offsetHeight,width:_38.offsetWidth}[p];
if(v!==undefined){
return v;
}
v=_9.get(_38,p);
return (p=="opacity")?+v:(_36?v:parseFloat(v));
};
if(!("end" in _35)){
_35.end=_37(n,p);
}else{
if(!("start" in _35)){
_35.start=_37(n,p);
}
}
if(_36){
_35.start=new _5(_35.start);
_35.end=new _5(_35.end);
}else{
_35.start=(p=="opacity")?+_35.start:parseFloat(_35.start);
}
}
this.curve=new _2e(pm);
}),true);
_6.after(_34,"onAnimate",_3.hitch(_9,"set",_34.node),true);
return _34;
};
_b.anim=function(_39,_3a,_3b,_3c,_3d,_3e){
return _b.animateProperty({node:_39,duration:_3b||_f.prototype.duration,properties:_3a,easing:_3c,onEnd:_3d}).play(_3e||0);
};
if(1){
_a(_1,_b);
_1._Animation=_f;
}
return _b;
});
