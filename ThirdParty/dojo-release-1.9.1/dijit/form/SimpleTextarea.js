//>>built
define("dijit/form/SimpleTextarea",["dojo/_base/declare","dojo/dom-class","dojo/sniff","./TextBox"],function(_1,_2,_3,_4){
return _1("dijit.form.SimpleTextarea",_4,{baseClass:"dijitTextBox dijitTextArea",rows:"3",cols:"20",templateString:"<textarea ${!nameAttrSetting} data-dojo-attach-point='focusNode,containerNode,textbox' autocomplete='off'></textarea>",postMixInProperties:function(){
if(!this.value&&this.srcNodeRef){
this.value=this.srcNodeRef.value;
}
this.inherited(arguments);
},buildRendering:function(){
this.inherited(arguments);
if(_3("ie")&&this.cols){
_2.add(this.textbox,"dijitTextAreaCols");
}
},filter:function(_5){
if(_5){
_5=_5.replace(/\r/g,"");
}
return this.inherited(arguments);
},_onInput:function(e){
if(this.maxLength){
var _6=parseInt(this.maxLength);
var _7=this.textbox.value.replace(/\r/g,"");
var _8=_7.length-_6;
if(_8>0){
var _9=this.textbox;
if(_9.selectionStart){
var _a=_9.selectionStart;
var cr=0;
if(_3("opera")){
cr=(this.textbox.value.substring(0,_a).match(/\r/g)||[]).length;
}
this.textbox.value=_7.substring(0,_a-_8-cr)+_7.substring(_a-cr);
_9.setSelectionRange(_a-_8,_a-_8);
}else{
if(this.ownerDocument.selection){
_9.focus();
var _b=this.ownerDocument.selection.createRange();
_b.moveStart("character",-_8);
_b.text="";
_b.select();
}
}
}
}
this.inherited(arguments);
}});
});
