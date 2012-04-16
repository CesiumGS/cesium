/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.TabContainer"]){
dojo._hasResource["dojox.mobile.TabContainer"]=true;
dojo.provide("dojox.mobile.TabContainer");
dojo.require("dojox.mobile");
dojo.declare("dojox.mobile.TabContainer",dijit._WidgetBase,{iconBase:"",iconPos:"",fixedHeader:false,constructor:function(){
dojo.deprecated("dojox.mobile.TabContainer is deprecated","use dojox.mobile.TabBar instead",2);
},buildRendering:function(){
var _1=this.domNode=this.srcNodeRef;
_1.className="mblTabContainer";
var _2=this.tabHeaderNode=dojo.doc.createElement("DIV");
var _3=this.containerNode=dojo.doc.createElement("DIV");
for(var i=0,_4=_1.childNodes.length;i<_4;i++){
_3.appendChild(_1.removeChild(_1.firstChild));
}
_2.className="mblTabPanelHeader";
_2.align="center";
if(this.fixedHeader){
var _5=dijit.getEnclosingWidget(this.domNode.parentNode);
_5.domNode.insertBefore(_2,_5.domNode.firstChild);
dojo.style(_2,{position:"absolute",width:"100%",top:"0px",zIndex:"1"});
_5.fixedHeader=_2;
}else{
_1.appendChild(_2);
}
_3.className="mblTabPanelPane";
_1.appendChild(_3);
},startup:function(){
this.createTabButtons();
this.inherited(arguments);
},createTabButtons:function(){
var _6=dojo.doc.createElement("DIV");
_6.align="center";
var _7=dojo.doc.createElement("TABLE");
var _8=_7.insertRow(-1).insertCell(-1);
var _9=this.containerNode.childNodes;
for(var i=0;i<_9.length;i++){
var _a=_9[i];
if(_a.nodeType!=1){
continue;
}
var _b=dijit.byNode(_a);
if(_b.selected||!this._selectedPane){
this._selectedPane=_b;
}
_a.style.display="none";
var _c=dojo.doc.createElement("DIV");
_c.className="mblTabButton";
if(_b.icon){
var _d=dojo.create("DIV");
var _e=dojo.create("IMG");
_d.className="mblTabButtonImgDiv";
_e.src=_b.icon;
dojox.mobile.setupIcon(_e,_b.iconPos);
_d.appendChild(_e);
_c.appendChild(_d);
}
_c.appendChild(dojo.doc.createTextNode(_b.label));
_c.pane=_b;
_b.tab=_c;
this.connect(_c,"onclick","onTabClick");
_8.appendChild(_c);
}
_6.appendChild(_7);
this.tabHeaderNode.appendChild(_6);
this.selectTab(this._selectedPane.tab);
},selectTab:function(_f){
this._selectedPane.domNode.style.display="none";
dojo.removeClass(this._selectedPane.tab,"mblTabButtonSelected");
this._selectedPane=_f.pane;
this._selectedPane.domNode.style.display="";
dojo.addClass(_f,"mblTabButtonSelected");
if(dojo.isBB){
var ref=_f.nextSibling;
_f.parentNode.insertBefore(_f.parentNode.removeChild(_f),ref);
}
var _10=dijit.getEnclosingWidget(this.domNode.parentNode);
if(this.fixedHeader){
if(_10&&_10.scrollTo){
_10.scrollTo({y:0});
}
}
_10.flashScrollBar&&_10.flashScrollBar();
},onTabClick:function(e){
var tab=e.currentTarget;
dojo.addClass(tab,"mblTabButtonHighlighted");
setTimeout(function(){
dojo.removeClass(tab,"mblTabButtonHighlighted");
},200);
this.selectTab(tab);
}});
dojo.declare("dojox.mobile.TabPane",dijit._WidgetBase,{label:"",icon:"",iconPos:"",selected:false,inheritParams:function(){
var _11=this.getParentWidget();
if(_11){
if(!this.icon){
this.icon=_11.iconBase;
}
if(!this.iconPos){
this.iconPos=_11.iconPos;
}
}
},buildRendering:function(){
this.inheritParams();
this.domNode=this.containerNode=this.srcNodeRef||dojo.doc.createElement("DIV");
this.domNode.className="mblTabPane";
},getParentWidget:function(){
var ref=this.srcNodeRef||this.domNode;
return ref&&ref.parentNode?dijit.getEnclosingWidget(ref.parentNode):null;
}});
}
