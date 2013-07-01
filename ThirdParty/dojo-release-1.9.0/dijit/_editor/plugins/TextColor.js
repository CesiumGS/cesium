//>>built
define("dijit/_editor/plugins/TextColor",["require","dojo/colors","dojo/_base/declare","dojo/_base/lang","../_Plugin","../../form/DropDownButton"],function(_1,_2,_3,_4,_5,_6){
var _7=_3("dijit._editor.plugins.TextColor",_5,{buttonClass:_6,useDefaultCommand:false,_initButton:function(){
this.inherited(arguments);
var _8=this;
this.button.loadDropDown=function(_9){
_1(["../../ColorPalette"],_4.hitch(this,function(_a){
this.dropDown=new _a({dir:_8.editor.dir,ownerDocument:_8.editor.ownerDocument,value:_8.value,onChange:function(_b){
_8.editor.execCommand(_8.command,_b);
}});
_9();
}));
};
},updateState:function(){
var _c=this.editor;
var _d=this.command;
if(!_c||!_c.isLoaded||!_d.length){
return;
}
if(this.button){
var _e=this.get("disabled");
this.button.set("disabled",_e);
if(_e){
return;
}
var _f;
try{
_f=_c.queryCommandValue(_d)||"";
}
catch(e){
_f="";
}
}
if(_f==""){
_f="#000000";
}
if(_f=="transparent"){
_f="#ffffff";
}
if(typeof _f=="string"){
if(_f.indexOf("rgb")>-1){
_f=_2.fromRgb(_f).toHex();
}
}else{
_f=((_f&255)<<16)|(_f&65280)|((_f&16711680)>>>16);
_f=_f.toString(16);
_f="#000000".slice(0,7-_f.length)+_f;
}
this.value=_f;
var _10=this.button.dropDown;
if(_10&&_f!==_10.get("value")){
_10.set("value",_f,false);
}
}});
_5.registry["foreColor"]=function(){
return new _7({command:"foreColor"});
};
_5.registry["hiliteColor"]=function(){
return new _7({command:"hiliteColor"});
};
return _7;
});
