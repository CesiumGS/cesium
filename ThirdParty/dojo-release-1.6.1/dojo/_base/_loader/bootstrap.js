/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


(function(){
if(typeof this["loadFirebugConsole"]=="function"){
this["loadFirebugConsole"]();
}else{
this.console=this.console||{};
var cn=["assert","count","debug","dir","dirxml","error","group","groupEnd","info","profile","profileEnd","time","timeEnd","trace","warn","log"];
var i=0,tn;
while((tn=cn[i++])){
if(!console[tn]){
(function(){
var _1=tn+"";
console[_1]=("log" in console)?function(){
var a=Array.apply({},arguments);
a.unshift(_1+":");
console["log"](a.join(" "));
}:function(){
};
console[_1]._fake=true;
})();
}
}
}
if(typeof dojo=="undefined"){
dojo={_scopeName:"dojo",_scopePrefix:"",_scopePrefixArgs:"",_scopeSuffix:"",_scopeMap:{},_scopeMapRev:{}};
}
var d=dojo;
if(typeof dijit=="undefined"){
dijit={_scopeName:"dijit"};
}
if(typeof dojox=="undefined"){
dojox={_scopeName:"dojox"};
}
if(!d._scopeArgs){
d._scopeArgs=[dojo,dijit,dojox];
}
d.global=this;
d.config={isDebug:false,debugAtAllCosts:false};
var _2=typeof djConfig!="undefined"?djConfig:typeof dojoConfig!="undefined"?dojoConfig:null;
if(_2){
for(var c in _2){
d.config[c]=_2[c];
}
}
dojo.locale=d.config.locale;
var _3="$Rev: 24595 $".match(/\d+/);
dojo.version={major:1,minor:6,patch:1,flag:"",revision:_3?+_3[0]:NaN,toString:function(){
with(d.version){
return major+"."+minor+"."+patch+flag+" ("+revision+")";
}
}};
if(typeof OpenAjax!="undefined"){
OpenAjax.hub.registerLibrary(dojo._scopeName,"http://dojotoolkit.org",d.version.toString());
}
var _4,_5,_6={};
for(var i in {toString:1}){
_4=[];
break;
}
dojo._extraNames=_4=_4||["hasOwnProperty","valueOf","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","constructor"];
_5=_4.length;
dojo._mixin=function(_7,_8){
var _9,s,i;
for(_9 in _8){
s=_8[_9];
if(!(_9 in _7)||(_7[_9]!==s&&(!(_9 in _6)||_6[_9]!==s))){
_7[_9]=s;
}
}
if(_5&&_8){
for(i=0;i<_5;++i){
_9=_4[i];
s=_8[_9];
if(!(_9 in _7)||(_7[_9]!==s&&(!(_9 in _6)||_6[_9]!==s))){
_7[_9]=s;
}
}
}
return _7;
};
dojo.mixin=function(_a,_b){
if(!_a){
_a={};
}
for(var i=1,l=arguments.length;i<l;i++){
d._mixin(_a,arguments[i]);
}
return _a;
};
dojo._getProp=function(_c,_d,_e){
var _f=_e||d.global;
for(var i=0,p;_f&&(p=_c[i]);i++){
if(i==0&&d._scopeMap[p]){
p=d._scopeMap[p];
}
_f=(p in _f?_f[p]:(_d?_f[p]={}:undefined));
}
return _f;
};
dojo.setObject=function(_10,_11,_12){
var _13=_10.split("."),p=_13.pop(),obj=d._getProp(_13,true,_12);
return obj&&p?(obj[p]=_11):undefined;
};
dojo.getObject=function(_14,_15,_16){
return d._getProp(_14.split("."),_15,_16);
};
dojo.exists=function(_17,obj){
return d.getObject(_17,false,obj)!==undefined;
};
dojo["eval"]=function(_18){
return d.global.eval?d.global.eval(_18):eval(_18);
};
d.deprecated=d.experimental=function(){
};
})();
