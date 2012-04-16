/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.NormalizeIndentOutdent"]){
dojo._hasResource["dojox.editor.plugins.NormalizeIndentOutdent"]=true;
dojo.provide("dojox.editor.plugins.NormalizeIndentOutdent");
dojo.require("dijit._editor.selection");
dojo.require("dijit._editor._Plugin");
dojo.declare("dojox.editor.plugins.NormalizeIndentOutdent",dijit._editor._Plugin,{indentBy:40,indentUnits:"px",setEditor:function(_1){
this.editor=_1;
_1._indentImpl=dojo.hitch(this,this._indentImpl);
_1._outdentImpl=dojo.hitch(this,this._outdentImpl);
if(!_1._indentoutdent_queryCommandEnabled){
_1._indentoutdent_queryCommandEnabled=_1.queryCommandEnabled;
}
_1.queryCommandEnabled=dojo.hitch(this,this._queryCommandEnabled);
_1.customUndo=true;
},_queryCommandEnabled:function(_2){
var c=_2.toLowerCase();
var ed,_3,_4,_5,_6,_7;
var _8="marginLeft";
if(!this._isLtr()){
_8="marginRight";
}
if(c==="indent"){
ed=this.editor;
_3=dijit.range.getSelection(ed.window);
if(_3&&_3.rangeCount>0){
_4=_3.getRangeAt(0);
_5=_4.startContainer;
while(_5&&_5!==ed.document&&_5!==ed.editNode){
_6=this._getTagName(_5);
if(_6==="li"){
_7=_5.previousSibling;
while(_7&&_7.nodeType!==1){
_7=_7.previousSibling;
}
if(_7&&this._getTagName(_7)==="li"){
return true;
}else{
return false;
}
}else{
if(this._isIndentableElement(_6)){
return true;
}
}
_5=_5.parentNode;
}
if(this._isRootInline(_4.startContainer)){
return true;
}
}
}else{
if(c==="outdent"){
ed=this.editor;
_3=dijit.range.getSelection(ed.window);
if(_3&&_3.rangeCount>0){
_4=_3.getRangeAt(0);
_5=_4.startContainer;
while(_5&&_5!==ed.document&&_5!==ed.editNode){
_6=this._getTagName(_5);
if(_6==="li"){
return this.editor._indentoutdent_queryCommandEnabled(_2);
}else{
if(this._isIndentableElement(_6)){
var _9=_5.style?_5.style[_8]:"";
if(_9){
_9=this._convertIndent(_9);
if(_9/this.indentBy>=1){
return true;
}
}
return false;
}
}
_5=_5.parentNode;
}
if(this._isRootInline(_4.startContainer)){
return false;
}
}
}else{
return this.editor._indentoutdent_queryCommandEnabled(_2);
}
}
return false;
},_indentImpl:function(_a){
var ed=this.editor;
var _b=dijit.range.getSelection(ed.window);
if(_b&&_b.rangeCount>0){
var _c=_b.getRangeAt(0);
var _d=_c.startContainer;
var _e,_f,end,div;
if(_c.startContainer===_c.endContainer){
if(this._isRootInline(_c.startContainer)){
_f=_c.startContainer;
while(_f&&_f.parentNode!==ed.editNode){
_f=_f.parentNode;
}
while(_f&&_f.previousSibling&&(this._isTextElement(_f)||(_f.nodeType===1&&this._isInlineFormat(this._getTagName(_f))))){
_f=_f.previousSibling;
}
if(_f&&_f.nodeType===1&&!this._isInlineFormat(this._getTagName(_f))){
_f=_f.nextSibling;
}
if(_f){
div=ed.document.createElement("div");
dojo.place(div,_f,"after");
div.appendChild(_f);
end=div.nextSibling;
while(end&&(this._isTextElement(end)||(end.nodeType===1&&this._isInlineFormat(this._getTagName(end))))){
div.appendChild(end);
end=div.nextSibling;
}
this._indentElement(div);
dojo.withGlobal(ed.window,"selectElementChildren",dijit._editor.selection,[div]);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}
}else{
while(_d&&_d!==ed.document&&_d!==ed.editNode){
_e=this._getTagName(_d);
if(_e==="li"){
this._indentList(_d);
return;
}else{
if(this._isIndentableElement(_e)){
this._indentElement(_d);
return;
}
}
_d=_d.parentNode;
}
}
}else{
var _10;
_f=_c.startContainer;
end=_c.endContainer;
while(_f&&this._isTextElement(_f)&&_f.parentNode!==ed.editNode){
_f=_f.parentNode;
}
while(end&&this._isTextElement(end)&&end.parentNode!==ed.editNode){
end=end.parentNode;
}
if(end===ed.editNode||end===ed.document.body){
_10=_f;
while(_10.nextSibling&&dojo.withGlobal(ed.window,"inSelection",dijit._editor.selection,[_10])){
_10=_10.nextSibling;
}
end=_10;
if(end===ed.editNode||end===ed.document.body){
_e=this._getTagName(_f);
if(_e==="li"){
this._indentList(_f);
}else{
if(this._isIndentableElement(_e)){
this._indentElement(_f);
}else{
if(this._isTextElement(_f)||this._isInlineFormat(_e)){
div=ed.document.createElement("div");
dojo.place(div,_f,"after");
var _11=_f;
while(_11&&(this._isTextElement(_11)||(_11.nodeType===1&&this._isInlineFormat(this._getTagName(_11))))){
div.appendChild(_11);
_11=div.nextSibling;
}
this._indentElement(div);
}
}
}
return;
}
}
end=end.nextSibling;
_10=_f;
while(_10&&_10!==end){
if(_10.nodeType===1){
_e=this._getTagName(_10);
if(dojo.isIE){
if(_e==="p"&&this._isEmpty(_10)){
_10=_10.nextSibling;
continue;
}
}
if(_e==="li"){
if(div){
if(this._isEmpty(div)){
div.parentNode.removeChild(div);
}else{
this._indentElement(div);
}
div=null;
}
this._indentList(_10);
}else{
if(!this._isInlineFormat(_e)&&this._isIndentableElement(_e)){
if(div){
if(this._isEmpty(div)){
div.parentNode.removeChild(div);
}else{
this._indentElement(div);
}
div=null;
}
_10=this._indentElement(_10);
}else{
if(this._isInlineFormat(_e)){
if(!div){
div=ed.document.createElement("div");
dojo.place(div,_10,"after");
div.appendChild(_10);
_10=div;
}else{
div.appendChild(_10);
_10=div;
}
}
}
}
}else{
if(this._isTextElement(_10)){
if(!div){
div=ed.document.createElement("div");
dojo.place(div,_10,"after");
div.appendChild(_10);
_10=div;
}else{
div.appendChild(_10);
_10=div;
}
}
}
_10=_10.nextSibling;
}
if(div){
if(this._isEmpty(div)){
div.parentNode.removeChild(div);
}else{
this._indentElement(div);
}
div=null;
}
}
}
},_indentElement:function(_12){
var _13="marginLeft";
if(!this._isLtr()){
_13="marginRight";
}
var tag=this._getTagName(_12);
if(tag==="ul"||tag==="ol"){
var div=this.editor.document.createElement("div");
dojo.place(div,_12,"after");
div.appendChild(_12);
_12=div;
}
var _14=_12.style?_12.style[_13]:"";
if(_14){
_14=this._convertIndent(_14);
_14=(parseInt(_14,10)+this.indentBy)+this.indentUnits;
}else{
_14=this.indentBy+this.indentUnits;
}
dojo.style(_12,_13,_14);
return _12;
},_outdentElement:function(_15){
var _16="marginLeft";
if(!this._isLtr()){
_16="marginRight";
}
var _17=_15.style?_15.style[_16]:"";
if(_17){
_17=this._convertIndent(_17);
if(_17-this.indentBy>0){
_17=(parseInt(_17,10)-this.indentBy)+this.indentUnits;
}else{
_17="";
}
dojo.style(_15,_16,_17);
}
},_outdentImpl:function(_18){
var ed=this.editor;
var sel=dijit.range.getSelection(ed.window);
if(sel&&sel.rangeCount>0){
var _19=sel.getRangeAt(0);
var _1a=_19.startContainer;
var tag;
if(_19.startContainer===_19.endContainer){
while(_1a&&_1a!==ed.document&&_1a!==ed.editNode){
tag=this._getTagName(_1a);
if(tag==="li"){
return this._outdentList(_1a);
}else{
if(this._isIndentableElement(tag)){
return this._outdentElement(_1a);
}
}
_1a=_1a.parentNode;
}
ed.document.execCommand("outdent",false,_18);
}else{
var _1b=_19.startContainer;
var end=_19.endContainer;
while(_1b&&_1b.nodeType===3){
_1b=_1b.parentNode;
}
while(end&&end.nodeType===3){
end=end.parentNode;
}
end=end.nextSibling;
var _1c=_1b;
while(_1c&&_1c!==end){
if(_1c.nodeType===1){
tag=this._getTagName(_1c);
if(tag==="li"){
this._outdentList(_1c);
}else{
if(this._isIndentableElement(tag)){
this._outdentElement(_1c);
}
}
}
_1c=_1c.nextSibling;
}
}
}
return null;
},_indentList:function(_1d){
var ed=this.editor;
var _1e,li;
var _1f=_1d.parentNode;
var _20=_1d.previousSibling;
while(_20&&_20.nodeType!==1){
_20=_20.previousSibling;
}
var _21=null;
var tg=this._getTagName(_1f);
if(tg==="ol"){
_21="ol";
}else{
if(tg==="ul"){
_21="ul";
}
}
if(_21){
if(_20&&_20.tagName.toLowerCase()=="li"){
var _22;
if(_20.childNodes){
var i;
for(i=0;i<_20.childNodes.length;i++){
var n=_20.childNodes[i];
if(n.nodeType===3){
if(dojo.trim(n.nodeValue)){
if(_22){
break;
}
}
}else{
if(n.nodeType===1&&!_22){
if(_21===n.tagName.toLowerCase()){
_22=n;
}
}else{
break;
}
}
}
}
if(_22){
_22.appendChild(_1d);
}else{
_1e=ed.document.createElement(_21);
dojo.style(_1e,{paddingTop:"0px",paddingBottom:"0px"});
li=ed.document.createElement("li");
dojo.style(li,{listStyleImage:"none",listStyleType:"none"});
_20.appendChild(_1e);
_1e.appendChild(_1d);
}
dojo.withGlobal(ed.window,"selectElementChildren",dijit._editor.selection,[_1d]);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}
}
},_outdentList:function(_23){
var ed=this.editor;
var _24=_23.parentNode;
var _25=null;
var tg=_24.tagName?_24.tagName.toLowerCase():"";
var li;
if(tg==="ol"){
_25="ol";
}else{
if(tg==="ul"){
_25="ul";
}
}
var _26=_24.parentNode;
var _27=this._getTagName(_26);
if(_27==="li"||_27==="ol"||_27==="ul"){
if(_27==="ol"||_27==="ul"){
var _28=_24.previousSibling;
while(_28&&(_28.nodeType!==1||(_28.nodeType===1&&this._getTagName(_28)!=="li"))){
_28=_28.previousSibling;
}
if(_28){
_28.appendChild(_24);
_26=_28;
}else{
li=_23;
var _29=_23;
while(li.previousSibling){
li=li.previousSibling;
if(li.nodeType===1&&this._getTagName(li)==="li"){
_29=li;
}
}
if(_29!==_23){
dojo.place(_29,_24,"before");
_29.appendChild(_24);
_26=_29;
}else{
li=ed.document.createElement("li");
dojo.place(li,_24,"before");
li.appendChild(_24);
_26=li;
}
dojo.style(_24,{paddingTop:"0px",paddingBottom:"0px"});
}
}
var _2a=_23.previousSibling;
while(_2a&&_2a.nodeType!==1){
_2a=_2a.previousSibling;
}
var _2b=_23.nextSibling;
while(_2b&&_2b.nodeType!==1){
_2b=_2b.nextSibling;
}
if(!_2a){
dojo.place(_23,_26,"after");
_23.appendChild(_24);
}else{
if(!_2b){
dojo.place(_23,_26,"after");
}else{
var _2c=ed.document.createElement(_25);
dojo.style(_2c,{paddingTop:"0px",paddingBottom:"0px"});
_23.appendChild(_2c);
while(_23.nextSibling){
_2c.appendChild(_23.nextSibling);
}
dojo.place(_23,_26,"after");
}
}
if(_24&&this._isEmpty(_24)){
_24.parentNode.removeChild(_24);
}
if(_26&&this._isEmpty(_26)){
_26.parentNode.removeChild(_26);
}
dojo.withGlobal(ed.window,"selectElementChildren",dijit._editor.selection,[_23]);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}else{
ed.document.execCommand("outdent",false,null);
}
},_isEmpty:function(_2d){
if(_2d.childNodes){
var _2e=true;
var i;
for(i=0;i<_2d.childNodes.length;i++){
var n=_2d.childNodes[i];
if(n.nodeType===1){
if(this._getTagName(n)==="p"){
if(!dojo.trim(n.innerHTML)){
continue;
}
}
_2e=false;
break;
}else{
if(this._isTextElement(n)){
var nv=dojo.trim(n.nodeValue);
if(nv&&nv!=="&nbsp;"&&nv!==" "){
_2e=false;
break;
}
}else{
_2e=false;
break;
}
}
}
return _2e;
}else{
return true;
}
},_isIndentableElement:function(tag){
switch(tag){
case "p":
case "div":
case "h1":
case "h2":
case "h3":
case "center":
case "table":
case "ul":
case "ol":
return true;
default:
return false;
}
},_convertIndent:function(_2f){
var _30=12;
_2f=_2f+"";
_2f=_2f.toLowerCase();
var _31=(_2f.indexOf("px")>0)?"px":(_2f.indexOf("em")>0)?"em":"px";
_2f=_2f.replace(/(px;?|em;?)/gi,"");
if(_31==="px"){
if(this.indentUnits==="em"){
_2f=Math.ceil(_2f/_30);
}
}else{
if(this.indentUnits==="px"){
_2f=_2f*_30;
}
}
return _2f;
},_isLtr:function(){
var _32=this.editor.document.body;
return dojo.withGlobal(this.editor.window,function(){
var cs=dojo.getComputedStyle(_32);
return cs?cs.direction=="ltr":true;
});
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
},_getTagName:function(_33){
var tag="";
if(_33&&_33.nodeType===1){
tag=_33.tagName?_33.tagName.toLowerCase():"";
}
return tag;
},_isRootInline:function(_34){
var ed=this.editor;
if(this._isTextElement(_34)&&_34.parentNode===ed.editNode){
return true;
}else{
if(_34.nodeType===1&&this._isInlineFormat(_34)&&_34.parentNode===ed.editNode){
return true;
}else{
if(this._isTextElement(_34)&&this._isInlineFormat(this._getTagName(_34.parentNode))){
_34=_34.parentNode;
while(_34&&_34!==ed.editNode&&this._isInlineFormat(this._getTagName(_34))){
_34=_34.parentNode;
}
if(_34===ed.editNode){
return true;
}
}
}
}
return false;
},_isTextElement:function(_35){
if(_35&&_35.nodeType===3||_35.nodeType===4){
return true;
}
return false;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _36=o.args.name.toLowerCase();
if(_36==="normalizeindentoutdent"){
o.plugin=new dojox.editor.plugins.NormalizeIndentOutdent({indentBy:("indentBy" in o.args)?(o.args.indentBy>0?o.args.indentBy:40):40,indentUnits:("indentUnits" in o.args)?(o.args.indentUnits.toLowerCase()=="em"?"em":"px"):"px"});
}
});
}
