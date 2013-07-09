//>>built
define("dijit/layout/_LayoutWidget",["dojo/_base/lang","../_Widget","../_Container","../_Contained","../Viewport","dojo/_base/declare","dojo/dom-class","dojo/dom-geometry","dojo/dom-style"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
return _6("dijit.layout._LayoutWidget",[_2,_3,_4],{baseClass:"dijitLayoutContainer",isLayoutContainer:true,buildRendering:function(){
this.inherited(arguments);
_7.add(this.domNode,"dijitContainer");
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
var _a=this.getParent&&this.getParent();
if(!(_a&&_a.isLayoutContainer)){
this.resize();
this.own(_5.on("resize",_1.hitch(this,"resize")));
}
},resize:function(_b,_c){
var _d=this.domNode;
if(_b){
_8.setMarginBox(_d,_b);
}
var mb=_c||{};
_1.mixin(mb,_b||{});
if(!("h" in mb)||!("w" in mb)){
mb=_1.mixin(_8.getMarginBox(_d),mb);
}
var cs=_9.getComputedStyle(_d);
var me=_8.getMarginExtents(_d,cs);
var be=_8.getBorderExtents(_d,cs);
var bb=(this._borderBox={w:mb.w-(me.w+be.w),h:mb.h-(me.h+be.h)});
var pe=_8.getPadExtents(_d,cs);
this._contentBox={l:_9.toPixelValue(_d,cs.paddingLeft),t:_9.toPixelValue(_d,cs.paddingTop),w:bb.w-pe.w,h:bb.h-pe.h};
this.layout();
},layout:function(){
},_setupChild:function(_e){
var _f=this.baseClass+"-child "+(_e.baseClass?this.baseClass+"-"+_e.baseClass:"");
_7.add(_e.domNode,_f);
},addChild:function(_10,_11){
this.inherited(arguments);
if(this._started){
this._setupChild(_10);
}
},removeChild:function(_12){
var cls=this.baseClass+"-child"+(_12.baseClass?" "+this.baseClass+"-"+_12.baseClass:"");
_7.remove(_12.domNode,cls);
this.inherited(arguments);
}});
});
