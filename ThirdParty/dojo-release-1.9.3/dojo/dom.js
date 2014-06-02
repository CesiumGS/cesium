/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom",["./sniff","./_base/window"],function(_1,_2){
if(_1("ie")<=7){
try{
document.execCommand("BackgroundImageCache",false,true);
}
catch(e){
}
}
var _3={};
if(_1("ie")){
_3.byId=function(id,_4){
if(typeof id!="string"){
return id;
}
var _5=_4||_2.doc,te=id&&_5.getElementById(id);
if(te&&(te.attributes.id.value==id||te.id==id)){
return te;
}else{
var _6=_5.all[id];
if(!_6||_6.nodeName){
_6=[_6];
}
var i=0;
while((te=_6[i++])){
if((te.attributes&&te.attributes.id&&te.attributes.id.value==id)||te.id==id){
return te;
}
}
}
};
}else{
_3.byId=function(id,_7){
return ((typeof id=="string")?(_7||_2.doc).getElementById(id):id)||null;
};
}
_3.isDescendant=function(_8,_9){
try{
_8=_3.byId(_8);
_9=_3.byId(_9);
while(_8){
if(_8==_9){
return true;
}
_8=_8.parentNode;
}
}
catch(e){
}
return false;
};
_1.add("css-user-select",function(_a,_b,_c){
if(!_c){
return false;
}
var _d=_c.style;
var _e=["Khtml","O","ms","Moz","Webkit"],i=_e.length,_f="userSelect",_10;
do{
if(typeof _d[_f]!=="undefined"){
return _f;
}
}while(i--&&(_f=_e[i]+"UserSelect"));
return false;
});
var _11=_1("css-user-select");
_3.setSelectable=_11?function(_12,_13){
_3.byId(_12).style[_11]=_13?"":"none";
}:function(_14,_15){
_14=_3.byId(_14);
var _16=_14.getElementsByTagName("*"),i=_16.length;
if(_15){
_14.removeAttribute("unselectable");
while(i--){
_16[i].removeAttribute("unselectable");
}
}else{
_14.setAttribute("unselectable","on");
while(i--){
_16[i].setAttribute("unselectable","on");
}
}
};
return _3;
});
