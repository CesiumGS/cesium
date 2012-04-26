/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.util"]){
dojo._hasResource["dojox.wire.ml.util"]=true;
dojo.provide("dojox.wire.ml.util");
dojo.require("dojox.xml.parser");
dojo.require("dojox.wire.Wire");
dojox.wire.ml._getValue=function(_1,_2){
if(!_1){
return undefined;
}
var _3=undefined;
if(_2&&_1.length>=9&&_1.substring(0,9)=="arguments"){
_3=_1.substring(9);
return new dojox.wire.Wire({property:_3}).getValue(_2);
}
var i=_1.indexOf(".");
if(i>=0){
_3=_1.substring(i+1);
_1=_1.substring(0,i);
}
var _4=(dijit.byId(_1)||dojo.byId(_1)||dojo.getObject(_1));
if(!_4){
return undefined;
}
if(!_3){
return _4;
}else{
return new dojox.wire.Wire({object:_4,property:_3}).getValue();
}
};
dojox.wire.ml._setValue=function(_5,_6){
if(!_5){
return;
}
var i=_5.indexOf(".");
if(i<0){
return;
}
var _7=this._getValue(_5.substring(0,i));
if(!_7){
return;
}
var _8=_5.substring(i+1);
var _9=new dojox.wire.Wire({object:_7,property:_8}).setValue(_6);
};
dojo.declare("dojox.wire.ml.XmlElement",null,{constructor:function(_a){
if(dojo.isString(_a)){
_a=this._getDocument().createElement(_a);
}
this.element=_a;
},getPropertyValue:function(_b){
var _c=undefined;
if(!this.element){
return _c;
}
if(!_b){
return _c;
}
if(_b.charAt(0)=="@"){
var _d=_b.substring(1);
_c=this.element.getAttribute(_d);
}else{
if(_b=="text()"){
var _e=this.element.firstChild;
if(_e){
_c=_e.nodeValue;
}
}else{
var _f=[];
for(var i=0;i<this.element.childNodes.length;i++){
var _10=this.element.childNodes[i];
if(_10.nodeType===1&&_10.nodeName==_b){
_f.push(new dojox.wire.ml.XmlElement(_10));
}
}
if(_f.length>0){
if(_f.length===1){
_c=_f[0];
}else{
_c=_f;
}
}
}
}
return _c;
},setPropertyValue:function(_11,_12){
var i;
var _13;
if(!this.element){
return;
}
if(!_11){
return;
}
if(_11.charAt(0)=="@"){
var _14=_11.substring(1);
if(_12){
this.element.setAttribute(_14,_12);
}else{
this.element.removeAttribute(_14);
}
}else{
if(_11=="text()"){
while(this.element.firstChild){
this.element.removeChild(this.element.firstChild);
}
if(_12){
_13=this._getDocument().createTextNode(_12);
this.element.appendChild(_13);
}
}else{
var _15=null;
var _16;
for(i=this.element.childNodes.length-1;i>=0;i--){
_16=this.element.childNodes[i];
if(_16.nodeType===1&&_16.nodeName==_11){
if(!_15){
_15=_16.nextSibling;
}
this.element.removeChild(_16);
}
}
if(_12){
if(dojo.isArray(_12)){
for(i in _12){
var e=_12[i];
if(e.element){
this.element.insertBefore(e.element,_15);
}
}
}else{
if(_12 instanceof dojox.wire.ml.XmlElement){
if(_12.element){
this.element.insertBefore(_12.element,_15);
}
}else{
_16=this._getDocument().createElement(_11);
_13=this._getDocument().createTextNode(_12);
_16.appendChild(_13);
this.element.insertBefore(_16,_15);
}
}
}
}
}
},toString:function(){
var s="";
if(this.element){
var _17=this.element.firstChild;
if(_17){
s=_17.nodeValue;
}
}
return s;
},toObject:function(){
if(!this.element){
return null;
}
var _18="";
var obj={};
var _19=0;
var i;
for(i=0;i<this.element.childNodes.length;i++){
var _1a=this.element.childNodes[i];
if(_1a.nodeType===1){
_19++;
var o=new dojox.wire.ml.XmlElement(_1a).toObject();
var _1b=_1a.nodeName;
var p=obj[_1b];
if(!p){
obj[_1b]=o;
}else{
if(dojo.isArray(p)){
p.push(o);
}else{
obj[_1b]=[p,o];
}
}
}else{
if(_1a.nodeType===3||_1a.nodeType===4){
_18+=_1a.nodeValue;
}
}
}
var _1c=0;
if(this.element.nodeType===1){
_1c=this.element.attributes.length;
for(i=0;i<_1c;i++){
var _1d=this.element.attributes[i];
obj["@"+_1d.nodeName]=_1d.nodeValue;
}
}
if(_19===0){
if(_1c===0){
return _18;
}
obj["text()"]=_18;
}
return obj;
},_getDocument:function(){
if(this.element){
return (this.element.nodeType==9?this.element:this.element.ownerDocument);
}else{
return dojox.xml.parser.parse();
}
}});
}
