/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-prop",["exports","./_base/kernel","./sniff","./_base/lang","./dom","./dom-style","./dom-construct","./_base/connect"],function(_1,_2,_3,_4,_5,_6,_7,_8){
var _9={},_a=0,_b=_2._scopeName+"attrid";
_1.names={"class":"className","for":"htmlFor",tabindex:"tabIndex",readonly:"readOnly",colspan:"colSpan",frameborder:"frameBorder",rowspan:"rowSpan",valuetype:"valueType"};
_1.get=function getProp(_c,_d){
_c=_5.byId(_c);
var lc=_d.toLowerCase(),_e=_1.names[lc]||_d;
return _c[_e];
};
_1.set=function setProp(_f,_10,_11){
_f=_5.byId(_f);
var l=arguments.length;
if(l==2&&typeof _10!="string"){
for(var x in _10){
_1.set(_f,x,_10[x]);
}
return _f;
}
var lc=_10.toLowerCase(),_12=_1.names[lc]||_10;
if(_12=="style"&&typeof _11!="string"){
_6.set(_f,_11);
return _f;
}
if(_12=="innerHTML"){
if(_3("ie")&&_f.tagName.toLowerCase() in {col:1,colgroup:1,table:1,tbody:1,tfoot:1,thead:1,tr:1,title:1}){
_7.empty(_f);
_f.appendChild(_7.toDom(_11,_f.ownerDocument));
}else{
_f[_12]=_11;
}
return _f;
}
if(_4.isFunction(_11)){
var _13=_f[_b];
if(!_13){
_13=_a++;
_f[_b]=_13;
}
if(!_9[_13]){
_9[_13]={};
}
var h=_9[_13][_12];
if(h){
_8.disconnect(h);
}else{
try{
delete _f[_12];
}
catch(e){
}
}
if(_11){
_9[_13][_12]=_8.connect(_f,_12,_11);
}else{
_f[_12]=null;
}
return _f;
}
_f[_12]=_11;
return _f;
};
});
