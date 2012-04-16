/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.ext-dojo.reverse"]){
dojo._hasResource["dojox.fx.ext-dojo.reverse"]=true;
dojo.provide("dojox.fx.ext-dojo.reverse");
dojo.require("dojo.fx.easing");
dojo.require("dojo.fx");
dojo.extend(dojo.Animation,{_reversed:false,reverse:function(_1,_2){
var _3=this.status()=="playing";
this.pause();
this._reversed=!this._reversed;
var d=this.duration,_4=d*this._percent,_5=d-_4,_6=new Date().valueOf(),cp=this.curve._properties,p=this.properties,nm;
this._endTime=_6+_4;
this._startTime=_6-_5;
if(_3){
this.gotoPercent(_5/d);
}
for(nm in p){
var _7=p[nm].start;
p[nm].start=cp[nm].start=p[nm].end;
p[nm].end=cp[nm].end=_7;
}
if(this._reversed){
if(!this.rEase){
this.fEase=this.easing;
if(_2){
this.rEase=_2;
}else{
var de=dojo.fx.easing,_8,_9;
for(nm in de){
if(this.easing==de[nm]){
_8=nm;
break;
}
}
if(_8){
if(/InOut/.test(nm)||!/In|Out/i.test(nm)){
this.rEase=this.easing;
}else{
if(/In/.test(nm)){
_9=nm.replace("In","Out");
}else{
_9=nm.replace("Out","In");
}
}
if(_9){
this.rEase=dojo.fx.easing[_9];
}
}else{
this.rEase=this.easing;
}
}
}
this.easing=this.rEase;
}else{
this.easing=this.fEase;
}
if(!_1&&this.status()!="playing"){
this.play();
}
return this;
}});
}
