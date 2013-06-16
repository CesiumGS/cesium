//>>built
define("dijit/_KeyNavContainer",["dojo/_base/array","dojo/_base/declare","dojo/dom-attr","dojo/_base/kernel","dojo/keys","dojo/_base/lang","./registry","./_Container","./_FocusMixin","./_KeyNavMixin"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a){
return _2("dijit._KeyNavContainer",[_9,_a,_8],{connectKeyNavHandlers:function(_b,_c){
var _d=(this._keyNavCodes={});
var _e=_6.hitch(this,"focusPrev");
var _f=_6.hitch(this,"focusNext");
_1.forEach(_b,function(_10){
_d[_10]=_e;
});
_1.forEach(_c,function(_11){
_d[_11]=_f;
});
_d[_5.HOME]=_6.hitch(this,"focusFirstChild");
_d[_5.END]=_6.hitch(this,"focusLastChild");
},startupKeyNavChildren:function(){
_4.deprecated("startupKeyNavChildren() call no longer needed","","2.0");
},startup:function(){
this.inherited(arguments);
_1.forEach(this.getChildren(),_6.hitch(this,"_startupChild"));
},addChild:function(_12,_13){
this.inherited(arguments);
this._startupChild(_12);
},_startupChild:function(_14){
_14.set("tabIndex","-1");
},_getFirst:function(){
var _15=this.getChildren();
return _15.length?_15[0]:null;
},_getLast:function(){
var _16=this.getChildren();
return _16.length?_16[_16.length-1]:null;
},focusNext:function(){
this.focusChild(this._getNextFocusableChild(this.focusedChild,1));
},focusPrev:function(){
this.focusChild(this._getNextFocusableChild(this.focusedChild,-1),true);
},childSelector:function(_17){
var _17=_7.byNode(_17);
return _17&&_17.getParent()==this;
}});
});
