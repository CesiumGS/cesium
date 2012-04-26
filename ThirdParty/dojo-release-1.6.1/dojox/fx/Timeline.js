/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.Timeline"]){
dojo._hasResource["dojox.fx.Timeline"]=true;
dojo.provide("dojox.fx.Timeline");
dojo.require("dojo.fx.easing");
dojox.fx.animateTimeline=function(_1,_2){
var _3=new dojox.fx._Timeline(_1.keys);
var _4=dojo.animateProperty({node:dojo.byId(_2||_1.node),duration:_1.duration||1000,properties:_3._properties,easing:dojo.fx.easing.linear,onAnimate:function(v){
}});
dojo.connect(_4,"onEnd",function(_5){
var _6=_4.curve.getValue(_4.reversed?0:1);
dojo.style(_5,_6);
});
dojo.connect(_4,"beforeBegin",function(){
if(_4.curve){
delete _4.curve;
}
_4.curve=_3;
_3.ani=_4;
});
return _4;
};
dojox.fx._Timeline=function(_7){
this.keys=dojo.isArray(_7)?this.flatten(_7):_7;
};
dojox.fx._Timeline.prototype.flatten=function(_8){
var _9=function(_a,_b){
if(_a=="from"){
return 0;
}
if(_a=="to"){
return 1;
}
if(_a===undefined){
return _b==0?0:_b/(_8.length-1);
}
return parseInt(_a,10)*0.01;
};
var p={},o={};
dojo.forEach(_8,function(k,i){
var _c=_9(k.step,i);
var _d=dojo.fx.easing[k.ease]||dojo.fx.easing.linear;
for(var nm in k){
if(nm=="step"||nm=="ease"||nm=="from"||nm=="to"){
continue;
}
if(!o[nm]){
o[nm]={steps:[],values:[],eases:[],ease:_d};
p[nm]={};
if(!/#/.test(k[nm])){
p[nm].units=o[nm].units=/\D{1,}/.exec(k[nm]).join("");
}else{
p[nm].units=o[nm].units="isColor";
}
}
o[nm].eases.push(dojo.fx.easing[k.ease||"linear"]);
o[nm].steps.push(_c);
if(p[nm].units=="isColor"){
o[nm].values.push(new dojo.Color(k[nm]));
}else{
o[nm].values.push(parseInt(/\d{1,}/.exec(k[nm]).join("")));
}
if(p[nm].start===undefined){
p[nm].start=o[nm].values[o[nm].values.length-1];
}else{
p[nm].end=o[nm].values[o[nm].values.length-1];
}
}
});
this._properties=p;
return o;
};
dojox.fx._Timeline.prototype.getValue=function(p){
p=this.ani._reversed?1-p:p;
var o={},_e=this;
var _f=function(nm,i){
return _e._properties[nm].units!="isColor"?_e.keys[nm].values[i]+_e._properties[nm].units:_e.keys[nm].values[i].toCss();
};
for(var nm in this.keys){
var k=this.keys[nm];
for(var i=0;i<k.steps.length;i++){
var _10=k.steps[i];
var ns=k.steps[i+1];
var _11=i<k.steps.length?true:false;
var _12=k.eases[i]||function(n){
return n;
};
if(p==_10){
o[nm]=_f(nm,i);
if(!_11||(_11&&this.ani._reversed)){
break;
}
}else{
if(p>_10){
if(_11&&p<k.steps[i+1]){
var end=k.values[i+1];
var beg=k.values[i];
var seg=(1/(ns-_10))*(p-_10);
seg=_12(seg);
if(beg instanceof dojo.Color){
o[nm]=dojo.blendColors(beg,end,seg).toCss(false);
}else{
var df=end-beg;
o[nm]=beg+seg*df+this._properties[nm].units;
}
break;
}else{
o[nm]=_f(nm,i);
}
}else{
if((_11&&!this.ani._reversed)||(!_11&&this.ani._reversed)){
o[nm]=_f(nm,i);
}
}
}
}
}
return o;
};
}
