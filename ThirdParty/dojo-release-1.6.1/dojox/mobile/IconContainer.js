/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.IconContainer"]){
dojo._hasResource["dojox.mobile.IconContainer"]=true;
dojo.provide("dojox.mobile.IconContainer");
dojo.require("dojox.mobile");
dojo.declare("dojox.mobile.IconContainer",dijit._WidgetBase,{defaultIcon:"",transition:"below",pressedIconOpacity:0.4,iconBase:"",iconPos:"",back:"Home",label:"My Application",single:false,buildRendering:function(){
this.domNode=this.containerNode=this.srcNodeRef||dojo.doc.createElement("UL");
this.domNode.className="mblIconContainer";
var t=this._terminator=dojo.create("LI");
t.className="mblIconItemTerminator";
t.innerHTML="&nbsp;";
this.domNode.appendChild(t);
},_setupSubNodes:function(ul){
var _1=this.domNode.childNodes.length-1;
for(i=0;i<_1;i++){
child=this.domNode.childNodes[i];
if(child.nodeType!=1){
continue;
}
w=dijit.byNode(child);
if(this.single){
w.subNode.firstChild.style.display="none";
}
ul.appendChild(w.subNode);
}
},startup:function(){
var ul,i,_2,_3,w;
if(this.transition=="below"){
this._setupSubNodes(this.domNode);
}else{
var _4=new dojox.mobile.View({id:this.id+"_mblApplView"});
var _5=this;
_4.onAfterTransitionIn=function(_6,_7,_8,_9,_a){
_5._opening._open_1();
};
_4.domNode.style.visibility="hidden";
var _b=_4._heading=new dojox.mobile.Heading({back:this.back,label:this.label,moveTo:this.domNode.parentNode.id,transition:this.transition});
_4.addChild(_b);
ul=dojo.doc.createElement("UL");
ul.className="mblIconContainer";
ul.style.marginTop="0px";
this._setupSubNodes(ul);
_4.domNode.appendChild(ul);
dojo.doc.body.appendChild(_4.domNode);
_b.startup();
}
},closeAll:function(){
var _c=this.domNode.childNodes.length;
for(var i=0;i<_c;i++){
child=this.domNode.childNodes[i];
if(child.nodeType!=1){
continue;
}
if(child==this._terminator){
break;
}
w=dijit.byNode(child);
w.containerNode.parentNode.style.display="none";
w.setOpacity(w.iconNode,1);
}
},addChild:function(_d){
this.domNode.insertBefore(_d.domNode,this._terminator);
_d.transition=this.transition;
if(this.transition=="below"){
this.domNode.appendChild(_d.subNode);
}
_d.inheritParams();
_d.setIcon();
}});
dojo.declare("dojox.mobile.IconItem",dojox.mobile.AbstractItem,{lazy:false,requires:"",timeout:10,templateString:"<li class=\"mblIconItem\">"+"<div class=\"mblIconArea\" dojoAttachPoint=\"iconDivNode\">"+"<div><img src=\"${icon}\" dojoAttachPoint=\"iconNode\"></div>${label}"+"</div>"+"</li>",templateStringSub:"<li class=\"mblIconItemSub\" lazy=\"${lazy}\" style=\"display:none;\" dojoAttachPoint=\"contentNode\">"+"<h2 class=\"mblIconContentHeading\" dojoAttachPoint=\"closeNode\">"+"<div class=\"mblBlueMinusButton\" style=\"position:absolute;left:4px;top:2px;\" dojoAttachPoint=\"closeIconNode\"><div></div></div>${label}"+"</h2>"+"<div class=\"mblContent\" dojoAttachPoint=\"containerNode\"></div>"+"</li>",createTemplate:function(s){
dojo.forEach(["lazy","icon","label"],function(v){
while(s.indexOf("${"+v+"}")!=-1){
s=s.replace("${"+v+"}",this[v]);
}
},this);
var _e=dojo.doc.createElement("DIV");
_e.innerHTML=s;
var _f=_e.getElementsByTagName("*");
var i,len,s1;
len=_f.length;
for(i=0;i<len;i++){
s1=_f[i].getAttribute("dojoAttachPoint");
if(s1){
this[s1]=_f[i];
}
}
var _10=_e.removeChild(_e.firstChild);
_e=null;
return _10;
},buildRendering:function(){
this.inheritParams();
this.domNode=this.createTemplate(this.templateString);
this.subNode=this.createTemplate(this.templateStringSub);
this.subNode._parentNode=this.domNode;
if(this.srcNodeRef){
for(var i=0,len=this.srcNodeRef.childNodes.length;i<len;i++){
this.containerNode.appendChild(this.srcNodeRef.removeChild(this.srcNodeRef.firstChild));
}
this.srcNodeRef.parentNode.replaceChild(this.domNode,this.srcNodeRef);
this.srcNodeRef=null;
}
this.setIcon();
},setIcon:function(){
this.iconNode.src=this.icon;
dojox.mobile.setupIcon(this.iconNode,this.iconPos);
},postCreate:function(){
this.connect(this.iconNode,"onmousedown","onMouseDownIcon");
this.connect(this.iconNode,"onclick","iconClicked");
this.connect(this.closeIconNode,"onclick","closeIconClicked");
this.connect(this.iconNode,"onerror","onError");
},highlight:function(){
dojo.addClass(this.iconDivNode,"mblVibrate");
if(this.timeout>0){
var _11=this;
setTimeout(function(){
_11.unhighlight();
},this.timeout*1000);
}
},unhighlight:function(){
dojo.removeClass(this.iconDivNode,"mblVibrate");
},setOpacity:function(_12,val){
_12.style.opacity=val;
_12.style.mozOpacity=val;
_12.style.khtmlOpacity=val;
_12.style.webkitOpacity=val;
},instantiateWidget:function(e){
var _13=this.containerNode.getElementsByTagName("*");
var len=_13.length;
var s;
for(var i=0;i<len;i++){
s=_13[i].getAttribute("dojoType");
if(s){
dojo["require"](s);
}
}
if(len>0){
(dojox.mobile.parser||dojo.parser).parse(this.containerNode);
}
this.lazy=false;
},isOpen:function(e){
return this.containerNode.style.display!="none";
},onMouseDownIcon:function(e){
this.setOpacity(this.iconNode,this.getParentWidget().pressedIconOpacity);
},iconClicked:function(e){
if(e){
setTimeout(dojo.hitch(this,function(d){
this.iconClicked();
}),0);
return;
}
if(this.moveTo||this.href||this.url){
this.transitionTo(this.moveTo,this.href,this.url);
setTimeout(dojo.hitch(this,function(d){
this.setOpacity(this.iconNode,1);
}),1500);
}else{
this.open();
}
},closeIconClicked:function(e){
if(e){
setTimeout(dojo.hitch(this,function(d){
this.closeIconClicked();
}),0);
return;
}
this.close();
},open:function(){
var _14=this.getParentWidget();
if(this.transition=="below"){
if(_14.single){
_14.closeAll();
this.setOpacity(this.iconNode,this.getParentWidget().pressedIconOpacity);
}
this._open_1();
}else{
_14._opening=this;
if(_14.single){
_14.closeAll();
var _15=dijit.byId(_14.id+"_mblApplView");
_15._heading.setLabel(this.label);
}
this.transitionTo(_14.id+"_mblApplView");
}
},_open_1:function(){
this.contentNode.style.display="";
this.unhighlight();
if(this.lazy){
if(this.requires){
dojo.forEach(this.requires.split(/,/),function(c){
dojo["require"](c);
});
}
this.instantiateWidget();
}
this.contentNode.scrollIntoView();
this.onOpen();
},close:function(){
if(dojo.isWebKit){
var t=this.domNode.parentNode.offsetWidth/8;
var y=this.iconNode.offsetLeft;
var pos=0;
for(var i=1;i<=3;i++){
if(t*(2*i-1)<y&&y<=t*(2*(i+1)-1)){
pos=i;
break;
}
}
dojo.addClass(this.containerNode.parentNode,"mblCloseContent mblShrink"+pos);
}else{
this.containerNode.parentNode.style.display="none";
}
this.setOpacity(this.iconNode,1);
this.onClose();
},onOpen:function(){
},onClose:function(){
},onError:function(){
this.iconNode.src=this.getParentWidget().defaultIcon;
}});
}
