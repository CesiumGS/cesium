/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.EnterKeyHandling"]){
dojo._hasResource["dijit._editor.plugins.EnterKeyHandling"]=true;
dojo.provide("dijit._editor.plugins.EnterKeyHandling");
dojo.require("dojo.window");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit._editor.range");
dojo.declare("dijit._editor.plugins.EnterKeyHandling",dijit._editor._Plugin,{blockNodeForEnter:"BR",constructor:function(_1){
if(_1){
if("blockNodeForEnter" in _1){
_1.blockNodeForEnter=_1.blockNodeForEnter.toUpperCase();
}
dojo.mixin(this,_1);
}
},setEditor:function(_2){
if(this.editor===_2){
return;
}
this.editor=_2;
if(this.blockNodeForEnter=="BR"){
this.editor.customUndo=true;
_2.onLoadDeferred.addCallback(dojo.hitch(this,function(d){
this.connect(_2.document,"onkeypress",function(e){
if(e.charOrCode==dojo.keys.ENTER){
var ne=dojo.mixin({},e);
ne.shiftKey=true;
if(!this.handleEnterKey(ne)){
dojo.stopEvent(e);
}
}
});
return d;
}));
}else{
if(this.blockNodeForEnter){
var h=dojo.hitch(this,this.handleEnterKey);
_2.addKeyHandler(13,0,0,h);
_2.addKeyHandler(13,0,1,h);
this.connect(this.editor,"onKeyPressed","onKeyPressed");
}
}
},onKeyPressed:function(e){
if(this._checkListLater){
if(dojo.withGlobal(this.editor.window,"isCollapsed",dijit)){
var _3=dojo.withGlobal(this.editor.window,"getAncestorElement",dijit._editor.selection,["LI"]);
if(!_3){
dijit._editor.RichText.prototype.execCommand.call(this.editor,"formatblock",this.blockNodeForEnter);
var _4=dojo.withGlobal(this.editor.window,"getAncestorElement",dijit._editor.selection,[this.blockNodeForEnter]);
if(_4){
_4.innerHTML=this.bogusHtmlContent;
if(dojo.isIE){
var r=this.editor.document.selection.createRange();
r.move("character",-1);
r.select();
}
}else{
console.error("onKeyPressed: Cannot find the new block node");
}
}else{
if(dojo.isMoz){
if(_3.parentNode.parentNode.nodeName=="LI"){
_3=_3.parentNode.parentNode;
}
}
var fc=_3.firstChild;
if(fc&&fc.nodeType==1&&(fc.nodeName=="UL"||fc.nodeName=="OL")){
_3.insertBefore(fc.ownerDocument.createTextNode(" "),fc);
var _5=dijit.range.create(this.editor.window);
_5.setStart(_3.firstChild,0);
var _6=dijit.range.getSelection(this.editor.window,true);
_6.removeAllRanges();
_6.addRange(_5);
}
}
}
this._checkListLater=false;
}
if(this._pressedEnterInBlock){
if(this._pressedEnterInBlock.previousSibling){
this.removeTrailingBr(this._pressedEnterInBlock.previousSibling);
}
delete this._pressedEnterInBlock;
}
},bogusHtmlContent:"&nbsp;",blockNodes:/^(?:P|H1|H2|H3|H4|H5|H6|LI)$/,handleEnterKey:function(e){
var _7,_8,_9,_a,_b,_c,_d=this.editor.document,br,rs,_e;
if(e.shiftKey){
var _f=dojo.withGlobal(this.editor.window,"getParentElement",dijit._editor.selection);
var _10=dijit.range.getAncestor(_f,this.blockNodes);
if(_10){
if(_10.tagName=="LI"){
return true;
}
_7=dijit.range.getSelection(this.editor.window);
_8=_7.getRangeAt(0);
if(!_8.collapsed){
_8.deleteContents();
_7=dijit.range.getSelection(this.editor.window);
_8=_7.getRangeAt(0);
}
if(dijit.range.atBeginningOfContainer(_10,_8.startContainer,_8.startOffset)){
br=_d.createElement("br");
_9=dijit.range.create(this.editor.window);
_10.insertBefore(br,_10.firstChild);
_9.setStartBefore(br.nextSibling);
_7.removeAllRanges();
_7.addRange(_9);
}else{
if(dijit.range.atEndOfContainer(_10,_8.startContainer,_8.startOffset)){
_9=dijit.range.create(this.editor.window);
br=_d.createElement("br");
_10.appendChild(br);
_10.appendChild(_d.createTextNode(" "));
_9.setStart(_10.lastChild,0);
_7.removeAllRanges();
_7.addRange(_9);
}else{
rs=_8.startContainer;
if(rs&&rs.nodeType==3){
_e=rs.nodeValue;
dojo.withGlobal(this.editor.window,function(){
_a=_d.createTextNode(_e.substring(0,_8.startOffset));
_b=_d.createTextNode(_e.substring(_8.startOffset));
_c=_d.createElement("br");
if(_b.nodeValue==""&&dojo.isWebKit){
_b=_d.createTextNode(" ");
}
dojo.place(_a,rs,"after");
dojo.place(_c,_a,"after");
dojo.place(_b,_c,"after");
dojo.destroy(rs);
_9=dijit.range.create(dojo.gobal);
_9.setStart(_b,0);
_7.removeAllRanges();
_7.addRange(_9);
});
return false;
}
return true;
}
}
}else{
_7=dijit.range.getSelection(this.editor.window);
if(_7.rangeCount){
_8=_7.getRangeAt(0);
if(_8&&_8.startContainer){
if(!_8.collapsed){
_8.deleteContents();
_7=dijit.range.getSelection(this.editor.window);
_8=_7.getRangeAt(0);
}
rs=_8.startContainer;
if(rs&&rs.nodeType==3){
dojo.withGlobal(this.editor.window,dojo.hitch(this,function(){
var _11=false;
var _12=_8.startOffset;
if(rs.length<_12){
ret=this._adjustNodeAndOffset(rs,_12);
rs=ret.node;
_12=ret.offset;
}
_e=rs.nodeValue;
_a=_d.createTextNode(_e.substring(0,_12));
_b=_d.createTextNode(_e.substring(_12));
_c=_d.createElement("br");
if(!_b.length){
_b=_d.createTextNode(" ");
_11=true;
}
if(_a.length){
dojo.place(_a,rs,"after");
}else{
_a=rs;
}
dojo.place(_c,_a,"after");
dojo.place(_b,_c,"after");
dojo.destroy(rs);
_9=dijit.range.create(dojo.gobal);
_9.setStart(_b,0);
_9.setEnd(_b,_b.length);
_7.removeAllRanges();
_7.addRange(_9);
if(_11&&!dojo.isWebKit){
dijit._editor.selection.remove();
}else{
dijit._editor.selection.collapse(true);
}
}));
}else{
dojo.withGlobal(this.editor.window,dojo.hitch(this,function(){
var _13=_d.createElement("br");
rs.appendChild(_13);
var _14=_d.createTextNode(" ");
rs.appendChild(_14);
_9=dijit.range.create(dojo.global);
_9.setStart(_14,0);
_9.setEnd(_14,_14.length);
_7.removeAllRanges();
_7.addRange(_9);
dijit._editor.selection.collapse(true);
}));
}
}
}else{
dijit._editor.RichText.prototype.execCommand.call(this.editor,"inserthtml","<br>");
}
}
return false;
}
var _15=true;
_7=dijit.range.getSelection(this.editor.window);
_8=_7.getRangeAt(0);
if(!_8.collapsed){
_8.deleteContents();
_7=dijit.range.getSelection(this.editor.window);
_8=_7.getRangeAt(0);
}
var _16=dijit.range.getBlockAncestor(_8.endContainer,null,this.editor.editNode);
var _17=_16.blockNode;
if((this._checkListLater=(_17&&(_17.nodeName=="LI"||_17.parentNode.nodeName=="LI")))){
if(dojo.isMoz){
this._pressedEnterInBlock=_17;
}
if(/^(\s|&nbsp;|\xA0|<span\b[^>]*\bclass=['"]Apple-style-span['"][^>]*>(\s|&nbsp;|\xA0)<\/span>)?(<br>)?$/.test(_17.innerHTML)){
_17.innerHTML="";
if(dojo.isWebKit){
_9=dijit.range.create(this.editor.window);
_9.setStart(_17,0);
_7.removeAllRanges();
_7.addRange(_9);
}
this._checkListLater=false;
}
return true;
}
if(!_16.blockNode||_16.blockNode===this.editor.editNode){
try{
dijit._editor.RichText.prototype.execCommand.call(this.editor,"formatblock",this.blockNodeForEnter);
}
catch(e2){
}
_16={blockNode:dojo.withGlobal(this.editor.window,"getAncestorElement",dijit._editor.selection,[this.blockNodeForEnter]),blockContainer:this.editor.editNode};
if(_16.blockNode){
if(_16.blockNode!=this.editor.editNode&&(!(_16.blockNode.textContent||_16.blockNode.innerHTML).replace(/^\s+|\s+$/g,"").length)){
this.removeTrailingBr(_16.blockNode);
return false;
}
}else{
_16.blockNode=this.editor.editNode;
}
_7=dijit.range.getSelection(this.editor.window);
_8=_7.getRangeAt(0);
}
var _18=_d.createElement(this.blockNodeForEnter);
_18.innerHTML=this.bogusHtmlContent;
this.removeTrailingBr(_16.blockNode);
var _19=_8.endOffset;
var _1a=_8.endContainer;
if(_1a.length<_19){
var ret=this._adjustNodeAndOffset(_1a,_19);
_1a=ret.node;
_19=ret.offset;
}
if(dijit.range.atEndOfContainer(_16.blockNode,_1a,_19)){
if(_16.blockNode===_16.blockContainer){
_16.blockNode.appendChild(_18);
}else{
dojo.place(_18,_16.blockNode,"after");
}
_15=false;
_9=dijit.range.create(this.editor.window);
_9.setStart(_18,0);
_7.removeAllRanges();
_7.addRange(_9);
if(this.editor.height){
dojo.window.scrollIntoView(_18);
}
}else{
if(dijit.range.atBeginningOfContainer(_16.blockNode,_8.startContainer,_8.startOffset)){
dojo.place(_18,_16.blockNode,_16.blockNode===_16.blockContainer?"first":"before");
if(_18.nextSibling&&this.editor.height){
_9=dijit.range.create(this.editor.window);
_9.setStart(_18.nextSibling,0);
_7.removeAllRanges();
_7.addRange(_9);
dojo.window.scrollIntoView(_18.nextSibling);
}
_15=false;
}else{
if(_16.blockNode===_16.blockContainer){
_16.blockNode.appendChild(_18);
}else{
dojo.place(_18,_16.blockNode,"after");
}
_15=false;
if(_16.blockNode.style){
if(_18.style){
if(_16.blockNode.style.cssText){
_18.style.cssText=_16.blockNode.style.cssText;
}
}
}
rs=_8.startContainer;
var _1b;
if(rs&&rs.nodeType==3){
var _1c,_1d;
_19=_8.endOffset;
if(rs.length<_19){
ret=this._adjustNodeAndOffset(rs,_19);
rs=ret.node;
_19=ret.offset;
}
_e=rs.nodeValue;
_a=_d.createTextNode(_e.substring(0,_19));
_b=_d.createTextNode(_e.substring(_19,_e.length));
dojo.place(_a,rs,"before");
dojo.place(_b,rs,"after");
dojo.destroy(rs);
var _1e=_a.parentNode;
while(_1e!==_16.blockNode){
var tg=_1e.tagName;
var _1f=_d.createElement(tg);
if(_1e.style){
if(_1f.style){
if(_1e.style.cssText){
_1f.style.cssText=_1e.style.cssText;
}
}
}
if(_1e.tagName==="FONT"){
if(_1e.color){
_1f.color=_1e.color;
}
if(_1e.face){
_1f.face=_1e.face;
}
if(_1e.size){
_1f.size=_1e.size;
}
}
_1c=_b;
while(_1c){
_1d=_1c.nextSibling;
_1f.appendChild(_1c);
_1c=_1d;
}
dojo.place(_1f,_1e,"after");
_a=_1e;
_b=_1f;
_1e=_1e.parentNode;
}
_1c=_b;
if(_1c.nodeType==1||(_1c.nodeType==3&&_1c.nodeValue)){
_18.innerHTML="";
}
_1b=_1c;
while(_1c){
_1d=_1c.nextSibling;
_18.appendChild(_1c);
_1c=_1d;
}
}
_9=dijit.range.create(this.editor.window);
var _20;
var _21=_1b;
if(this.blockNodeForEnter!=="BR"){
while(_21){
_20=_21;
_1d=_21.firstChild;
_21=_1d;
}
if(_20&&_20.parentNode){
_18=_20.parentNode;
_9.setStart(_18,0);
_7.removeAllRanges();
_7.addRange(_9);
if(this.editor.height){
dijit.scrollIntoView(_18);
}
if(dojo.isMoz){
this._pressedEnterInBlock=_16.blockNode;
}
}else{
_15=true;
}
}else{
_9.setStart(_18,0);
_7.removeAllRanges();
_7.addRange(_9);
if(this.editor.height){
dijit.scrollIntoView(_18);
}
if(dojo.isMoz){
this._pressedEnterInBlock=_16.blockNode;
}
}
}
}
return _15;
},_adjustNodeAndOffset:function(_22,_23){
while(_22.length<_23&&_22.nextSibling&&_22.nextSibling.nodeType==3){
_23=_23-_22.length;
_22=_22.nextSibling;
}
var ret={"node":_22,"offset":_23};
return ret;
},removeTrailingBr:function(_24){
var _25=/P|DIV|LI/i.test(_24.tagName)?_24:dijit._editor.selection.getParentOfType(_24,["P","DIV","LI"]);
if(!_25){
return;
}
if(_25.lastChild){
if((_25.childNodes.length>1&&_25.lastChild.nodeType==3&&/^[\s\xAD]*$/.test(_25.lastChild.nodeValue))||_25.lastChild.tagName=="BR"){
dojo.destroy(_25.lastChild);
}
}
if(!_25.childNodes.length){
_25.innerHTML=this.bogusHtmlContent;
}
}});
}
