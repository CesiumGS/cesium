/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/router/RouterBase",["dojo/_base/declare","dojo/hash","dojo/topic"],function(_1,_2,_3){
var _4;
if(String.prototype.trim){
_4=function(_5){
return _5.trim();
};
}else{
_4=function(_6){
return _6.replace(/^\s\s*/,"").replace(/\s\s*$/,"");
};
}
function _7(_8,_9,_a){
var _b,_c,_d,_e,_f,i,l;
_b=this.callbackQueue;
_c=false;
_d=false;
_e={stopImmediatePropagation:function(){
_c=true;
},preventDefault:function(){
_d=true;
},oldPath:_9,newPath:_a,params:_8};
_f=[_e];
if(_8 instanceof Array){
_f=_f.concat(_8);
}else{
for(var key in _8){
_f.push(_8[key]);
}
}
for(i=0,l=_b.length;i<l;++i){
if(!_c){
_b[i].apply(null,_f);
}
}
return !_d;
};
var _10=_1(null,{_routes:null,_routeIndex:null,_started:false,_currentPath:"",idMatch:/:(\w[\w\d]*)/g,idReplacement:"([^\\/]+)",globMatch:/\*(\w[\w\d]*)/,globReplacement:"(.+)",constructor:function(_11){
this._routes=[];
this._routeIndex={};
for(var i in _11){
if(_11.hasOwnProperty(i)){
this[i]=_11[i];
}
}
},register:function(_12,_13){
return this._registerRoute(_12,_13);
},registerBefore:function(_14,_15){
return this._registerRoute(_14,_15,true);
},go:function(_16,_17){
var _18;
if(typeof _16!=="string"){
return false;
}
_16=_4(_16);
_18=this._handlePathChange(_16);
if(_18){
_2(_16,_17);
}
return _18;
},startup:function(_19){
if(this._started){
return;
}
var _1a=this,_1b=_2();
this._started=true;
this._hashchangeHandle=_3.subscribe("/dojo/hashchange",function(){
_1a._handlePathChange.apply(_1a,arguments);
});
if(!_1b){
this.go(_19,true);
}else{
this._handlePathChange(_1b);
}
},destroy:function(){
this._hashchangeHandle.remove();
this._routes=null;
this._routeIndex=null;
},_handlePathChange:function(_1c){
var i,j,li,lj,_1d,_1e,_1f,_20,_21,_22=this._routes,_23=this._currentPath;
if(!this._started||_1c===_23){
return _1f;
}
_1f=true;
for(i=0,li=_22.length;i<li;++i){
_1d=_22[i];
_1e=_1d.route.exec(_1c);
if(_1e){
if(_1d.parameterNames){
_20=_1d.parameterNames;
_21={};
for(j=0,lj=_20.length;j<lj;++j){
_21[_20[j]]=_1e[j+1];
}
}else{
_21=_1e.slice(1);
}
_1f=_1d.fire(_21,_23,_1c);
}
}
if(_1f){
this._currentPath=_1c;
}
return _1f;
},_convertRouteToRegExp:function(_24){
_24=_24.replace(this.idMatch,this.idReplacement);
_24=_24.replace(this.globMatch,this.globReplacement);
_24="^"+_24+"$";
return new RegExp(_24);
},_getParameterNames:function(_25){
var _26=this.idMatch,_27=this.globMatch,_28=[],_29;
_26.lastIndex=0;
while((_29=_26.exec(_25))!==null){
_28.push(_29[1]);
}
if((_29=_27.exec(_25))!==null){
_28.push(_29[1]);
}
return _28.length>0?_28:null;
},_indexRoutes:function(){
var i,l,_2a,_2b,_2c=this._routes;
_2b=this._routeIndex={};
for(i=0,l=_2c.length;i<l;++i){
_2a=_2c[i];
_2b[_2a.route]=i;
}
},_registerRoute:function(_2d,_2e,_2f){
var _30,_31,_32,_33,_34,_35=this,_36=this._routes,_37=this._routeIndex;
_30=this._routeIndex[_2d];
_31=typeof _30!=="undefined";
if(_31){
_32=_36[_30];
}
if(!_32){
_32={route:_2d,callbackQueue:[],fire:_7};
}
_33=_32.callbackQueue;
if(typeof _2d=="string"){
_32.parameterNames=this._getParameterNames(_2d);
_32.route=this._convertRouteToRegExp(_2d);
}
if(_2f){
_33.unshift(_2e);
}else{
_33.push(_2e);
}
if(!_31){
_30=_36.length;
_37[_2d]=_30;
_36.push(_32);
}
_34=false;
return {remove:function(){
var i,l;
if(_34){
return;
}
for(i=0,l=_33.length;i<l;++i){
if(_33[i]===_2e){
_33.splice(i,1);
}
}
if(_33.length===0){
_36.splice(_30,1);
_35._indexRoutes();
}
_34=true;
},register:function(_38,_39){
return _35.register(_2d,_38,_39);
}};
}});
return _10;
});
