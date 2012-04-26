/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.widget.Code"]){
dojo._hasResource["dojox.highlight.widget.Code"]=true;
dojo.provide("dojox.highlight.widget.Code");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.highlight");
dojo.declare("highlight.Code",[dijit._Widget,dijit._Templated],{url:"",range:null,style:"",listType:"1",lang:"",templateString:"<div class=\"formatted\" style=\"${style}\">"+"<div class=\"titleBar\"></div>"+"<ol type=\"${listType}\" dojoAttachPoint=\"codeList\" class=\"numbers\"></ol>"+"<div style=\"display:none\" dojoAttachPoint=\"containerNode\"></div>"+"</div>",postCreate:function(){
this.inherited(arguments);
if(this.url){
dojo.xhrGet({url:this.url,load:dojo.hitch(this,"_populate"),error:dojo.hitch(this,"_loadError")});
}else{
this._populate(this.containerNode.innerHTML);
}
},_populate:function(_1){
this.containerNode.innerHTML="<pre><code class='"+this.lang+"'>"+_1.replace(/\</g,"&lt;")+"</code></pre>";
dojo.query("pre > code",this.containerNode).forEach(dojox.highlight.init);
var _2=this.containerNode.innerHTML.split("\n");
dojo.forEach(_2,function(_3,i){
var li=dojo.doc.createElement("li");
dojo.addClass(li,(i%2!==0?"even":"odd"));
_3="<pre><code>"+_3+"&nbsp;</code></pre>";
_3=_3.replace(/\t/g," &nbsp; ");
li.innerHTML=_3;
this.codeList.appendChild(li);
},this);
this._lines=dojo.query("li",this.codeList);
this._updateView();
},setRange:function(_4){
if(dojo.isArray(_4)){
this.range=_4;
this._updateView();
}
},_updateView:function(){
if(this.range){
var r=this.range;
this._lines.style({display:"none"}).filter(function(n,i){
return (i+1>=r[0]&&i+1<=r[1]);
}).style({display:""});
dojo.attr(this.codeList,"start",r[0]);
}
},_loadError:function(_5){
console.warn("loading: ",this.url," FAILED",_5);
}});
}
