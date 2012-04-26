/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.StoreExplorer"]){
dojo._hasResource["dojox.data.StoreExplorer"]=true;
dojo.provide("dojox.data.StoreExplorer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.data.ItemExplorer");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.declare("dojox.data.StoreExplorer",dijit.layout.BorderContainer,{constructor:function(_1){
dojo.mixin(this,_1);
},store:null,columnWidth:"",stringQueries:false,showAllColumns:false,postCreate:function(){
var _2=this;
this.inherited(arguments);
var _3=new dijit.layout.ContentPane({region:"top"}).placeAt(this);
function _4(_5,_6){
var _7=new dijit.form.Button({label:_5});
_3.containerNode.appendChild(_7.domNode);
_7.onClick=_6;
return _7;
};
var _8=_3.containerNode.appendChild(document.createElement("span"));
_8.innerHTML="Enter query: &nbsp;";
_8.id="queryText";
var _9=_3.containerNode.appendChild(document.createElement("input"));
_9.type="text";
_9.id="queryTextBox";
_4("Query",function(){
var _a=_9.value;
_2.setQuery(_2.stringQueries?_a:dojo.fromJson(_a));
});
_3.containerNode.appendChild(document.createElement("span")).innerHTML="&nbsp;&nbsp;&nbsp;";
var _b=_4("Create New",dojo.hitch(this,"createNew"));
var _c=_4("Delete",function(){
var _d=_e.selection.getSelected();
for(var i=0;i<_d.length;i++){
_2.store.deleteItem(_d[i]);
}
});
this.setItemName=function(_f){
_b.attr("label","<img style='width:12px; height:12px' src='"+dojo.moduleUrl("dijit.themes.tundra.images","dndCopy.png")+"' /> Create New "+_f);
_c.attr("label","Delete "+_f);
};
_4("Save",function(){
_2.store.save({onError:function(_10){
alert(_10);
}});
_2.tree.refreshItem();
});
_4("Revert",function(){
_2.store.revert();
});
_4("Add Column",function(){
var _11=prompt("Enter column name:","property");
if(_11){
_2.gridLayout.push({field:_11,name:_11,formatter:dojo.hitch(_2,"_formatCell"),editable:true});
_2.grid.attr("structure",_2.gridLayout);
}
});
var _12=new dijit.layout.ContentPane({region:"center"}).placeAt(this);
var _e=this.grid=new dojox.grid.DataGrid({store:this.store});
_12.attr("content",_e);
_e.canEdit=function(_13,_14){
var _15=this._copyAttr(_14,_13.field);
return !(_15&&typeof _15=="object")||_15 instanceof Date;
};
var _16=new dijit.layout.ContentPane({region:"trailing",splitter:true,style:"width: 300px"}).placeAt(this);
var _17=this.tree=new dojox.data.ItemExplorer({store:this.store});
_16.attr("content",_17);
dojo.connect(_e,"onCellClick",function(){
var _18=_e.selection.getSelected()[0];
_17.setItem(_18);
});
this.gridOnFetchComplete=_e._onFetchComplete;
this.setStore(this.store);
},setQuery:function(_19,_1a){
this.grid.setQuery(_19,_1a);
},_formatCell:function(_1b){
if(this.store.isItem(_1b)){
return this.store.getLabel(_1b)||this.store.getIdentity(_1b);
}
return _1b;
},setStore:function(_1c){
this.store=_1c;
var _1d=this;
var _1e=this.grid;
_1e._pending_requests[0]=false;
function _1f(_20){
return _1d._formatCell(_20);
};
var _21=this.gridOnFetchComplete;
_1e._onFetchComplete=function(_22,req){
var _23=_1d.gridLayout=[];
var _24,key,_25,i,j,k,_26=_1c.getIdentityAttributes();
for(i=0;i<_26.length;i++){
key=_26[i];
_23.push({field:key,name:key,_score:100,formatter:_1f,editable:false});
}
for(i=0;_25=_22[i++];){
var _27=_1c.getAttributes(_25);
for(k=0;key=_27[k++];){
var _28=false;
for(j=0;_24=_23[j++];){
if(_24.field==key){
_24._score++;
_28=true;
break;
}
}
if(!_28){
_23.push({field:key,name:key,_score:1,formatter:_1f,styles:"white-space:nowrap; ",editable:true});
}
}
}
_23=_23.sort(function(a,b){
return b._score-a._score;
});
if(!_1d.showAllColumns){
for(j=0;_24=_23[j];j++){
if(_24._score<_22.length/40*j){
_23.splice(j,_23.length-j);
break;
}
}
}
for(j=0;_24=_23[j++];){
_24.width=_1d.columnWidth||Math.round(100/_23.length)+"%";
}
_1e._onFetchComplete=_21;
_1e.attr("structure",_23);
var _29=_21.apply(this,arguments);
};
_1e.setStore(_1c);
this.queryOptions={cache:true};
this.tree.setStore(_1c);
},createNew:function(){
var _2a=prompt("Enter any properties (in JSON literal form) to put in the new item (passed to the newItem constructor):","{ }");
if(_2a){
try{
this.store.newItem(dojo.fromJson(_2a));
}
catch(e){
alert(e);
}
}
}});
}
