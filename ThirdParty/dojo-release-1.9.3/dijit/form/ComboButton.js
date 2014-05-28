//>>built
require({cache:{"url:dijit/form/templates/ComboButton.html":"<table class=\"dijit dijitReset dijitInline dijitLeft\"\n\tcellspacing='0' cellpadding='0' role=\"presentation\"\n\t><tbody role=\"presentation\"><tr role=\"presentation\"\n\t\t><td class=\"dijitReset dijitStretch dijitButtonNode\" data-dojo-attach-point=\"buttonNode\" data-dojo-attach-event=\"ondijitclick:__onClick,onkeydown:_onButtonKeyDown\"\n\t\t><div id=\"${id}_button\" class=\"dijitReset dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><div class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitInline dijitButtonText\" id=\"${id}_label\" data-dojo-attach-point=\"containerNode\" role=\"presentation\"></div\n\t\t></div\n\t\t></td\n\t\t><td id=\"${id}_arrow\" class='dijitReset dijitRight dijitButtonNode dijitArrowButton'\n\t\t\tdata-dojo-attach-point=\"_popupStateNode,focusNode,_buttonNode\"\n\t\t\tdata-dojo-attach-event=\"onkeydown:_onArrowKeyDown\"\n\t\t\ttitle=\"${optionsTitle}\"\n\t\t\trole=\"button\" aria-haspopup=\"true\"\n\t\t\t><div class=\"dijitReset dijitArrowButtonInner\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitArrowButtonChar\" role=\"presentation\">&#9660;</div\n\t\t></td\n\t\t><td style=\"display:none !important;\"\n\t\t\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" data-dojo-attach-point=\"valueNode\"\n\t\t\t\trole=\"presentation\" aria-hidden=\"true\"\n\t\t\t\tdata-dojo-attach-event=\"onclick:_onClick\"\n\t\t/></td></tr></tbody\n></table>\n"}});
define("dijit/form/ComboButton",["dojo/_base/declare","dojo/keys","../focus","./DropDownButton","dojo/text!./templates/ComboButton.html"],function(_1,_2,_3,_4,_5){
return _1("dijit.form.ComboButton",_4,{templateString:_5,_setIdAttr:"",_setTabIndexAttr:["focusNode","titleNode"],_setTitleAttr:"titleNode",optionsTitle:"",baseClass:"dijitComboButton",cssStateNodes:{"buttonNode":"dijitButtonNode","titleNode":"dijitButtonContents","_popupStateNode":"dijitDownArrowButton"},_focusedNode:null,_onButtonKeyDown:function(_6){
if(_6.keyCode==_2[this.isLeftToRight()?"RIGHT_ARROW":"LEFT_ARROW"]){
_3.focus(this._popupStateNode);
_6.stopPropagation();
_6.preventDefault();
}
},_onArrowKeyDown:function(_7){
if(_7.keyCode==_2[this.isLeftToRight()?"LEFT_ARROW":"RIGHT_ARROW"]){
_3.focus(this.titleNode);
_7.stopPropagation();
_7.preventDefault();
}
},focus:function(_8){
if(!this.disabled){
_3.focus(_8=="start"?this.titleNode:this._popupStateNode);
}
}});
});
