/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.av.widget.VolumeButton"]){
dojo._hasResource["dojox.av.widget.VolumeButton"]=true;
dojo.provide("dojox.av.widget.VolumeButton");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Button");
dojo.declare("dojox.av.widget.VolumeButton",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.av.widget","resources/VolumeButton.html","<div class=\"Volume\" dojoAttachEvent=\"mousedown:onShowVolume\">\n\t<div class=\"VolumeSlider\" dojoAttachPoint=\"volumeSlider\">\n    \t<div class=\"VolumeSliderBack\" dojoAttachPoint=\"volumeSliderBack\"></div>\n    \t<div class=\"VolumeSliderHandle\" dojoAttachPoint=\"handle\" dojoAttachEvent=\"mousedown:startDrag, mouseup:endDrag, mouseover:handleOver, mouseout:handleOut\"></div>\t\n    </div>\n    <div class=\"icon\"></div>\n</div>\n"),postCreate:function(){
this.handleWidth=dojo.marginBox(this.handle).w;
this.width=dojo.marginBox(this.volumeSlider).w;
this.slotWidth=100;
dojo.setSelectable(this.handle,false);
this.volumeSlider=this.domNode.removeChild(this.volumeSlider);
},setMedia:function(_1){
this.media=_1;
this.updateIcon();
},updateIcon:function(_2){
_2=(_2===undefined)?this.media.volume():_2;
if(_2===0){
dojo.attr(this.domNode,"class","Volume mute");
}else{
if(_2<0.334){
dojo.attr(this.domNode,"class","Volume low");
}else{
if(_2<0.667){
dojo.attr(this.domNode,"class","Volume med");
}else{
dojo.attr(this.domNode,"class","Volume high");
}
}
}
},onShowVolume:function(_3){
if(this.showing==undefined){
dojo.body().appendChild(this.volumeSlider);
this.showing=false;
}
if(!this.showing){
var _4=2;
var _5=7;
var _6=this.media.volume();
var _7=this._getVolumeDim();
var _8=this._getHandleDim();
this.x=_7.x-this.width;
dojo.style(this.volumeSlider,"display","");
dojo.style(this.volumeSlider,"top",_7.y+"px");
dojo.style(this.volumeSlider,"left",(this.x)+"px");
var x=(this.slotWidth*_6);
dojo.style(this.handle,"top",(_4+(_8.w/2))+"px");
dojo.style(this.handle,"left",(x+_5+(_8.h/2))+"px");
this.showing=true;
this.clickOff=dojo.connect(dojo.doc,"onmousedown",this,"onDocClick");
}else{
this.onHideVolume();
}
},onDocClick:function(_9){
if(!dojo.isDescendant(_9.target,this.domNode)&&!dojo.isDescendant(_9.target,this.volumeSlider)){
this.onHideVolume();
}
},onHideVolume:function(){
this.endDrag();
dojo.style(this.volumeSlider,"display","none");
this.showing=false;
},onDrag:function(_a){
var _b=this.handleWidth/2;
var _c=_b+this.slotWidth;
var x=_a.clientX-this.x;
if(x<_b){
x=_b;
}
if(x>_c){
x=_c;
}
dojo.style(this.handle,"left",(x)+"px");
var p=(x-_b)/(_c-_b);
this.media.volume(p);
this.updateIcon(p);
},startDrag:function(){
this.isDragging=true;
this.cmove=dojo.connect(dojo.doc,"mousemove",this,"onDrag");
this.cup=dojo.connect(dojo.doc,"mouseup",this,"endDrag");
},endDrag:function(){
this.isDragging=false;
if(this.cmove){
dojo.disconnect(this.cmove);
}
if(this.cup){
dojo.disconnect(this.cup);
}
this.handleOut();
},handleOver:function(){
dojo.addClass(this.handle,"over");
},handleOut:function(){
if(!this.isDragging){
dojo.removeClass(this.handle,"over");
}
},_getVolumeDim:function(){
if(this._domCoords){
return this._domCoords;
}
this._domCoords=dojo.coords(this.domNode);
return this._domCoords;
},_getHandleDim:function(){
if(this._handleCoords){
return this._handleCoords;
}
this._handleCoords=dojo.marginBox(this.handle);
return this._handleCoords;
},onResize:function(_d){
this.onHideVolume();
this._domCoords=null;
}});
}
