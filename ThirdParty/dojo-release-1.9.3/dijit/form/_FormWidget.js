//>>built
define("dijit/form/_FormWidget",["dojo/_base/declare","dojo/sniff","dojo/_base/kernel","dojo/ready","../_Widget","../_CssStateMixin","../_TemplatedMixin","./_FormWidgetMixin"],function(_1,_2,_3,_4,_5,_6,_7,_8){
if(_2("dijit-legacy-requires")){
_4(0,function(){
var _9=["dijit/form/_FormValueWidget"];
require(_9);
});
}
return _1("dijit.form._FormWidget",[_5,_7,_6,_8],{setDisabled:function(_a){
_3.deprecated("setDisabled("+_a+") is deprecated. Use set('disabled',"+_a+") instead.","","2.0");
this.set("disabled",_a);
},setValue:function(_b){
_3.deprecated("dijit.form._FormWidget:setValue("+_b+") is deprecated.  Use set('value',"+_b+") instead.","","2.0");
this.set("value",_b);
},getValue:function(){
_3.deprecated(this.declaredClass+"::getValue() is deprecated. Use get('value') instead.","","2.0");
return this.get("value");
},postMixInProperties:function(){
this.nameAttrSetting=(this.name&&!_2("msapp"))?("name=\""+this.name.replace(/"/g,"&quot;")+"\""):"";
this.inherited(arguments);
},_setTypeAttr:null});
});
