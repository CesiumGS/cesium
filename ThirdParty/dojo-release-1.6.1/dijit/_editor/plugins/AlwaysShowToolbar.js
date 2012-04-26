/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.AlwaysShowToolbar"]){
dojo._hasResource["dijit._editor.plugins.AlwaysShowToolbar"]=true;
dojo.provide("dijit._editor.plugins.AlwaysShowToolbar");
dojo.require("dijit._editor._Plugin");
dojo.declare("dijit._editor.plugins.AlwaysShowToolbar",dijit._editor._Plugin,{_handleScroll:true,setEditor:function(e){
if(!e.iframe){
return;
}
this.editor=e;
e.onLoadDeferred.addCallback(dojo.hitch(this,this.enable));
},enable:function(d){
this._updateHeight();
this.connect(window,"onscroll","globalOnScrollHandler");
this.connect(this.editor,"onNormalizedDisplayChanged","_updateHeight");
return d;
},_updateHeight:function(){
var e=this.editor;
if(!e.isLoaded){
return;
}
if(e.height){
return;
}
var _1=dojo._getMarginSize(e.editNode).h;
if(dojo.isOpera){
_1=e.editNode.scrollHeight;
}
if(!_1){
_1=dojo._getMarginSize(e.document.body).h;
}
if(_1==0){
return;
}
if(dojo.isIE<=7&&this.editor.minHeight){
var _2=parseInt(this.editor.minHeight);
if(_1<_2){
_1=_2;
}
}
if(_1!=this._lastHeight){
this._lastHeight=_1;
dojo.marginBox(e.iframe,{h:this._lastHeight});
}
},_lastHeight:0,globalOnScrollHandler:function(){
var _3=dojo.isIE<7;
if(!this._handleScroll){
return;
}
var _4=this.editor.header;
var db=dojo.body;
if(!this._scrollSetUp){
this._scrollSetUp=true;
this._scrollThreshold=dojo.position(_4,true).y;
}
var _5=dojo._docScroll().y;
var s=_4.style;
if(_5>this._scrollThreshold&&_5<this._scrollThreshold+this._lastHeight){
if(!this._fixEnabled){
var _6=dojo._getMarginSize(_4);
this.editor.iframe.style.marginTop=_6.h+"px";
if(_3){
s.left=dojo.position(_4).x;
if(_4.previousSibling){
this._IEOriginalPos=["after",_4.previousSibling];
}else{
if(_4.nextSibling){
this._IEOriginalPos=["before",_4.nextSibling];
}else{
this._IEOriginalPos=["last",_4.parentNode];
}
}
dojo.body().appendChild(_4);
dojo.addClass(_4,"dijitIEFixedToolbar");
}else{
s.position="fixed";
s.top="0px";
}
dojo.marginBox(_4,{w:_6.w});
s.zIndex=2000;
this._fixEnabled=true;
}
var _7=(this.height)?parseInt(this.editor.height):this.editor._lastHeight;
s.display=(_5>this._scrollThreshold+_7)?"none":"";
}else{
if(this._fixEnabled){
this.editor.iframe.style.marginTop="";
s.position="";
s.top="";
s.zIndex="";
s.display="";
if(_3){
s.left="";
dojo.removeClass(_4,"dijitIEFixedToolbar");
if(this._IEOriginalPos){
dojo.place(_4,this._IEOriginalPos[1],this._IEOriginalPos[0]);
this._IEOriginalPos=null;
}else{
dojo.place(_4,this.editor.iframe,"before");
}
}
s.width="";
this._fixEnabled=false;
}
}
},destroy:function(){
this._IEOriginalPos=null;
this._handleScroll=false;
dojo.forEach(this._connects,dojo.disconnect);
if(dojo.isIE<7){
dojo.removeClass(this.editor.header,"dijitIEFixedToolbar");
}
}});
}
