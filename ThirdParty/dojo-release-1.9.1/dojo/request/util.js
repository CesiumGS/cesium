/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/util",["exports","../errors/RequestError","../errors/CancelError","../Deferred","../io-query","../_base/array","../_base/lang","../promise/Promise"],function(_1,_2,_3,_4,_5,_6,_7,_8){
_1.deepCopy=function deepCopy(_9,_a){
for(var _b in _a){
var _c=_9[_b],_d=_a[_b];
if(_c!==_d){
if(_c&&typeof _c==="object"&&_d&&typeof _d==="object"){
_1.deepCopy(_c,_d);
}else{
_9[_b]=_d;
}
}
}
return _9;
};
_1.deepCreate=function deepCreate(_e,_f){
_f=_f||{};
var _10=_7.delegate(_e),_11,_12;
for(_11 in _e){
_12=_e[_11];
if(_12&&typeof _12==="object"){
_10[_11]=_1.deepCreate(_12,_f[_11]);
}
}
return _1.deepCopy(_10,_f);
};
var _13=Object.freeze||function(obj){
return obj;
};
function _14(_15){
return _13(_15);
};
function _16(_17){
return _17.data||_17.text;
};
_1.deferred=function deferred(_18,_19,_1a,_1b,_1c,_1d){
var def=new _4(function(_1e){
_19&&_19(def,_18);
if(!_1e||!(_1e instanceof _2)&&!(_1e instanceof _3)){
return new _3("Request canceled",_18);
}
return _1e;
});
def.response=_18;
def.isValid=_1a;
def.isReady=_1b;
def.handleResponse=_1c;
function _1f(_20){
_20.response=_18;
throw _20;
};
var _21=def.then(_14).otherwise(_1f);
if(_1.notify){
_21.then(_7.hitch(_1.notify,"emit","load"),_7.hitch(_1.notify,"emit","error"));
}
var _22=_21.then(_16);
var _23=new _8();
for(var _24 in _22){
if(_22.hasOwnProperty(_24)){
_23[_24]=_22[_24];
}
}
_23.response=_21;
_13(_23);
if(_1d){
def.then(function(_25){
_1d.call(def,_25);
},function(_26){
_1d.call(def,_18,_26);
});
}
def.promise=_23;
def.then=_23.then;
return def;
};
_1.addCommonMethods=function addCommonMethods(_27,_28){
_6.forEach(_28||["GET","POST","PUT","DELETE"],function(_29){
_27[(_29==="DELETE"?"DEL":_29).toLowerCase()]=function(url,_2a){
_2a=_7.delegate(_2a||{});
_2a.method=_29;
return _27(url,_2a);
};
});
};
_1.parseArgs=function parseArgs(url,_2b,_2c){
var _2d=_2b.data,_2e=_2b.query;
if(_2d&&!_2c){
if(typeof _2d==="object"){
_2b.data=_5.objectToQuery(_2d);
}
}
if(_2e){
if(typeof _2e==="object"){
_2e=_5.objectToQuery(_2e);
}
if(_2b.preventCache){
_2e+=(_2e?"&":"")+"request.preventCache="+(+(new Date));
}
}else{
if(_2b.preventCache){
_2e="request.preventCache="+(+(new Date));
}
}
if(url&&_2e){
url+=(~url.indexOf("?")?"&":"?")+_2e;
}
return {url:url,options:_2b,getHeader:function(_2f){
return null;
}};
};
_1.checkStatus=function(_30){
_30=_30||0;
return (_30>=200&&_30<300)||_30===304||_30===1223||!_30;
};
});
