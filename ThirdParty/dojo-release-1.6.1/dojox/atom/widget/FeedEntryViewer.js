/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.atom.widget.FeedEntryViewer"]){
dojo._hasResource["dojox.atom.widget.FeedEntryViewer"]=true;
dojo.provide("dojox.atom.widget.FeedEntryViewer");
dojo.require("dojo.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojox.atom.io.Connection");
dojo.requireLocalization("dojox.atom.widget","FeedEntryViewer",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.atom.widget.FeedEntryViewer");
dojo.declare("dojox.atom.widget.FeedEntryViewer",[dijit._Widget,dijit._Templated,dijit._Container],{entrySelectionTopic:"",_validEntryFields:{},displayEntrySections:"",_displayEntrySections:null,enableMenu:false,enableMenuFade:false,_optionButtonDisplayed:true,templateString:dojo.cache("dojox.atom","widget/templates/FeedEntryViewer.html","<div class=\"feedEntryViewer\">\n    <table border=\"0\" width=\"100%\" class=\"feedEntryViewerMenuTable\" dojoAttachPoint=\"feedEntryViewerMenu\" style=\"display: none;\">\n        <tr width=\"100%\"  dojoAttachPoint=\"entryCheckBoxDisplayOptions\">\n            <td align=\"right\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"displayOptions\" dojoAttachEvent=\"onclick:_toggleOptions\"></span>\n            </td>\n        </tr>\n        <tr class=\"feedEntryViewerDisplayCheckbox\" dojoAttachPoint=\"entryCheckBoxRow\" width=\"100%\" style=\"display: none;\">\n            <td dojoAttachPoint=\"feedEntryCelltitle\">\n                <input type=\"checkbox\" name=\"title\" value=\"Title\" dojoAttachPoint=\"feedEntryCheckBoxTitle\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelTitle\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellauthors\">\n                <input type=\"checkbox\" name=\"authors\" value=\"Authors\" dojoAttachPoint=\"feedEntryCheckBoxAuthors\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelAuthors\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellcontributors\">\n                <input type=\"checkbox\" name=\"contributors\" value=\"Contributors\" dojoAttachPoint=\"feedEntryCheckBoxContributors\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelContributors\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellid\">\n                <input type=\"checkbox\" name=\"id\" value=\"Id\" dojoAttachPoint=\"feedEntryCheckBoxId\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelId\"></label>\n            </td>\n            <td rowspan=\"2\" align=\"right\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"close\" dojoAttachEvent=\"onclick:_toggleOptions\"></span>\n            </td>\n\t\t</tr>\n\t\t<tr class=\"feedEntryViewerDisplayCheckbox\" dojoAttachPoint=\"entryCheckBoxRow2\" width=\"100%\" style=\"display: none;\">\n            <td dojoAttachPoint=\"feedEntryCellupdated\">\n                <input type=\"checkbox\" name=\"updated\" value=\"Updated\" dojoAttachPoint=\"feedEntryCheckBoxUpdated\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelUpdated\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellsummary\">\n                <input type=\"checkbox\" name=\"summary\" value=\"Summary\" dojoAttachPoint=\"feedEntryCheckBoxSummary\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelSummary\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellcontent\">\n                <input type=\"checkbox\" name=\"content\" value=\"Content\" dojoAttachPoint=\"feedEntryCheckBoxContent\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelContent\"></label>\n            </td>\n        </tr>\n    </table>\n    \n    <table class=\"feedEntryViewerContainer\" border=\"0\" width=\"100%\">\n        <tr class=\"feedEntryViewerTitle\" dojoAttachPoint=\"entryTitleRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryTitleHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryTitleNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n\n        <tr class=\"feedEntryViewerAuthor\" dojoAttachPoint=\"entryAuthorRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryAuthorHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryAuthorNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n\n        <tr class=\"feedEntryViewerContributor\" dojoAttachPoint=\"entryContributorRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryContributorHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryContributorNode\" class=\"feedEntryViewerContributorNames\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n        \n        <tr class=\"feedEntryViewerId\" dojoAttachPoint=\"entryIdRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryIdHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryIdNode\" class=\"feedEntryViewerIdText\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n        <tr class=\"feedEntryViewerUpdated\" dojoAttachPoint=\"entryUpdatedRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryUpdatedHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryUpdatedNode\" class=\"feedEntryViewerUpdatedText\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n        <tr class=\"feedEntryViewerSummary\" dojoAttachPoint=\"entrySummaryRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entrySummaryHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entrySummaryNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n        <tr class=\"feedEntryViewerContent\" dojoAttachPoint=\"entryContentRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryContentHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryContentNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    </table>\n</div>\n"),_entry:null,_feed:null,_editMode:false,postCreate:function(){
if(this.entrySelectionTopic!==""){
this._subscriptions=[dojo.subscribe(this.entrySelectionTopic,this,"_handleEvent")];
}
var _1=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
this.displayOptions.innerHTML=_1.displayOptions;
this.feedEntryCheckBoxLabelTitle.innerHTML=_1.title;
this.feedEntryCheckBoxLabelAuthors.innerHTML=_1.authors;
this.feedEntryCheckBoxLabelContributors.innerHTML=_1.contributors;
this.feedEntryCheckBoxLabelId.innerHTML=_1.id;
this.close.innerHTML=_1.close;
this.feedEntryCheckBoxLabelUpdated.innerHTML=_1.updated;
this.feedEntryCheckBoxLabelSummary.innerHTML=_1.summary;
this.feedEntryCheckBoxLabelContent.innerHTML=_1.content;
},startup:function(){
if(this.displayEntrySections===""){
this._displayEntrySections=["title","authors","contributors","summary","content","id","updated"];
}else{
this._displayEntrySections=this.displayEntrySections.split(",");
}
this._setDisplaySectionsCheckboxes();
if(this.enableMenu){
dojo.style(this.feedEntryViewerMenu,"display","");
if(this.entryCheckBoxRow&&this.entryCheckBoxRow2){
if(this.enableMenuFade){
dojo.fadeOut({node:this.entryCheckBoxRow,duration:250}).play();
dojo.fadeOut({node:this.entryCheckBoxRow2,duration:250}).play();
}
}
}
},clear:function(){
this.destroyDescendants();
this._entry=null;
this._feed=null;
this.clearNodes();
},clearNodes:function(){
dojo.forEach(["entryTitleRow","entryAuthorRow","entryContributorRow","entrySummaryRow","entryContentRow","entryIdRow","entryUpdatedRow"],function(_2){
dojo.style(this[_2],"display","none");
},this);
dojo.forEach(["entryTitleNode","entryTitleHeader","entryAuthorHeader","entryContributorHeader","entryContributorNode","entrySummaryHeader","entrySummaryNode","entryContentHeader","entryContentNode","entryIdNode","entryIdHeader","entryUpdatedHeader","entryUpdatedNode"],function(_3){
while(this[_3].firstChild){
dojo.destroy(this[_3].firstChild);
}
},this);
},setEntry:function(_4,_5,_6){
this.clear();
this._validEntryFields={};
this._entry=_4;
this._feed=_5;
if(_4!==null){
if(this.entryTitleHeader){
this.setTitleHeader(this.entryTitleHeader,_4);
}
if(this.entryTitleNode){
this.setTitle(this.entryTitleNode,this._editMode,_4);
}
if(this.entryAuthorHeader){
this.setAuthorsHeader(this.entryAuthorHeader,_4);
}
if(this.entryAuthorNode){
this.setAuthors(this.entryAuthorNode,this._editMode,_4);
}
if(this.entryContributorHeader){
this.setContributorsHeader(this.entryContributorHeader,_4);
}
if(this.entryContributorNode){
this.setContributors(this.entryContributorNode,this._editMode,_4);
}
if(this.entryIdHeader){
this.setIdHeader(this.entryIdHeader,_4);
}
if(this.entryIdNode){
this.setId(this.entryIdNode,this._editMode,_4);
}
if(this.entryUpdatedHeader){
this.setUpdatedHeader(this.entryUpdatedHeader,_4);
}
if(this.entryUpdatedNode){
this.setUpdated(this.entryUpdatedNode,this._editMode,_4);
}
if(this.entrySummaryHeader){
this.setSummaryHeader(this.entrySummaryHeader,_4);
}
if(this.entrySummaryNode){
this.setSummary(this.entrySummaryNode,this._editMode,_4);
}
if(this.entryContentHeader){
this.setContentHeader(this.entryContentHeader,_4);
}
if(this.entryContentNode){
this.setContent(this.entryContentNode,this._editMode,_4);
}
}
this._displaySections();
},setTitleHeader:function(_7,_8){
if(_8.title&&_8.title.value&&_8.title.value!==null){
var _9=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _a=new dojox.atom.widget.EntryHeader({title:_9.title});
_7.appendChild(_a.domNode);
}
},setTitle:function(_b,_c,_d){
if(_d.title&&_d.title.value&&_d.title.value!==null){
if(_d.title.type=="text"){
var _e=document.createTextNode(_d.title.value);
_b.appendChild(_e);
}else{
var _f=document.createElement("span");
var _10=new dijit.layout.ContentPane({refreshOnShow:true,executeScripts:false},_f);
_10.attr("content",_d.title.value);
_b.appendChild(_10.domNode);
}
this.setFieldValidity("title",true);
}
},setAuthorsHeader:function(_11,_12){
if(_12.authors&&_12.authors.length>0){
var _13=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _14=new dojox.atom.widget.EntryHeader({title:_13.authors});
_11.appendChild(_14.domNode);
}
},setAuthors:function(_15,_16,_17){
_15.innerHTML="";
if(_17.authors&&_17.authors.length>0){
for(var i in _17.authors){
if(_17.authors[i].name){
var _18=_15;
if(_17.authors[i].uri){
var _19=document.createElement("a");
_18.appendChild(_19);
_19.href=_17.authors[i].uri;
_18=_19;
}
var _1a=_17.authors[i].name;
if(_17.authors[i].email){
_1a=_1a+" ("+_17.authors[i].email+")";
}
var _1b=document.createTextNode(_1a);
_18.appendChild(_1b);
var _1c=document.createElement("br");
_15.appendChild(_1c);
this.setFieldValidity("authors",true);
}
}
}
},setContributorsHeader:function(_1d,_1e){
if(_1e.contributors&&_1e.contributors.length>0){
var _1f=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _20=new dojox.atom.widget.EntryHeader({title:_1f.contributors});
_1d.appendChild(_20.domNode);
}
},setContributors:function(_21,_22,_23){
if(_23.contributors&&_23.contributors.length>0){
for(var i in _23.contributors){
var _24=document.createTextNode(_23.contributors[i].name);
_21.appendChild(_24);
var _25=document.createElement("br");
_21.appendChild(_25);
this.setFieldValidity("contributors",true);
}
}
},setIdHeader:function(_26,_27){
if(_27.id&&_27.id!==null){
var _28=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _29=new dojox.atom.widget.EntryHeader({title:_28.id});
_26.appendChild(_29.domNode);
}
},setId:function(_2a,_2b,_2c){
if(_2c.id&&_2c.id!==null){
var _2d=document.createTextNode(_2c.id);
_2a.appendChild(_2d);
this.setFieldValidity("id",true);
}
},setUpdatedHeader:function(_2e,_2f){
if(_2f.updated&&_2f.updated!==null){
var _30=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _31=new dojox.atom.widget.EntryHeader({title:_30.updated});
_2e.appendChild(_31.domNode);
}
},setUpdated:function(_32,_33,_34){
if(_34.updated&&_34.updated!==null){
var _35=document.createTextNode(_34.updated);
_32.appendChild(_35);
this.setFieldValidity("updated",true);
}
},setSummaryHeader:function(_36,_37){
if(_37.summary&&_37.summary.value&&_37.summary.value!==null){
var _38=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _39=new dojox.atom.widget.EntryHeader({title:_38.summary});
_36.appendChild(_39.domNode);
}
},setSummary:function(_3a,_3b,_3c){
if(_3c.summary&&_3c.summary.value&&_3c.summary.value!==null){
var _3d=document.createElement("span");
var _3e=new dijit.layout.ContentPane({refreshOnShow:true,executeScripts:false},_3d);
_3e.attr("content",_3c.summary.value);
_3a.appendChild(_3e.domNode);
this.setFieldValidity("summary",true);
}
},setContentHeader:function(_3f,_40){
if(_40.content&&_40.content.value&&_40.content.value!==null){
var _41=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _42=new dojox.atom.widget.EntryHeader({title:_41.content});
_3f.appendChild(_42.domNode);
}
},setContent:function(_43,_44,_45){
if(_45.content&&_45.content.value&&_45.content.value!==null){
var _46=document.createElement("span");
var _47=new dijit.layout.ContentPane({refreshOnShow:true,executeScripts:false},_46);
_47.attr("content",_45.content.value);
_43.appendChild(_47.domNode);
this.setFieldValidity("content",true);
}
},_displaySections:function(){
dojo.style(this.entryTitleRow,"display","none");
dojo.style(this.entryAuthorRow,"display","none");
dojo.style(this.entryContributorRow,"display","none");
dojo.style(this.entrySummaryRow,"display","none");
dojo.style(this.entryContentRow,"display","none");
dojo.style(this.entryIdRow,"display","none");
dojo.style(this.entryUpdatedRow,"display","none");
for(var i in this._displayEntrySections){
var _48=this._displayEntrySections[i].toLowerCase();
if(_48==="title"&&this.isFieldValid("title")){
dojo.style(this.entryTitleRow,"display","");
}
if(_48==="authors"&&this.isFieldValid("authors")){
dojo.style(this.entryAuthorRow,"display","");
}
if(_48==="contributors"&&this.isFieldValid("contributors")){
dojo.style(this.entryContributorRow,"display","");
}
if(_48==="summary"&&this.isFieldValid("summary")){
dojo.style(this.entrySummaryRow,"display","");
}
if(_48==="content"&&this.isFieldValid("content")){
dojo.style(this.entryContentRow,"display","");
}
if(_48==="id"&&this.isFieldValid("id")){
dojo.style(this.entryIdRow,"display","");
}
if(_48==="updated"&&this.isFieldValid("updated")){
dojo.style(this.entryUpdatedRow,"display","");
}
}
},setDisplaySections:function(_49){
if(_49!==null){
this._displayEntrySections=_49;
this._displaySections();
}else{
this._displayEntrySections=["title","authors","contributors","summary","content","id","updated"];
}
},_setDisplaySectionsCheckboxes:function(){
var _4a=["title","authors","contributors","summary","content","id","updated"];
for(var i in _4a){
if(dojo.indexOf(this._displayEntrySections,_4a[i])==-1){
dojo.style(this["feedEntryCell"+_4a[i]],"display","none");
}else{
this["feedEntryCheckBox"+_4a[i].substring(0,1).toUpperCase()+_4a[i].substring(1)].checked=true;
}
}
},_readDisplaySections:function(){
var _4b=[];
if(this.feedEntryCheckBoxTitle.checked){
_4b.push("title");
}
if(this.feedEntryCheckBoxAuthors.checked){
_4b.push("authors");
}
if(this.feedEntryCheckBoxContributors.checked){
_4b.push("contributors");
}
if(this.feedEntryCheckBoxSummary.checked){
_4b.push("summary");
}
if(this.feedEntryCheckBoxContent.checked){
_4b.push("content");
}
if(this.feedEntryCheckBoxId.checked){
_4b.push("id");
}
if(this.feedEntryCheckBoxUpdated.checked){
_4b.push("updated");
}
this._displayEntrySections=_4b;
},_toggleCheckbox:function(_4c){
if(_4c.checked){
_4c.checked=false;
}else{
_4c.checked=true;
}
this._readDisplaySections();
this._displaySections();
},_toggleOptions:function(_4d){
if(this.enableMenu){
var _4e=null;
var _4f;
var _50;
if(this._optionButtonDisplayed){
if(this.enableMenuFade){
_4f=dojo.fadeOut({node:this.entryCheckBoxDisplayOptions,duration:250});
dojo.connect(_4f,"onEnd",this,function(){
dojo.style(this.entryCheckBoxDisplayOptions,"display","none");
dojo.style(this.entryCheckBoxRow,"display","");
dojo.style(this.entryCheckBoxRow2,"display","");
dojo.fadeIn({node:this.entryCheckBoxRow,duration:250}).play();
dojo.fadeIn({node:this.entryCheckBoxRow2,duration:250}).play();
});
_4f.play();
}else{
dojo.style(this.entryCheckBoxDisplayOptions,"display","none");
dojo.style(this.entryCheckBoxRow,"display","");
dojo.style(this.entryCheckBoxRow2,"display","");
}
this._optionButtonDisplayed=false;
}else{
if(this.enableMenuFade){
_4f=dojo.fadeOut({node:this.entryCheckBoxRow,duration:250});
_50=dojo.fadeOut({node:this.entryCheckBoxRow2,duration:250});
dojo.connect(_4f,"onEnd",this,function(){
dojo.style(this.entryCheckBoxRow,"display","none");
dojo.style(this.entryCheckBoxRow2,"display","none");
dojo.style(this.entryCheckBoxDisplayOptions,"display","");
dojo.fadeIn({node:this.entryCheckBoxDisplayOptions,duration:250}).play();
});
_4f.play();
_50.play();
}else{
dojo.style(this.entryCheckBoxRow,"display","none");
dojo.style(this.entryCheckBoxRow2,"display","none");
dojo.style(this.entryCheckBoxDisplayOptions,"display","");
}
this._optionButtonDisplayed=true;
}
}
},_handleEvent:function(_51){
if(_51.source!=this){
if(_51.action=="set"&&_51.entry){
this.setEntry(_51.entry,_51.feed);
}else{
if(_51.action=="delete"&&_51.entry&&_51.entry==this._entry){
this.clear();
}
}
}
},setFieldValidity:function(_52,_53){
if(_52){
var _54=_52.toLowerCase();
this._validEntryFields[_52]=_53;
}
},isFieldValid:function(_55){
return this._validEntryFields[_55.toLowerCase()];
},getEntry:function(){
return this._entry;
},getFeed:function(){
return this._feed;
},destroy:function(){
this.clear();
dojo.forEach(this._subscriptions,dojo.unsubscribe);
}});
dojo.declare("dojox.atom.widget.EntryHeader",[dijit._Widget,dijit._Templated,dijit._Container],{title:"",templateString:dojo.cache("dojox.atom","widget/templates/EntryHeader.html","<span dojoAttachPoint=\"entryHeaderNode\" class=\"entryHeaderNode\"></span>\n"),postCreate:function(){
this.setListHeader();
},setListHeader:function(_56){
this.clear();
if(_56){
this.title=_56;
}
var _57=document.createTextNode(this.title);
this.entryHeaderNode.appendChild(_57);
},clear:function(){
this.destroyDescendants();
if(this.entryHeaderNode){
for(var i=0;i<this.entryHeaderNode.childNodes.length;i++){
this.entryHeaderNode.removeChild(this.entryHeaderNode.childNodes[i]);
}
}
},destroy:function(){
this.clear();
}});
}
