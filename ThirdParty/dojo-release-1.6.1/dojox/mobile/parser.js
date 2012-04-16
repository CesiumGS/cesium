/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.parser"]){
dojo._hasResource["dojox.mobile.parser"]=true;
dojo.provide("dojox.mobile.parser");
dojo.provide("dojo.parser");
dojox.mobile.parser=new function(){
this.instantiate=function(_1,_2){
var ws=[];
if(_1){
var i,_3;
_3=_1.length;
for(i=0;i<_3;i++){
var _4=_1[i];
var _5=dojo.getObject(dojo.attr(_4,"dojoType"));
var _6=_5.prototype;
var _7={};
if(_2){
for(var _8 in _2){
_7[_8]=_2[_8];
}
}
for(var _9 in _6){
var _a=dojo.attr(_4,_9);
if(!_a){
continue;
}
if(typeof _6[_9]=="string"){
_7[_9]=_a;
}else{
if(typeof _6[_9]=="number"){
_7[_9]=_a-0;
}else{
if(typeof _6[_9]=="boolean"){
_7[_9]=(_a!="false");
}else{
if(typeof _6[_9]=="object"){
_7[_9]=eval("("+_a+")");
}
}
}
}
}
_7["class"]=_4.className;
_7["style"]=_4.style&&_4.style.cssText;
var _b=new _5(_7,_4);
ws.push(_b);
var _c=_4.getAttribute("jsId");
if(_c){
dojo.setObject(_c,_b);
}
}
_3=ws.length;
for(i=0;i<_3;i++){
var w=ws[i];
w.startup&&!w._started&&(!w.getParent||!w.getParent())&&w.startup();
}
}
return ws;
};
this.parse=function(_d,_e){
if(!_d){
_d=dojo.body();
}else{
if(!_e&&_d.rootNode){
_d=_d.rootNode;
}
}
var _f=_d.getElementsByTagName("*");
var _10=[];
for(var i=0,len=_f.length;i<len;i++){
if(_f[i].getAttribute("dojoType")){
_10.push(_f[i]);
}
}
return this.instantiate(_10,_e);
};
}();
dojo._loaders.unshift(function(){
if(dojo.config.parseOnLoad){
dojox.mobile.parser.parse();
}
});
}
