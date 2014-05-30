//>>built
define("dijit/_TemplatedMixin",["dojo/cache","dojo/_base/declare","dojo/dom-construct","dojo/_base/lang","dojo/on","dojo/sniff","dojo/string","./_AttachMixin"],function(_1,_2,_3,_4,on,_5,_6,_7){
var _8=_2("dijit._TemplatedMixin",_7,{templateString:null,templatePath:null,_skipNodeCache:false,searchContainerNode:true,_stringRepl:function(_9){
var _a=this.declaredClass,_b=this;
return _6.substitute(_9,this,function(_c,_d){
if(_d.charAt(0)=="!"){
_c=_4.getObject(_d.substr(1),false,_b);
}
if(typeof _c=="undefined"){
throw new Error(_a+" template:"+_d);
}
if(_c==null){
return "";
}
return _d.charAt(0)=="!"?_c:_c.toString().replace(/"/g,"&quot;");
},this);
},buildRendering:function(){
if(!this._rendered){
if(!this.templateString){
this.templateString=_1(this.templatePath,{sanitize:true});
}
var _e=_8.getCachedTemplate(this.templateString,this._skipNodeCache,this.ownerDocument);
var _f;
if(_4.isString(_e)){
_f=_3.toDom(this._stringRepl(_e),this.ownerDocument);
if(_f.nodeType!=1){
throw new Error("Invalid template: "+_e);
}
}else{
_f=_e.cloneNode(true);
}
this.domNode=_f;
}
this.inherited(arguments);
if(!this._rendered){
this._fillContent(this.srcNodeRef);
}
this._rendered=true;
},_fillContent:function(_10){
var _11=this.containerNode;
if(_10&&_11){
while(_10.hasChildNodes()){
_11.appendChild(_10.firstChild);
}
}
}});
_8._templateCache={};
_8.getCachedTemplate=function(_12,_13,doc){
var _14=_8._templateCache;
var key=_12;
var _15=_14[key];
if(_15){
try{
if(!_15.ownerDocument||_15.ownerDocument==(doc||document)){
return _15;
}
}
catch(e){
}
_3.destroy(_15);
}
_12=_6.trim(_12);
if(_13||_12.match(/\$\{([^\}]+)\}/g)){
return (_14[key]=_12);
}else{
var _16=_3.toDom(_12,doc);
if(_16.nodeType!=1){
throw new Error("Invalid template: "+_12);
}
return (_14[key]=_16);
}
};
if(_5("ie")){
on(window,"unload",function(){
var _17=_8._templateCache;
for(var key in _17){
var _18=_17[key];
if(typeof _18=="object"){
_3.destroy(_18);
}
delete _17[key];
}
});
}
return _8;
});
