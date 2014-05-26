//>>built
define("dijit/form/_CheckBoxMixin",["dojo/_base/declare","dojo/dom-attr"],function(_1,_2){
return _1("dijit.form._CheckBoxMixin",null,{type:"checkbox",value:"on",readOnly:false,_aria_attr:"aria-checked",_setReadOnlyAttr:function(_3){
this._set("readOnly",_3);
_2.set(this.focusNode,"readOnly",_3);
},_setLabelAttr:undefined,_getSubmitValue:function(_4){
return (_4==null||_4==="")?"on":_4;
},_setValueAttr:function(_5){
_5=this._getSubmitValue(_5);
this._set("value",_5);
_2.set(this.focusNode,"value",_5);
},reset:function(){
this.inherited(arguments);
this._set("value",this._getSubmitValue(this.params.value));
_2.set(this.focusNode,"value",this.value);
},_onClick:function(e){
if(this.readOnly){
e.stopPropagation();
e.preventDefault();
return false;
}
return this.inherited(arguments);
}});
});
