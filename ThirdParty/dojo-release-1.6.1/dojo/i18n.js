/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.i18n"]){
dojo._hasResource["dojo.i18n"]=true;
dojo.provide("dojo.i18n");
dojo.getObject("i18n",true,dojo);
dojo.i18n.getLocalization=dojo.i18n.getLocalization||function(_1,_2,_3){
_3=dojo.i18n.normalizeLocale(_3);
var _4=_3.split("-");
var _5=[_1,"nls",_2].join(".");
var _6=dojo._loadedModules[_5];
if(_6){
var _7;
for(var i=_4.length;i>0;i--){
var _8=_4.slice(0,i).join("_");
if(_6[_8]){
_7=_6[_8];
break;
}
}
if(!_7){
_7=_6.ROOT;
}
if(_7){
var _9=function(){
};
_9.prototype=_7;
return new _9();
}
}
throw new Error("Bundle not found: "+_2+" in "+_1+" , locale="+_3);
};
dojo.i18n.normalizeLocale=function(_a){
var _b=_a?_a.toLowerCase():dojo.locale;
if(_b=="root"){
_b="ROOT";
}
return _b;
};
dojo.i18n._requireLocalization=function(_c,_d,_e,_f){
var _10=dojo.i18n.normalizeLocale(_e);
var _11=[_c,"nls",_d].join(".");
var _12="";
if(_f){
var _13=_f.split(",");
for(var i=0;i<_13.length;i++){
if(_10["indexOf"](_13[i])==0){
if(_13[i].length>_12.length){
_12=_13[i];
}
}
}
if(!_12){
_12="ROOT";
}
}
var _14=_f?_12:_10;
var _15=dojo._loadedModules[_11];
var _16=null;
if(_15){
if(dojo.config.localizationComplete&&_15._built){
return;
}
var _17=_14.replace(/-/g,"_");
var _18=_11+"."+_17;
_16=dojo._loadedModules[_18];
}
if(!_16){
_15=dojo["provide"](_11);
var _19=dojo._getModuleSymbols(_c);
var _1a=_19.concat("nls").join("/");
var _1b;
dojo.i18n._searchLocalePath(_14,_f,function(loc){
var _1c=loc.replace(/-/g,"_");
var _1d=_11+"."+_1c;
var _1e=false;
if(!dojo._loadedModules[_1d]){
dojo["provide"](_1d);
var _1f=[_1a];
if(loc!="ROOT"){
_1f.push(loc);
}
_1f.push(_d);
var _20=_1f.join("/")+".js";
_1e=dojo._loadPath(_20,null,function(_21){
_21=_21.root||_21;
var _22=function(){
};
_22.prototype=_1b;
_15[_1c]=new _22();
for(var j in _21){
_15[_1c][j]=_21[j];
}
});
}else{
_1e=true;
}
if(_1e&&_15[_1c]){
_1b=_15[_1c];
}else{
_15[_1c]=_1b;
}
if(_f){
return true;
}
});
}
if(_f&&_10!=_12){
_15[_10.replace(/-/g,"_")]=_15[_12.replace(/-/g,"_")];
}
};
(function(){
var _23=dojo.config.extraLocale;
if(_23){
if(!_23 instanceof Array){
_23=[_23];
}
var req=dojo.i18n._requireLocalization;
dojo.i18n._requireLocalization=function(m,b,_24,_25){
req(m,b,_24,_25);
if(_24){
return;
}
for(var i=0;i<_23.length;i++){
req(m,b,_23[i],_25);
}
};
}
})();
dojo.i18n._searchLocalePath=function(_26,_27,_28){
_26=dojo.i18n.normalizeLocale(_26);
var _29=_26.split("-");
var _2a=[];
for(var i=_29.length;i>0;i--){
_2a.push(_29.slice(0,i).join("-"));
}
_2a.push(false);
if(_27){
_2a.reverse();
}
for(var j=_2a.length-1;j>=0;j--){
var loc=_2a[j]||"ROOT";
var _2b=_28(loc);
if(_2b){
break;
}
}
};
dojo.i18n._preloadLocalizations=function(_2c,_2d){
function _2e(_2f){
_2f=dojo.i18n.normalizeLocale(_2f);
dojo.i18n._searchLocalePath(_2f,true,function(loc){
for(var i=0;i<_2d.length;i++){
if(_2d[i]==loc){
dojo["require"](_2c+"_"+loc);
return true;
}
}
return false;
});
};
_2e();
var _30=dojo.config.extraLocale||[];
for(var i=0;i<_30.length;i++){
_2e(_30[i]);
}
};
}
