/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.tree.ForestStoreModel"]){
dojo._hasResource["dijit.tree.ForestStoreModel"]=true;
dojo.provide("dijit.tree.ForestStoreModel");
dojo.require("dijit.tree.TreeStoreModel");
dojo.declare("dijit.tree.ForestStoreModel",dijit.tree.TreeStoreModel,{rootId:"$root$",rootLabel:"ROOT",query:null,constructor:function(_1){
this.root={store:this,root:true,id:_1.rootId,label:_1.rootLabel,children:_1.rootChildren};
},mayHaveChildren:function(_2){
return _2===this.root||this.inherited(arguments);
},getChildren:function(_3,_4,_5){
if(_3===this.root){
if(this.root.children){
_4(this.root.children);
}else{
this.store.fetch({query:this.query,onComplete:dojo.hitch(this,function(_6){
this.root.children=_6;
_4(_6);
}),onError:_5});
}
}else{
this.inherited(arguments);
}
},isItem:function(_7){
return (_7===this.root)?true:this.inherited(arguments);
},fetchItemByIdentity:function(_8){
if(_8.identity==this.root.id){
var _9=_8.scope?_8.scope:dojo.global;
if(_8.onItem){
_8.onItem.call(_9,this.root);
}
}else{
this.inherited(arguments);
}
},getIdentity:function(_a){
return (_a===this.root)?this.root.id:this.inherited(arguments);
},getLabel:function(_b){
return (_b===this.root)?this.root.label:this.inherited(arguments);
},newItem:function(_c,_d,_e){
if(_d===this.root){
this.onNewRootItem(_c);
return this.store.newItem(_c);
}else{
return this.inherited(arguments);
}
},onNewRootItem:function(_f){
},pasteItem:function(_10,_11,_12,_13,_14){
if(_11===this.root){
if(!_13){
this.onLeaveRoot(_10);
}
}
dijit.tree.TreeStoreModel.prototype.pasteItem.call(this,_10,_11===this.root?null:_11,_12===this.root?null:_12,_13,_14);
if(_12===this.root){
this.onAddToRoot(_10);
}
},onAddToRoot:function(_15){
},onLeaveRoot:function(_16){
},_requeryTop:function(){
var _17=this.root.children||[];
this.store.fetch({query:this.query,onComplete:dojo.hitch(this,function(_18){
this.root.children=_18;
if(_17.length!=_18.length||dojo.some(_17,function(_19,idx){
return _18[idx]!=_19;
})){
this.onChildrenChange(this.root,_18);
}
})});
},onNewItem:function(_1a,_1b){
this._requeryTop();
this.inherited(arguments);
},onDeleteItem:function(_1c){
if(dojo.indexOf(this.root.children,_1c)!=-1){
this._requeryTop();
}
this.inherited(arguments);
},onSetItem:function(_1d,_1e,_1f,_20){
this._requeryTop();
this.inherited(arguments);
}});
}
