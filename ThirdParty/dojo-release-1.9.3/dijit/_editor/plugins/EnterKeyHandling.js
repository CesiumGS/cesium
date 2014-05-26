//>>built
define("dijit/_editor/plugins/EnterKeyHandling",["dojo/_base/declare","dojo/dom-construct","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","dojo/_base/window","dojo/window","../_Plugin","../RichText","../range","../../_base/focus"],function(_1,_2,_3,_4,on,_5,_6,_7,_8,_9,_a,_b){
return _1("dijit._editor.plugins.EnterKeyHandling",_8,{blockNodeForEnter:"BR",constructor:function(_c){
if(_c){
if("blockNodeForEnter" in _c){
_c.blockNodeForEnter=_c.blockNodeForEnter.toUpperCase();
}
_4.mixin(this,_c);
}
},setEditor:function(_d){
if(this.editor===_d){
return;
}
this.editor=_d;
if(this.blockNodeForEnter=="BR"){
this.editor.customUndo=true;
_d.onLoadDeferred.then(_4.hitch(this,function(d){
this.own(on(_d.document,"keydown",_4.hitch(this,function(e){
if(e.keyCode==_3.ENTER){
var ne=_4.mixin({},e);
ne.shiftKey=true;
if(!this.handleEnterKey(ne)){
e.stopPropagation();
e.preventDefault();
}
}
})));
if(_5("ie")>=9&&_5("ie")<=10){
this.own(on(_d.document,"paste",_4.hitch(this,function(e){
setTimeout(_4.hitch(this,function(){
var r=this.editor.document.selection.createRange();
r.move("character",-1);
r.select();
r.move("character",1);
r.select();
}),0);
})));
}
return d;
}));
}else{
if(this.blockNodeForEnter){
var h=_4.hitch(this,"handleEnterKey");
_d.addKeyHandler(13,0,0,h);
_d.addKeyHandler(13,0,1,h);
this.own(this.editor.on("KeyPressed",_4.hitch(this,"onKeyPressed")));
}
}
},onKeyPressed:function(){
if(this._checkListLater){
if(_6.withGlobal(this.editor.window,"isCollapsed",_b)){
var _e=this.editor.selection.getAncestorElement("LI");
if(!_e){
_9.prototype.execCommand.call(this.editor,"formatblock",this.blockNodeForEnter);
var _f=this.editor.selection.getAncestorElement(this.blockNodeForEnter);
if(_f){
_f.innerHTML=this.bogusHtmlContent;
if(_5("ie")<=9){
var r=this.editor.document.selection.createRange();
r.move("character",-1);
r.select();
}
}else{
console.error("onKeyPressed: Cannot find the new block node");
}
}else{
if(_5("mozilla")){
if(_e.parentNode.parentNode.nodeName=="LI"){
_e=_e.parentNode.parentNode;
}
}
var fc=_e.firstChild;
if(fc&&fc.nodeType==1&&(fc.nodeName=="UL"||fc.nodeName=="OL")){
_e.insertBefore(fc.ownerDocument.createTextNode(" "),fc);
var _10=_a.create(this.editor.window);
_10.setStart(_e.firstChild,0);
var _11=_a.getSelection(this.editor.window,true);
_11.removeAllRanges();
_11.addRange(_10);
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
},bogusHtmlContent:"&#160;",blockNodes:/^(?:P|H1|H2|H3|H4|H5|H6|LI)$/,handleEnterKey:function(e){
var _12,_13,_14,_15,_16,_17,doc=this.editor.document,br,rs,txt;
if(e.shiftKey){
var _18=this.editor.selection.getParentElement();
var _19=_a.getAncestor(_18,this.blockNodes);
if(_19){
if(_19.tagName=="LI"){
return true;
}
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
if(!_13.collapsed){
_13.deleteContents();
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
}
if(_a.atBeginningOfContainer(_19,_13.startContainer,_13.startOffset)){
br=doc.createElement("br");
_14=_a.create(this.editor.window);
_19.insertBefore(br,_19.firstChild);
_14.setStartAfter(br);
_12.removeAllRanges();
_12.addRange(_14);
}else{
if(_a.atEndOfContainer(_19,_13.startContainer,_13.startOffset)){
_14=_a.create(this.editor.window);
br=doc.createElement("br");
_19.appendChild(br);
_19.appendChild(doc.createTextNode(" "));
_14.setStart(_19.lastChild,0);
_12.removeAllRanges();
_12.addRange(_14);
}else{
rs=_13.startContainer;
if(rs&&rs.nodeType==3){
txt=rs.nodeValue;
_15=doc.createTextNode(txt.substring(0,_13.startOffset));
_16=doc.createTextNode(txt.substring(_13.startOffset));
_17=doc.createElement("br");
if(_16.nodeValue==""&&_5("webkit")){
_16=doc.createTextNode(" ");
}
_2.place(_15,rs,"after");
_2.place(_17,_15,"after");
_2.place(_16,_17,"after");
_2.destroy(rs);
_14=_a.create(this.editor.window);
_14.setStart(_16,0);
_12.removeAllRanges();
_12.addRange(_14);
return false;
}
return true;
}
}
}else{
_12=_a.getSelection(this.editor.window);
if(_12.rangeCount){
_13=_12.getRangeAt(0);
if(_13&&_13.startContainer){
if(!_13.collapsed){
_13.deleteContents();
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
}
rs=_13.startContainer;
if(rs&&rs.nodeType==3){
var _1a=_13.startOffset;
if(rs.length<_1a){
ret=this._adjustNodeAndOffset(rs,_1a);
rs=ret.node;
_1a=ret.offset;
}
txt=rs.nodeValue;
_15=doc.createTextNode(txt.substring(0,_1a));
_16=doc.createTextNode(txt.substring(_1a));
_17=doc.createElement("br");
if(!_16.length){
_16=doc.createTextNode(" ");
}
if(_15.length){
_2.place(_15,rs,"after");
}else{
_15=rs;
}
_2.place(_17,_15,"after");
_2.place(_16,_17,"after");
_2.destroy(rs);
_14=_a.create(this.editor.window);
_14.setStart(_16,0);
_14.setEnd(_16,_16.length);
_12.removeAllRanges();
_12.addRange(_14);
this.editor.selection.collapse(true);
}else{
var _1b;
if(_13.startOffset>=0){
_1b=rs.childNodes[_13.startOffset];
}
var _17=doc.createElement("br");
var _16=doc.createTextNode(" ");
if(!_1b){
rs.appendChild(_17);
rs.appendChild(_16);
}else{
_2.place(_17,_1b,"before");
_2.place(_16,_17,"after");
}
_14=_a.create(this.editor.window);
_14.setStart(_16,0);
_14.setEnd(_16,_16.length);
_12.removeAllRanges();
_12.addRange(_14);
this.editor.selection.collapse(true);
}
}
}else{
_9.prototype.execCommand.call(this.editor,"inserthtml","<br>");
}
}
return false;
}
var _1c=true;
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
if(!_13.collapsed){
_13.deleteContents();
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
}
var _1d=_a.getBlockAncestor(_13.endContainer,null,this.editor.editNode);
var _1e=_1d.blockNode;
if((this._checkListLater=(_1e&&(_1e.nodeName=="LI"||_1e.parentNode.nodeName=="LI")))){
if(_5("mozilla")){
this._pressedEnterInBlock=_1e;
}
if(/^(\s|&nbsp;|&#160;|\xA0|<span\b[^>]*\bclass=['"]Apple-style-span['"][^>]*>(\s|&nbsp;|&#160;|\xA0)<\/span>)?(<br>)?$/.test(_1e.innerHTML)){
_1e.innerHTML="";
if(_5("webkit")){
_14=_a.create(this.editor.window);
_14.setStart(_1e,0);
_12.removeAllRanges();
_12.addRange(_14);
}
this._checkListLater=false;
}
return true;
}
if(!_1d.blockNode||_1d.blockNode===this.editor.editNode){
try{
_9.prototype.execCommand.call(this.editor,"formatblock",this.blockNodeForEnter);
}
catch(e2){
}
_1d={blockNode:this.editor.selection.getAncestorElement(this.blockNodeForEnter),blockContainer:this.editor.editNode};
if(_1d.blockNode){
if(_1d.blockNode!=this.editor.editNode&&(!(_1d.blockNode.textContent||_1d.blockNode.innerHTML).replace(/^\s+|\s+$/g,"").length)){
this.removeTrailingBr(_1d.blockNode);
return false;
}
}else{
_1d.blockNode=this.editor.editNode;
}
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
}
var _1f=doc.createElement(this.blockNodeForEnter);
_1f.innerHTML=this.bogusHtmlContent;
this.removeTrailingBr(_1d.blockNode);
var _20=_13.endOffset;
var _21=_13.endContainer;
if(_21.length<_20){
var ret=this._adjustNodeAndOffset(_21,_20);
_21=ret.node;
_20=ret.offset;
}
if(_a.atEndOfContainer(_1d.blockNode,_21,_20)){
if(_1d.blockNode===_1d.blockContainer){
_1d.blockNode.appendChild(_1f);
}else{
_2.place(_1f,_1d.blockNode,"after");
}
_1c=false;
_14=_a.create(this.editor.window);
_14.setStart(_1f,0);
_12.removeAllRanges();
_12.addRange(_14);
if(this.editor.height){
_7.scrollIntoView(_1f);
}
}else{
if(_a.atBeginningOfContainer(_1d.blockNode,_13.startContainer,_13.startOffset)){
_2.place(_1f,_1d.blockNode,_1d.blockNode===_1d.blockContainer?"first":"before");
if(_1f.nextSibling&&this.editor.height){
_14=_a.create(this.editor.window);
_14.setStart(_1f.nextSibling,0);
_12.removeAllRanges();
_12.addRange(_14);
_7.scrollIntoView(_1f.nextSibling);
}
_1c=false;
}else{
if(_1d.blockNode===_1d.blockContainer){
_1d.blockNode.appendChild(_1f);
}else{
_2.place(_1f,_1d.blockNode,"after");
}
_1c=false;
if(_1d.blockNode.style){
if(_1f.style){
if(_1d.blockNode.style.cssText){
_1f.style.cssText=_1d.blockNode.style.cssText;
}
}
}
rs=_13.startContainer;
var _22;
if(rs&&rs.nodeType==3){
var _23,_24;
_20=_13.endOffset;
if(rs.length<_20){
ret=this._adjustNodeAndOffset(rs,_20);
rs=ret.node;
_20=ret.offset;
}
txt=rs.nodeValue;
_15=doc.createTextNode(txt.substring(0,_20));
_16=doc.createTextNode(txt.substring(_20,txt.length));
_2.place(_15,rs,"before");
_2.place(_16,rs,"after");
_2.destroy(rs);
var _25=_15.parentNode;
while(_25!==_1d.blockNode){
var tg=_25.tagName;
var _26=doc.createElement(tg);
if(_25.style){
if(_26.style){
if(_25.style.cssText){
_26.style.cssText=_25.style.cssText;
}
}
}
if(_25.tagName==="FONT"){
if(_25.color){
_26.color=_25.color;
}
if(_25.face){
_26.face=_25.face;
}
if(_25.size){
_26.size=_25.size;
}
}
_23=_16;
while(_23){
_24=_23.nextSibling;
_26.appendChild(_23);
_23=_24;
}
_2.place(_26,_25,"after");
_15=_25;
_16=_26;
_25=_25.parentNode;
}
_23=_16;
if(_23.nodeType==1||(_23.nodeType==3&&_23.nodeValue)){
_1f.innerHTML="";
}
_22=_23;
while(_23){
_24=_23.nextSibling;
_1f.appendChild(_23);
_23=_24;
}
}
_14=_a.create(this.editor.window);
var _27;
var _28=_22;
if(this.blockNodeForEnter!=="BR"){
while(_28){
_27=_28;
_24=_28.firstChild;
_28=_24;
}
if(_27&&_27.parentNode){
_1f=_27.parentNode;
_14.setStart(_1f,0);
_12.removeAllRanges();
_12.addRange(_14);
if(this.editor.height){
_7.scrollIntoView(_1f);
}
if(_5("mozilla")){
this._pressedEnterInBlock=_1d.blockNode;
}
}else{
_1c=true;
}
}else{
_14.setStart(_1f,0);
_12.removeAllRanges();
_12.addRange(_14);
if(this.editor.height){
_7.scrollIntoView(_1f);
}
if(_5("mozilla")){
this._pressedEnterInBlock=_1d.blockNode;
}
}
}
}
return _1c;
},_adjustNodeAndOffset:function(_29,_2a){
while(_29.length<_2a&&_29.nextSibling&&_29.nextSibling.nodeType==3){
_2a=_2a-_29.length;
_29=_29.nextSibling;
}
return {"node":_29,"offset":_2a};
},removeTrailingBr:function(_2b){
var _2c=/P|DIV|LI/i.test(_2b.tagName)?_2b:this.editor.selection.getParentOfType(_2b,["P","DIV","LI"]);
if(!_2c){
return;
}
if(_2c.lastChild){
if((_2c.childNodes.length>1&&_2c.lastChild.nodeType==3&&/^[\s\xAD]*$/.test(_2c.lastChild.nodeValue))||_2c.lastChild.tagName=="BR"){
_2.destroy(_2c.lastChild);
}
}
if(!_2c.childNodes.length){
_2c.innerHTML=this.bogusHtmlContent;
}
}});
});
