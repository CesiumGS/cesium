/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/Stateful",["./_base/declare","./_base/lang","./_base/array","./when"],function(_1,_2,_3,_4){
return _1("dojo.Stateful",null,{_attrPairNames:{},_getAttrNames:function(_5){
var _6=this._attrPairNames;
if(_6[_5]){
return _6[_5];
}
return (_6[_5]={s:"_"+_5+"Setter",g:"_"+_5+"Getter"});
},postscript:function(_7){
if(_7){
this.set(_7);
}
},_get:function(_8,_9){
return typeof this[_9.g]==="function"?this[_9.g]():this[_8];
},get:function(_a){
return this._get(_a,this._getAttrNames(_a));
},set:function(_b,_c){
if(typeof _b==="object"){
for(var x in _b){
if(_b.hasOwnProperty(x)&&x!="_watchCallbacks"){
this.set(x,_b[x]);
}
}
return this;
}
var _d=this._getAttrNames(_b),_e=this._get(_b,_d),_f=this[_d.s],_10;
if(typeof _f==="function"){
_10=_f.apply(this,Array.prototype.slice.call(arguments,1));
}else{
this[_b]=_c;
}
if(this._watchCallbacks){
var _11=this;
_4(_10,function(){
_11._watchCallbacks(_b,_e,_c);
});
}
return this;
},_changeAttrValue:function(_12,_13){
var _14=this.get(_12);
this[_12]=_13;
if(this._watchCallbacks){
this._watchCallbacks(_12,_14,_13);
}
return this;
},watch:function(_15,_16){
var _17=this._watchCallbacks;
if(!_17){
var _18=this;
_17=this._watchCallbacks=function(_19,_1a,_1b,_1c){
var _1d=function(_1e){
if(_1e){
_1e=_1e.slice();
for(var i=0,l=_1e.length;i<l;i++){
_1e[i].call(_18,_19,_1a,_1b);
}
}
};
_1d(_17["_"+_19]);
if(!_1c){
_1d(_17["*"]);
}
};
}
if(!_16&&typeof _15==="function"){
_16=_15;
_15="*";
}else{
_15="_"+_15;
}
var _1f=_17[_15];
if(typeof _1f!=="object"){
_1f=_17[_15]=[];
}
_1f.push(_16);
var _20={};
_20.unwatch=_20.remove=function(){
var _21=_3.indexOf(_1f,_16);
if(_21>-1){
_1f.splice(_21,1);
}
};
return _20;
}});
});
