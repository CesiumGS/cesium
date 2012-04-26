/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.LazyTreeGridStoreModel"]){
dojo._hasResource["dojox.grid.LazyTreeGridStoreModel"]=true;
dojo.provide("dojox.grid.LazyTreeGridStoreModel");
dojo.require("dijit.tree.ForestStoreModel");
dojo.declare("dojox.grid.LazyTreeGridStoreModel",dijit.tree.ForestStoreModel,{serverStore:false,constructor:function(_1){
this.serverStore=_1.serverStore===true?true:false;
},mayHaveChildren:function(_2){
var _3=null;
return dojo.some(this.childrenAttrs,function(_4){
_3=this.store.getValue(_2,_4);
if(dojo.isString(_3)){
return parseInt(_3,10)>0||_3.toLowerCase()==="true"?true:false;
}else{
if(typeof _3=="number"){
return _3>0;
}else{
if(typeof _3=="boolean"){
return _3;
}else{
if(this.store.isItem(_3)){
_3=this.store.getValues(_2,_4);
return dojo.isArray(_3)?_3.length>0:false;
}else{
return false;
}
}
}
}
},this);
},getChildren:function(_5,_6,_7,_8){
if(_8){
var _9=_8.start||0,_a=_8.count,_b=_8.parentId,_c=_8.sort;
if(_5===this.root){
this.root.size=0;
this.store.fetch({start:_9,count:_a,sort:_c,query:this.query,onBegin:dojo.hitch(this,function(_d){
this.root.size=_d;
}),onComplete:dojo.hitch(this,function(_e){
_6(_e,_8,this.root.size);
}),onError:_7});
}else{
var _f=this.store;
if(!_f.isItemLoaded(_5)){
var _10=dojo.hitch(this,arguments.callee);
_f.loadItem({item:_5,onItem:function(_11){
_10(_11,_6,_7,_8);
},onError:_7});
return;
}
if(this.serverStore&&!this._isChildrenLoaded(_5)){
this.childrenSize=0;
this.store.fetch({start:_9,count:_a,sort:_c,query:dojo.mixin({parentId:_b},this.query||{}),onBegin:dojo.hitch(this,function(_12){
this.childrenSize=_12;
}),onComplete:dojo.hitch(this,function(_13){
_6(_13,_8,this.childrenSize);
}),onError:_7});
}else{
this.inherited(arguments);
}
}
}else{
this.inherited(arguments);
}
},_isChildrenLoaded:function(_14){
var _15=null;
return dojo.every(this.childrenAttrs,function(_16){
_15=this.store.getValues(_14,_16);
return dojo.every(_15,function(c){
return this.store.isItemLoaded(c);
},this);
},this);
}});
}
