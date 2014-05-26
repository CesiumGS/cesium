//>>built
define("dijit/_editor/plugins/FontChoice",["require","dojo/_base/array","dojo/_base/declare","dojo/dom-construct","dojo/i18n","dojo/_base/lang","dojo/store/Memory","../../registry","../../_Widget","../../_TemplatedMixin","../../_WidgetsInTemplateMixin","../../form/FilteringSelect","../_Plugin","../range","dojo/i18n!../nls/FontChoice"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e){
var _f=_3("dijit._editor.plugins._FontDropDown",[_9,_a,_b],{label:"",plainText:false,templateString:"<span style='white-space: nowrap' class='dijit dijitReset dijitInline'>"+"<label class='dijitLeft dijitInline' for='${selectId}'>${label}</label>"+"<input data-dojo-type='../../form/FilteringSelect' required='false' "+"data-dojo-props='labelType:\"html\", labelAttr:\"label\", searchAttr:\"name\"' "+"class='${comboClass}' "+"tabIndex='-1' id='${selectId}' data-dojo-attach-point='select' value=''/>"+"</span>",contextRequire:_1,postMixInProperties:function(){
this.inherited(arguments);
this.strings=_5.getLocalization("dijit._editor","FontChoice");
this.label=this.strings[this.command];
this.id=_8.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.selectId=this.id+"_select";
this.inherited(arguments);
},postCreate:function(){
this.select.set("store",new _7({idProperty:"value",data:_2.map(this.values,function(_10){
var _11=this.strings[_10]||_10;
return {label:this.getLabel(_10,_11),name:_11,value:_10};
},this)}));
this.select.set("value","",false);
this.disabled=this.select.get("disabled");
},_setValueAttr:function(_12,_13){
_13=_13!==false;
this.select.set("value",_2.indexOf(this.values,_12)<0?"":_12,_13);
if(!_13){
this.select._lastValueReported=null;
}
},_getValueAttr:function(){
return this.select.get("value");
},focus:function(){
this.select.focus();
},_setDisabledAttr:function(_14){
this._set("disabled",_14);
this.select.set("disabled",_14);
}});
var _15=_3("dijit._editor.plugins._FontNameDropDown",_f,{generic:false,command:"fontName",comboClass:"dijitFontNameCombo",postMixInProperties:function(){
if(!this.values){
this.values=this.generic?["serif","sans-serif","monospace","cursive","fantasy"]:["Arial","Times New Roman","Comic Sans MS","Courier New"];
}
this.inherited(arguments);
},getLabel:function(_16,_17){
if(this.plainText){
return _17;
}else{
return "<div style='font-family: "+_16+"'>"+_17+"</div>";
}
},_setValueAttr:function(_18,_19){
_19=_19!==false;
if(this.generic){
var map={"Arial":"sans-serif","Helvetica":"sans-serif","Myriad":"sans-serif","Times":"serif","Times New Roman":"serif","Comic Sans MS":"cursive","Apple Chancery":"cursive","Courier":"monospace","Courier New":"monospace","Papyrus":"fantasy","Estrangelo Edessa":"cursive","Gabriola":"fantasy"};
_18=map[_18]||_18;
}
this.inherited(arguments,[_18,_19]);
}});
var _1a=_3("dijit._editor.plugins._FontSizeDropDown",_f,{command:"fontSize",comboClass:"dijitFontSizeCombo",values:[1,2,3,4,5,6,7],getLabel:function(_1b,_1c){
if(this.plainText){
return _1c;
}else{
return "<font size="+_1b+"'>"+_1c+"</font>";
}
},_setValueAttr:function(_1d,_1e){
_1e=_1e!==false;
if(_1d.indexOf&&_1d.indexOf("px")!=-1){
var _1f=parseInt(_1d,10);
_1d={10:1,13:2,16:3,18:4,24:5,32:6,48:7}[_1f]||_1d;
}
this.inherited(arguments,[_1d,_1e]);
}});
var _20=_3("dijit._editor.plugins._FormatBlockDropDown",_f,{command:"formatBlock",comboClass:"dijitFormatBlockCombo",values:["noFormat","p","h1","h2","h3","pre"],postCreate:function(){
this.inherited(arguments);
this.set("value","noFormat",false);
},getLabel:function(_21,_22){
if(this.plainText||_21=="noFormat"){
return _22;
}else{
return "<"+_21+">"+_22+"</"+_21+">";
}
},_execCommand:function(_23,_24,_25){
if(_25==="noFormat"){
var _26;
var end;
var sel=_e.getSelection(_23.window);
if(sel&&sel.rangeCount>0){
var _27=sel.getRangeAt(0);
var _28,tag;
if(_27){
_26=_27.startContainer;
end=_27.endContainer;
while(_26&&_26!==_23.editNode&&_26!==_23.document.body&&_26.nodeType!==1){
_26=_26.parentNode;
}
while(end&&end!==_23.editNode&&end!==_23.document.body&&end.nodeType!==1){
end=end.parentNode;
}
var _29=_6.hitch(this,function(_2a,ary){
if(_2a.childNodes&&_2a.childNodes.length){
var i;
for(i=0;i<_2a.childNodes.length;i++){
var c=_2a.childNodes[i];
if(c.nodeType==1){
if(_23.selection.inSelection(c)){
var tag=c.tagName?c.tagName.toLowerCase():"";
if(_2.indexOf(this.values,tag)!==-1){
ary.push(c);
}
_29(c,ary);
}
}
}
}
});
var _2b=_6.hitch(this,function(_2c){
if(_2c&&_2c.length){
_23.beginEditing();
while(_2c.length){
this._removeFormat(_23,_2c.pop());
}
_23.endEditing();
}
});
var _2d=[];
if(_26==end){
var _2e;
_28=_26;
while(_28&&_28!==_23.editNode&&_28!==_23.document.body){
if(_28.nodeType==1){
tag=_28.tagName?_28.tagName.toLowerCase():"";
if(_2.indexOf(this.values,tag)!==-1){
_2e=_28;
break;
}
}
_28=_28.parentNode;
}
_29(_26,_2d);
if(_2e){
_2d=[_2e].concat(_2d);
}
_2b(_2d);
}else{
_28=_26;
while(_23.selection.inSelection(_28)){
if(_28.nodeType==1){
tag=_28.tagName?_28.tagName.toLowerCase():"";
if(_2.indexOf(this.values,tag)!==-1){
_2d.push(_28);
}
_29(_28,_2d);
}
_28=_28.nextSibling;
}
_2b(_2d);
}
_23.onDisplayChanged();
}
}
}else{
_23.execCommand(_24,_25);
}
},_removeFormat:function(_2f,_30){
if(_2f.customUndo){
while(_30.firstChild){
_4.place(_30.firstChild,_30,"before");
}
_30.parentNode.removeChild(_30);
}else{
_2f.selection.selectElementChildren(_30);
var _31=_2f.selection.getSelectedHtml();
_2f.selection.selectElement(_30);
_2f.execCommand("inserthtml",_31||"");
}
}});
var _32=_3("dijit._editor.plugins.FontChoice",_d,{useDefaultCommand:false,_initButton:function(){
var _33={fontName:_15,fontSize:_1a,formatBlock:_20}[this.command],_34=this.params;
if(this.params.custom){
_34.values=this.params.custom;
}
var _35=this.editor;
this.button=new _33(_6.delegate({dir:_35.dir,lang:_35.lang},_34));
this.own(this.button.select.on("change",_6.hitch(this,function(_36){
if(this.editor.focused){
this.editor.focus();
}
if(this.command=="fontName"&&_36.indexOf(" ")!=-1){
_36="'"+_36+"'";
}
if(this.button._execCommand){
this.button._execCommand(this.editor,this.command,_36);
}else{
this.editor.execCommand(this.command,_36);
}
})));
},updateState:function(){
var _37=this.editor;
var _38=this.command;
if(!_37||!_37.isLoaded||!_38.length){
return;
}
if(this.button){
var _39=this.get("disabled");
this.button.set("disabled",_39);
if(_39){
return;
}
var _3a;
try{
_3a=_37.queryCommandValue(_38)||"";
}
catch(e){
_3a="";
}
var _3b=_6.isString(_3a)&&_3a.match(/'([^']*)'/);
if(_3b){
_3a=_3b[1];
}
if(_38==="formatBlock"){
if(!_3a||_3a=="p"){
_3a=null;
var _3c;
var sel=_e.getSelection(this.editor.window);
if(sel&&sel.rangeCount>0){
var _3d=sel.getRangeAt(0);
if(_3d){
_3c=_3d.endContainer;
}
}
while(_3c&&_3c!==_37.editNode&&_3c!==_37.document){
var tg=_3c.tagName?_3c.tagName.toLowerCase():"";
if(tg&&_2.indexOf(this.button.values,tg)>-1){
_3a=tg;
break;
}
_3c=_3c.parentNode;
}
if(!_3a){
_3a="noFormat";
}
}else{
if(_2.indexOf(this.button.values,_3a)<0){
_3a="noFormat";
}
}
}
if(_3a!==this.button.get("value")){
this.button.set("value",_3a,false);
}
}
}});
_2.forEach(["fontName","fontSize","formatBlock"],function(_3e){
_d.registry[_3e]=function(_3f){
return new _32({command:_3e,plainText:_3f.plainText});
};
});
_32._FontDropDown=_f;
_32._FontNameDropDown=_15;
_32._FontSizeDropDown=_1a;
_32._FormatBlockDropDown=_20;
return _32;
});
