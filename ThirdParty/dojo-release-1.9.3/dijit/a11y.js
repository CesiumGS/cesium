//>>built
define("dijit/a11y",["dojo/_base/array","dojo/dom","dojo/dom-attr","dojo/dom-style","dojo/_base/lang","dojo/sniff","./main"],function(_1,_2,_3,_4,_5,_6,_7){
var _8;
var _9={_isElementShown:function(_a){
var s=_4.get(_a);
return (s.visibility!="hidden")&&(s.visibility!="collapsed")&&(s.display!="none")&&(_3.get(_a,"type")!="hidden");
},hasDefaultTabStop:function(_b){
switch(_b.nodeName.toLowerCase()){
case "a":
return _3.has(_b,"href");
case "area":
case "button":
case "input":
case "object":
case "select":
case "textarea":
return true;
case "iframe":
var _c;
try{
var _d=_b.contentDocument;
if("designMode" in _d&&_d.designMode=="on"){
return true;
}
_c=_d.body;
}
catch(e1){
try{
_c=_b.contentWindow.document.body;
}
catch(e2){
return false;
}
}
return _c&&(_c.contentEditable=="true"||(_c.firstChild&&_c.firstChild.contentEditable=="true"));
default:
return _b.contentEditable=="true";
}
},effectiveTabIndex:function(_e){
if(_3.get(_e,"disabled")){
return _8;
}else{
if(_3.has(_e,"tabIndex")){
return +_3.get(_e,"tabIndex");
}else{
return _9.hasDefaultTabStop(_e)?0:_8;
}
}
},isTabNavigable:function(_f){
return _9.effectiveTabIndex(_f)>=0;
},isFocusable:function(_10){
return _9.effectiveTabIndex(_10)>=-1;
},_getTabNavigable:function(_11){
var _12,_13,_14,_15,_16,_17,_18={};
function _19(_1a){
return _1a&&_1a.tagName.toLowerCase()=="input"&&_1a.type&&_1a.type.toLowerCase()=="radio"&&_1a.name&&_1a.name.toLowerCase();
};
var _1b=_9._isElementShown,_1c=_9.effectiveTabIndex;
var _1d=function(_1e){
for(var _1f=_1e.firstChild;_1f;_1f=_1f.nextSibling){
if(_1f.nodeType!=1||(_6("ie")<=9&&_1f.scopeName!=="HTML")||!_1b(_1f)){
continue;
}
var _20=_1c(_1f);
if(_20>=0){
if(_20==0){
if(!_12){
_12=_1f;
}
_13=_1f;
}else{
if(_20>0){
if(!_14||_20<_15){
_15=_20;
_14=_1f;
}
if(!_16||_20>=_17){
_17=_20;
_16=_1f;
}
}
}
var rn=_19(_1f);
if(_3.get(_1f,"checked")&&rn){
_18[rn]=_1f;
}
}
if(_1f.nodeName.toUpperCase()!="SELECT"){
_1d(_1f);
}
}
};
if(_1b(_11)){
_1d(_11);
}
function rs(_21){
return _18[_19(_21)]||_21;
};
return {first:rs(_12),last:rs(_13),lowest:rs(_14),highest:rs(_16)};
},getFirstInTabbingOrder:function(_22,doc){
var _23=_9._getTabNavigable(_2.byId(_22,doc));
return _23.lowest?_23.lowest:_23.first;
},getLastInTabbingOrder:function(_24,doc){
var _25=_9._getTabNavigable(_2.byId(_24,doc));
return _25.last?_25.last:_25.highest;
}};
1&&_5.mixin(_7,_9);
return _9;
});
