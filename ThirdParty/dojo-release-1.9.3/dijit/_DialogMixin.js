//>>built
define("dijit/_DialogMixin",["dojo/_base/declare","./a11y"],function(_1,_2){
return _1("dijit._DialogMixin",null,{execute:function(){
},onCancel:function(){
},onExecute:function(){
},_onSubmit:function(){
this.onExecute();
this.execute(this.get("value"));
},_getFocusItems:function(){
var _3=_2._getTabNavigable(this.containerNode);
this._firstFocusItem=_3.lowest||_3.first||this.closeButtonNode||this.domNode;
this._lastFocusItem=_3.last||_3.highest||this._firstFocusItem;
}});
});
