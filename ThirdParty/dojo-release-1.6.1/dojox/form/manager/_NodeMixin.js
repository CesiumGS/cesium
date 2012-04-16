/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.manager._NodeMixin"]){
dojo._hasResource["dojox.form.manager._NodeMixin"]=true;
dojo.provide("dojox.form.manager._NodeMixin");
dojo.require("dojox.form.manager._Mixin");
(function(){
var fm=dojox.form.manager,aa=fm.actionAdapter,_1=fm._keys,ce=fm.changeEvent=function(_2){
var _3="onclick";
switch(_2.tagName.toLowerCase()){
case "textarea":
_3="onkeyup";
break;
case "select":
_3="onchange";
break;
case "input":
switch(_2.type.toLowerCase()){
case "text":
case "password":
_3="onkeyup";
break;
}
break;
}
return _3;
},_4=function(_5,_6){
var _7=dojo.attr(_5,"name");
_6=_6||this.domNode;
if(_7&&!(_7 in this.formWidgets)){
for(var n=_5;n&&n!==_6;n=n.parentNode){
if(dojo.attr(n,"widgetId")&&dijit.byNode(n) instanceof dijit.form._FormWidget){
return null;
}
}
if(_5.tagName.toLowerCase()=="input"&&_5.type.toLowerCase()=="radio"){
var a=this.formNodes[_7];
a=a&&a.node;
if(a&&dojo.isArray(a)){
a.push(_5);
}else{
this.formNodes[_7]={node:[_5],connections:[]};
}
}else{
this.formNodes[_7]={node:_5,connections:[]};
}
}else{
_7=null;
}
return _7;
},_8=function(_9){
var _a={};
aa(function(_b,n){
var o=dojo.attr(n,"observer");
if(o&&typeof o=="string"){
dojo.forEach(o.split(","),function(o){
o=dojo.trim(o);
if(o&&dojo.isFunction(this[o])){
_a[o]=1;
}
},this);
}
}).call(this,null,this.formNodes[_9].node);
return _1(_a);
},_c=function(_d,_e){
var t=this.formNodes[_d],c=t.connections;
if(c.length){
dojo.forEach(c,dojo.disconnect);
c=t.connections=[];
}
aa(function(_f,n){
var _10=ce(n);
dojo.forEach(_e,function(o){
c.push(dojo.connect(n,_10,this,function(evt){
if(this.watching){
this[o](this.formNodeValue(_d),_d,n,evt);
}
}));
},this);
}).call(this,null,t.node);
};
dojo.declare("dojox.form.manager._NodeMixin",null,{destroy:function(){
for(var _11 in this.formNodes){
dojo.forEach(this.formNodes[_11].connections,dojo.disconnect);
}
this.formNodes={};
this.inherited(arguments);
},registerNode:function(_12){
if(typeof _12=="string"){
_12=dojo.byId(_12);
}
var _13=_4.call(this,_12);
if(_13){
_c.call(this,_13,_8.call(this,_13));
}
return this;
},unregisterNode:function(_14){
if(_14 in this.formNodes){
dojo.forEach(this.formNodes[_14].connections,this.disconnect,this);
delete this.formNodes[_14];
}
return this;
},registerNodeDescendants:function(_15){
if(typeof _15=="string"){
_15=dojo.byId(_15);
}
dojo.query("input, select, textarea, button",_15).map(function(n){
return _4.call(this,n,_15);
},this).forEach(function(_16){
if(_16){
_c.call(this,_16,_8.call(this,_16));
}
},this);
return this;
},unregisterNodeDescendants:function(_17){
if(typeof _17=="string"){
_17=dojo.byId(_17);
}
dojo.query("input, select, textarea, button",_17).map(function(n){
return dojo.attr(_17,"name")||null;
}).forEach(function(_18){
if(_18){
this.unregisterNode(_18);
}
},this);
return this;
},formNodeValue:function(_19,_1a){
var _1b=arguments.length==2&&_1a!==undefined,_1c;
if(typeof _19=="string"){
_19=this.formNodes[_19];
if(_19){
_19=_19.node;
}
}
if(!_19){
return null;
}
if(dojo.isArray(_19)){
if(_1b){
dojo.forEach(_19,function(_1d){
_1d.checked="";
});
dojo.forEach(_19,function(_1e){
_1e.checked=_1e.value===_1a?"checked":"";
});
return this;
}
dojo.some(_19,function(_1f){
if(_1f.checked){
_1c=_1f;
return true;
}
return false;
});
return _1c?_1c.value:"";
}
switch(_19.tagName.toLowerCase()){
case "select":
if(_19.multiple){
if(_1b){
if(dojo.isArray(_1a)){
var _20={};
dojo.forEach(_1a,function(v){
_20[v]=1;
});
dojo.query("> option",_19).forEach(function(opt){
opt.selected=opt.value in _20;
});
return this;
}
dojo.query("> option",_19).forEach(function(opt){
opt.selected=opt.value===_1a;
});
return this;
}
var _1c=dojo.query("> option",_19).filter(function(opt){
return opt.selected;
}).map(function(opt){
return opt.value;
});
return _1c.length==1?_1c[0]:_1c;
}
if(_1b){
dojo.query("> option",_19).forEach(function(opt){
opt.selected=opt.value===_1a;
});
return this;
}
return _19.value||"";
case "button":
if(_1b){
_19.innerHTML=""+_1a;
return this;
}
return _19.innerHTML;
case "input":
if(_19.type.toLowerCase()=="checkbox"){
if(_1b){
_19.checked=_1a?"checked":"";
return this;
}
return Boolean(_19.checked);
}
}
if(_1b){
_19.value=""+_1a;
return this;
}
return _19.value;
},inspectFormNodes:function(_21,_22,_23){
var _24,_25={};
if(_22){
if(dojo.isArray(_22)){
dojo.forEach(_22,function(_26){
if(_26 in this.formNodes){
_25[_26]=_21.call(this,_26,this.formNodes[_26].node,_23);
}
},this);
}else{
for(_24 in _22){
if(_24 in this.formNodes){
_25[_24]=_21.call(this,_24,this.formNodes[_24].node,_22[_24]);
}
}
}
}else{
for(_24 in this.formNodes){
_25[_24]=_21.call(this,_24,this.formNodes[_24].node,_23);
}
}
return _25;
}});
})();
}
