/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.TitlePane"]){
dojo._hasResource["dijit.TitlePane"]=true;
dojo.provide("dijit.TitlePane");
dojo.require("dojo.fx");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._CssStateMixin");
dojo.declare("dijit.TitlePane",[dijit.layout.ContentPane,dijit._Templated,dijit._CssStateMixin],{title:"",open:true,toggleable:true,tabIndex:"0",duration:dijit.defaultDuration,baseClass:"dijitTitlePane",templateString:dojo.cache("dijit","templates/TitlePane.html","<div>\n\t<div dojoAttachEvent=\"onclick:_onTitleClick, onkeypress:_onTitleKey\"\n\t\t\tclass=\"dijitTitlePaneTitle\" dojoAttachPoint=\"titleBarNode\">\n\t\t<div class=\"dijitTitlePaneTitleFocus\" dojoAttachPoint=\"focusNode\">\n\t\t\t<img src=\"${_blankGif}\" alt=\"\" dojoAttachPoint=\"arrowNode\" class=\"dijitArrowNode\" role=\"presentation\"\n\t\t\t/><span dojoAttachPoint=\"arrowNodeInner\" class=\"dijitArrowNodeInner\"></span\n\t\t\t><span dojoAttachPoint=\"titleNode\" class=\"dijitTitlePaneTextNode\"></span>\n\t\t</div>\n\t</div>\n\t<div class=\"dijitTitlePaneContentOuter\" dojoAttachPoint=\"hideNode\" role=\"presentation\">\n\t\t<div class=\"dijitReset\" dojoAttachPoint=\"wipeNode\" role=\"presentation\">\n\t\t\t<div class=\"dijitTitlePaneContentInner\" dojoAttachPoint=\"containerNode\" role=\"region\" id=\"${id}_pane\">\n\t\t\t\t<!-- nested divs because wipeIn()/wipeOut() doesn't work right on node w/padding etc.  Put padding on inner div. -->\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n"),attributeMap:dojo.delegate(dijit.layout.ContentPane.prototype.attributeMap,{title:{node:"titleNode",type:"innerHTML"},tooltip:{node:"focusNode",type:"attribute",attribute:"title"},id:""}),buildRendering:function(){
this.inherited(arguments);
dojo.setSelectable(this.titleNode,false);
},postCreate:function(){
this.inherited(arguments);
if(this.toggleable){
this._trackMouseState(this.titleBarNode,"dijitTitlePaneTitle");
}
var _1=this.hideNode,_2=this.wipeNode;
this._wipeIn=dojo.fx.wipeIn({node:this.wipeNode,duration:this.duration,beforeBegin:function(){
_1.style.display="";
}});
this._wipeOut=dojo.fx.wipeOut({node:this.wipeNode,duration:this.duration,onEnd:function(){
_1.style.display="none";
}});
},_setOpenAttr:function(_3,_4){
dojo.forEach([this._wipeIn,this._wipeOut],function(_5){
if(_5&&_5.status()=="playing"){
_5.stop();
}
});
if(_4){
var _6=this[_3?"_wipeIn":"_wipeOut"];
_6.play();
}else{
this.hideNode.style.display=this.wipeNode.style.display=_3?"":"none";
}
if(this._started){
if(_3){
this._onShow();
}else{
this.onHide();
}
}
this.arrowNodeInner.innerHTML=_3?"-":"+";
dijit.setWaiState(this.containerNode,"hidden",_3?"false":"true");
dijit.setWaiState(this.focusNode,"pressed",_3?"true":"false");
this._set("open",_3);
this._setCss();
},_setToggleableAttr:function(_7){
dijit.setWaiRole(this.focusNode,_7?"button":"heading");
if(_7){
dijit.setWaiState(this.focusNode,"controls",this.id+"_pane");
dojo.attr(this.focusNode,"tabIndex",this.tabIndex);
}else{
dojo.removeAttr(this.focusNode,"tabIndex");
}
this._set("toggleable",_7);
this._setCss();
},_setContentAttr:function(_8){
if(!this.open||!this._wipeOut||this._wipeOut.status()=="playing"){
this.inherited(arguments);
}else{
if(this._wipeIn&&this._wipeIn.status()=="playing"){
this._wipeIn.stop();
}
dojo.marginBox(this.wipeNode,{h:dojo.marginBox(this.wipeNode).h});
this.inherited(arguments);
if(this._wipeIn){
this._wipeIn.play();
}else{
this.hideNode.style.display="";
}
}
},toggle:function(){
this._setOpenAttr(!this.open,true);
},_setCss:function(){
var _9=this.titleBarNode||this.focusNode;
var _a=this._titleBarClass;
this._titleBarClass="dijit"+(this.toggleable?"":"Fixed")+(this.open?"Open":"Closed");
dojo.replaceClass(_9,this._titleBarClass,_a||"");
this.arrowNodeInner.innerHTML=this.open?"-":"+";
},_onTitleKey:function(e){
if(e.charOrCode==dojo.keys.ENTER||e.charOrCode==" "){
if(this.toggleable){
this.toggle();
}
dojo.stopEvent(e);
}else{
if(e.charOrCode==dojo.keys.DOWN_ARROW&&this.open){
this.containerNode.focus();
e.preventDefault();
}
}
},_onTitleClick:function(){
if(this.toggleable){
this.toggle();
}
},setTitle:function(_b){
dojo.deprecated("dijit.TitlePane.setTitle() is deprecated.  Use set('title', ...) instead.","","2.0");
this.set("title",_b);
}});
}
