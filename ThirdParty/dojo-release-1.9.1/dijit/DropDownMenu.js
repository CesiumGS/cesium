//>>built
require({cache:{"url:dijit/templates/Menu.html":"<table class=\"dijit dijitMenu dijitMenuPassive dijitReset dijitMenuTable\" role=\"menu\" tabIndex=\"${tabIndex}\"\n\t   cellspacing=\"0\">\n\t<tbody class=\"dijitReset\" data-dojo-attach-point=\"containerNode\"></tbody>\n</table>\n"}});
define("dijit/DropDownMenu",["dojo/_base/declare","dojo/keys","dojo/text!./templates/Menu.html","./_OnDijitClickMixin","./_MenuBase"],function(_1,_2,_3,_4,_5){
return _1("dijit.DropDownMenu",[_5,_4],{templateString:_3,baseClass:"dijitMenu",_onUpArrow:function(){
this.focusPrev();
},_onDownArrow:function(){
this.focusNext();
},_onRightArrow:function(_6){
this._moveToPopup(_6);
_6.stopPropagation();
_6.preventDefault();
},_onLeftArrow:function(){
if(this.parentMenu){
if(this.parentMenu._isMenuBar){
this.parentMenu.focusPrev();
}else{
this.onCancel(false);
}
}else{
evt.stopPropagation();
evt.preventDefault();
}
}});
});
