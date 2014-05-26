/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/has",["require","module"],function(_1,_2){
var _3=_1.has||function(){
};
if(!1){
var _4=typeof window!="undefined"&&typeof location!="undefined"&&typeof document!="undefined"&&window.location==location&&window.document==document,_5=this,_6=_4&&document,_7=_6&&_6.createElement("DiV"),_8=(_2.config&&_2.config())||{};
_3=function(_9){
return typeof _8[_9]=="function"?(_8[_9]=_8[_9](_5,_6,_7)):_8[_9];
};
_3.cache=_8;
_3.add=function(_a,_b,_c,_d){
(typeof _8[_a]=="undefined"||_d)&&(_8[_a]=_b);
return _c&&_3(_a);
};
1||_3.add("host-browser",_4);
0&&_3.add("host-node",(typeof process=="object"&&process.versions&&process.versions.node&&process.versions.v8));
0&&_3.add("host-rhino",(typeof load=="function"&&(typeof Packages=="function"||typeof Packages=="object")));
1||_3.add("dom",_4);
1||_3.add("dojo-dom-ready-api",1);
1||_3.add("dojo-sniff",1);
}
if(1){
_3.add("dom-addeventlistener",!!document.addEventListener);
_3.add("touch","ontouchstart" in document||window.navigator.msMaxTouchPoints>0);
_3.add("device-width",screen.availWidth||innerWidth);
var _e=document.createElement("form");
_3.add("dom-attributes-explicit",_e.attributes.length==0);
_3.add("dom-attributes-specified-flag",_e.attributes.length>0&&_e.attributes.length<40);
}
_3.clearElement=function(_f){
_f.innerHTML="";
return _f;
};
_3.normalize=function(id,_10){
var _11=id.match(/[\?:]|[^:\?]*/g),i=0,get=function(_12){
var _13=_11[i++];
if(_13==":"){
return 0;
}else{
if(_11[i++]=="?"){
if(!_12&&_3(_13)){
return get();
}else{
get(true);
return get(_12);
}
}
return _13||0;
}
};
id=get();
return id&&_10(id);
};
_3.load=function(id,_14,_15){
if(id){
_14([id],_15);
}else{
_15();
}
};
return _3;
});
