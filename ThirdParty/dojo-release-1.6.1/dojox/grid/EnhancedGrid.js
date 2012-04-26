/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.EnhancedGrid"]){
dojo._hasResource["dojox.grid.EnhancedGrid"]=true;
dojo.provide("dojox.grid.EnhancedGrid");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.enhanced._PluginManager");
dojo.requireLocalization("dojox.grid.enhanced","EnhancedGrid",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hr,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.grid.EnhancedGrid");
dojo.declare("dojox.grid.EnhancedGrid",dojox.grid.DataGrid,{plugins:null,pluginMgr:null,keepSelection:false,_pluginMgrClass:dojox.grid.enhanced._PluginManager,postMixInProperties:function(){
this._nls=dojo.i18n.getLocalization("dojox.grid.enhanced","EnhancedGrid",this.lang);
this.inherited(arguments);
},postCreate:function(){
this.pluginMgr=new this._pluginMgrClass(this);
this.pluginMgr.preInit();
this.inherited(arguments);
this.pluginMgr.postInit();
},plugin:function(_1){
return this.pluginMgr.getPlugin(_1);
},startup:function(){
this.inherited(arguments);
this.pluginMgr.startup();
},createSelection:function(){
this.selection=new dojox.grid.enhanced.DataSelection(this);
},canSort:function(_2,_3){
return true;
},doKeyEvent:function(e){
try{
var _4=this.focus.focusView;
_4.content.decorateEvent(e);
if(!e.cell){
_4.header.decorateEvent(e);
}
}
catch(e){
}
this.inherited(arguments);
},doApplyCellEdit:function(_5,_6,_7){
if(!_7){
this.invalidated[_6]=true;
return;
}
this.inherited(arguments);
},mixin:function(_8,_9){
var _a={};
for(var p in _9){
if(p=="_inherited"||p=="declaredClass"||p=="constructor"||_9["privates"]&&_9["privates"][p]){
continue;
}
_a[p]=_9[p];
}
dojo.mixin(_8,_a);
},_copyAttr:function(_b,_c){
if(!_c){
return;
}
return this.inherited(arguments);
},_getHeaderHeight:function(){
this.inherited(arguments);
return dojo.marginBox(this.viewsHeaderNode).h;
},_fetch:function(_d,_e){
if(this.items){
return this.inherited(arguments);
}
_d=_d||0;
if(this.store&&!this._pending_requests[_d]){
if(!this._isLoaded&&!this._isLoading){
this._isLoading=true;
this.showMessage(this.loadingMessage);
}
this._pending_requests[_d]=true;
try{
var _f={start:_d,count:this.rowsPerPage,query:this.query,sort:this.getSortProps(),queryOptions:this.queryOptions,isRender:_e,onBegin:dojo.hitch(this,"_onFetchBegin"),onComplete:dojo.hitch(this,"_onFetchComplete"),onError:dojo.hitch(this,"_onFetchError")};
this._storeLayerFetch(_f);
}
catch(e){
this._onFetchError(e,{start:_d,count:this.rowsPerPage});
}
}
return 0;
},_storeLayerFetch:function(req){
this.store.fetch(req);
},getCellByField:function(_10){
return dojo.filter(this.layout.cells,function(_11){
return _11.field==_10;
})[0];
},onMouseUp:function(e){
},createView:function(){
var _12=this.inherited(arguments);
if(dojo.isMoz){
var _13=function(_14,_15){
for(var n=_14;n&&_15(n);n=n.parentNode){
}
return n;
};
var _16=function(_17){
var _18=_17.toUpperCase();
return function(_19){
return _19.tagName!=_18;
};
};
var _1a=_12.header.getCellX;
_12.header.getCellX=function(e){
var x=_1a.call(_12.header,e);
var n=_13(e.target,_16("th"));
if(n&&n!==e.target&&dojo.isDescendant(e.target,n)){
x+=n.firstChild.offsetLeft;
}
return x;
};
}
return _12;
},destroy:function(){
delete this._nls;
this.selection.destroy();
this.pluginMgr.destroy();
this.inherited(arguments);
}});
dojo.provide("dojox.grid.enhanced.DataSelection");
dojo.require("dojox.grid.enhanced.plugins._SelectionPreserver");
dojo.declare("dojox.grid.enhanced.DataSelection",dojox.grid.DataSelection,{constructor:function(_1b){
if(_1b.keepSelection){
this.preserver=new dojox.grid.enhanced.plugins._SelectionPreserver(this);
}
},_range:function(_1c,_1d){
this.grid._selectingRange=true;
this.inherited(arguments);
this.grid._selectingRange=false;
this.onChanged();
},deselectAll:function(_1e){
this.grid._selectingRange=true;
this.inherited(arguments);
this.grid._selectingRange=false;
this.onChanged();
},destroy:function(){
if(this.preserver){
this.preserver.destroy();
}
}});
dojox.grid.EnhancedGrid.markupFactory=function(_1f,_20,_21,_22){
return dojox.grid._Grid.markupFactory(_1f,_20,_21,dojo.partial(dojox.grid.DataGrid.cell_markupFactory,_22));
};
dojox.grid.EnhancedGrid.registerPlugin=function(_23,_24){
dojox.grid.enhanced._PluginManager.registerPlugin(_23,_24);
};
}
