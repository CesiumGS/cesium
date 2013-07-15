//>>built
define("dijit/_Templated",["./_WidgetBase","./_TemplatedMixin","./_WidgetsInTemplateMixin","dojo/_base/array","dojo/_base/declare","dojo/_base/lang","dojo/_base/kernel"],function(_1,_2,_3,_4,_5,_6,_7){
_6.extend(_1,{waiRole:"",waiState:""});
return _5("dijit._Templated",[_2,_3],{widgetsInTemplate:false,constructor:function(){
_7.deprecated(this.declaredClass+": dijit._Templated deprecated, use dijit._TemplatedMixin and if necessary dijit._WidgetsInTemplateMixin","","2.0");
},_processNode:function(_8,_9){
var _a=this.inherited(arguments);
var _b=_9(_8,"waiRole");
if(_b){
_8.setAttribute("role",_b);
}
var _c=_9(_8,"waiState");
if(_c){
_4.forEach(_c.split(/\s*,\s*/),function(_d){
if(_d.indexOf("-")!=-1){
var _e=_d.split("-");
_8.setAttribute("aria-"+_e[0],_e[1]);
}
});
}
return _a;
}});
});
