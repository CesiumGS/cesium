/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/io-query",["./_base/lang"],function(_1){
var _2={};
return {objectToQuery:function objectToQuery(_3){
var _4=encodeURIComponent,_5=[];
for(var _6 in _3){
var _7=_3[_6];
if(_7!=_2[_6]){
var _8=_4(_6)+"=";
if(_1.isArray(_7)){
for(var i=0,l=_7.length;i<l;++i){
_5.push(_8+_4(_7[i]));
}
}else{
_5.push(_8+_4(_7));
}
}
}
return _5.join("&");
},queryToObject:function queryToObject(_9){
var _a=decodeURIComponent,qp=_9.split("&"),_b={},_c,_d;
for(var i=0,l=qp.length,_e;i<l;++i){
_e=qp[i];
if(_e.length){
var s=_e.indexOf("=");
if(s<0){
_c=_a(_e);
_d="";
}else{
_c=_a(_e.slice(0,s));
_d=_a(_e.slice(s+1));
}
if(typeof _b[_c]=="string"){
_b[_c]=[_b[_c]];
}
if(_1.isArray(_b[_c])){
_b[_c].push(_d);
}else{
_b[_c]=_d;
}
}
}
return _b;
}};
});
