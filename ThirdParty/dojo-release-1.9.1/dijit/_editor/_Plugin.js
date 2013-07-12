//>>built
define("dijit/_editor/_Plugin",["dojo/_base/connect","dojo/_base/declare","dojo/_base/lang","../Destroyable","../form/Button"],function(_1,_2,_3,_4,_5){
var _6=_2("dijit._editor._Plugin",_4,{constructor:function(_7){
this.params=_7||{};
_3.mixin(this,this.params);
this._attrPairNames={};
},editor:null,iconClassPrefix:"dijitEditorIcon",button:null,command:"",useDefaultCommand:true,buttonClass:_5,disabled:false,getLabel:function(_8){
return this.editor.commands[_8];
},_initButton:function(){
if(this.command.length){
var _9=this.getLabel(this.command),_a=this.editor,_b=this.iconClassPrefix+" "+this.iconClassPrefix+this.command.charAt(0).toUpperCase()+this.command.substr(1);
if(!this.button){
var _c=_3.mixin({label:_9,ownerDocument:_a.ownerDocument,dir:_a.dir,lang:_a.lang,showLabel:false,iconClass:_b,dropDown:this.dropDown,tabIndex:"-1"},this.params||{});
this.button=new this.buttonClass(_c);
}
}
if(this.get("disabled")&&this.button){
this.button.set("disabled",this.get("disabled"));
}
},destroy:function(){
if(this.dropDown){
this.dropDown.destroyRecursive();
}
this.inherited(arguments);
},connect:function(o,f,tf){
this.own(_1.connect(o,f,this,tf));
},updateState:function(){
var e=this.editor,c=this.command,_d,_e;
if(!e||!e.isLoaded||!c.length){
return;
}
var _f=this.get("disabled");
if(this.button){
try{
_e=!_f&&e.queryCommandEnabled(c);
if(this.enabled!==_e){
this.enabled=_e;
this.button.set("disabled",!_e);
}
if(_e){
if(typeof this.button.checked=="boolean"){
_d=e.queryCommandState(c);
if(this.checked!==_d){
this.checked=_d;
this.button.set("checked",e.queryCommandState(c));
}
}
}
}
catch(e){
}
}
},setEditor:function(_10){
this.editor=_10;
this._initButton();
if(this.button&&this.useDefaultCommand){
if(this.editor.queryCommandAvailable(this.command)){
this.own(this.button.on("click",_3.hitch(this.editor,"execCommand",this.command,this.commandArg)));
}else{
this.button.domNode.style.display="none";
}
}
this.own(this.editor.on("NormalizedDisplayChanged",_3.hitch(this,"updateState")));
},setToolbar:function(_11){
if(this.button){
_11.addChild(this.button);
}
},set:function(_12,_13){
if(typeof _12==="object"){
for(var x in _12){
this.set(x,_12[x]);
}
return this;
}
var _14=this._getAttrNames(_12);
if(this[_14.s]){
var _15=this[_14.s].apply(this,Array.prototype.slice.call(arguments,1));
}else{
this._set(_12,_13);
}
return _15||this;
},get:function(_16){
var _17=this._getAttrNames(_16);
return this[_17.g]?this[_17.g]():this[_16];
},_setDisabledAttr:function(_18){
this._set("disabled",_18);
this.updateState();
},_getAttrNames:function(_19){
var apn=this._attrPairNames;
if(apn[_19]){
return apn[_19];
}
var uc=_19.charAt(0).toUpperCase()+_19.substr(1);
return (apn[_19]={s:"_set"+uc+"Attr",g:"_get"+uc+"Attr"});
},_set:function(_1a,_1b){
this[_1a]=_1b;
}});
_6.registry={};
return _6;
});
