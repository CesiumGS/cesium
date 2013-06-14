/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-form",["./_base/lang","./dom","./io-query","./json"],function(_1,_2,_3,_4){
function _5(_6,_7,_8){
if(_8===null){
return;
}
var _9=_6[_7];
if(typeof _9=="string"){
_6[_7]=[_9,_8];
}else{
if(_1.isArray(_9)){
_9.push(_8);
}else{
_6[_7]=_8;
}
}
};
var _a="file|submit|image|reset|button";
var _b={fieldToObject:function fieldToObject(_c){
var _d=null;
_c=_2.byId(_c);
if(_c){
var _e=_c.name,_f=(_c.type||"").toLowerCase();
if(_e&&_f&&!_c.disabled){
if(_f=="radio"||_f=="checkbox"){
if(_c.checked){
_d=_c.value;
}
}else{
if(_c.multiple){
_d=[];
var _10=[_c.firstChild];
while(_10.length){
for(var _11=_10.pop();_11;_11=_11.nextSibling){
if(_11.nodeType==1&&_11.tagName.toLowerCase()=="option"){
if(_11.selected){
_d.push(_11.value);
}
}else{
if(_11.nextSibling){
_10.push(_11.nextSibling);
}
if(_11.firstChild){
_10.push(_11.firstChild);
}
break;
}
}
}
}else{
_d=_c.value;
}
}
}
}
return _d;
},toObject:function formToObject(_12){
var ret={},_13=_2.byId(_12).elements;
for(var i=0,l=_13.length;i<l;++i){
var _14=_13[i],_15=_14.name,_16=(_14.type||"").toLowerCase();
if(_15&&_16&&_a.indexOf(_16)<0&&!_14.disabled){
_5(ret,_15,_b.fieldToObject(_14));
if(_16=="image"){
ret[_15+".x"]=ret[_15+".y"]=ret[_15].x=ret[_15].y=0;
}
}
}
return ret;
},toQuery:function formToQuery(_17){
return _3.objectToQuery(_b.toObject(_17));
},toJson:function formToJson(_18,_19){
return _4.stringify(_b.toObject(_18),null,_19?4:0);
}};
return _b;
});
