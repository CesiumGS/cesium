//>>built
define("dijit/_editor/plugins/TabIndent",["dojo/_base/declare","dojo/_base/kernel","../_Plugin","../../form/ToggleButton"],function(_1,_2,_3,_4){
_2.experimental("dijit._editor.plugins.TabIndent");
var _5=_1("dijit._editor.plugins.TabIndent",_3,{useDefaultCommand:false,buttonClass:_4,command:"tabIndent",_initButton:function(){
this.inherited(arguments);
var e=this.editor;
this.own(this.button.on("change",function(_6){
e.set("isTabIndent",_6);
}));
this.updateState();
},updateState:function(){
var _7=this.get("disabled");
this.button.set("disabled",_7);
if(_7){
return;
}
this.button.set("checked",this.editor.isTabIndent,false);
}});
_3.registry["tabIndent"]=function(){
return new _5({command:"tabIndent"});
};
return _5;
});
