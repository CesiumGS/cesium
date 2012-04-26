/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced._PluginManager"]){
dojo._hasResource["dojox.grid.enhanced._PluginManager"]=true;
dojo.provide("dojox.grid.enhanced._PluginManager");
dojo.require("dojox.grid.enhanced._Events");
dojo.require("dojox.grid.enhanced._FocusManager");
dojo.declare("dojox.grid.enhanced._PluginManager",null,{_options:null,_plugins:null,_connects:null,constructor:function(_1){
this.grid=_1;
this._store=_1.store;
this._options={};
this._plugins=[];
this._connects=[];
this._parseProps(this.grid.plugins);
_1.connect(_1,"_setStore",dojo.hitch(this,function(_2){
if(this._store!==_2){
this.forEach("onSetStore",[_2,this._store]);
this._store=_2;
}
}));
},startup:function(){
this.forEach("onStartUp");
},preInit:function(){
this.grid.focus.destroy();
this.grid.focus=new dojox.grid.enhanced._FocusManager(this.grid);
new dojox.grid.enhanced._Events(this.grid);
this._init(true);
this.forEach("onPreInit");
},postInit:function(){
this._init(false);
dojo.forEach(this.grid.views.views,this._initView,this);
this._connects.push(dojo.connect(this.grid.views,"addView",dojo.hitch(this,this._initView)));
if(this._plugins.length>0){
var _3=this.grid.edit;
if(_3){
_3.styleRow=function(_4){
};
}
}
this.forEach("onPostInit");
},forEach:function(_5,_6){
dojo.forEach(this._plugins,function(p){
if(!p||!p[_5]){
return;
}
p[_5].apply(p,_6?_6:[]);
});
},_parseProps:function(_7){
if(!_7){
return;
}
var p,_8={},_9=this._options,_a=this.grid;
var _b=dojox.grid.enhanced._PluginManager.registry;
for(p in _7){
if(_7[p]){
this._normalize(p,_7,_b,_8);
}
}
if(_9.dnd||_9.indirectSelection){
_9.columnReordering=false;
}
dojo.mixin(_a,_9);
},_normalize:function(p,_c,_d,_e){
if(!_d[p]){
throw new Error("Plugin "+p+" is required.");
}
if(_e[p]){
throw new Error("Recursive cycle dependency is not supported.");
}
var _f=this._options;
if(_f[p]){
return _f[p];
}
_e[p]=true;
_f[p]=dojo.mixin({},_d[p],dojo.isObject(_c[p])?_c[p]:{});
var _10=_f[p]["dependency"];
if(_10){
if(!dojo.isArray(_10)){
_10=_f[p]["dependency"]=[_10];
}
dojo.forEach(_10,function(_11){
if(!this._normalize(_11,_c,_d,_e)){
throw new Error("Plugin "+_11+" is required.");
}
},this);
}
delete _e[p];
return _f[p];
},_init:function(pre){
var p,_12,_13=this._options;
for(p in _13){
_12=_13[p]["preInit"];
if((pre?_12:!_12)&&_13[p]["class"]&&!this.pluginExisted(p)){
this.loadPlugin(p);
}
}
},loadPlugin:function(_14){
var _15=this._options[_14];
if(!_15){
return null;
}
var _16=this.getPlugin(_14);
if(_16){
return _16;
}
var _17=_15["dependency"];
dojo.forEach(_17,function(_18){
if(!this.loadPlugin(_18)){
throw new Error("Plugin "+_18+" is required.");
}
},this);
var cls=_15["class"];
delete _15["class"];
_16=new this.getPluginClazz(cls)(this.grid,_15);
this._plugins.push(_16);
return _16;
},_initView:function(_19){
if(!_19){
return;
}
dojox.grid.util.funnelEvents(_19.contentNode,_19,"doContentEvent",["mouseup","mousemove"]);
dojox.grid.util.funnelEvents(_19.headerNode,_19,"doHeaderEvent",["mouseup"]);
},pluginExisted:function(_1a){
return !!this.getPlugin(_1a);
},getPlugin:function(_1b){
var _1c=this._plugins;
_1b=_1b.toLowerCase();
for(var i=0,len=_1c.length;i<len;i++){
if(_1b==_1c[i]["name"].toLowerCase()){
return _1c[i];
}
}
return null;
},getPluginClazz:function(_1d){
if(dojo.isFunction(_1d)){
return _1d;
}
var _1e="Please make sure Plugin \""+_1d+"\" is existed.";
try{
var cls=dojo.getObject(_1d);
if(!cls){
throw new Error(_1e);
}
return cls;
}
catch(e){
throw new Error(_1e);
}
},isFixedCell:function(_1f){
return _1f&&(_1f.isRowSelector||_1f.fixedPos);
},destroy:function(){
dojo.forEach(this._connects,dojo.disconnect);
this.forEach("destroy");
if(this.grid.unwrap){
this.grid.unwrap();
}
delete this._connects;
delete this._plugins;
delete this._options;
}});
dojox.grid.enhanced._PluginManager.registerPlugin=function(_20,_21){
if(!_20){
console.warn("Failed to register plugin, class missed!");
return;
}
var cls=dojox.grid.enhanced._PluginManager;
cls.registry=cls.registry||{};
cls.registry[_20.prototype.name]=dojo.mixin({"class":_20},(_21?_21:{}));
};
}
