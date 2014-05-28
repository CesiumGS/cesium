//>>built
define("dijit/_WidgetsInTemplateMixin",["dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/_base/lang","dojo/parser"],function(_1,_2,_3,_4,_5){
return _3("dijit._WidgetsInTemplateMixin",null,{_earlyTemplatedStartup:false,widgetsInTemplate:true,contextRequire:null,_beforeFillContent:function(){
if(this.widgetsInTemplate){
var _6=this.domNode;
if(this.containerNode&&!this.searchContainerNode){
this.containerNode.stopParser=true;
}
_5.parse(_6,{noStart:!this._earlyTemplatedStartup,template:true,inherited:{dir:this.dir,lang:this.lang,textDir:this.textDir},propsThis:this,contextRequire:this.contextRequire,scope:"dojo"}).then(_4.hitch(this,function(_7){
this._startupWidgets=_7;
for(var i=0;i<_7.length;i++){
this._processTemplateNode(_7[i],function(n,p){
return n[p];
},function(_8,_9,_a){
if(_9 in _8){
return _8.connect(_8,_9,_a);
}else{
return _8.on(_9,_a,true);
}
});
}
if(this.containerNode&&this.containerNode.stopParser){
delete this.containerNode.stopParser;
}
}));
if(!this._startupWidgets){
throw new Error(this.declaredClass+": parser returned unfilled promise (probably waiting for module auto-load), "+"unsupported by _WidgetsInTemplateMixin.   Must pre-load all supporting widgets before instantiation.");
}
}
},_processTemplateNode:function(_b,_c,_d){
if(_c(_b,"dojoType")||_c(_b,"data-dojo-type")){
return true;
}
return this.inherited(arguments);
},startup:function(){
_1.forEach(this._startupWidgets,function(w){
if(w&&!w._started&&w.startup){
w.startup();
}
});
this._startupWidgets=null;
this.inherited(arguments);
}});
});
