//>>built
define("dijit/form/_ToggleButtonMixin",["dojo/_base/declare","dojo/dom-attr"],function(_1,_2){
return _1("dijit.form._ToggleButtonMixin",null,{checked:false,_aria_attr:"aria-pressed",_onClick:function(_3){
var _4=this.checked;
this._set("checked",!_4);
var _5=this.inherited(arguments);
this.set("checked",_5?this.checked:_4);
return _5;
},_setCheckedAttr:function(_6,_7){
this._set("checked",_6);
var _8=this.focusNode||this.domNode;
if(this._created){
if(_2.get(_8,"checked")!=!!_6){
_2.set(_8,"checked",!!_6);
}
}
_8.setAttribute(this._aria_attr,String(_6));
this._handleOnChange(_6,_7);
},postCreate:function(){
this.inherited(arguments);
var _9=this.focusNode||this.domNode;
if(this.checked){
_9.setAttribute("checked","checked");
}
},reset:function(){
this._hasBeenBlurred=false;
this.set("checked",this.params.checked||false);
}});
});
