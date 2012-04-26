/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout._LayoutWidget"]){
dojo._hasResource["dijit.layout._LayoutWidget"]=true;
dojo.provide("dijit.layout._LayoutWidget");
dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dijit._Contained");
dojo.declare("dijit.layout._LayoutWidget",[dijit._Widget,dijit._Container,dijit._Contained],{baseClass:"dijitLayoutContainer",isLayoutContainer:true,buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitContainer");
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
var _1=this.getParent&&this.getParent();
if(!(_1&&_1.isLayoutContainer)){
this.resize();
this.connect(dojo.isIE?this.domNode:dojo.global,"onresize",function(){
this.resize();
});
}
},resize:function(_2,_3){
var _4=this.domNode;
if(_2){
dojo.marginBox(_4,_2);
if(_2.t){
_4.style.top=_2.t+"px";
}
if(_2.l){
_4.style.left=_2.l+"px";
}
}
var mb=_3||{};
dojo.mixin(mb,_2||{});
if(!("h" in mb)||!("w" in mb)){
mb=dojo.mixin(dojo.marginBox(_4),mb);
}
var cs=dojo.getComputedStyle(_4);
var me=dojo._getMarginExtents(_4,cs);
var be=dojo._getBorderExtents(_4,cs);
var bb=(this._borderBox={w:mb.w-(me.w+be.w),h:mb.h-(me.h+be.h)});
var pe=dojo._getPadExtents(_4,cs);
this._contentBox={l:dojo._toPixelValue(_4,cs.paddingLeft),t:dojo._toPixelValue(_4,cs.paddingTop),w:bb.w-pe.w,h:bb.h-pe.h};
this.layout();
},layout:function(){
},_setupChild:function(_5){
var _6=this.baseClass+"-child "+(_5.baseClass?this.baseClass+"-"+_5.baseClass:"");
dojo.addClass(_5.domNode,_6);
},addChild:function(_7,_8){
this.inherited(arguments);
if(this._started){
this._setupChild(_7);
}
},removeChild:function(_9){
var _a=this.baseClass+"-child"+(_9.baseClass?" "+this.baseClass+"-"+_9.baseClass:"");
dojo.removeClass(_9.domNode,_a);
this.inherited(arguments);
}});
dijit.layout.marginBox2contentBox=function(_b,mb){
var cs=dojo.getComputedStyle(_b);
var me=dojo._getMarginExtents(_b,cs);
var pb=dojo._getPadBorderExtents(_b,cs);
return {l:dojo._toPixelValue(_b,cs.paddingLeft),t:dojo._toPixelValue(_b,cs.paddingTop),w:mb.w-(me.w+pb.w),h:mb.h-(me.h+pb.h)};
};
(function(){
var _c=function(_d){
return _d.substring(0,1).toUpperCase()+_d.substring(1);
};
var _e=function(_f,dim){
var _10=_f.resize?_f.resize(dim):dojo.marginBox(_f.domNode,dim);
if(_10){
dojo.mixin(_f,_10);
}else{
dojo.mixin(_f,dojo.marginBox(_f.domNode));
dojo.mixin(_f,dim);
}
};
dijit.layout.layoutChildren=function(_11,dim,_12,_13,_14){
dim=dojo.mixin({},dim);
dojo.addClass(_11,"dijitLayoutContainer");
_12=dojo.filter(_12,function(_15){
return _15.region!="center"&&_15.layoutAlign!="client";
}).concat(dojo.filter(_12,function(_16){
return _16.region=="center"||_16.layoutAlign=="client";
}));
dojo.forEach(_12,function(_17){
var elm=_17.domNode,pos=(_17.region||_17.layoutAlign);
var _18=elm.style;
_18.left=dim.l+"px";
_18.top=dim.t+"px";
_18.position="absolute";
dojo.addClass(elm,"dijitAlign"+_c(pos));
var _19={};
if(_13&&_13==_17.id){
_19[_17.region=="top"||_17.region=="bottom"?"h":"w"]=_14;
}
if(pos=="top"||pos=="bottom"){
_19.w=dim.w;
_e(_17,_19);
dim.h-=_17.h;
if(pos=="top"){
dim.t+=_17.h;
}else{
_18.top=dim.t+dim.h+"px";
}
}else{
if(pos=="left"||pos=="right"){
_19.h=dim.h;
_e(_17,_19);
dim.w-=_17.w;
if(pos=="left"){
dim.l+=_17.w;
}else{
_18.left=dim.l+dim.w+"px";
}
}else{
if(pos=="client"||pos=="center"){
_e(_17,dim);
}
}
}
});
};
})();
}
