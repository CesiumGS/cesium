/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.dnd.Avatar"]){
dojo._hasResource["dojox.layout.dnd.Avatar"]=true;
dojo.provide("dojox.layout.dnd.Avatar");
dojo.require("dojo.dnd.Avatar");
dojo.require("dojo.dnd.common");
dojo.declare("dojox.layout.dnd.Avatar",dojo.dnd.Avatar,{constructor:function(_1,_2){
this.opacity=_2||0.9;
},construct:function(){
var _3=this.manager.source,_4=_3.creator?_3._normalizedCreator(_3.getItem(this.manager.nodes[0].id).data,"avatar").node:this.manager.nodes[0].cloneNode(true);
dojo.addClass(_4,"dojoDndAvatar");
_4.id=dojo.dnd.getUniqueId();
_4.style.position="absolute";
_4.style.zIndex=1999;
_4.style.margin="0px";
_4.style.width=dojo.marginBox(_3.node).w+"px";
dojo.style(_4,"opacity",this.opacity);
this.node=_4;
},update:function(){
dojo.toggleClass(this.node,"dojoDndAvatarCanDrop",this.manager.canDropFlag);
},_generateText:function(){
}});
}
