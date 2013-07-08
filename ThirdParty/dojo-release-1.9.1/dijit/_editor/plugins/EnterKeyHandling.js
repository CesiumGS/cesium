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
if(_5("ie")>=9){
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
var _1a=false;
var _1b=_13.startOffset;
if(rs.length<_1b){
ret=this._adjustNodeAndOffset(rs,_1b);
rs=ret.node;
_1b=ret.offset;
}
txt=rs.nodeValue;
_15=doc.createTextNode(txt.substring(0,_1b));
_16=doc.createTextNode(txt.substring(_1b));
_17=doc.createElement("br");
if(!_16.length){
_16=doc.createTextNode(" ");
_1a=true;
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
if(_1a&&!_5("webkit")){
this.editor.selection.remove();
}else{
this.editor.selection.collapse(true);
}
}else{
var _1c;
if(_13.startOffset>=0){
_1c=rs.childNodes[_13.startOffset];
}
var _17=doc.createElement("br");
var _16=doc.createTextNode(" ");
if(!_1c){
rs.appendChild(_17);
rs.appendChild(_16);
}else{
_2.place(_17,_1c,"before");
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
var _1d=true;
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
if(!_13.collapsed){
_13.deleteContents();
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
}
var _1e=_a.getBlockAncestor(_13.endContainer,null,this.editor.editNode);
var _1f=_1e.blockNode;
if((this._checkListLater=(_1f&&(_1f.nodeName=="LI"||_1f.parentNode.nodeName=="LI")))){
if(_5("mozilla")){
this._pressedEnterInBlock=_1f;
}
if(/^(\s|&nbsp;|&#160;|\xA0|<span\b[^>]*\bclass=['"]Apple-style-span['"][^>]*>(\s|&nbsp;|&#160;|\xA0)<\/span>)?(<br>)?$/.test(_1f.innerHTML)){
_1f.innerHTML="";
if(_5("webkit")){
_14=_a.create(this.editor.window);
_14.setStart(_1f,0);
_12.removeAllRanges();
_12.addRange(_14);
}
this._checkListLater=false;
}
return true;
}
if(!_1e.blockNode||_1e.blockNode===this.editor.editNode){
try{
_9.prototype.execCommand.call(this.editor,"formatblock",this.blockNodeForEnter);
}
catch(e2){
}
_1e={blockNode:this.editor.selection.getAncestorElement(this.blockNodeForEnter),blockContainer:this.editor.editNode};
if(_1e.blockNode){
if(_1e.blockNode!=this.editor.editNode&&(!(_1e.blockNode.textContent||_1e.blockNode.innerHTML).replace(/^\s+|\s+$/g,"").length)){
this.removeTrailingBr(_1e.blockNode);
return false;
}
}else{
_1e.blockNode=this.editor.editNode;
}
_12=_a.getSelection(this.editor.window);
_13=_12.getRangeAt(0);
}
var _20=doc.createElement(this.blockNodeForEnter);
_20.innerHTML=this.bogusHtmlContent;
this.removeTrailingBr(_1e.blockNode);
var _21=_13.endOffset;
var _22=_13.endContainer;
if(_22.length<_21){
var ret=this._adjustNodeAndOffset(_22,_21);
_22=ret.node;
_21=ret.offset;
}
if(_a.atEndOfContainer(_1e.blockNode,_22,_21)){
if(_1e.blockNode===_1e.blockContainer){
_1e.blockNode.appendChild(_20);
}else{
_2.place(_20,_1e.blockNode,"after");
}
_1d=false;
_14=_a.create(this.editor.window);
_14.setStart(_20,0);
_12.removeAllRanges();
_12.addRange(_14);
if(this.editor.height){
_7.scrollIntoView(_20);
}
}else{
if(_a.atBeginningOfContainer(_1e.blockNode,_13.startContainer,_13.startOffset)){
_2.place(_20,_1e.blockNode,_1e.blockNode===_1e.blockContainer?"first":"before");
if(_20.nextSibling&&this.editor.height){
_14=_a.create(this.editor.window);
_14.setStart(_20.nextSibling,0);
_12.removeAllRanges();
_12.addRange(_14);
_7.scrollIntoView(_20.nextSibling);
}
_1d=false;
}else{
if(_1e.blockNode===_1e.blockContainer){
_1e.blockNode.appendChild(_20);
}else{
_2.place(_20,_1e.blockNode,"after");
}
_1d=false;
if(_1e.blockNode.style){
if(_20.style){
if(_1e.blockNode.style.cssText){
_20.style.cssText=_1e.blockNode.style.cssText;
}
}
}
rs=_13.startContainer;
var _23;
if(rs&&rs.nodeType==3){
var _24,_25;
_21=_13.endOffset;
if(rs.length<_21){
ret=this._adjustNodeAndOffset(rs,_21);
rs=ret.node;
_21=ret.offset;
}
txt=rs.nodeValue;
_15=doc.createTextNode(txt.substring(0,_21));
_16=doc.createTextNode(txt.substring(_21,txt.length));
_2.place(_15,rs,"before");
_2.place(_16,rs,"after");
_2.destroy(rs);
var _26=_15.parentNode;
while(_26!==_1e.blockNode){
var tg=_26.tagName;
var _27=doc.createElement(tg);
if(_26.style){
if(_27.style){
if(_26.style.cssText){
_27.style.cssText=_26.style.cssText;
}
}
}
if(_26.tagName==="FONT"){
if(_26.color){
_27.color=_26.color;
}
if(_26.face){
_27.face=_26.face;
}
if(_26.size){
_27.size=_26.size;
}
}
_24=_16;
while(_24){
_25=_24.nextSibling;
_27.appendChild(_24);
_24=_25;
}
_2.place(_27,_26,"after");
_15=_26;
_16=_27;
_26=_26.parentNode;
}
_24=_16;
if(_24.nodeType==1||(_24.nodeType==3&&_24.nodeValue)){
_20.innerHTML="";
}
_23=_24;
while(_24){
_25=_24.nextSibling;
_20.appendChild(_24);
_24=_25;
}
}
_14=_a.create(this.editor.window);
var _28;
var _29=_23;
if(this.blockNodeForEnter!=="BR"){
while(_29){
_28=_29;
_25=_29.firstChild;
_29=_25;
}
if(_28&&_28.parentNode){
_20=_28.parentNode;
_14.setStart(_20,0);
_12.removeAllRanges();
_12.addRange(_14);
if(this.editor.height){
_7.scrollIntoView(_20);
}
if(_5("mozilla")){
this._pressedEnterInBlock=_1e.blockNode;
}
}else{
_1d=true;
}
}else{
_14.setStart(_20,0);
_12.removeAllRanges();
_12.addRange(_14);
if(this.editor.height){
_7.scrollIntoView(_20);
}
if(_5("mozilla")){
this._pressedEnterInBlock=_1e.blockNode;
}
}
}
}
return _1d;
},_adjustNodeAndOffset:function(_2a,_2b){
while(_2a.length<_2b&&_2a.nextSibling&&_2a.nextSibling.nodeType==3){
_2b=_2b-_2a.length;
_2a=_2a.nextSibling;
}
return {"node":_2a,"offset":_2b};
},removeTrailingBr:function(_2c){
var _2d=/P|DIV|LI/i.test(_2c.tagName)?_2c:this.editor.selection.getParentOfType(_2c,["P","DIV","LI"]);
if(!_2d){
return;
}
if(_2d.lastChild){
if((_2d.childNodes.length>1&&_2d.lastChild.nodeType==3&&/^[\s\xAD]*$/.test(_2d.lastChild.nodeValue))||_2d.lastChild.tagName=="BR"){
_2.destroy(_2d.lastChild);
}
}
if(!_2d.childNodes.length){
_2d.innerHTML=this.bogusHtmlContent;
}
}});
});
