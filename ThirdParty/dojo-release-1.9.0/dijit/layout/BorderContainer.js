//>>built
define("dijit/layout/BorderContainer",["dojo/_base/array","dojo/cookie","dojo/_base/declare","dojo/dom-class","dojo/dom-construct","dojo/dom-geometry","dojo/dom-style","dojo/keys","dojo/_base/lang","dojo/on","dojo/touch","../_WidgetBase","../_Widget","../_TemplatedMixin","./LayoutContainer","./utils"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,on,_a,_b,_c,_d,_e,_f){
var _10=_3("dijit.layout._Splitter",[_c,_d],{live:true,templateString:"<div class=\"dijitSplitter\" data-dojo-attach-event=\"onkeydown:_onKeyDown,press:_startDrag,onmouseenter:_onMouse,onmouseleave:_onMouse\" tabIndex=\"0\" role=\"separator\"><div class=\"dijitSplitterThumb\"></div></div>",constructor:function(){
this._handlers=[];
},postMixInProperties:function(){
this.inherited(arguments);
this.horizontal=/top|bottom/.test(this.region);
this._factor=/top|left/.test(this.region)?1:-1;
this._cookieName=this.container.id+"_"+this.region;
},buildRendering:function(){
this.inherited(arguments);
_4.add(this.domNode,"dijitSplitter"+(this.horizontal?"H":"V"));
if(this.container.persist){
var _11=_2(this._cookieName);
if(_11){
this.child.domNode.style[this.horizontal?"height":"width"]=_11;
}
}
},_computeMaxSize:function(){
var dim=this.horizontal?"h":"w",_12=_6.getMarginBox(this.child.domNode)[dim],_13=_1.filter(this.container.getChildren(),function(_14){
return _14.region=="center";
})[0];
var _15=_6.getContentBox(_13.domNode)[dim]-10;
return Math.min(this.child.maxSize,_12+_15);
},_startDrag:function(e){
if(!this.cover){
this.cover=_5.place("<div class=dijitSplitterCover></div>",this.child.domNode,"after");
}
_4.add(this.cover,"dijitSplitterCoverActive");
if(this.fake){
_5.destroy(this.fake);
}
if(!(this._resize=this.live)){
(this.fake=this.domNode.cloneNode(true)).removeAttribute("id");
_4.add(this.domNode,"dijitSplitterShadow");
_5.place(this.fake,this.domNode,"after");
}
_4.add(this.domNode,"dijitSplitterActive dijitSplitter"+(this.horizontal?"H":"V")+"Active");
if(this.fake){
_4.remove(this.fake,"dijitSplitterHover dijitSplitter"+(this.horizontal?"H":"V")+"Hover");
}
var _16=this._factor,_17=this.horizontal,_18=_17?"pageY":"pageX",_19=e[_18],_1a=this.domNode.style,dim=_17?"h":"w",_1b=_7.getComputedStyle(this.child.domNode),_1c=_6.getMarginBox(this.child.domNode,_1b)[dim],max=this._computeMaxSize(),min=Math.max(this.child.minSize,_6.getPadBorderExtents(this.child.domNode,_1b)[dim]+10),_1d=this.region,_1e=_1d=="top"||_1d=="bottom"?"top":"left",_1f=parseInt(_1a[_1e],10),_20=this._resize,_21=_9.hitch(this.container,"_layoutChildren",this.child.id),de=this.ownerDocument;
this._handlers=this._handlers.concat([on(de,_a.move,this._drag=function(e,_22){
var _23=e[_18]-_19,_24=_16*_23+_1c,_25=Math.max(Math.min(_24,max),min);
if(_20||_22){
_21(_25);
}
_1a[_1e]=_23+_1f+_16*(_25-_24)+"px";
}),on(de,"dragstart",function(e){
e.stopPropagation();
e.preventDefault();
}),on(this.ownerDocumentBody,"selectstart",function(e){
e.stopPropagation();
e.preventDefault();
}),on(de,_a.release,_9.hitch(this,"_stopDrag"))]);
e.stopPropagation();
e.preventDefault();
},_onMouse:function(e){
var o=(e.type=="mouseover"||e.type=="mouseenter");
_4.toggle(this.domNode,"dijitSplitterHover",o);
_4.toggle(this.domNode,"dijitSplitter"+(this.horizontal?"H":"V")+"Hover",o);
},_stopDrag:function(e){
try{
if(this.cover){
_4.remove(this.cover,"dijitSplitterCoverActive");
}
if(this.fake){
_5.destroy(this.fake);
}
_4.remove(this.domNode,"dijitSplitterActive dijitSplitter"+(this.horizontal?"H":"V")+"Active dijitSplitterShadow");
this._drag(e);
this._drag(e,true);
}
finally{
this._cleanupHandlers();
delete this._drag;
}
if(this.container.persist){
_2(this._cookieName,this.child.domNode.style[this.horizontal?"height":"width"],{expires:365});
}
},_cleanupHandlers:function(){
var h;
while(h=this._handlers.pop()){
h.remove();
}
},_onKeyDown:function(e){
this._resize=true;
var _26=this.horizontal;
var _27=1;
switch(e.keyCode){
case _26?_8.UP_ARROW:_8.LEFT_ARROW:
_27*=-1;
case _26?_8.DOWN_ARROW:_8.RIGHT_ARROW:
break;
default:
return;
}
var _28=_6.getMarginSize(this.child.domNode)[_26?"h":"w"]+this._factor*_27;
this.container._layoutChildren(this.child.id,Math.max(Math.min(_28,this._computeMaxSize()),this.child.minSize));
e.stopPropagation();
e.preventDefault();
},destroy:function(){
this._cleanupHandlers();
delete this.child;
delete this.container;
delete this.cover;
delete this.fake;
this.inherited(arguments);
}});
var _29=_3("dijit.layout._Gutter",[_c,_d],{templateString:"<div class=\"dijitGutter\" role=\"presentation\"></div>",postMixInProperties:function(){
this.inherited(arguments);
this.horizontal=/top|bottom/.test(this.region);
},buildRendering:function(){
this.inherited(arguments);
_4.add(this.domNode,"dijitGutter"+(this.horizontal?"H":"V"));
}});
var _2a=_3("dijit.layout.BorderContainer",_e,{gutters:true,liveSplitters:true,persist:false,baseClass:"dijitBorderContainer",_splitterClass:_10,postMixInProperties:function(){
if(!this.gutters){
this.baseClass+="NoGutter";
}
this.inherited(arguments);
},_setupChild:function(_2b){
this.inherited(arguments);
var _2c=_2b.region,ltr=_2b.isLeftToRight();
if(_2c=="leading"){
_2c=ltr?"left":"right";
}
if(_2c=="trailing"){
_2c=ltr?"right":"left";
}
if(_2c){
if(_2c!="center"&&(_2b.splitter||this.gutters)&&!_2b._splitterWidget){
var _2d=_2b.splitter?this._splitterClass:_29;
if(_9.isString(_2d)){
_2d=_9.getObject(_2d);
}
var _2e=new _2d({id:_2b.id+"_splitter",container:this,child:_2b,region:_2c,live:this.liveSplitters});
_2e.isSplitter=true;
_2b._splitterWidget=_2e;
var _2f=_2c=="bottom"||_2c==(this.isLeftToRight()?"right":"left");
_5.place(_2e.domNode,_2b.domNode,_2f?"before":"after");
_2e.startup();
}
}
},layout:function(){
this._layoutChildren();
},removeChild:function(_30){
var _31=_30._splitterWidget;
if(_31){
_31.destroy();
delete _30._splitterWidget;
}
this.inherited(arguments);
},getChildren:function(){
return _1.filter(this.inherited(arguments),function(_32){
return !_32.isSplitter;
});
},getSplitter:function(_33){
return _1.filter(this.getChildren(),function(_34){
return _34.region==_33;
})[0]._splitterWidget;
},resize:function(_35,_36){
if(!this.cs||!this.pe){
var _37=this.domNode;
this.cs=_7.getComputedStyle(_37);
this.pe=_6.getPadExtents(_37,this.cs);
this.pe.r=_7.toPixelValue(_37,this.cs.paddingRight);
this.pe.b=_7.toPixelValue(_37,this.cs.paddingBottom);
_7.set(_37,"padding","0px");
}
this.inherited(arguments);
},_layoutChildren:function(_38,_39){
if(!this._borderBox||!this._borderBox.h){
return;
}
var _3a=[];
_1.forEach(this._getOrderedChildren(),function(_3b){
_3a.push(_3b);
if(_3b._splitterWidget){
_3a.push(_3b._splitterWidget);
}
});
var dim={l:this.pe.l,t:this.pe.t,w:this._borderBox.w-this.pe.w,h:this._borderBox.h-this.pe.h};
_f.layoutChildren(this.domNode,dim,_3a,_38,_39);
},destroyRecursive:function(){
_1.forEach(this.getChildren(),function(_3c){
var _3d=_3c._splitterWidget;
if(_3d){
_3d.destroy();
}
delete _3c._splitterWidget;
});
this.inherited(arguments);
}});
_2a.ChildWidgetProperties={splitter:false,minSize:0,maxSize:Infinity};
_9.mixin(_2a.ChildWidgetProperties,_e.ChildWidgetProperties);
_9.extend(_b,_2a.ChildWidgetProperties);
_2a._Splitter=_10;
_2a._Gutter=_29;
return _2a;
});
