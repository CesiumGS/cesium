/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/selector/lite",["../has","../_base/kernel"],function(_1,_2){
"use strict";
var _3=document.createElement("div");
var _4=_3.matchesSelector||_3.webkitMatchesSelector||_3.mozMatchesSelector||_3.msMatchesSelector||_3.oMatchesSelector;
var _5=_3.querySelectorAll;
var _6=/([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g;
_1.add("dom-matches-selector",!!_4);
_1.add("dom-qsa",!!_5);
var _7=function(_8,_9){
if(_a&&_8.indexOf(",")>-1){
return _a(_8,_9);
}
var _b=_9?_9.ownerDocument||_9:_2.doc||document,_c=(_5?/^([\w]*)#([\w\-]+$)|^(\.)([\w\-\*]+$)|^(\w+$)/:/^([\w]*)#([\w\-]+)(?:\s+(.*))?$|(?:^|(>|.+\s+))([\w\-\*]+)(\S*$)/).exec(_8);
_9=_9||_b;
if(_c){
if(_c[2]){
var _d=_2.byId?_2.byId(_c[2],_b):_b.getElementById(_c[2]);
if(!_d||(_c[1]&&_c[1]!=_d.tagName.toLowerCase())){
return [];
}
if(_9!=_b){
var _e=_d;
while(_e!=_9){
_e=_e.parentNode;
if(!_e){
return [];
}
}
}
return _c[3]?_7(_c[3],_d):[_d];
}
if(_c[3]&&_9.getElementsByClassName){
return _9.getElementsByClassName(_c[4]);
}
var _d;
if(_c[5]){
_d=_9.getElementsByTagName(_c[5]);
if(_c[4]||_c[6]){
_8=(_c[4]||"")+_c[6];
}else{
return _d;
}
}
}
if(_5){
if(_9.nodeType===1&&_9.nodeName.toLowerCase()!=="object"){
return _f(_9,_8,_9.querySelectorAll);
}else{
return _9.querySelectorAll(_8);
}
}else{
if(!_d){
_d=_9.getElementsByTagName("*");
}
}
var _10=[];
for(var i=0,l=_d.length;i<l;i++){
var _11=_d[i];
if(_11.nodeType==1&&_12(_11,_8,_9)){
_10.push(_11);
}
}
return _10;
};
var _f=function(_13,_14,_15){
var _16=_13,old=_13.getAttribute("id"),nid=old||"__dojo__",_17=_13.parentNode,_18=/^\s*[+~]/.test(_14);
if(_18&&!_17){
return [];
}
if(!old){
_13.setAttribute("id",nid);
}else{
nid=nid.replace(/'/g,"\\$&");
}
if(_18&&_17){
_13=_13.parentNode;
}
var _19=_14.match(_6);
for(var i=0;i<_19.length;i++){
_19[i]="[id='"+nid+"'] "+_19[i];
}
_14=_19.join(",");
try{
return _15.call(_13,_14);
}
finally{
if(!old){
_16.removeAttribute("id");
}
}
};
if(!_1("dom-matches-selector")){
var _12=(function(){
var _1a=_3.tagName=="div"?"toLowerCase":"toUpperCase";
var _1b={"":function(_1c){
_1c=_1c[_1a]();
return function(_1d){
return _1d.tagName==_1c;
};
},".":function(_1e){
var _1f=" "+_1e+" ";
return function(_20){
return _20.className.indexOf(_1e)>-1&&(" "+_20.className+" ").indexOf(_1f)>-1;
};
},"#":function(id){
return function(_21){
return _21.id==id;
};
}};
var _22={"^=":function(_23,_24){
return _23.indexOf(_24)==0;
},"*=":function(_25,_26){
return _25.indexOf(_26)>-1;
},"$=":function(_27,_28){
return _27.substring(_27.length-_28.length,_27.length)==_28;
},"~=":function(_29,_2a){
return (" "+_29+" ").indexOf(" "+_2a+" ")>-1;
},"|=":function(_2b,_2c){
return (_2b+"-").indexOf(_2c+"-")==0;
},"=":function(_2d,_2e){
return _2d==_2e;
},"":function(_2f,_30){
return true;
}};
function _31(_32,_33,_34){
var _35=_33.charAt(0);
if(_35=="\""||_35=="'"){
_33=_33.slice(1,-1);
}
_33=_33.replace(/\\/g,"");
var _36=_22[_34||""];
return function(_37){
var _38=_37.getAttribute(_32);
return _38&&_36(_38,_33);
};
};
function _39(_3a){
return function(_3b,_3c){
while((_3b=_3b.parentNode)!=_3c){
if(_3a(_3b,_3c)){
return true;
}
}
};
};
function _3d(_3e){
return function(_3f,_40){
_3f=_3f.parentNode;
return _3e?_3f!=_40&&_3e(_3f,_40):_3f==_40;
};
};
var _41={};
function and(_42,_43){
return _42?function(_44,_45){
return _43(_44)&&_42(_44,_45);
}:_43;
};
return function(_46,_47,_48){
var _49=_41[_47];
if(!_49){
if(_47.replace(/(?:\s*([> ])\s*)|(#|\.)?((?:\\.|[\w-])+)|\[\s*([\w-]+)\s*(.?=)?\s*("(?:\\.|[^"])+"|'(?:\\.|[^'])+'|(?:\\.|[^\]])*)\s*\]/g,function(t,_4a,_4b,_4c,_4d,_4e,_4f){
if(_4c){
_49=and(_49,_1b[_4b||""](_4c.replace(/\\/g,"")));
}else{
if(_4a){
_49=(_4a==" "?_39:_3d)(_49);
}else{
if(_4d){
_49=and(_49,_31(_4d,_4f,_4e));
}
}
}
return "";
})){
throw new Error("Syntax error in query");
}
if(!_49){
return true;
}
_41[_47]=_49;
}
return _49(_46,_48);
};
})();
}
if(!_1("dom-qsa")){
var _a=function(_50,_51){
var _52=_50.match(_6);
var _53=[];
for(var i=0;i<_52.length;i++){
_50=new String(_52[i].replace(/\s*$/,""));
_50.indexOf=escape;
var _54=_7(_50,_51);
for(var j=0,l=_54.length;j<l;j++){
var _55=_54[j];
_53[_55.sourceIndex]=_55;
}
}
var _56=[];
for(i in _53){
_56.push(_53[i]);
}
return _56;
};
}
_7.match=_4?function(_57,_58,_59){
if(_59&&_59.nodeType!=9){
return _f(_59,_58,function(_5a){
return _4.call(_57,_5a);
});
}
return _4.call(_57,_58);
}:_12;
return _7;
});
