//>>built
define("dijit/_Widget",["dojo/aspect","dojo/_base/config","dojo/_base/connect","dojo/_base/declare","dojo/has","dojo/_base/kernel","dojo/_base/lang","dojo/query","dojo/ready","./registry","./_WidgetBase","./_OnDijitClickMixin","./_FocusMixin","dojo/uacss","./hccss"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d){
function _e(){
};
function _f(_10){
return function(obj,_11,_12,_13){
if(obj&&typeof _11=="string"&&obj[_11]==_e){
return obj.on(_11.substring(2).toLowerCase(),_7.hitch(_12,_13));
}
return _10.apply(_3,arguments);
};
};
_1.around(_3,"connect",_f);
if(_6.connect){
_1.around(_6,"connect",_f);
}
var _14=_4("dijit._Widget",[_b,_c,_d],{onClick:_e,onDblClick:_e,onKeyDown:_e,onKeyPress:_e,onKeyUp:_e,onMouseDown:_e,onMouseMove:_e,onMouseOut:_e,onMouseOver:_e,onMouseLeave:_e,onMouseEnter:_e,onMouseUp:_e,constructor:function(_15){
this._toConnect={};
for(var _16 in _15){
if(this[_16]===_e){
this._toConnect[_16.replace(/^on/,"").toLowerCase()]=_15[_16];
delete _15[_16];
}
}
},postCreate:function(){
this.inherited(arguments);
for(var _17 in this._toConnect){
this.on(_17,this._toConnect[_17]);
}
delete this._toConnect;
},on:function(_18,_19){
if(this[this._onMap(_18)]===_e){
return _3.connect(this.domNode,_18.toLowerCase(),this,_19);
}
return this.inherited(arguments);
},_setFocusedAttr:function(val){
this._focused=val;
this._set("focused",val);
},setAttribute:function(_1a,_1b){
_6.deprecated(this.declaredClass+"::setAttribute(attr, value) is deprecated. Use set() instead.","","2.0");
this.set(_1a,_1b);
},attr:function(_1c,_1d){
var _1e=arguments.length;
if(_1e>=2||typeof _1c==="object"){
return this.set.apply(this,arguments);
}else{
return this.get(_1c);
}
},getDescendants:function(){
_6.deprecated(this.declaredClass+"::getDescendants() is deprecated. Use getChildren() instead.","","2.0");
return this.containerNode?_8("[widgetId]",this.containerNode).map(_a.byNode):[];
},_onShow:function(){
this.onShow();
},onShow:function(){
},onHide:function(){
},onClose:function(){
return true;
}});
if(_5("dijit-legacy-requires")){
_9(0,function(){
var _1f=["dijit/_base"];
require(_1f);
});
}
return _14;
});
