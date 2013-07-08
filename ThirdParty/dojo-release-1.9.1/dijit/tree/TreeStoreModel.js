//>>built
define("dijit/tree/TreeStoreModel",["dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/_base/lang"],function(_1,_2,_3,_4){
return _3("dijit.tree.TreeStoreModel",null,{store:null,childrenAttrs:["children"],newItemIdAttr:"id",labelAttr:"",root:null,query:null,deferItemLoadingUntilExpand:false,constructor:function(_5){
_4.mixin(this,_5);
this.connects=[];
var _6=this.store;
if(!_6.getFeatures()["dojo.data.api.Identity"]){
throw new Error("dijit.tree.TreeStoreModel: store must support dojo.data.Identity");
}
if(_6.getFeatures()["dojo.data.api.Notification"]){
this.connects=this.connects.concat([_2.after(_6,"onNew",_4.hitch(this,"onNewItem"),true),_2.after(_6,"onDelete",_4.hitch(this,"onDeleteItem"),true),_2.after(_6,"onSet",_4.hitch(this,"onSetItem"),true)]);
}
},destroy:function(){
var h;
while(h=this.connects.pop()){
h.remove();
}
},getRoot:function(_7,_8){
if(this.root){
_7(this.root);
}else{
this.store.fetch({query:this.query,onComplete:_4.hitch(this,function(_9){
if(_9.length!=1){
throw new Error("dijit.tree.TreeStoreModel: root query returned "+_9.length+" items, but must return exactly one");
}
this.root=_9[0];
_7(this.root);
}),onError:_8});
}
},mayHaveChildren:function(_a){
return _1.some(this.childrenAttrs,function(_b){
return this.store.hasAttribute(_a,_b);
},this);
},getChildren:function(_c,_d,_e){
var _f=this.store;
if(!_f.isItemLoaded(_c)){
var _10=_4.hitch(this,arguments.callee);
_f.loadItem({item:_c,onItem:function(_11){
_10(_11,_d,_e);
},onError:_e});
return;
}
var _12=[];
for(var i=0;i<this.childrenAttrs.length;i++){
var _13=_f.getValues(_c,this.childrenAttrs[i]);
_12=_12.concat(_13);
}
var _14=0;
if(!this.deferItemLoadingUntilExpand){
_1.forEach(_12,function(_15){
if(!_f.isItemLoaded(_15)){
_14++;
}
});
}
if(_14==0){
_d(_12);
}else{
_1.forEach(_12,function(_16,idx){
if(!_f.isItemLoaded(_16)){
_f.loadItem({item:_16,onItem:function(_17){
_12[idx]=_17;
if(--_14==0){
_d(_12);
}
},onError:_e});
}
});
}
},isItem:function(_18){
return this.store.isItem(_18);
},fetchItemByIdentity:function(_19){
this.store.fetchItemByIdentity(_19);
},getIdentity:function(_1a){
return this.store.getIdentity(_1a);
},getLabel:function(_1b){
if(this.labelAttr){
return this.store.getValue(_1b,this.labelAttr);
}else{
return this.store.getLabel(_1b);
}
},newItem:function(_1c,_1d,_1e){
var _1f={parent:_1d,attribute:this.childrenAttrs[0]},_20;
if(this.newItemIdAttr&&_1c[this.newItemIdAttr]){
this.fetchItemByIdentity({identity:_1c[this.newItemIdAttr],scope:this,onItem:function(_21){
if(_21){
this.pasteItem(_21,null,_1d,true,_1e);
}else{
_20=this.store.newItem(_1c,_1f);
if(_20&&(_1e!=undefined)){
this.pasteItem(_20,_1d,_1d,false,_1e);
}
}
}});
}else{
_20=this.store.newItem(_1c,_1f);
if(_20&&(_1e!=undefined)){
this.pasteItem(_20,_1d,_1d,false,_1e);
}
}
},pasteItem:function(_22,_23,_24,_25,_26){
var _27=this.store,_28=this.childrenAttrs[0];
if(_23){
_1.forEach(this.childrenAttrs,function(_29){
if(_27.containsValue(_23,_29,_22)){
if(!_25){
var _2a=_1.filter(_27.getValues(_23,_29),function(x){
return x!=_22;
});
_27.setValues(_23,_29,_2a);
}
_28=_29;
}
});
}
if(_24){
if(typeof _26=="number"){
var _2b=_27.getValues(_24,_28).slice();
_2b.splice(_26,0,_22);
_27.setValues(_24,_28,_2b);
}else{
_27.setValues(_24,_28,_27.getValues(_24,_28).concat(_22));
}
}
},onChange:function(){
},onChildrenChange:function(){
},onDelete:function(){
},onNewItem:function(_2c,_2d){
if(!_2d){
return;
}
this.getChildren(_2d.item,_4.hitch(this,function(_2e){
this.onChildrenChange(_2d.item,_2e);
}));
},onDeleteItem:function(_2f){
this.onDelete(_2f);
},onSetItem:function(_30,_31){
if(_1.indexOf(this.childrenAttrs,_31)!=-1){
this.getChildren(_30,_4.hitch(this,function(_32){
this.onChildrenChange(_30,_32);
}));
}else{
this.onChange(_30);
}
}});
});
