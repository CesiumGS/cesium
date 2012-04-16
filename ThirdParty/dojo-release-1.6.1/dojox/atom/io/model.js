/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.atom.io.model"]){
dojo._hasResource["dojox.atom.io.model"]=true;
dojo.provide("dojox.atom.io.model");
dojo.require("dojox.xml.parser");
dojo.require("dojo.string");
dojo.require("dojo.date.stamp");
dojox.atom.io.model._Constants={"ATOM_URI":"http://www.w3.org/2005/Atom","ATOM_NS":"http://www.w3.org/2005/Atom","PURL_NS":"http://purl.org/atom/app#","APP_NS":"http://www.w3.org/2007/app"};
dojox.atom.io.model._actions={"link":function(_1,_2){
if(_1.links===null){
_1.links=[];
}
var _3=new dojox.atom.io.model.Link();
_3.buildFromDom(_2);
_1.links.push(_3);
},"author":function(_4,_5){
if(_4.authors===null){
_4.authors=[];
}
var _6=new dojox.atom.io.model.Person("author");
_6.buildFromDom(_5);
_4.authors.push(_6);
},"contributor":function(_7,_8){
if(_7.contributors===null){
_7.contributors=[];
}
var _9=new dojox.atom.io.model.Person("contributor");
_9.buildFromDom(_8);
_7.contributors.push(_9);
},"category":function(_a,_b){
if(_a.categories===null){
_a.categories=[];
}
var _c=new dojox.atom.io.model.Category();
_c.buildFromDom(_b);
_a.categories.push(_c);
},"icon":function(_d,_e){
_d.icon=dojox.xml.parser.textContent(_e);
},"id":function(_f,_10){
_f.id=dojox.xml.parser.textContent(_10);
},"rights":function(obj,_11){
obj.rights=dojox.xml.parser.textContent(_11);
},"subtitle":function(obj,_12){
var cnt=new dojox.atom.io.model.Content("subtitle");
cnt.buildFromDom(_12);
obj.subtitle=cnt;
},"title":function(obj,_13){
var cnt=new dojox.atom.io.model.Content("title");
cnt.buildFromDom(_13);
obj.title=cnt;
},"updated":function(obj,_14){
obj.updated=dojox.atom.io.model.util.createDate(_14);
},"issued":function(obj,_15){
obj.issued=dojox.atom.io.model.util.createDate(_15);
},"modified":function(obj,_16){
obj.modified=dojox.atom.io.model.util.createDate(_16);
},"published":function(obj,_17){
obj.published=dojox.atom.io.model.util.createDate(_17);
},"entry":function(obj,_18){
if(obj.entries===null){
obj.entries=[];
}
var _19=obj.createEntry?obj.createEntry():new dojox.atom.io.model.Entry();
_19.buildFromDom(_18);
obj.entries.push(_19);
},"content":function(obj,_1a){
var cnt=new dojox.atom.io.model.Content("content");
cnt.buildFromDom(_1a);
obj.content=cnt;
},"summary":function(obj,_1b){
var _1c=new dojox.atom.io.model.Content("summary");
_1c.buildFromDom(_1b);
obj.summary=_1c;
},"name":function(obj,_1d){
obj.name=dojox.xml.parser.textContent(_1d);
},"email":function(obj,_1e){
obj.email=dojox.xml.parser.textContent(_1e);
},"uri":function(obj,_1f){
obj.uri=dojox.xml.parser.textContent(_1f);
},"generator":function(obj,_20){
obj.generator=new dojox.atom.io.model.Generator();
obj.generator.buildFromDom(_20);
}};
dojox.atom.io.model.util={createDate:function(_21){
var _22=dojox.xml.parser.textContent(_21);
if(_22){
return dojo.date.stamp.fromISOString(dojo.trim(_22));
}
return null;
},escapeHtml:function(str){
return str.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;").replace(/'/gm,"&#39;");
},unEscapeHtml:function(str){
return str.replace(/&lt;/gm,"<").replace(/&gt;/gm,">").replace(/&quot;/gm,"\"").replace(/&#39;/gm,"'").replace(/&amp;/gm,"&");
},getNodename:function(_23){
var _24=null;
if(_23!==null){
_24=_23.localName?_23.localName:_23.nodeName;
if(_24!==null){
var _25=_24.indexOf(":");
if(_25!==-1){
_24=_24.substring((_25+1),_24.length);
}
}
}
return _24;
}};
dojo.declare("dojox.atom.io.model.Node",null,{constructor:function(_26,_27,_28,_29,_2a){
this.name_space=_26;
this.name=_27;
this.attributes=[];
if(_28){
this.attributes=_28;
}
this.content=[];
this.rawNodes=[];
this.textContent=null;
if(_29){
this.content.push(_29);
}
this.shortNs=_2a;
this._objName="Node";
},buildFromDom:function(_2b){
this._saveAttributes(_2b);
this.name_space=_2b.namespaceURI;
this.shortNs=_2b.prefix;
this.name=dojox.atom.io.model.util.getNodename(_2b);
for(var x=0;x<_2b.childNodes.length;x++){
var c=_2b.childNodes[x];
if(dojox.atom.io.model.util.getNodename(c)!="#text"){
this.rawNodes.push(c);
var n=new dojox.atom.io.model.Node();
n.buildFromDom(c,true);
this.content.push(n);
}else{
this.content.push(c.nodeValue);
}
}
this.textContent=dojox.xml.parser.textContent(_2b);
},_saveAttributes:function(_2c){
if(!this.attributes){
this.attributes=[];
}
var _2d=function(_2e){
var _2f=_2e.attributes;
if(_2f===null){
return false;
}
return (_2f.length!==0);
};
if(_2d(_2c)&&this._getAttributeNames){
var _30=this._getAttributeNames(_2c);
if(_30&&_30.length>0){
for(var x in _30){
var _31=_2c.getAttribute(_30[x]);
if(_31){
this.attributes[_30[x]]=_31;
}
}
}
}
},addAttribute:function(_32,_33){
this.attributes[_32]=_33;
},getAttribute:function(_34){
return this.attributes[_34];
},_getAttributeNames:function(_35){
var _36=[];
for(var i=0;i<_35.attributes.length;i++){
_36.push(_35.attributes[i].nodeName);
}
return _36;
},toString:function(){
var xml=[];
var x;
var _37=(this.shortNs?this.shortNs+":":"")+this.name;
var _38=(this.name=="#cdata-section");
if(_38){
xml.push("<![CDATA[");
xml.push(this.textContent);
xml.push("]]>");
}else{
xml.push("<");
xml.push(_37);
if(this.name_space){
xml.push(" xmlns='"+this.name_space+"'");
}
if(this.attributes){
for(x in this.attributes){
xml.push(" "+x+"='"+this.attributes[x]+"'");
}
}
if(this.content){
xml.push(">");
for(x in this.content){
xml.push(this.content[x]);
}
xml.push("</"+_37+">\n");
}else{
xml.push("/>\n");
}
}
return xml.join("");
},addContent:function(_39){
this.content.push(_39);
}});
dojo.declare("dojox.atom.io.model.AtomItem",dojox.atom.io.model.Node,{constructor:function(_3a){
this.ATOM_URI=dojox.atom.io.model._Constants.ATOM_URI;
this.links=null;
this.authors=null;
this.categories=null;
this.contributors=null;
this.icon=this.id=this.logo=this.xmlBase=this.rights=null;
this.subtitle=this.title=null;
this.updated=this.published=null;
this.issued=this.modified=null;
this.content=null;
this.extensions=null;
this.entries=null;
this.name_spaces={};
this._objName="AtomItem";
},_getAttributeNames:function(){
return null;
},_accepts:{},accept:function(tag){
return Boolean(this._accepts[tag]);
},_postBuild:function(){
},buildFromDom:function(_3b){
var i,c,n;
for(i=0;i<_3b.attributes.length;i++){
c=_3b.attributes.item(i);
n=dojox.atom.io.model.util.getNodename(c);
if(c.prefix=="xmlns"&&c.prefix!=n){
this.addNamespace(c.nodeValue,n);
}
}
c=_3b.childNodes;
for(i=0;i<c.length;i++){
if(c[i].nodeType==1){
var _3c=dojox.atom.io.model.util.getNodename(c[i]);
if(!_3c){
continue;
}
if(c[i].namespaceURI!=dojox.atom.io.model._Constants.ATOM_NS&&_3c!="#text"){
if(!this.extensions){
this.extensions=[];
}
var _3d=new dojox.atom.io.model.Node();
_3d.buildFromDom(c[i]);
this.extensions.push(_3d);
}
if(!this.accept(_3c.toLowerCase())){
continue;
}
var fn=dojox.atom.io.model._actions[_3c];
if(fn){
fn(this,c[i]);
}
}
}
this._saveAttributes(_3b);
if(this._postBuild){
this._postBuild();
}
},addNamespace:function(_3e,_3f){
if(_3e&&_3f){
this.name_spaces[_3f]=_3e;
}
},addAuthor:function(_40,_41,uri){
if(!this.authors){
this.authors=[];
}
this.authors.push(new dojox.atom.io.model.Person("author",_40,_41,uri));
},addContributor:function(_42,_43,uri){
if(!this.contributors){
this.contributors=[];
}
this.contributors.push(new dojox.atom.io.model.Person("contributor",_42,_43,uri));
},addLink:function(_44,rel,_45,_46,_47){
if(!this.links){
this.links=[];
}
this.links.push(new dojox.atom.io.model.Link(_44,rel,_45,_46,_47));
},removeLink:function(_48,rel){
if(!this.links||!dojo.isArray(this.links)){
return;
}
var _49=0;
for(var i=0;i<this.links.length;i++){
if((!_48||this.links[i].href===_48)&&(!rel||this.links[i].rel===rel)){
this.links.splice(i,1);
_49++;
}
}
return _49;
},removeBasicLinks:function(){
if(!this.links){
return;
}
var _4a=0;
for(var i=0;i<this.links.length;i++){
if(!this.links[i].rel){
this.links.splice(i,1);
_4a++;
i--;
}
}
return _4a;
},addCategory:function(_4b,_4c,_4d){
if(!this.categories){
this.categories=[];
}
this.categories.push(new dojox.atom.io.model.Category(_4b,_4c,_4d));
},getCategories:function(_4e){
if(!_4e){
return this.categories;
}
var arr=[];
for(var x in this.categories){
if(this.categories[x].scheme===_4e){
arr.push(this.categories[x]);
}
}
return arr;
},removeCategories:function(_4f,_50){
if(!this.categories){
return;
}
var _51=0;
for(var i=0;i<this.categories.length;i++){
if((!_4f||this.categories[i].scheme===_4f)&&(!_50||this.categories[i].term===_50)){
this.categories.splice(i,1);
_51++;
i--;
}
}
return _51;
},setTitle:function(str,_52){
if(!str){
return;
}
this.title=new dojox.atom.io.model.Content("title");
this.title.value=str;
if(_52){
this.title.type=_52;
}
},addExtension:function(_53,_54,_55,_56,_57){
if(!this.extensions){
this.extensions=[];
}
this.extensions.push(new dojox.atom.io.model.Node(_53,_54,_55,_56,_57||"ns"+this.extensions.length));
},getExtensions:function(_58,_59){
var arr=[];
if(!this.extensions){
return arr;
}
for(var x in this.extensions){
if((this.extensions[x].name_space===_58||this.extensions[x].shortNs===_58)&&(!_59||this.extensions[x].name===_59)){
arr.push(this.extensions[x]);
}
}
return arr;
},removeExtensions:function(_5a,_5b){
if(!this.extensions){
return;
}
for(var i=0;i<this.extensions.length;i++){
if((this.extensions[i].name_space==_5a||this.extensions[i].shortNs===_5a)&&this.extensions[i].name===_5b){
this.extensions.splice(i,1);
i--;
}
}
},destroy:function(){
this.links=null;
this.authors=null;
this.categories=null;
this.contributors=null;
this.icon=this.id=this.logo=this.xmlBase=this.rights=null;
this.subtitle=this.title=null;
this.updated=this.published=null;
this.issued=this.modified=null;
this.content=null;
this.extensions=null;
this.entries=null;
}});
dojo.declare("dojox.atom.io.model.Category",dojox.atom.io.model.Node,{constructor:function(_5c,_5d,_5e){
this.scheme=_5c;
this.term=_5d;
this.label=_5e;
this._objName="Category";
},_postBuild:function(){
},_getAttributeNames:function(){
return ["label","scheme","term"];
},toString:function(){
var s=[];
s.push("<category ");
if(this.label){
s.push(" label=\""+this.label+"\" ");
}
if(this.scheme){
s.push(" scheme=\""+this.scheme+"\" ");
}
if(this.term){
s.push(" term=\""+this.term+"\" ");
}
s.push("/>\n");
return s.join("");
},buildFromDom:function(_5f){
this._saveAttributes(_5f);
this.label=this.attributes.label;
this.scheme=this.attributes.scheme;
this.term=this.attributes.term;
if(this._postBuild){
this._postBuild();
}
}});
dojo.declare("dojox.atom.io.model.Content",dojox.atom.io.model.Node,{constructor:function(_60,_61,src,_62,_63){
this.tagName=_60;
this.value=_61;
this.src=src;
this.type=_62;
this.xmlLang=_63;
this.HTML="html";
this.TEXT="text";
this.XHTML="xhtml";
this.XML="xml";
this._useTextContent="true";
},_getAttributeNames:function(){
return ["type","src"];
},_postBuild:function(){
},buildFromDom:function(_64){
var _65=_64.getAttribute("type");
if(_65){
_65=_65.toLowerCase();
if(_65=="xml"||"text/xml"){
_65=this.XML;
}
}else{
_65="text";
}
if(_65===this.XML){
if(_64.firstChild){
var i;
this.value="";
for(i=0;i<_64.childNodes.length;i++){
var c=_64.childNodes[i];
if(c){
this.value+=dojox.xml.parser.innerXML(c);
}
}
}
}else{
if(_64.innerHTML){
this.value=_64.innerHTML;
}else{
this.value=dojox.xml.parser.textContent(_64);
}
}
this._saveAttributes(_64);
if(this.attributes){
this.type=this.attributes.type;
this.scheme=this.attributes.scheme;
this.term=this.attributes.term;
}
if(!this.type){
this.type="text";
}
var _66=this.type.toLowerCase();
if(_66==="html"||_66==="text/html"||_66==="xhtml"||_66==="text/xhtml"){
this.value=this.value?dojox.atom.io.model.util.unEscapeHtml(this.value):"";
}
if(this._postBuild){
this._postBuild();
}
},toString:function(){
var s=[];
s.push("<"+this.tagName+" ");
if(!this.type){
this.type="text";
}
if(this.type){
s.push(" type=\""+this.type+"\" ");
}
if(this.xmlLang){
s.push(" xml:lang=\""+this.xmlLang+"\" ");
}
if(this.xmlBase){
s.push(" xml:base=\""+this.xmlBase+"\" ");
}
if(this.type.toLowerCase()==this.HTML){
s.push(">"+dojox.atom.io.model.util.escapeHtml(this.value)+"</"+this.tagName+">\n");
}else{
s.push(">"+this.value+"</"+this.tagName+">\n");
}
var ret=s.join("");
return ret;
}});
dojo.declare("dojox.atom.io.model.Link",dojox.atom.io.model.Node,{constructor:function(_67,rel,_68,_69,_6a){
this.href=_67;
this.hrefLang=_68;
this.rel=rel;
this.title=_69;
this.type=_6a;
},_getAttributeNames:function(){
return ["href","jrefLang","rel","title","type"];
},_postBuild:function(){
},buildFromDom:function(_6b){
this._saveAttributes(_6b);
this.href=this.attributes.href;
this.hrefLang=this.attributes.hreflang;
this.rel=this.attributes.rel;
this.title=this.attributes.title;
this.type=this.attributes.type;
if(this._postBuild){
this._postBuild();
}
},toString:function(){
var s=[];
s.push("<link ");
if(this.href){
s.push(" href=\""+this.href+"\" ");
}
if(this.hrefLang){
s.push(" hrefLang=\""+this.hrefLang+"\" ");
}
if(this.rel){
s.push(" rel=\""+this.rel+"\" ");
}
if(this.title){
s.push(" title=\""+this.title+"\" ");
}
if(this.type){
s.push(" type = \""+this.type+"\" ");
}
s.push("/>\n");
return s.join("");
}});
dojo.declare("dojox.atom.io.model.Person",dojox.atom.io.model.Node,{constructor:function(_6c,_6d,_6e,uri){
this.author="author";
this.contributor="contributor";
if(!_6c){
_6c=this.author;
}
this.personType=_6c;
this.name=_6d||"";
this.email=_6e||"";
this.uri=uri||"";
this._objName="Person";
},_getAttributeNames:function(){
return null;
},_postBuild:function(){
},accept:function(tag){
return Boolean(this._accepts[tag]);
},buildFromDom:function(_6f){
var c=_6f.childNodes;
for(var i=0;i<c.length;i++){
var _70=dojox.atom.io.model.util.getNodename(c[i]);
if(!_70){
continue;
}
if(c[i].namespaceURI!=dojox.atom.io.model._Constants.ATOM_NS&&_70!="#text"){
if(!this.extensions){
this.extensions=[];
}
var _71=new dojox.atom.io.model.Node();
_71.buildFromDom(c[i]);
this.extensions.push(_71);
}
if(!this.accept(_70.toLowerCase())){
continue;
}
var fn=dojox.atom.io.model._actions[_70];
if(fn){
fn(this,c[i]);
}
}
this._saveAttributes(_6f);
if(this._postBuild){
this._postBuild();
}
},_accepts:{"name":true,"uri":true,"email":true},toString:function(){
var s=[];
s.push("<"+this.personType+">\n");
if(this.name){
s.push("\t<name>"+this.name+"</name>\n");
}
if(this.email){
s.push("\t<email>"+this.email+"</email>\n");
}
if(this.uri){
s.push("\t<uri>"+this.uri+"</uri>\n");
}
s.push("</"+this.personType+">\n");
return s.join("");
}});
dojo.declare("dojox.atom.io.model.Generator",dojox.atom.io.model.Node,{constructor:function(uri,_72,_73){
this.uri=uri;
this.version=_72;
this.value=_73;
},_postBuild:function(){
},buildFromDom:function(_74){
this.value=dojox.xml.parser.textContent(_74);
this._saveAttributes(_74);
this.uri=this.attributes.uri;
this.version=this.attributes.version;
if(this._postBuild){
this._postBuild();
}
},toString:function(){
var s=[];
s.push("<generator ");
if(this.uri){
s.push(" uri=\""+this.uri+"\" ");
}
if(this.version){
s.push(" version=\""+this.version+"\" ");
}
s.push(">"+this.value+"</generator>\n");
var ret=s.join("");
return ret;
}});
dojo.declare("dojox.atom.io.model.Entry",dojox.atom.io.model.AtomItem,{constructor:function(id){
this.id=id;
this._objName="Entry";
this.feedUrl=null;
},_getAttributeNames:function(){
return null;
},_accepts:{"author":true,"content":true,"category":true,"contributor":true,"created":true,"id":true,"link":true,"published":true,"rights":true,"summary":true,"title":true,"updated":true,"xmlbase":true,"issued":true,"modified":true},toString:function(_75){
var s=[];
var i;
if(_75){
s.push("<?xml version='1.0' encoding='UTF-8'?>");
s.push("<entry xmlns='"+dojox.atom.io.model._Constants.ATOM_URI+"'");
}else{
s.push("<entry");
}
if(this.xmlBase){
s.push(" xml:base=\""+this.xmlBase+"\" ");
}
for(i in this.name_spaces){
s.push(" xmlns:"+i+"=\""+this.name_spaces[i]+"\"");
}
s.push(">\n");
s.push("<id>"+(this.id?this.id:"")+"</id>\n");
if(this.issued&&!this.published){
this.published=this.issued;
}
if(this.published){
s.push("<published>"+dojo.date.stamp.toISOString(this.published)+"</published>\n");
}
if(this.created){
s.push("<created>"+dojo.date.stamp.toISOString(this.created)+"</created>\n");
}
if(this.issued){
s.push("<issued>"+dojo.date.stamp.toISOString(this.issued)+"</issued>\n");
}
if(this.modified){
s.push("<modified>"+dojo.date.stamp.toISOString(this.modified)+"</modified>\n");
}
if(this.modified&&!this.updated){
this.updated=this.modified;
}
if(this.updated){
s.push("<updated>"+dojo.date.stamp.toISOString(this.updated)+"</updated>\n");
}
if(this.rights){
s.push("<rights>"+this.rights+"</rights>\n");
}
if(this.title){
s.push(this.title.toString());
}
if(this.summary){
s.push(this.summary.toString());
}
var _76=[this.authors,this.categories,this.links,this.contributors,this.extensions];
for(var x in _76){
if(_76[x]){
for(var y in _76[x]){
s.push(_76[x][y]);
}
}
}
if(this.content){
s.push(this.content.toString());
}
s.push("</entry>\n");
return s.join("");
},getEditHref:function(){
if(this.links===null||this.links.length===0){
return null;
}
for(var x in this.links){
if(this.links[x].rel&&this.links[x].rel=="edit"){
return this.links[x].href;
}
}
return null;
},setEditHref:function(url){
if(this.links===null){
this.links=[];
}
for(var x in this.links){
if(this.links[x].rel&&this.links[x].rel=="edit"){
this.links[x].href=url;
return;
}
}
this.addLink(url,"edit");
}});
dojo.declare("dojox.atom.io.model.Feed",dojox.atom.io.model.AtomItem,{_accepts:{"author":true,"content":true,"category":true,"contributor":true,"created":true,"id":true,"link":true,"published":true,"rights":true,"summary":true,"title":true,"updated":true,"xmlbase":true,"entry":true,"logo":true,"issued":true,"modified":true,"icon":true,"subtitle":true},addEntry:function(_77){
if(!_77.id){
throw new Error("The entry object must be assigned an ID attribute.");
}
if(!this.entries){
this.entries=[];
}
_77.feedUrl=this.getSelfHref();
this.entries.push(_77);
},getFirstEntry:function(){
if(!this.entries||this.entries.length===0){
return null;
}
return this.entries[0];
},getEntry:function(_78){
if(!this.entries){
return null;
}
for(var x in this.entries){
if(this.entries[x].id==_78){
return this.entries[x];
}
}
return null;
},removeEntry:function(_79){
if(!this.entries){
return;
}
var _7a=0;
for(var i=0;i<this.entries.length;i++){
if(this.entries[i]===_79){
this.entries.splice(i,1);
_7a++;
}
}
return _7a;
},setEntries:function(_7b){
for(var x in _7b){
this.addEntry(_7b[x]);
}
},toString:function(){
var s=[];
var i;
s.push("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
s.push("<feed xmlns=\""+dojox.atom.io.model._Constants.ATOM_URI+"\"");
if(this.xmlBase){
s.push(" xml:base=\""+this.xmlBase+"\"");
}
for(i in this.name_spaces){
s.push(" xmlns:"+i+"=\""+this.name_spaces[i]+"\"");
}
s.push(">\n");
s.push("<id>"+(this.id?this.id:"")+"</id>\n");
if(this.title){
s.push(this.title);
}
if(this.copyright&&!this.rights){
this.rights=this.copyright;
}
if(this.rights){
s.push("<rights>"+this.rights+"</rights>\n");
}
if(this.issued){
s.push("<issued>"+dojo.date.stamp.toISOString(this.issued)+"</issued>\n");
}
if(this.modified){
s.push("<modified>"+dojo.date.stamp.toISOString(this.modified)+"</modified>\n");
}
if(this.modified&&!this.updated){
this.updated=this.modified;
}
if(this.updated){
s.push("<updated>"+dojo.date.stamp.toISOString(this.updated)+"</updated>\n");
}
if(this.published){
s.push("<published>"+dojo.date.stamp.toISOString(this.published)+"</published>\n");
}
if(this.icon){
s.push("<icon>"+this.icon+"</icon>\n");
}
if(this.language){
s.push("<language>"+this.language+"</language>\n");
}
if(this.logo){
s.push("<logo>"+this.logo+"</logo>\n");
}
if(this.subtitle){
s.push(this.subtitle.toString());
}
if(this.tagline){
s.push(this.tagline.toString());
}
var _7c=[this.alternateLinks,this.authors,this.categories,this.contributors,this.otherLinks,this.extensions,this.entries];
for(i in _7c){
if(_7c[i]){
for(var x in _7c[i]){
s.push(_7c[i][x]);
}
}
}
s.push("</feed>");
return s.join("");
},createEntry:function(){
var _7d=new dojox.atom.io.model.Entry();
_7d.feedUrl=this.getSelfHref();
return _7d;
},getSelfHref:function(){
if(this.links===null||this.links.length===0){
return null;
}
for(var x in this.links){
if(this.links[x].rel&&this.links[x].rel=="self"){
return this.links[x].href;
}
}
return null;
}});
dojo.declare("dojox.atom.io.model.Service",dojox.atom.io.model.AtomItem,{constructor:function(_7e){
this.href=_7e;
},buildFromDom:function(_7f){
var i;
this.workspaces=[];
if(_7f.tagName!="service"){
return;
}
if(_7f.namespaceURI!=dojox.atom.io.model._Constants.PURL_NS&&_7f.namespaceURI!=dojox.atom.io.model._Constants.APP_NS){
return;
}
var ns=_7f.namespaceURI;
this.name_space=_7f.namespaceURI;
var _80;
if(typeof (_7f.getElementsByTagNameNS)!="undefined"){
_80=_7f.getElementsByTagNameNS(ns,"workspace");
}else{
_80=[];
var _81=_7f.getElementsByTagName("workspace");
for(i=0;i<_81.length;i++){
if(_81[i].namespaceURI==ns){
_80.push(_81[i]);
}
}
}
if(_80&&_80.length>0){
var _82=0;
var _83;
for(i=0;i<_80.length;i++){
_83=(typeof (_80.item)==="undefined"?_80[i]:_80.item(i));
var _84=new dojox.atom.io.model.Workspace();
_84.buildFromDom(_83);
this.workspaces[_82++]=_84;
}
}
},getCollection:function(url){
for(var i=0;i<this.workspaces.length;i++){
var _85=this.workspaces[i].collections;
for(var j=0;j<_85.length;j++){
if(_85[j].href==url){
return _85;
}
}
}
return null;
}});
dojo.declare("dojox.atom.io.model.Workspace",dojox.atom.io.model.AtomItem,{constructor:function(_86){
this.title=_86;
this.collections=[];
},buildFromDom:function(_87){
var _88=dojox.atom.io.model.util.getNodename(_87);
if(_88!="workspace"){
return;
}
var c=_87.childNodes;
var len=0;
for(var i=0;i<c.length;i++){
var _89=c[i];
if(_89.nodeType===1){
_88=dojox.atom.io.model.util.getNodename(_89);
if(_89.namespaceURI==dojox.atom.io.model._Constants.PURL_NS||_89.namespaceURI==dojox.atom.io.model._Constants.APP_NS){
if(_88==="collection"){
var _8a=new dojox.atom.io.model.Collection();
_8a.buildFromDom(_89);
this.collections[len++]=_8a;
}
}else{
if(_89.namespaceURI===dojox.atom.io.model._Constants.ATOM_NS){
if(_88==="title"){
this.title=dojox.xml.parser.textContent(_89);
}
}
}
}
}
}});
dojo.declare("dojox.atom.io.model.Collection",dojox.atom.io.model.AtomItem,{constructor:function(_8b,_8c){
this.href=_8b;
this.title=_8c;
this.attributes=[];
this.features=[];
this.children=[];
this.memberType=null;
this.id=null;
},buildFromDom:function(_8d){
this.href=_8d.getAttribute("href");
var c=_8d.childNodes;
for(var i=0;i<c.length;i++){
var _8e=c[i];
if(_8e.nodeType===1){
var _8f=dojox.atom.io.model.util.getNodename(_8e);
if(_8e.namespaceURI==dojox.atom.io.model._Constants.PURL_NS||_8e.namespaceURI==dojox.atom.io.model._Constants.APP_NS){
if(_8f==="member-type"){
this.memberType=dojox.xml.parser.textContent(_8e);
}else{
if(_8f=="feature"){
if(_8e.getAttribute("id")){
this.features.push(_8e.getAttribute("id"));
}
}else{
var _90=new dojox.atom.io.model.Node();
_90.buildFromDom(_8e);
this.children.push(_90);
}
}
}else{
if(_8e.namespaceURI===dojox.atom.io.model._Constants.ATOM_NS){
if(_8f==="id"){
this.id=dojox.xml.parser.textContent(_8e);
}else{
if(_8f==="title"){
this.title=dojox.xml.parser.textContent(_8e);
}
}
}
}
}
}
}});
}
