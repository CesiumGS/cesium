//>>built
define("dijit/_editor/plugins/ToggleDir",["dojo/_base/declare","dojo/dom-style","dojo/_base/kernel","dojo/_base/lang","dojo/on","../_Plugin","../../form/ToggleButton"],function(_1,_2,_3,_4,on,_5,_6){
_3.experimental("dijit._editor.plugins.ToggleDir");
var _7=_1("dijit._editor.plugins.ToggleDir",_5,{useDefaultCommand:false,command:"toggleDir",buttonClass:_6,_initButton:function(){
this.inherited(arguments);
this.editor.onLoadDeferred.then(_4.hitch(this,function(){
var _8=this.editor.editorObject.contentWindow.document.documentElement;
_8=_8.getElementsByTagName("body")[0];
var _9=_2.getComputedStyle(_8).direction=="ltr";
this.button.set("checked",!_9);
this.own(this.button.on("change",_4.hitch(this,"_setRtl")));
}));
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},_setRtl:function(_a){
var _b="ltr";
if(_a){
_b="rtl";
}
var _c=this.editor.editorObject.contentWindow.document.documentElement;
_c=_c.getElementsByTagName("body")[0];
_c.dir=_b;
}});
_5.registry["toggleDir"]=function(){
return new _7({command:"toggleDir"});
};
return _7;
});
