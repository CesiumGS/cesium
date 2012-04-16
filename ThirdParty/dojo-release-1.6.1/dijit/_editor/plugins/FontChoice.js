/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.FontChoice"]){
dojo._hasResource["dijit._editor.plugins.FontChoice"]=true;
dojo.provide("dijit._editor.plugins.FontChoice");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit._editor.range");
dojo.require("dijit._editor.selection");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojo.i18n");
dojo.requireLocalization("dijit._editor","FontChoice",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit._editor.plugins._FontDropDown",[dijit._Widget,dijit._Templated],{label:"",widgetsInTemplate:true,plainText:false,templateString:"<span style='white-space: nowrap' class='dijit dijitReset dijitInline'>"+"<label class='dijitLeft dijitInline' for='${selectId}'>${label}</label>"+"<input dojoType='dijit.form.FilteringSelect' required='false' labelType='html' labelAttr='label' searchAttr='name' "+"tabIndex='-1' id='${selectId}' dojoAttachPoint='select' value=''/>"+"</span>",postMixInProperties:function(){
this.inherited(arguments);
this.strings=dojo.i18n.getLocalization("dijit._editor","FontChoice");
this.label=this.strings[this.command];
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.selectId=this.id+"_select";
this.inherited(arguments);
},postCreate:function(){
var _1=dojo.map(this.values,function(_2){
var _3=this.strings[_2]||_2;
return {label:this.getLabel(_2,_3),name:_3,value:_2};
},this);
this.select.store=new dojo.data.ItemFileReadStore({data:{identifier:"value",items:_1}});
this.select.set("value","",false);
this.disabled=this.select.get("disabled");
},_setValueAttr:function(_4,_5){
_5=_5!==false?true:false;
this.select.set("value",dojo.indexOf(this.values,_4)<0?"":_4,_5);
if(!_5){
this.select._lastValueReported=null;
}
},_getValueAttr:function(){
return this.select.get("value");
},focus:function(){
this.select.focus();
},_setDisabledAttr:function(_6){
this.disabled=_6;
this.select.set("disabled",_6);
}});
dojo.declare("dijit._editor.plugins._FontNameDropDown",dijit._editor.plugins._FontDropDown,{generic:false,command:"fontName",postMixInProperties:function(){
if(!this.values){
this.values=this.generic?["serif","sans-serif","monospace","cursive","fantasy"]:["Arial","Times New Roman","Comic Sans MS","Courier New"];
}
this.inherited(arguments);
},getLabel:function(_7,_8){
if(this.plainText){
return _8;
}else{
return "<div style='font-family: "+_7+"'>"+_8+"</div>";
}
},_setValueAttr:function(_9,_a){
_a=_a!==false?true:false;
if(this.generic){
var _b={"Arial":"sans-serif","Helvetica":"sans-serif","Myriad":"sans-serif","Times":"serif","Times New Roman":"serif","Comic Sans MS":"cursive","Apple Chancery":"cursive","Courier":"monospace","Courier New":"monospace","Papyrus":"fantasy"};
_9=_b[_9]||_9;
}
this.inherited(arguments,[_9,_a]);
}});
dojo.declare("dijit._editor.plugins._FontSizeDropDown",dijit._editor.plugins._FontDropDown,{command:"fontSize",values:[1,2,3,4,5,6,7],getLabel:function(_c,_d){
if(this.plainText){
return _d;
}else{
return "<font size="+_c+"'>"+_d+"</font>";
}
},_setValueAttr:function(_e,_f){
_f=_f!==false?true:false;
if(_e.indexOf&&_e.indexOf("px")!=-1){
var _10=parseInt(_e,10);
_e={10:1,13:2,16:3,18:4,24:5,32:6,48:7}[_10]||_e;
}
this.inherited(arguments,[_e,_f]);
}});
dojo.declare("dijit._editor.plugins._FormatBlockDropDown",dijit._editor.plugins._FontDropDown,{command:"formatBlock",values:["noFormat","p","h1","h2","h3","pre"],postCreate:function(){
this.inherited(arguments);
this.set("value","noFormat",false);
},getLabel:function(_11,_12){
if(this.plainText||_11=="noFormat"){
return _12;
}else{
return "<"+_11+">"+_12+"</"+_11+">";
}
},_execCommand:function(_13,_14,_15){
if(_15==="noFormat"){
var _16;
var end;
var sel=dijit.range.getSelection(_13.window);
if(sel&&sel.rangeCount>0){
var _17=sel.getRangeAt(0);
var _18,tag;
if(_17){
_16=_17.startContainer;
end=_17.endContainer;
while(_16&&_16!==_13.editNode&&_16!==_13.document.body&&_16.nodeType!==1){
_16=_16.parentNode;
}
while(end&&end!==_13.editNode&&end!==_13.document.body&&end.nodeType!==1){
end=end.parentNode;
}
var _19=dojo.hitch(this,function(_1a,_1b){
if(_1a.childNodes&&_1a.childNodes.length){
var i;
for(i=0;i<_1a.childNodes.length;i++){
var c=_1a.childNodes[i];
if(c.nodeType==1){
if(dojo.withGlobal(_13.window,"inSelection",dijit._editor.selection,[c])){
var tag=c.tagName?c.tagName.toLowerCase():"";
if(dojo.indexOf(this.values,tag)!==-1){
_1b.push(c);
}
_19(c,_1b);
}
}
}
}
});
var _1c=dojo.hitch(this,function(_1d){
if(_1d&&_1d.length){
_13.beginEditing();
while(_1d.length){
this._removeFormat(_13,_1d.pop());
}
_13.endEditing();
}
});
var _1e=[];
if(_16==end){
var _1f;
_18=_16;
while(_18&&_18!==_13.editNode&&_18!==_13.document.body){
if(_18.nodeType==1){
tag=_18.tagName?_18.tagName.toLowerCase():"";
if(dojo.indexOf(this.values,tag)!==-1){
_1f=_18;
break;
}
}
_18=_18.parentNode;
}
_19(_16,_1e);
if(_1f){
_1e=[_1f].concat(_1e);
}
_1c(_1e);
}else{
_18=_16;
while(dojo.withGlobal(_13.window,"inSelection",dijit._editor.selection,[_18])){
if(_18.nodeType==1){
tag=_18.tagName?_18.tagName.toLowerCase():"";
if(dojo.indexOf(this.values,tag)!==-1){
_1e.push(_18);
}
_19(_18,_1e);
}
_18=_18.nextSibling;
}
_1c(_1e);
}
_13.onDisplayChanged();
}
}
}else{
_13.execCommand(_14,_15);
}
},_removeFormat:function(_20,_21){
if(_20.customUndo){
while(_21.firstChild){
dojo.place(_21.firstChild,_21,"before");
}
_21.parentNode.removeChild(_21);
}else{
dojo.withGlobal(_20.window,"selectElementChildren",dijit._editor.selection,[_21]);
var _22=dojo.withGlobal(_20.window,"getSelectedHtml",dijit._editor.selection,[null]);
dojo.withGlobal(_20.window,"selectElement",dijit._editor.selection,[_21]);
_20.execCommand("inserthtml",_22||"");
}
}});
dojo.declare("dijit._editor.plugins.FontChoice",dijit._editor._Plugin,{useDefaultCommand:false,_initButton:function(){
var _23={fontName:dijit._editor.plugins._FontNameDropDown,fontSize:dijit._editor.plugins._FontSizeDropDown,formatBlock:dijit._editor.plugins._FormatBlockDropDown}[this.command],_24=this.params;
if(this.params.custom){
_24.values=this.params.custom;
}
var _25=this.editor;
this.button=new _23(dojo.delegate({dir:_25.dir,lang:_25.lang},_24));
this.connect(this.button.select,"onChange",function(_26){
this.editor.focus();
if(this.command=="fontName"&&_26.indexOf(" ")!=-1){
_26="'"+_26+"'";
}
if(this.button._execCommand){
this.button._execCommand(this.editor,this.command,_26);
}else{
this.editor.execCommand(this.command,_26);
}
});
},updateState:function(){
var _27=this.editor;
var _28=this.command;
if(!_27||!_27.isLoaded||!_28.length){
return;
}
if(this.button){
var _29=this.get("disabled");
this.button.set("disabled",_29);
if(_29){
return;
}
var _2a;
try{
_2a=_27.queryCommandValue(_28)||"";
}
catch(e){
_2a="";
}
var _2b=dojo.isString(_2a)&&_2a.match(/'([^']*)'/);
if(_2b){
_2a=_2b[1];
}
if(_28==="formatBlock"){
if(!_2a||_2a=="p"){
_2a=null;
var _2c;
var sel=dijit.range.getSelection(this.editor.window);
if(sel&&sel.rangeCount>0){
var _2d=sel.getRangeAt(0);
if(_2d){
_2c=_2d.endContainer;
}
}
while(_2c&&_2c!==_27.editNode&&_2c!==_27.document){
var tg=_2c.tagName?_2c.tagName.toLowerCase():"";
if(tg&&dojo.indexOf(this.button.values,tg)>-1){
_2a=tg;
break;
}
_2c=_2c.parentNode;
}
if(!_2a){
_2a="noFormat";
}
}else{
if(dojo.indexOf(this.button.values,_2a)<0){
_2a="noFormat";
}
}
}
if(_2a!==this.button.get("value")){
this.button.set("value",_2a,false);
}
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
switch(o.args.name){
case "fontName":
case "fontSize":
case "formatBlock":
o.plugin=new dijit._editor.plugins.FontChoice({command:o.args.name,plainText:o.args.plainText?o.args.plainText:false});
}
});
}
