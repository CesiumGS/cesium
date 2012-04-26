/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.help.console"]){
dojo._hasResource["dojox.help.console"]=true;
dojo.provide("dojox.help.console");
dojo.require("dojox.help._base");
dojo.mixin(dojox.help,{_plainText:function(_1){
return _1.replace(/(<[^>]*>|&[^;]{2,6};)/g,"");
},_displayLocated:function(_2){
var _3={};
dojo.forEach(_2,function(_4){
_3[_4[0]]=dojo.isMoz?{toString:function(){
return "Click to view";
},item:_4[1]}:_4[1];
});
},_displayHelp:function(_5,_6){
if(_5){
var _7="Help for: "+_6.name;
var _8="";
for(var i=0;i<_7.length;i++){
_8+="=";
}
}else{
if(!_6){
}else{
var _9=false;
for(var _a in _6){
var _b=_6[_a];
if(_a=="returns"&&_6.type!="Function"&&_6.type!="Constructor"){
continue;
}
if(_b&&(!dojo.isArray(_b)||_b.length)){
_9=true;
_b=dojo.isString(_b)?dojox.help._plainText(_b):_b;
if(_a=="returns"){
var _c=dojo.map(_b.types||[],"return item.title;").join("|");
if(_b.summary){
if(_c){
_c+=": ";
}
_c+=dojox.help._plainText(_b.summary);
}
}else{
if(_a=="parameters"){
for(var j=0,_d;_d=_b[j];j++){
var _e=dojo.map(_d.types,"return item.title").join("|");
var _f="";
if(_d.optional){
_f+="Optional. ";
}
if(_d.repating){
_f+="Repeating. ";
}
_f+=dojox.help._plainText(_d.summary);
if(_f){
_f="  - "+_f;
for(var k=0;k<_d.name.length;k++){
_f=" "+_f;
}
}
}
}else{
}
}
}
}
if(!_9){
}
}
}
}});
dojox.help.init();
}
