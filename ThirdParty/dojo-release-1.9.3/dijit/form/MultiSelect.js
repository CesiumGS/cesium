//>>built
define("dijit/form/MultiSelect",["dojo/_base/array","dojo/_base/declare","dojo/dom-geometry","dojo/has","dojo/query","./_FormValueWidget"],function(_1,_2,_3,_4,_5,_6){
var _7=_2("dijit.form.MultiSelect"+(_4("dojo-bidi")?"_NoBidi":""),_6,{size:7,baseClass:"dijitMultiSelect",templateString:"<select multiple='true' ${!nameAttrSetting} data-dojo-attach-point='containerNode,focusNode' data-dojo-attach-event='onchange: _onChange'></select>",addSelected:function(_8){
_8.getSelected().forEach(function(n){
this.containerNode.appendChild(n);
this.domNode.scrollTop=this.domNode.offsetHeight;
var _9=_8.domNode.scrollTop;
_8.domNode.scrollTop=0;
_8.domNode.scrollTop=_9;
},this);
this._set("value",this.get("value"));
},getSelected:function(){
return _5("option",this.containerNode).filter(function(n){
return n.selected;
});
},_getValueAttr:function(){
return _1.map(this.getSelected(),function(n){
return n.value;
});
},multiple:true,_setValueAttr:function(_a,_b){
_5("option",this.containerNode).forEach(function(n){
n.selected=(_1.indexOf(_a,n.value)!=-1);
});
this.inherited(arguments);
},invertSelection:function(_c){
var _d=[];
_5("option",this.containerNode).forEach(function(n){
if(!n.selected){
_d.push(n.value);
}
});
this._setValueAttr(_d,!(_c===false||_c==null));
},_onChange:function(){
this._handleOnChange(this.get("value"),true);
},resize:function(_e){
if(_e){
_3.setMarginBox(this.domNode,_e);
}
},postCreate:function(){
this._set("value",this.get("value"));
this.inherited(arguments);
}});
if(_4("dojo-bidi")){
_7=_2("dijit.form.MultiSelect",_7,{addSelected:function(_f){
_f.getSelected().forEach(function(n){
n.text=this.enforceTextDirWithUcc(this.restoreOriginalText(n),n.text);
},this);
this.inherited(arguments);
},_setTextDirAttr:function(_10){
if((this.textDir!=_10||!this._created)&&this.enforceTextDirWithUcc){
this._set("textDir",_10);
_5("option",this.containerNode).forEach(function(_11){
if(!this._created&&_11.value===_11.text){
_11.value=_11.text;
}
_11.text=this.enforceTextDirWithUcc(_11,_11.originalText||_11.text);
},this);
}
}});
}
return _7;
});
