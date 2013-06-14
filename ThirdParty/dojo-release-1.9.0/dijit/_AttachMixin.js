//>>built
define("dijit/_AttachMixin",["require","dojo/_base/array","dojo/_base/connect","dojo/_base/declare","dojo/_base/lang","dojo/mouse","dojo/on","dojo/touch","./_WidgetBase"],function(_1,_2,_3,_4,_5,_6,on,_7,_8){
var _9=_5.delegate(_7,{"mouseenter":_6.enter,"mouseleave":_6.leave,"keypress":_3._keypress});
var _a;
var _b=_4("dijit._AttachMixin",null,{constructor:function(){
this._attachPoints=[];
this._attachEvents=[];
},buildRendering:function(){
this.inherited(arguments);
this._attachTemplateNodes(this.domNode);
this._beforeFillContent();
},_beforeFillContent:function(){
},_attachTemplateNodes:function(_c){
var _d=_c;
while(true){
if(_d.nodeType==1&&(this._processTemplateNode(_d,function(n,p){
return n.getAttribute(p);
},this._attach)||this.searchContainerNode)&&_d.firstChild){
_d=_d.firstChild;
}else{
if(_d==_c){
return;
}
while(!_d.nextSibling){
_d=_d.parentNode;
if(_d==_c){
return;
}
}
_d=_d.nextSibling;
}
}
},_processTemplateNode:function(_e,_f,_10){
var ret=true;
var _11=this.attachScope||this,_12=_f(_e,"dojoAttachPoint")||_f(_e,"data-dojo-attach-point");
if(_12){
var _13,_14=_12.split(/\s*,\s*/);
while((_13=_14.shift())){
if(_5.isArray(_11[_13])){
_11[_13].push(_e);
}else{
_11[_13]=_e;
}
ret=(_13!="containerNode");
this._attachPoints.push(_13);
}
}
var _15=_f(_e,"dojoAttachEvent")||_f(_e,"data-dojo-attach-event");
if(_15){
var _16,_17=_15.split(/\s*,\s*/);
var _18=_5.trim;
while((_16=_17.shift())){
if(_16){
var _19=null;
if(_16.indexOf(":")!=-1){
var _1a=_16.split(":");
_16=_18(_1a[0]);
_19=_18(_1a[1]);
}else{
_16=_18(_16);
}
if(!_19){
_19=_16;
}
this._attachEvents.push(_10(_e,_16,_5.hitch(_11,_19)));
}
}
}
return ret;
},_attach:function(_1b,_1c,_1d){
_1c=_1c.replace(/^on/,"").toLowerCase();
if(_1c=="dijitclick"){
_1c=_a||(_a=_1("./a11yclick"));
}else{
_1c=_9[_1c]||_1c;
}
return on(_1b,_1c,_1d);
},_detachTemplateNodes:function(){
var _1e=this.attachScope||this;
_2.forEach(this._attachPoints,function(_1f){
delete _1e[_1f];
});
this._attachPoints=[];
_2.forEach(this._attachEvents,function(_20){
_20.remove();
});
this._attachEvents=[];
},destroyRendering:function(){
this._detachTemplateNodes();
this.inherited(arguments);
}});
_5.extend(_8,{dojoAttachEvent:"",dojoAttachPoint:""});
return _b;
});
