/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins._StoreLayer"]){
dojo._hasResource["dojox.grid.enhanced.plugins._StoreLayer"]=true;
dojo.provide("dojox.grid.enhanced.plugins._StoreLayer");
(function(){
var ns=dojox.grid.enhanced.plugins,_1=function(_2){
var _3=["reorder","sizeChange","normal","presentation"];
var _4=_3.length;
for(var i=_2.length-1;i>=0;--i){
var p=dojo.indexOf(_3,_2[i]);
if(p>=0&&p<=_4){
_4=p;
}
}
if(_4<_3.length-1){
return _3.slice(0,_4+1);
}else{
return _3;
}
},_5=function(_6){
var i,_7=this._layers,_8=_7.length;
if(_6){
for(i=_8-1;i>=0;--i){
if(_7[i].name()==_6){
_7[i]._unwrap(_7[i+1]);
break;
}
}
_7.splice(i,1);
}else{
for(i=_8-1;i>=0;--i){
_7[i]._unwrap();
}
}
if(!_7.length){
delete this._layers;
delete this.layer;
delete this.unwrap;
delete this.forEachLayer;
}
return this;
},_9=function(_a){
var i,_b=this._layers;
if(typeof _a=="undefined"){
return _b.length;
}
if(typeof _a=="number"){
return _b[_a];
}
for(i=_b.length-1;i>=0;--i){
if(_b[i].name()==_a){
return _b[i];
}
}
return null;
},_c=function(_d,_e){
var _f=this._layers.length,_10,end,dir;
if(_e){
_10=0;
end=_f;
dir=1;
}else{
_10=_f-1;
end=-1;
dir=-1;
}
for(var i=_10;i!=end;i+=dir){
if(_d(this._layers[i],i)===false){
return i;
}
}
return end;
};
ns.wrap=function(_11,_12,_13,_14){
if(!_11._layers){
_11._layers=[];
_11.layer=dojo.hitch(_11,_9);
_11.unwrap=dojo.hitch(_11,_5);
_11.forEachLayer=dojo.hitch(_11,_c);
}
var _15=_1(_13.tags);
if(!dojo.some(_11._layers,function(lyr,i){
if(dojo.some(lyr.tags,function(tag){
return dojo.indexOf(_15,tag)>=0;
})){
return false;
}else{
_11._layers.splice(i,0,_13);
_13._wrap(_11,_12,_14,lyr);
return true;
}
})){
_11._layers.push(_13);
_13._wrap(_11,_12,_14);
}
return _11;
};
dojo.declare("dojox.grid.enhanced.plugins._StoreLayer",null,{tags:["normal"],layerFuncName:"_fetch",constructor:function(){
this._store=null;
this._originFetch=null;
this.__enabled=true;
},initialize:function(_16){
},uninitialize:function(_17){
},invalidate:function(){
},_wrap:function(_18,_19,_1a,_1b){
this._store=_18;
this._funcName=_19;
var _1c=dojo.hitch(this,function(){
return (this.enabled()?this[_1a||this.layerFuncName]:this.originFetch).apply(this,arguments);
});
if(_1b){
this._originFetch=_1b._originFetch;
_1b._originFetch=_1c;
}else{
this._originFetch=_18[_19]||function(){
};
_18[_19]=_1c;
}
this.initialize(_18);
},_unwrap:function(_1d){
this.uninitialize(this._store);
if(_1d){
_1d._originFetch=this._originFetch;
}else{
this._store[this._funcName]=this._originFetch;
}
this._originFetch=null;
this._store=null;
},enabled:function(_1e){
if(typeof _1e!="undefined"){
this.__enabled=!!_1e;
}
return this.__enabled;
},name:function(){
if(!this.__name){
var m=this.declaredClass.match(/(?:\.(?:_*)([^\.]+)Layer$)|(?:\.([^\.]+)$)/i);
this.__name=m?(m[1]||m[2]).toLowerCase():this.declaredClass;
}
return this.__name;
},originFetch:function(){
return (dojo.hitch(this._store,this._originFetch)).apply(this,arguments);
}});
dojo.declare("dojox.grid.enhanced.plugins._ServerSideLayer",ns._StoreLayer,{constructor:function(_1f){
_1f=_1f||{};
this._url=_1f.url||"";
this._isStateful=!!_1f.isStateful;
this._onUserCommandLoad=_1f.onCommandLoad||function(){
};
this.__cmds={cmdlayer:this.name(),enable:true};
this.useCommands(this._isStateful);
},enabled:function(_20){
var res=this.inherited(arguments);
this.__cmds.enable=this.__enabled;
return res;
},useCommands:function(_21){
if(typeof _21!="undefined"){
this.__cmds.cmdlayer=(_21&&this._isStateful)?this.name():null;
}
return !!(this.__cmds.cmdlayer);
},_fetch:function(_22){
if(this.__cmds.cmdlayer){
dojo.xhrPost({url:this._url||this._store.url,content:this.__cmds,load:dojo.hitch(this,function(_23){
this.onCommandLoad(_23,_22);
this.originFetch(_22);
}),error:dojo.hitch(this,this.onCommandError)});
}else{
this.onCommandLoad("",_22);
this.originFetch(_22);
}
return _22;
},command:function(_24,_25){
var _26=this.__cmds;
if(_25===null){
delete _26[_24];
}else{
if(typeof _25!=="undefined"){
_26[_24]=_25;
}
}
return _26[_24];
},onCommandLoad:function(_27,_28){
this._onUserCommandLoad(this.__cmds,_28,_27);
},onCommandError:function(_29){
throw _29;
}});
})();
}
