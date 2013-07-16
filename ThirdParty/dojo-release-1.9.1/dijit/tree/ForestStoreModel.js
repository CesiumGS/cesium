//>>built
define("dijit/tree/ForestStoreModel",["dojo/_base/array","dojo/_base/declare","dojo/_base/kernel","dojo/_base/lang","./TreeStoreModel"],function(_1,_2,_3,_4,_5){
return _2("dijit.tree.ForestStoreModel",_5,{rootId:"$root$",rootLabel:"ROOT",query:null,constructor:function(_6){
this.root={store:this,root:true,id:_6.rootId,label:_6.rootLabel,children:_6.rootChildren};
},mayHaveChildren:function(_7){
return _7===this.root||this.inherited(arguments);
},getChildren:function(_8,_9,_a){
if(_8===this.root){
if(this.root.children){
_9(this.root.children);
}else{
this.store.fetch({query:this.query,onComplete:_4.hitch(this,function(_b){
this.root.children=_b;
_9(_b);
}),onError:_a});
}
}else{
this.inherited(arguments);
}
},isItem:function(_c){
return (_c===this.root)?true:this.inherited(arguments);
},fetchItemByIdentity:function(_d){
if(_d.identity==this.root.id){
var _e=_d.scope||_3.global;
if(_d.onItem){
_d.onItem.call(_e,this.root);
}
}else{
this.inherited(arguments);
}
},getIdentity:function(_f){
return (_f===this.root)?this.root.id:this.inherited(arguments);
},getLabel:function(_10){
return (_10===this.root)?this.root.label:this.inherited(arguments);
},newItem:function(_11,_12,_13){
if(_12===this.root){
this.onNewRootItem(_11);
return this.store.newItem(_11);
}else{
return this.inherited(arguments);
}
},onNewRootItem:function(){
},pasteItem:function(_14,_15,_16,_17,_18){
if(_15===this.root){
if(!_17){
this.onLeaveRoot(_14);
}
}
this.inherited(arguments,[_14,_15===this.root?null:_15,_16===this.root?null:_16,_17,_18]);
if(_16===this.root){
this.onAddToRoot(_14);
}
},onAddToRoot:function(_19){
},onLeaveRoot:function(_1a){
},_requeryTop:function(){
var _1b=this.root.children||[];
this.store.fetch({query:this.query,onComplete:_4.hitch(this,function(_1c){
this.root.children=_1c;
if(_1b.length!=_1c.length||_1.some(_1b,function(_1d,idx){
return _1c[idx]!=_1d;
})){
this.onChildrenChange(this.root,_1c);
}
})});
},onNewItem:function(_1e,_1f){
this._requeryTop();
this.inherited(arguments);
},onDeleteItem:function(_20){
if(_1.indexOf(this.root.children,_20)!=-1){
this._requeryTop();
}
this.inherited(arguments);
},onSetItem:function(_21,_22,_23,_24){
this._requeryTop();
this.inherited(arguments);
}});
});
