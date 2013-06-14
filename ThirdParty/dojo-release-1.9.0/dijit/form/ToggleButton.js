//>>built
define("dijit/form/ToggleButton",["dojo/_base/declare","dojo/_base/kernel","./Button","./_ToggleButtonMixin"],function(_1,_2,_3,_4){
return _1("dijit.form.ToggleButton",[_3,_4],{baseClass:"dijitToggleButton",setChecked:function(_5){
_2.deprecated("setChecked("+_5+") is deprecated. Use set('checked',"+_5+") instead.","","2.0");
this.set("checked",_5);
}});
});
