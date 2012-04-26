/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.BorderContainer"]){
dojo._hasResource["dijit.layout.BorderContainer"]=true;
dojo.provide("dijit.layout.BorderContainer");
dojo.require("dijit.layout._LayoutWidget");
dojo.require("dojo.cookie");
dojo.require("dijit._Templated");
dojo.declare("dijit.layout.BorderContainer",dijit.layout._LayoutWidget,{design:"headline",gutters:true,liveSplitters:true,persist:false,baseClass:"dijitBorderContainer",_splitterClass:"dijit.layout._Splitter",postMixInProperties:function(){
if(!this.gutters){
this.baseClass+="NoGutter";
}
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
dojo.forEach(this.getChildren(),this._setupChild,this);
this.inherited(arguments);
},_setupChild:function(_1){
var _2=_1.region;
if(_2){
this.inherited(arguments);
dojo.addClass(_1.domNode,this.baseClass+"Pane");
var _3=this.isLeftToRight();
if(_2=="leading"){
_2=_3?"left":"right";
}
if(_2=="trailing"){
_2=_3?"right":"left";
}
if(_2!="center"&&(_1.splitter||this.gutters)&&!_1._splitterWidget){
var _4=dojo.getObject(_1.splitter?this._splitterClass:"dijit.layout._Gutter");
var _5=new _4({id:_1.id+"_splitter",container:this,child:_1,region:_2,live:this.liveSplitters});
_5.isSplitter=true;
_1._splitterWidget=_5;
dojo.place(_5.domNode,_1.domNode,"after");
_5.startup();
}
_1.region=_2;
}
},layout:function(){
this._layoutChildren();
},addChild:function(_6,_7){
this.inherited(arguments);
if(this._started){
this.layout();
}
},removeChild:function(_8){
var _9=_8.region;
var _a=_8._splitterWidget;
if(_a){
_a.destroy();
delete _8._splitterWidget;
}
this.inherited(arguments);
if(this._started){
this._layoutChildren();
}
dojo.removeClass(_8.domNode,this.baseClass+"Pane");
dojo.style(_8.domNode,{top:"auto",bottom:"auto",left:"auto",right:"auto",position:"static"});
dojo.style(_8.domNode,_9=="top"||_9=="bottom"?"width":"height","auto");
},getChildren:function(){
return dojo.filter(this.inherited(arguments),function(_b){
return !_b.isSplitter;
});
},getSplitter:function(_c){
return dojo.filter(this.getChildren(),function(_d){
return _d.region==_c;
})[0]._splitterWidget;
},resize:function(_e,_f){
if(!this.cs||!this.pe){
var _10=this.domNode;
this.cs=dojo.getComputedStyle(_10);
this.pe=dojo._getPadExtents(_10,this.cs);
this.pe.r=dojo._toPixelValue(_10,this.cs.paddingRight);
this.pe.b=dojo._toPixelValue(_10,this.cs.paddingBottom);
dojo.style(_10,"padding","0px");
}
this.inherited(arguments);
},_layoutChildren:function(_11,_12){
if(!this._borderBox||!this._borderBox.h){
return;
}
var _13=dojo.map(this.getChildren(),function(_14,idx){
return {pane:_14,weight:[_14.region=="center"?Infinity:0,_14.layoutPriority,(this.design=="sidebar"?1:-1)*(/top|bottom/.test(_14.region)?1:-1),idx]};
},this);
_13.sort(function(a,b){
var aw=a.weight,bw=b.weight;
for(var i=0;i<aw.length;i++){
if(aw[i]!=bw[i]){
return aw[i]-bw[i];
}
}
return 0;
});
var _15=[];
dojo.forEach(_13,function(_16){
var _17=_16.pane;
_15.push(_17);
if(_17._splitterWidget){
_15.push(_17._splitterWidget);
}
});
var dim={l:this.pe.l,t:this.pe.t,w:this._borderBox.w-this.pe.w,h:this._borderBox.h-this.pe.h};
dijit.layout.layoutChildren(this.domNode,dim,_15,_11,_12);
},destroyRecursive:function(){
dojo.forEach(this.getChildren(),function(_18){
var _19=_18._splitterWidget;
if(_19){
_19.destroy();
}
delete _18._splitterWidget;
});
this.inherited(arguments);
}});
dojo.extend(dijit._Widget,{region:"",layoutPriority:0,splitter:false,minSize:0,maxSize:Infinity});
dojo.declare("dijit.layout._Splitter",[dijit._Widget,dijit._Templated],{live:true,templateString:"<div class=\"dijitSplitter\" dojoAttachEvent=\"onkeypress:_onKeyPress,onmousedown:_startDrag,onmouseenter:_onMouse,onmouseleave:_onMouse\" tabIndex=\"0\" role=\"separator\"><div class=\"dijitSplitterThumb\"></div></div>",postMixInProperties:function(){
this.inherited(arguments);
this.horizontal=/top|bottom/.test(this.region);
this._factor=/top|left/.test(this.region)?1:-1;
this._cookieName=this.container.id+"_"+this.region;
},buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitSplitter"+(this.horizontal?"H":"V"));
if(this.container.persist){
var _1a=dojo.cookie(this._cookieName);
if(_1a){
this.child.domNode.style[this.horizontal?"height":"width"]=_1a;
}
}
},_computeMaxSize:function(){
var dim=this.horizontal?"h":"w",_1b=dojo.marginBox(this.child.domNode)[dim],_1c=dojo.filter(this.container.getChildren(),function(_1d){
return _1d.region=="center";
})[0],_1e=dojo.marginBox(_1c.domNode)[dim];
return Math.min(this.child.maxSize,_1b+_1e);
},_startDrag:function(e){
if(!this.cover){
this.cover=dojo.doc.createElement("div");
dojo.addClass(this.cover,"dijitSplitterCover");
dojo.place(this.cover,this.child.domNode,"after");
}
dojo.addClass(this.cover,"dijitSplitterCoverActive");
if(this.fake){
dojo.destroy(this.fake);
}
if(!(this._resize=this.live)){
(this.fake=this.domNode.cloneNode(true)).removeAttribute("id");
dojo.addClass(this.domNode,"dijitSplitterShadow");
dojo.place(this.fake,this.domNode,"after");
}
dojo.addClass(this.domNode,"dijitSplitterActive dijitSplitter"+(this.horizontal?"H":"V")+"Active");
if(this.fake){
dojo.removeClass(this.fake,"dijitSplitterHover dijitSplitter"+(this.horizontal?"H":"V")+"Hover");
}
var _1f=this._factor,_20=this.horizontal,_21=_20?"pageY":"pageX",_22=e[_21],_23=this.domNode.style,dim=_20?"h":"w",_24=dojo.marginBox(this.child.domNode)[dim],max=this._computeMaxSize(),min=this.child.minSize||20,_25=this.region,_26=_25=="top"||_25=="bottom"?"top":"left",_27=parseInt(_23[_26],10),_28=this._resize,_29=dojo.hitch(this.container,"_layoutChildren",this.child.id),de=dojo.doc;
this._handlers=(this._handlers||[]).concat([dojo.connect(de,"onmousemove",this._drag=function(e,_2a){
var _2b=e[_21]-_22,_2c=_1f*_2b+_24,_2d=Math.max(Math.min(_2c,max),min);
if(_28||_2a){
_29(_2d);
}
_23[_26]=_2b+_27+_1f*(_2d-_2c)+"px";
}),dojo.connect(de,"ondragstart",dojo.stopEvent),dojo.connect(dojo.body(),"onselectstart",dojo.stopEvent),dojo.connect(de,"onmouseup",this,"_stopDrag")]);
dojo.stopEvent(e);
},_onMouse:function(e){
var o=(e.type=="mouseover"||e.type=="mouseenter");
dojo.toggleClass(this.domNode,"dijitSplitterHover",o);
dojo.toggleClass(this.domNode,"dijitSplitter"+(this.horizontal?"H":"V")+"Hover",o);
},_stopDrag:function(e){
try{
if(this.cover){
dojo.removeClass(this.cover,"dijitSplitterCoverActive");
}
if(this.fake){
dojo.destroy(this.fake);
}
dojo.removeClass(this.domNode,"dijitSplitterActive dijitSplitter"+(this.horizontal?"H":"V")+"Active dijitSplitterShadow");
this._drag(e);
this._drag(e,true);
}
finally{
this._cleanupHandlers();
delete this._drag;
}
if(this.container.persist){
dojo.cookie(this._cookieName,this.child.domNode.style[this.horizontal?"height":"width"],{expires:365});
}
},_cleanupHandlers:function(){
dojo.forEach(this._handlers,dojo.disconnect);
delete this._handlers;
},_onKeyPress:function(e){
this._resize=true;
var _2e=this.horizontal;
var _2f=1;
var dk=dojo.keys;
switch(e.charOrCode){
case _2e?dk.UP_ARROW:dk.LEFT_ARROW:
_2f*=-1;
case _2e?dk.DOWN_ARROW:dk.RIGHT_ARROW:
break;
default:
return;
}
var _30=dojo._getMarginSize(this.child.domNode)[_2e?"h":"w"]+this._factor*_2f;
this.container._layoutChildren(this.child.id,Math.max(Math.min(_30,this._computeMaxSize()),this.child.minSize));
dojo.stopEvent(e);
},destroy:function(){
this._cleanupHandlers();
delete this.child;
delete this.container;
delete this.cover;
delete this.fake;
this.inherited(arguments);
}});
dojo.declare("dijit.layout._Gutter",[dijit._Widget,dijit._Templated],{templateString:"<div class=\"dijitGutter\" role=\"presentation\"></div>",postMixInProperties:function(){
this.inherited(arguments);
this.horizontal=/top|bottom/.test(this.region);
},buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitGutter"+(this.horizontal?"H":"V"));
}});
}
