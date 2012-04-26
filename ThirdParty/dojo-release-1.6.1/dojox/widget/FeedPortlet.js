/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.FeedPortlet"]){
dojo._hasResource["dojox.widget.FeedPortlet"]=true;
dojo.provide("dojox.widget.FeedPortlet");
dojo.require("dojox.widget.Portlet");
dojo.require("dijit.Tooltip");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");
dojo.require("dojox.data.GoogleFeedStore");
dojo.declare("dojox.widget.FeedPortlet",dojox.widget.Portlet,{local:false,maxResults:5,url:"",openNew:true,showFeedTitle:true,postCreate:function(){
this.inherited(arguments);
if(this.local&&!dojox.data.AtomReadStore){
throw Error(this.declaredClass+": To use local feeds, you must include dojox.data.AtomReadStore on the page.");
}
},onFeedError:function(){
this.containerNode.innerHTML="Error accessing the feed.";
},addChild:function(_1){
this.inherited(arguments);
var _2=_1.attr("feedPortletUrl");
if(_2){
this.set("url",_2);
}
},_getTitle:function(_3){
var t=this.store.getValue(_3,"title");
return this.local?t.text:t;
},_getLink:function(_4){
var l=this.store.getValue(_4,"link");
return this.local?l.href:l;
},_getContent:function(_5){
var c=this.store.getValue(_5,"summary");
if(!c){
return null;
}
if(this.local){
c=c.text;
}
c=c.split("<script").join("<!--").split("</script>").join("-->");
c=c.split("<iframe").join("<!--").split("</iframe>").join("-->");
return c;
},_setUrlAttr:function(_6){
this.url=_6;
if(this._started){
this.load();
}
},startup:function(){
if(this.started||this._started){
return;
}
this.inherited(arguments);
if(!this.url||this.url==""){
throw new Error(this.id+": A URL must be specified for the feed portlet");
}
if(this.url&&this.url!=""){
this.load();
}
},load:function(){
if(this._resultList){
dojo.destroy(this._resultList);
}
var _7,_8;
if(this.local){
_7=new dojox.data.AtomReadStore({url:this.url});
_8={};
}else{
_7=new dojox.data.GoogleFeedStore();
_8={url:this.url};
}
var _9={query:_8,count:this.maxResults,onComplete:dojo.hitch(this,function(_a){
if(this.showFeedTitle&&_7.getFeedValue){
var _b=this.store.getFeedValue("title");
if(_b){
this.set("title",_b.text?_b.text:_b);
}
}
this.generateResults(_a);
}),onError:dojo.hitch(this,"onFeedError")};
this.store=_7;
_7.fetch(_9);
},generateResults:function(_c){
var _d=this.store;
var _e;
var ul=(this._resultList=dojo.create("ul",{"class":"dojoxFeedPortletList"},this.containerNode));
dojo.forEach(_c,dojo.hitch(this,function(_f){
var li=dojo.create("li",{innerHTML:"<a href=\""+this._getLink(_f)+"\""+(this.openNew?" target=\"_blank\"":"")+">"+this._getTitle(_f)+"</a>"},ul);
dojo.connect(li,"onmouseover",dojo.hitch(this,function(evt){
if(_e){
clearTimeout(_e);
}
_e=setTimeout(dojo.hitch(this,function(){
_e=null;
var _10=this._getContent(_f);
if(!_10){
return;
}
var _11="<div class=\"dojoxFeedPortletPreview\">"+_10+"</div>";
dojo.query("li",ul).forEach(function(_12){
if(_12!=evt.target){
dijit.hideTooltip(_12);
}
});
dijit.showTooltip(_11,li.firstChild,!this.isLeftToRight());
}),500);
}));
dojo.connect(li,"onmouseout",function(){
if(_e){
clearTimeout(_e);
_e=null;
}
dijit.hideTooltip(li.firstChild);
});
}));
this.resize();
}});
dojo.declare("dojox.widget.ExpandableFeedPortlet",dojox.widget.FeedPortlet,{onlyOpenOne:false,generateResults:function(_13){
var _14=this.store;
var _15="dojoxPortletToggleIcon";
var _16="dojoxPortletItemCollapsed";
var _17="dojoxPortletItemOpen";
var _18;
var ul=(this._resultList=dojo.create("ul",{"class":"dojoxFeedPortletExpandableList"},this.containerNode));
dojo.forEach(_13,dojo.hitch(this,dojo.hitch(this,function(_19){
var li=dojo.create("li",{"class":_16},ul);
var _1a=dojo.create("div",{style:"width: 100%;"},li);
var _1b=dojo.create("div",{"class":"dojoxPortletItemSummary",innerHTML:this._getContent(_19)},li);
dojo.create("span",{"class":_15,innerHTML:"<img src='"+dojo.config.baseUrl+"/resources/blank.gif'>"},_1a);
var a=dojo.create("a",{href:this._getLink(_19),innerHTML:this._getTitle(_19)},_1a);
if(this.openNew){
dojo.attr(a,"target","_blank");
}
})));
dojo.connect(ul,"onclick",dojo.hitch(this,function(evt){
if(dojo.hasClass(evt.target,_15)||dojo.hasClass(evt.target.parentNode,_15)){
dojo.stopEvent(evt);
var li=evt.target.parentNode;
while(li.tagName!="LI"){
li=li.parentNode;
}
if(this.onlyOpenOne){
dojo.query("li",ul).filter(function(_1c){
return _1c!=li;
}).removeClass(_17).addClass(_16);
}
var _1d=dojo.hasClass(li,_17);
dojo.toggleClass(li,_17,!_1d);
dojo.toggleClass(li,_16,_1d);
}
}));
}});
dojo.declare("dojox.widget.PortletFeedSettings",dojox.widget.PortletSettings,{"class":"dojoxPortletFeedSettings",urls:null,selectedIndex:0,buildRendering:function(){
var s;
if(this.urls&&this.urls.length>0){
s=dojo.create("select");
if(this.srcNodeRef){
dojo.place(s,this.srcNodeRef,"before");
dojo.destroy(this.srcNodeRef);
}
this.srcNodeRef=s;
dojo.forEach(this.urls,function(url){
dojo.create("option",{value:url.url||url,innerHTML:url.label||url},s);
});
}
if(this.srcNodeRef.tagName=="SELECT"){
this.text=this.srcNodeRef;
var div=dojo.create("div",{},this.srcNodeRef,"before");
div.appendChild(this.text);
this.srcNodeRef=div;
dojo.query("option",this.text).filter("return !item.value;").forEach("item.value = item.innerHTML");
if(!this.text.value){
if(this.content&&this.text.options.length==0){
this.text.appendChild(this.content);
}
dojo.attr(s||this.text,"value",this.text.options[this.selectedIndex].value);
}
}
this.inherited(arguments);
},_setContentAttr:function(){
},postCreate:function(){
if(!this.text){
var _1e=this.text=new dijit.form.TextBox({});
dojo.create("span",{innerHTML:"Choose Url: "},this.domNode);
this.addChild(_1e);
}
this.addChild(new dijit.form.Button({label:"Load",onClick:dojo.hitch(this,function(){
this.portlet.attr("url",(this.text.tagName=="SELECT")?this.text.value:this.text.attr("value"));
if(this.text.tagName=="SELECT"){
dojo.some(this.text.options,dojo.hitch(this,function(opt,idx){
if(opt.selected){
this.set("selectedIndex",idx);
return true;
}
return false;
}));
}
this.toggle();
})}));
this.addChild(new dijit.form.Button({label:"Cancel",onClick:dojo.hitch(this,"toggle")}));
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(!this.portlet){
throw Error(this.declaredClass+": A PortletFeedSettings widget cannot exist without a Portlet.");
}
if(this.text.tagName=="SELECT"){
dojo.forEach(this.text.options,dojo.hitch(this,function(opt,_1f){
dojo.attr(opt,"selected",_1f==this.selectedIndex);
}));
}
var url=this.portlet.attr("url");
if(url){
if(this.text.tagName=="SELECT"){
if(!this.urls&&dojo.query("option[value='"+url+"']",this.text).length<1){
dojo.place(dojo.create("option",{value:url,innerHTML:url,selected:"true"}),this.text,"first");
}
}else{
this.text.attr("value",url);
}
}else{
this.portlet.attr("url",this.get("feedPortletUrl"));
}
},_getFeedPortletUrlAttr:function(){
return this.text.value;
}});
}
