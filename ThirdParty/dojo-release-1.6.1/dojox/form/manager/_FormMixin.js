/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.manager._FormMixin"]){
dojo._hasResource["dojox.form.manager._FormMixin"]=true;
dojo.provide("dojox.form.manager._FormMixin");
dojo.require("dojox.form.manager._Mixin");
(function(){
var fm=dojox.form.manager,aa=fm.actionAdapter;
dojo.declare("dojox.form.manager._FormMixin",null,{name:"",action:"",method:"",encType:"","accept-charset":"",accept:"",target:"",startup:function(){
this.isForm=this.domNode.tagName.toLowerCase()=="form";
if(this.isForm){
this.connect(this.domNode,"onreset","_onReset");
this.connect(this.domNode,"onsubmit","_onSubmit");
}
this.inherited(arguments);
},_onReset:function(_1){
var _2={returnValue:true,preventDefault:function(){
this.returnValue=false;
},stopPropagation:function(){
},currentTarget:_1.currentTarget,target:_1.target};
if(!(this.onReset(_2)===false)&&_2.returnValue){
this.reset();
}
dojo.stopEvent(_1);
return false;
},onReset:function(){
return true;
},reset:function(){
this.inspectFormWidgets(aa(function(_3,_4){
if(_4.reset){
_4.reset();
}
}));
if(this.isForm){
this.domNode.reset();
}
return this;
},_onSubmit:function(_5){
if(this.onSubmit(_5)===false){
dojo.stopEvent(_5);
}
},onSubmit:function(){
return this.isValid();
},submit:function(){
if(this.isForm){
if(!(this.onSubmit()===false)){
this.domNode.submit();
}
}
},isValid:function(){
for(var _6 in this.formWidgets){
var _7=false;
aa(function(_8,_9){
if(!_9.get("disabled")&&_9.isValid&&!_9.isValid()){
_7=true;
}
}).call(this,null,this.formWidgets[_6].widget);
if(_7){
return false;
}
}
return true;
},validate:function(){
var _a=true,_b=this.formWidgets,_c=false,_d;
for(_d in _b){
aa(function(_e,_f){
_f._hasBeenBlurred=true;
var _10=_f.disabled||!_f.validate||_f.validate();
if(!_10&&!_c){
dojo.window.scrollIntoView(_f.containerNode||_f.domNode);
_f.focus();
_c=true;
}
_a=_a&&_10;
}).call(this,null,_b[_d].widget);
}
return _a;
}});
})();
}
