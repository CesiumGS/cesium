/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor._Plugin"]){
dojo._hasResource["dijit._editor._Plugin"]=true;
dojo.provide("dijit._editor._Plugin");
dojo.require("dijit._Widget");
dojo.require("dijit.form.Button");
dojo.declare("dijit._editor._Plugin",null,{constructor:function(_1,_2){
this.params=_1||{};
dojo.mixin(this,this.params);
this._connects=[];
this._attrPairNames={};
},editor:null,iconClassPrefix:"dijitEditorIcon",button:null,command:"",useDefaultCommand:true,buttonClass:dijit.form.Button,disabled:false,getLabel:function(_3){
return this.editor.commands[_3];
},_initButton:function(){
if(this.command.length){
var _4=this.getLabel(this.command),_5=this.editor,_6=this.iconClassPrefix+" "+this.iconClassPrefix+this.command.charAt(0).toUpperCase()+this.command.substr(1);
if(!this.button){
var _7=dojo.mixin({label:_4,dir:_5.dir,lang:_5.lang,showLabel:false,iconClass:_6,dropDown:this.dropDown,tabIndex:"-1"},this.params||{});
this.button=new this.buttonClass(_7);
}
}
if(this.get("disabled")&&this.button){
this.button.set("disabled",this.get("disabled"));
}
},destroy:function(){
dojo.forEach(this._connects,dojo.disconnect);
if(this.dropDown){
this.dropDown.destroyRecursive();
}
},connect:function(o,f,tf){
this._connects.push(dojo.connect(o,f,this,tf));
},updateState:function(){
var e=this.editor,c=this.command,_8,_9;
if(!e||!e.isLoaded||!c.length){
return;
}
var _a=this.get("disabled");
if(this.button){
try{
_9=!_a&&e.queryCommandEnabled(c);
if(this.enabled!==_9){
this.enabled=_9;
this.button.set("disabled",!_9);
}
if(typeof this.button.checked=="boolean"){
_8=e.queryCommandState(c);
if(this.checked!==_8){
this.checked=_8;
this.button.set("checked",e.queryCommandState(c));
}
}
}
catch(e){
}
}
},setEditor:function(_b){
this.editor=_b;
this._initButton();
if(this.button&&this.useDefaultCommand){
if(this.editor.queryCommandAvailable(this.command)){
this.connect(this.button,"onClick",dojo.hitch(this.editor,"execCommand",this.command,this.commandArg));
}else{
this.button.domNode.style.display="none";
}
}
this.connect(this.editor,"onNormalizedDisplayChanged","updateState");
},setToolbar:function(_c){
if(this.button){
_c.addChild(this.button);
}
},set:function(_d,_e){
if(typeof _d==="object"){
for(var x in _d){
this.set(x,_d[x]);
}
return this;
}
var _f=this._getAttrNames(_d);
if(this[_f.s]){
var _10=this[_f.s].apply(this,Array.prototype.slice.call(arguments,1));
}else{
this._set(_d,_e);
}
return _10||this;
},get:function(_11){
var _12=this._getAttrNames(_11);
return this[_12.g]?this[_12.g]():this[_11];
},_setDisabledAttr:function(_13){
this.disabled=_13;
this.updateState();
},_getAttrNames:function(_14){
var apn=this._attrPairNames;
if(apn[_14]){
return apn[_14];
}
var uc=_14.charAt(0).toUpperCase()+_14.substr(1);
return (apn[_14]={s:"_set"+uc+"Attr",g:"_get"+uc+"Attr"});
},_set:function(_15,_16){
var _17=this[_15];
this[_15]=_16;
}});
}
