/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.analytics.plugins.idle"]){
dojo._hasResource["dojox.analytics.plugins.idle"]=true;
dojo.require("dojox.analytics._base");
dojo.provide("dojox.analytics.plugins.idle");
dojox.analytics.plugins.idle=new (function(){
this.addData=dojo.hitch(dojox.analytics,"addData","idle");
this.idleTime=dojo.config["idleTime"]||60000;
this.idle=true;
this.setIdle=function(){
this.addData("isIdle");
this.idle=true;
};
dojo.addOnLoad(dojo.hitch(this,function(){
var _1=["onmousemove","onkeydown","onclick","onscroll"];
for(var i=0;i<_1.length;i++){
dojo.connect(dojo.doc,_1[i],this,function(e){
if(this.idle){
this.idle=false;
this.addData("isActive");
this.idleTimer=setTimeout(dojo.hitch(this,"setIdle"),this.idleTime);
}else{
clearTimeout(this.idleTimer);
this.idleTimer=setTimeout(dojo.hitch(this,"setIdle"),this.idleTime);
}
});
}
}));
})();
}
