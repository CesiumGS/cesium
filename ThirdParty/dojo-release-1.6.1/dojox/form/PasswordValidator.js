/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.PasswordValidator"]){
dojo._hasResource["dojox.form.PasswordValidator"]=true;
dojo.provide("dojox.form.PasswordValidator");
dojo.require("dijit.form._FormWidget");
dojo.require("dijit.form.ValidationTextBox");
dojo.requireLocalization("dojox.form","PasswordValidator",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.form._ChildTextBox",dijit.form.ValidationTextBox,{containerWidget:null,type:"password",reset:function(){
dijit.form.ValidationTextBox.prototype._setValueAttr.call(this,"",true);
this._hasBeenBlurred=false;
},postCreate:function(){
this.inherited(arguments);
if(!this.name){
dojo.removeAttr(this.focusNode,"name");
}
this.connect(this.focusNode,"onkeypress","_onChildKeyPress");
},_onChildKeyPress:function(e){
if(e&&e.keyCode==dojo.keys.ENTER){
this._setBlurValue();
}
}});
dojo.declare("dojox.form._OldPWBox",dojox.form._ChildTextBox,{_isPWValid:false,_setValueAttr:function(_1,_2){
if(_1===""){
_1=dojox.form._OldPWBox.superclass.attr.call(this,"value");
}
if(_2!==null){
this._isPWValid=this.containerWidget.pwCheck(_1);
}
this.inherited(arguments);
this.containerWidget._childValueAttr(this.containerWidget._inputWidgets[1].get("value"));
},isValid:function(_3){
return this.inherited("isValid",arguments)&&this._isPWValid;
},_update:function(e){
if(this._hasBeenBlurred){
this.validate(true);
}
this._onMouse(e);
},_getValueAttr:function(){
if(this.containerWidget._started&&this.containerWidget.isValid()){
return this.inherited(arguments);
}
return "";
},_setBlurValue:function(){
var _4=dijit.form.ValidationTextBox.prototype._getValueAttr.call(this);
this._setValueAttr(_4,(this.isValid?this.isValid():true));
}});
dojo.declare("dojox.form._NewPWBox",dojox.form._ChildTextBox,{required:true,onChange:function(){
this.containerWidget._inputWidgets[2].validate(false);
this.inherited(arguments);
}});
dojo.declare("dojox.form._VerifyPWBox",dojox.form._ChildTextBox,{isValid:function(_5){
return this.inherited("isValid",arguments)&&(this.get("value")==this.containerWidget._inputWidgets[1].get("value"));
}});
dojo.declare("dojox.form.PasswordValidator",dijit.form._FormValueWidget,{required:true,_inputWidgets:null,oldName:"",templateString:dojo.cache("dojox.form","resources/PasswordValidator.html","<div dojoAttachPoint=\"containerNode\">\n\t<input type=\"hidden\" name=\"${name}\" value=\"\" dojoAttachPoint=\"focusNode\" />\n</div>\n"),_hasBeenBlurred:false,isValid:function(_6){
return dojo.every(this._inputWidgets,function(i){
if(i&&i._setStateClass){
i._setStateClass();
}
return (!i||i.isValid());
});
},validate:function(_7){
return dojo.every(dojo.map(this._inputWidgets,function(i){
if(i&&i.validate){
i._hasBeenBlurred=(i._hasBeenBlurred||this._hasBeenBlurred);
return i.validate();
}
return true;
},this),"return item;");
},reset:function(){
this._hasBeenBlurred=false;
dojo.forEach(this._inputWidgets,function(i){
if(i&&i.reset){
i.reset();
}
},this);
},_createSubWidgets:function(){
var _8=this._inputWidgets,_9=dojo.i18n.getLocalization("dojox.form","PasswordValidator",this.lang);
dojo.forEach(_8,function(i,_a){
if(i){
var p={containerWidget:this},c;
if(_a===0){
p.name=this.oldName;
p.invalidMessage=_9.badPasswordMessage;
c=dojox.form._OldPWBox;
}else{
if(_a===1){
p.required=this.required;
c=dojox.form._NewPWBox;
}else{
if(_a===2){
p.invalidMessage=_9.nomatchMessage;
c=dojox.form._VerifyPWBox;
}
}
}
_8[_a]=new c(p,i);
}
},this);
},pwCheck:function(_b){
return false;
},postCreate:function(){
this.inherited(arguments);
var _c=this._inputWidgets=[];
dojo.forEach(["old","new","verify"],function(i){
_c.push(dojo.query("input[pwType="+i+"]",this.containerNode)[0]);
},this);
if(!_c[1]||!_c[2]){
throw new Error("Need at least pwType=\"new\" and pwType=\"verify\"");
}
if(this.oldName&&!_c[0]){
throw new Error("Need to specify pwType=\"old\" if using oldName");
}
this.containerNode=this.domNode;
this._createSubWidgets();
this.connect(this._inputWidgets[1],"_setValueAttr","_childValueAttr");
this.connect(this._inputWidgets[2],"_setValueAttr","_childValueAttr");
},_childValueAttr:function(v){
this.set("value",this.isValid()?v:"");
},_setDisabledAttr:function(_d){
this.inherited(arguments);
dojo.forEach(this._inputWidgets,function(i){
if(i&&i.set){
i.set("disabled",_d);
}
});
},_setRequiredAttribute:function(_e){
this.required=_e;
dojo.attr(this.focusNode,"required",_e);
dijit.setWaiState(this.focusNode,"required",_e);
this._refreshState();
dojo.forEach(this._inputWidgets,function(i){
if(i&&i.set){
i.set("required",_e);
}
});
},_setValueAttr:function(v){
this.inherited(arguments);
dojo.attr(this.focusNode,"value",v);
},_getValueAttr:function(){
return this.inherited(arguments)||"";
},focus:function(){
var f=false;
dojo.forEach(this._inputWidgets,function(i){
if(i&&!i.isValid()&&!f){
i.focus();
f=true;
}
});
if(!f){
this._inputWidgets[1].focus();
}
}});
}
