//>>built
define("dijit/_editor/range",["dojo/_base/array","dojo/_base/declare","dojo/_base/lang"],function(_1,_2,_3){
var _4={getIndex:function(_5,_6){
var _7=[],_8=[];
var _9=_5;
var _a,n;
while(_5!=_6){
var i=0;
_a=_5.parentNode;
while((n=_a.childNodes[i++])){
if(n===_5){
--i;
break;
}
}
_7.unshift(i);
_8.unshift(i-_a.childNodes.length);
_5=_a;
}
if(_7.length>0&&_9.nodeType==3){
n=_9.previousSibling;
while(n&&n.nodeType==3){
_7[_7.length-1]--;
n=n.previousSibling;
}
n=_9.nextSibling;
while(n&&n.nodeType==3){
_8[_8.length-1]++;
n=n.nextSibling;
}
}
return {o:_7,r:_8};
},getNode:function(_b,_c){
if(!_3.isArray(_b)||_b.length==0){
return _c;
}
var _d=_c;
_1.every(_b,function(i){
if(i>=0&&i<_d.childNodes.length){
_d=_d.childNodes[i];
}else{
_d=null;
return false;
}
return true;
});
return _d;
},getCommonAncestor:function(n1,n2,_e){
_e=_e||n1.ownerDocument.body;
var _f=function(n){
var as=[];
while(n){
as.unshift(n);
if(n!==_e){
n=n.parentNode;
}else{
break;
}
}
return as;
};
var _10=_f(n1);
var _11=_f(n2);
var m=Math.min(_10.length,_11.length);
var com=_10[0];
for(var i=1;i<m;i++){
if(_10[i]===_11[i]){
com=_10[i];
}else{
break;
}
}
return com;
},getAncestor:function(_12,_13,_14){
_14=_14||_12.ownerDocument.body;
while(_12&&_12!==_14){
var _15=_12.nodeName.toUpperCase();
if(_13.test(_15)){
return _12;
}
_12=_12.parentNode;
}
return null;
},BlockTagNames:/^(?:P|DIV|H1|H2|H3|H4|H5|H6|ADDRESS|PRE|OL|UL|LI|DT|DE)$/,getBlockAncestor:function(_16,_17,_18){
_18=_18||_16.ownerDocument.body;
_17=_17||_4.BlockTagNames;
var _19=null,_1a;
while(_16&&_16!==_18){
var _1b=_16.nodeName.toUpperCase();
if(!_19&&_17.test(_1b)){
_19=_16;
}
if(!_1a&&(/^(?:BODY|TD|TH|CAPTION)$/).test(_1b)){
_1a=_16;
}
_16=_16.parentNode;
}
return {blockNode:_19,blockContainer:_1a||_16.ownerDocument.body};
},atBeginningOfContainer:function(_1c,_1d,_1e){
var _1f=false;
var _20=(_1e==0);
if(!_20&&_1d.nodeType==3){
if(/^[\s\xA0]+$/.test(_1d.nodeValue.substr(0,_1e))){
_20=true;
}
}
if(_20){
var _21=_1d;
_1f=true;
while(_21&&_21!==_1c){
if(_21.previousSibling){
_1f=false;
break;
}
_21=_21.parentNode;
}
}
return _1f;
},atEndOfContainer:function(_22,_23,_24){
var _25=false;
var _26=(_24==(_23.length||_23.childNodes.length));
if(!_26&&_23.nodeType==3){
if(/^[\s\xA0]+$/.test(_23.nodeValue.substr(_24))){
_26=true;
}
}
if(_26){
var _27=_23;
_25=true;
while(_27&&_27!==_22){
if(_27.nextSibling){
_25=false;
break;
}
_27=_27.parentNode;
}
}
return _25;
},adjacentNoneTextNode:function(_28,_29){
var _2a=_28;
var len=(0-_28.length)||0;
var _2b=_29?"nextSibling":"previousSibling";
while(_2a){
if(_2a.nodeType!=3){
break;
}
len+=_2a.length;
_2a=_2a[_2b];
}
return [_2a,len];
},create:function(win){
win=win||window;
if(win.getSelection){
return win.document.createRange();
}else{
return new _2c();
}
},getSelection:function(_2d,_2e){
if(_2d.getSelection){
return _2d.getSelection();
}else{
var s=new ie.selection(_2d);
if(!_2e){
s._getCurrentSelection();
}
return s;
}
}};
if(!window.getSelection){
var ie=_4.ie={cachedSelection:{},selection:function(_2f){
this._ranges=[];
this.addRange=function(r,_30){
this._ranges.push(r);
if(!_30){
r._select();
}
this.rangeCount=this._ranges.length;
};
this.removeAllRanges=function(){
this._ranges=[];
this.rangeCount=0;
};
var _31=function(){
var r=_2f.document.selection.createRange();
var _32=_2f.document.selection.type.toUpperCase();
if(_32=="CONTROL"){
return new _2c(ie.decomposeControlRange(r));
}else{
return new _2c(ie.decomposeTextRange(r));
}
};
this.getRangeAt=function(i){
return this._ranges[i];
};
this._getCurrentSelection=function(){
this.removeAllRanges();
var r=_31();
if(r){
this.addRange(r,true);
this.isCollapsed=r.collapsed;
}else{
this.isCollapsed=true;
}
};
},decomposeControlRange:function(_33){
var _34=_33.item(0),_35=_33.item(_33.length-1);
var _36=_34.parentNode,_37=_35.parentNode;
var _38=_4.getIndex(_34,_36).o[0];
var _39=_4.getIndex(_35,_37).o[0]+1;
return [_36,_38,_37,_39];
},getEndPoint:function(_3a,end){
var _3b=_3a.duplicate();
_3b.collapse(!end);
var _3c="EndTo"+(end?"End":"Start");
var _3d=_3b.parentElement();
var _3e,_3f,_40;
if(_3d.childNodes.length>0){
_1.every(_3d.childNodes,function(_41,i){
var _42;
if(_41.nodeType!=3){
_3b.moveToElementText(_41);
if(_3b.compareEndPoints(_3c,_3a)>0){
if(_40&&_40.nodeType==3){
_3e=_40;
_42=true;
}else{
_3e=_3d;
_3f=i;
return false;
}
}else{
if(i==_3d.childNodes.length-1){
_3e=_3d;
_3f=_3d.childNodes.length;
return false;
}
}
}else{
if(i==_3d.childNodes.length-1){
_3e=_41;
_42=true;
}
}
if(_42&&_3e){
var _43=_4.adjacentNoneTextNode(_3e)[0];
if(_43){
_3e=_43.nextSibling;
}else{
_3e=_3d.firstChild;
}
var _44=_4.adjacentNoneTextNode(_3e);
_43=_44[0];
var _45=_44[1];
if(_43){
_3b.moveToElementText(_43);
_3b.collapse(false);
}else{
_3b.moveToElementText(_3d);
}
_3b.setEndPoint(_3c,_3a);
_3f=_3b.text.length-_45;
return false;
}
_40=_41;
return true;
});
}else{
_3e=_3d;
_3f=0;
}
if(!end&&_3e.nodeType==1&&_3f==_3e.childNodes.length){
var _46=_3e.nextSibling;
if(_46&&_46.nodeType==3){
_3e=_46;
_3f=0;
}
}
return [_3e,_3f];
},setEndPoint:function(_47,_48,_49){
var _4a=_47.duplicate(),_4b,len;
if(_48.nodeType!=3){
if(_49>0){
_4b=_48.childNodes[_49-1];
if(_4b){
if(_4b.nodeType==3){
_48=_4b;
_49=_4b.length;
}else{
if(_4b.nextSibling&&_4b.nextSibling.nodeType==3){
_48=_4b.nextSibling;
_49=0;
}else{
_4a.moveToElementText(_4b.nextSibling?_4b:_48);
var _4c=_4b.parentNode;
var _4d=_4c.insertBefore(_4b.ownerDocument.createTextNode(" "),_4b.nextSibling);
_4a.collapse(false);
_4c.removeChild(_4d);
}
}
}
}else{
_4a.moveToElementText(_48);
_4a.collapse(true);
}
}
if(_48.nodeType==3){
var _4e=_4.adjacentNoneTextNode(_48);
var _4f=_4e[0];
len=_4e[1];
if(_4f){
_4a.moveToElementText(_4f);
_4a.collapse(false);
if(_4f.contentEditable!="inherit"){
len++;
}
}else{
_4a.moveToElementText(_48.parentNode);
_4a.collapse(true);
_4a.move("character",1);
_4a.move("character",-1);
}
_49+=len;
if(_49>0){
if(_4a.move("character",_49)!=_49){
console.error("Error when moving!");
}
}
}
return _4a;
},decomposeTextRange:function(_50){
var _51=ie.getEndPoint(_50);
var _52=_51[0],_53=_51[1];
var _54=_51[0],_55=_51[1];
if(_50.htmlText.length){
if(_50.htmlText==_50.text){
_55=_53+_50.text.length;
}else{
_51=ie.getEndPoint(_50,true);
_54=_51[0],_55=_51[1];
}
}
return [_52,_53,_54,_55];
},setRange:function(_56,_57,_58,_59,_5a,_5b){
var _5c=ie.setEndPoint(_56,_57,_58);
_56.setEndPoint("StartToStart",_5c);
if(!_5b){
var end=ie.setEndPoint(_56,_59,_5a);
}
_56.setEndPoint("EndToEnd",end||_5c);
return _56;
}};
var _2c=_4.W3CRange=_2(null,{constructor:function(){
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
this.commonAncestorContainer=_4.getCommonAncestor(this.startContainer,this.endContainer);
}else{
this.commonAncestorContainer=this.startContainer;
}
this.collapsed=(this.startContainer===this.endContainer)&&(this.startOffset==this.endOffset);
},setStart:function(_5d,_5e){
_5e=parseInt(_5e);
if(this.startContainer===_5d&&this.startOffset==_5e){
return;
}
delete this._cachedBookmark;
this.startContainer=_5d;
this.startOffset=_5e;
if(!this.endContainer){
this.setEnd(_5d,_5e);
}else{
this._updateInternal();
}
},setEnd:function(_5f,_60){
_60=parseInt(_60);
if(this.endContainer===_5f&&this.endOffset==_60){
return;
}
delete this._cachedBookmark;
this.endContainer=_5f;
this.endOffset=_60;
if(!this.startContainer){
this.setStart(_5f,_60);
}else{
this._updateInternal();
}
},setStartAfter:function(_61,_62){
this._setPoint("setStart",_61,_62,1);
},setStartBefore:function(_63,_64){
this._setPoint("setStart",_63,_64,0);
},setEndAfter:function(_65,_66){
this._setPoint("setEnd",_65,_66,1);
},setEndBefore:function(_67,_68){
this._setPoint("setEnd",_67,_68,0);
},_setPoint:function(_69,_6a,_6b,ext){
var _6c=_4.getIndex(_6a,_6a.parentNode).o;
this[_69](_6a.parentNode,_6c.pop()+ext);
},_getIERange:function(){
var r=(this._body||this.endContainer.ownerDocument.body).createTextRange();
ie.setRange(r,this.startContainer,this.startOffset,this.endContainer,this.endOffset,this.collapsed);
return r;
},getBookmark:function(){
this._getIERange();
return this._cachedBookmark;
},_select:function(){
var r=this._getIERange();
r.select();
},deleteContents:function(){
var s=this.startContainer,r=this._getIERange();
if(s.nodeType===3&&!this.startOffset){
this.setStartBefore(s);
}
r.pasteHTML("");
this.endContainer=this.startContainer;
this.endOffset=this.startOffset;
this.collapsed=true;
},cloneRange:function(){
var r=new _2c([this.startContainer,this.startOffset,this.endContainer,this.endOffset]);
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
_3.setObject("dijit.range",_4);
return _4;
});
