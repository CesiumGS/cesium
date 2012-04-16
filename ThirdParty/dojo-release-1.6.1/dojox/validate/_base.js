/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate._base"]){
dojo._hasResource["dojox.validate._base"]=true;
dojo.provide("dojox.validate._base");
dojo.experimental("dojox.validate");
dojo.require("dojo.regexp");
dojo.require("dojo.number");
dojo.require("dojox.validate.regexp");
dojox.validate.isText=function(_1,_2){
_2=(typeof _2=="object")?_2:{};
if(/^\s*$/.test(_1)){
return false;
}
if(typeof _2.length=="number"&&_2.length!=_1.length){
return false;
}
if(typeof _2.minlength=="number"&&_2.minlength>_1.length){
return false;
}
if(typeof _2.maxlength=="number"&&_2.maxlength<_1.length){
return false;
}
return true;
};
dojox.validate._isInRangeCache={};
dojox.validate.isInRange=function(_3,_4){
_3=dojo.number.parse(_3,_4);
if(isNaN(_3)){
return false;
}
_4=(typeof _4=="object")?_4:{};
var _5=(typeof _4.max=="number")?_4.max:Infinity,_6=(typeof _4.min=="number")?_4.min:-Infinity,_7=(typeof _4.decimal=="string")?_4.decimal:".",_8=dojox.validate._isInRangeCache,_9=_3+"max"+_5+"min"+_6+"dec"+_7;
if(typeof _8[_9]!="undefined"){
return _8[_9];
}
_8[_9]=!(_3<_6||_3>_5);
return _8[_9];
};
dojox.validate.isNumberFormat=function(_a,_b){
var re=new RegExp("^"+dojox.validate.regexp.numberFormat(_b)+"$","i");
return re.test(_a);
};
dojox.validate.isValidLuhn=function(_c){
var _d=0,_e,_f;
if(!dojo.isString(_c)){
_c=String(_c);
}
_c=_c.replace(/[- ]/g,"");
_e=_c.length%2;
for(var i=0;i<_c.length;i++){
_f=parseInt(_c.charAt(i));
if(i%2==_e){
_f*=2;
}
if(_f>9){
_f-=9;
}
_d+=_f;
}
return !(_d%10);
};
}
