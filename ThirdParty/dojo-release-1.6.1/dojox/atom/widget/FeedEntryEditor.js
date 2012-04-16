/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.atom.widget.FeedEntryEditor"]){
dojo._hasResource["dojox.atom.widget.FeedEntryEditor"]=true;
dojo.provide("dojox.atom.widget.FeedEntryEditor");
dojo.require("dojox.atom.widget.FeedEntryViewer");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");
dojo.require("dijit.Editor");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.SimpleTextarea");
dojo.requireLocalization("dojox.atom.widget","FeedEntryEditor",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.requireLocalization("dojox.atom.widget","PeopleEditor",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.atom.widget.FeedEntryEditor");
dojo.declare("dojox.atom.widget.FeedEntryEditor",dojox.atom.widget.FeedEntryViewer,{_contentEditor:null,_oldContent:null,_setObject:null,enableEdit:false,_contentEditorCreator:null,_editors:{},entryNewButton:null,_editable:false,templateString:dojo.cache("dojox.atom","widget/templates/FeedEntryEditor.html","<div class=\"feedEntryViewer\">\n    <table border=\"0\" width=\"100%\" class=\"feedEntryViewerMenuTable\" dojoAttachPoint=\"feedEntryViewerMenu\" style=\"display: none;\">\n        <tr width=\"100%\"  dojoAttachPoint=\"entryCheckBoxDisplayOptions\">\n        \t<td align=\"left\" dojoAttachPoint=\"entryNewButton\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"doNew\" dojoAttachEvent=\"onclick:_toggleNew\"></span>\n        \t</td>\n            <td align=\"left\" dojoAttachPoint=\"entryEditButton\" style=\"display: none;\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"edit\" dojoAttachEvent=\"onclick:_toggleEdit\"></span>\n            </td>\n            <td align=\"left\" dojoAttachPoint=\"entrySaveCancelButtons\" style=\"display: none;\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"save\" dojoAttachEvent=\"onclick:saveEdits\"></span>\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"cancel\" dojoAttachEvent=\"onclick:cancelEdits\"></span>\n            </td>\n            <td align=\"right\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"displayOptions\" dojoAttachEvent=\"onclick:_toggleOptions\"></span>\n            </td>\n        </tr>\n        <tr class=\"feedEntryViewerDisplayCheckbox\" dojoAttachPoint=\"entryCheckBoxRow\" width=\"100%\" style=\"display: none;\">\n            <td dojoAttachPoint=\"feedEntryCelltitle\">\n                <input type=\"checkbox\" name=\"title\" value=\"Title\" dojoAttachPoint=\"feedEntryCheckBoxTitle\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelTitle\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellauthors\">\n                <input type=\"checkbox\" name=\"authors\" value=\"Authors\" dojoAttachPoint=\"feedEntryCheckBoxAuthors\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelAuthors\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellcontributors\">\n                <input type=\"checkbox\" name=\"contributors\" value=\"Contributors\" dojoAttachPoint=\"feedEntryCheckBoxContributors\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelContributors\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellid\">\n                <input type=\"checkbox\" name=\"id\" value=\"Id\" dojoAttachPoint=\"feedEntryCheckBoxId\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelId\"></label>\n            </td>\n            <td rowspan=\"2\" align=\"right\">\n                <span class=\"feedEntryViewerMenu\" dojoAttachPoint=\"close\" dojoAttachEvent=\"onclick:_toggleOptions\"></span>\n            </td>\n\t\t</tr>\n\t\t<tr class=\"feedEntryViewerDisplayCheckbox\" dojoAttachPoint=\"entryCheckBoxRow2\" width=\"100%\" style=\"display: none;\">\n            <td dojoAttachPoint=\"feedEntryCellupdated\">\n                <input type=\"checkbox\" name=\"updated\" value=\"Updated\" dojoAttachPoint=\"feedEntryCheckBoxUpdated\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelUpdated\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellsummary\">\n                <input type=\"checkbox\" name=\"summary\" value=\"Summary\" dojoAttachPoint=\"feedEntryCheckBoxSummary\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelSummary\"></label>\n            </td>\n            <td dojoAttachPoint=\"feedEntryCellcontent\">\n                <input type=\"checkbox\" name=\"content\" value=\"Content\" dojoAttachPoint=\"feedEntryCheckBoxContent\" dojoAttachEvent=\"onclick:_toggleCheckbox\"/>\n\t\t\t\t<label for=\"title\" dojoAttachPoint=\"feedEntryCheckBoxLabelContent\"></label>\n            </td>\n        </tr>\n    </table>\n    \n    <table class=\"feedEntryViewerContainer\" border=\"0\" width=\"100%\">\n        <tr class=\"feedEntryViewerTitle\" dojoAttachPoint=\"entryTitleRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryTitleHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td>\n                        \t<select dojoAttachPoint=\"entryTitleSelect\" dojoAttachEvent=\"onchange:_switchEditor\" style=\"display: none\">\n                        \t\t<option value=\"text\">Text</option>\n\t\t\t\t\t\t\t\t<option value=\"html\">HTML</option>\n\t\t\t\t\t\t\t\t<option value=\"xhtml\">XHTML</option>\n                        \t</select>\n                        </td>\n                    </tr>\n                    <tr>\n                        <td colspan=\"2\" dojoAttachPoint=\"entryTitleNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n\n        <tr class=\"feedEntryViewerAuthor\" dojoAttachPoint=\"entryAuthorRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryAuthorHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryAuthorNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n\n        <tr class=\"feedEntryViewerContributor\" dojoAttachPoint=\"entryContributorRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryContributorHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryContributorNode\" class=\"feedEntryViewerContributorNames\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n        \n        <tr class=\"feedEntryViewerId\" dojoAttachPoint=\"entryIdRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryIdHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryIdNode\" class=\"feedEntryViewerIdText\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n        <tr class=\"feedEntryViewerUpdated\" dojoAttachPoint=\"entryUpdatedRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryUpdatedHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryUpdatedNode\" class=\"feedEntryViewerUpdatedText\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n        <tr class=\"feedEntryViewerSummary\" dojoAttachPoint=\"entrySummaryRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\" colspan=\"2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entrySummaryHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td>\n                        \t<select dojoAttachPoint=\"entrySummarySelect\" dojoAttachEvent=\"onchange:_switchEditor\" style=\"display: none\">\n                        \t\t<option value=\"text\">Text</option>\n\t\t\t\t\t\t\t\t<option value=\"html\">HTML</option>\n\t\t\t\t\t\t\t\t<option value=\"xhtml\">XHTML</option>\n                        \t</select>\n                        </td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entrySummaryNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n        <tr class=\"feedEntryViewerContent\" dojoAttachPoint=\"entryContentRow\" style=\"display: none;\">\n            <td>\n                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n                    <tr class=\"graphic-tab-lgray\">\n\t\t\t\t\t\t<td class=\"lp2\">\n\t\t\t\t\t\t\t<span class=\"lp\" dojoAttachPoint=\"entryContentHeader\"></span>\n\t\t\t\t\t\t</td>\n                    </tr>\n                    <tr>\n                        <td>\n                        \t<select dojoAttachPoint=\"entryContentSelect\" dojoAttachEvent=\"onchange:_switchEditor\" style=\"display: none\">\n                        \t\t<option value=\"text\">Text</option>\n\t\t\t\t\t\t\t\t<option value=\"html\">HTML</option>\n\t\t\t\t\t\t\t\t<option value=\"xhtml\">XHTML</option>\n                        \t</select>\n                        </td>\n                    </tr>\n                    <tr>\n                        <td dojoAttachPoint=\"entryContentNode\">\n                        </td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    </table>\n</div>\n"),postCreate:function(){
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
_1=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryEditor");
this.doNew.innerHTML=_1.doNew;
this.edit.innerHTML=_1.edit;
this.save.innerHTML=_1.save;
this.cancel.innerHTML=_1.cancel;
},setEntry:function(_2,_3,_4){
if(this._entry!==_2){
this._editMode=false;
_4=false;
}else{
_4=true;
}
dojox.atom.widget.FeedEntryEditor.superclass.setEntry.call(this,_2,_3);
this._editable=this._isEditable(_2);
if(!_4&&!this._editable){
dojo.style(this.entryEditButton,"display","none");
dojo.style(this.entrySaveCancelButtons,"display","none");
}
if(this._editable&&this.enableEdit){
if(!_4){
dojo.style(this.entryEditButton,"display","");
if(this.enableMenuFade&&this.entrySaveCancelButton){
dojo.fadeOut({node:this.entrySaveCancelButton,duration:250}).play();
}
}
}
},_toggleEdit:function(){
if(this._editable&&this.enableEdit){
dojo.style(this.entryEditButton,"display","none");
dojo.style(this.entrySaveCancelButtons,"display","");
this._editMode=true;
this.setEntry(this._entry,this._feed,true);
}
},_handleEvent:function(_5){
if(_5.source!=this&&_5.action=="delete"&&_5.entry&&_5.entry==this._entry){
dojo.style(this.entryEditButton,"display","none");
}
dojox.atom.widget.FeedEntryEditor.superclass._handleEvent.call(this,_5);
},_isEditable:function(_6){
var _7=false;
if(_6&&_6!==null&&_6.links&&_6.links!==null){
for(var x in _6.links){
if(_6.links[x].rel&&_6.links[x].rel=="edit"){
_7=true;
break;
}
}
}
return _7;
},setTitle:function(_8,_9,_a){
if(!_9){
dojox.atom.widget.FeedEntryEditor.superclass.setTitle.call(this,_8,_9,_a);
if(_a.title&&_a.title.value&&_a.title.value!==null){
this.setFieldValidity("title",true);
}
}else{
if(_a.title&&_a.title.value&&_a.title.value!==null){
if(!this._toLoad){
this._toLoad=[];
}
this.entryTitleSelect.value=_a.title.type;
var _b=this._createEditor(_8,_a.title,true,_a.title.type==="html"||_a.title.type==="xhtml");
_b.name="title";
this._toLoad.push(_b);
this.setFieldValidity("titleedit",true);
this.setFieldValidity("title",true);
}
}
},setAuthors:function(_c,_d,_e){
if(!_d){
dojox.atom.widget.FeedEntryEditor.superclass.setAuthors.call(this,_c,_d,_e);
if(_e.authors&&_e.authors.length>0){
this.setFieldValidity("authors",true);
}
}else{
if(_e.authors&&_e.authors.length>0){
this._editors.authors=this._createPeopleEditor(this.entryAuthorNode,{data:_e.authors,name:"Author"});
this.setFieldValidity("authors",true);
}
}
},setContributors:function(_f,_10,_11){
if(!_10){
dojox.atom.widget.FeedEntryEditor.superclass.setContributors.call(this,_f,_10,_11);
if(_11.contributors&&_11.contributors.length>0){
this.setFieldValidity("contributors",true);
}
}else{
if(_11.contributors&&_11.contributors.length>0){
this._editors.contributors=this._createPeopleEditor(this.entryContributorNode,{data:_11.contributors,name:"Contributor"});
this.setFieldValidity("contributors",true);
}
}
},setId:function(_12,_13,_14){
if(!_13){
dojox.atom.widget.FeedEntryEditor.superclass.setId.call(this,_12,_13,_14);
if(_14.id&&_14.id!==null){
this.setFieldValidity("id",true);
}
}else{
if(_14.id&&_14.id!==null){
this._editors.id=this._createEditor(_12,_14.id);
this.setFieldValidity("id",true);
}
}
},setUpdated:function(_15,_16,_17){
if(!_16){
dojox.atom.widget.FeedEntryEditor.superclass.setUpdated.call(this,_15,_16,_17);
if(_17.updated&&_17.updated!==null){
this.setFieldValidity("updated",true);
}
}else{
if(_17.updated&&_17.updated!==null){
this._editors.updated=this._createEditor(_15,_17.updated);
this.setFieldValidity("updated",true);
}
}
},setSummary:function(_18,_19,_1a){
if(!_19){
dojox.atom.widget.FeedEntryEditor.superclass.setSummary.call(this,_18,_19,_1a);
if(_1a.summary&&_1a.summary.value&&_1a.summary.value!==null){
this.setFieldValidity("summary",true);
}
}else{
if(_1a.summary&&_1a.summary.value&&_1a.summary.value!==null){
if(!this._toLoad){
this._toLoad=[];
}
this.entrySummarySelect.value=_1a.summary.type;
var _1b=this._createEditor(_18,_1a.summary,true,_1a.summary.type==="html"||_1a.summary.type==="xhtml");
_1b.name="summary";
this._toLoad.push(_1b);
this.setFieldValidity("summaryedit",true);
this.setFieldValidity("summary",true);
}
}
},setContent:function(_1c,_1d,_1e){
if(!_1d){
dojox.atom.widget.FeedEntryEditor.superclass.setContent.call(this,_1c,_1d,_1e);
if(_1e.content&&_1e.content.value&&_1e.content.value!==null){
this.setFieldValidity("content",true);
}
}else{
if(_1e.content&&_1e.content.value&&_1e.content.value!==null){
if(!this._toLoad){
this._toLoad=[];
}
this.entryContentSelect.value=_1e.content.type;
var _1f=this._createEditor(_1c,_1e.content,true,_1e.content.type==="html"||_1e.content.type==="xhtml");
_1f.name="content";
this._toLoad.push(_1f);
this.setFieldValidity("contentedit",true);
this.setFieldValidity("content",true);
}
}
},_createEditor:function(_20,_21,_22,rte){
var _23;
var box;
if(!_21){
if(rte){
return {anchorNode:_20,entryValue:"",editor:null,generateEditor:function(){
var _24=document.createElement("div");
_24.innerHTML=this.entryValue;
this.anchorNode.appendChild(_24);
var _25=new dijit.Editor({},_24);
this.editor=_25;
return _25;
}};
}
if(_22){
_23=document.createElement("textarea");
_20.appendChild(_23);
dojo.style(_23,"width","90%");
box=new dijit.form.SimpleTextarea({},_23);
}else{
_23=document.createElement("input");
_20.appendChild(_23);
dojo.style(_23,"width","95%");
box=new dijit.form.TextBox({},_23);
}
box.attr("value","");
return box;
}
var _26;
if(_21.value!==undefined){
_26=_21.value;
}else{
if(_21.attr){
_26=_21.attr("value");
}else{
_26=_21;
}
}
if(rte){
if(_26.indexOf("<")!=-1){
_26=_26.replace(/</g,"&lt;");
}
return {anchorNode:_20,entryValue:_26,editor:null,generateEditor:function(){
var _27=document.createElement("div");
_27.innerHTML=this.entryValue;
this.anchorNode.appendChild(_27);
var _28=new dijit.Editor({},_27);
this.editor=_28;
return _28;
}};
}
if(_22){
_23=document.createElement("textarea");
_20.appendChild(_23);
dojo.style(_23,"width","90%");
box=new dijit.form.SimpleTextarea({},_23);
}else{
_23=document.createElement("input");
_20.appendChild(_23);
dojo.style(_23,"width","95%");
box=new dijit.form.TextBox({},_23);
}
box.attr("value",_26);
return box;
},_switchEditor:function(_29){
var _2a=null;
var _2b=null;
var _2c=null;
if(dojo.isIE){
_2b=_29.srcElement;
}else{
_2b=_29.target;
}
if(_2b===this.entryTitleSelect){
_2c=this.entryTitleNode;
_2a="title";
}else{
if(_2b===this.entrySummarySelect){
_2c=this.entrySummaryNode;
_2a="summary";
}else{
_2c=this.entryContentNode;
_2a="content";
}
}
var _2d=this._editors[_2a];
var _2e;
var _2f;
if(_2b.value==="text"){
if(_2d.declaredClass==="dijit.Editor"){
_2f=_2d.attr("value",false);
_2d.close(false,true);
_2d.destroy();
while(_2c.firstChild){
dojo.destroy(_2c.firstChild);
}
_2e=this._createEditor(_2c,{value:_2f},true,false);
this._editors[_2a]=_2e;
}
}else{
if(_2d.declaredClass!="dijit.Editor"){
_2f=_2d.attr("value");
_2d.destroy();
while(_2c.firstChild){
dojo.destroy(_2c.firstChild);
}
_2e=this._createEditor(_2c,{value:_2f},true,true);
_2e=dojo.hitch(_2e,_2e.generateEditor)();
this._editors[_2a]=_2e;
}
}
},_createPeopleEditor:function(_30,_31){
var _32=document.createElement("div");
_30.appendChild(_32);
return new dojox.atom.widget.PeopleEditor(_31,_32);
},saveEdits:function(){
dojo.style(this.entrySaveCancelButtons,"display","none");
dojo.style(this.entryEditButton,"display","");
dojo.style(this.entryNewButton,"display","");
var _33=false;
var _34;
var i;
var _35;
var _36;
var _37;
var _38;
if(!this._new){
_36=this.getEntry();
if(this._editors.title&&(this._editors.title.attr("value")!=_36.title.value||this.entryTitleSelect.value!=_36.title.type)){
_34=this._editors.title.attr("value");
if(this.entryTitleSelect.value==="xhtml"){
_34=this._enforceXhtml(_34);
if(_34.indexOf("<div xmlns=\"http://www.w3.org/1999/xhtml\">")!==0){
_34="<div xmlns=\"http://www.w3.org/1999/xhtml\">"+_34+"</div>";
}
}
_36.title=new dojox.atom.io.model.Content("title",_34,null,this.entryTitleSelect.value);
_33=true;
}
if(this._editors.id.attr("value")!=_36.id){
_36.id=this._editors.id.attr("value");
_33=true;
}
if(this._editors.summary&&(this._editors.summary.attr("value")!=_36.summary.value||this.entrySummarySelect.value!=_36.summary.type)){
_34=this._editors.summary.attr("value");
if(this.entrySummarySelect.value==="xhtml"){
_34=this._enforceXhtml(_34);
if(_34.indexOf("<div xmlns=\"http://www.w3.org/1999/xhtml\">")!==0){
_34="<div xmlns=\"http://www.w3.org/1999/xhtml\">"+_34+"</div>";
}
}
_36.summary=new dojox.atom.io.model.Content("summary",_34,null,this.entrySummarySelect.value);
_33=true;
}
if(this._editors.content&&(this._editors.content.attr("value")!=_36.content.value||this.entryContentSelect.value!=_36.content.type)){
_34=this._editors.content.attr("value");
if(this.entryContentSelect.value==="xhtml"){
_34=this._enforceXhtml(_34);
if(_34.indexOf("<div xmlns=\"http://www.w3.org/1999/xhtml\">")!==0){
_34="<div xmlns=\"http://www.w3.org/1999/xhtml\">"+_34+"</div>";
}
}
_36.content=new dojox.atom.io.model.Content("content",_34,null,this.entryContentSelect.value);
_33=true;
}
if(this._editors.authors){
if(_33){
_36.authors=[];
_37=this._editors.authors.getValues();
for(i in _37){
if(_37[i].name||_37[i].email||_37[i].uri){
_36.addAuthor(_37[i].name,_37[i].email,_37[i].uri);
}
}
}else{
var _39=_36.authors;
var _3a=function(_3b,_3c,uri){
for(i in _39){
if(_39[i].name===_3b&&_39[i].email===_3c&&_39[i].uri===uri){
return true;
}
}
return false;
};
_37=this._editors.authors.getValues();
_35=false;
for(i in _37){
if(!_3a(_37[i].name,_37[i].email,_37[i].uri)){
_35=true;
break;
}
}
if(_35){
_36.authors=[];
for(i in _37){
if(_37[i].name||_37[i].email||_37[i].uri){
_36.addAuthor(_37[i].name,_37[i].email,_37[i].uri);
}
}
_33=true;
}
}
}
if(this._editors.contributors){
if(_33){
_36.contributors=[];
_38=this._editors.contributors.getValues();
for(i in _38){
if(_38[i].name||_38[i].email||_38[i].uri){
_36.addAuthor(_38[i].name,_38[i].email,_38[i].uri);
}
}
}else{
var _3d=_36.contributors;
var _3e=function(_3f,_40,uri){
for(i in _3d){
if(_3d[i].name===_3f&&_3d[i].email===_40&&_3d[i].uri===uri){
return true;
}
}
return false;
};
_38=this._editors.contributors.getValues();
_35=false;
for(i in _38){
if(_3e(_38[i].name,_38[i].email,_38[i].uri)){
_35=true;
break;
}
}
if(_35){
_36.contributors=[];
for(i in _38){
if(_38[i].name||_38[i].email||_38[i].uri){
_36.addContributor(_38[i].name,_38[i].email,_38[i].uri);
}
}
_33=true;
}
}
}
if(_33){
dojo.publish(this.entrySelectionTopic,[{action:"update",source:this,entry:_36,callback:this._handleSave}]);
}
}else{
this._new=false;
_36=new dojox.atom.io.model.Entry();
_34=this._editors.title.attr("value");
if(this.entryTitleSelect.value==="xhtml"){
_34=this._enforceXhtml(_34);
_34="<div xmlns=\"http://www.w3.org/1999/xhtml\">"+_34+"</div>";
}
_36.setTitle(_34,this.entryTitleSelect.value);
_36.id=this._editors.id.attr("value");
_37=this._editors.authors.getValues();
for(i in _37){
if(_37[i].name||_37[i].email||_37[i].uri){
_36.addAuthor(_37[i].name,_37[i].email,_37[i].uri);
}
}
_38=this._editors.contributors.getValues();
for(i in _38){
if(_38[i].name||_38[i].email||_38[i].uri){
_36.addContributor(_38[i].name,_38[i].email,_38[i].uri);
}
}
_34=this._editors.summary.attr("value");
if(this.entrySummarySelect.value==="xhtml"){
_34=this._enforceXhtml(_34);
_34="<div xmlns=\"http://www.w3.org/1999/xhtml\">"+_34+"</div>";
}
_36.summary=new dojox.atom.io.model.Content("summary",_34,null,this.entrySummarySelect.value);
_34=this._editors.content.attr("value");
if(this.entryContentSelect.value==="xhtml"){
_34=this._enforceXhtml(_34);
_34="<div xmlns=\"http://www.w3.org/1999/xhtml\">"+_34+"</div>";
}
_36.content=new dojox.atom.io.model.Content("content",_34,null,this.entryContentSelect.value);
dojo.style(this.entryNewButton,"display","");
dojo.publish(this.entrySelectionTopic,[{action:"post",source:this,entry:_36}]);
}
this._editMode=false;
this.setEntry(_36,this._feed,true);
},_handleSave:function(_41,_42){
this._editMode=false;
this.clear();
this.setEntry(_41,this.getFeed(),true);
},cancelEdits:function(){
this._new=false;
dojo.style(this.entrySaveCancelButtons,"display","none");
if(this._editable){
dojo.style(this.entryEditButton,"display","");
}
dojo.style(this.entryNewButton,"display","");
this._editMode=false;
this.clearEditors();
this.setEntry(this.getEntry(),this.getFeed(),true);
},clear:function(){
this._editable=false;
this.clearEditors();
dojox.atom.widget.FeedEntryEditor.superclass.clear.apply(this);
if(this._contentEditor){
this._contentEditor=this._setObject=this._oldContent=this._contentEditorCreator=null;
this._editors={};
}
},clearEditors:function(){
for(var key in this._editors){
if(this._editors[key].declaredClass==="dijit.Editor"){
this._editors[key].close(false,true);
}
this._editors[key].destroy();
}
this._editors={};
},_enforceXhtml:function(_43){
var _44=null;
if(_43){
var _45=/<br>/g;
_44=_43.replace(_45,"<br/>");
_44=this._closeTag(_44,"hr");
_44=this._closeTag(_44,"img");
}
return _44;
},_closeTag:function(_46,tag){
var _47="<"+tag;
var _48=_46.indexOf(_47);
if(_48!==-1){
while(_48!==-1){
var _49="";
var _4a=false;
for(var i=0;i<_46.length;i++){
var c=_46.charAt(i);
if(i<=_48||_4a){
_49+=c;
}else{
if(c===">"){
_49+="/";
_4a=true;
}
_49+=c;
}
}
_46=_49;
_48=_46.indexOf(_47,_48+1);
}
}
return _46;
},_toggleNew:function(){
dojo.style(this.entryNewButton,"display","none");
dojo.style(this.entryEditButton,"display","none");
dojo.style(this.entrySaveCancelButtons,"display","");
this.entrySummarySelect.value="text";
this.entryContentSelect.value="text";
this.entryTitleSelect.value="text";
this.clearNodes();
this._new=true;
var _4b=dojo.i18n.getLocalization("dojox.atom.widget","FeedEntryViewer");
var _4c=new dojox.atom.widget.EntryHeader({title:_4b.title});
this.entryTitleHeader.appendChild(_4c.domNode);
this._editors.title=this._createEditor(this.entryTitleNode,null);
this.setFieldValidity("title",true);
var _4d=new dojox.atom.widget.EntryHeader({title:_4b.authors});
this.entryAuthorHeader.appendChild(_4d.domNode);
this._editors.authors=this._createPeopleEditor(this.entryAuthorNode,{name:"Author"});
this.setFieldValidity("authors",true);
var _4e=new dojox.atom.widget.EntryHeader({title:_4b.contributors});
this.entryContributorHeader.appendChild(_4e.domNode);
this._editors.contributors=this._createPeopleEditor(this.entryContributorNode,{name:"Contributor"});
this.setFieldValidity("contributors",true);
var _4f=new dojox.atom.widget.EntryHeader({title:_4b.id});
this.entryIdHeader.appendChild(_4f.domNode);
this._editors.id=this._createEditor(this.entryIdNode,null);
this.setFieldValidity("id",true);
var _50=new dojox.atom.widget.EntryHeader({title:_4b.updated});
this.entryUpdatedHeader.appendChild(_50.domNode);
this._editors.updated=this._createEditor(this.entryUpdatedNode,null);
this.setFieldValidity("updated",true);
var _51=new dojox.atom.widget.EntryHeader({title:_4b.summary});
this.entrySummaryHeader.appendChild(_51.domNode);
this._editors.summary=this._createEditor(this.entrySummaryNode,null,true);
this.setFieldValidity("summaryedit",true);
this.setFieldValidity("summary",true);
var _52=new dojox.atom.widget.EntryHeader({title:_4b.content});
this.entryContentHeader.appendChild(_52.domNode);
this._editors.content=this._createEditor(this.entryContentNode,null,true);
this.setFieldValidity("contentedit",true);
this.setFieldValidity("content",true);
this._displaySections();
},_displaySections:function(){
dojo.style(this.entrySummarySelect,"display","none");
dojo.style(this.entryContentSelect,"display","none");
dojo.style(this.entryTitleSelect,"display","none");
if(this.isFieldValid("contentedit")){
dojo.style(this.entryContentSelect,"display","");
}
if(this.isFieldValid("summaryedit")){
dojo.style(this.entrySummarySelect,"display","");
}
if(this.isFieldValid("titleedit")){
dojo.style(this.entryTitleSelect,"display","");
}
dojox.atom.widget.FeedEntryEditor.superclass._displaySections.apply(this);
if(this._toLoad){
for(var i in this._toLoad){
var _53;
if(this._toLoad[i].generateEditor){
_53=dojo.hitch(this._toLoad[i],this._toLoad[i].generateEditor)();
}else{
_53=this._toLoad[i];
}
this._editors[this._toLoad[i].name]=_53;
this._toLoad[i]=null;
}
this._toLoad=null;
}
}});
dojo.declare("dojox.atom.widget.PeopleEditor",[dijit._Widget,dijit._Templated,dijit._Container],{templateString:dojo.cache("dojox.atom","widget/templates/PeopleEditor.html","<div class=\"peopleEditor\">\n\t<table style=\"width: 100%\">\n\t\t<tbody dojoAttachPoint=\"peopleEditorEditors\"></tbody>\n\t</table>\n\t<span class=\"peopleEditorButton\" dojoAttachPoint=\"peopleEditorButton\" dojoAttachEvent=\"onclick:_add\"></span>\n</div>\n"),_rows:[],_editors:[],_index:0,_numRows:0,postCreate:function(){
var _54=dojo.i18n.getLocalization("dojox.atom.widget","PeopleEditor");
if(this.name){
if(this.name=="Author"){
this.peopleEditorButton.appendChild(document.createTextNode("["+_54.addAuthor+"]"));
}else{
if(this.name=="Contributor"){
this.peopleEditorButton.appendChild(document.createTextNode("["+_54.addContributor+"]"));
}
}
}else{
this.peopleEditorButton.appendChild(document.createTextNode("["+_54.add+"]"));
}
this._editors=[];
if(!this.data||this.data.length===0){
this._createEditors(null,null,null,0,this.name);
this._index=1;
}else{
for(var i in this.data){
this._createEditors(this.data[i].name,this.data[i].email,this.data[i].uri,i);
this._index++;
this._numRows++;
}
}
},destroy:function(){
for(var key in this._editors){
for(var _55 in this._editors[key]){
this._editors[key][_55].destroy();
}
}
this._editors=[];
},_createEditors:function(_56,_57,uri,_58,_59){
var row=document.createElement("tr");
this.peopleEditorEditors.appendChild(row);
row.id="removeRow"+_58;
var _5a=document.createElement("td");
_5a.setAttribute("align","right");
row.appendChild(_5a);
_5a.colSpan=2;
if(this._numRows>0){
var hr=document.createElement("hr");
_5a.appendChild(hr);
hr.id="hr"+_58;
}
row=document.createElement("span");
_5a.appendChild(row);
row.className="peopleEditorButton";
dojo.style(row,"font-size","x-small");
dojo.connect(row,"onclick",this,"_removeEditor");
row.id="remove"+_58;
_5a=document.createTextNode("[X]");
row.appendChild(_5a);
row=document.createElement("tr");
this.peopleEditorEditors.appendChild(row);
row.id="editorsRow"+_58;
var _5b=document.createElement("td");
row.appendChild(_5b);
dojo.style(_5b,"width","20%");
_5a=document.createElement("td");
row.appendChild(_5a);
row=document.createElement("table");
_5b.appendChild(row);
dojo.style(row,"width","100%");
_5b=document.createElement("tbody");
row.appendChild(_5b);
row=document.createElement("table");
_5a.appendChild(row);
dojo.style(row,"width","100%");
_5a=document.createElement("tbody");
row.appendChild(_5a);
this._editors[_58]=[];
this._editors[_58].push(this._createEditor(_56,_59+"name"+_58,"Name:",_5b,_5a));
this._editors[_58].push(this._createEditor(_57,_59+"email"+_58,"Email:",_5b,_5a));
this._editors[_58].push(this._createEditor(uri,_59+"uri"+_58,"URI:",_5b,_5a));
},_createEditor:function(_5c,id,_5d,_5e,_5f){
var row=document.createElement("tr");
_5e.appendChild(row);
var _60=document.createElement("label");
_60.setAttribute("for",id);
_60.appendChild(document.createTextNode(_5d));
_5e=document.createElement("td");
_5e.appendChild(_60);
row.appendChild(_5e);
row=document.createElement("tr");
_5f.appendChild(row);
_5f=document.createElement("td");
row.appendChild(_5f);
var _61=document.createElement("input");
_61.setAttribute("id",id);
_5f.appendChild(_61);
dojo.style(_61,"width","95%");
var box=new dijit.form.TextBox({},_61);
box.attr("value",_5c);
return box;
},_removeEditor:function(_62){
var _63=null;
if(dojo.isIE){
_63=_62.srcElement;
}else{
_63=_62.target;
}
var id=_63.id;
id=id.substring(6);
for(var key in this._editors[id]){
this._editors[id][key].destroy();
}
var _64=dojo.byId("editorsRow"+id);
var _65=_64.parentNode;
_65.removeChild(_64);
_64=dojo.byId("removeRow"+id);
_65=_64.parentNode;
_65.removeChild(_64);
this._numRows--;
if(this._numRows===1&&_65.firstChild.firstChild.firstChild.tagName.toLowerCase()==="hr"){
_64=_65.firstChild.firstChild;
_64.removeChild(_64.firstChild);
}
this._editors[id]=null;
},_add:function(){
this._createEditors(null,null,null,this._index);
this._index++;
this._numRows++;
},getValues:function(){
var _66=[];
for(var i in this._editors){
if(this._editors[i]){
_66.push({name:this._editors[i][0].attr("value"),email:this._editors[i][1].attr("value"),uri:this._editors[i][2].attr("value")});
}
}
return _66;
}});
}
