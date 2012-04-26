/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.UpgradeBar"]){
dojo._hasResource["dojox.widget.UpgradeBar"]=true;
dojo.provide("dojox.widget.UpgradeBar");
dojo.require("dojo.window");
dojo.require("dojo.fx");
dojo.require("dojo.cookie");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.experimental("dojox.widget.UpgradeBar");
dojo.declare("dojox.widget.UpgradeBar",[dijit._Widget,dijit._Templated],{notifications:[],buttonCancel:"Close for now",noRemindButton:"Don't Remind Me Again",templateString:dojo.cache("dojox.widget","UpgradeBar/UpgradeBar.html","<div class=\"dojoxUpgradeBar\">\n\t<div class=\"dojoxUpgradeBarMessage\" dojoAttachPoint=\"messageNode\">message</div>\n\t<div class=\"dojoxUpgradeBarReminderButton\" dojoAttachPoint=\"dontRemindButtonNode\" dojoAttachEvent=\"onclick:_onDontRemindClick\">${noRemindButton}</div>\n\t<span dojoAttachPoint=\"closeButtonNode\" class=\"dojoxUpgradeBarCloseIcon\" dojoAttachEvent=\"onclick: hide, onmouseenter: _onCloseEnter, onmouseleave: _onCloseLeave\" title=\"${buttonCancel}\"></span>\n</div>\n"),constructor:function(_1,_2){
if(!_1.notifications&&_2){
dojo.forEach(_2.childNodes,function(n){
if(n.nodeType==1){
var _3=dojo.attr(n,"validate");
this.notifications.push({message:n.innerHTML,validate:function(){
var _4=true;
try{
_4=dojo.eval(_3);
}
catch(e){
}
return _4;
}});
}
},this);
}
},checkNotifications:function(){
if(!this.notifications.length){
return;
}
for(var i=0;i<this.notifications.length;i++){
var _5=this.notifications[i].validate();
if(_5){
this.notify(this.notifications[i].message);
break;
}
}
},postCreate:function(){
this.inherited(arguments);
if(this.domNode.parentNode){
dojo.style(this.domNode,"display","none");
}
dojo.mixin(this.attributeMap,{message:{node:"messageNode",type:"innerHTML"}});
if(!this.noRemindButton){
dojo.destroy(this.dontRemindButtonNode);
}
if(dojo.isIE==6){
var _6=this;
var _7=function(){
var v=dojo.window.getBox();
dojo.style(_6.domNode,"width",v.w+"px");
};
this.connect(window,"resize",function(){
_7();
});
_7();
}
dojo.addOnLoad(this,"checkNotifications");
},notify:function(_8){
if(dojo.cookie("disableUpgradeReminders")){
return;
}
if(!this.domNode.parentNode||!this.domNode.parentNode.innerHTML){
document.body.appendChild(this.domNode);
}
dojo.style(this.domNode,"display","");
if(_8){
this.set("message",_8);
}
},show:function(){
this._bodyMarginTop=dojo.style(dojo.body(),"marginTop");
this._size=dojo.contentBox(this.domNode).h;
dojo.style(this.domNode,{display:"block",height:0,opacity:0});
if(!this._showAnim){
this._showAnim=dojo.fx.combine([dojo.animateProperty({node:dojo.body(),duration:500,properties:{marginTop:this._bodyMarginTop+this._size}}),dojo.animateProperty({node:this.domNode,duration:500,properties:{height:this._size,opacity:1}})]);
}
this._showAnim.play();
},hide:function(){
if(!this._hideAnim){
this._hideAnim=dojo.fx.combine([dojo.animateProperty({node:dojo.body(),duration:500,properties:{marginTop:this._bodyMarginTop}}),dojo.animateProperty({node:this.domNode,duration:500,properties:{height:0,opacity:0}})]);
dojo.connect(this._hideAnim,"onEnd",this,function(){
dojo.style(this.domNode,"display","none");
});
}
this._hideAnim.play();
},_onDontRemindClick:function(){
dojo.cookie("disableUpgradeReminders",true,{expires:3650});
this.hide();
},_onCloseEnter:function(){
dojo.addClass(this.closeButtonNode,"dojoxUpgradeBarCloseIcon-hover");
},_onCloseLeave:function(){
dojo.removeClass(this.closeButtonNode,"dojoxUpgradeBarCloseIcon-hover");
}});
}
