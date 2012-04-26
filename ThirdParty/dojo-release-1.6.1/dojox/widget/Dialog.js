/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Dialog"]){
dojo._hasResource["dojox.widget.Dialog"]=true;
dojo.provide("dojox.widget.Dialog");
dojo.experimental("dojox.widget.Dialog");
dojo.require("dojo.window");
dojo.require("dojox.fx");
dojo.require("dojox.widget.DialogSimple");
dojo.declare("dojox.widget.Dialog",dojox.widget.DialogSimple,{templateString:dojo.cache("dojox.widget","Dialog/Dialog.html","<div class=\"dojoxDialog\" tabindex=\"-1\" role=\"dialog\" aria-labelledby=\"${id}_title\">\n\t<div dojoAttachPoint=\"titleBar\" class=\"dojoxDialogTitleBar\">\n\t\t<span dojoAttachPoint=\"titleNode\" class=\"dojoxDialogTitle\" id=\"${id}_title\">${title}</span>\n\t</div>\n\t<div dojoAttachPoint=\"dojoxDialogWrapper\">\n\t\t<div dojoAttachPoint=\"containerNode\" class=\"dojoxDialogPaneContent\"></div>\n\t</div>\n\t<div dojoAttachPoint=\"closeButtonNode\" class=\"dojoxDialogCloseIcon\" dojoAttachEvent=\"onclick: onCancel\">\n\t\t\t<span dojoAttachPoint=\"closeText\" class=\"closeText\">x</span>\n\t</div>\n</div>\n"),sizeToViewport:false,viewportPadding:35,dimensions:null,easing:null,sizeDuration:dijit._defaultDuration,sizeMethod:"chain",showTitle:false,draggable:false,modal:false,constructor:function(_1,_2){
this.easing=_1.easing||dojo._defaultEasing;
this.dimensions=_1.dimensions||[300,300];
},_setup:function(){
this.inherited(arguments);
if(!this._alreadyInitialized){
this._navIn=dojo.fadeIn({node:this.closeButtonNode});
this._navOut=dojo.fadeOut({node:this.closeButtonNode});
if(!this.showTitle){
dojo.addClass(this.domNode,"dojoxDialogNoTitle");
}
}
},layout:function(e){
this._setSize();
this.inherited(arguments);
},_setSize:function(){
this._vp=dojo.window.getBox();
var tc=this.containerNode,_3=this.sizeToViewport;
return this._displaysize={w:_3?tc.scrollWidth:this.dimensions[0],h:_3?tc.scrollHeight:this.dimensions[1]};
},show:function(){
if(this.open){
return;
}
this._setSize();
dojo.style(this.closeButtonNode,"opacity",0);
dojo.style(this.domNode,{overflow:"hidden",opacity:0,width:"1px",height:"1px"});
dojo.style(this.containerNode,{opacity:0,overflow:"hidden"});
this.inherited(arguments);
if(this.modal){
this._modalconnects.push(dojo.connect(dojo.body(),"onkeypress",function(e){
if(e.charOrCode==dojo.keys.ESCAPE){
dojo.stopEvent(e);
}
}));
}else{
this._modalconnects.push(dojo.connect(dijit._underlay.domNode,"onclick",this,"onCancel"));
}
this._modalconnects.push(dojo.connect(this.domNode,"onmouseenter",this,"_handleNav"));
this._modalconnects.push(dojo.connect(this.domNode,"onmouseleave",this,"_handleNav"));
},_handleNav:function(e){
var _4="_navOut",_5="_navIn",_6=(e.type=="mouseout"?_5:_4),_7=(e.type=="mouseout"?_4:_5);
this[_6].stop();
this[_7].play();
},_position:function(){
if(!this._started){
return;
}
if(this._sizing){
this._sizing.stop();
this.disconnect(this._sizingConnect);
delete this._sizing;
}
this.inherited(arguments);
if(!this.open){
dojo.style(this.containerNode,"opacity",0);
}
var _8=this.viewportPadding*2;
var _9={node:this.domNode,duration:this.sizeDuration||dijit._defaultDuration,easing:this.easing,method:this.sizeMethod};
var ds=this._displaysize||this._setSize();
_9["width"]=ds.w=(ds.w+_8>=this._vp.w||this.sizeToViewport)?this._vp.w-_8:ds.w;
_9["height"]=ds.h=(ds.h+_8>=this._vp.h||this.sizeToViewport)?this._vp.h-_8:ds.h;
this._sizing=dojox.fx.sizeTo(_9);
this._sizingConnect=this.connect(this._sizing,"onEnd","_showContent");
this._sizing.play();
},_showContent:function(e){
var _a=this.containerNode;
dojo.style(this.domNode,{overflow:"visible",opacity:1});
dojo.style(this.closeButtonNode,"opacity",1);
dojo.style(_a,{height:this._displaysize.h-this.titleNode.offsetHeight+"px",width:this._displaysize.w+"px",overflow:"auto"});
dojo.anim(_a,{opacity:1});
}});
}
