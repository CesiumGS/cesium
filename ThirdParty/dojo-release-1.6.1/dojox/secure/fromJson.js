/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.secure.fromJson"]){
dojo._hasResource["dojox.secure.fromJson"]=true;
dojo.provide("dojox.secure.fromJson");
dojox.secure.fromJson=typeof JSON!="undefined"?JSON.parse:(function(){
var _1="(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)";
var _2="(?:[^\\0-\\x08\\x0a-\\x1f\"\\\\]"+"|\\\\(?:[\"/\\\\bfnrt]|u[0-9A-Fa-f]{4}))";
var _3="(?:\""+_2+"*\")";
var _4=new RegExp("(?:false|true|null|[\\{\\}\\[\\]]"+"|"+_1+"|"+_3+")","g");
var _5=new RegExp("\\\\(?:([^u])|u(.{4}))","g");
var _6={"\"":"\"","/":"/","\\":"\\","b":"\b","f":"\f","n":"\n","r":"\r","t":"\t"};
function _7(_8,ch,_9){
return ch?_6[ch]:String.fromCharCode(parseInt(_9,16));
};
var _a=new String("");
var _b="\\";
var _c={"{":Object,"[":Array};
var _d=Object.hasOwnProperty;
return function(_e,_f){
var _10=_e.match(_4);
var _11;
var tok=_10[0];
var _12=false;
if("{"===tok){
_11={};
}else{
if("["===tok){
_11=[];
}else{
_11=[];
_12=true;
}
}
var key;
var _13=[_11];
for(var i=1-_12,n=_10.length;i<n;++i){
tok=_10[i];
var _14;
switch(tok.charCodeAt(0)){
default:
_14=_13[0];
_14[key||_14.length]=+(tok);
key=void 0;
break;
case 34:
tok=tok.substring(1,tok.length-1);
if(tok.indexOf(_b)!==-1){
tok=tok.replace(_5,_7);
}
_14=_13[0];
if(!key){
if(_14 instanceof Array){
key=_14.length;
}else{
key=tok||_a;
break;
}
}
_14[key]=tok;
key=void 0;
break;
case 91:
_14=_13[0];
_13.unshift(_14[key||_14.length]=[]);
key=void 0;
break;
case 93:
_13.shift();
break;
case 102:
_14=_13[0];
_14[key||_14.length]=false;
key=void 0;
break;
case 110:
_14=_13[0];
_14[key||_14.length]=null;
key=void 0;
break;
case 116:
_14=_13[0];
_14[key||_14.length]=true;
key=void 0;
break;
case 123:
_14=_13[0];
_13.unshift(_14[key||_14.length]={});
key=void 0;
break;
case 125:
_13.shift();
break;
}
}
if(_12){
if(_13.length!==1){
throw new Error();
}
_11=_11[0];
}else{
if(_13.length){
throw new Error();
}
}
if(_f){
var _15=function(_16,key){
var _17=_16[key];
if(_17&&typeof _17==="object"){
var _18=null;
for(var k in _17){
if(_d.call(_17,k)&&_17!==_16){
var v=_15(_17,k);
if(v!==void 0){
_17[k]=v;
}else{
if(!_18){
_18=[];
}
_18.push(k);
}
}
}
if(_18){
for(var i=_18.length;--i>=0;){
delete _17[_18[i]];
}
}
}
return _f.call(_16,key,_17);
};
_11=_15({"":_11},"");
}
return _11;
};
})();
}
