/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.selection"]){
dojo._hasResource["dijit._editor.selection"]=true;
dojo.provide("dijit._editor.selection");
dojo.getObject("_editor.selection",true,dijit);
dojo.mixin(dijit._editor.selection,{getType:function(){
if(dojo.isIE<9){
return dojo.doc.selection.type.toLowerCase();
}else{
var _1="text";
var _2;
try{
_2=dojo.global.getSelection();
}
catch(e){
}
if(_2&&_2.rangeCount==1){
var _3=_2.getRangeAt(0);
if((_3.startContainer==_3.endContainer)&&((_3.endOffset-_3.startOffset)==1)&&(_3.startContainer.nodeType!=3)){
_1="control";
}
}
return _1;
}
},getSelectedText:function(){
if(dojo.isIE<9){
if(dijit._editor.selection.getType()=="control"){
return null;
}
return dojo.doc.selection.createRange().text;
}else{
var _4=dojo.global.getSelection();
if(_4){
return _4.toString();
}
}
return "";
},getSelectedHtml:function(){
if(dojo.isIE<9){
if(dijit._editor.selection.getType()=="control"){
return null;
}
return dojo.doc.selection.createRange().htmlText;
}else{
var _5=dojo.global.getSelection();
if(_5&&_5.rangeCount){
var i;
var _6="";
for(i=0;i<_5.rangeCount;i++){
var _7=_5.getRangeAt(i).cloneContents();
var _8=dojo.doc.createElement("div");
_8.appendChild(_7);
_6+=_8.innerHTML;
}
return _6;
}
return null;
}
},getSelectedElement:function(){
if(dijit._editor.selection.getType()=="control"){
if(dojo.isIE<9){
var _9=dojo.doc.selection.createRange();
if(_9&&_9.item){
return dojo.doc.selection.createRange().item(0);
}
}else{
var _a=dojo.global.getSelection();
return _a.anchorNode.childNodes[_a.anchorOffset];
}
}
return null;
},getParentElement:function(){
if(dijit._editor.selection.getType()=="control"){
var p=this.getSelectedElement();
if(p){
return p.parentNode;
}
}else{
if(dojo.isIE<9){
var r=dojo.doc.selection.createRange();
r.collapse(true);
return r.parentElement();
}else{
var _b=dojo.global.getSelection();
if(_b){
var _c=_b.anchorNode;
while(_c&&(_c.nodeType!=1)){
_c=_c.parentNode;
}
return _c;
}
}
}
return null;
},hasAncestorElement:function(_d){
return this.getAncestorElement.apply(this,arguments)!=null;
},getAncestorElement:function(_e){
var _f=this.getSelectedElement()||this.getParentElement();
return this.getParentOfType(_f,arguments);
},isTag:function(_10,_11){
if(_10&&_10.tagName){
var _12=_10.tagName.toLowerCase();
for(var i=0;i<_11.length;i++){
var _13=String(_11[i]).toLowerCase();
if(_12==_13){
return _13;
}
}
}
return "";
},getParentOfType:function(_14,_15){
while(_14){
if(this.isTag(_14,_15).length){
return _14;
}
_14=_14.parentNode;
}
return null;
},collapse:function(_16){
if(window.getSelection){
var _17=dojo.global.getSelection();
if(_17.removeAllRanges){
if(_16){
_17.collapseToStart();
}else{
_17.collapseToEnd();
}
}else{
_17.collapse(_16);
}
}else{
if(dojo.isIE){
var _18=dojo.doc.selection.createRange();
_18.collapse(_16);
_18.select();
}
}
},remove:function(){
var sel=dojo.doc.selection;
if(dojo.isIE<9){
if(sel.type.toLowerCase()!="none"){
sel.clear();
}
return sel;
}else{
sel=dojo.global.getSelection();
sel.deleteFromDocument();
return sel;
}
},selectElementChildren:function(_19,_1a){
var win=dojo.global;
var doc=dojo.doc;
var _1b;
_19=dojo.byId(_19);
if(doc.selection&&dojo.isIE<9&&dojo.body().createTextRange){
_1b=_19.ownerDocument.body.createTextRange();
_1b.moveToElementText(_19);
if(!_1a){
try{
_1b.select();
}
catch(e){
}
}
}else{
if(win.getSelection){
var _1c=dojo.global.getSelection();
if(dojo.isOpera){
if(_1c.rangeCount){
_1b=_1c.getRangeAt(0);
}else{
_1b=doc.createRange();
}
_1b.setStart(_19,0);
_1b.setEnd(_19,(_19.nodeType==3)?_19.length:_19.childNodes.length);
_1c.addRange(_1b);
}else{
_1c.selectAllChildren(_19);
}
}
}
},selectElement:function(_1d,_1e){
var _1f;
var doc=dojo.doc;
var win=dojo.global;
_1d=dojo.byId(_1d);
if(dojo.isIE<9&&dojo.body().createTextRange){
try{
var tg=_1d.tagName?_1d.tagName.toLowerCase():"";
if(tg==="img"||tg==="table"){
_1f=dojo.body().createControlRange();
}else{
_1f=dojo.body().createRange();
}
_1f.addElement(_1d);
if(!_1e){
_1f.select();
}
}
catch(e){
this.selectElementChildren(_1d,_1e);
}
}else{
if(dojo.global.getSelection){
var _20=win.getSelection();
_1f=doc.createRange();
if(_20.removeAllRanges){
if(dojo.isOpera){
if(_20.getRangeAt(0)){
_1f=_20.getRangeAt(0);
}
}
_1f.selectNode(_1d);
_20.removeAllRanges();
_20.addRange(_1f);
}
}
}
},inSelection:function(_21){
if(_21){
var _22;
var doc=dojo.doc;
var _23;
if(dojo.global.getSelection){
var sel=dojo.global.getSelection();
if(sel&&sel.rangeCount>0){
_23=sel.getRangeAt(0);
}
if(_23&&_23.compareBoundaryPoints&&doc.createRange){
try{
_22=doc.createRange();
_22.setStart(_21,0);
if(_23.compareBoundaryPoints(_23.START_TO_END,_22)===1){
return true;
}
}
catch(e){
}
}
}else{
if(doc.selection){
_23=doc.selection.createRange();
try{
_22=_21.ownerDocument.body.createControlRange();
if(_22){
_22.addElement(_21);
}
}
catch(e1){
try{
_22=_21.ownerDocument.body.createTextRange();
_22.moveToElementText(_21);
}
catch(e2){
}
}
if(_23&&_22){
if(_23.compareEndPoints("EndToStart",_22)===1){
return true;
}
}
}
}
}
return false;
}});
}
