//>>built
define("dijit/form/CheckBox",["require","dojo/_base/declare","dojo/dom-attr","dojo/has","dojo/query","dojo/ready","./ToggleButton","./_CheckBoxMixin","dojo/text!./templates/CheckBox.html","dojo/NodeList-dom","../a11yclick"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
if(_4("dijit-legacy-requires")){
_6(0,function(){
var _a=["dijit/form/RadioButton"];
_1(_a);
});
}
return _2("dijit.form.CheckBox",[_7,_8],{templateString:_9,baseClass:"dijitCheckBox",_setValueAttr:function(_b,_c){
if(typeof _b=="string"){
this.inherited(arguments);
_b=true;
}
if(this._created){
this.set("checked",_b,_c);
}
},_getValueAttr:function(){
return this.checked&&this._get("value");
},_setIconClassAttr:null,_setNameAttr:"focusNode",postMixInProperties:function(){
this.inherited(arguments);
this.checkedAttrSetting="";
},_fillContent:function(){
},_onFocus:function(){
if(this.id){
_5("label[for='"+this.id+"']").addClass("dijitFocusedLabel");
}
this.inherited(arguments);
},_onBlur:function(){
if(this.id){
_5("label[for='"+this.id+"']").removeClass("dijitFocusedLabel");
}
this.inherited(arguments);
}});
});
require({cache:{"url:dijit/form/templates/CheckBox.html":"<div class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><input\n\t \t${!nameAttrSetting} type=\"${type}\" role=\"${type}\" aria-checked=\"false\" ${checkedAttrSetting}\n\t\tclass=\"dijitReset dijitCheckBoxInput\"\n\t\tdata-dojo-attach-point=\"focusNode\"\n\t \tdata-dojo-attach-event=\"ondijitclick:_onClick\"\n/></div>\n"}});
