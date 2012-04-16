/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.secure.DOM"]){
dojo._hasResource["dojox.secure.DOM"]=true;
dojo.provide("dojox.secure.DOM");
dojo.require("dojox.lang.observable");
dojox.secure.DOM=function(_1){
function _2(_3){
if(!_3){
return _3;
}
var _4=_3;
do{
if(_4==_1){
return _5(_3);
}
}while((_4=_4.parentNode));
return null;
};
function _5(_6){
if(_6){
if(_6.nodeType){
var _7=_8(_6);
if(_6.nodeType==1&&typeof _7.style=="function"){
_7.style=_9(_6.style);
_7.ownerDocument=_a;
_7.childNodes={__get__:function(i){
return _5(_6.childNodes[i]);
},length:0};
}
return _7;
}
if(_6&&typeof _6=="object"){
if(_6.__observable){
return _6.__observable;
}
_7=_6 instanceof Array?[]:{};
_6.__observable=_7;
for(var i in _6){
if(i!="__observable"){
_7[i]=_5(_6[i]);
}
}
_7.data__=_6;
return _7;
}
if(typeof _6=="function"){
var _b=function(_c){
if(typeof _c=="function"){
return function(){
for(var i=0;i<arguments.length;i++){
arguments[i]=_5(arguments[i]);
}
return _b(_c.apply(_5(this),arguments));
};
}
return dojox.secure.unwrap(_c);
};
return function(){
if(_6.safetyCheck){
_6.safetyCheck.apply(_b(this),arguments);
}
for(var i=0;i<arguments.length;i++){
arguments[i]=_b(arguments[i]);
}
return _5(_6.apply(_b(this),arguments));
};
}
}
return _6;
};
unwrap=dojox.secure.unwrap;
function _d(_e){
_e+="";
if(_e.match(/behavior:|content:|javascript:|binding|expression|\@import/)){
throw new Error("Illegal CSS");
}
var id=_1.id||(_1.id="safe"+(""+Math.random()).substring(2));
return _e.replace(/(\}|^)\s*([^\{]*\{)/g,function(t,a,b){
return a+" #"+id+" "+b;
});
};
function _f(url){
if(url.match(/:/)&&!url.match(/^(http|ftp|mailto)/)){
throw new Error("Unsafe URL "+url);
}
};
function _10(el){
if(el&&el.nodeType==1){
if(el.tagName.match(/script/i)){
var src=el.src;
if(src&&src!=""){
el.parentNode.removeChild(el);
dojo.xhrGet({url:src,secure:true}).addCallback(function(_11){
_a.evaluate(_11);
});
}else{
var _12=el.innerHTML;
el.parentNode.removeChild(el);
_5.evaluate(_12);
}
}
if(el.tagName.match(/link/i)){
throw new Error("illegal tag");
}
if(el.tagName.match(/style/i)){
var _13=function(_14){
if(el.styleSheet){
el.styleSheet.cssText=_14;
}else{
var _15=doc.createTextNode(_14);
if(el.childNodes[0]){
el.replaceChild(_15,el.childNodes[0]);
}else{
el.appendChild(_15);
}
}
};
src=el.src;
if(src&&src!=""){
alert("src"+src);
el.src=null;
dojo.xhrGet({url:src,secure:true}).addCallback(function(_16){
_13(_d(_16));
});
}
_13(_d(el.innerHTML));
}
if(el.style){
_d(el.style.cssText);
}
if(el.href){
_f(el.href);
}
if(el.src){
_f(el.src);
}
var _17,i=0;
while((_17=el.attributes[i++])){
if(_17.name.substring(0,2)=="on"&&_17.value!="null"&&_17.value!=""){
throw new Error("event handlers not allowed in the HTML, they must be set with element.addEventListener");
}
}
var _18=el.childNodes;
for(var i=0,l=_18.length;i<l;i++){
_10(_18[i]);
}
}
};
function _19(_1a){
var div=document.createElement("div");
if(_1a.match(/<object/i)){
throw new Error("The object tag is not allowed");
}
div.innerHTML=_1a;
_10(div);
return div;
};
var doc=_1.ownerDocument;
var _a={getElementById:function(id){
return _2(doc.getElementById(id));
},createElement:function(_1b){
return _5(doc.createElement(_1b));
},createTextNode:function(_1c){
return _5(doc.createTextNode(_1c));
},write:function(str){
var div=_19(str);
while(div.childNodes.length){
_1.appendChild(div.childNodes[0]);
}
}};
_a.open=_a.close=function(){
};
var _1d={innerHTML:function(_1e,_1f){
_1e.innerHTML=_19(_1f).innerHTML;
}};
_1d.outerHTML=function(_20,_21){
throw new Error("Can not set this property");
};
function _22(_23,_24){
return function(_25,_26){
_10(_26[_24]);
return _25[_23](_26[0]);
};
};
var _27={appendChild:_22("appendChild",0),insertBefore:_22("insertBefore",0),replaceChild:_22("replaceChild",1),cloneNode:function(_28,_29){
return _28.cloneNode(_29[0]);
},addEventListener:function(_2a,_2b){
dojo.connect(_2a,"on"+_2b[0],this,function(_2c){
_2c=_8(_2c||window.event);
_2b[1].call(this,_2c);
});
}};
_27.childNodes=_27.style=_27.ownerDocument=function(){
};
function _2d(_2e){
return dojox.lang.makeObservable(function(_2f,_30){
var _31;
return _2f[_30];
},_2e,function(_32,_33,_34,_35){
for(var i=0;i<_35.length;i++){
_35[i]=unwrap(_35[i]);
}
if(_27[_34]){
return _5(_27[_34].call(_32,_33,_35));
}
return _5(_33[_34].apply(_33,_35));
},_27);
};
var _8=_2d(function(_36,_37,_38){
if(_1d[_37]){
_1d[_37](_36,_38);
}
_36[_37]=_38;
});
var _39={behavior:1,MozBinding:1};
var _9=_2d(function(_3a,_3b,_3c){
if(!_39[_3b]){
_3a[_3b]=_d(_3c);
}
});
_5.safeHTML=_19;
_5.safeCSS=_d;
return _5;
};
dojox.secure.unwrap=function unwrap(_3d){
return (_3d&&_3d.data__)||_3d;
};
}
