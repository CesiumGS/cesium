/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._KeyNavContainer"]){
dojo._hasResource["dijit._KeyNavContainer"]=true;
dojo.provide("dijit._KeyNavContainer");
dojo.require("dijit._Container");
dojo.declare("dijit._KeyNavContainer",dijit._Container,{tabIndex:"0",_keyNavCodes:{},connectKeyNavHandlers:function(_1,_2){
var _3=(this._keyNavCodes={});
var _4=dojo.hitch(this,this.focusPrev);
var _5=dojo.hitch(this,this.focusNext);
dojo.forEach(_1,function(_6){
_3[_6]=_4;
});
dojo.forEach(_2,function(_7){
_3[_7]=_5;
});
_3[dojo.keys.HOME]=dojo.hitch(this,"focusFirstChild");
_3[dojo.keys.END]=dojo.hitch(this,"focusLastChild");
this.connect(this.domNode,"onkeypress","_onContainerKeypress");
this.connect(this.domNode,"onfocus","_onContainerFocus");
},startupKeyNavChildren:function(){
dojo.forEach(this.getChildren(),dojo.hitch(this,"_startupChild"));
},addChild:function(_8,_9){
dijit._KeyNavContainer.superclass.addChild.apply(this,arguments);
this._startupChild(_8);
},focus:function(){
this.focusFirstChild();
},focusFirstChild:function(){
var _a=this._getFirstFocusableChild();
if(_a){
this.focusChild(_a);
}
},focusLastChild:function(){
var _b=this._getLastFocusableChild();
if(_b){
this.focusChild(_b);
}
},focusNext:function(){
var _c=this._getNextFocusableChild(this.focusedChild,1);
this.focusChild(_c);
},focusPrev:function(){
var _d=this._getNextFocusableChild(this.focusedChild,-1);
this.focusChild(_d,true);
},focusChild:function(_e,_f){
if(this.focusedChild&&_e!==this.focusedChild){
this._onChildBlur(this.focusedChild);
}
_e.set("tabIndex",this.tabIndex);
_e.focus(_f?"end":"start");
this._set("focusedChild",_e);
},_startupChild:function(_10){
_10.set("tabIndex","-1");
this.connect(_10,"_onFocus",function(){
_10.set("tabIndex",this.tabIndex);
});
this.connect(_10,"_onBlur",function(){
_10.set("tabIndex","-1");
});
},_onContainerFocus:function(evt){
if(evt.target!==this.domNode){
return;
}
this.focusFirstChild();
dojo.attr(this.domNode,"tabIndex","-1");
},_onBlur:function(evt){
if(this.tabIndex){
dojo.attr(this.domNode,"tabIndex",this.tabIndex);
}
this.inherited(arguments);
},_onContainerKeypress:function(evt){
if(evt.ctrlKey||evt.altKey){
return;
}
var _11=this._keyNavCodes[evt.charOrCode];
if(_11){
_11();
dojo.stopEvent(evt);
}
},_onChildBlur:function(_12){
},_getFirstFocusableChild:function(){
return this._getNextFocusableChild(null,1);
},_getLastFocusableChild:function(){
return this._getNextFocusableChild(null,-1);
},_getNextFocusableChild:function(_13,dir){
if(_13){
_13=this._getSiblingOfChild(_13,dir);
}
var _14=this.getChildren();
for(var i=0;i<_14.length;i++){
if(!_13){
_13=_14[(dir>0)?0:(_14.length-1)];
}
if(_13.isFocusable()){
return _13;
}
_13=this._getSiblingOfChild(_13,dir);
}
return null;
}});
}
