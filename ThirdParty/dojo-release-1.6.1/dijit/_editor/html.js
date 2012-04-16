/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.html"]){
dojo._hasResource["dijit._editor.html"]=true;
dojo.provide("dijit._editor.html");
dojo.getObject("_editor",true,dijit);
dijit._editor.escapeXml=function(_1,_2){
_1=_1.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
if(!_2){
_1=_1.replace(/'/gm,"&#39;");
}
return _1;
};
dijit._editor.getNodeHtml=function(_3){
var _4;
switch(_3.nodeType){
case 1:
var _5=_3.nodeName.toLowerCase();
if(!_5||_5.charAt(0)=="/"){
return "";
}
_4="<"+_5;
var _6=[];
var _7;
if(dojo.isIE&&_3.outerHTML){
var s=_3.outerHTML;
s=s.substr(0,s.indexOf(">")).replace(/(['"])[^"']*\1/g,"");
var _8=/(\b\w+)\s?=/g;
var m,_9;
while((m=_8.exec(s))){
_9=m[1];
if(_9.substr(0,3)!="_dj"){
if(_9=="src"||_9=="href"){
if(_3.getAttribute("_djrealurl")){
_6.push([_9,_3.getAttribute("_djrealurl")]);
continue;
}
}
var _a,_b;
switch(_9){
case "style":
_a=_3.style.cssText.toLowerCase();
break;
case "class":
_a=_3.className;
break;
case "width":
if(_5==="img"){
_b=/width=(\S+)/i.exec(s);
if(_b){
_a=_b[1];
}
break;
}
case "height":
if(_5==="img"){
_b=/height=(\S+)/i.exec(s);
if(_b){
_a=_b[1];
}
break;
}
default:
_a=_3.getAttribute(_9);
}
if(_a!=null){
_6.push([_9,_a.toString()]);
}
}
}
}else{
var i=0;
while((_7=_3.attributes[i++])){
var n=_7.name;
if(n.substr(0,3)!="_dj"){
var v=_7.value;
if(n=="src"||n=="href"){
if(_3.getAttribute("_djrealurl")){
v=_3.getAttribute("_djrealurl");
}
}
_6.push([n,v]);
}
}
}
_6.sort(function(a,b){
return a[0]<b[0]?-1:(a[0]==b[0]?0:1);
});
var j=0;
while((_7=_6[j++])){
_4+=" "+_7[0]+"=\""+(dojo.isString(_7[1])?dijit._editor.escapeXml(_7[1],true):_7[1])+"\"";
}
if(_5==="script"){
_4+=">"+_3.innerHTML+"</"+_5+">";
}else{
if(_3.childNodes.length){
_4+=">"+dijit._editor.getChildrenHtml(_3)+"</"+_5+">";
}else{
switch(_5){
case "br":
case "hr":
case "img":
case "input":
case "base":
case "meta":
case "area":
case "basefont":
_4+=" />";
break;
default:
_4+="></"+_5+">";
}
}
}
break;
case 4:
case 3:
_4=dijit._editor.escapeXml(_3.nodeValue,true);
break;
case 8:
_4="<!--"+dijit._editor.escapeXml(_3.nodeValue,true)+"-->";
break;
default:
_4="<!-- Element not recognized - Type: "+_3.nodeType+" Name: "+_3.nodeName+"-->";
}
return _4;
};
dijit._editor.getChildrenHtml=function(_c){
var _d="";
if(!_c){
return _d;
}
var _e=_c["childNodes"]||_c;
var _f=!dojo.isIE||_e!==_c;
var _10,i=0;
while((_10=_e[i++])){
if(!_f||_10.parentNode==_c){
_d+=dijit._editor.getNodeHtml(_10);
}
}
return _d;
};
}
