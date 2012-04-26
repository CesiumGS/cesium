/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.dnd.Avatar"]){
dojo._hasResource["dojo.dnd.Avatar"]=true;
dojo.provide("dojo.dnd.Avatar");
dojo.require("dojo.dnd.common");
dojo.declare("dojo.dnd.Avatar",null,{constructor:function(_1){
this.manager=_1;
this.construct();
},construct:function(){
this.isA11y=dojo.hasClass(dojo.body(),"dijit_a11y");
var a=dojo.create("table",{"class":"dojoDndAvatar",style:{position:"absolute",zIndex:"1999",margin:"0px"}}),_2=this.manager.source,_3,b=dojo.create("tbody",null,a),tr=dojo.create("tr",null,b),td=dojo.create("td",null,tr),_4=this.isA11y?dojo.create("span",{id:"a11yIcon",innerHTML:this.manager.copy?"+":"<"},td):null,_5=dojo.create("span",{innerHTML:_2.generateText?this._generateText():""},td),k=Math.min(5,this.manager.nodes.length),i=0;
dojo.attr(tr,{"class":"dojoDndAvatarHeader",style:{opacity:0.9}});
for(;i<k;++i){
if(_2.creator){
_3=_2._normalizedCreator(_2.getItem(this.manager.nodes[i].id).data,"avatar").node;
}else{
_3=this.manager.nodes[i].cloneNode(true);
if(_3.tagName.toLowerCase()=="tr"){
var _6=dojo.create("table"),_7=dojo.create("tbody",null,_6);
_7.appendChild(_3);
_3=_6;
}
}
_3.id="";
tr=dojo.create("tr",null,b);
td=dojo.create("td",null,tr);
td.appendChild(_3);
dojo.attr(tr,{"class":"dojoDndAvatarItem",style:{opacity:(9-i)/10}});
}
this.node=a;
},destroy:function(){
dojo.destroy(this.node);
this.node=false;
},update:function(){
dojo[(this.manager.canDropFlag?"add":"remove")+"Class"](this.node,"dojoDndAvatarCanDrop");
if(this.isA11y){
var _8=dojo.byId("a11yIcon");
var _9="+";
if(this.manager.canDropFlag&&!this.manager.copy){
_9="< ";
}else{
if(!this.manager.canDropFlag&&!this.manager.copy){
_9="o";
}else{
if(!this.manager.canDropFlag){
_9="x";
}
}
}
_8.innerHTML=_9;
}
dojo.query(("tr.dojoDndAvatarHeader td span"+(this.isA11y?" span":"")),this.node).forEach(function(_a){
_a.innerHTML=this._generateText();
},this);
},_generateText:function(){
return this.manager.nodes.length.toString();
}});
}
