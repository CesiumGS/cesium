//>>built
define("dijit/_TimePicker",["dojo/_base/array","dojo/date","dojo/date/locale","dojo/date/stamp","dojo/_base/declare","dojo/dom-class","dojo/dom-construct","dojo/_base/kernel","dojo/keys","dojo/_base/lang","dojo/sniff","dojo/query","dojo/mouse","dojo/on","./_WidgetBase","./form/_ListMouseMixin"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,on,_e,_f){
var _10=_5("dijit._TimePicker",[_e,_f],{baseClass:"dijitTimePicker",clickableIncrement:"T00:15:00",visibleIncrement:"T01:00:00",value:new Date(),_visibleIncrement:2,_clickableIncrement:1,_totalIncrements:10,constraints:{},serialize:_4.toISOString,buildRendering:function(){
this.inherited(arguments);
this.containerNode=this.domNode;
this.timeMenu=this.domNode;
},setValue:function(_11){
_8.deprecated("dijit._TimePicker:setValue() is deprecated.  Use set('value', ...) instead.","","2.0");
this.set("value",_11);
},_setValueAttr:function(_12){
this._set("value",_12);
this._showText();
},_setFilterStringAttr:function(val){
this._set("filterString",val);
this._showText();
},isDisabledDate:function(){
return false;
},_getFilteredNodes:function(_13,_14,_15,_16){
var _17=[];
for(var i=0;i<this._maxIncrement;i++){
var n=this._createOption(i);
if(n){
_17.push(n);
}
}
return _17;
},_showText:function(){
var _18=_4.fromISOString;
this.domNode.innerHTML="";
this._clickableIncrementDate=_18(this.clickableIncrement);
this._visibleIncrementDate=_18(this.visibleIncrement);
var _19=function(_1a){
return _1a.getHours()*60*60+_1a.getMinutes()*60+_1a.getSeconds();
},_1b=_19(this._clickableIncrementDate),_1c=_19(this._visibleIncrementDate),_1d=(this.value||this.currentFocus).getTime();
this._refDate=_18("T00:00:00");
this._refDate.setFullYear(1970,0,1);
this._clickableIncrement=1;
this._visibleIncrement=_1c/_1b;
this._maxIncrement=(60*60*24)/_1b;
var _1e=this._getFilteredNodes();
_1.forEach(_1e,function(n){
this.domNode.appendChild(n);
},this);
if(!_1e.length&&this.filterString){
this.filterString="";
this._showText();
}
},constructor:function(){
this.constraints={};
},postMixInProperties:function(){
this.inherited(arguments);
this._setConstraintsAttr(this.constraints);
},_setConstraintsAttr:function(_1f){
for(var key in _1f){
this._set(key,_1f[key]);
}
if(!_1f.locale){
_1f.locale=this.lang;
}
},_createOption:function(_20){
var _21=new Date(this._refDate);
var _22=this._clickableIncrementDate;
_21.setTime(_21.getTime()+_22.getHours()*_20*3600000+_22.getMinutes()*_20*60000+_22.getSeconds()*_20*1000);
if(this.constraints.selector=="time"){
_21.setFullYear(1970,0,1);
}
var _23=_3.format(_21,this.constraints);
if(this.filterString&&_23.toLowerCase().indexOf(this.filterString)!==0){
return null;
}
var div=this.ownerDocument.createElement("div");
div.className=this.baseClass+"Item";
div.date=_21;
div.idx=_20;
_7.create("div",{"class":this.baseClass+"ItemInner",innerHTML:_23},div);
if(_20%this._visibleIncrement<1&&_20%this._visibleIncrement>-1){
_6.add(div,this.baseClass+"Marker");
}else{
if(!(_20%this._clickableIncrement)){
_6.add(div,this.baseClass+"Tick");
}
}
if(this.isDisabledDate(_21)){
_6.add(div,this.baseClass+"ItemDisabled");
}
if(this.value&&!_2.compare(this.value,_21,this.constraints.selector)){
div.selected=true;
_6.add(div,this.baseClass+"ItemSelected");
this._selectedDiv=div;
if(_6.contains(div,this.baseClass+"Marker")){
_6.add(div,this.baseClass+"MarkerSelected");
}else{
_6.add(div,this.baseClass+"TickSelected");
}
this._highlightOption(div,true);
}
return div;
},onOpen:function(){
this.inherited(arguments);
this.set("selected",this._selectedDiv);
},_onOptionSelected:function(tgt){
var _24=tgt.target.date||tgt.target.parentNode.date;
if(!_24||this.isDisabledDate(_24)){
return;
}
this._highlighted_option=null;
this.set("value",_24);
this.onChange(_24);
},onChange:function(){
},_highlightOption:function(_25,_26){
if(!_25){
return;
}
if(_26){
if(this._highlighted_option){
this._highlightOption(this._highlighted_option,false);
}
this._highlighted_option=_25;
}else{
if(this._highlighted_option!==_25){
return;
}else{
this._highlighted_option=null;
}
}
_6.toggle(_25,this.baseClass+"ItemHover",_26);
if(_6.contains(_25,this.baseClass+"Marker")){
_6.toggle(_25,this.baseClass+"MarkerHover",_26);
}else{
_6.toggle(_25,this.baseClass+"TickHover",_26);
}
},handleKey:function(e){
if(e.keyCode==_9.DOWN_ARROW){
this.selectNextNode();
e.stopPropagation();
e.preventDefault();
return false;
}else{
if(e.keyCode==_9.UP_ARROW){
this.selectPreviousNode();
e.stopPropagation();
e.preventDefault();
return false;
}else{
if(e.keyCode==_9.ENTER||e.keyCode===_9.TAB){
if(!this._keyboardSelected&&e.keyCode===_9.TAB){
return true;
}
if(this._highlighted_option){
this._onOptionSelected({target:this._highlighted_option});
}
return e.keyCode===_9.TAB;
}
}
}
return undefined;
},onHover:function(_27){
this._highlightOption(_27,true);
},onUnhover:function(_28){
this._highlightOption(_28,false);
},onSelect:function(_29){
this._highlightOption(_29,true);
},onDeselect:function(_2a){
this._highlightOption(_2a,false);
},onClick:function(_2b){
this._onOptionSelected({target:_2b});
}});
return _10;
});
