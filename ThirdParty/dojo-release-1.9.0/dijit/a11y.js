//>>built
define("dijit/a11y",["dojo/_base/array","dojo/dom","dojo/dom-attr","dojo/dom-style","dojo/_base/lang","dojo/sniff","./main"],function(_1,_2,_3,_4,_5,_6,_7){
var _8={_isElementShown:function(_9){
var s=_4.get(_9);
return (s.visibility!="hidden")&&(s.visibility!="collapsed")&&(s.display!="none")&&(_3.get(_9,"type")!="hidden");
},hasDefaultTabStop:function(_a){
switch(_a.nodeName.toLowerCase()){
case "a":
return _3.has(_a,"href");
case "area":
case "button":
case "input":
case "object":
case "select":
case "textarea":
return true;
case "iframe":
var _b;
try{
var _c=_a.contentDocument;
if("designMode" in _c&&_c.designMode=="on"){
return true;
}
_b=_c.body;
}
catch(e1){
try{
_b=_a.contentWindow.document.body;
}
catch(e2){
return false;
}
}
return _b&&(_b.contentEditable=="true"||(_b.firstChild&&_b.firstChild.contentEditable=="true"));
default:
return _a.contentEditable=="true";
}
},isTabNavigable:function(_d){
if(_3.get(_d,"disabled")){
return false;
}else{
if(_3.has(_d,"tabIndex")){
return _3.get(_d,"tabIndex")>=0;
}else{
return _8.hasDefaultTabStop(_d);
}
}
},_getTabNavigable:function(_e){
var _f,_10,_11,_12,_13,_14,_15={};
function _16(_17){
return _17&&_17.tagName.toLowerCase()=="input"&&_17.type&&_17.type.toLowerCase()=="radio"&&_17.name&&_17.name.toLowerCase();
};
var _18=_8._isElementShown,_19=_8.isTabNavigable;
var _1a=function(_1b){
for(var _1c=_1b.firstChild;_1c;_1c=_1c.nextSibling){
if(_1c.nodeType!=1||(_6("ie")<=9&&_1c.scopeName!=="HTML")||!_18(_1c)){
continue;
}
if(_19(_1c)){
var _1d=+_3.get(_1c,"tabIndex");
if(!_3.has(_1c,"tabIndex")||_1d==0){
if(!_f){
_f=_1c;
}
_10=_1c;
}else{
if(_1d>0){
if(!_11||_1d<_12){
_12=_1d;
_11=_1c;
}
if(!_13||_1d>=_14){
_14=_1d;
_13=_1c;
}
}
}
var rn=_16(_1c);
if(_3.get(_1c,"checked")&&rn){
_15[rn]=_1c;
}
}
if(_1c.nodeName.toUpperCase()!="SELECT"){
_1a(_1c);
}
}
};
if(_18(_e)){
_1a(_e);
}
function rs(_1e){
return _15[_16(_1e)]||_1e;
};
return {first:rs(_f),last:rs(_10),lowest:rs(_11),highest:rs(_13)};
},getFirstInTabbingOrder:function(_1f,doc){
var _20=_8._getTabNavigable(_2.byId(_1f,doc));
return _20.lowest?_20.lowest:_20.first;
},getLastInTabbingOrder:function(_21,doc){
var _22=_8._getTabNavigable(_2.byId(_21,doc));
return _22.last?_22.last:_22.highest;
}};
1&&_5.mixin(_7,_8);
return _8;
});
