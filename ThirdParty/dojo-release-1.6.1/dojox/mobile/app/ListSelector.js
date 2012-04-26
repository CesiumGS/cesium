/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.ListSelector"]){
dojo._hasResource["dojox.mobile.app.ListSelector"]=true;
dojo.provide("dojox.mobile.app.ListSelector");
dojo.experimental("dojox.mobile.app.ListSelector");
dojo.require("dojox.mobile.app._Widget");
dojo.require("dojo.fx");
dojo.declare("dojox.mobile.app.ListSelector",dojox.mobile.app._Widget,{data:null,controller:null,onChoose:null,destroyOnHide:false,_setDataAttr:function(_1){
this.data=_1;
if(this.data){
this.render();
}
},postCreate:function(){
dojo.addClass(this.domNode,"listSelector");
var _2=this;
this.connect(this.domNode,"onclick",function(_3){
if(!dojo.hasClass(_3.target,"listSelectorRow")){
return;
}
if(_2.onChoose){
_2.onChoose(_2.data[_3.target._idx].value);
}
_2.hide();
});
this.connect(this.domNode,"onmousedown",function(_4){
if(!dojo.hasClass(_4.target,"listSelectorRow")){
return;
}
dojo.addClass(_4.target,"listSelectorRow-selected");
});
this.connect(this.domNode,"onmouseup",function(_5){
if(!dojo.hasClass(_5.target,"listSelectorRow")){
return;
}
dojo.removeClass(_5.target,"listSelectorRow-selected");
});
this.connect(this.domNode,"onmouseout",function(_6){
if(!dojo.hasClass(_6.target,"listSelectorRow")){
return;
}
dojo.removeClass(_6.target,"listSelectorRow-selected");
});
var _7=this.controller.getWindowSize();
this.mask=dojo.create("div",{"class":"dialogUnderlayWrapper",innerHTML:"<div class=\"dialogUnderlay\"></div>"},this.controller.assistant.domNode);
this.connect(this.mask,"onclick",function(){
_2.onChoose&&_2.onChoose();
_2.hide();
});
},show:function(_8){
var _9;
var _a=this.controller.getWindowSize();
var _b;
if(_8){
_b=dojo._abs(_8);
_9=_b;
}else{
_9.x=_a.w/2;
_9.y=200;
}
dojo.style(this.domNode,{opacity:0,display:"",width:Math.floor(_a.w*0.8)+"px"});
var _c=0;
dojo.query(">",this.domNode).forEach(function(_d){
dojo.style(_d,{"float":"left"});
_c=Math.max(_c,dojo.marginBox(_d).w);
dojo.style(_d,{"float":"none"});
});
_c=Math.min(_c,Math.round(_a.w*0.8))+dojo.style(this.domNode,"paddingLeft")+dojo.style(this.domNode,"paddingRight")+1;
dojo.style(this.domNode,"width",_c+"px");
var _e=dojo.marginBox(this.domNode).h;
var _f=this;
var _10=_b?Math.max(30,_b.y-_e-10):this.getScroll().y+30;
var _11=dojo.animateProperty({node:this.domNode,duration:400,properties:{width:{start:1,end:_c},height:{start:1,end:_e},top:{start:_9.y,end:_10},left:{start:_9.x,end:(_a.w/2-_c/2)},opacity:{start:0,end:1},fontSize:{start:1}},onEnd:function(){
dojo.style(_f.domNode,"width","inherit");
}});
var _12=dojo.fadeIn({node:this.mask,duration:400});
dojo.fx.combine([_11,_12]).play();
},hide:function(){
var _13=this;
var _14=dojo.animateProperty({node:this.domNode,duration:500,properties:{width:{end:1},height:{end:1},opacity:{end:0},fontSize:{end:1}},onEnd:function(){
if(_13.get("destroyOnHide")){
_13.destroy();
}
}});
var _15=dojo.fadeOut({node:this.mask,duration:400});
dojo.fx.combine([_14,_15]).play();
},render:function(){
dojo.empty(this.domNode);
dojo.style(this.domNode,"opacity",0);
var row;
for(var i=0;i<this.data.length;i++){
row=dojo.create("div",{"class":"listSelectorRow "+(this.data[i].className||""),innerHTML:this.data[i].label},this.domNode);
row._idx=i;
if(i==0){
dojo.addClass(row,"first");
}
if(i==this.data.length-1){
dojo.addClass(row,"last");
}
}
},destroy:function(){
this.inherited(arguments);
dojo.destroy(this.mask);
}});
}
