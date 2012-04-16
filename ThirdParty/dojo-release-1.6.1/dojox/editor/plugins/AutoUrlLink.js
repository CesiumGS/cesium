/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.AutoUrlLink"]){
dojo._hasResource["dojox.editor.plugins.AutoUrlLink"]=true;
dojo.provide("dojox.editor.plugins.AutoUrlLink");
dojo.require("dojo.string");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.declare("dojox.editor.plugins.AutoUrlLink",[dijit._editor._Plugin],{_template:"<a _djrealurl='${url}' href='${url}'>${url}</a>",setEditor:function(_1){
this.editor=_1;
if(!dojo.isIE){
dojo.some(_1._plugins,function(_2){
if(_2.isInstanceOf(dijit._editor.plugins.EnterKeyHandling)){
this.blockNodeForEnter=_2.blockNodeForEnter;
return true;
}
return false;
},this);
this.connect(_1,"onKeyPress","_keyPress");
this.connect(_1,"onClick","_recognize");
this.connect(_1,"onBlur","_recognize");
}
},_keyPress:function(_3){
var ks=dojo.keys,v=118,V=86,kc=_3.keyCode,cc=_3.charCode;
if(cc==ks.SPACE||(_3.ctrlKey&&(cc==v||cc==V))){
setTimeout(dojo.hitch(this,"_recognize"),0);
}else{
if(kc==ks.ENTER){
setTimeout(dojo.hitch(this,function(){
this._recognize({enter:true});
}),0);
}else{
this._saved=this.editor.window.getSelection().anchorNode;
}
}
},_recognize:function(_4){
var _5=this._template,_6=_4?_4.enter:false,ed=this.editor,_7=ed.window.getSelection();
if(_7){
var _8=_6?this._findLastEditingNode(_7.anchorNode):(this._saved||_7.anchorNode),bm=this._saved=_7.anchorNode,_9=_7.anchorOffset;
if(_8.nodeType==3&&!this._inLink(_8)){
var _a=false,_b=this._findUrls(_8,bm,_9),_c=ed.document.createRange(),_d,_e=0,_f=(bm==_8);
_d=_b.shift();
while(_d){
_c.setStart(_8,_d.start);
_c.setEnd(_8,_d.end);
_7.removeAllRanges();
_7.addRange(_c);
ed.execCommand("insertHTML",dojo.string.substitute(_5,{url:_c.toString()}));
_e+=_d.end;
_d=_b.shift();
_a=true;
}
if(_f&&(_9=_9-_e)<=0){
return;
}
if(!_a){
return;
}
try{
_c.setStart(bm,0);
_c.setEnd(bm,_9);
_7.removeAllRanges();
_7.addRange(_c);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[]);
}
catch(e){
}
}
}
},_inLink:function(_10){
var _11=this.editor.editNode,_12=false,_13;
_10=_10.parentNode;
while(_10&&_10!==_11){
_13=_10.tagName?_10.tagName.toLowerCase():"";
if(_13=="a"){
_12=true;
break;
}
_10=_10.parentNode;
}
return _12;
},_findLastEditingNode:function(_14){
var _15=dijit.range.BlockTagNames,_16=this.editor.editNode,_17;
if(!_14){
return _14;
}
if(this.blockNodeForEnter=="BR"&&(!(_17=dijit.range.getBlockAncestor(_14,null,_16).blockNode)||_17.tagName.toUpperCase()!="LI")){
while((_14=_14.previousSibling)&&_14.nodeType!=3){
}
}else{
if((_17||(_17=dijit.range.getBlockAncestor(_14,null,_16).blockNode))&&_17.tagName.toUpperCase()=="LI"){
_14=_17;
}else{
_14=dijit.range.getBlockAncestor(_14,null,_16).blockNode;
}
while((_14=_14.previousSibling)&&!(_14.tagName&&_14.tagName.match(_15))){
}
if(_14){
_14=_14.lastChild;
while(_14){
if(_14.nodeType==3&&dojo.trim(_14.nodeValue)!=""){
break;
}else{
if(_14.nodeType==1){
_14=_14.lastChild;
}else{
_14=_14.previousSibling;
}
}
}
}
}
return _14;
},_findUrls:function(_18,bm,_19){
var _1a=/(http|https|ftp):\/\/[^\s]+/ig,_1b=[],_1c=0,_1d=_18.nodeValue,_1e,ch;
if(_18===bm&&_19<_1d.length){
_1d=_1d.substr(0,_19);
}
while((_1e=_1a.exec(_1d))!=null){
if(_1e.index==0||(ch=_1d.charAt(_1e.index-1))==" "||ch==" "){
_1b.push({start:_1e.index-_1c,end:_1e.index+_1e[0].length-_1c});
_1c=_1e.index+_1e[0].length;
}
}
return _1b;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _1f=o.args.name.toLowerCase();
if(_1f==="autourllink"){
o.plugin=new dojox.editor.plugins.AutoUrlLink();
}
});
}
