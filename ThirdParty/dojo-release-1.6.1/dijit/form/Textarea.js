/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.Textarea"]){
dojo._hasResource["dijit.form.Textarea"]=true;
dojo.provide("dijit.form.Textarea");
dojo.require("dijit.form.SimpleTextarea");
dojo.declare("dijit.form.Textarea",dijit.form.SimpleTextarea,{baseClass:"dijitTextBox dijitTextArea dijitExpandingTextArea",cols:"",_previousNewlines:0,_strictMode:(dojo.doc.compatMode!="BackCompat"),_getHeight:function(_1){
var _2=_1.scrollHeight;
if(dojo.isIE){
_2+=_1.offsetHeight-_1.clientHeight-((dojo.isIE<8&&this._strictMode)?dojo._getPadBorderExtents(_1).h:0);
}else{
if(dojo.isMoz){
_2+=_1.offsetHeight-_1.clientHeight;
}else{
if(dojo.isWebKit){
_2+=dojo._getBorderExtents(_1).h;
}else{
_2+=dojo._getPadBorderExtents(_1).h;
}
}
}
return _2;
},_estimateHeight:function(_3){
_3.style.maxHeight="";
_3.style.height="auto";
_3.rows=(_3.value.match(/\n/g)||[]).length+1;
},_needsHelpShrinking:dojo.isMoz||dojo.isWebKit,_onInput:function(){
this.inherited(arguments);
if(this._busyResizing){
return;
}
this._busyResizing=true;
var _4=this.textbox;
if(_4.scrollHeight&&_4.offsetHeight&&_4.clientHeight){
var _5=this._getHeight(_4)+"px";
if(_4.style.height!=_5){
_4.style.maxHeight=_4.style.height=_5;
}
if(this._needsHelpShrinking){
if(this._setTimeoutHandle){
clearTimeout(this._setTimeoutHandle);
}
this._setTimeoutHandle=setTimeout(dojo.hitch(this,"_shrink"),0);
}
}else{
this._estimateHeight(_4);
}
this._busyResizing=false;
},_busyResizing:false,_shrink:function(){
this._setTimeoutHandle=null;
if(this._needsHelpShrinking&&!this._busyResizing){
this._busyResizing=true;
var _6=this.textbox;
var _7=false;
if(_6.value==""){
_6.value=" ";
_7=true;
}
var _8=_6.scrollHeight;
if(!_8){
this._estimateHeight(_6);
}else{
var _9=_6.style.paddingBottom;
var _a=dojo._getPadExtents(_6);
_a=_a.h-_a.t;
_6.style.paddingBottom=_a+1+"px";
var _b=this._getHeight(_6)-1+"px";
if(_6.style.maxHeight!=_b){
_6.style.paddingBottom=_a+_8+"px";
_6.scrollTop=0;
_6.style.maxHeight=this._getHeight(_6)-_8+"px";
}
_6.style.paddingBottom=_9;
}
if(_7){
_6.value="";
}
this._busyResizing=false;
}
},resize:function(){
this._onInput();
},_setValueAttr:function(){
this.inherited(arguments);
this.resize();
},buildRendering:function(){
this.inherited(arguments);
dojo.style(this.textbox,{overflowY:"hidden",overflowX:"auto",boxSizing:"border-box",MsBoxSizing:"border-box",WebkitBoxSizing:"border-box",MozBoxSizing:"border-box"});
},postCreate:function(){
this.inherited(arguments);
this.connect(this.textbox,"onscroll","_onInput");
this.connect(this.textbox,"onresize","_onInput");
this.connect(this.textbox,"onfocus","_onInput");
this._setTimeoutHandle=setTimeout(dojo.hitch(this,"resize"),0);
},uninitialize:function(){
if(this._setTimeoutHandle){
clearTimeout(this._setTimeoutHandle);
}
this.inherited(arguments);
}});
}
