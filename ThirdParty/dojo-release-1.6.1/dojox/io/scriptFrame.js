/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.scriptFrame"]){
dojo._hasResource["dojox.io.scriptFrame"]=true;
dojo.provide("dojox.io.scriptFrame");
dojo.require("dojo.io.script");
dojo.require("dojo.io.iframe");
(function(){
var _1=dojo.io.script;
dojox.io.scriptFrame={_waiters:{},_loadedIds:{},_getWaiters:function(_2){
return this._waiters[_2]||(this._waiters[_2]=[]);
},_fixAttachUrl:function(_3){
},_loaded:function(_4){
var _5=this._getWaiters(_4);
this._loadedIds[_4]=true;
this._waiters[_4]=null;
for(var i=0;i<_5.length;i++){
var _6=_5[i];
_6.frameDoc=dojo.io.iframe.doc(dojo.byId(_4));
_1.attach(_6.id,_6.url,_6.frameDoc);
}
}};
var _7=_1._canAttach;
var _8=dojox.io.scriptFrame;
_1._canAttach=function(_9){
var _a=_9.args.frameDoc;
if(_a&&dojo.isString(_a)){
var _b=dojo.byId(_a);
var _c=_8._getWaiters(_a);
if(!_b){
_c.push(_9);
dojo.io.iframe.create(_a,dojox._scopeName+".io.scriptFrame._loaded('"+_a+"');");
}else{
if(_8._loadedIds[_a]){
_9.frameDoc=dojo.io.iframe.doc(_b);
this.attach(_9.id,_9.url,_9.frameDoc);
}else{
_c.push(_9);
}
}
return false;
}else{
return _7.apply(this,arguments);
}
};
})();
}
