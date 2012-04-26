/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Tooltip"]){
dojo._hasResource["dijit.Tooltip"]=true;
dojo.provide("dijit.Tooltip");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dijit._MasterTooltip",[dijit._Widget,dijit._Templated],{duration:dijit.defaultDuration,templateString:dojo.cache("dijit","templates/Tooltip.html","<div class=\"dijitTooltip dijitTooltipLeft\" id=\"dojoTooltip\"\n\t><div class=\"dijitTooltipContainer dijitTooltipContents\" dojoAttachPoint=\"containerNode\" role='alert'></div\n\t><div class=\"dijitTooltipConnector\" dojoAttachPoint=\"connectorNode\"></div\n></div>\n"),postCreate:function(){
dojo.body().appendChild(this.domNode);
this.bgIframe=new dijit.BackgroundIframe(this.domNode);
this.fadeIn=dojo.fadeIn({node:this.domNode,duration:this.duration,onEnd:dojo.hitch(this,"_onShow")});
this.fadeOut=dojo.fadeOut({node:this.domNode,duration:this.duration,onEnd:dojo.hitch(this,"_onHide")});
},show:function(_1,_2,_3,_4){
if(this.aroundNode&&this.aroundNode===_2){
return;
}
this.domNode.width="auto";
if(this.fadeOut.status()=="playing"){
this._onDeck=arguments;
return;
}
this.containerNode.innerHTML=_1;
var _5=dijit.placeOnScreenAroundElement(this.domNode,_2,dijit.getPopupAroundAlignment((_3&&_3.length)?_3:dijit.Tooltip.defaultPosition,!_4),dojo.hitch(this,"orient"));
dojo.style(this.domNode,"opacity",0);
this.fadeIn.play();
this.isShowingNow=true;
this.aroundNode=_2;
},orient:function(_6,_7,_8,_9,_a){
this.connectorNode.style.top="";
var _b=_9.w-this.connectorNode.offsetWidth;
_6.className="dijitTooltip "+{"BL-TL":"dijitTooltipBelow dijitTooltipABLeft","TL-BL":"dijitTooltipAbove dijitTooltipABLeft","BR-TR":"dijitTooltipBelow dijitTooltipABRight","TR-BR":"dijitTooltipAbove dijitTooltipABRight","BR-BL":"dijitTooltipRight","BL-BR":"dijitTooltipLeft"}[_7+"-"+_8];
this.domNode.style.width="auto";
var _c=dojo.contentBox(this.domNode);
var _d=Math.min((Math.max(_b,1)),_c.w);
var _e=_d<_c.w;
this.domNode.style.width=_d+"px";
if(_e){
this.containerNode.style.overflow="auto";
var _f=this.containerNode.scrollWidth;
this.containerNode.style.overflow="visible";
if(_f>_d){
_f=_f+dojo.style(this.domNode,"paddingLeft")+dojo.style(this.domNode,"paddingRight");
this.domNode.style.width=_f+"px";
}
}
if(_8.charAt(0)=="B"&&_7.charAt(0)=="B"){
var mb=dojo.marginBox(_6);
var _10=this.connectorNode.offsetHeight;
if(mb.h>_9.h){
var _11=_9.h-(_a.h/2)-(_10/2);
this.connectorNode.style.top=_11+"px";
this.connectorNode.style.bottom="";
}else{
this.connectorNode.style.bottom=Math.min(Math.max(_a.h/2-_10/2,0),mb.h-_10)+"px";
this.connectorNode.style.top="";
}
}else{
this.connectorNode.style.top="";
this.connectorNode.style.bottom="";
}
return Math.max(0,_c.w-_b);
},_onShow:function(){
if(dojo.isIE){
this.domNode.style.filter="";
}
},hide:function(_12){
if(this._onDeck&&this._onDeck[1]==_12){
this._onDeck=null;
}else{
if(this.aroundNode===_12){
this.fadeIn.stop();
this.isShowingNow=false;
this.aroundNode=null;
this.fadeOut.play();
}else{
}
}
},_onHide:function(){
this.domNode.style.cssText="";
this.containerNode.innerHTML="";
if(this._onDeck){
this.show.apply(this,this._onDeck);
this._onDeck=null;
}
}});
dijit.showTooltip=function(_13,_14,_15,rtl){
if(!dijit._masterTT){
dijit._masterTT=new dijit._MasterTooltip();
}
return dijit._masterTT.show(_13,_14,_15,rtl);
};
dijit.hideTooltip=function(_16){
if(!dijit._masterTT){
dijit._masterTT=new dijit._MasterTooltip();
}
return dijit._masterTT.hide(_16);
};
dojo.declare("dijit.Tooltip",dijit._Widget,{label:"",showDelay:400,connectId:[],position:[],_setConnectIdAttr:function(_17){
dojo.forEach(this._connections||[],function(_18){
dojo.forEach(_18,dojo.hitch(this,"disconnect"));
},this);
var ary=dojo.isArrayLike(_17)?_17:(_17?[_17]:[]);
this._connections=dojo.map(ary,function(id){
var _19=dojo.byId(id);
return _19?[this.connect(_19,"onmouseenter","_onTargetMouseEnter"),this.connect(_19,"onmouseleave","_onTargetMouseLeave"),this.connect(_19,"onfocus","_onTargetFocus"),this.connect(_19,"onblur","_onTargetBlur")]:[];
},this);
this._set("connectId",_17);
this._connectIds=ary;
},addTarget:function(_1a){
var id=_1a.id||_1a;
if(dojo.indexOf(this._connectIds,id)==-1){
this.set("connectId",this._connectIds.concat(id));
}
},removeTarget:function(_1b){
var id=_1b.id||_1b,idx=dojo.indexOf(this._connectIds,id);
if(idx>=0){
this._connectIds.splice(idx,1);
this.set("connectId",this._connectIds);
}
},buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitTooltipData");
},startup:function(){
this.inherited(arguments);
var ids=this.connectId;
dojo.forEach(dojo.isArrayLike(ids)?ids:[ids],this.addTarget,this);
},_onTargetMouseEnter:function(e){
this._onHover(e);
},_onTargetMouseLeave:function(e){
this._onUnHover(e);
},_onTargetFocus:function(e){
this._focus=true;
this._onHover(e);
},_onTargetBlur:function(e){
this._focus=false;
this._onUnHover(e);
},_onHover:function(e){
if(!this._showTimer){
var _1c=e.target;
this._showTimer=setTimeout(dojo.hitch(this,function(){
this.open(_1c);
}),this.showDelay);
}
},_onUnHover:function(e){
if(this._focus){
return;
}
if(this._showTimer){
clearTimeout(this._showTimer);
delete this._showTimer;
}
this.close();
},open:function(_1d){
if(this._showTimer){
clearTimeout(this._showTimer);
delete this._showTimer;
}
dijit.showTooltip(this.label||this.domNode.innerHTML,_1d,this.position,!this.isLeftToRight());
this._connectNode=_1d;
this.onShow(_1d,this.position);
},close:function(){
if(this._connectNode){
dijit.hideTooltip(this._connectNode);
delete this._connectNode;
this.onHide();
}
if(this._showTimer){
clearTimeout(this._showTimer);
delete this._showTimer;
}
},onShow:function(_1e,_1f){
},onHide:function(){
},uninitialize:function(){
this.close();
this.inherited(arguments);
}});
dijit.Tooltip.defaultPosition=["after","before"];
}
