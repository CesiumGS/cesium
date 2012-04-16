/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.AutoSave"]){
dojo._hasResource["dojox.editor.plugins.AutoSave"]=true;
dojo.provide("dojox.editor.plugins.AutoSave");
dojo.require("dojo.string");
dojo.require("dojo.date.locale");
dojo.require("dijit.Dialog");
dojo.require("dijit.MenuItem");
dojo.require("dijit.Menu");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.require("dojox.editor.plugins.Save");
dojo.requireLocalization("dojox.editor.plugins","AutoSave",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins.AutoSave");
dojo.declare("dojox.editor.plugins._AutoSaveSettingDialog",[dijit._Widget,dijit._Templated],{dialogTitle:"",dialogDescription:"",paramName:"",paramLabel:"",btnOk:"",btnCancel:"",widgetsInTemplate:true,templateString:"<span id='${dialogId}' class='dijit dijitReset dijitInline' tabindex='-1'>"+"<div dojoType='dijit.Dialog' title='${dialogTitle}' dojoAttachPoint='dialog' "+"class='dijitEditorAutoSaveSettingDialog'>"+"<div tabindex='-1'>${dialogDescription}</div>"+"<div tabindex='-1' class='dijitEditorAutoSaveSettingInputArea'>${paramName}</div>"+"<div class='dijitEditorAutoSaveSettingInputArea' tabindex='-1'>"+"<input class='textBox' dojoType='dijit.form.TextBox' id='${textBoxId}' required='false' intermediateChanges='true' "+"selectOnClick='true' required='true' dojoAttachPoint='intBox' "+"dojoAttachEvent='onKeyDown: _onKeyDown, onChange: _onChange'/>"+"<label class='dijitLeft dijitInline boxLabel' "+"for='${textBoxId}' tabindex='-1'>${paramLabel}</label>"+"</div>"+"<div class='dijitEditorAutoSaveSettingButtonArea' tabindex='-1'>"+"<button dojoType='dijit.form.Button' dojoAttachEvent='onClick: onOk'>${btnOk}</button>"+"<button dojoType='dijit.form.Button' dojoAttachEvent='onClick: onCancel'>${btnCancel}</button>"+"</div>"+"</div>"+"</span>",postMixInProperties:function(){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.dialogId=this.id+"_dialog";
this.textBoxId=this.id+"_textBox";
},show:function(){
if(this._value==""){
this._value=0;
this.intBox.set("value",0);
}else{
this.intBox.set("value",this._value);
}
this.dialog.show();
dijit.selectInputText(this.intBox.focusNode);
},hide:function(){
this.dialog.hide();
},onOk:function(){
this.dialog.hide();
},onCancel:function(){
this.dialog.hide();
},_onKeyDown:function(_1){
if(_1.keyCode==dojo.keys.ENTER){
this.onOk();
}
},_onChange:function(_2){
if(this._isValidValue(_2)){
this._value=_2;
}else{
this.intBox.set("value",this._value);
}
},_setValueAttr:function(_3){
if(this._isValidValue(_3)){
this._value=_3;
}
},_getValueAttr:function(){
return this._value;
},_isValidValue:function(_4){
var _5=/^\d{0,3}$/,_6=String(_4);
return Boolean(_6.match?_6.match(_5):"");
}});
dojo.declare("dojox.editor.plugins.AutoSave",dojox.editor.plugins.Save,{url:"",logResults:true,interval:0,_iconClassPrefix:"dijitEditorIconAutoSave",_MIN:60000,_setIntervalAttr:function(_7){
this.interval=_7;
},_getIntervalAttr:function(){
return this._interval;
},setEditor:function(_8){
this.editor=_8;
this._strings=dojo.i18n.getLocalization("dojox.editor.plugins","AutoSave");
this._initButton();
this._saveSettingDialog=new dojox.editor.plugins._AutoSaveSettingDialog({"dialogTitle":this._strings["saveSettingdialogTitle"],"dialogDescription":this._strings["saveSettingdialogDescription"],"paramName":this._strings["saveSettingdialogParamName"],"paramLabel":this._strings["saveSettingdialogParamLabel"],"btnOk":this._strings["saveSettingdialogButtonOk"],"btnCancel":this._strings["saveSettingdialogButtonCancel"]});
this.connect(this._saveSettingDialog,"onOk","_onDialogOk");
var pd=this._promDialog=new dijit.TooltipDialog();
pd.startup();
pd.set("content","");
},_initButton:function(){
var _9=new dijit.Menu({style:"display: none"}),_a=new dijit.MenuItem({iconClass:this._iconClassPrefix+"Default "+this._iconClassPrefix,label:this._strings["saveLabel"]}),_b=this._menuItemAutoSave=new dijit.MenuItem({iconClass:this._iconClassPrefix+"Setting "+this._iconClassPrefix,label:this._strings["saveSettingLabelOn"]});
_9.addChild(_a);
_9.addChild(_b);
this.button=new dijit.form.ComboButton({label:this._strings["saveLabel"],iconClass:this._iconClassPrefix+"Default "+this._iconClassPrefix,showLabel:false,dropDown:_9});
this.connect(this.button,"onClick","_save");
this.connect(_a,"onClick","_save");
this._menuItemAutoSaveClickHandler=dojo.connect(_b,"onClick",this,"_showAutSaveSettingDialog");
},_showAutSaveSettingDialog:function(){
var _c=this._saveSettingDialog;
_c.set("value",this.interval);
_c.show();
},_onDialogOk:function(){
var _d=this.interval=this._saveSettingDialog.get("value")*this._MIN;
if(_d>0){
this._setSaveInterval(_d);
dojo.disconnect(this._menuItemAutoSaveClickHandler);
this._menuItemAutoSave.set("label",this._strings["saveSettingLabelOff"]);
this._menuItemAutoSaveClickHandler=dojo.connect(this._menuItemAutoSave,"onClick",this,"_onStopClick");
this.button.set("iconClass",this._iconClassPrefix+"Setting "+this._iconClassPrefix);
}
},_onStopClick:function(){
this._clearSaveInterval();
dojo.disconnect(this._menuItemAutoSaveClickHandler);
this._menuItemAutoSave.set("label",this._strings["saveSettingLabelOn"]);
this._menuItemAutoSaveClickHandler=dojo.connect(this._menuItemAutoSave,"onClick",this,"_showAutSaveSettingDialog");
this.button.set("iconClass",this._iconClassPrefix+"Default "+this._iconClassPrefix);
},_setSaveInterval:function(_e){
if(_e<=0){
return;
}
this._clearSaveInterval();
this._intervalHandler=setInterval(dojo.hitch(this,function(){
if(!this._isWorking&&!this.get("disabled")){
this._isWorking=true;
this._save();
}
}),_e);
},_clearSaveInterval:function(){
if(this._intervalHandler){
clearInterval(this._intervalHandler);
this._intervalHandler=null;
}
},onSuccess:function(_f,_10){
this.button.set("disabled",false);
this._promDialog.set("content",dojo.string.substitute(this._strings["saveMessageSuccess"],{"0":dojo.date.locale.format(new Date(),{selector:"time"})}));
dijit.popup.open({popup:this._promDialog,around:this.button.domNode});
this._promDialogTimeout=setTimeout(dojo.hitch(this,function(){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}),3000);
this._isWorking=false;
if(this.logResults){
}
},onError:function(_11,_12){
this.button.set("disabled",false);
this._promDialog.set("content",dojo.string.substitute(this._strings["saveMessageFail"],{"0":dojo.date.locale.format(new Date(),{selector:"time"})}));
dijit.popup.open({popup:this._promDialog,around:this.button.domNode});
this._promDialogTimeout=setTimeout(dojo.hitch(this,function(){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}),3000);
this._isWorking=false;
if(this.logResults){
}
},destroy:function(){
this.inherited(arguments);
this._menuItemAutoSave=null;
if(this._promDialogTimeout){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}
this._clearSaveInterval();
if(this._saveSettingDialog){
this._saveSettingDialog.destroyRecursive();
this._destroyRecursive=null;
}
if(this._menuItemAutoSaveClickHandler){
dojo.disconnect(this._menuItemAutoSaveClickHandler);
this._menuItemAutoSaveClickHandler=null;
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _13=o.args.name.toLowerCase();
if(_13=="autosave"){
o.plugin=new dojox.editor.plugins.AutoSave({url:("url" in o.args)?o.args.url:"",logResults:("logResults" in o.args)?o.args.logResults:true,interval:("interval" in o.args)?o.args.interval:5});
}
});
}
