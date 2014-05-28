//>>built
require({cache:{"url:dijit/templates/MenuItem.html":"<tr class=\"dijitReset dijitMenuItem\" data-dojo-attach-point=\"focusNode\" role=\"menuitem\" tabIndex=\"-1\">\n\t<td class=\"dijitReset dijitMenuItemIconCell\" role=\"presentation\">\n\t\t<span role=\"presentation\" class=\"dijitInline dijitIcon dijitMenuItemIcon\" data-dojo-attach-point=\"iconNode\"></span>\n\t</td>\n\t<td class=\"dijitReset dijitMenuItemLabel\" colspan=\"2\" data-dojo-attach-point=\"containerNode,textDirNode\"\n\t\trole=\"presentation\"></td>\n\t<td class=\"dijitReset dijitMenuItemAccelKey\" style=\"display: none\" data-dojo-attach-point=\"accelKeyNode\"></td>\n\t<td class=\"dijitReset dijitMenuArrowCell\" role=\"presentation\">\n\t\t<span data-dojo-attach-point=\"arrowWrapper\" style=\"visibility: hidden\">\n\t\t\t<span class=\"dijitInline dijitIcon dijitMenuExpand\"></span>\n\t\t\t<span class=\"dijitMenuExpandA11y\">+</span>\n\t\t</span>\n\t</td>\n</tr>\n"}});
define("dijit/MenuItem",["dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/_base/kernel","dojo/sniff","dojo/_base/lang","./_Widget","./_TemplatedMixin","./_Contained","./_CssStateMixin","dojo/text!./templates/MenuItem.html"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c){
var _d=_1("dijit.MenuItem"+(_6("dojo-bidi")?"_NoBidi":""),[_8,_9,_a,_b],{templateString:_c,baseClass:"dijitMenuItem",label:"",_setLabelAttr:function(_e){
this._set("label",_e);
var _f="";
var _10;
var ndx=_e.search(/{\S}/);
if(ndx>=0){
_f=_e.charAt(ndx+1);
var _11=_e.substr(0,ndx);
var _12=_e.substr(ndx+3);
_10=_11+_f+_12;
_e=_11+"<span class=\"dijitMenuItemShortcutKey\">"+_f+"</span>"+_12;
}else{
_10=_e;
}
this.domNode.setAttribute("aria-label",_10+" "+this.accelKey);
this.containerNode.innerHTML=_e;
this._set("shortcutKey",_f);
},iconClass:"dijitNoIcon",_setIconClassAttr:{node:"iconNode",type:"class"},accelKey:"",disabled:false,_fillContent:function(_13){
if(_13&&!("label" in this.params)){
this._set("label",_13.innerHTML);
}
},buildRendering:function(){
this.inherited(arguments);
var _14=this.id+"_text";
_3.set(this.containerNode,"id",_14);
if(this.accelKeyNode){
_3.set(this.accelKeyNode,"id",this.id+"_accel");
}
_2.setSelectable(this.domNode,false);
},onClick:function(){
},focus:function(){
try{
if(_6("ie")==8){
this.containerNode.focus();
}
this.focusNode.focus();
}
catch(e){
}
},_onFocus:function(){
this.getParent()._onItemFocus(this);
this.inherited(arguments);
},_setSelected:function(_15){
_4.toggle(this.domNode,"dijitMenuItemSelected",_15);
},setLabel:function(_16){
_5.deprecated("dijit.MenuItem.setLabel() is deprecated.  Use set('label', ...) instead.","","2.0");
this.set("label",_16);
},setDisabled:function(_17){
_5.deprecated("dijit.Menu.setDisabled() is deprecated.  Use set('disabled', bool) instead.","","2.0");
this.set("disabled",_17);
},_setDisabledAttr:function(_18){
this.focusNode.setAttribute("aria-disabled",_18?"true":"false");
this._set("disabled",_18);
},_setAccelKeyAttr:function(_19){
if(this.accelKeyNode){
this.accelKeyNode.style.display=_19?"":"none";
this.accelKeyNode.innerHTML=_19;
_3.set(this.containerNode,"colSpan",_19?"1":"2");
}
this._set("accelKey",_19);
}});
if(_6("dojo-bidi")){
_d=_1("dijit.MenuItem",_d,{_setLabelAttr:function(val){
this.inherited(arguments);
if(this.textDir==="auto"){
this.applyTextDir(this.textDirNode);
}
}});
}
return _d;
});
