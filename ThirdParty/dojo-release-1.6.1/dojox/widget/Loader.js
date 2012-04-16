/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Loader"]){
dojo._hasResource["dojox.widget.Loader"]=true;
dojo.provide("dojox.widget.Loader");
dojo.deprecated("dojox.widget.Loader","","2.0");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dojox.widget.Loader",[dijit._Widget,dijit._Templated],{loadIcon:dojo.moduleUrl("dojox.widget.Loader","icons/loading.gif"),loadMessage:"Loading ...",hasVisuals:true,attachToPointer:true,duration:125,_offset:16,_pointerConnect:null,_xhrStart:null,_xhrEnd:null,templateString:"<div dojoAttachPoint=\"loadNode\" class=\"dojoxLoader\">"+"<img src=\"${loadIcon}\" class=\"dojoxLoaderIcon\"> <span dojoAttachPoint=\"loadMessageNode\" class=\"dojoxLoaderMessage\"></span>"+"</div>",postCreate:function(){
if(!this.hasVisuals){
this.loadNode.style.display="none";
}else{
if(this.attachToPointer){
dojo.removeClass(this.loadNode,"dojoxLoader");
dojo.addClass(this.loadNode,"dojoxLoaderPointer");
}
this._hide();
}
this._setMessage(this.loadMessage);
this._xhrStart=this.connect(dojo,"_ioSetArgs","_show");
this._xhrEnd=this.connect(dojo.Deferred.prototype,"_fire","_hide");
},_setMessage:function(_1){
this.loadMessageNode.innerHTML=_1;
},_putLoader:function(e){
dijit.placeOnScreen(this.loadNode,{x:e.clientX+this._offset,y:e.clientY+this._offset},["TL","BR"]);
},_show:function(){
dojo.publish("Loader",[{message:"started"}]);
if(this.hasVisuals){
if(this.attachToPointer){
this._pointerConnect=this.connect(document,"onmousemove","_putLoader");
}
dojo.style(this.loadNode,{opacity:0,display:""});
dojo.fadeIn({node:this.loadNode,duration:this.duration}).play();
}
},_hide:function(){
dojo.publish("Loader",[{message:"ended"}]);
if(this.hasVisuals){
if(this.attachToPointer){
this.disconnect(this._pointerConnect);
}
dojo.fadeOut({node:this.loadNode,duration:this.duration,onEnd:dojo.partial(dojo.style,this.loadNode,"display","none")}).play();
}
}});
}
