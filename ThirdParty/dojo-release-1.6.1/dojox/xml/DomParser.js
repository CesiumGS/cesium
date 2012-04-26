/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xml.DomParser"]){
dojo._hasResource["dojox.xml.DomParser"]=true;
dojo.provide("dojox.xml.DomParser");
dojox.xml.DomParser=new (function(){
var _1={ELEMENT:1,ATTRIBUTE:2,TEXT:3,CDATA_SECTION:4,PROCESSING_INSTRUCTION:7,COMMENT:8,DOCUMENT:9};
var _2=/<([^>\/\s+]*)([^>]*)>([^<]*)/g;
var _3=/([^=]*)=(("([^"]*)")|('([^']*)'))/g;
var _4=/<!ENTITY\s+([^"]*)\s+"([^"]*)">/g;
var _5=/<!\[CDATA\[([\u0001-\uFFFF]*?)\]\]>/g;
var _6=/<!--([\u0001-\uFFFF]*?)-->/g;
var _7=/^\s+|\s+$/g;
var _8=/\s+/g;
var _9=/\&gt;/g;
var _a=/\&lt;/g;
var _b=/\&quot;/g;
var _c=/\&apos;/g;
var _d=/\&amp;/g;
var _e="_def_";
function _f(){
return new (function(){
var all={};
this.nodeType=_1.DOCUMENT;
this.nodeName="#document";
this.namespaces={};
this._nsPaths={};
this.childNodes=[];
this.documentElement=null;
this._add=function(obj){
if(typeof (obj.id)!="undefined"){
all[obj.id]=obj;
}
};
this._remove=function(id){
if(all[id]){
delete all[id];
}
};
this.byId=this.getElementById=function(id){
return all[id];
};
this.byName=this.getElementsByTagName=_10;
this.byNameNS=this.getElementsByTagNameNS=_11;
this.childrenByName=_12;
this.childrenByNameNS=_13;
})();
};
function _10(_14){
function _15(_16,_17,arr){
dojo.forEach(_16.childNodes,function(c){
if(c.nodeType==_1.ELEMENT){
if(_17=="*"){
arr.push(c);
}else{
if(c.nodeName==_17){
arr.push(c);
}
}
_15(c,_17,arr);
}
});
};
var a=[];
_15(this,_14,a);
return a;
};
function _11(_18,ns){
function _19(_1a,_1b,ns,arr){
dojo.forEach(_1a.childNodes,function(c){
if(c.nodeType==_1.ELEMENT){
if(_1b=="*"&&c.ownerDocument._nsPaths[ns]==c.namespace){
arr.push(c);
}else{
if(c.localName==_1b&&c.ownerDocument._nsPaths[ns]==c.namespace){
arr.push(c);
}
}
_19(c,_1b,ns,arr);
}
});
};
if(!ns){
ns=_e;
}
var a=[];
_19(this,_18,ns,a);
return a;
};
function _12(_1c){
var a=[];
dojo.forEach(this.childNodes,function(c){
if(c.nodeType==_1.ELEMENT){
if(_1c=="*"){
a.push(c);
}else{
if(c.nodeName==_1c){
a.push(c);
}
}
}
});
return a;
};
function _13(_1d,ns){
var a=[];
dojo.forEach(this.childNodes,function(c){
if(c.nodeType==_1.ELEMENT){
if(_1d=="*"&&c.ownerDocument._nsPaths[ns]==c.namespace){
a.push(c);
}else{
if(c.localName==_1d&&c.ownerDocument._nsPaths[ns]==c.namespace){
a.push(c);
}
}
}
});
return a;
};
function _1e(v){
return {nodeType:_1.TEXT,nodeName:"#text",nodeValue:v.replace(_8," ").replace(_9,">").replace(_a,"<").replace(_c,"'").replace(_b,"\"").replace(_d,"&")};
};
function _1f(_20){
for(var i=0;i<this.attributes.length;i++){
if(this.attributes[i].nodeName==_20){
return this.attributes[i].nodeValue;
}
}
return null;
};
function _21(_22,ns){
for(var i=0;i<this.attributes.length;i++){
if(this.ownerDocument._nsPaths[ns]==this.attributes[i].namespace&&this.attributes[i].localName==_22){
return this.attributes[i].nodeValue;
}
}
return null;
};
function _23(_24,val){
var old=null;
for(var i=0;i<this.attributes.length;i++){
if(this.attributes[i].nodeName==_24){
old=this.attributes[i].nodeValue;
this.attributes[i].nodeValue=val;
break;
}
}
if(_24=="id"){
if(old!=null){
this.ownerDocument._remove(old);
}
this.ownerDocument._add(this);
}
};
function _25(_26,val,ns){
for(var i=0;i<this.attributes.length;i++){
if(this.ownerDocument._nsPaths[ns]==this.attributes[i].namespace&&this.attributes[i].localName==_26){
this.attributes[i].nodeValue=val;
return;
}
}
};
function _27(){
var p=this.parentNode;
if(p){
for(var i=0;i<p.childNodes.length;i++){
if(p.childNodes[i]==this&&i>0){
return p.childNodes[i-1];
}
}
}
return null;
};
function _28(){
var p=this.parentNode;
if(p){
for(var i=0;i<p.childNodes.length;i++){
if(p.childNodes[i]==this&&(i+1)<p.childNodes.length){
return p.childNodes[i+1];
}
}
}
return null;
};
this.parse=function(str){
var _29=_f();
if(str==null){
return _29;
}
if(str.length==0){
return _29;
}
if(str.indexOf("<!ENTITY")>0){
var _2a,eRe=[];
if(_4.test(str)){
_4.lastIndex=0;
while((_2a=_4.exec(str))!=null){
eRe.push({entity:"&"+_2a[1].replace(_7,"")+";",expression:_2a[2]});
}
for(var i=0;i<eRe.length;i++){
str=str.replace(new RegExp(eRe[i].entity,"g"),eRe[i].expression);
}
}
}
var _2b=[],_2c;
while((_2c=_5.exec(str))!=null){
_2b.push(_2c[1]);
}
for(var i=0;i<_2b.length;i++){
str=str.replace(_2b[i],i);
}
var _2d=[],_2e;
while((_2e=_6.exec(str))!=null){
_2d.push(_2e[1]);
}
for(i=0;i<_2d.length;i++){
str=str.replace(_2d[i],i);
}
var res,obj=_29;
while((res=_2.exec(str))!=null){
if(res[2].charAt(0)=="/"&&res[2].replace(_7,"").length>1){
if(obj.parentNode){
obj=obj.parentNode;
}
var _2f=(res[3]||"").replace(_7,"");
if(_2f.length>0){
obj.childNodes.push(_1e(_2f));
}
}else{
if(res[1].length>0){
if(res[1].charAt(0)=="?"){
var _30=res[1].substr(1);
var _31=res[2].substr(0,res[2].length-2);
obj.childNodes.push({nodeType:_1.PROCESSING_INSTRUCTION,nodeName:_30,nodeValue:_31});
}else{
if(res[1].charAt(0)=="!"){
if(res[1].indexOf("![CDATA[")==0){
var val=parseInt(res[1].replace("![CDATA[","").replace("]]",""));
obj.childNodes.push({nodeType:_1.CDATA_SECTION,nodeName:"#cdata-section",nodeValue:_2b[val]});
}else{
if(res[1].substr(0,3)=="!--"){
var val=parseInt(res[1].replace("!--","").replace("--",""));
obj.childNodes.push({nodeType:_1.COMMENT,nodeName:"#comment",nodeValue:_2d[val]});
}
}
}else{
var _30=res[1].replace(_7,"");
var o={nodeType:_1.ELEMENT,nodeName:_30,localName:_30,namespace:_e,ownerDocument:_29,attributes:[],parentNode:null,childNodes:[]};
if(_30.indexOf(":")>-1){
var t=_30.split(":");
o.namespace=t[0];
o.localName=t[1];
}
o.byName=o.getElementsByTagName=_10;
o.byNameNS=o.getElementsByTagNameNS=_11;
o.childrenByName=_12;
o.childrenByNameNS=_13;
o.getAttribute=_1f;
o.getAttributeNS=_21;
o.setAttribute=_23;
o.setAttributeNS=_25;
o.previous=o.previousSibling=_27;
o.next=o.nextSibling=_28;
var _32;
while((_32=_3.exec(res[2]))!=null){
if(_32.length>0){
var _30=_32[1].replace(_7,"");
var val=(_32[4]||_32[6]||"").replace(_8," ").replace(_9,">").replace(_a,"<").replace(_c,"'").replace(_b,"\"").replace(_d,"&");
if(_30.indexOf("xmlns")==0){
if(_30.indexOf(":")>0){
var ns=_30.split(":");
_29.namespaces[ns[1]]=val;
_29._nsPaths[val]=ns[1];
}else{
_29.namespaces[_e]=val;
_29._nsPaths[val]=_e;
}
}else{
var ln=_30;
var ns=_e;
if(_30.indexOf(":")>0){
var t=_30.split(":");
ln=t[1];
ns=t[0];
}
o.attributes.push({nodeType:_1.ATTRIBUTE,nodeName:_30,localName:ln,namespace:ns,nodeValue:val});
if(ln=="id"){
o.id=val;
}
}
}
}
_29._add(o);
if(obj){
obj.childNodes.push(o);
o.parentNode=obj;
if(res[2].charAt(res[2].length-1)!="/"){
obj=o;
}
}
var _2f=res[3];
if(_2f.length>0){
obj.childNodes.push(_1e(_2f));
}
}
}
}
}
}
for(var i=0;i<_29.childNodes.length;i++){
var e=_29.childNodes[i];
if(e.nodeType==_1.ELEMENT){
_29.documentElement=e;
break;
}
}
return _29;
};
})();
}
