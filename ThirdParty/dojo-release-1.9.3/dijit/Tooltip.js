//>>built
require({cache:{"url:dijit/templates/Tooltip.html":"<div class=\"dijitTooltip dijitTooltipLeft\" id=\"dojoTooltip\"\n\t><div class=\"dijitTooltipConnector\" data-dojo-attach-point=\"connectorNode\"></div\n\t><div class=\"dijitTooltipContainer dijitTooltipContents\" data-dojo-attach-point=\"containerNode\" role='alert'></div\n></div>\n"}});
define("dijit/Tooltip",["dojo/_base/array","dojo/_base/declare","dojo/_base/fx","dojo/dom","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/lang","dojo/mouse","dojo/on","dojo/sniff","./_base/manager","./place","./_Widget","./_TemplatedMixin","./BackgroundIframe","dojo/text!./templates/Tooltip.html","./main"],function(_1,_2,fx,_3,_4,_5,_6,_7,_8,on,_9,_a,_b,_c,_d,_e,_f,_10){
var _11=_2("dijit._MasterTooltip",[_c,_d],{duration:_a.defaultDuration,templateString:_f,postCreate:function(){
this.ownerDocumentBody.appendChild(this.domNode);
this.bgIframe=new _e(this.domNode);
this.fadeIn=fx.fadeIn({node:this.domNode,duration:this.duration,onEnd:_7.hitch(this,"_onShow")});
this.fadeOut=fx.fadeOut({node:this.domNode,duration:this.duration,onEnd:_7.hitch(this,"_onHide")});
},show:function(_12,_13,_14,rtl,_15){
if(this.aroundNode&&this.aroundNode===_13&&this.containerNode.innerHTML==_12){
return;
}
if(this.fadeOut.status()=="playing"){
this._onDeck=arguments;
return;
}
this.containerNode.innerHTML=_12;
if(_15){
this.set("textDir",_15);
}
this.containerNode.align=rtl?"right":"left";
var pos=_b.around(this.domNode,_13,_14&&_14.length?_14:_16.defaultPosition,!rtl,_7.hitch(this,"orient"));
var _17=pos.aroundNodePos;
if(pos.corner.charAt(0)=="M"&&pos.aroundCorner.charAt(0)=="M"){
this.connectorNode.style.top=_17.y+((_17.h-this.connectorNode.offsetHeight)>>1)-pos.y+"px";
this.connectorNode.style.left="";
}else{
if(pos.corner.charAt(1)=="M"&&pos.aroundCorner.charAt(1)=="M"){
this.connectorNode.style.left=_17.x+((_17.w-this.connectorNode.offsetWidth)>>1)-pos.x+"px";
}else{
this.connectorNode.style.left="";
this.connectorNode.style.top="";
}
}
_6.set(this.domNode,"opacity",0);
this.fadeIn.play();
this.isShowingNow=true;
this.aroundNode=_13;
},orient:function(_18,_19,_1a,_1b,_1c){
this.connectorNode.style.top="";
var _1d=_1b.h,_1e=_1b.w;
_18.className="dijitTooltip "+{"MR-ML":"dijitTooltipRight","ML-MR":"dijitTooltipLeft","TM-BM":"dijitTooltipAbove","BM-TM":"dijitTooltipBelow","BL-TL":"dijitTooltipBelow dijitTooltipABLeft","TL-BL":"dijitTooltipAbove dijitTooltipABLeft","BR-TR":"dijitTooltipBelow dijitTooltipABRight","TR-BR":"dijitTooltipAbove dijitTooltipABRight","BR-BL":"dijitTooltipRight","BL-BR":"dijitTooltipLeft"}[_19+"-"+_1a];
this.domNode.style.width="auto";
var _1f=_5.position(this.domNode);
if(_9("ie")==9){
_1f.w+=2;
}
var _20=Math.min((Math.max(_1e,1)),_1f.w);
_5.setMarginBox(this.domNode,{w:_20});
if(_1a.charAt(0)=="B"&&_19.charAt(0)=="B"){
var bb=_5.position(_18);
var _21=this.connectorNode.offsetHeight;
if(bb.h>_1d){
var _22=_1d-((_1c.h+_21)>>1);
this.connectorNode.style.top=_22+"px";
this.connectorNode.style.bottom="";
}else{
this.connectorNode.style.bottom=Math.min(Math.max(_1c.h/2-_21/2,0),bb.h-_21)+"px";
this.connectorNode.style.top="";
}
}else{
this.connectorNode.style.top="";
this.connectorNode.style.bottom="";
}
return Math.max(0,_1f.w-_1e);
},_onShow:function(){
if(_9("ie")){
this.domNode.style.filter="";
}
},hide:function(_23){
if(this._onDeck&&this._onDeck[1]==_23){
this._onDeck=null;
}else{
if(this.aroundNode===_23){
this.fadeIn.stop();
this.isShowingNow=false;
this.aroundNode=null;
this.fadeOut.play();
}else{
}
}
},_onHide:function(){
this.domNode.style.cssText="";
this.containerNode.innerHTML="";
if(this._onDeck){
this.show.apply(this,this._onDeck);
this._onDeck=null;
}
}});
if(_9("dojo-bidi")){
_11.extend({_setAutoTextDir:function(_24){
this.applyTextDir(_24);
_1.forEach(_24.children,function(_25){
this._setAutoTextDir(_25);
},this);
},_setTextDirAttr:function(_26){
this._set("textDir",_26);
if(_26=="auto"){
this._setAutoTextDir(this.containerNode);
}else{
this.containerNode.dir=this.textDir;
}
}});
}
_10.showTooltip=function(_27,_28,_29,rtl,_2a){
if(_29){
_29=_1.map(_29,function(val){
return {after:"after-centered",before:"before-centered"}[val]||val;
});
}
if(!_16._masterTT){
_10._masterTT=_16._masterTT=new _11();
}
return _16._masterTT.show(_27,_28,_29,rtl,_2a);
};
_10.hideTooltip=function(_2b){
return _16._masterTT&&_16._masterTT.hide(_2b);
};
var _16=_2("dijit.Tooltip",_c,{label:"",showDelay:400,connectId:[],position:[],selector:"",_setConnectIdAttr:function(_2c){
_1.forEach(this._connections||[],function(_2d){
_1.forEach(_2d,function(_2e){
_2e.remove();
});
},this);
this._connectIds=_1.filter(_7.isArrayLike(_2c)?_2c:(_2c?[_2c]:[]),function(id){
return _3.byId(id,this.ownerDocument);
},this);
this._connections=_1.map(this._connectIds,function(id){
var _2f=_3.byId(id,this.ownerDocument),_30=this.selector,_31=_30?function(_32){
return on.selector(_30,_32);
}:function(_33){
return _33;
},_34=this;
return [on(_2f,_31(_8.enter),function(){
_34._onHover(this);
}),on(_2f,_31("focusin"),function(){
_34._onHover(this);
}),on(_2f,_31(_8.leave),_7.hitch(_34,"_onUnHover")),on(_2f,_31("focusout"),_7.hitch(_34,"_onUnHover"))];
},this);
this._set("connectId",_2c);
},addTarget:function(_35){
var id=_35.id||_35;
if(_1.indexOf(this._connectIds,id)==-1){
this.set("connectId",this._connectIds.concat(id));
}
},removeTarget:function(_36){
var id=_36.id||_36,idx=_1.indexOf(this._connectIds,id);
if(idx>=0){
this._connectIds.splice(idx,1);
this.set("connectId",this._connectIds);
}
},buildRendering:function(){
this.inherited(arguments);
_4.add(this.domNode,"dijitTooltipData");
},startup:function(){
this.inherited(arguments);
var ids=this.connectId;
_1.forEach(_7.isArrayLike(ids)?ids:[ids],this.addTarget,this);
},getContent:function(_37){
return this.label||this.domNode.innerHTML;
},_onHover:function(_38){
if(!this._showTimer){
this._showTimer=this.defer(function(){
this.open(_38);
},this.showDelay);
}
},_onUnHover:function(){
if(this._showTimer){
this._showTimer.remove();
delete this._showTimer;
}
this.close();
},open:function(_39){
if(this._showTimer){
this._showTimer.remove();
delete this._showTimer;
}
var _3a=this.getContent(_39);
if(!_3a){
return;
}
_16.show(_3a,_39,this.position,!this.isLeftToRight(),this.textDir);
this._connectNode=_39;
this.onShow(_39,this.position);
},close:function(){
if(this._connectNode){
_16.hide(this._connectNode);
delete this._connectNode;
this.onHide();
}
if(this._showTimer){
this._showTimer.remove();
delete this._showTimer;
}
},onShow:function(){
},onHide:function(){
},destroy:function(){
this.close();
_1.forEach(this._connections||[],function(_3b){
_1.forEach(_3b,function(_3c){
_3c.remove();
});
},this);
this.inherited(arguments);
}});
_16._MasterTooltip=_11;
_16.show=_10.showTooltip;
_16.hide=_10.hideTooltip;
_16.defaultPosition=["after-centered","before-centered"];
return _16;
});
