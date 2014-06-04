//>>built
define("dijit/form/_ButtonMixin",["dojo/_base/declare","dojo/dom","dojo/has","../registry"],function(_1,_2,_3,_4){
var _5=_1("dijit.form._ButtonMixin"+(_3("dojo-bidi")?"_NoBidi":""),null,{label:"",type:"button",__onClick:function(e){
e.stopPropagation();
e.preventDefault();
if(!this.disabled){
this.valueNode.click(e);
}
return false;
},_onClick:function(e){
if(this.disabled){
e.stopPropagation();
e.preventDefault();
return false;
}
if(this.onClick(e)===false){
e.preventDefault();
}
var _6=e.defaultPrevented;
if(!_6&&this.type=="submit"&&!(this.valueNode||this.focusNode).form){
for(var _7=this.domNode;_7.parentNode;_7=_7.parentNode){
var _8=_4.byNode(_7);
if(_8&&typeof _8._onSubmit=="function"){
_8._onSubmit(e);
e.preventDefault();
_6=true;
break;
}
}
}
return !_6;
},postCreate:function(){
this.inherited(arguments);
_2.setSelectable(this.focusNode,false);
},onClick:function(){
return true;
},_setLabelAttr:function(_9){
this._set("label",_9);
var _a=this.containerNode||this.focusNode;
_a.innerHTML=_9;
}});
if(_3("dojo-bidi")){
_5=_1("dijit.form._ButtonMixin",_5,{_setLabelAttr:function(){
this.inherited(arguments);
var _b=this.containerNode||this.focusNode;
this.applyTextDir(_b);
}});
}
return _5;
});
