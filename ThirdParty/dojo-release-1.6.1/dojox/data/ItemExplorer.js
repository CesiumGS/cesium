/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.ItemExplorer"]){
dojo._hasResource["dojox.data.ItemExplorer"]=true;
dojo.provide("dojox.data.ItemExplorer");
dojo.require("dijit.Tree");
dojo.require("dijit.Dialog");
dojo.require("dijit.Menu");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.form.Textarea");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.FilteringSelect");
(function(){
var _1=function(_2,_3,_4){
var _5=_2.getValues(_3,_4);
if(_5.length<2){
_5=_2.getValue(_3,_4);
}
return _5;
};
dojo.declare("dojox.data.ItemExplorer",dijit.Tree,{useSelect:false,refSelectSearchAttr:null,constructor:function(_6){
dojo.mixin(this,_6);
var _7=this;
var _8={};
var _9=this.rootModelNode={value:_8,id:"root"};
this._modelNodeIdMap={};
this._modelNodePropMap={};
var _a=1;
this.model={getRoot:function(_b){
_b(_9);
},mayHaveChildren:function(_c){
return _c.value&&typeof _c.value=="object"&&!(_c.value instanceof Date);
},getChildren:function(_d,_e,_f){
var _10,_11,_12=_d.value;
var _13=[];
if(_12==_8){
_e([]);
return;
}
var _14=_7.store&&_7.store.isItem(_12,true);
if(_14&&!_7.store.isItemLoaded(_12)){
_7.store.loadItem({item:_12,onItem:function(_15){
_12=_15;
_16();
}});
}else{
_16();
}
function _16(){
if(_14){
_10=_7.store.getAttributes(_12);
_11=_12;
}else{
if(_12&&typeof _12=="object"){
_11=_d.value;
_10=[];
for(var i in _12){
if(_12.hasOwnProperty(i)&&i!="__id"&&i!="__clientId"){
_10.push(i);
}
}
}
}
if(_10){
for(var key,k=0;key=_10[k++];){
_13.push({property:key,value:_14?_1(_7.store,_12,key):_12[key],parent:_11});
}
_13.push({addNew:true,parent:_11,parentNode:_d});
}
_e(_13);
};
},getIdentity:function(_17){
if(!_17.id){
if(_17.addNew){
_17.property="--addNew";
}
_17.id=_a++;
if(_7.store){
if(_7.store.isItem(_17.value)){
var _18=_7.store.getIdentity(_17.value);
(_7._modelNodeIdMap[_18]=_7._modelNodeIdMap[_18]||[]).push(_17);
}
if(_17.parent){
_18=_7.store.getIdentity(_17.parent)+"."+_17.property;
(_7._modelNodePropMap[_18]=_7._modelNodePropMap[_18]||[]).push(_17);
}
}
}
return _17.id;
},getLabel:function(_19){
return _19===_9?"Object Properties":_19.addNew?(_19.parent instanceof Array?"Add new value":"Add new property"):_19.property+": "+(_19.value instanceof Array?"("+_19.value.length+" elements)":_19.value);
},onChildrenChange:function(_1a){
},onChange:function(_1b){
}};
},postCreate:function(){
this.inherited(arguments);
dojo.connect(this,"onClick",function(_1c,_1d){
this.lastFocused=_1d;
if(_1c.addNew){
this._addProperty();
}else{
this._editProperty();
}
});
var _1e=new dijit.Menu({targetNodeIds:[this.rootNode.domNode],id:"contextMenu"});
dojo.connect(_1e,"_openMyself",this,function(e){
var _1f=dijit.getEnclosingWidget(e.target);
if(_1f){
var _20=_1f.item;
if(this.store.isItem(_20.value,true)&&!_20.parent){
dojo.forEach(_1e.getChildren(),function(_21){
_21.attr("disabled",(_21.label!="Add"));
});
this.lastFocused=_1f;
}else{
if(_20.value&&typeof _20.value=="object"&&!(_20.value instanceof Date)){
dojo.forEach(_1e.getChildren(),function(_22){
_22.attr("disabled",(_22.label!="Add")&&(_22.label!="Delete"));
});
this.lastFocused=_1f;
}else{
if(_20.property&&dojo.indexOf(this.store.getIdentityAttributes(),_20.property)>=0){
this.focusNode(_1f);
alert("Cannot modify an Identifier node.");
}else{
if(_20.addNew){
this.focusNode(_1f);
}else{
dojo.forEach(_1e.getChildren(),function(_23){
_23.attr("disabled",(_23.label!="Edit")&&(_23.label!="Delete"));
});
this.lastFocused=_1f;
}
}
}
}
}
});
_1e.addChild(new dijit.MenuItem({label:"Add",onClick:dojo.hitch(this,"_addProperty")}));
_1e.addChild(new dijit.MenuItem({label:"Edit",onClick:dojo.hitch(this,"_editProperty")}));
_1e.addChild(new dijit.MenuItem({label:"Delete",onClick:dojo.hitch(this,"_destroyProperty")}));
_1e.startup();
},store:null,setStore:function(_24){
this.store=_24;
var _25=this;
if(this._editDialog){
this._editDialog.destroyRecursive();
delete this._editDialog;
}
dojo.connect(_24,"onSet",function(_26,_27,_28,_29){
var _2a,i,_2b=_25.store.getIdentity(_26);
_2a=_25._modelNodeIdMap[_2b];
if(_2a&&(_28===undefined||_29===undefined||_28 instanceof Array||_29 instanceof Array||typeof _28=="object"||typeof _29=="object")){
for(i=0;i<_2a.length;i++){
(function(_2c){
_25.model.getChildren(_2c,function(_2d){
_25.model.onChildrenChange(_2c,_2d);
});
})(_2a[i]);
}
}
_2a=_25._modelNodePropMap[_2b+"."+_27];
if(_2a){
for(i=0;i<_2a.length;i++){
_2a[i].value=_29;
_25.model.onChange(_2a[i]);
}
}
});
this.rootNode.setChildItems([]);
},setItem:function(_2e){
(this._modelNodeIdMap={})[this.store.getIdentity(_2e)]=[this.rootModelNode];
this._modelNodePropMap={};
this.rootModelNode.value=_2e;
var _2f=this;
this.model.getChildren(this.rootModelNode,function(_30){
_2f.rootNode.setChildItems(_30);
});
},refreshItem:function(){
this.setItem(this.rootModelNode.value);
},_createEditDialog:function(){
this._editDialog=new dijit.Dialog({title:"Edit Property",execute:dojo.hitch(this,"_updateItem"),preload:true});
this._editDialog.placeAt(dojo.body());
this._editDialog.startup();
var _31=dojo.doc.createElement("div");
var _32=dojo.doc.createElement("label");
dojo.attr(_32,"for","property");
dojo.style(_32,"fontWeight","bold");
dojo.attr(_32,"innerHTML","Property:");
_31.appendChild(_32);
var _33=new dijit.form.ValidationTextBox({name:"property",value:"",required:true,disabled:true}).placeAt(_31);
_31.appendChild(dojo.doc.createElement("br"));
_31.appendChild(dojo.doc.createElement("br"));
var _34=new dijit.form.RadioButton({name:"itemType",value:"value",onClick:dojo.hitch(this,function(){
this._enableFields("value");
})}).placeAt(_31);
var _35=dojo.doc.createElement("label");
dojo.attr(_35,"for","value");
dojo.attr(_35,"innerHTML","Value (JSON):");
_31.appendChild(_35);
var _36=dojo.doc.createElement("div");
dojo.addClass(_36,"value");
var _37=new dijit.form.Textarea({name:"jsonVal"}).placeAt(_36);
_31.appendChild(_36);
var _38=new dijit.form.RadioButton({name:"itemType",value:"reference",onClick:dojo.hitch(this,function(){
this._enableFields("reference");
})}).placeAt(_31);
var _39=dojo.doc.createElement("label");
dojo.attr(_39,"for","_reference");
dojo.attr(_39,"innerHTML","Reference (ID):");
_31.appendChild(_39);
_31.appendChild(dojo.doc.createElement("br"));
var _3a=dojo.doc.createElement("div");
dojo.addClass(_3a,"reference");
if(this.useSelect){
var _3b=new dijit.form.FilteringSelect({name:"_reference",store:this.store,searchAttr:this.refSelectSearchAttr||this.store.getIdentityAttributes()[0],required:false,value:null,pageSize:10}).placeAt(_3a);
}else{
var _3c=new dijit.form.ValidationTextBox({name:"_reference",value:"",promptMessage:"Enter the ID of the item to reference",isValid:dojo.hitch(this,function(_3d){
return true;
})}).placeAt(_3a);
}
_31.appendChild(_3a);
_31.appendChild(dojo.doc.createElement("br"));
_31.appendChild(dojo.doc.createElement("br"));
var _3e=document.createElement("div");
_3e.setAttribute("dir","rtl");
var _3f=new dijit.form.Button({type:"reset",label:"Cancel"}).placeAt(_3e);
_3f.onClick=dojo.hitch(this._editDialog,"onCancel");
var _40=new dijit.form.Button({type:"submit",label:"OK"}).placeAt(_3e);
_31.appendChild(_3e);
this._editDialog.attr("content",_31);
},_enableFields:function(_41){
switch(_41){
case "reference":
dojo.query(".value [widgetId]",this._editDialog.containerNode).forEach(function(_42){
dijit.getEnclosingWidget(_42).attr("disabled",true);
});
dojo.query(".reference [widgetId]",this._editDialog.containerNode).forEach(function(_43){
dijit.getEnclosingWidget(_43).attr("disabled",false);
});
break;
case "value":
dojo.query(".value [widgetId]",this._editDialog.containerNode).forEach(function(_44){
dijit.getEnclosingWidget(_44).attr("disabled",false);
});
dojo.query(".reference [widgetId]",this._editDialog.containerNode).forEach(function(_45){
dijit.getEnclosingWidget(_45).attr("disabled",true);
});
break;
}
},_updateItem:function(_46){
var _47,_48,val,_49,_4a=this._editDialog.attr("title")=="Edit Property";
var _4b=this._editDialog;
var _4c=this.store;
function _4d(){
try{
var _4e,_4f=[];
var _50=_46.property;
if(_4a){
while(!_4c.isItem(_48.parent,true)){
_47=_47.getParent();
_4f.push(_48.property);
_48=_47.item;
}
if(_4f.length==0){
_4c.setValue(_48.parent,_48.property,val);
}else{
_49=_1(_4c,_48.parent,_48.property);
if(_49 instanceof Array){
_49=_49.concat();
}
_4e=_49;
while(_4f.length>1){
_4e=_4e[_4f.pop()];
}
_4e[_4f]=val;
_4c.setValue(_48.parent,_48.property,_49);
}
}else{
if(_4c.isItem(_51,true)){
if(!_4c.isItemLoaded(_51)){
_4c.loadItem({item:_51,onItem:function(_52){
if(_52 instanceof Array){
_50=_52.length;
}
_4c.setValue(_52,_50,val);
}});
}else{
if(_51 instanceof Array){
_50=_51.length;
}
_4c.setValue(_51,_50,val);
}
}else{
if(_48.value instanceof Array){
_4f.push(_48.value.length);
}else{
_4f.push(_46.property);
}
while(!_4c.isItem(_48.parent,true)){
_47=_47.getParent();
_4f.push(_48.property);
_48=_47.item;
}
_49=_1(_4c,_48.parent,_48.property);
_4e=_49;
while(_4f.length>1){
_4e=_4e[_4f.pop()];
}
_4e[_4f]=val;
_4c.setValue(_48.parent,_48.property,_49);
}
}
}
catch(e){
alert(e);
}
};
if(_4b.validate()){
_47=this.lastFocused;
_48=_47.item;
var _51=_48.value;
if(_48.addNew){
_51=_47.item.parent;
_47=_47.getParent();
_48=_47.item;
}
val=null;
switch(_46.itemType){
case "reference":
this.store.fetchItemByIdentity({identity:_46._reference,onItem:function(_53){
val=_53;
_4d();
},onError:function(){
alert("The id could not be found");
}});
break;
case "value":
var _54=_46.jsonVal;
val=dojo.fromJson(_54);
if(typeof val=="function"){
val.toString=function(){
return _54;
};
}
_4d();
break;
}
}else{
_4b.show();
}
},_editProperty:function(){
var _55=dojo.mixin({},this.lastFocused.item);
if(!this._editDialog){
this._createEditDialog();
}else{
this._editDialog.reset();
}
if(dojo.indexOf(this.store.getIdentityAttributes(),_55.property)>=0){
alert("Cannot Edit an Identifier!");
}else{
this._editDialog.attr("title","Edit Property");
dijit.getEnclosingWidget(dojo.query("input",this._editDialog.containerNode)[0]).attr("disabled",true);
if(this.store.isItem(_55.value,true)){
if(_55.parent){
_55.itemType="reference";
this._enableFields(_55.itemType);
_55._reference=this.store.getIdentity(_55.value);
this._editDialog.attr("value",_55);
this._editDialog.show();
}
}else{
if(_55.value&&typeof _55.value=="object"&&!(_55.value instanceof Date)){
}else{
_55.itemType="value";
this._enableFields(_55.itemType);
_55.jsonVal=typeof _55.value=="function"?_55.value.toString():_55.value instanceof Date?"new Date(\""+_55.value+"\")":dojo.toJson(_55.value);
this._editDialog.attr("value",_55);
this._editDialog.show();
}
}
}
},_destroyProperty:function(){
var _56=this.lastFocused;
var _57=_56.item;
var _58=[];
while(!this.store.isItem(_57.parent,true)||_57.parent instanceof Array){
_56=_56.getParent();
_58.push(_57.property);
_57=_56.item;
}
if(dojo.indexOf(this.store.getIdentityAttributes(),_57.property)>=0){
alert("Cannot Delete an Identifier!");
}else{
try{
if(_58.length>0){
var _59,_5a=_1(this.store,_57.parent,_57.property);
_59=_5a;
while(_58.length>1){
_59=_59[_58.pop()];
}
if(dojo.isArray(_59)){
_59.splice(_58,1);
}else{
delete _59[_58];
}
this.store.setValue(_57.parent,_57.property,_5a);
}else{
this.store.unsetAttribute(_57.parent,_57.property);
}
}
catch(e){
alert(e);
}
}
},_addProperty:function(){
var _5b=this.lastFocused.item;
var _5c=_5b.value;
var _5d=dojo.hitch(this,function(){
var _5e=null;
if(!this._editDialog){
this._createEditDialog();
}else{
this._editDialog.reset();
}
if(_5c instanceof Array){
_5e=_5c.length;
dijit.getEnclosingWidget(dojo.query("input",this._editDialog.containerNode)[0]).attr("disabled",true);
}else{
dijit.getEnclosingWidget(dojo.query("input",this._editDialog.containerNode)[0]).attr("disabled",false);
}
this._editDialog.attr("title","Add Property");
this._enableFields("value");
this._editDialog.attr("value",{itemType:"value",property:_5e});
this._editDialog.show();
});
if(_5b.addNew){
_5b=this.lastFocused.getParent().item;
_5c=this.lastFocused.item.parent;
}
if(_5b.property&&dojo.indexOf(this.store.getIdentityAttributes(),_5b.property)>=0){
alert("Cannot add properties to an ID node!");
}else{
if(this.store.isItem(_5c,true)&&!this.store.isItemLoaded(_5c)){
this.store.loadItem({item:_5c,onItem:function(_5f){
_5c=_5f;
_5d();
}});
}else{
_5d();
}
}
}});
})();
}
