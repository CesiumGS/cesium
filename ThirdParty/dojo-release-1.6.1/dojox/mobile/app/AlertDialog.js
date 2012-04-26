/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.AlertDialog"]){
dojo._hasResource["dojox.mobile.app.AlertDialog"]=true;
dojo.provide("dojox.mobile.app.AlertDialog");
dojo.experimental("dojox.mobile.app.AlertDialog");
dojo.require("dijit._WidgetBase");
dojo.declare("dojox.mobile.app.AlertDialog",dijit._WidgetBase,{title:"",text:"",controller:null,buttons:null,defaultButtonLabel:"OK",onChoose:null,constructor:function(){
this.onClick=dojo.hitch(this,this.onClick);
this._handleSelect=dojo.hitch(this,this._handleSelect);
},buildRendering:function(){
this.domNode=dojo.create("div",{"class":"alertDialog"});
var _1=dojo.create("div",{"class":"alertDialogBody"},this.domNode);
dojo.create("div",{"class":"alertTitle",innerHTML:this.title||""},_1);
dojo.create("div",{"class":"alertText",innerHTML:this.text||""},_1);
var _2=dojo.create("div",{"class":"alertBtns"},_1);
if(!this.buttons||this.buttons.length==0){
this.buttons=[{label:this.defaultButtonLabel,value:"ok","class":"affirmative"}];
}
var _3=this;
dojo.forEach(this.buttons,function(_4){
var _5=new dojox.mobile.Button({btnClass:_4["class"]||"",label:_4.label});
_5._dialogValue=_4.value;
dojo.place(_5.domNode,_2);
_3.connect(_5,"onClick",_3._handleSelect);
});
var _6=this.controller.getWindowSize();
this.mask=dojo.create("div",{"class":"dialogUnderlayWrapper",innerHTML:"<div class=\"dialogUnderlay\"></div>",style:{width:_6.w+"px",height:_6.h+"px"}},this.controller.assistant.domNode);
this.connect(this.mask,"onclick",function(){
_3.onChoose&&_3.onChoose();
_3.hide();
});
},postCreate:function(){
this.subscribe("/dojox/mobile/app/goback",this._handleSelect);
},_handleSelect:function(_7){
var _8;
if(_7&&_7.target){
_8=_7.target;
while(!dijit.byNode(_8)){
_8-_8.parentNode;
}
}
if(this.onChoose){
this.onChoose(_8?dijit.byNode(_8)._dialogValue:undefined);
}
this.hide();
},show:function(){
this._doTransition(1);
},hide:function(){
this._doTransition(-1);
},_doTransition:function(_9){
var _a;
var h=dojo.marginBox(this.domNode.firstChild).h;
var _b=this.controller.getWindowSize().h;
var _c=_b-h;
var _d=_b;
var _e=dojo.fx.slideTo({node:this.domNode,duration:400,top:{start:_9<0?_c:_d,end:_9<0?_d:_c}});
var _f=dojo[_9<0?"fadeOut":"fadeIn"]({node:this.mask,duration:400});
var _a=dojo.fx.combine([_e,_f]);
var _10=this;
dojo.connect(_a,"onEnd",this,function(){
if(_9<0){
_10.domNode.style.display="none";
dojo.destroy(_10.domNode);
dojo.destroy(_10.mask);
}
});
_a.play();
},destroy:function(){
this.inherited(arguments);
dojo.destroy(this.mask);
},onClick:function(){
}});
}
