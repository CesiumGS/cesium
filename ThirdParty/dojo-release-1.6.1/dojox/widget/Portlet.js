/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Portlet"]){
dojo._hasResource["dojox.widget.Portlet"]=true;
dojo.experimental("dojox.widget.Portlet");
dojo.provide("dojox.widget.Portlet");
dojo.require("dijit.TitlePane");
dojo.require("dojo.fx");
dojo.declare("dojox.widget.Portlet",[dijit.TitlePane,dijit._Container],{resizeChildren:true,closable:true,_parents:null,_size:null,dragRestriction:false,buildRendering:function(){
this.inherited(arguments);
dojo.style(this.domNode,"visibility","hidden");
},postCreate:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dojoxPortlet");
dojo.removeClass(this.arrowNode,"dijitArrowNode");
dojo.addClass(this.arrowNode,"dojoxPortletIcon dojoxArrowDown");
dojo.addClass(this.titleBarNode,"dojoxPortletTitle");
dojo.addClass(this.hideNode,"dojoxPortletContentOuter");
dojo.addClass(this.domNode,"dojoxPortlet-"+(!this.dragRestriction?"movable":"nonmovable"));
var _1=this;
if(this.resizeChildren){
this.subscribe("/dnd/drop",function(){
_1._updateSize();
});
this.subscribe("/Portlet/sizechange",function(_2){
_1.onSizeChange(_2);
});
this.connect(window,"onresize",function(){
_1._updateSize();
});
var _3=dojo.hitch(this,function(id,_4){
var _5=dijit.byId(id);
if(_5.selectChild){
var s=this.subscribe(id+"-selectChild",function(_6){
var n=_1.domNode.parentNode;
while(n){
if(n==_6.domNode){
_1.unsubscribe(s);
_1._updateSize();
break;
}
n=n.parentNode;
}
});
var _7=dijit.byId(_4);
if(_5&&_7){
_1._parents.push({parent:_5,child:_7});
}
}
});
var _8;
this._parents=[];
for(var p=this.domNode.parentNode;p!=null;p=p.parentNode){
var id=p.getAttribute?p.getAttribute("widgetId"):null;
if(id){
_3(id,_8);
_8=id;
}
}
}
this.connect(this.titleBarNode,"onmousedown",function(_9){
if(dojo.hasClass(_9.target,"dojoxPortletIcon")){
dojo.stopEvent(_9);
return false;
}
return true;
});
this.connect(this._wipeOut,"onEnd",function(){
_1._publish();
});
this.connect(this._wipeIn,"onEnd",function(){
_1._publish();
});
if(this.closable){
this.closeIcon=this._createIcon("dojoxCloseNode","dojoxCloseNodeHover",dojo.hitch(this,"onClose"));
dojo.style(this.closeIcon,"display","");
}
},startup:function(){
if(this._started){
return;
}
var _a=this.getChildren();
this._placeSettingsWidgets();
dojo.forEach(_a,function(_b){
try{
if(!_b.started&&!_b._started){
_b.startup();
}
}
catch(e){
}
});
this.inherited(arguments);
dojo.style(this.domNode,"visibility","visible");
},_placeSettingsWidgets:function(){
dojo.forEach(this.getChildren(),dojo.hitch(this,function(_c){
if(_c.portletIconClass&&_c.toggle&&!_c.attr("portlet")){
this._createIcon(_c.portletIconClass,_c.portletIconHoverClass,dojo.hitch(_c,"toggle"));
dojo.place(_c.domNode,this.containerNode,"before");
_c.attr("portlet",this);
this._settingsWidget=_c;
}
}));
},_createIcon:function(_d,_e,fn){
var _f=dojo.create("div",{"class":"dojoxPortletIcon "+_d,"waiRole":"presentation"});
dojo.place(_f,this.arrowNode,"before");
this.connect(_f,"onclick",fn);
if(_e){
this.connect(_f,"onmouseover",function(){
dojo.addClass(_f,_e);
});
this.connect(_f,"onmouseout",function(){
dojo.removeClass(_f,_e);
});
}
return _f;
},onClose:function(evt){
dojo.style(this.domNode,"display","none");
},onSizeChange:function(_10){
if(_10==this){
return;
}
this._updateSize();
},_updateSize:function(){
if(!this.open||!this._started||!this.resizeChildren){
return;
}
if(this._timer){
clearTimeout(this._timer);
}
this._timer=setTimeout(dojo.hitch(this,function(){
var _11={w:dojo.style(this.domNode,"width"),h:dojo.style(this.domNode,"height")};
for(var i=0;i<this._parents.length;i++){
var p=this._parents[i];
var sel=p.parent.selectedChildWidget;
if(sel&&sel!=p.child){
return;
}
}
if(this._size){
if(this._size.w==_11.w&&this._size.h==_11.h){
return;
}
}
this._size=_11;
var fns=["resize","layout"];
this._timer=null;
var _12=this.getChildren();
dojo.forEach(_12,function(_13){
for(var i=0;i<fns.length;i++){
if(dojo.isFunction(_13[fns[i]])){
try{
_13[fns[i]]();
}
catch(e){
}
break;
}
}
});
this.onUpdateSize();
}),100);
},onUpdateSize:function(){
},_publish:function(){
dojo.publish("/Portlet/sizechange",[this]);
},_onTitleClick:function(evt){
if(evt.target==this.arrowNode){
this.inherited(arguments);
}
},addChild:function(_14){
this._size=null;
this.inherited(arguments);
if(this._started){
this._placeSettingsWidgets();
this._updateSize();
}
if(this._started&&!_14.started&&!_14._started){
_14.startup();
}
},destroyDescendants:function(_15){
this.inherited(arguments);
if(this._settingsWidget){
this._settingsWidget.destroyRecursive(_15);
}
},destroy:function(){
if(this._timer){
clearTimeout(this._timer);
}
this.inherited(arguments);
},_setCss:function(){
this.inherited(arguments);
dojo.style(this.arrowNode,"display",this.toggleable?"":"none");
}});
dojo.declare("dojox.widget.PortletSettings",[dijit._Container,dijit.layout.ContentPane],{portletIconClass:"dojoxPortletSettingsIcon",portletIconHoverClass:"dojoxPortletSettingsIconHover",postCreate:function(){
dojo.style(this.domNode,"display","none");
dojo.addClass(this.domNode,"dojoxPortletSettingsContainer");
dojo.removeClass(this.domNode,"dijitContentPane");
},_setPortletAttr:function(_16){
this.portlet=_16;
},toggle:function(){
var n=this.domNode;
if(dojo.style(n,"display")=="none"){
dojo.style(n,{"display":"block","height":"1px","width":"auto"});
dojo.fx.wipeIn({node:n}).play();
}else{
dojo.fx.wipeOut({node:n,onEnd:dojo.hitch(this,function(){
dojo.style(n,{"display":"none","height":"","width":""});
})}).play();
}
}});
dojo.declare("dojox.widget.PortletDialogSettings",dojox.widget.PortletSettings,{dimensions:null,constructor:function(_17,_18){
this.dimensions=_17.dimensions||[300,100];
},toggle:function(){
if(!this.dialog){
dojo["require"]("dijit.Dialog");
this.dialog=new dijit.Dialog({title:this.title});
dojo.body().appendChild(this.dialog.domNode);
this.dialog.containerNode.appendChild(this.domNode);
dojo.style(this.dialog.domNode,{"width":this.dimensions[0]+"px","height":this.dimensions[1]+"px"});
dojo.style(this.domNode,"display","");
}
if(this.dialog.open){
this.dialog.hide();
}else{
this.dialog.show(this.domNode);
}
}});
}
