/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.TextColor"]){
dojo._hasResource["dijit._editor.plugins.TextColor"]=true;
dojo.provide("dijit._editor.plugins.TextColor");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.ColorPalette");
dojo.declare("dijit._editor.plugins.TextColor",dijit._editor._Plugin,{buttonClass:dijit.form.DropDownButton,useDefaultCommand:false,constructor:function(){
this.dropDown=new dijit.ColorPalette();
this.connect(this.dropDown,"onChange",function(_1){
this.editor.execCommand(this.command,_1);
});
},updateState:function(){
var _2=this.editor;
var _3=this.command;
if(!_2||!_2.isLoaded||!_3.length){
return;
}
if(this.button){
var _4=this.get("disabled");
this.button.set("disabled",_4);
if(_4){
return;
}
var _5;
try{
_5=_2.queryCommandValue(_3)||"";
}
catch(e){
_5="";
}
}
if(_5==""){
_5="#000000";
}
if(_5=="transparent"){
_5="#ffffff";
}
if(typeof _5=="string"){
if(_5.indexOf("rgb")>-1){
_5=dojo.colorFromRgb(_5).toHex();
}
}else{
_5=((_5&255)<<16)|(_5&65280)|((_5&16711680)>>>16);
_5=_5.toString(16);
_5="#000000".slice(0,7-_5.length)+_5;
}
if(_5!==this.dropDown.get("value")){
this.dropDown.set("value",_5,false);
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
switch(o.args.name){
case "foreColor":
case "hiliteColor":
o.plugin=new dijit._editor.plugins.TextColor({command:o.args.name});
}
});
}
