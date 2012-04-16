/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.ScrollPane"]){
dojo._hasResource["dojox.layout.ScrollPane"]=true;
dojo.provide("dojox.layout.ScrollPane");
dojo.experimental("dojox.layout.ScrollPane");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._Templated");
dojo.declare("dojox.layout.ScrollPane",[dijit.layout.ContentPane,dijit._Templated],{_line:null,_lo:null,_offset:15,orientation:"vertical",autoHide:true,templateString:dojo.cache("dojox.layout","resources/ScrollPane.html","<div class=\"dojoxScrollWindow\" dojoAttachEvent=\"onmouseenter: _enter, onmouseleave: _leave\">\n    <div class=\"dojoxScrollWrapper\" style=\"${style}\" dojoAttachPoint=\"wrapper\" dojoAttachEvent=\"onmousemove: _calc\">\n\t<div class=\"dojoxScrollPane\" dojoAttachPoint=\"containerNode\"></div>\n    </div>\n    <div dojoAttachPoint=\"helper\" class=\"dojoxScrollHelper\"><span class=\"helperInner\">|</span></div>\n</div>\n"),resize:function(_1){
if(_1){
if(_1.h){
dojo.style(this.domNode,"height",_1.h+"px");
}
if(_1.w){
dojo.style(this.domNode,"width",_1.w+"px");
}
}
var _2=this._dir,_3=this._vertical,_4=this.containerNode[(_3?"scrollHeight":"scrollWidth")];
dojo.style(this.wrapper,this._dir,this.domNode.style[this._dir]);
this._lo=dojo.coords(this.wrapper,true);
this._size=Math.max(0,_4-this._lo[(_3?"h":"w")]);
if(!this._size){
this.helper.style.display="none";
this.wrapper[this._scroll]=0;
return;
}else{
this.helper.style.display="";
}
this._line=new dojo._Line(0-this._offset,this._size+(this._offset*2));
var u=this._lo[(_3?"h":"w")],r=Math.min(1,u/_4),s=u*r,c=Math.floor(u-(u*r));
this._helpLine=new dojo._Line(0,c);
dojo.style(this.helper,_2,Math.floor(s)+"px");
},postCreate:function(){
this.inherited(arguments);
if(this.autoHide){
this._showAnim=dojo._fade({node:this.helper,end:0.5,duration:350});
this._hideAnim=dojo.fadeOut({node:this.helper,duration:750});
}
this._vertical=(this.orientation=="vertical");
if(!this._vertical){
dojo.addClass(this.containerNode,"dijitInline");
this._dir="width";
this._edge="left";
this._scroll="scrollLeft";
}else{
this._dir="height";
this._edge="top";
this._scroll="scrollTop";
}
if(this._hideAnim){
this._hideAnim.play();
}
dojo.style(this.wrapper,"overflow","hidden");
},_set:function(n){
if(!this._size){
return;
}
this.wrapper[this._scroll]=Math.floor(this._line.getValue(n));
dojo.style(this.helper,this._edge,Math.floor(this._helpLine.getValue(n))+"px");
},_calc:function(e){
if(!this._lo){
this.resize();
}
this._set(this._vertical?((e.pageY-this._lo.y)/this._lo.h):((e.pageX-this._lo.x)/this._lo.w));
},_enter:function(e){
if(this._hideAnim){
if(this._hideAnim.status()=="playing"){
this._hideAnim.stop();
}
this._showAnim.play();
}
},_leave:function(e){
if(this._hideAnim){
this._hideAnim.play();
}
}});
}
