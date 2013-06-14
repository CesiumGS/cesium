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
cancelled=e.defaultPrevented;
if(!cancelled&&this.type=="submit"&&!(this.valueNode||this.focusNode).form){
for(var _6=this.domNode;_6.parentNode;_6=_6.parentNode){
var _7=_4.byNode(_6);
if(_7&&typeof _7._onSubmit=="function"){
_7._onSubmit(e);
e.preventDefault();
cancelled=true;
break;
}
}
}
return !cancelled;
},postCreate:function(){
this.inherited(arguments);
_2.setSelectable(this.focusNode,false);
},onClick:function(){
return true;
},_setLabelAttr:function(_8){
this._set("label",_8);
var _9=this.containerNode||this.focusNode;
_9.innerHTML=_8;
}});
if(_3("dojo-bidi")){
_5=_1("dijit.form._ButtonMixin",_5,{_setLabelAttr:function(){
this.inherited(arguments);
var _a=this.containerNode||this.focusNode;
this.applyTextDir(_a);
}});
}
return _5;
});
