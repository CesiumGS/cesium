//>>built
define("dijit/form/_FormSelectWidget",["dojo/_base/array","dojo/_base/Deferred","dojo/aspect","dojo/data/util/sorter","dojo/_base/declare","dojo/dom","dojo/dom-class","dojo/_base/kernel","dojo/_base/lang","dojo/query","dojo/when","dojo/store/util/QueryResults","./_FormValueWidget"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d){
var _e=_5("dijit.form._FormSelectWidget",_d,{multiple:false,options:null,store:null,query:null,queryOptions:null,labelAttr:"",onFetch:null,sortByLabel:true,loadChildrenOnOpen:false,onLoadDeferred:null,getOptions:function(_f){
var _10=this.options||[];
if(_f==null){
return _10;
}
if(_9.isArray(_f)){
return _1.map(_f,"return this.getOptions(item);",this);
}
if(_9.isString(_f)){
_f={value:_f};
}
if(_9.isObject(_f)){
if(!_1.some(_10,function(_11,idx){
for(var a in _f){
if(!(a in _11)||_11[a]!=_f[a]){
return false;
}
}
_f=idx;
return true;
})){
_f=-1;
}
}
if(_f>=0&&_f<_10.length){
return _10[_f];
}
return null;
},addOption:function(_12){
_1.forEach(_9.isArray(_12)?_12:[_12],function(i){
if(i&&_9.isObject(i)){
this.options.push(i);
}
},this);
this._loadChildren();
},removeOption:function(_13){
var _14=this.getOptions(_9.isArray(_13)?_13:[_13]);
_1.forEach(_14,function(_15){
if(_15){
this.options=_1.filter(this.options,function(_16){
return (_16.value!==_15.value||_16.label!==_15.label);
});
this._removeOptionItem(_15);
}
},this);
this._loadChildren();
},updateOption:function(_17){
_1.forEach(_9.isArray(_17)?_17:[_17],function(i){
var _18=this.getOptions({value:i.value}),k;
if(_18){
for(k in i){
_18[k]=i[k];
}
}
},this);
this._loadChildren();
},setStore:function(_19,_1a,_1b){
var _1c=this.store;
_1b=_1b||{};
if(_1c!==_19){
var h;
while((h=this._notifyConnections.pop())){
h.remove();
}
if(!_19.get){
_9.mixin(_19,{_oldAPI:true,get:function(id){
var _1d=new _2();
this.fetchItemByIdentity({identity:id,onItem:function(_1e){
_1d.resolve(_1e);
},onError:function(_1f){
_1d.reject(_1f);
}});
return _1d.promise;
},query:function(_20,_21){
var _22=new _2(function(){
if(_23.abort){
_23.abort();
}
});
_22.total=new _2();
var _23=this.fetch(_9.mixin({query:_20,onBegin:function(_24){
_22.total.resolve(_24);
},onComplete:function(_25){
_22.resolve(_25);
},onError:function(_26){
_22.reject(_26);
}},_21));
return new _c(_22);
}});
if(_19.getFeatures()["dojo.data.api.Notification"]){
this._notifyConnections=[_3.after(_19,"onNew",_9.hitch(this,"_onNewItem"),true),_3.after(_19,"onDelete",_9.hitch(this,"_onDeleteItem"),true),_3.after(_19,"onSet",_9.hitch(this,"_onSetItem"),true)];
}
}
this._set("store",_19);
}
if(this.options&&this.options.length){
this.removeOption(this.options);
}
if(this._queryRes&&this._queryRes.close){
this._queryRes.close();
}
if(_1b.query){
this._set("query",_1b.query);
this._set("queryOptions",_1b.queryOptions);
}
if(_19){
this._loadingStore=true;
this.onLoadDeferred=new _2();
this._queryRes=_19.query(this.query,this.queryOptions);
_b(this._queryRes,_9.hitch(this,function(_27){
if(this.sortByLabel&&!_1b.sort&&_27.length){
if(_19.getValue){
_27.sort(_4.createSortFunction([{attribute:_19.getLabelAttributes(_27[0])[0]}],_19));
}else{
var _28=this.labelAttr;
_27.sort(function(a,b){
return a[_28]>b[_28]?1:b[_28]>a[_28]?-1:0;
});
}
}
if(_1b.onFetch){
_27=_1b.onFetch.call(this,_27,_1b);
}
_1.forEach(_27,function(i){
this._addOptionForItem(i);
},this);
if(this._queryRes.observe){
this._queryRes.observe(_9.hitch(this,function(_29,_2a,_2b){
if(_2a==_2b){
this._onSetItem(_29);
}else{
if(_2a!=-1){
this._onDeleteItem(_29);
}
if(_2b!=-1){
this._onNewItem(_29);
}
}
}),true);
}
this._loadingStore=false;
this.set("value","_pendingValue" in this?this._pendingValue:_1a);
delete this._pendingValue;
if(!this.loadChildrenOnOpen){
this._loadChildren();
}else{
this._pseudoLoadChildren(_27);
}
this.onLoadDeferred.resolve(true);
this.onSetStore();
}),function(err){
console.error("dijit.form.Select: "+err.toString());
this.onLoadDeferred.reject(err);
});
}
return _1c;
},_setValueAttr:function(_2c,_2d){
if(!this._onChangeActive){
_2d=null;
}
if(this._loadingStore){
this._pendingValue=_2c;
return;
}
if(_2c==null){
return;
}
if(_9.isArray(_2c)){
_2c=_1.map(_2c,function(_2e){
return _9.isObject(_2e)?_2e:{value:_2e};
});
}else{
if(_9.isObject(_2c)){
_2c=[_2c];
}else{
_2c=[{value:_2c}];
}
}
_2c=_1.filter(this.getOptions(_2c),function(i){
return i&&i.value;
});
var _2f=this.getOptions()||[];
if(!this.multiple&&(!_2c[0]||!_2c[0].value)&&!!_2f.length){
_2c[0]=_2f[0];
}
_1.forEach(_2f,function(opt){
opt.selected=_1.some(_2c,function(v){
return v.value===opt.value;
});
});
var val=_1.map(_2c,function(opt){
return opt.value;
});
if(typeof val=="undefined"||typeof val[0]=="undefined"){
return;
}
var _30=_1.map(_2c,function(opt){
return opt.label;
});
this._setDisplay(this.multiple?_30:_30[0]);
this.inherited(arguments,[this.multiple?val:val[0],_2d]);
this._updateSelection();
},_getDisplayedValueAttr:function(){
var ret=_1.map([].concat(this.get("selectedOptions")),function(v){
if(v&&"label" in v){
return v.label;
}else{
if(v){
return v.value;
}
}
return null;
},this);
return this.multiple?ret:ret[0];
},_setDisplayedValueAttr:function(_31){
this.set("value",this.getOptions(typeof _31=="string"?{label:_31}:_31));
},_loadChildren:function(){
if(this._loadingStore){
return;
}
_1.forEach(this._getChildren(),function(_32){
_32.destroyRecursive();
});
_1.forEach(this.options,this._addOptionItem,this);
this._updateSelection();
},_updateSelection:function(){
this.focusedChild=null;
this._set("value",this._getValueFromOpts());
var val=[].concat(this.value);
if(val&&val[0]){
var _33=this;
_1.forEach(this._getChildren(),function(_34){
var _35=_1.some(val,function(v){
return _34.option&&(v===_34.option.value);
});
if(_35&&!_33.multiple){
_33.focusedChild=_34;
}
_7.toggle(_34.domNode,this.baseClass.replace(/\s+|$/g,"SelectedOption "),_35);
_34.domNode.setAttribute("aria-selected",_35?"true":"false");
},this);
}
},_getValueFromOpts:function(){
var _36=this.getOptions()||[];
if(!this.multiple&&_36.length){
var opt=_1.filter(_36,function(i){
return i.selected;
})[0];
if(opt&&opt.value){
return opt.value;
}else{
_36[0].selected=true;
return _36[0].value;
}
}else{
if(this.multiple){
return _1.map(_1.filter(_36,function(i){
return i.selected;
}),function(i){
return i.value;
})||[];
}
}
return "";
},_onNewItem:function(_37,_38){
if(!_38||!_38.parent){
this._addOptionForItem(_37);
}
},_onDeleteItem:function(_39){
var _3a=this.store;
this.removeOption({value:_3a.getIdentity(_39)});
},_onSetItem:function(_3b){
this.updateOption(this._getOptionObjForItem(_3b));
},_getOptionObjForItem:function(_3c){
var _3d=this.store,_3e=(this.labelAttr&&this.labelAttr in _3c)?_3c[this.labelAttr]:_3d.getLabel(_3c),_3f=(_3e?_3d.getIdentity(_3c):null);
return {value:_3f,label:_3e,item:_3c};
},_addOptionForItem:function(_40){
var _41=this.store;
if(_41.isItemLoaded&&!_41.isItemLoaded(_40)){
_41.loadItem({item:_40,onItem:function(i){
this._addOptionForItem(i);
},scope:this});
return;
}
var _42=this._getOptionObjForItem(_40);
this.addOption(_42);
},constructor:function(_43){
this._oValue=(_43||{}).value||null;
this._notifyConnections=[];
},buildRendering:function(){
this.inherited(arguments);
_6.setSelectable(this.focusNode,false);
},_fillContent:function(){
if(!this.options){
this.options=this.srcNodeRef?_a("> *",this.srcNodeRef).map(function(_44){
if(_44.getAttribute("type")==="separator"){
return {value:"",label:"",selected:false,disabled:false};
}
return {value:(_44.getAttribute("data-"+_8._scopeName+"-value")||_44.getAttribute("value")),label:String(_44.innerHTML),selected:_44.getAttribute("selected")||false,disabled:_44.getAttribute("disabled")||false};
},this):[];
}
if(!this.value){
this._set("value",this._getValueFromOpts());
}else{
if(this.multiple&&typeof this.value=="string"){
this._set("value",this.value.split(","));
}
}
},postCreate:function(){
this.inherited(arguments);
_3.after(this,"onChange",_9.hitch(this,"_updateSelection"));
var _45=this.store;
if(_45&&(_45.getIdentity||_45.getFeatures()["dojo.data.api.Identity"])){
this.store=null;
this.setStore(_45,this._oValue);
}
},startup:function(){
this._loadChildren();
this.inherited(arguments);
},destroy:function(){
var h;
while((h=this._notifyConnections.pop())){
h.remove();
}
if(this._queryRes&&this._queryRes.close){
this._queryRes.close();
}
this.inherited(arguments);
},_addOptionItem:function(){
},_removeOptionItem:function(){
},_setDisplay:function(){
},_getChildren:function(){
return [];
},_getSelectedOptionsAttr:function(){
return this.getOptions({selected:true});
},_pseudoLoadChildren:function(){
},onSetStore:function(){
}});
return _e;
});
