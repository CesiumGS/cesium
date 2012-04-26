/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.atom.widget.FeedViewer"]){
dojo._hasResource["dojox.atom.widget.FeedViewer"]=true;
dojo.provide("dojox.atom.widget.FeedViewer");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");
dojo.require("dojox.atom.io.Connection");
dojo.requireLocalization("dojox.atom.widget","FeedViewerEntry",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.atom.widget.FeedViewer");
dojo.declare("dojox.atom.widget.FeedViewer",[dijit._Widget,dijit._Templated,dijit._Container],{feedViewerTableBody:null,feedViewerTable:null,entrySelectionTopic:"",url:"",xmethod:false,localSaveOnly:false,templateString:dojo.cache("dojox.atom","widget/templates/FeedViewer.html","<div class=\"feedViewerContainer\" dojoAttachPoint=\"feedViewerContainerNode\">\n\t<table cellspacing=\"0\" cellpadding=\"0\" class=\"feedViewerTable\">\n\t\t<tbody dojoAttachPoint=\"feedViewerTableBody\" class=\"feedViewerTableBody\">\n\t\t</tbody>\n\t</table>\n</div>\n"),_feed:null,_currentSelection:null,_includeFilters:null,alertsEnabled:false,postCreate:function(){
this._includeFilters=[];
if(this.entrySelectionTopic!==""){
this._subscriptions=[dojo.subscribe(this.entrySelectionTopic,this,"_handleEvent")];
}
this.atomIO=new dojox.atom.io.Connection();
this.childWidgets=[];
},startup:function(){
this.containerNode=this.feedViewerTableBody;
var _1=this.getDescendants();
for(var i in _1){
var _2=_1[i];
if(_2&&_2.isFilter){
this._includeFilters.push(new dojox.atom.widget.FeedViewer.CategoryIncludeFilter(_2.scheme,_2.term,_2.label));
_2.destroy();
}
}
if(this.url!==""){
this.setFeedFromUrl(this.url);
}
},clear:function(){
this.destroyDescendants();
},setFeedFromUrl:function(_3){
if(_3!==""){
if(this._isRelativeURL(_3)){
var _4="";
if(_3.charAt(0)!=="/"){
_4=this._calculateBaseURL(window.location.href,true);
}else{
_4=this._calculateBaseURL(window.location.href,false);
}
this.url=_4+_3;
}
this.atomIO.getFeed(_3,dojo.hitch(this,this.setFeed));
}
},setFeed:function(_5){
this._feed=_5;
this.clear();
var _6=function(a,b){
var _7=this._displayDateForEntry(a);
var _8=this._displayDateForEntry(b);
if(_7>_8){
return -1;
}
if(_7<_8){
return 1;
}
return 0;
};
var _9=function(_a){
var _b=_a.split(",");
_b.pop();
return _b.join(",");
};
var _c=_5.entries.sort(dojo.hitch(this,_6));
if(_5){
var _d=null;
for(var i=0;i<_c.length;i++){
var _e=_c[i];
if(this._isFilterAccepted(_e)){
var _f=this._displayDateForEntry(_e);
var _10="";
if(_f!==null){
_10=_9(_f.toLocaleString());
if(_10===""){
_10=""+(_f.getMonth()+1)+"/"+_f.getDate()+"/"+_f.getFullYear();
}
}
if((_d===null)||(_d!=_10)){
this.appendGrouping(_10);
_d=_10;
}
this.appendEntry(_e);
}
}
}
},_displayDateForEntry:function(_11){
if(_11.updated){
return _11.updated;
}
if(_11.modified){
return _11.modified;
}
if(_11.issued){
return _11.issued;
}
return new Date();
},appendGrouping:function(_12){
var _13=new dojox.atom.widget.FeedViewerGrouping({});
_13.setText(_12);
this.addChild(_13);
this.childWidgets.push(_13);
},appendEntry:function(_14){
var _15=new dojox.atom.widget.FeedViewerEntry({"xmethod":this.xmethod});
_15.setTitle(_14.title.value);
_15.setTime(this._displayDateForEntry(_14).toLocaleTimeString());
_15.entrySelectionTopic=this.entrySelectionTopic;
_15.feed=this;
this.addChild(_15);
this.childWidgets.push(_15);
this.connect(_15,"onClick","_rowSelected");
_14.domNode=_15.entryNode;
_14._entryWidget=_15;
_15.entry=_14;
},deleteEntry:function(_16){
if(!this.localSaveOnly){
this.atomIO.deleteEntry(_16.entry,dojo.hitch(this,this._removeEntry,_16),null,this.xmethod);
}else{
this._removeEntry(_16,true);
}
dojo.publish(this.entrySelectionTopic,[{action:"delete",source:this,entry:_16.entry}]);
},_removeEntry:function(_17,_18){
if(_18){
var idx=dojo.indexOf(this.childWidgets,_17);
var _19=this.childWidgets[idx-1];
var _1a=this.childWidgets[idx+1];
if(_19.declaredClass==="dojox.atom.widget.FeedViewerGrouping"&&(_1a===undefined||_1a.declaredClass==="dojox.atom.widget.FeedViewerGrouping")){
_19.destroy();
}
_17.destroy();
}else{
}
},_rowSelected:function(evt){
var _1b=evt.target;
while(_1b){
if(_1b.attributes){
var _1c=_1b.attributes.getNamedItem("widgetid");
if(_1c&&_1c.value.indexOf("FeedViewerEntry")!=-1){
break;
}
}
_1b=_1b.parentNode;
}
for(var i=0;i<this._feed.entries.length;i++){
var _1d=this._feed.entries[i];
if((_1b===_1d.domNode)&&(this._currentSelection!==_1d)){
dojo.addClass(_1d.domNode,"feedViewerEntrySelected");
dojo.removeClass(_1d._entryWidget.timeNode,"feedViewerEntryUpdated");
dojo.addClass(_1d._entryWidget.timeNode,"feedViewerEntryUpdatedSelected");
this.onEntrySelected(_1d);
if(this.entrySelectionTopic!==""){
dojo.publish(this.entrySelectionTopic,[{action:"set",source:this,feed:this._feed,entry:_1d}]);
}
if(this._isEditable(_1d)){
_1d._entryWidget.enableDelete();
}
this._deselectCurrentSelection();
this._currentSelection=_1d;
break;
}else{
if((_1b===_1d.domNode)&&(this._currentSelection===_1d)){
dojo.publish(this.entrySelectionTopic,[{action:"delete",source:this,entry:_1d}]);
this._deselectCurrentSelection();
break;
}
}
}
},_deselectCurrentSelection:function(){
if(this._currentSelection){
dojo.addClass(this._currentSelection._entryWidget.timeNode,"feedViewerEntryUpdated");
dojo.removeClass(this._currentSelection.domNode,"feedViewerEntrySelected");
dojo.removeClass(this._currentSelection._entryWidget.timeNode,"feedViewerEntryUpdatedSelected");
this._currentSelection._entryWidget.disableDelete();
this._currentSelection=null;
}
},_isEditable:function(_1e){
var _1f=false;
if(_1e&&_1e!==null&&_1e.links&&_1e.links!==null){
for(var x in _1e.links){
if(_1e.links[x].rel&&_1e.links[x].rel=="edit"){
_1f=true;
break;
}
}
}
return _1f;
},onEntrySelected:function(_20){
},_isRelativeURL:function(url){
var _21=function(url){
var _22=false;
if(url.indexOf("file://")===0){
_22=true;
}
return _22;
};
var _23=function(url){
var _24=false;
if(url.indexOf("http://")===0){
_24=true;
}
return _24;
};
var _25=false;
if(url!==null){
if(!_21(url)&&!_23(url)){
_25=true;
}
}
return _25;
},_calculateBaseURL:function(_26,_27){
var _28=null;
if(_26!==null){
var _29=_26.indexOf("?");
if(_29!=-1){
_26=_26.substring(0,_29);
}
if(_27){
_29=_26.lastIndexOf("/");
if((_29>0)&&(_29<_26.length)&&(_29!==(_26.length-1))){
_28=_26.substring(0,(_29+1));
}else{
_28=_26;
}
}else{
_29=_26.indexOf("://");
if(_29>0){
_29=_29+3;
var _2a=_26.substring(0,_29);
var _2b=_26.substring(_29,_26.length);
_29=_2b.indexOf("/");
if((_29<_2b.length)&&(_29>0)){
_28=_2a+_2b.substring(0,_29);
}else{
_28=_2a+_2b;
}
}
}
}
return _28;
},_isFilterAccepted:function(_2c){
var _2d=false;
if(this._includeFilters&&(this._includeFilters.length>0)){
for(var i=0;i<this._includeFilters.length;i++){
var _2e=this._includeFilters[i];
if(_2e.match(_2c)){
_2d=true;
break;
}
}
}else{
_2d=true;
}
return _2d;
},addCategoryIncludeFilter:function(_2f){
if(_2f){
var _30=_2f.scheme;
var _31=_2f.term;
var _32=_2f.label;
var _33=true;
if(!_30){
_30=null;
}
if(!_31){
_30=null;
}
if(!_32){
_30=null;
}
if(this._includeFilters&&this._includeFilters.length>0){
for(var i=0;i<this._includeFilters.length;i++){
var _34=this._includeFilters[i];
if((_34.term===_31)&&(_34.scheme===_30)&&(_34.label===_32)){
_33=false;
break;
}
}
}
if(_33){
this._includeFilters.push(dojox.atom.widget.FeedViewer.CategoryIncludeFilter(_30,_31,_32));
}
}
},removeCategoryIncludeFilter:function(_35){
if(_35){
var _36=_35.scheme;
var _37=_35.term;
var _38=_35.label;
if(!_36){
_36=null;
}
if(!_37){
_36=null;
}
if(!_38){
_36=null;
}
var _39=[];
if(this._includeFilters&&this._includeFilters.length>0){
for(var i=0;i<this._includeFilters.length;i++){
var _3a=this._includeFilters[i];
if(!((_3a.term===_37)&&(_3a.scheme===_36)&&(_3a.label===_38))){
_39.push(_3a);
}
}
this._includeFilters=_39;
}
}
},_handleEvent:function(_3b){
if(_3b.source!=this){
if(_3b.action=="update"&&_3b.entry){
var evt=_3b;
if(!this.localSaveOnly){
this.atomIO.updateEntry(evt.entry,dojo.hitch(evt.source,evt.callback),null,true);
}
this._currentSelection._entryWidget.setTime(this._displayDateForEntry(evt.entry).toLocaleTimeString());
this._currentSelection._entryWidget.setTitle(evt.entry.title.value);
}else{
if(_3b.action=="post"&&_3b.entry){
if(!this.localSaveOnly){
this.atomIO.addEntry(_3b.entry,this.url,dojo.hitch(this,this._addEntry));
}else{
this._addEntry(_3b.entry);
}
}
}
}
},_addEntry:function(_3c){
this._feed.addEntry(_3c);
this.setFeed(this._feed);
dojo.publish(this.entrySelectionTopic,[{action:"set",source:this,feed:this._feed,entry:_3c}]);
},destroy:function(){
this.clear();
dojo.forEach(this._subscriptions,dojo.unsubscribe);
}});
dojo.declare("dojox.atom.widget.FeedViewerEntry",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.atom","widget/templates/FeedViewerEntry.html","<tr class=\"feedViewerEntry\" dojoAttachPoint=\"entryNode\" dojoAttachEvent=\"onclick:onClick\">\n    <td class=\"feedViewerEntryUpdated\" dojoAttachPoint=\"timeNode\">\n    </td>\n    <td>\n        <table border=\"0\" width=\"100%\" dojoAttachPoint=\"titleRow\">\n            <tr padding=\"0\" border=\"0\">\n                <td class=\"feedViewerEntryTitle\" dojoAttachPoint=\"titleNode\">\n                </td>\n                <td class=\"feedViewerEntryDelete\" align=\"right\">\n                    <span dojoAttachPoint=\"deleteButton\" dojoAttachEvent=\"onclick:deleteEntry\" class=\"feedViewerDeleteButton\" style=\"display:none;\">[delete]</span>\n                </td>\n            <tr>\n        </table>\n    </td>\n</tr>\n"),entryNode:null,timeNode:null,deleteButton:null,entry:null,feed:null,postCreate:function(){
var _3d=dojo.i18n.getLocalization("dojox.atom.widget","FeedViewerEntry");
this.deleteButton.innerHTML=_3d.deleteButton;
},setTitle:function(_3e){
if(this.titleNode.lastChild){
this.titleNode.removeChild(this.titleNode.lastChild);
}
var _3f=document.createElement("div");
_3f.innerHTML=_3e;
this.titleNode.appendChild(_3f);
},setTime:function(_40){
if(this.timeNode.lastChild){
this.timeNode.removeChild(this.timeNode.lastChild);
}
var _41=document.createTextNode(_40);
this.timeNode.appendChild(_41);
},enableDelete:function(){
if(this.deleteButton!==null){
this.deleteButton.style.display="inline";
}
},disableDelete:function(){
if(this.deleteButton!==null){
this.deleteButton.style.display="none";
}
},deleteEntry:function(_42){
_42.preventDefault();
_42.stopPropagation();
this.feed.deleteEntry(this);
},onClick:function(e){
}});
dojo.declare("dojox.atom.widget.FeedViewerGrouping",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.atom","widget/templates/FeedViewerGrouping.html","<tr dojoAttachPoint=\"groupingNode\" class=\"feedViewerGrouping\">\n\t<td colspan=\"2\" dojoAttachPoint=\"titleNode\" class=\"feedViewerGroupingTitle\">\n\t</td>\n</tr>\n"),groupingNode:null,titleNode:null,setText:function(_43){
if(this.titleNode.lastChild){
this.titleNode.removeChild(this.titleNode.lastChild);
}
var _44=document.createTextNode(_43);
this.titleNode.appendChild(_44);
}});
dojo.declare("dojox.atom.widget.AtomEntryCategoryFilter",[dijit._Widget,dijit._Templated],{scheme:"",term:"",label:"",isFilter:true});
dojo.declare("dojox.atom.widget.FeedViewer.CategoryIncludeFilter",null,{constructor:function(_45,_46,_47){
this.scheme=_45;
this.term=_46;
this.label=_47;
},match:function(_48){
var _49=false;
if(_48!==null){
var _4a=_48.categories;
if(_4a!==null){
for(var i=0;i<_4a.length;i++){
var _4b=_4a[i];
if(this.scheme!==""){
if(this.scheme!==_4b.scheme){
break;
}
}
if(this.term!==""){
if(this.term!==_4b.term){
break;
}
}
if(this.label!==""){
if(this.label!==_4b.label){
break;
}
}
_49=true;
}
}
}
return _49;
}});
}
