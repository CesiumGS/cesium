/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._Widget"]){
dojo._hasResource["dijit._Widget"]=true;
dojo.provide("dijit._Widget");
dojo.require("dijit._WidgetBase");
dojo.require("dijit._base");
dojo.connect(dojo,"_connect",function(_1,_2){
if(_1&&dojo.isFunction(_1._onConnect)){
_1._onConnect(_2);
}
});
dijit._connectOnUseEventHandler=function(_3){
};
dijit._lastKeyDownNode=null;
if(dojo.isIE){
(function(){
var _4=function(_5){
dijit._lastKeyDownNode=_5.srcElement;
};
dojo.doc.attachEvent("onkeydown",_4);
dojo.addOnWindowUnload(function(){
dojo.doc.detachEvent("onkeydown",_4);
});
})();
}else{
dojo.doc.addEventListener("keydown",function(_6){
dijit._lastKeyDownNode=_6.target;
},true);
}
(function(){
dojo.declare("dijit._Widget",dijit._WidgetBase,{_deferredConnects:{onClick:"",onDblClick:"",onKeyDown:"",onKeyPress:"",onKeyUp:"",onMouseMove:"",onMouseDown:"",onMouseOut:"",onMouseOver:"",onMouseLeave:"",onMouseEnter:"",onMouseUp:""},onClick:dijit._connectOnUseEventHandler,onDblClick:dijit._connectOnUseEventHandler,onKeyDown:dijit._connectOnUseEventHandler,onKeyPress:dijit._connectOnUseEventHandler,onKeyUp:dijit._connectOnUseEventHandler,onMouseDown:dijit._connectOnUseEventHandler,onMouseMove:dijit._connectOnUseEventHandler,onMouseOut:dijit._connectOnUseEventHandler,onMouseOver:dijit._connectOnUseEventHandler,onMouseLeave:dijit._connectOnUseEventHandler,onMouseEnter:dijit._connectOnUseEventHandler,onMouseUp:dijit._connectOnUseEventHandler,create:function(_7,_8){
this._deferredConnects=dojo.clone(this._deferredConnects);
for(var _9 in this.attributeMap){
delete this._deferredConnects[_9];
}
for(_9 in this._deferredConnects){
if(this[_9]!==dijit._connectOnUseEventHandler){
delete this._deferredConnects[_9];
}
}
this.inherited(arguments);
if(this.domNode){
for(_9 in this.params){
this._onConnect(_9);
}
}
},_onConnect:function(_a){
if(_a in this._deferredConnects){
var _b=this[this._deferredConnects[_a]||"domNode"];
this.connect(_b,_a.toLowerCase(),_a);
delete this._deferredConnects[_a];
}
},focused:false,isFocusable:function(){
return this.focus&&(dojo.style(this.domNode,"display")!="none");
},onFocus:function(){
},onBlur:function(){
},_onFocus:function(e){
this.onFocus();
},_onBlur:function(){
this.onBlur();
},setAttribute:function(_c,_d){
dojo.deprecated(this.declaredClass+"::setAttribute(attr, value) is deprecated. Use set() instead.","","2.0");
this.set(_c,_d);
},attr:function(_e,_f){
if(dojo.config.isDebug){
var _10=arguments.callee._ach||(arguments.callee._ach={}),_11=(arguments.callee.caller||"unknown caller").toString();
if(!_10[_11]){
dojo.deprecated(this.declaredClass+"::attr() is deprecated. Use get() or set() instead, called from "+_11,"","2.0");
_10[_11]=true;
}
}
var _12=arguments.length;
if(_12>=2||typeof _e==="object"){
return this.set.apply(this,arguments);
}else{
return this.get(_e);
}
},nodesWithKeyClick:["input","button"],connect:function(obj,_13,_14){
var d=dojo,dc=d._connect,_15=this.inherited(arguments,[obj,_13=="ondijitclick"?"onclick":_13,_14]);
if(_13=="ondijitclick"){
if(d.indexOf(this.nodesWithKeyClick,obj.nodeName.toLowerCase())==-1){
var m=d.hitch(this,_14);
_15.push(dc(obj,"onkeydown",this,function(e){
if((e.keyCode==d.keys.ENTER||e.keyCode==d.keys.SPACE)&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&!e.metaKey){
dijit._lastKeyDownNode=e.target;
if(!("openDropDown" in this&&obj==this._buttonNode)){
e.preventDefault();
}
}
}),dc(obj,"onkeyup",this,function(e){
if((e.keyCode==d.keys.ENTER||e.keyCode==d.keys.SPACE)&&e.target==dijit._lastKeyDownNode&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&!e.metaKey){
dijit._lastKeyDownNode=null;
return m(e);
}
}));
}
}
return _15;
},_onShow:function(){
this.onShow();
},onShow:function(){
},onHide:function(){
},onClose:function(){
return true;
}});
})();
}
