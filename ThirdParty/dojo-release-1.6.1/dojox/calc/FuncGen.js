/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.calc.FuncGen"]){
dojo._hasResource["dojox.calc.FuncGen"]=true;
dojo.provide("dojox.calc.FuncGen");
dojo.require("dijit._Templated");
dojo.require("dojox.math._base");
dojo.require("dijit.dijit");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.SimpleTextarea");
dojo.require("dijit.form.Button");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.experimental("dojox.calc.FuncGen");
dojo.declare("dojox.calc.FuncGen",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.calc","templates/FuncGen.html","<div style=\"border:1px solid black;\">\n\n\t<select dojoType=\"dijit.form.ComboBox\" placeholder=\"functionName\" dojoAttachPoint='combo' style=\"width:45%;\" class=\"dojoxCalcFuncGenNameBox\" dojoAttachEvent='onChange:onSelect'></select>\n\n\t<input dojoType=\"dijit.form.TextBox\" placeholder=\"arguments\" class=\"dojoxCalcFuncGenTextBox\" style=\"width:50%;\" dojoAttachPoint='args' />\n\t<BR>\n\t<TEXTAREA dojoType=\"dijit.form.SimpleTextarea\" placeholder=\"function body\" class=\"dojoxCalcFuncGenTextArea\" style=\"text-align:left;width:95%;\" rows=10 dojoAttachPoint='textarea' value=\"\" dojoAttachEvent='onClick:readyStatus'></TEXTAREA>\n\t<BR>\n\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcFuncGenSave\" dojoAttachPoint='saveButton' label=\"Save\" dojoAttachEvent='onClick:onSaved' />\n\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcFuncGenReset\" dojoAttachPoint='resetButton' label=\"Reset\" dojoAttachEvent='onClick:onReset' />\n\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcFuncGenClear\" dojoAttachPoint='clearButton' label=\"Clear\" dojoAttachEvent='onClick:onClear' />\n\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcFuncGenClose\" dojoAttachPoint='closeButton' label=\"Close\" />\n\t<BR><BR>\n\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcFuncGenDelete\" dojoAttachPoint='deleteButton' label=\"Delete\" dojoAttachEvent='onClick:onDelete' />\n\t<BR>\n\t<input dojoType=\"dijit.form.TextBox\" style=\"width:45%;\" dojoAttachPoint='status' class=\"dojoxCalcFuncGenStatusTextBox\" readonly value=\"Ready\" />\n</div>\n"),widgetsInTemplate:true,onSelect:function(){
this.reset();
},onClear:function(){
var _1=confirm("Do you want to clear the name, argument, and body text?");
if(_1){
this.clear();
}
},saveFunction:function(_2,_3,_4){
},onSaved:function(){
},clear:function(){
this.textarea.set("value","");
this.args.set("value","");
this.combo.set("value","");
},reset:function(){
if(this.combo.get("value") in this.functions){
this.textarea.set("value",this.functions[this.combo.get("value")].body);
this.args.set("value",this.functions[this.combo.get("value")].args);
}
},onReset:function(){
if(this.combo.get("value") in this.functions){
var _5=confirm("Do you want to reset this function?");
if(_5){
this.reset();
this.status.set("value","The function has been reset to its last save point.");
}
}
},deleteThing:function(_6){
if(this.writeStore.isItem(_6)){
this.writeStore.deleteItem(_6);
this.writeStore.save();
}else{
}
},deleteFunction:function(_7){
},onDelete:function(){
var _8;
if((_8=this.combo.get("value")) in this.functions){
var _9=confirm("Do you want to delete this function?");
if(_9){
var _a=this.combo.item;
this.writeStore.deleteItem(_a);
this.writeStore.save();
this.deleteFunction(_8);
delete this.functions[_8];
this.clear();
}
}else{
this.status.set("value","Function cannot be deleted, it isn't saved.");
}
},readyStatus:function(){
this.status.set("value","Ready");
},writeStore:null,readStore:null,functions:null,startup:function(){
this.combo.set("store",this.writeStore);
this.inherited(arguments);
var _b=dijit.getEnclosingWidget(this.domNode.parentNode);
if(_b&&typeof _b.close=="function"){
this.closeButton.set("onClick",dojo.hitch(_b,"close"));
}else{
dojo.style(this.closeButton.domNode,"display","none");
}
}});
}
