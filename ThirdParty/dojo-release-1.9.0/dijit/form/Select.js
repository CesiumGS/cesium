//>>built
define("dijit/form/Select",["dojo/_base/array","dojo/_base/declare","dojo/dom-attr","dojo/dom-class","dojo/dom-geometry","dojo/i18n","dojo/_base/lang","dojo/on","dojo/sniff","./_FormSelectWidget","../_HasDropDown","../DropDownMenu","../MenuItem","../MenuSeparator","../Tooltip","../_KeyNavMixin","../registry","dojo/text!./templates/Select.html","dojo/i18n!./nls/validate"],function(_1,_2,_3,_4,_5,_6,_7,on,_8,_9,_a,_b,_c,_d,_e,_f,_10,_11){
var _12=_2("dijit.form._SelectMenu",_b,{autoFocus:true,buildRendering:function(){
this.inherited(arguments);
this.domNode.setAttribute("role","listbox");
},postCreate:function(){
this.inherited(arguments);
this.own(on(this.domNode,"selectstart",function(evt){
evt.preventDefault();
evt.stopPropagation();
}));
},focus:function(){
var _13=false,val=this.parentWidget.value;
if(_7.isArray(val)){
val=val[val.length-1];
}
if(val){
_1.forEach(this.parentWidget._getChildren(),function(_14){
if(_14.option&&(val===_14.option.value)){
_13=true;
this.focusChild(_14,false);
}
},this);
}
if(!_13){
this.inherited(arguments);
}
}});
var _15=_2("dijit.form.Select"+(_8("dojo-bidi")?"_NoBidi":""),[_9,_a,_f],{baseClass:"dijitSelect dijitValidationTextBox",templateString:_11,_buttonInputDisabled:_8("ie")?"disabled":"",required:false,state:"",message:"",tooltipPosition:[],emptyLabel:"&#160;",_isLoaded:false,_childrenLoaded:false,_fillContent:function(){
this.inherited(arguments);
if(this.options.length&&!this.value&&this.srcNodeRef){
var si=this.srcNodeRef.selectedIndex||0;
this._set("value",this.options[si>=0?si:0].value);
}
this.dropDown=new _12({id:this.id+"_menu",parentWidget:this});
_4.add(this.dropDown.domNode,this.baseClass.replace(/\s+|$/g,"Menu "));
},_getMenuItemForOption:function(_16){
if(!_16.value&&!_16.label){
return new _d({ownerDocument:this.ownerDocument});
}else{
var _17=_7.hitch(this,"_setValueAttr",_16);
var _18=new _c({option:_16,label:_16.label||this.emptyLabel,onClick:_17,ownerDocument:this.ownerDocument,dir:this.dir,textDir:this.textDir,disabled:_16.disabled||false});
_18.focusNode.setAttribute("role","option");
return _18;
}
},_addOptionItem:function(_19){
if(this.dropDown){
this.dropDown.addChild(this._getMenuItemForOption(_19));
}
},_getChildren:function(){
if(!this.dropDown){
return [];
}
return this.dropDown.getChildren();
},focus:function(){
if(!this.disabled&&this.focusNode.focus){
try{
this.focusNode.focus();
}
catch(e){
}
}
},focusChild:function(_1a){
if(_1a){
this.set("value",_1a.option);
}
},_getFirst:function(){
var _1b=this._getChildren();
return _1b.length?_1b[0]:null;
},_getLast:function(){
var _1c=this._getChildren();
return _1c.length?_1c[_1c.length-1]:null;
},childSelector:function(_1d){
var _1d=_10.byNode(_1d);
return _1d&&_1d.getParent()==this.dropDown;
},onKeyboardSearch:function(_1e,evt,_1f,_20){
if(_1e){
this.focusChild(_1e);
}
},_loadChildren:function(_21){
if(_21===true){
if(this.dropDown){
delete this.dropDown.focusedChild;
this.focusedChild=null;
}
if(this.options.length){
this.inherited(arguments);
}else{
_1.forEach(this._getChildren(),function(_22){
_22.destroyRecursive();
});
var _23=new _c({ownerDocument:this.ownerDocument,label:this.emptyLabel});
this.dropDown.addChild(_23);
}
}else{
this._updateSelection();
}
this._isLoaded=false;
this._childrenLoaded=true;
if(!this._loadingStore){
this._setValueAttr(this.value,false);
}
},_refreshState:function(){
if(this._started){
this.validate(this.focused);
}
},startup:function(){
this.inherited(arguments);
this._refreshState();
},_setValueAttr:function(_24){
this.inherited(arguments);
_3.set(this.valueNode,"value",this.get("value"));
this._refreshState();
},_setNameAttr:"valueNode",_setDisabledAttr:function(_25){
this.inherited(arguments);
this._refreshState();
},_setRequiredAttr:function(_26){
this._set("required",_26);
this.focusNode.setAttribute("aria-required",_26);
this._refreshState();
},_setOptionsAttr:function(_27){
this._isLoaded=false;
this._set("options",_27);
},_setDisplay:function(_28){
var lbl=_28||this.emptyLabel;
this.containerNode.innerHTML="<span role=\"option\" class=\"dijitReset dijitInline "+this.baseClass.replace(/\s+|$/g,"Label ")+"\">"+lbl+"</span>";
},validate:function(_29){
var _2a=this.disabled||this.isValid(_29);
this._set("state",_2a?"":(this._hasBeenBlurred?"Error":"Incomplete"));
this.focusNode.setAttribute("aria-invalid",_2a?"false":"true");
var _2b=_2a?"":this._missingMsg;
if(_2b&&this.focused&&this._hasBeenBlurred){
_e.show(_2b,this.domNode,this.tooltipPosition,!this.isLeftToRight());
}else{
_e.hide(this.domNode);
}
this._set("message",_2b);
return _2a;
},isValid:function(){
return (!this.required||this.value===0||!(/^\s*$/.test(this.value||"")));
},reset:function(){
this.inherited(arguments);
_e.hide(this.domNode);
this._refreshState();
},postMixInProperties:function(){
this.inherited(arguments);
this._missingMsg=_6.getLocalization("dijit.form","validate",this.lang).missingMessage;
},postCreate:function(){
this.inherited(arguments);
this.own(on(this.domNode,"selectstart",function(evt){
evt.preventDefault();
evt.stopPropagation();
}));
this.domNode.setAttribute("aria-expanded","false");
if(_8("ie")<9){
this.defer(function(){
try{
var s=domStyle.getComputedStyle(this.domNode);
if(s){
var ff=s.fontFamily;
if(ff){
var _2c=this.domNode.getElementsByTagName("INPUT");
if(_2c){
for(var i=0;i<_2c.length;i++){
_2c[i].style.fontFamily=ff;
}
}
}
}
}
catch(e){
}
});
}
},_setStyleAttr:function(_2d){
this.inherited(arguments);
_4.toggle(this.domNode,this.baseClass.replace(/\s+|$/g,"FixedWidth "),!!this.domNode.style.width);
},isLoaded:function(){
return this._isLoaded;
},loadDropDown:function(_2e){
this._loadChildren(true);
this._isLoaded=true;
_2e();
},destroy:function(_2f){
if(this.dropDown&&!this.dropDown._destroyed){
this.dropDown.destroyRecursive(_2f);
delete this.dropDown;
}
this.inherited(arguments);
},_onFocus:function(){
this.validate(true);
this.inherited(arguments);
},_onBlur:function(){
_e.hide(this.domNode);
this.inherited(arguments);
this.validate(false);
}});
if(_8("dojo-bidi")){
_15=_2("dijit.form.Select",_15,{_setDisplay:function(_30){
this.inherited(arguments);
this.applyTextDir(this.containerNode);
}});
}
_15._Menu=_12;
function _31(_32){
return function(evt){
if(!this._isLoaded){
this.loadDropDown(_7.hitch(this,_32,evt));
}else{
this.inherited(_32,arguments);
}
};
};
_15.prototype._onContainerKeydown=_31("_onContainerKeydown");
_15.prototype._onContainerKeypress=_31("_onContainerKeypress");
return _15;
});
require({cache:{"url:dijit/form/templates/Select.html":"<table class=\"dijit dijitReset dijitInline dijitLeft\"\n\tdata-dojo-attach-point=\"_buttonNode,tableNode,focusNode,_popupStateNode\" cellspacing='0' cellpadding='0'\n\trole=\"listbox\" aria-haspopup=\"true\"\n\t><tbody role=\"presentation\"><tr role=\"presentation\"\n\t\t><td class=\"dijitReset dijitStretch dijitButtonContents\" role=\"presentation\"\n\t\t\t><div class=\"dijitReset dijitInputField dijitButtonText\"  data-dojo-attach-point=\"containerNode,textDirNode\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitValidationContainer\"\n\t\t\t\t><input class=\"dijitReset dijitInputField dijitValidationIcon dijitValidationInner\" value=\"&#935; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t\t\t/></div\n\t\t\t><input type=\"hidden\" ${!nameAttrSetting} data-dojo-attach-point=\"valueNode\" value=\"${value}\" aria-hidden=\"true\"\n\t\t/></td\n\t\t><td class=\"dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton dijitArrowButtonContainer\"\n\t\t\tdata-dojo-attach-point=\"titleNode\" role=\"presentation\"\n\t\t\t><input class=\"dijitReset dijitInputField dijitArrowButtonInner\" value=\"&#9660; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t\t\t\t${_buttonInputDisabled}\n\t\t/></td\n\t></tr></tbody\n></table>\n"}});
