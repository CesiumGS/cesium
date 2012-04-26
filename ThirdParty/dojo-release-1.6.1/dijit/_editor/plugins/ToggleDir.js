/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.ToggleDir"]){
dojo._hasResource["dijit._editor.plugins.ToggleDir"]=true;
dojo.provide("dijit._editor.plugins.ToggleDir");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.ToggleButton");
dojo.experimental("dijit._editor.plugins.ToggleDir");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.ToggleButton");
dojo.declare("dijit._editor.plugins.ToggleDir",dijit._editor._Plugin,{useDefaultCommand:false,command:"toggleDir",buttonClass:dijit.form.ToggleButton,_initButton:function(){
this.inherited(arguments);
this.editor.onLoadDeferred.addCallback(dojo.hitch(this,function(){
var _1=this.editor.editorObject.contentWindow.document.documentElement;
_1=_1.getElementsByTagName("body")[0];
var _2=dojo.getComputedStyle(_1).direction=="ltr";
this.button.set("checked",!_2);
this.connect(this.button,"onChange","_setRtl");
}));
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},_setRtl:function(_3){
var _4="ltr";
if(_3){
_4="rtl";
}
var _5=this.editor.editorObject.contentWindow.document.documentElement;
_5=_5.getElementsByTagName("body")[0];
_5.dir=_4;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
switch(o.args.name){
case "toggleDir":
o.plugin=new dijit._editor.plugins.ToggleDir({command:o.args.name});
}
});
}
