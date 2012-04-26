/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.FilePicker"]){
dojo._hasResource["dojox.widget.FilePicker"]=true;
dojo.provide("dojox.widget.FilePicker");
dojo.require("dojox.widget.RollingList");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.widget","FilePicker",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.widget._FileInfoPane",[dojox.widget._RollingListPane],{templateString:"",templateString:dojo.cache("dojox.widget","FilePicker/_FileInfoPane.html","<div class=\"dojoxFileInfoPane\">\n\t<table>\n\t\t<tbody>\n\t\t\t<tr>\n\t\t\t\t<td class=\"dojoxFileInfoLabel dojoxFileInfoNameLabel\">${_messages.name}</td>\n\t\t\t\t<td class=\"dojoxFileInfoName\" dojoAttachPoint=\"nameNode\"></td>\n\t\t\t</tr>\n\t\t\t<tr>\n\t\t\t\t<td class=\"dojoxFileInfoLabel dojoxFileInfoPathLabel\">${_messages.path}</td>\n\t\t\t\t<td class=\"dojoxFileInfoPath\" dojoAttachPoint=\"pathNode\"></td>\n\t\t\t</tr>\n\t\t\t<tr>\n\t\t\t\t<td class=\"dojoxFileInfoLabel dojoxFileInfoSizeLabel\">${_messages.size}</td>\n\t\t\t\t<td class=\"dojoxFileInfoSize\" dojoAttachPoint=\"sizeNode\"></td>\n\t\t\t</tr>\n\t\t</tbody>\n\t</table>\n\t<div dojoAttachPoint=\"containerNode\" style=\"display:none;\"></div>\n</div>\n"),postMixInProperties:function(){
this._messages=dojo.i18n.getLocalization("dojox.widget","FilePicker",this.lang);
this.inherited(arguments);
},onItems:function(){
var _1=this.store,_2=this.items[0];
if(!_2){
this._onError("Load",new Error("No item defined"));
}else{
this.nameNode.innerHTML=_1.getLabel(_2);
this.pathNode.innerHTML=_1.getIdentity(_2);
this.sizeNode.innerHTML=_1.getValue(_2,"size");
this.parentWidget.scrollIntoView(this);
this.inherited(arguments);
}
}});
dojo.declare("dojox.widget.FilePicker",dojox.widget.RollingList,{className:"dojoxFilePicker",pathSeparator:"",topDir:"",parentAttr:"parentDir",pathAttr:"path",preloadItems:50,selectDirectories:true,selectFiles:true,_itemsMatch:function(_3,_4){
if(!_3&&!_4){
return true;
}else{
if(!_3||!_4){
return false;
}else{
if(_3==_4){
return true;
}else{
if(this._isIdentity){
var _5=[this.store.getIdentity(_3),this.store.getIdentity(_4)];
dojo.forEach(_5,function(i,_6){
if(i.lastIndexOf(this.pathSeparator)==(i.length-1)){
_5[_6]=i.substring(0,i.length-1);
}else{
}
},this);
return (_5[0]==_5[1]);
}
}
}
}
return false;
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
var _7,_8=this.getChildren()[0];
var _9=dojo.hitch(this,function(){
if(_7){
this.disconnect(_7);
}
delete _7;
var _a=_8.items[0];
if(_a){
var _b=this.store;
var _c=_b.getValue(_a,this.parentAttr);
var _d=_b.getValue(_a,this.pathAttr);
this.pathSeparator=this.pathSeparator||_b.pathSeparator;
if(!this.pathSeparator){
this.pathSeparator=_d.substring(_c.length,_c.length+1);
}
if(!this.topDir){
this.topDir=_c;
if(this.topDir.lastIndexOf(this.pathSeparator)!=(this.topDir.length-1)){
this.topDir+=this.pathSeparator;
}
}
}
});
if(!this.pathSeparator||!this.topDir){
if(!_8.items){
_7=this.connect(_8,"onItems",_9);
}else{
_9();
}
}
},getChildItems:function(_e){
var _f=this.inherited(arguments);
if(!_f&&this.store.getValue(_e,"directory")){
_f=[];
}
return _f;
},getMenuItemForItem:function(_10,_11,_12){
var _13={iconClass:"dojoxDirectoryItemIcon"};
if(!this.store.getValue(_10,"directory")){
_13.iconClass="dojoxFileItemIcon";
var l=this.store.getLabel(_10),idx=l.lastIndexOf(".");
if(idx>=0){
_13.iconClass+=" dojoxFileItemIcon_"+l.substring(idx+1);
}
if(!this.selectFiles){
_13.disabled=true;
}
}
var ret=new dijit.MenuItem(_13);
return ret;
},getPaneForItem:function(_14,_15,_16){
var ret=null;
if(!_14||(this.store.isItem(_14)&&this.store.getValue(_14,"directory"))){
ret=new dojox.widget._RollingListGroupPane({});
}else{
if(this.store.isItem(_14)&&!this.store.getValue(_14,"directory")){
ret=new dojox.widget._FileInfoPane({});
}
}
return ret;
},_setPathValueAttr:function(_17,_18,_19){
if(!_17){
this.set("value",null);
return;
}
if(_17.lastIndexOf(this.pathSeparator)==(_17.length-1)){
_17=_17.substring(0,_17.length-1);
}
this.store.fetchItemByIdentity({identity:_17,onItem:function(v){
if(_18){
this._lastExecutedValue=v;
}
this.set("value",v);
if(_19){
_19();
}
},scope:this});
},_getPathValueAttr:function(val){
if(!val){
val=this.value;
}
if(val&&this.store.isItem(val)){
return this.store.getValue(val,this.pathAttr);
}else{
return "";
}
},_setValue:function(_1a){
delete this._setInProgress;
var _1b=this.store;
if(_1a&&_1b.isItem(_1a)){
var _1c=this.store.getValue(_1a,"directory");
if((_1c&&!this.selectDirectories)||(!_1c&&!this.selectFiles)){
return;
}
}else{
_1a=null;
}
if(!this._itemsMatch(this.value,_1a)){
this.value=_1a;
this._onChange(_1a);
}
}});
}
