/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.ColorPicker"]){
dojo._hasResource["dojox.widget.ColorPicker"]=true;
dojo.provide("dojox.widget.ColorPicker");
dojo.experimental("dojox.widget.ColorPicker");
dojo.requireLocalization("dojox.widget","ColorPicker",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.requireLocalization("dojo.cldr","number",null,"ROOT,ar,ca,cs,da,de,el,en,en-au,en-gb,es,fi,fr,fr-ch,he,hu,it,ja,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-hant,zh-hk");
dojo.require("dijit.form._FormWidget");
dojo.require("dojo.dnd.move");
dojo.require("dojo.fx");
dojo.require("dojox.color");
dojo.require("dojo.i18n");
(function(d){
var _1=function(_2){
return _2;
};
dojo.declare("dojox.widget.ColorPicker",dijit.form._FormWidget,{showRgb:true,showHsv:true,showHex:true,webSafe:true,animatePoint:true,slideDuration:250,liveUpdate:false,PICKER_HUE_H:150,PICKER_SAT_VAL_H:150,PICKER_SAT_VAL_W:150,PICKER_HUE_SELECTOR_H:8,PICKER_SAT_SELECTOR_H:10,PICKER_SAT_SELECTOR_W:10,value:"#ffffff",_underlay:d.moduleUrl("dojox.widget","ColorPicker/images/underlay.png"),_hueUnderlay:d.moduleUrl("dojox.widget","ColorPicker/images/hue.png"),_pickerPointer:d.moduleUrl("dojox.widget","ColorPicker/images/pickerPointer.png"),_huePickerPointer:d.moduleUrl("dojox.widget","ColorPicker/images/hueHandle.png"),_huePickerPointerAlly:d.moduleUrl("dojox.widget","ColorPicker/images/hueHandleA11y.png"),templateString:dojo.cache("dojox.widget","ColorPicker/ColorPicker.html","<table class=\"dojoxColorPicker\" dojoAttachEvent=\"onkeypress: _handleKey\" cellpadding=\"0\" cellspacing=\"0\">\n\t<tr>\n\t\t<td valign=\"top\" class=\"dojoxColorPickerRightPad\">\n\t\t\t<div class=\"dojoxColorPickerBox\">\n\t\t\t\t<!-- Forcing ABS in style attr due to dojo DND issue with not picking it up form the class. -->\n\t\t\t\t<img role=\"status\" title=\"${saturationPickerTitle}\" alt=\"${saturationPickerTitle}\" class=\"dojoxColorPickerPoint\" src=\"${_pickerPointer}\" tabIndex=\"0\" dojoAttachPoint=\"cursorNode\" style=\"position: absolute; top: 0px; left: 0px;\">\n\t\t\t\t<img role=\"presentation\" alt=\"\" dojoAttachPoint=\"colorUnderlay\" dojoAttachEvent=\"onclick: _setPoint, onmousedown: _stopDrag\" class=\"dojoxColorPickerUnderlay\" src=\"${_underlay}\" ondragstart=\"return false\">\n\t\t\t</div>\n\t\t</td>\n\t\t<td valign=\"top\" class=\"dojoxColorPickerRightPad\">\n\t\t\t<div class=\"dojoxHuePicker\">\n\t\t\t\t<!-- Forcing ABS in style attr due to dojo DND issue with not picking it up form the class. -->\n\t\t\t\t<img role=\"status\" dojoAttachPoint=\"hueCursorNode\" tabIndex=\"0\" class=\"dojoxHuePickerPoint\" title=\"${huePickerTitle}\" alt=\"${huePickerTitle}\" src=\"${_huePickerPointer}\" style=\"position: absolute; top: 0px; left: 0px;\">\n\t\t\t\t<div class=\"dojoxHuePickerUnderlay\" dojoAttachPoint=\"hueNode\">\n\t\t\t\t    <img role=\"presentation\" alt=\"\" dojoAttachEvent=\"onclick: _setHuePoint, onmousedown: _stopDrag\" src=\"${_hueUnderlay}\">\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</td>\n\t\t<td valign=\"top\">\n\t\t\t<table cellpadding=\"0\" cellspacing=\"0\">\n\t\t\t\t<tr>\n\t\t\t\t\t<td valign=\"top\" class=\"dojoxColorPickerPreviewContainer\">\n\t\t\t\t\t\t<table cellpadding=\"0\" cellspacing=\"0\">\n\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t<td valign=\"top\" class=\"dojoxColorPickerRightPad\">\n\t\t\t\t\t\t\t\t\t<div dojoAttachPoint=\"previewNode\" class=\"dojoxColorPickerPreview\"></div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t<td valign=\"top\">\n\t\t\t\t\t\t\t\t\t<div dojoAttachPoint=\"safePreviewNode\" class=\"dojoxColorPickerWebSafePreview\"></div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t</table>\n\t\t\t\t\t</td>\n\t\t\t\t</tr>\n\t\t\t\t<tr>\n\t\t\t\t\t<td valign=\"bottom\">\n\t\t\t\t\t\t<table class=\"dojoxColorPickerOptional\" cellpadding=\"0\" cellspacing=\"0\">\n\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t<td>\n\t\t\t\t\t\t\t\t\t<div class=\"dijitInline dojoxColorPickerRgb\" dojoAttachPoint=\"rgbNode\">\n\t\t\t\t\t\t\t\t\t\t<table cellpadding=\"1\" cellspacing=\"1\">\n\t\t\t\t\t\t\t\t\t\t<tr><td><label for=\"${_uId}_r\">${redLabel}</label></td><td><input id=\"${_uId}_r\" dojoAttachPoint=\"Rval\" size=\"1\" dojoAttachEvent=\"onchange: _colorInputChange\"></td></tr>\n\t\t\t\t\t\t\t\t\t\t<tr><td><label for=\"${_uId}_g\">${greenLabel}</label></td><td><input id=\"${_uId}_g\" dojoAttachPoint=\"Gval\" size=\"1\" dojoAttachEvent=\"onchange: _colorInputChange\"></td></tr>\n\t\t\t\t\t\t\t\t\t\t<tr><td><label for=\"${_uId}_b\">${blueLabel}</label></td><td><input id=\"${_uId}_b\" dojoAttachPoint=\"Bval\" size=\"1\" dojoAttachEvent=\"onchange: _colorInputChange\"></td></tr>\n\t\t\t\t\t\t\t\t\t\t</table>\n\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t<td>\n\t\t\t\t\t\t\t\t\t<div class=\"dijitInline dojoxColorPickerHsv\" dojoAttachPoint=\"hsvNode\">\n\t\t\t\t\t\t\t\t\t\t<table cellpadding=\"1\" cellspacing=\"1\">\n\t\t\t\t\t\t\t\t\t\t<tr><td><label for=\"${_uId}_h\">${hueLabel}</label></td><td><input id=\"${_uId}_h\" dojoAttachPoint=\"Hval\"size=\"1\" dojoAttachEvent=\"onchange: _colorInputChange\"> ${degLabel}</td></tr>\n\t\t\t\t\t\t\t\t\t\t<tr><td><label for=\"${_uId}_s\">${saturationLabel}</label></td><td><input id=\"${_uId}_s\" dojoAttachPoint=\"Sval\" size=\"1\" dojoAttachEvent=\"onchange: _colorInputChange\"> ${percentSign}</td></tr>\n\t\t\t\t\t\t\t\t\t\t<tr><td><label for=\"${_uId}_v\">${valueLabel}</label></td><td><input id=\"${_uId}_v\" dojoAttachPoint=\"Vval\" size=\"1\" dojoAttachEvent=\"onchange: _colorInputChange\"> ${percentSign}</td></tr>\n\t\t\t\t\t\t\t\t\t\t</table>\n\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t<td colspan=\"2\">\n\t\t\t\t\t\t\t\t\t<div class=\"dojoxColorPickerHex\" dojoAttachPoint=\"hexNode\" aria-live=\"polite\">\t\n\t\t\t\t\t\t\t\t\t\t<label for=\"${_uId}_hex\">&nbsp;${hexLabel}&nbsp;</label><input id=\"${_uId}_hex\" dojoAttachPoint=\"hexCode, focusNode, valueNode\" size=\"6\" class=\"dojoxColorPickerHexCode\" dojoAttachEvent=\"onchange: _colorInputChange\">\n\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t</table>\n\t\t\t\t\t</td>\n\t\t\t\t</tr>\n\t\t\t</table>\n\t\t</td>\n\t</tr>\n</table>\n\n"),postMixInProperties:function(){
if(dojo.hasClass(dojo.body(),"dijit_a11y")){
this._huePickerPointer=this._huePickerPointerAlly;
}
this._uId=dijit.getUniqueId(this.id);
dojo.mixin(this,dojo.i18n.getLocalization("dojox.widget","ColorPicker"));
dojo.mixin(this,dojo.i18n.getLocalization("dojo.cldr","number"));
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
if(d.isIE<7){
this.colorUnderlay.style.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+this._underlay+"', sizingMethod='scale')";
this.colorUnderlay.src=this._blankGif.toString();
}
if(!this.showRgb){
this.rgbNode.style.visibility="hidden";
}
if(!this.showHsv){
this.hsvNode.style.visibility="hidden";
}
if(!this.showHex){
this.hexNode.style.visibility="hidden";
}
if(!this.webSafe){
this.safePreviewNode.style.visibility="hidden";
}
},startup:function(){
if(this._started){
return;
}
this._started=true;
this.set("value",this.value);
this._mover=new d.dnd.move.boxConstrainedMoveable(this.cursorNode,{box:{t:-(this.PICKER_SAT_SELECTOR_H/2),l:-(this.PICKER_SAT_SELECTOR_W/2),w:this.PICKER_SAT_VAL_W,h:this.PICKER_SAT_VAL_H}});
this._hueMover=new d.dnd.move.boxConstrainedMoveable(this.hueCursorNode,{box:{t:-(this.PICKER_HUE_SELECTOR_H/2),l:0,w:0,h:this.PICKER_HUE_H}});
this._subs=[];
this._subs.push(d.subscribe("/dnd/move/stop",d.hitch(this,"_clearTimer")));
this._subs.push(d.subscribe("/dnd/move/start",d.hitch(this,"_setTimer")));
this._keyListeners=[];
this._connects.push(dijit.typematic.addKeyListener(this.hueCursorNode,{charOrCode:dojo.keys.UP_ARROW,shiftKey:false,metaKey:false,ctrlKey:false,altKey:false},this,dojo.hitch(this,this._updateHueCursorNode),25,25));
this._connects.push(dijit.typematic.addKeyListener(this.hueCursorNode,{charOrCode:dojo.keys.DOWN_ARROW,shiftKey:false,metaKey:false,ctrlKey:false,altKey:false},this,dojo.hitch(this,this._updateHueCursorNode),25,25));
this._connects.push(dijit.typematic.addKeyListener(this.cursorNode,{charOrCode:dojo.keys.UP_ARROW,shiftKey:false,metaKey:false,ctrlKey:false,altKey:false},this,dojo.hitch(this,this._updateCursorNode),25,25));
this._connects.push(dijit.typematic.addKeyListener(this.cursorNode,{charOrCode:dojo.keys.DOWN_ARROW,shiftKey:false,metaKey:false,ctrlKey:false,altKey:false},this,dojo.hitch(this,this._updateCursorNode),25,25));
this._connects.push(dijit.typematic.addKeyListener(this.cursorNode,{charOrCode:dojo.keys.LEFT_ARROW,shiftKey:false,metaKey:false,ctrlKey:false,altKey:false},this,dojo.hitch(this,this._updateCursorNode),25,25));
this._connects.push(dijit.typematic.addKeyListener(this.cursorNode,{charOrCode:dojo.keys.RIGHT_ARROW,shiftKey:false,metaKey:false,ctrlKey:false,altKey:false},this,dojo.hitch(this,this._updateCursorNode),25,25));
},_setValueAttr:function(_3){
if(!this._started){
return;
}
this.setColor(_3,true);
},setColor:function(_4,_5){
var _6=dojox.color.fromString(_4);
this._updatePickerLocations(_6);
this._updateColorInputs(_6);
this._updateValue(_6,_5);
},_setTimer:function(_7){
dijit.focus(_7.node);
d.setSelectable(this.domNode,false);
this._timer=setInterval(d.hitch(this,"_updateColor"),45);
},_clearTimer:function(_8){
clearInterval(this._timer);
this._timer=null;
this.onChange(this.value);
d.setSelectable(this.domNode,true);
},_setHue:function(h){
d.style(this.colorUnderlay,"backgroundColor",dojox.color.fromHsv(h,100,100).toHex());
},_updateHueCursorNode:function(_9,_a,e){
if(_9!==-1){
var y=dojo.style(this.hueCursorNode,"top");
var _b=(this.PICKER_HUE_SELECTOR_H/2);
y+=_b;
var _c=false;
if(e.charOrCode==dojo.keys.UP_ARROW){
if(y>0){
y-=1;
_c=true;
}
}else{
if(e.charOrCode==dojo.keys.DOWN_ARROW){
if(y<this.PICKER_HUE_H){
y+=1;
_c=true;
}
}
}
y-=_b;
if(_c){
dojo.style(this.hueCursorNode,"top",y+"px");
}
}else{
this._updateColor(true);
}
},_updateCursorNode:function(_d,_e,e){
var _f=this.PICKER_SAT_SELECTOR_H/2;
var _10=this.PICKER_SAT_SELECTOR_W/2;
if(_d!==-1){
var y=dojo.style(this.cursorNode,"top");
var x=dojo.style(this.cursorNode,"left");
y+=_f;
x+=_10;
var _11=false;
if(e.charOrCode==dojo.keys.UP_ARROW){
if(y>0){
y-=1;
_11=true;
}
}else{
if(e.charOrCode==dojo.keys.DOWN_ARROW){
if(y<this.PICKER_SAT_VAL_H){
y+=1;
_11=true;
}
}else{
if(e.charOrCode==dojo.keys.LEFT_ARROW){
if(x>0){
x-=1;
_11=true;
}
}else{
if(e.charOrCode==dojo.keys.RIGHT_ARROW){
if(x<this.PICKER_SAT_VAL_W){
x+=1;
_11=true;
}
}
}
}
}
if(_11){
y-=_f;
x-=_10;
dojo.style(this.cursorNode,"top",y+"px");
dojo.style(this.cursorNode,"left",x+"px");
}
}else{
this._updateColor(true);
}
},_updateColor:function(){
var _12=this.PICKER_HUE_SELECTOR_H/2,_13=this.PICKER_SAT_SELECTOR_H/2,_14=this.PICKER_SAT_SELECTOR_W/2;
var _15=d.style(this.hueCursorNode,"top")+_12,_16=d.style(this.cursorNode,"top")+_13,_17=d.style(this.cursorNode,"left")+_14,h=Math.round(360-(_15/this.PICKER_HUE_H*360)),col=dojox.color.fromHsv(h,_17/this.PICKER_SAT_VAL_W*100,100-(_16/this.PICKER_SAT_VAL_H*100));
this._updateColorInputs(col);
this._updateValue(col,true);
if(h!=this._hue){
this._setHue(h);
}
},_colorInputChange:function(e){
var col,_18=false;
switch(e.target){
case this.hexCode:
col=dojox.color.fromString(e.target.value);
_18=true;
break;
case this.Rval:
case this.Gval:
case this.Bval:
col=dojox.color.fromArray([this.Rval.value,this.Gval.value,this.Bval.value]);
_18=true;
break;
case this.Hval:
case this.Sval:
case this.Vval:
col=dojox.color.fromHsv(this.Hval.value,this.Sval.value,this.Vval.value);
_18=true;
break;
}
if(_18){
this._updatePickerLocations(col);
this._updateColorInputs(col);
this._updateValue(col,true);
}
},_updateValue:function(col,_19){
var hex=col.toHex();
this.value=this.valueNode.value=hex;
if(_19&&(!this._timer||this.liveUpdate)){
this.onChange(hex);
}
},_updatePickerLocations:function(col){
var _1a=this.PICKER_HUE_SELECTOR_H/2,_1b=this.PICKER_SAT_SELECTOR_H/2,_1c=this.PICKER_SAT_SELECTOR_W/2;
var hsv=col.toHsv(),_1d=Math.round(this.PICKER_HUE_H-hsv.h/360*this.PICKER_HUE_H)-_1a,_1e=Math.round(hsv.s/100*this.PICKER_SAT_VAL_W)-_1c,_1f=Math.round(this.PICKER_SAT_VAL_H-hsv.v/100*this.PICKER_SAT_VAL_H)-_1b;
if(this.animatePoint){
d.fx.slideTo({node:this.hueCursorNode,duration:this.slideDuration,top:_1d,left:0}).play();
d.fx.slideTo({node:this.cursorNode,duration:this.slideDuration,top:_1f,left:_1e}).play();
}else{
d.style(this.hueCursorNode,"top",_1d+"px");
d.style(this.cursorNode,{left:_1e+"px",top:_1f+"px"});
}
if(hsv.h!=this._hue){
this._setHue(hsv.h);
}
},_updateColorInputs:function(col){
var hex=col.toHex();
if(this.showRgb){
this.Rval.value=col.r;
this.Gval.value=col.g;
this.Bval.value=col.b;
}
if(this.showHsv){
var hsv=col.toHsv();
this.Hval.value=Math.round((hsv.h));
this.Sval.value=Math.round(hsv.s);
this.Vval.value=Math.round(hsv.v);
}
if(this.showHex){
this.hexCode.value=hex;
}
this.previewNode.style.backgroundColor=hex;
if(this.webSafe){
this.safePreviewNode.style.backgroundColor=_1(hex);
}
},_setHuePoint:function(evt){
var _20=(this.PICKER_HUE_SELECTOR_H/2);
var _21=evt.layerY-_20;
if(this.animatePoint){
d.fx.slideTo({node:this.hueCursorNode,duration:this.slideDuration,top:_21,left:0,onEnd:d.hitch(this,function(){
this._updateColor(true);
dijit.focus(this.hueCursorNode);
})}).play();
}else{
d.style(this.hueCursorNode,"top",_21+"px");
this._updateColor(false);
}
},_setPoint:function(evt){
var _22=this.PICKER_SAT_SELECTOR_H/2;
var _23=this.PICKER_SAT_SELECTOR_W/2;
var _24=evt.layerY-_22;
var _25=evt.layerX-_23;
if(evt){
dijit.focus(evt.target);
}
if(this.animatePoint){
d.fx.slideTo({node:this.cursorNode,duration:this.slideDuration,top:_24,left:_25,onEnd:d.hitch(this,function(){
this._updateColor(true);
dijit.focus(this.cursorNode);
})}).play();
}else{
d.style(this.cursorNode,{left:_25+"px",top:_24+"px"});
this._updateColor(false);
}
},_handleKey:function(e){
},focus:function(){
if(!this._focused){
dijit.focus(this.focusNode);
}
},_stopDrag:function(e){
dojo.stopEvent(e);
},destroy:function(){
this.inherited(arguments);
dojo.forEach(this._subs,function(sub){
dojo.unsubscribe(sub);
});
delete this._subs;
}});
})(dojo);
}
