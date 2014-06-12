//>>built
define("dijit/form/_TextBoxMixin",["dojo/_base/array","dojo/_base/declare","dojo/dom","dojo/has","dojo/keys","dojo/_base/lang","dojo/on","../main"],function(_1,_2,_3,_4,_5,_6,on,_7){
var _8=_2("dijit.form._TextBoxMixin"+(_4("dojo-bidi")?"_NoBidi":""),null,{trim:false,uppercase:false,lowercase:false,propercase:false,maxLength:"",selectOnClick:false,placeHolder:"",_getValueAttr:function(){
return this.parse(this.get("displayedValue"),this.constraints);
},_setValueAttr:function(_9,_a,_b){
var _c;
if(_9!==undefined){
_c=this.filter(_9);
if(typeof _b!="string"){
if(_c!==null&&((typeof _c!="number")||!isNaN(_c))){
_b=this.filter(this.format(_c,this.constraints));
}else{
_b="";
}
}
}
if(_b!=null&&((typeof _b)!="number"||!isNaN(_b))&&this.textbox.value!=_b){
this.textbox.value=_b;
this._set("displayedValue",this.get("displayedValue"));
}
this.inherited(arguments,[_c,_a]);
},displayedValue:"",_getDisplayedValueAttr:function(){
return this.filter(this.textbox.value);
},_setDisplayedValueAttr:function(_d){
if(_d==null){
_d="";
}else{
if(typeof _d!="string"){
_d=String(_d);
}
}
this.textbox.value=_d;
this._setValueAttr(this.get("value"),undefined);
this._set("displayedValue",this.get("displayedValue"));
},format:function(_e){
return _e==null?"":(_e.toString?_e.toString():_e);
},parse:function(_f){
return _f;
},_refreshState:function(){
},onInput:function(){
},__skipInputEvent:false,_onInput:function(evt){
this._processInput(evt);
if(this.intermediateChanges){
this.defer(function(){
this._handleOnChange(this.get("value"),false);
});
}
},_processInput:function(evt){
this._refreshState();
this._set("displayedValue",this.get("displayedValue"));
},postCreate:function(){
this.textbox.setAttribute("value",this.textbox.value);
this.inherited(arguments);
var _10=function(e){
var _11;
if(e.type=="keydown"){
_11=e.keyCode;
switch(_11){
case _5.SHIFT:
case _5.ALT:
case _5.CTRL:
case _5.META:
case _5.CAPS_LOCK:
case _5.NUM_LOCK:
case _5.SCROLL_LOCK:
return;
}
if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
switch(_11){
case _5.NUMPAD_0:
case _5.NUMPAD_1:
case _5.NUMPAD_2:
case _5.NUMPAD_3:
case _5.NUMPAD_4:
case _5.NUMPAD_5:
case _5.NUMPAD_6:
case _5.NUMPAD_7:
case _5.NUMPAD_8:
case _5.NUMPAD_9:
case _5.NUMPAD_MULTIPLY:
case _5.NUMPAD_PLUS:
case _5.NUMPAD_ENTER:
case _5.NUMPAD_MINUS:
case _5.NUMPAD_PERIOD:
case _5.NUMPAD_DIVIDE:
return;
}
if((_11>=65&&_11<=90)||(_11>=48&&_11<=57)||_11==_5.SPACE){
return;
}
var _12=false;
for(var i in _5){
if(_5[i]===e.keyCode){
_12=true;
break;
}
}
if(!_12){
return;
}
}
}
_11=e.charCode>=32?String.fromCharCode(e.charCode):e.charCode;
if(!_11){
_11=(e.keyCode>=65&&e.keyCode<=90)||(e.keyCode>=48&&e.keyCode<=57)||e.keyCode==_5.SPACE?String.fromCharCode(e.keyCode):e.keyCode;
}
if(!_11){
_11=229;
}
if(e.type=="keypress"){
if(typeof _11!="string"){
return;
}
if((_11>="a"&&_11<="z")||(_11>="A"&&_11<="Z")||(_11>="0"&&_11<="9")||(_11===" ")){
if(e.ctrlKey||e.metaKey||e.altKey){
return;
}
}
}
if(e.type=="input"){
if(this.__skipInputEvent){
this.__skipInputEvent=false;
return;
}
}else{
this.__skipInputEvent=true;
}
var _13={faux:true},_14;
for(_14 in e){
if(_14!="layerX"&&_14!="layerY"){
var v=e[_14];
if(typeof v!="function"&&typeof v!="undefined"){
_13[_14]=v;
}
}
}
_6.mixin(_13,{charOrCode:_11,_wasConsumed:false,preventDefault:function(){
_13._wasConsumed=true;
e.preventDefault();
},stopPropagation:function(){
e.stopPropagation();
}});
if(this.onInput(_13)===false){
_13.preventDefault();
_13.stopPropagation();
}
if(_13._wasConsumed){
return;
}
this.defer(function(){
this._onInput(_13);
});
if(e.type=="keypress"){
e.stopPropagation();
}
};
this.own(on(this.textbox,"keydown, keypress, paste, cut, input, compositionend",_6.hitch(this,_10)));
},_blankValue:"",filter:function(val){
if(val===null){
return this._blankValue;
}
if(typeof val!="string"){
return val;
}
if(this.trim){
val=_6.trim(val);
}
if(this.uppercase){
val=val.toUpperCase();
}
if(this.lowercase){
val=val.toLowerCase();
}
if(this.propercase){
val=val.replace(/[^\s]+/g,function(_15){
return _15.substring(0,1).toUpperCase()+_15.substring(1);
});
}
return val;
},_setBlurValue:function(){
this._setValueAttr(this.get("value"),true);
},_onBlur:function(e){
if(this.disabled){
return;
}
this._setBlurValue();
this.inherited(arguments);
},_isTextSelected:function(){
return this.textbox.selectionStart!=this.textbox.selectionEnd;
},_onFocus:function(by){
if(this.disabled||this.readOnly){
return;
}
if(this.selectOnClick&&by=="mouse"){
this._selectOnClickHandle=on.once(this.domNode,"mouseup, touchend",_6.hitch(this,function(evt){
if(!this._isTextSelected()){
_8.selectInputText(this.textbox);
}
}));
this.own(this._selectOnClickHandle);
this.defer(function(){
if(this._selectOnClickHandle){
this._selectOnClickHandle.remove();
this._selectOnClickHandle=null;
}
},500);
}
this.inherited(arguments);
this._refreshState();
},reset:function(){
this.textbox.value="";
this.inherited(arguments);
}});
if(_4("dojo-bidi")){
_8=_2("dijit.form._TextBoxMixin",_8,{_setValueAttr:function(){
this.inherited(arguments);
this.applyTextDir(this.focusNode);
},_setDisplayedValueAttr:function(){
this.inherited(arguments);
this.applyTextDir(this.focusNode);
},_onInput:function(){
this.applyTextDir(this.focusNode);
this.inherited(arguments);
}});
}
_8._setSelectionRange=_7._setSelectionRange=function(_16,_17,_18){
if(_16.setSelectionRange){
_16.setSelectionRange(_17,_18);
}
};
_8.selectInputText=_7.selectInputText=function(_19,_1a,_1b){
_19=_3.byId(_19);
if(isNaN(_1a)){
_1a=0;
}
if(isNaN(_1b)){
_1b=_19.value?_19.value.length:0;
}
try{
_19.focus();
_8._setSelectionRange(_19,_1a,_1b);
}
catch(e){
}
};
return _8;
});
