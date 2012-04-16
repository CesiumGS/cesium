/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.Stateful"]){
dojo._hasResource["dojo.Stateful"]=true;
dojo.provide("dojo.Stateful");
dojo.declare("dojo.Stateful",null,{postscript:function(_1){
if(_1){
dojo.mixin(this,_1);
}
},get:function(_2){
return this[_2];
},set:function(_3,_4){
if(typeof _3==="object"){
for(var x in _3){
this.set(x,_3[x]);
}
return this;
}
var _5=this[_3];
this[_3]=_4;
if(this._watchCallbacks){
this._watchCallbacks(_3,_5,_4);
}
return this;
},watch:function(_6,_7){
var _8=this._watchCallbacks;
if(!_8){
var _9=this;
_8=this._watchCallbacks=function(_a,_b,_c,_d){
var _e=function(_f){
if(_f){
_f=_f.slice();
for(var i=0,l=_f.length;i<l;i++){
try{
_f[i].call(_9,_a,_b,_c);
}
catch(e){
console.error(e);
}
}
}
};
_e(_8["_"+_a]);
if(!_d){
_e(_8["*"]);
}
};
}
if(!_7&&typeof _6==="function"){
_7=_6;
_6="*";
}else{
_6="_"+_6;
}
var _10=_8[_6];
if(typeof _10!=="object"){
_10=_8[_6]=[];
}
_10.push(_7);
return {unwatch:function(){
_10.splice(dojo.indexOf(_10,_7),1);
}};
}});
}
