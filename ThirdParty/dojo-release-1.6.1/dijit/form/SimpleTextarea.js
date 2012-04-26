/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.SimpleTextarea"]){
dojo._hasResource["dijit.form.SimpleTextarea"]=true;
dojo.provide("dijit.form.SimpleTextarea");
dojo.require("dijit.form.TextBox");
dojo.declare("dijit.form.SimpleTextarea",dijit.form.TextBox,{baseClass:"dijitTextBox dijitTextArea",attributeMap:dojo.delegate(dijit.form._FormValueWidget.prototype.attributeMap,{rows:"textbox",cols:"textbox"}),rows:"3",cols:"20",templateString:"<textarea ${!nameAttrSetting} dojoAttachPoint='focusNode,containerNode,textbox' autocomplete='off'></textarea>",postMixInProperties:function(){
if(!this.value&&this.srcNodeRef){
this.value=this.srcNodeRef.value;
}
this.inherited(arguments);
},buildRendering:function(){
this.inherited(arguments);
if(dojo.isIE&&this.cols){
dojo.addClass(this.textbox,"dijitTextAreaCols");
}
},filter:function(_1){
if(_1){
_1=_1.replace(/\r/g,"");
}
return this.inherited(arguments);
},_previousValue:"",_onInput:function(e){
if(this.maxLength){
var _2=parseInt(this.maxLength);
var _3=this.textbox.value.replace(/\r/g,"");
var _4=_3.length-_2;
if(_4>0){
if(e){
dojo.stopEvent(e);
}
var _5=this.textbox;
if(_5.selectionStart){
var _6=_5.selectionStart;
var cr=0;
if(dojo.isOpera){
cr=(this.textbox.value.substring(0,_6).match(/\r/g)||[]).length;
}
this.textbox.value=_3.substring(0,_6-_4-cr)+_3.substring(_6-cr);
_5.setSelectionRange(_6-_4,_6-_4);
}else{
if(dojo.doc.selection){
_5.focus();
var _7=dojo.doc.selection.createRange();
_7.moveStart("character",-_4);
_7.text="";
_7.select();
}
}
}
this._previousValue=this.textbox.value;
}
this.inherited(arguments);
}});
}
