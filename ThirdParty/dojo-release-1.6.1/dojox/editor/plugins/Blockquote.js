/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.Blockquote"]){
dojo._hasResource["dojox.editor.plugins.Blockquote"]=true;
dojo.provide("dojox.editor.plugins.Blockquote");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","Blockquote",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.Blockquote",dijit._editor._Plugin,{iconClassPrefix:"dijitAdditionalEditorIcon",_initButton:function(){
this._nlsResources=dojo.i18n.getLocalization("dojox.editor.plugins","Blockquote");
this.button=new dijit.form.ToggleButton({label:this._nlsResources["blockquote"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"Blockquote",tabIndex:"-1",onClick:dojo.hitch(this,"_toggleQuote")});
},setEditor:function(_1){
this.editor=_1;
this._initButton();
this.connect(this.editor,"onNormalizedDisplayChanged","updateState");
_1.customUndo=true;
},_toggleQuote:function(_2){
try{
var ed=this.editor;
ed.focus();
var _3=this.button.get("checked");
var _4=dijit.range.getSelection(ed.window);
var _5,_6,_7,_8;
if(_4&&_4.rangeCount>0){
_5=_4.getRangeAt(0);
}
if(_5){
ed.beginEditing();
if(_3){
var bq,_9;
if(_5.startContainer===_5.endContainer){
if(this._isRootInline(_5.startContainer)){
_7=_5.startContainer;
while(_7&&_7.parentNode!==ed.editNode){
_7=_7.parentNode;
}
while(_7&&_7.previousSibling&&(this._isTextElement(_7)||(_7.nodeType===1&&this._isInlineFormat(this._getTagName(_7))))){
_7=_7.previousSibling;
}
if(_7&&_7.nodeType===1&&!this._isInlineFormat(this._getTagName(_7))){
_7=_7.nextSibling;
}
if(_7){
bq=ed.document.createElement("blockquote");
dojo.place(bq,_7,"after");
bq.appendChild(_7);
_8=bq.nextSibling;
while(_8&&(this._isTextElement(_8)||(_8.nodeType===1&&this._isInlineFormat(this._getTagName(_8))))){
bq.appendChild(_8);
_8=bq.nextSibling;
}
}
}else{
var _a=_5.startContainer;
while((this._isTextElement(_a)||this._isInlineFormat(this._getTagName(_a))||this._getTagName(_a)==="li")&&_a!==ed.editNode&&_a!==ed.document.body){
_a=_a.parentNode;
}
if(_a!==ed.editNode&&_a!==_a.ownerDocument.documentElement){
bq=ed.document.createElement("blockquote");
dojo.place(bq,_a,"after");
bq.appendChild(_a);
}
}
if(bq){
dojo.withGlobal(ed.window,"selectElementChildren",dijit._editor.selection,[bq]);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}
}else{
var _b;
_7=_5.startContainer;
_8=_5.endContainer;
while(_7&&this._isTextElement(_7)&&_7.parentNode!==ed.editNode){
_7=_7.parentNode;
}
_b=_7;
while(_b.nextSibling&&dojo.withGlobal(ed.window,"inSelection",dijit._editor.selection,[_b])){
_b=_b.nextSibling;
}
_8=_b;
if(_8===ed.editNode||_8===ed.document.body){
bq=ed.document.createElement("blockquote");
dojo.place(bq,_7,"after");
_9=this._getTagName(_7);
if(this._isTextElement(_7)||this._isInlineFormat(_9)){
var _c=_7;
while(_c&&(this._isTextElement(_c)||(_c.nodeType===1&&this._isInlineFormat(this._getTagName(_c))))){
bq.appendChild(_c);
_c=bq.nextSibling;
}
}else{
bq.appendChild(_7);
}
return;
}
_8=_8.nextSibling;
_b=_7;
while(_b&&_b!==_8){
if(_b.nodeType===1){
_9=this._getTagName(_b);
if(_9!=="br"){
if(!window.getSelection){
if(_9==="p"&&this._isEmpty(_b)){
_b=_b.nextSibling;
continue;
}
}
if(this._isInlineFormat(_9)){
if(!bq){
bq=ed.document.createElement("blockquote");
dojo.place(bq,_b,"after");
bq.appendChild(_b);
}else{
bq.appendChild(_b);
}
_b=bq;
}else{
if(bq){
if(this._isEmpty(bq)){
bq.parentNode.removeChild(bq);
}
}
bq=ed.document.createElement("blockquote");
dojo.place(bq,_b,"after");
bq.appendChild(_b);
_b=bq;
}
}
}else{
if(this._isTextElement(_b)){
if(!bq){
bq=ed.document.createElement("blockquote");
dojo.place(bq,_b,"after");
bq.appendChild(_b);
}else{
bq.appendChild(_b);
}
_b=bq;
}
}
_b=_b.nextSibling;
}
if(bq){
if(this._isEmpty(bq)){
bq.parentNode.removeChild(bq);
}else{
dojo.withGlobal(ed.window,"selectElementChildren",dijit._editor.selection,[bq]);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}
bq=null;
}
}
}else{
var _d=false;
if(_5.startContainer===_5.endContainer){
_6=_5.endContainer;
while(_6&&_6!==ed.editNode&&_6!==ed.document.body){
var tg=_6.tagName?_6.tagName.toLowerCase():"";
if(tg==="blockquote"){
_d=true;
break;
}
_6=_6.parentNode;
}
if(_d){
var _e;
while(_6.firstChild){
_e=_6.firstChild;
dojo.place(_e,_6,"before");
}
_6.parentNode.removeChild(_6);
if(_e){
dojo.withGlobal(ed.window,"selectElementChildren",dijit._editor.selection,[_e]);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}
}
}else{
_7=_5.startContainer;
_8=_5.endContainer;
while(_7&&this._isTextElement(_7)&&_7.parentNode!==ed.editNode){
_7=_7.parentNode;
}
var _f=[];
var _10=_7;
while(_10&&_10.nextSibling&&dojo.withGlobal(ed.window,"inSelection",dijit._editor.selection,[_10])){
if(_10.parentNode&&this._getTagName(_10.parentNode)==="blockquote"){
_10=_10.parentNode;
}
_f.push(_10);
_10=_10.nextSibling;
}
var _11=this._findBlockQuotes(_f);
while(_11.length){
var bn=_11.pop();
if(bn.parentNode){
while(bn.firstChild){
dojo.place(bn.firstChild,bn,"before");
}
bn.parentNode.removeChild(bn);
}
}
}
}
ed.endEditing();
}
ed.onNormalizedDisplayChanged();
}
catch(e){
}
},updateState:function(){
var ed=this.editor;
var _12=this.get("disabled");
if(!ed||!ed.isLoaded){
return;
}
if(this.button){
this.button.set("disabled",_12);
if(_12){
return;
}
var _13;
var _14=false;
var sel=dijit.range.getSelection(ed.window);
if(sel&&sel.rangeCount>0){
var _15=sel.getRangeAt(0);
if(_15){
_13=_15.endContainer;
}
}
while(_13&&_13!==ed.editNode&&_13!==ed.document){
var tg=_13.tagName?_13.tagName.toLowerCase():"";
if(tg==="blockquote"){
_14=true;
break;
}
_13=_13.parentNode;
}
this.button.set("checked",_14);
}
},_findBlockQuotes:function(_16){
var _17=[];
if(_16){
var i;
for(i=0;i<_16.length;i++){
var _18=_16[i];
if(_18.nodeType===1){
if(this._getTagName(_18)==="blockquote"){
_17.push(_18);
}
if(_18.childNodes&&_18.childNodes.length>0){
_17=_17.concat(this._findBlockQuotes(_18.childNodes));
}
}
}
}
return _17;
},_getTagName:function(_19){
var tag="";
if(_19&&_19.nodeType===1){
tag=_19.tagName?_19.tagName.toLowerCase():"";
}
return tag;
},_isRootInline:function(_1a){
var ed=this.editor;
if(this._isTextElement(_1a)&&_1a.parentNode===ed.editNode){
return true;
}else{
if(_1a.nodeType===1&&this._isInlineFormat(_1a)&&_1a.parentNode===ed.editNode){
return true;
}else{
if(this._isTextElement(_1a)&&this._isInlineFormat(this._getTagName(_1a.parentNode))){
_1a=_1a.parentNode;
while(_1a&&_1a!==ed.editNode&&this._isInlineFormat(this._getTagName(_1a))){
_1a=_1a.parentNode;
}
if(_1a===ed.editNode){
return true;
}
}
}
}
return false;
},_isTextElement:function(_1b){
if(_1b&&_1b.nodeType===3||_1b.nodeType===4){
return true;
}
return false;
},_isEmpty:function(_1c){
if(_1c.childNodes){
var _1d=true;
var i;
for(i=0;i<_1c.childNodes.length;i++){
var n=_1c.childNodes[i];
if(n.nodeType===1){
if(this._getTagName(n)==="p"){
if(!dojo.trim(n.innerHTML)){
continue;
}
}
_1d=false;
break;
}else{
if(this._isTextElement(n)){
var nv=dojo.trim(n.nodeValue);
if(nv&&nv!=="&nbsp;"&&nv!==" "){
_1d=false;
break;
}
}else{
_1d=false;
break;
}
}
}
return _1d;
}else{
return true;
}
},_isInlineFormat:function(tag){
switch(tag){
case "a":
case "b":
case "strong":
case "s":
case "strike":
case "i":
case "u":
case "em":
case "sup":
case "sub":
case "span":
case "font":
case "big":
case "cite":
case "q":
case "img":
case "small":
return true;
default:
return false;
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _1e=o.args.name.toLowerCase();
if(_1e==="blockquote"){
o.plugin=new dojox.editor.plugins.Blockquote({});
}
});
}
