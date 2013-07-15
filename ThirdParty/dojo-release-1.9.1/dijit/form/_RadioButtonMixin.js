//>>built
define("dijit/form/_RadioButtonMixin",["dojo/_base/array","dojo/_base/declare","dojo/dom-attr","dojo/_base/lang","dojo/query","../registry"],function(_1,_2,_3,_4,_5,_6){
return _2("dijit.form._RadioButtonMixin",null,{type:"radio",_getRelatedWidgets:function(){
var _7=[];
_5("input[type=radio]",this.focusNode.form||this.ownerDocument).forEach(_4.hitch(this,function(_8){
if(_8.name==this.name&&_8.form==this.focusNode.form){
var _9=_6.getEnclosingWidget(_8);
if(_9){
_7.push(_9);
}
}
}));
return _7;
},_setCheckedAttr:function(_a){
this.inherited(arguments);
if(!this._created){
return;
}
if(_a){
_1.forEach(this._getRelatedWidgets(),_4.hitch(this,function(_b){
if(_b!=this&&_b.checked){
_b.set("checked",false);
}
}));
}
},_getSubmitValue:function(_c){
return _c==null?"on":_c;
},_onClick:function(e){
if(this.checked||this.disabled){
e.stopPropagation();
e.preventDefault();
return false;
}
if(this.readOnly){
e.stopPropagation();
e.preventDefault();
_1.forEach(this._getRelatedWidgets(),_4.hitch(this,function(_d){
_3.set(this.focusNode||this.domNode,"checked",_d.checked);
}));
return false;
}
return this.inherited(arguments);
}});
});
