/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.AccordionContainer"]){
dojo._hasResource["dijit.layout.AccordionContainer"]=true;
dojo.provide("dijit.layout.AccordionContainer");
dojo.require("dijit._Container");
dojo.require("dijit._Templated");
dojo.require("dijit._CssStateMixin");
dojo.require("dijit.layout.StackContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.AccordionPane");
dojo.declare("dijit.layout.AccordionContainer",dijit.layout.StackContainer,{duration:dijit.defaultDuration,buttonWidget:"dijit.layout._AccordionButton",baseClass:"dijitAccordionContainer",buildRendering:function(){
this.inherited(arguments);
this.domNode.style.overflow="hidden";
dijit.setWaiRole(this.domNode,"tablist");
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(this.selectedChildWidget){
var _1=this.selectedChildWidget.containerNode.style;
_1.display="";
_1.overflow="auto";
this.selectedChildWidget._wrapperWidget.set("selected",true);
}
},layout:function(){
var _2=this.selectedChildWidget;
if(!_2){
return;
}
var _3=_2._wrapperWidget.domNode,_4=dojo._getMarginExtents(_3),_5=dojo._getPadBorderExtents(_3),_6=_2._wrapperWidget.containerNode,_7=dojo._getMarginExtents(_6),_8=dojo._getPadBorderExtents(_6),_9=this._contentBox;
var _a=0;
dojo.forEach(this.getChildren(),function(_b){
if(_b!=_2){
_a+=dojo._getMarginSize(_b._wrapperWidget.domNode).h;
}
});
this._verticalSpace=_9.h-_a-_4.h-_5.h-_7.h-_8.h-_2._buttonWidget.getTitleHeight();
this._containerContentBox={h:this._verticalSpace,w:this._contentBox.w-_4.w-_5.w-_7.w-_8.w};
if(_2){
_2.resize(this._containerContentBox);
}
},_setupChild:function(_c){
_c._wrapperWidget=new dijit.layout._AccordionInnerContainer({contentWidget:_c,buttonWidget:this.buttonWidget,id:_c.id+"_wrapper",dir:_c.dir,lang:_c.lang,parent:this});
this.inherited(arguments);
},addChild:function(_d,_e){
if(this._started){
dojo.place(_d.domNode,this.containerNode,_e);
if(!_d._started){
_d.startup();
}
this._setupChild(_d);
dojo.publish(this.id+"-addChild",[_d,_e]);
this.layout();
if(!this.selectedChildWidget){
this.selectChild(_d);
}
}else{
this.inherited(arguments);
}
},removeChild:function(_f){
if(_f._wrapperWidget){
dojo.place(_f.domNode,_f._wrapperWidget.domNode,"after");
_f._wrapperWidget.destroy();
delete _f._wrapperWidget;
}
dojo.removeClass(_f.domNode,"dijitHidden");
this.inherited(arguments);
},getChildren:function(){
return dojo.map(this.inherited(arguments),function(_10){
return _10.declaredClass=="dijit.layout._AccordionInnerContainer"?_10.contentWidget:_10;
},this);
},destroy:function(){
if(this._animation){
this._animation.stop();
}
dojo.forEach(this.getChildren(),function(_11){
if(_11._wrapperWidget){
_11._wrapperWidget.destroy();
}else{
_11.destroyRecursive();
}
});
this.inherited(arguments);
},_showChild:function(_12){
_12._wrapperWidget.containerNode.style.display="block";
return this.inherited(arguments);
},_hideChild:function(_13){
_13._wrapperWidget.containerNode.style.display="none";
this.inherited(arguments);
},_transition:function(_14,_15,_16){
if(dojo.isIE<8){
_16=false;
}
if(this._animation){
this._animation.stop(true);
delete this._animation;
}
var _17=this;
if(_14){
_14._wrapperWidget.set("selected",true);
var d=this._showChild(_14);
if(this.doLayout&&_14.resize){
_14.resize(this._containerContentBox);
}
}
if(_15){
_15._wrapperWidget.set("selected",false);
if(!_16){
this._hideChild(_15);
}
}
if(_16){
var _18=_14._wrapperWidget.containerNode,_19=_15._wrapperWidget.containerNode;
var _1a=_14._wrapperWidget.containerNode,_1b=dojo._getMarginExtents(_1a),_1c=dojo._getPadBorderExtents(_1a),_1d=_1b.h+_1c.h;
_19.style.height=(_17._verticalSpace-_1d)+"px";
this._animation=new dojo.Animation({node:_18,duration:this.duration,curve:[1,this._verticalSpace-_1d-1],onAnimate:function(_1e){
_1e=Math.floor(_1e);
_18.style.height=_1e+"px";
_19.style.height=(_17._verticalSpace-_1d-_1e)+"px";
},onEnd:function(){
delete _17._animation;
_18.style.height="auto";
_15._wrapperWidget.containerNode.style.display="none";
_19.style.height="auto";
_17._hideChild(_15);
}});
this._animation.onStop=this._animation.onEnd;
this._animation.play();
}
return d;
},_onKeyPress:function(e,_1f){
if(this.disabled||e.altKey||!(_1f||e.ctrlKey)){
return;
}
var k=dojo.keys,c=e.charOrCode;
if((_1f&&(c==k.LEFT_ARROW||c==k.UP_ARROW))||(e.ctrlKey&&c==k.PAGE_UP)){
this._adjacent(false)._buttonWidget._onTitleClick();
dojo.stopEvent(e);
}else{
if((_1f&&(c==k.RIGHT_ARROW||c==k.DOWN_ARROW))||(e.ctrlKey&&(c==k.PAGE_DOWN||c==k.TAB))){
this._adjacent(true)._buttonWidget._onTitleClick();
dojo.stopEvent(e);
}
}
}});
dojo.declare("dijit.layout._AccordionInnerContainer",[dijit._Widget,dijit._CssStateMixin],{baseClass:"dijitAccordionInnerContainer",isContainer:true,isLayoutContainer:true,buildRendering:function(){
this.domNode=dojo.place("<div class='"+this.baseClass+"'>",this.contentWidget.domNode,"after");
var _20=this.contentWidget,cls=dojo.getObject(this.buttonWidget);
this.button=_20._buttonWidget=(new cls({contentWidget:_20,label:_20.title,title:_20.tooltip,dir:_20.dir,lang:_20.lang,iconClass:_20.iconClass,id:_20.id+"_button",parent:this.parent})).placeAt(this.domNode);
this.containerNode=dojo.place("<div class='dijitAccordionChildWrapper' style='display:none'>",this.domNode);
dojo.place(this.contentWidget.domNode,this.containerNode);
},postCreate:function(){
this.inherited(arguments);
var _21=this.button;
this._contentWidgetWatches=[this.contentWidget.watch("title",dojo.hitch(this,function(_22,_23,_24){
_21.set("label",_24);
})),this.contentWidget.watch("tooltip",dojo.hitch(this,function(_25,_26,_27){
_21.set("title",_27);
})),this.contentWidget.watch("iconClass",dojo.hitch(this,function(_28,_29,_2a){
_21.set("iconClass",_2a);
}))];
},_setSelectedAttr:function(_2b){
this._set("selected",_2b);
this.button.set("selected",_2b);
if(_2b){
var cw=this.contentWidget;
if(cw.onSelected){
cw.onSelected();
}
}
},startup:function(){
this.contentWidget.startup();
},destroy:function(){
this.button.destroyRecursive();
dojo.forEach(this._contentWidgetWatches||[],function(w){
w.unwatch();
});
delete this.contentWidget._buttonWidget;
delete this.contentWidget._wrapperWidget;
this.inherited(arguments);
},destroyDescendants:function(){
this.contentWidget.destroyRecursive();
}});
dojo.declare("dijit.layout._AccordionButton",[dijit._Widget,dijit._Templated,dijit._CssStateMixin],{templateString:dojo.cache("dijit.layout","templates/AccordionButton.html","<div dojoAttachEvent='onclick:_onTitleClick' class='dijitAccordionTitle'>\n\t<div dojoAttachPoint='titleNode,focusNode' dojoAttachEvent='onkeypress:_onTitleKeyPress'\n\t\t\tclass='dijitAccordionTitleFocus' role=\"tab\" aria-expanded=\"false\"\n\t\t><span class='dijitInline dijitAccordionArrow' role=\"presentation\"></span\n\t\t><span class='arrowTextUp' role=\"presentation\">+</span\n\t\t><span class='arrowTextDown' role=\"presentation\">-</span\n\t\t><img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon\" dojoAttachPoint='iconNode' style=\"vertical-align: middle\" role=\"presentation\"/>\n\t\t<span role=\"presentation\" dojoAttachPoint='titleTextNode' class='dijitAccordionText'></span>\n\t</div>\n</div>\n"),attributeMap:dojo.mixin(dojo.clone(dijit.layout.ContentPane.prototype.attributeMap),{label:{node:"titleTextNode",type:"innerHTML"},title:{node:"titleTextNode",type:"attribute",attribute:"title"},iconClass:{node:"iconNode",type:"class"}}),baseClass:"dijitAccordionTitle",getParent:function(){
return this.parent;
},buildRendering:function(){
this.inherited(arguments);
var _2c=this.id.replace(" ","_");
dojo.attr(this.titleTextNode,"id",_2c+"_title");
dijit.setWaiState(this.focusNode,"labelledby",dojo.attr(this.titleTextNode,"id"));
dojo.setSelectable(this.domNode,false);
},getTitleHeight:function(){
return dojo._getMarginSize(this.domNode).h;
},_onTitleClick:function(){
var _2d=this.getParent();
_2d.selectChild(this.contentWidget,true);
dijit.focus(this.focusNode);
},_onTitleKeyPress:function(evt){
return this.getParent()._onKeyPress(evt,this.contentWidget);
},_setSelectedAttr:function(_2e){
this._set("selected",_2e);
dijit.setWaiState(this.focusNode,"expanded",_2e);
dijit.setWaiState(this.focusNode,"selected",_2e);
this.focusNode.setAttribute("tabIndex",_2e?"0":"-1");
}});
}
