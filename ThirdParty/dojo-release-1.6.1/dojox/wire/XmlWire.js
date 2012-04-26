/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.XmlWire"]){
dojo._hasResource["dojox.wire.XmlWire"]=true;
dojo.provide("dojox.wire.XmlWire");
dojo.require("dojox.xml.parser");
dojo.require("dojox.wire.Wire");
dojo.declare("dojox.wire.XmlWire",dojox.wire.Wire,{_wireClass:"dojox.wire.XmlWire",constructor:function(_1){
},_getValue:function(_2){
if(!_2||!this.path){
return _2;
}
var _3=_2;
var _4=this.path;
var i;
if(_4.charAt(0)=="/"){
i=_4.indexOf("/",1);
_4=_4.substring(i+1);
}
var _5=_4.split("/");
var _6=_5.length-1;
for(i=0;i<_6;i++){
_3=this._getChildNode(_3,_5[i]);
if(!_3){
return undefined;
}
}
var _7=this._getNodeValue(_3,_5[_6]);
return _7;
},_setValue:function(_8,_9){
if(!this.path){
return _8;
}
var _a=_8;
var _b=this._getDocument(_a);
var _c=this.path;
var i;
if(_c.charAt(0)=="/"){
i=_c.indexOf("/",1);
if(!_a){
var _d=_c.substring(1,i);
_a=_b.createElement(_d);
_8=_a;
}
_c=_c.substring(i+1);
}else{
if(!_a){
return undefined;
}
}
var _e=_c.split("/");
var _f=_e.length-1;
for(i=0;i<_f;i++){
var _10=this._getChildNode(_a,_e[i]);
if(!_10){
_10=_b.createElement(_e[i]);
_a.appendChild(_10);
}
_a=_10;
}
this._setNodeValue(_a,_e[_f],_9);
return _8;
},_getNodeValue:function(_11,exp){
var _12=undefined;
if(exp.charAt(0)=="@"){
var _13=exp.substring(1);
_12=_11.getAttribute(_13);
}else{
if(exp=="text()"){
var _14=_11.firstChild;
if(_14){
_12=_14.nodeValue;
}
}else{
_12=[];
for(var i=0;i<_11.childNodes.length;i++){
var _15=_11.childNodes[i];
if(_15.nodeType===1&&_15.nodeName==exp){
_12.push(_15);
}
}
}
}
return _12;
},_setNodeValue:function(_16,exp,_17){
if(exp.charAt(0)=="@"){
var _18=exp.substring(1);
if(_17){
_16.setAttribute(_18,_17);
}else{
_16.removeAttribute(_18);
}
}else{
if(exp=="text()"){
while(_16.firstChild){
_16.removeChild(_16.firstChild);
}
if(_17){
var _19=this._getDocument(_16).createTextNode(_17);
_16.appendChild(_19);
}
}
}
},_getChildNode:function(_1a,_1b){
var _1c=1;
var i1=_1b.indexOf("[");
if(i1>=0){
var i2=_1b.indexOf("]");
_1c=_1b.substring(i1+1,i2);
_1b=_1b.substring(0,i1);
}
var _1d=1;
for(var i=0;i<_1a.childNodes.length;i++){
var _1e=_1a.childNodes[i];
if(_1e.nodeType===1&&_1e.nodeName==_1b){
if(_1d==_1c){
return _1e;
}
_1d++;
}
}
return null;
},_getDocument:function(_1f){
if(_1f){
return (_1f.nodeType==9?_1f:_1f.ownerDocument);
}else{
return dojox.xml.parser.parse();
}
}});
}
