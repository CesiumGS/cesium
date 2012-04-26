/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.range"]){
dojo._hasResource["dijit._editor.range"]=true;
dojo.provide("dijit._editor.range");
dijit.range={};
dijit.range.getIndex=function(_1,_2){
var _3=[],_4=[];
var _5=_2;
var _6=_1;
var _7,n;
while(_1!=_5){
var i=0;
_7=_1.parentNode;
while((n=_7.childNodes[i++])){
if(n===_1){
--i;
break;
}
}
_3.unshift(i);
_4.unshift(i-_7.childNodes.length);
_1=_7;
}
if(_3.length>0&&_6.nodeType==3){
n=_6.previousSibling;
while(n&&n.nodeType==3){
_3[_3.length-1]--;
n=n.previousSibling;
}
n=_6.nextSibling;
while(n&&n.nodeType==3){
_4[_4.length-1]++;
n=n.nextSibling;
}
}
return {o:_3,r:_4};
};
dijit.range.getNode=function(_8,_9){
if(!dojo.isArray(_8)||_8.length==0){
return _9;
}
var _a=_9;
dojo.every(_8,function(i){
if(i>=0&&i<_a.childNodes.length){
_a=_a.childNodes[i];
}else{
_a=null;
return false;
}
return true;
});
return _a;
};
dijit.range.getCommonAncestor=function(n1,n2,_b){
_b=_b||n1.ownerDocument.body;
var _c=function(n){
var as=[];
while(n){
as.unshift(n);
if(n!==_b){
n=n.parentNode;
}else{
break;
}
}
return as;
};
var _d=_c(n1);
var _e=_c(n2);
var m=Math.min(_d.length,_e.length);
var _f=_d[0];
for(var i=1;i<m;i++){
if(_d[i]===_e[i]){
_f=_d[i];
}else{
break;
}
}
return _f;
};
dijit.range.getAncestor=function(_10,_11,_12){
_12=_12||_10.ownerDocument.body;
while(_10&&_10!==_12){
var _13=_10.nodeName.toUpperCase();
if(_11.test(_13)){
return _10;
}
_10=_10.parentNode;
}
return null;
};
dijit.range.BlockTagNames=/^(?:P|DIV|H1|H2|H3|H4|H5|H6|ADDRESS|PRE|OL|UL|LI|DT|DE)$/;
dijit.range.getBlockAncestor=function(_14,_15,_16){
_16=_16||_14.ownerDocument.body;
_15=_15||dijit.range.BlockTagNames;
var _17=null,_18;
while(_14&&_14!==_16){
var _19=_14.nodeName.toUpperCase();
if(!_17&&_15.test(_19)){
_17=_14;
}
if(!_18&&(/^(?:BODY|TD|TH|CAPTION)$/).test(_19)){
_18=_14;
}
_14=_14.parentNode;
}
return {blockNode:_17,blockContainer:_18||_14.ownerDocument.body};
};
dijit.range.atBeginningOfContainer=function(_1a,_1b,_1c){
var _1d=false;
var _1e=(_1c==0);
if(!_1e&&_1b.nodeType==3){
if(/^[\s\xA0]+$/.test(_1b.nodeValue.substr(0,_1c))){
_1e=true;
}
}
if(_1e){
var _1f=_1b;
_1d=true;
while(_1f&&_1f!==_1a){
if(_1f.previousSibling){
_1d=false;
break;
}
_1f=_1f.parentNode;
}
}
return _1d;
};
dijit.range.atEndOfContainer=function(_20,_21,_22){
var _23=false;
var _24=(_22==(_21.length||_21.childNodes.length));
if(!_24&&_21.nodeType==3){
if(/^[\s\xA0]+$/.test(_21.nodeValue.substr(_22))){
_24=true;
}
}
if(_24){
var _25=_21;
_23=true;
while(_25&&_25!==_20){
if(_25.nextSibling){
_23=false;
break;
}
_25=_25.parentNode;
}
}
return _23;
};
dijit.range.adjacentNoneTextNode=function(_26,_27){
var _28=_26;
var len=(0-_26.length)||0;
var _29=_27?"nextSibling":"previousSibling";
while(_28){
if(_28.nodeType!=3){
break;
}
len+=_28.length;
_28=_28[_29];
}
return [_28,len];
};
dijit.range._w3c=Boolean(window["getSelection"]);
dijit.range.create=function(win){
if(dijit.range._w3c){
return (win||dojo.global).document.createRange();
}else{
return new dijit.range.W3CRange;
}
};
dijit.range.getSelection=function(win,_2a){
if(dijit.range._w3c){
return win.getSelection();
}else{
var s=new dijit.range.ie.selection(win);
if(!_2a){
s._getCurrentSelection();
}
return s;
}
};
if(!dijit.range._w3c){
dijit.range.ie={cachedSelection:{},selection:function(win){
this._ranges=[];
this.addRange=function(r,_2b){
this._ranges.push(r);
if(!_2b){
r._select();
}
this.rangeCount=this._ranges.length;
};
this.removeAllRanges=function(){
this._ranges=[];
this.rangeCount=0;
};
var _2c=function(){
var r=win.document.selection.createRange();
var _2d=win.document.selection.type.toUpperCase();
if(_2d=="CONTROL"){
return new dijit.range.W3CRange(dijit.range.ie.decomposeControlRange(r));
}else{
return new dijit.range.W3CRange(dijit.range.ie.decomposeTextRange(r));
}
};
this.getRangeAt=function(i){
return this._ranges[i];
};
this._getCurrentSelection=function(){
this.removeAllRanges();
var r=_2c();
if(r){
this.addRange(r,true);
}
};
},decomposeControlRange:function(_2e){
var _2f=_2e.item(0),_30=_2e.item(_2e.length-1);
var _31=_2f.parentNode,_32=_30.parentNode;
var _33=dijit.range.getIndex(_2f,_31).o;
var _34=dijit.range.getIndex(_30,_32).o+1;
return [_31,_33,_32,_34];
},getEndPoint:function(_35,end){
var _36=_35.duplicate();
_36.collapse(!end);
var _37="EndTo"+(end?"End":"Start");
var _38=_36.parentElement();
var _39,_3a,_3b;
if(_38.childNodes.length>0){
dojo.every(_38.childNodes,function(_3c,i){
var _3d;
if(_3c.nodeType!=3){
_36.moveToElementText(_3c);
if(_36.compareEndPoints(_37,_35)>0){
if(_3b&&_3b.nodeType==3){
_39=_3b;
_3d=true;
}else{
_39=_38;
_3a=i;
return false;
}
}else{
if(i==_38.childNodes.length-1){
_39=_38;
_3a=_38.childNodes.length;
return false;
}
}
}else{
if(i==_38.childNodes.length-1){
_39=_3c;
_3d=true;
}
}
if(_3d&&_39){
var _3e=dijit.range.adjacentNoneTextNode(_39)[0];
if(_3e){
_39=_3e.nextSibling;
}else{
_39=_38.firstChild;
}
var _3f=dijit.range.adjacentNoneTextNode(_39);
_3e=_3f[0];
var _40=_3f[1];
if(_3e){
_36.moveToElementText(_3e);
_36.collapse(false);
}else{
_36.moveToElementText(_38);
}
_36.setEndPoint(_37,_35);
_3a=_36.text.length-_40;
return false;
}
_3b=_3c;
return true;
});
}else{
_39=_38;
_3a=0;
}
if(!end&&_39.nodeType==1&&_3a==_39.childNodes.length){
var _41=_39.nextSibling;
if(_41&&_41.nodeType==3){
_39=_41;
_3a=0;
}
}
return [_39,_3a];
},setEndPoint:function(_42,_43,_44){
var _45=_42.duplicate(),_46,len;
if(_43.nodeType!=3){
if(_44>0){
_46=_43.childNodes[_44-1];
if(_46){
if(_46.nodeType==3){
_43=_46;
_44=_46.length;
}else{
if(_46.nextSibling&&_46.nextSibling.nodeType==3){
_43=_46.nextSibling;
_44=0;
}else{
_45.moveToElementText(_46.nextSibling?_46:_43);
var _47=_46.parentNode;
var _48=_47.insertBefore(_46.ownerDocument.createTextNode(" "),_46.nextSibling);
_45.collapse(false);
_47.removeChild(_48);
}
}
}
}else{
_45.moveToElementText(_43);
_45.collapse(true);
}
}
if(_43.nodeType==3){
var _49=dijit.range.adjacentNoneTextNode(_43);
var _4a=_49[0];
len=_49[1];
if(_4a){
_45.moveToElementText(_4a);
_45.collapse(false);
if(_4a.contentEditable!="inherit"){
len++;
}
}else{
_45.moveToElementText(_43.parentNode);
_45.collapse(true);
}
_44+=len;
if(_44>0){
if(_45.move("character",_44)!=_44){
console.error("Error when moving!");
}
}
}
return _45;
},decomposeTextRange:function(_4b){
var _4c=dijit.range.ie.getEndPoint(_4b);
var _4d=_4c[0],_4e=_4c[1];
var _4f=_4c[0],_50=_4c[1];
if(_4b.htmlText.length){
if(_4b.htmlText==_4b.text){
_50=_4e+_4b.text.length;
}else{
_4c=dijit.range.ie.getEndPoint(_4b,true);
_4f=_4c[0],_50=_4c[1];
}
}
return [_4d,_4e,_4f,_50];
},setRange:function(_51,_52,_53,_54,_55,_56){
var _57=dijit.range.ie.setEndPoint(_51,_52,_53);
_51.setEndPoint("StartToStart",_57);
if(!_56){
var end=dijit.range.ie.setEndPoint(_51,_54,_55);
}
_51.setEndPoint("EndToEnd",end||_57);
return _51;
}};
dojo.declare("dijit.range.W3CRange",null,{constructor:function(){
if(arguments.length>0){
this.setStart(arguments[0][0],arguments[0][1]);
this.setEnd(arguments[0][2],arguments[0][3]);
}else{
this.commonAncestorContainer=null;
this.startContainer=null;
this.startOffset=0;
this.endContainer=null;
this.endOffset=0;
this.collapsed=true;
}
},_updateInternal:function(){
if(this.startContainer!==this.endContainer){
this.commonAncestorContainer=dijit.range.getCommonAncestor(this.startContainer,this.endContainer);
}else{
this.commonAncestorContainer=this.startContainer;
}
this.collapsed=(this.startContainer===this.endContainer)&&(this.startOffset==this.endOffset);
},setStart:function(_58,_59){
_59=parseInt(_59);
if(this.startContainer===_58&&this.startOffset==_59){
return;
}
delete this._cachedBookmark;
this.startContainer=_58;
this.startOffset=_59;
if(!this.endContainer){
this.setEnd(_58,_59);
}else{
this._updateInternal();
}
},setEnd:function(_5a,_5b){
_5b=parseInt(_5b);
if(this.endContainer===_5a&&this.endOffset==_5b){
return;
}
delete this._cachedBookmark;
this.endContainer=_5a;
this.endOffset=_5b;
if(!this.startContainer){
this.setStart(_5a,_5b);
}else{
this._updateInternal();
}
},setStartAfter:function(_5c,_5d){
this._setPoint("setStart",_5c,_5d,1);
},setStartBefore:function(_5e,_5f){
this._setPoint("setStart",_5e,_5f,0);
},setEndAfter:function(_60,_61){
this._setPoint("setEnd",_60,_61,1);
},setEndBefore:function(_62,_63){
this._setPoint("setEnd",_62,_63,0);
},_setPoint:function(_64,_65,_66,ext){
var _67=dijit.range.getIndex(_65,_65.parentNode).o;
this[_64](_65.parentNode,_67.pop()+ext);
},_getIERange:function(){
var r=(this._body||this.endContainer.ownerDocument.body).createTextRange();
dijit.range.ie.setRange(r,this.startContainer,this.startOffset,this.endContainer,this.endOffset,this.collapsed);
return r;
},getBookmark:function(_68){
this._getIERange();
return this._cachedBookmark;
},_select:function(){
var r=this._getIERange();
r.select();
},deleteContents:function(){
var r=this._getIERange();
r.pasteHTML("");
this.endContainer=this.startContainer;
this.endOffset=this.startOffset;
this.collapsed=true;
},cloneRange:function(){
var r=new dijit.range.W3CRange([this.startContainer,this.startOffset,this.endContainer,this.endOffset]);
r._body=this._body;
return r;
},detach:function(){
this._body=null;
this.commonAncestorContainer=null;
this.startContainer=null;
this.startOffset=0;
this.endContainer=null;
this.endOffset=0;
this.collapsed=true;
}});
}
}
