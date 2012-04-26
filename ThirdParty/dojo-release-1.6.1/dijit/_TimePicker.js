/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._TimePicker"]){
dojo._hasResource["dijit._TimePicker"]=true;
dojo.provide("dijit._TimePicker");
dojo.require("dijit.form._FormWidget");
dojo.require("dojo.date.locale");
dojo.declare("dijit._TimePicker",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dijit","templates/TimePicker.html","<div id=\"widget_${id}\" class=\"dijitMenu\"\n    ><div dojoAttachPoint=\"upArrow\" class=\"dijitButtonNode dijitUpArrowButton\" dojoAttachEvent=\"onmouseenter:_buttonMouse,onmouseleave:_buttonMouse\"\n\t\t><div class=\"dijitReset dijitInline dijitArrowButtonInner\" role=\"presentation\">&nbsp;</div\n\t\t><div class=\"dijitArrowButtonChar\">&#9650;</div></div\n    ><div dojoAttachPoint=\"timeMenu,focusNode\" dojoAttachEvent=\"onclick:_onOptionSelected,onmouseover,onmouseout\"></div\n    ><div dojoAttachPoint=\"downArrow\" class=\"dijitButtonNode dijitDownArrowButton\" dojoAttachEvent=\"onmouseenter:_buttonMouse,onmouseleave:_buttonMouse\"\n\t\t><div class=\"dijitReset dijitInline dijitArrowButtonInner\" role=\"presentation\">&nbsp;</div\n\t\t><div class=\"dijitArrowButtonChar\">&#9660;</div></div\n></div>\n"),baseClass:"dijitTimePicker",clickableIncrement:"T00:15:00",visibleIncrement:"T01:00:00",visibleRange:"T05:00:00",value:new Date(),_visibleIncrement:2,_clickableIncrement:1,_totalIncrements:10,constraints:{},serialize:dojo.date.stamp.toISOString,setValue:function(_1){
dojo.deprecated("dijit._TimePicker:setValue() is deprecated.  Use set('value', ...) instead.","","2.0");
this.set("value",_1);
},_setValueAttr:function(_2){
this._set("value",_2);
this._showText();
},_setFilterStringAttr:function(_3){
this._set("filterString",_3);
this._showText();
},isDisabledDate:function(_4,_5){
return false;
},_getFilteredNodes:function(_6,_7,_8,_9){
var _a=[],_b=_9?_9.date:this._refDate,n,i=_6,_c=this._maxIncrement+Math.abs(i),_d=_8?-1:1,_e=_8?1:0,_f=1-_e;
do{
i=i-_e;
n=this._createOption(i);
if(n){
if((_8&&n.date>_b)||(!_8&&n.date<_b)){
break;
}
_a[_8?"unshift":"push"](n);
_b=n.date;
}
i=i+_f;
}while(_a.length<_7&&(i*_d)<_c);
return _a;
},_showText:function(){
var _10=dojo.date.stamp.fromISOString;
this.timeMenu.innerHTML="";
this._clickableIncrementDate=_10(this.clickableIncrement);
this._visibleIncrementDate=_10(this.visibleIncrement);
this._visibleRangeDate=_10(this.visibleRange);
var _11=function(_12){
return _12.getHours()*60*60+_12.getMinutes()*60+_12.getSeconds();
},_13=_11(this._clickableIncrementDate),_14=_11(this._visibleIncrementDate),_15=_11(this._visibleRangeDate),_16=(this.value||this.currentFocus).getTime();
this._refDate=new Date(_16-_16%(_14*1000));
this._refDate.setFullYear(1970,0,1);
this._clickableIncrement=1;
this._totalIncrements=_15/_13;
this._visibleIncrement=_14/_13;
this._maxIncrement=(60*60*24)/_13;
var _17=this._getFilteredNodes(0,Math.min(this._totalIncrements>>1,10)-1),_18=this._getFilteredNodes(0,Math.min(this._totalIncrements,10)-_17.length,true,_17[0]);
dojo.forEach(_18.concat(_17),function(n){
this.timeMenu.appendChild(n);
},this);
},constructor:function(){
this.constraints={};
},postMixInProperties:function(){
this.inherited(arguments);
this._setConstraintsAttr(this.constraints);
},_setConstraintsAttr:function(_19){
dojo.mixin(this,_19);
if(!_19.locale){
_19.locale=this.lang;
}
},postCreate:function(){
this.connect(this.timeMenu,dojo.isIE?"onmousewheel":"DOMMouseScroll","_mouseWheeled");
this._connects.push(dijit.typematic.addMouseListener(this.upArrow,this,"_onArrowUp",33,250));
this._connects.push(dijit.typematic.addMouseListener(this.downArrow,this,"_onArrowDown",33,250));
this.inherited(arguments);
},_buttonMouse:function(e){
dojo.toggleClass(e.currentTarget,e.currentTarget==this.upArrow?"dijitUpArrowHover":"dijitDownArrowHover",e.type=="mouseenter"||e.type=="mouseover");
},_createOption:function(_1a){
var _1b=new Date(this._refDate);
var _1c=this._clickableIncrementDate;
_1b.setHours(_1b.getHours()+_1c.getHours()*_1a,_1b.getMinutes()+_1c.getMinutes()*_1a,_1b.getSeconds()+_1c.getSeconds()*_1a);
if(this.constraints.selector=="time"){
_1b.setFullYear(1970,0,1);
}
var _1d=dojo.date.locale.format(_1b,this.constraints);
if(this.filterString&&_1d.toLowerCase().indexOf(this.filterString)!==0){
return null;
}
var div=dojo.create("div",{"class":this.baseClass+"Item"});
div.date=_1b;
div.index=_1a;
dojo.create("div",{"class":this.baseClass+"ItemInner",innerHTML:_1d},div);
if(_1a%this._visibleIncrement<1&&_1a%this._visibleIncrement>-1){
dojo.addClass(div,this.baseClass+"Marker");
}else{
if(!(_1a%this._clickableIncrement)){
dojo.addClass(div,this.baseClass+"Tick");
}
}
if(this.isDisabledDate(_1b)){
dojo.addClass(div,this.baseClass+"ItemDisabled");
}
if(this.value&&!dojo.date.compare(this.value,_1b,this.constraints.selector)){
div.selected=true;
dojo.addClass(div,this.baseClass+"ItemSelected");
if(dojo.hasClass(div,this.baseClass+"Marker")){
dojo.addClass(div,this.baseClass+"MarkerSelected");
}else{
dojo.addClass(div,this.baseClass+"TickSelected");
}
this._highlightOption(div,true);
}
return div;
},_onOptionSelected:function(tgt){
var _1e=tgt.target.date||tgt.target.parentNode.date;
if(!_1e||this.isDisabledDate(_1e)){
return;
}
this._highlighted_option=null;
this.set("value",_1e);
this.onChange(_1e);
},onChange:function(_1f){
},_highlightOption:function(_20,_21){
if(!_20){
return;
}
if(_21){
if(this._highlighted_option){
this._highlightOption(this._highlighted_option,false);
}
this._highlighted_option=_20;
}else{
if(this._highlighted_option!==_20){
return;
}else{
this._highlighted_option=null;
}
}
dojo.toggleClass(_20,this.baseClass+"ItemHover",_21);
if(dojo.hasClass(_20,this.baseClass+"Marker")){
dojo.toggleClass(_20,this.baseClass+"MarkerHover",_21);
}else{
dojo.toggleClass(_20,this.baseClass+"TickHover",_21);
}
},onmouseover:function(e){
this._keyboardSelected=null;
var tgr=(e.target.parentNode===this.timeMenu)?e.target:e.target.parentNode;
if(!dojo.hasClass(tgr,this.baseClass+"Item")){
return;
}
this._highlightOption(tgr,true);
},onmouseout:function(e){
this._keyboardSelected=null;
var tgr=(e.target.parentNode===this.timeMenu)?e.target:e.target.parentNode;
this._highlightOption(tgr,false);
},_mouseWheeled:function(e){
this._keyboardSelected=null;
dojo.stopEvent(e);
var _22=(dojo.isIE?e.wheelDelta:-e.detail);
this[(_22>0?"_onArrowUp":"_onArrowDown")]();
},_onArrowUp:function(_23){
if(typeof _23=="number"&&_23==-1){
return;
}
if(!this.timeMenu.childNodes.length){
return;
}
var _24=this.timeMenu.childNodes[0].index;
var _25=this._getFilteredNodes(_24,1,true,this.timeMenu.childNodes[0]);
if(_25.length){
this.timeMenu.removeChild(this.timeMenu.childNodes[this.timeMenu.childNodes.length-1]);
this.timeMenu.insertBefore(_25[0],this.timeMenu.childNodes[0]);
}
},_onArrowDown:function(_26){
if(typeof _26=="number"&&_26==-1){
return;
}
if(!this.timeMenu.childNodes.length){
return;
}
var _27=this.timeMenu.childNodes[this.timeMenu.childNodes.length-1].index+1;
var _28=this._getFilteredNodes(_27,1,false,this.timeMenu.childNodes[this.timeMenu.childNodes.length-1]);
if(_28.length){
this.timeMenu.removeChild(this.timeMenu.childNodes[0]);
this.timeMenu.appendChild(_28[0]);
}
},handleKey:function(e){
var dk=dojo.keys;
if(e.charOrCode==dk.DOWN_ARROW||e.charOrCode==dk.UP_ARROW){
dojo.stopEvent(e);
if(this._highlighted_option&&!this._highlighted_option.parentNode){
this._highlighted_option=null;
}
var _29=this.timeMenu,tgt=this._highlighted_option||dojo.query("."+this.baseClass+"ItemSelected",_29)[0];
if(!tgt){
tgt=_29.childNodes[0];
}else{
if(_29.childNodes.length){
if(e.charOrCode==dk.DOWN_ARROW&&!tgt.nextSibling){
this._onArrowDown();
}else{
if(e.charOrCode==dk.UP_ARROW&&!tgt.previousSibling){
this._onArrowUp();
}
}
if(e.charOrCode==dk.DOWN_ARROW){
tgt=tgt.nextSibling;
}else{
tgt=tgt.previousSibling;
}
}
}
this._highlightOption(tgt,true);
this._keyboardSelected=tgt;
return false;
}else{
if(e.charOrCode==dk.ENTER||e.charOrCode===dk.TAB){
if(!this._keyboardSelected&&e.charOrCode===dk.TAB){
return true;
}
if(this._highlighted_option){
this._onOptionSelected({target:this._highlighted_option});
}
return e.charOrCode===dk.TAB;
}
}
}});
}
