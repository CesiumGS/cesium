/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.embed.Object"]){
dojo._hasResource["dojox.embed.Object"]=true;
dojo.provide("dojox.embed.Object");
dojo.experimental("dojox.embed.Object");
dojo.require("dijit._Widget");
dojo.require("dojox.embed.Flash");
dojo.require("dojox.embed.Quicktime");
dojo.declare("dojox.embed.Object",dijit._Widget,{width:0,height:0,src:"",movie:null,params:null,reFlash:/\.swf|\.flv/gi,reQtMovie:/\.3gp|\.avi|\.m4v|\.mov|\.mp4|\.mpg|\.mpeg|\.qt/gi,reQtAudio:/\.aiff|\.aif|\.m4a|\.m4b|\.m4p|\.midi|\.mid|\.mp3|\.mpa|\.wav/gi,postCreate:function(){
if(!this.width||!this.height){
var _1=dojo.marginBox(this.domNode);
this.width=_1.w,this.height=_1.h;
}
var em=dojox.embed.Flash;
if(this.src.match(this.reQtMovie)||this.src.match(this.reQtAudio)){
em=dojox.embed.Quicktime;
}
if(!this.params){
this.params={};
if(this.domNode.hasAttributes()){
var _2={dojoType:"",width:"",height:"","class":"",style:"",id:"",src:""};
var _3=this.domNode.attributes;
for(var i=0,l=_3.length;i<l;i++){
if(!_2[_3[i].name]){
this.params[_3[i].name]=_3[i].value;
}
}
}
}
var _4={path:this.src,width:this.width,height:this.height,params:this.params};
this.movie=new (em)(_4,this.domNode);
}});
}
