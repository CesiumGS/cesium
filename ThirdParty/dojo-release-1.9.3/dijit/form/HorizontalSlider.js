//>>built
require({cache:{"url:dijit/form/templates/HorizontalSlider.html":"<table class=\"dijit dijitReset dijitSlider dijitSliderH\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" rules=\"none\" data-dojo-attach-event=\"onkeydown:_onKeyDown, onkeyup:_onKeyUp\"\n\trole=\"presentation\"\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t\t><td data-dojo-attach-point=\"topDecoration\" class=\"dijitReset dijitSliderDecoration dijitSliderDecorationT dijitSliderDecorationH\"></td\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset dijitSliderButtonContainer dijitSliderButtonContainerH\"\n\t\t\t><div class=\"dijitSliderDecrementIconH\" style=\"display:none\" data-dojo-attach-point=\"decrementButton\"><span class=\"dijitSliderButtonInner\">-</span></div\n\t\t></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><div class=\"dijitSliderBar dijitSliderBumper dijitSliderBumperH dijitSliderLeftBumper\" data-dojo-attach-event=\"press:_onClkDecBumper\"></div\n\t\t></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><input data-dojo-attach-point=\"valueNode\" type=\"hidden\" ${!nameAttrSetting}\n\t\t\t/><div class=\"dijitReset dijitSliderBarContainerH\" role=\"presentation\" data-dojo-attach-point=\"sliderBarContainer\"\n\t\t\t\t><div role=\"presentation\" data-dojo-attach-point=\"progressBar\" class=\"dijitSliderBar dijitSliderBarH dijitSliderProgressBar dijitSliderProgressBarH\" data-dojo-attach-event=\"press:_onBarClick\"\n\t\t\t\t\t><div class=\"dijitSliderMoveable dijitSliderMoveableH\"\n\t\t\t\t\t\t><div data-dojo-attach-point=\"sliderHandle,focusNode\" class=\"dijitSliderImageHandle dijitSliderImageHandleH\" data-dojo-attach-event=\"press:_onHandleClick\" role=\"slider\"></div\n\t\t\t\t\t></div\n\t\t\t\t></div\n\t\t\t\t><div role=\"presentation\" data-dojo-attach-point=\"remainingBar\" class=\"dijitSliderBar dijitSliderBarH dijitSliderRemainingBar dijitSliderRemainingBarH\" data-dojo-attach-event=\"press:_onBarClick\"></div\n\t\t\t></div\n\t\t></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><div class=\"dijitSliderBar dijitSliderBumper dijitSliderBumperH dijitSliderRightBumper\" data-dojo-attach-event=\"press:_onClkIncBumper\"></div\n\t\t></td\n\t\t><td class=\"dijitReset dijitSliderButtonContainer dijitSliderButtonContainerH\"\n\t\t\t><div class=\"dijitSliderIncrementIconH\" style=\"display:none\" data-dojo-attach-point=\"incrementButton\"><span class=\"dijitSliderButtonInner\">+</span></div\n\t\t></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t\t><td data-dojo-attach-point=\"containerNode,bottomDecoration\" class=\"dijitReset dijitSliderDecoration dijitSliderDecorationB dijitSliderDecorationH\"></td\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t></tr\n></table>\n"}});
define("dijit/form/HorizontalSlider",["dojo/_base/array","dojo/_base/declare","dojo/dnd/move","dojo/_base/fx","dojo/dom-geometry","dojo/dom-style","dojo/keys","dojo/_base/lang","dojo/sniff","dojo/dnd/Moveable","dojo/dnd/Mover","dojo/query","dojo/mouse","dojo/on","../_base/manager","../focus","../typematic","./Button","./_FormValueWidget","../_Container","dojo/text!./templates/HorizontalSlider.html"],function(_1,_2,_3,fx,_4,_5,_6,_7,_8,_9,_a,_b,_c,on,_d,_e,_f,_10,_11,_12,_13){
var _14=_2("dijit.form._SliderMover",_a,{onMouseMove:function(e){
var _15=this.widget;
var _16=_15._abspos;
if(!_16){
_16=_15._abspos=_4.position(_15.sliderBarContainer,true);
_15._setPixelValue_=_7.hitch(_15,"_setPixelValue");
_15._isReversed_=_15._isReversed();
}
var _17=e[_15._mousePixelCoord]-_16[_15._startingPixelCoord];
_15._setPixelValue_(_15._isReversed_?(_16[_15._pixelCount]-_17):_17,_16[_15._pixelCount],false);
},destroy:function(e){
_a.prototype.destroy.apply(this,arguments);
var _18=this.widget;
_18._abspos=null;
_18._setValueAttr(_18.value,true);
}});
var _19=_2("dijit.form.HorizontalSlider",[_11,_12],{templateString:_13,value:0,showButtons:true,minimum:0,maximum:100,discreteValues:Infinity,pageIncrement:2,clickSelect:true,slideDuration:_d.defaultDuration,_setIdAttr:"",_setNameAttr:"valueNode",baseClass:"dijitSlider",cssStateNodes:{incrementButton:"dijitSliderIncrementButton",decrementButton:"dijitSliderDecrementButton",focusNode:"dijitSliderThumb"},_mousePixelCoord:"pageX",_pixelCount:"w",_startingPixelCoord:"x",_handleOffsetCoord:"left",_progressPixelSize:"width",_onKeyUp:function(e){
if(this.disabled||this.readOnly||e.altKey||e.ctrlKey||e.metaKey){
return;
}
this._setValueAttr(this.value,true);
},_onKeyDown:function(e){
if(this.disabled||this.readOnly||e.altKey||e.ctrlKey||e.metaKey){
return;
}
switch(e.keyCode){
case _6.HOME:
this._setValueAttr(this.minimum,false);
break;
case _6.END:
this._setValueAttr(this.maximum,false);
break;
case ((this._descending||this.isLeftToRight())?_6.RIGHT_ARROW:_6.LEFT_ARROW):
case (this._descending===false?_6.DOWN_ARROW:_6.UP_ARROW):
case (this._descending===false?_6.PAGE_DOWN:_6.PAGE_UP):
this.increment(e);
break;
case ((this._descending||this.isLeftToRight())?_6.LEFT_ARROW:_6.RIGHT_ARROW):
case (this._descending===false?_6.UP_ARROW:_6.DOWN_ARROW):
case (this._descending===false?_6.PAGE_UP:_6.PAGE_DOWN):
this.decrement(e);
break;
default:
return;
}
e.stopPropagation();
e.preventDefault();
},_onHandleClick:function(e){
if(this.disabled||this.readOnly){
return;
}
if(!_8("ie")){
_e.focus(this.sliderHandle);
}
e.stopPropagation();
e.preventDefault();
},_isReversed:function(){
return !this.isLeftToRight();
},_onBarClick:function(e){
if(this.disabled||this.readOnly||!this.clickSelect){
return;
}
_e.focus(this.sliderHandle);
e.stopPropagation();
e.preventDefault();
var _1a=_4.position(this.sliderBarContainer,true);
var _1b=e[this._mousePixelCoord]-_1a[this._startingPixelCoord];
this._setPixelValue(this._isReversed()?(_1a[this._pixelCount]-_1b):_1b,_1a[this._pixelCount],true);
this._movable.onMouseDown(e);
},_setPixelValue:function(_1c,_1d,_1e){
if(this.disabled||this.readOnly){
return;
}
var _1f=this.discreteValues;
if(_1f<=1||_1f==Infinity){
_1f=_1d;
}
_1f--;
var _20=_1d/_1f;
var _21=Math.round(_1c/_20);
this._setValueAttr(Math.max(Math.min((this.maximum-this.minimum)*_21/_1f+this.minimum,this.maximum),this.minimum),_1e);
},_setValueAttr:function(_22,_23){
this._set("value",_22);
this.valueNode.value=_22;
this.focusNode.setAttribute("aria-valuenow",_22);
this.inherited(arguments);
var _24=(_22-this.minimum)/(this.maximum-this.minimum);
var _25=(this._descending===false)?this.remainingBar:this.progressBar;
var _26=(this._descending===false)?this.progressBar:this.remainingBar;
if(this._inProgressAnim&&this._inProgressAnim.status!="stopped"){
this._inProgressAnim.stop(true);
}
if(_23&&this.slideDuration>0&&_25.style[this._progressPixelSize]){
var _27=this;
var _28={};
var _29=parseFloat(_25.style[this._progressPixelSize]);
var _2a=this.slideDuration*(_24-_29/100);
if(_2a==0){
return;
}
if(_2a<0){
_2a=0-_2a;
}
_28[this._progressPixelSize]={start:_29,end:_24*100,units:"%"};
this._inProgressAnim=fx.animateProperty({node:_25,duration:_2a,onAnimate:function(v){
_26.style[_27._progressPixelSize]=(100-parseFloat(v[_27._progressPixelSize]))+"%";
},onEnd:function(){
delete _27._inProgressAnim;
},properties:_28});
this._inProgressAnim.play();
}else{
_25.style[this._progressPixelSize]=(_24*100)+"%";
_26.style[this._progressPixelSize]=((1-_24)*100)+"%";
}
},_bumpValue:function(_2b,_2c){
if(this.disabled||this.readOnly){
return;
}
var s=_5.getComputedStyle(this.sliderBarContainer);
var c=_4.getContentBox(this.sliderBarContainer,s);
var _2d=this.discreteValues;
if(_2d<=1||_2d==Infinity){
_2d=c[this._pixelCount];
}
_2d--;
var _2e=(this.value-this.minimum)*_2d/(this.maximum-this.minimum)+_2b;
if(_2e<0){
_2e=0;
}
if(_2e>_2d){
_2e=_2d;
}
_2e=_2e*(this.maximum-this.minimum)/_2d+this.minimum;
this._setValueAttr(_2e,_2c);
},_onClkBumper:function(val){
if(this.disabled||this.readOnly||!this.clickSelect){
return;
}
this._setValueAttr(val,true);
},_onClkIncBumper:function(){
this._onClkBumper(this._descending===false?this.minimum:this.maximum);
},_onClkDecBumper:function(){
this._onClkBumper(this._descending===false?this.maximum:this.minimum);
},decrement:function(e){
this._bumpValue(e.keyCode==_6.PAGE_DOWN?-this.pageIncrement:-1);
},increment:function(e){
this._bumpValue(e.keyCode==_6.PAGE_UP?this.pageIncrement:1);
},_mouseWheeled:function(evt){
evt.stopPropagation();
evt.preventDefault();
this._bumpValue(evt.wheelDelta<0?-1:1,true);
},startup:function(){
if(this._started){
return;
}
_1.forEach(this.getChildren(),function(_2f){
if(this[_2f.container]!=this.containerNode){
this[_2f.container].appendChild(_2f.domNode);
}
},this);
this.inherited(arguments);
},_typematicCallback:function(_30,_31,e){
if(_30==-1){
this._setValueAttr(this.value,true);
}else{
this[(_31==(this._descending?this.incrementButton:this.decrementButton))?"decrement":"increment"](e);
}
},buildRendering:function(){
this.inherited(arguments);
if(this.showButtons){
this.incrementButton.style.display="";
this.decrementButton.style.display="";
}
var _32=_b("label[for=\""+this.id+"\"]");
if(_32.length){
if(!_32[0].id){
_32[0].id=this.id+"_label";
}
this.focusNode.setAttribute("aria-labelledby",_32[0].id);
}
this.focusNode.setAttribute("aria-valuemin",this.minimum);
this.focusNode.setAttribute("aria-valuemax",this.maximum);
},postCreate:function(){
this.inherited(arguments);
if(this.showButtons){
this.own(_f.addMouseListener(this.decrementButton,this,"_typematicCallback",25,500),_f.addMouseListener(this.incrementButton,this,"_typematicCallback",25,500));
}
this.own(on(this.domNode,_c.wheel,_7.hitch(this,"_mouseWheeled")));
var _33=_2(_14,{widget:this});
this._movable=new _9(this.sliderHandle,{mover:_33});
this._layoutHackIE7();
},destroy:function(){
this._movable.destroy();
if(this._inProgressAnim&&this._inProgressAnim.status!="stopped"){
this._inProgressAnim.stop(true);
}
this.inherited(arguments);
}});
_19._Mover=_14;
return _19;
});
