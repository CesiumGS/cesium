/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/window",["./kernel","./lang","../sniff"],function(_1,_2,_3){
var _4={global:_1.global,doc:this["document"]||null,body:function(_5){
_5=_5||_1.doc;
return _5.body||_5.getElementsByTagName("body")[0];
},setContext:function(_6,_7){
_1.global=_4.global=_6;
_1.doc=_4.doc=_7;
},withGlobal:function(_8,_9,_a,_b){
var _c=_1.global;
try{
_1.global=_4.global=_8;
return _4.withDoc.call(null,_8.document,_9,_a,_b);
}
finally{
_1.global=_4.global=_c;
}
},withDoc:function(_d,_e,_f,_10){
var _11=_4.doc,_12=_3("quirks"),_13=_3("ie"),_14,_15,_16;
try{
_1.doc=_4.doc=_d;
_1.isQuirks=_3.add("quirks",_1.doc.compatMode=="BackCompat",true,true);
if(_3("ie")){
if((_16=_d.parentWindow)&&_16.navigator){
_14=parseFloat(_16.navigator.appVersion.split("MSIE ")[1])||undefined;
_15=_d.documentMode;
if(_15&&_15!=5&&Math.floor(_14)!=_15){
_14=_15;
}
_1.isIE=_3.add("ie",_14,true,true);
}
}
if(_f&&typeof _e=="string"){
_e=_f[_e];
}
return _e.apply(_f,_10||[]);
}
finally{
_1.doc=_4.doc=_11;
_1.isQuirks=_3.add("quirks",_12,true,true);
_1.isIE=_3.add("ie",_13,true,true);
}
}};
1&&_2.mixin(_1,_4);
return _4;
});
