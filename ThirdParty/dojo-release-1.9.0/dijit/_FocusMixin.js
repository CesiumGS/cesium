//>>built
define("dijit/_FocusMixin",["./focus","./_WidgetBase","dojo/_base/declare","dojo/_base/lang"],function(_1,_2,_3,_4){
_4.extend(_2,{focused:false,onFocus:function(){
},onBlur:function(){
},_onFocus:function(){
this.onFocus();
},_onBlur:function(){
this.onBlur();
}});
return _3("dijit._FocusMixin",null,{_focusManager:_1});
});
