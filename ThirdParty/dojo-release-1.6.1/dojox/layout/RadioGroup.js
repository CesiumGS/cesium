/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.RadioGroup"]){
dojo._hasResource["dojox.layout.RadioGroup"]=true;
dojo.provide("dojox.layout.RadioGroup");
dojo.experimental("dojox.layout.RadioGroup");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Contained");
dojo.require("dijit.layout.StackContainer");
dojo.require("dojo.fx.easing");
dojo.declare("dojox.layout.RadioGroup",[dijit.layout.StackContainer,dijit._Templated],{duration:750,hasButtons:false,buttonClass:"dojox.layout._RadioButton",templateString:"<div class=\"dojoxRadioGroup\">"+" \t<div dojoAttachPoint=\"buttonHolder\" style=\"display:none;\">"+"\t\t<table class=\"dojoxRadioButtons\"><tbody><tr class=\"dojoxRadioButtonRow\" dojoAttachPoint=\"buttonNode\"></tr></tbody></table>"+"\t</div>"+"\t<div class=\"dojoxRadioView\" dojoAttachPoint=\"containerNode\"></div>"+"</div>",startup:function(){
this.inherited(arguments);
this._children=this.getChildren();
this._buttons=this._children.length;
this._size=dojo.coords(this.containerNode);
if(this.hasButtons){
dojo.style(this.buttonHolder,"display","block");
}
},_setupChild:function(_1){
dojo.style(_1.domNode,"position","absolute");
if(this.hasButtons){
var _2=this.buttonNode.appendChild(dojo.create("td"));
var n=dojo.create("div",null,_2),_3=dojo.getObject(this.buttonClass),_4=new _3({label:_1.title,page:_1},n);
dojo.mixin(_1,{_radioButton:_4});
_4.startup();
}
_1.domNode.style.display="none";
},removeChild:function(_5){
if(this.hasButtons&&_5._radioButton){
_5._radioButton.destroy();
delete _5._radioButton;
}
this.inherited(arguments);
},_transition:function(_6,_7){
this._showChild(_6);
if(_7){
this._hideChild(_7);
}
if(this.doLayout&&_6.resize){
_6.resize(this._containerContentBox||this._contentBox);
}
},_showChild:function(_8){
var _9=this.getChildren();
_8.isFirstChild=(_8==_9[0]);
_8.isLastChild=(_8==_9[_9.length-1]);
_8.selected=true;
_8.domNode.style.display="";
if(_8._onShow){
_8._onShow();
}else{
if(_8.onShow){
_8.onShow();
}
}
},_hideChild:function(_a){
_a.selected=false;
_a.domNode.style.display="none";
if(_a.onHide){
_a.onHide();
}
}});
dojo.declare("dojox.layout.RadioGroupFade",dojox.layout.RadioGroup,{_hideChild:function(_b){
dojo.fadeOut({node:_b.domNode,duration:this.duration,onEnd:dojo.hitch(this,"inherited",arguments,arguments)}).play();
},_showChild:function(_c){
this.inherited(arguments);
dojo.style(_c.domNode,"opacity",0);
dojo.fadeIn({node:_c.domNode,duration:this.duration}).play();
}});
dojo.declare("dojox.layout.RadioGroupSlide",dojox.layout.RadioGroup,{easing:"dojo.fx.easing.backOut",zTop:99,constructor:function(){
if(dojo.isString(this.easing)){
this.easing=dojo.getObject(this.easing);
}
},_positionChild:function(_d){
if(!this._size){
return;
}
var rA=true,rB=true;
switch(_d.slideFrom){
case "bottom":
rB=!rB;
break;
case "right":
rA=!rA;
rB=!rB;
break;
case "top":
break;
case "left":
rA=!rA;
break;
default:
rA=Math.round(Math.random());
rB=Math.round(Math.random());
break;
}
var _e=rA?"top":"left",_f=(rB?"-":"")+(this._size[rA?"h":"w"]+20)+"px";
dojo.style(_d.domNode,_e,_f);
},_showChild:function(_10){
var _11=this.getChildren();
_10.isFirstChild=(_10==_11[0]);
_10.isLastChild=(_10==_11[_11.length-1]);
_10.selected=true;
dojo.style(_10.domNode,{zIndex:this.zTop,display:""});
if(this._anim&&this._anim.status()=="playing"){
this._anim.gotoPercent(100,true);
}
this._anim=dojo.animateProperty({node:_10.domNode,properties:{left:0,top:0},duration:this.duration,easing:this.easing,onEnd:dojo.hitch(_10,function(){
if(this.onShow){
this.onShow();
}
if(this._onShow){
this._onShow();
}
}),beforeBegin:dojo.hitch(this,"_positionChild",_10)});
this._anim.play();
},_hideChild:function(_12){
_12.selected=false;
_12.domNode.style.zIndex=this.zTop-1;
if(_12.onHide){
_12.onHide();
}
}});
dojo.declare("dojox.layout._RadioButton",[dijit._Widget,dijit._Templated,dijit._Contained],{label:"",page:null,templateString:"<div dojoAttachPoint=\"focusNode\" class=\"dojoxRadioButton\"><span dojoAttachPoint=\"titleNode\" class=\"dojoxRadioButtonLabel\">${label}</span></div>",startup:function(){
this.connect(this.domNode,"onmouseenter","_onMouse");
},_onMouse:function(e){
this.getParent().selectChild(this.page);
this._clearSelected();
dojo.addClass(this.domNode,"dojoxRadioButtonSelected");
},_clearSelected:function(){
dojo.query(".dojoxRadioButtonSelected",this.domNode.parentNode.parentNode).removeClass("dojoxRadioButtonSelected");
}});
dojo.extend(dijit._Widget,{slideFrom:"random"});
}
