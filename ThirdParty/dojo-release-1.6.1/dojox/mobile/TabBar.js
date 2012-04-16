/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.TabBar"]){
dojo._hasResource["dojox.mobile.TabBar"]=true;
dojo.provide("dojox.mobile.TabBar");
dojo.require("dojox.mobile");
dojo.declare("dojox.mobile.TabBar",dijit._WidgetBase,{iconBase:"",iconPos:"",barType:"tabBar",inHeading:false,_fixedButtonWidth:76,_fixedButtonMargin:17,_largeScreenWidth:500,buildRendering:function(){
this._clsName=this.barType=="segmentedControl"?"mblTabButton":"mblTabBarButton";
this.domNode=this.containerNode=this.srcNodeRef||dojo.doc.createElement("H1");
this.domNode.className=this.barType=="segmentedControl"?"mblTabPanelHeader":"mblTabBar";
},postCreate:function(){
if(dojo.global.onorientationchange!==undefined){
this.connect(dojo.global,"onorientationchange","onResize");
}else{
this.connect(dojo.global,"onresize","onResize");
}
},startup:function(){
var _1=this;
setTimeout(function(){
_1.onResize();
},0);
},onResize:function(){
var i;
var w=dojo.marginBox(this.domNode.parentNode).w;
var bw=this._fixedButtonWidth;
var bm=this._fixedButtonMargin;
var _2=this.containerNode.childNodes;
var _3=[];
for(i=0;i<_2.length;i++){
var c=_2[i];
if(c.nodeType!=1){
continue;
}
if(dojo.hasClass(c,this._clsName)){
_3.push(c);
}
}
var _4;
if(this.barType=="segmentedControl"){
_4=w;
var _5=0;
for(i=0;i<_3.length;i++){
_4-=dojo.marginBox(_3[i]).w;
_3[i].style.marginTop="3px";
_5+=_3[i].offsetWidth;
}
_4=Math.floor(_4/2);
var _6=dijit.getEnclosingWidget(this.domNode.parentNode);
var _7=this.inHeading||_6 instanceof dojox.mobile.Heading;
this.containerNode.style.padding="3px 0px 0px "+(_7?0:_4)+"px";
if(_7){
dojo.style(this.domNode,{background:"none",border:"none",width:_5+2+"px"});
}
}else{
_4=Math.floor((w-(bw+bm*2)*_3.length)/2);
if(w<this._largeScreenWidth||_4<0){
for(i=0;i<_3.length;i++){
_3[i].style.width=Math.round(98/_3.length)+"%";
_3[i].style.margin="0px";
}
this.containerNode.style.padding="0px 0px 0px 1%";
}else{
for(i=0;i<_3.length;i++){
_3[i].style.width=bw+"px";
_3[i].style.margin="0 "+bm+"px";
}
this.containerNode.style.padding="0px 0px 0px "+_4+"px";
}
}
}});
dojo.declare("dojox.mobile.TabBarButton",dojox.mobile.AbstractItem,{icon1:"",icon2:"",iconPos1:"",iconPos2:"",selected:false,transition:"none",tag:"LI",selectOne:true,inheritParams:function(){
var _8=this.getParentWidget();
this.parent=_8;
if(_8){
if(!this.transition){
this.transition=_8.transition;
}
if(!this.icon1){
this.icon1=_8.iconBase;
}
if(!this.iconPos1){
this.iconPos1=_8.iconPos;
}
if(!this.icon2){
this.icon2=_8.iconBase||this.icon1;
}
if(!this.iconPos2){
this.iconPos2=_8.iconPos||this.iconPos1;
}
}
},buildRendering:function(){
this.inheritParams();
this.anchorNode=dojo.create("A",{className:"mblTabBarButtonAnchor"});
var a=this.anchorNode;
this.connect(a,"onclick","onClick");
var _9=dojo.create("DIV",{className:"mblTabBarButtonDiv"},a);
var _a=dojo.create("DIV",{className:"mblTabBarButtonDiv mblTabBarButtonDivInner"},_9);
this.img1=dojo.create("IMG",{className:"mblTabBarButtonIcon",src:this.icon1},_a);
this.img1.style.visibility=this.selected?"hidden":"";
dojox.mobile.setupIcon(this.img1,this.iconPos1);
this.img1.onload=function(){
this.style.width=this.width+"px";
this.style.height=this.height+"px";
};
this.img2=dojo.create("IMG",{className:"mblTabBarButtonIcon",src:this.icon2},_a);
this.img2.style.visibility=this.selected?"":"hidden";
dojox.mobile.setupIcon(this.img2,this.iconPos2);
this.img2.onload=function(){
this.style.width=this.width+"px";
this.style.height=this.height+"px";
};
this.box=dojo.create("DIV",{className:"mblTabBarButtonTextBox"},a);
var _b=this.box;
var r=this.srcNodeRef;
if(r){
for(var i=0,_c=r.childNodes.length;i<_c;i++){
_b.appendChild(r.firstChild);
}
}
if(this.label){
_b.appendChild(dojo.doc.createTextNode(this.label));
}
this.domNode=this.srcNodeRef||dojo.create(this.tag);
this.containerNode=this.domNode;
var _d=this.parent?this.parent._clsName:"mblTabBarButton";
dojo.addClass(this.domNode,_d+(this.selected?" mblTabButtonSelected":""));
this.domNode.appendChild(a);
this.createDomButton(this.domNode,a);
},startup:function(){
var _e=this.getParentWidget();
this.parent=_e;
if(_e&&_e.barType=="segmentedControl"){
dojo.removeClass(this.domNode,"mblTabBarButton");
dojo.addClass(this.domNode,_e._clsName);
this.box.className="";
}
},select:function(_f){
if(_f){
this.selected=false;
dojo.removeClass(this.domNode,"mblTabButtonSelected");
}else{
this.selected=true;
dojo.addClass(this.domNode,"mblTabButtonSelected");
for(var i=0,c=this.domNode.parentNode.childNodes;i<c.length;i++){
if(c[i].nodeType!=1){
continue;
}
var w=dijit.byNode(c[i]);
if(w&&w!=this){
w.select(true);
}
}
}
this.img1.style.visibility=this.selected?"hidden":"";
this.img2.style.visibility=this.selected?"":"hidden";
},onClick:function(e){
this.defaultClickAction();
}});
}
