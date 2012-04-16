/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.FlickrBadge"]){
dojo._hasResource["dojox.image.FlickrBadge"]=true;
dojo.provide("dojox.image.FlickrBadge");
dojo.require("dojox.image.Badge");
dojo.require("dojox.data.FlickrRestStore");
dojo.declare("dojox.image.FlickrBadge",dojox.image.Badge,{children:"a.flickrImage",userid:"",username:"",setid:"",tags:"",searchText:"",target:"",apikey:"8c6803164dbc395fb7131c9d54843627",_store:null,postCreate:function(){
if(this.username&&!this.userid){
var _1=dojo.io.script.get({url:"http://www.flickr.com/services/rest/",preventCache:true,content:{format:"json",method:"flickr.people.findByUsername",api_key:this.apikey,username:this.username},callbackParamName:"jsoncallback"});
_1.addCallback(this,function(_2){
if(_2.user&&_2.user.nsid){
this.userid=_2.user.nsid;
if(!this._started){
this.startup();
}
}
});
}
},startup:function(){
if(this._started){
return;
}
if(this.userid){
var _3={userid:this.userid};
if(this.setid){
_3["setid"]=this.setid;
}
if(this.tags){
_3.tags=this.tags;
}
if(this.searchText){
_3.text=this.searchText;
}
var _4=arguments;
this._store=new dojox.data.FlickrRestStore({apikey:this.apikey});
this._store.fetch({count:this.cols*this.rows,query:_3,onComplete:dojo.hitch(this,function(_5){
dojo.forEach(_5,function(_6){
var a=dojo.doc.createElement("a");
dojo.addClass(a,"flickrImage");
a.href=this._store.getValue(_6,"link");
if(this.target){
a.target=this.target;
}
var _7=dojo.doc.createElement("img");
_7.src=this._store.getValue(_6,"imageUrlThumb");
dojo.style(_7,{width:"100%",height:"100%"});
a.appendChild(_7);
this.domNode.appendChild(a);
},this);
dojox.image.Badge.prototype.startup.call(this,_4);
})});
}
}});
}
