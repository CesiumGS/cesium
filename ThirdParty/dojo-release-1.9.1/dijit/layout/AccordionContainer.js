//>>built
require({cache:{"url:dijit/layout/templates/AccordionButton.html":"<div data-dojo-attach-event='ondijitclick:_onTitleClick' class='dijitAccordionTitle' role=\"presentation\">\n\t<div data-dojo-attach-point='titleNode,focusNode' data-dojo-attach-event='onkeydown:_onTitleKeyDown'\n\t\t\tclass='dijitAccordionTitleFocus' role=\"tab\" aria-expanded=\"false\"\n\t\t><span class='dijitInline dijitAccordionArrow' role=\"presentation\"></span\n\t\t><span class='arrowTextUp' role=\"presentation\">+</span\n\t\t><span class='arrowTextDown' role=\"presentation\">-</span\n\t\t><span role=\"presentation\" class=\"dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span>\n\t\t<span role=\"presentation\" data-dojo-attach-point='titleTextNode, textDirNode' class='dijitAccordionText'></span>\n\t</div>\n</div>\n"}});
define("dijit/layout/AccordionContainer",["require","dojo/_base/array","dojo/_base/declare","dojo/_base/fx","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/dom-geometry","dojo/keys","dojo/_base/lang","dojo/sniff","dojo/topic","../focus","../_base/manager","dojo/ready","../_Widget","../_Container","../_TemplatedMixin","../_CssStateMixin","./StackContainer","./ContentPane","dojo/text!./templates/AccordionButton.html","../a11yclick"],function(_1,_2,_3,fx,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e,_f,_10,_11,_12,_13,_14,_15,_16){
var _17=_3("dijit.layout._AccordionButton",[_10,_12,_13],{templateString:_16,label:"",_setLabelAttr:{node:"titleTextNode",type:"innerHTML"},title:"",_setTitleAttr:{node:"titleTextNode",type:"attribute",attribute:"title"},iconClassAttr:"",_setIconClassAttr:{node:"iconNode",type:"class"},baseClass:"dijitAccordionTitle",getParent:function(){
return this.parent;
},buildRendering:function(){
this.inherited(arguments);
var _18=this.id.replace(" ","_");
_5.set(this.titleTextNode,"id",_18+"_title");
this.focusNode.setAttribute("aria-labelledby",_5.get(this.titleTextNode,"id"));
_4.setSelectable(this.domNode,false);
},getTitleHeight:function(){
return _8.getMarginSize(this.domNode).h;
},_onTitleClick:function(){
var _19=this.getParent();
_19.selectChild(this.contentWidget,true);
_d.focus(this.focusNode);
},_onTitleKeyDown:function(evt){
return this.getParent()._onKeyDown(evt,this.contentWidget);
},_setSelectedAttr:function(_1a){
this._set("selected",_1a);
this.focusNode.setAttribute("aria-expanded",_1a?"true":"false");
this.focusNode.setAttribute("aria-selected",_1a?"true":"false");
this.focusNode.setAttribute("tabIndex",_1a?"0":"-1");
}});
if(_b("dojo-bidi")){
_17.extend({_setLabelAttr:function(_1b){
this._set("label",_1b);
_5.set(this.titleTextNode,"innerHTML",_1b);
this.applyTextDir(this.titleTextNode);
},_setTitleAttr:function(_1c){
this._set("title",_1c);
_5.set(this.titleTextNode,"title",_1c);
this.applyTextDir(this.titleTextNode);
}});
}
var _1d=_3("dijit.layout._AccordionInnerContainer"+(_b("dojo-bidi")?"_NoBidi":""),[_10,_13],{baseClass:"dijitAccordionInnerContainer",isLayoutContainer:true,buildRendering:function(){
this.domNode=_7.place("<div class='"+this.baseClass+"' role='presentation'>",this.contentWidget.domNode,"after");
var _1e=this.contentWidget,cls=_a.isString(this.buttonWidget)?_a.getObject(this.buttonWidget):this.buttonWidget;
this.button=_1e._buttonWidget=(new cls({contentWidget:_1e,label:_1e.title,title:_1e.tooltip,dir:_1e.dir,lang:_1e.lang,textDir:_1e.textDir||this.textDir,iconClass:_1e.iconClass,id:_1e.id+"_button",parent:this.parent})).placeAt(this.domNode);
this.containerNode=_7.place("<div class='dijitAccordionChildWrapper' role='tabpanel' style='display:none'>",this.domNode);
this.containerNode.setAttribute("aria-labelledby",this.button.id);
_7.place(this.contentWidget.domNode,this.containerNode);
},postCreate:function(){
this.inherited(arguments);
var _1f=this.button,cw=this.contentWidget;
this._contentWidgetWatches=[cw.watch("title",_a.hitch(this,function(_20,_21,_22){
_1f.set("label",_22);
})),cw.watch("tooltip",_a.hitch(this,function(_23,_24,_25){
_1f.set("title",_25);
})),cw.watch("iconClass",_a.hitch(this,function(_26,_27,_28){
_1f.set("iconClass",_28);
}))];
},_setSelectedAttr:function(_29){
this._set("selected",_29);
this.button.set("selected",_29);
if(_29){
var cw=this.contentWidget;
if(cw.onSelected){
cw.onSelected();
}
}
},startup:function(){
this.contentWidget.startup();
},destroy:function(){
this.button.destroyRecursive();
_2.forEach(this._contentWidgetWatches||[],function(w){
w.unwatch();
});
delete this.contentWidget._buttonWidget;
delete this.contentWidget._wrapperWidget;
this.inherited(arguments);
},destroyDescendants:function(_2a){
this.contentWidget.destroyRecursive(_2a);
}});
if(_b("dojo-bidi")){
_1d=_3("dijit.layout._AccordionInnerContainer",_1d,{postCreate:function(){
this.inherited(arguments);
var _2b=this.button;
this._contentWidgetWatches.push(this.contentWidget.watch("textDir",function(_2c,_2d,_2e){
_2b.set("textDir",_2e);
}));
}});
}
var _2f=_3("dijit.layout.AccordionContainer",_14,{duration:_e.defaultDuration,buttonWidget:_17,baseClass:"dijitAccordionContainer",buildRendering:function(){
this.inherited(arguments);
this.domNode.style.overflow="hidden";
this.domNode.setAttribute("role","tablist");
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(this.selectedChildWidget){
this.selectedChildWidget._wrapperWidget.set("selected",true);
}
},layout:function(){
var _30=this.selectedChildWidget;
if(!_30){
return;
}
var _31=_30._wrapperWidget.domNode,_32=_8.getMarginExtents(_31),_33=_8.getPadBorderExtents(_31),_34=_30._wrapperWidget.containerNode,_35=_8.getMarginExtents(_34),_36=_8.getPadBorderExtents(_34),_37=this._contentBox;
var _38=0;
_2.forEach(this.getChildren(),function(_39){
if(_39!=_30){
_38+=_8.getMarginSize(_39._wrapperWidget.domNode).h;
}
});
this._verticalSpace=_37.h-_38-_32.h-_33.h-_35.h-_36.h-_30._buttonWidget.getTitleHeight();
this._containerContentBox={h:this._verticalSpace,w:this._contentBox.w-_32.w-_33.w-_35.w-_36.w};
if(_30){
_30.resize(this._containerContentBox);
}
},_setupChild:function(_3a){
_3a._wrapperWidget=_1d({contentWidget:_3a,buttonWidget:this.buttonWidget,id:_3a.id+"_wrapper",dir:_3a.dir,lang:_3a.lang,textDir:_3a.textDir||this.textDir,parent:this});
this.inherited(arguments);
_7.place(_3a.domNode,_3a._wrapper,"replace");
},removeChild:function(_3b){
if(_3b._wrapperWidget){
_7.place(_3b.domNode,_3b._wrapperWidget.domNode,"after");
_3b._wrapperWidget.destroy();
delete _3b._wrapperWidget;
}
_6.remove(_3b.domNode,"dijitHidden");
this.inherited(arguments);
},getChildren:function(){
return _2.map(this.inherited(arguments),function(_3c){
return _3c.declaredClass=="dijit.layout._AccordionInnerContainer"?_3c.contentWidget:_3c;
},this);
},destroy:function(){
if(this._animation){
this._animation.stop();
}
_2.forEach(this.getChildren(),function(_3d){
if(_3d._wrapperWidget){
_3d._wrapperWidget.destroy();
}else{
_3d.destroyRecursive();
}
});
this.inherited(arguments);
},_showChild:function(_3e){
_3e._wrapperWidget.containerNode.style.display="block";
return this.inherited(arguments);
},_hideChild:function(_3f){
_3f._wrapperWidget.containerNode.style.display="none";
this.inherited(arguments);
},_transition:function(_40,_41,_42){
if(_b("ie")<8){
_42=false;
}
if(this._animation){
this._animation.stop(true);
delete this._animation;
}
var _43=this;
if(_40){
_40._wrapperWidget.set("selected",true);
var d=this._showChild(_40);
if(this.doLayout&&_40.resize){
_40.resize(this._containerContentBox);
}
}
if(_41){
_41._wrapperWidget.set("selected",false);
if(!_42){
this._hideChild(_41);
}
}
if(_42){
var _44=_40._wrapperWidget.containerNode,_45=_41._wrapperWidget.containerNode;
var _46=_40._wrapperWidget.containerNode,_47=_8.getMarginExtents(_46),_48=_8.getPadBorderExtents(_46),_49=_47.h+_48.h;
_45.style.height=(_43._verticalSpace-_49)+"px";
this._animation=new fx.Animation({node:_44,duration:this.duration,curve:[1,this._verticalSpace-_49-1],onAnimate:function(_4a){
_4a=Math.floor(_4a);
_44.style.height=_4a+"px";
_45.style.height=(_43._verticalSpace-_49-_4a)+"px";
},onEnd:function(){
delete _43._animation;
_44.style.height="auto";
_41._wrapperWidget.containerNode.style.display="none";
_45.style.height="auto";
_43._hideChild(_41);
}});
this._animation.onStop=this._animation.onEnd;
this._animation.play();
}
return d;
},_onKeyDown:function(e,_4b){
if(this.disabled||e.altKey||!(_4b||e.ctrlKey)){
return;
}
var c=e.keyCode;
if((_4b&&(c==_9.LEFT_ARROW||c==_9.UP_ARROW))||(e.ctrlKey&&c==_9.PAGE_UP)){
this._adjacent(false)._buttonWidget._onTitleClick();
e.stopPropagation();
e.preventDefault();
}else{
if((_4b&&(c==_9.RIGHT_ARROW||c==_9.DOWN_ARROW))||(e.ctrlKey&&(c==_9.PAGE_DOWN||c==_9.TAB))){
this._adjacent(true)._buttonWidget._onTitleClick();
e.stopPropagation();
e.preventDefault();
}
}
}});
if(_b("dijit-legacy-requires")){
_f(0,function(){
var _4c=["dijit/layout/AccordionPane"];
_1(_4c);
});
}
_2f._InnerContainer=_1d;
_2f._Button=_17;
return _2f;
});
