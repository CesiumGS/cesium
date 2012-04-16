/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.analytics.Urchin"]){
dojo._hasResource["dojox.analytics.Urchin"]=true;
dojo.provide("dojox.analytics.Urchin");
dojo.declare("dojox.analytics.Urchin",null,{acct:"",constructor:function(_1){
this.tracker=null;
dojo.mixin(this,_1);
this.acct=this.acct||dojo.config.urchin;
var re=/loaded|complete/,_2=("https:"==dojo.doc.location.protocol)?"https://ssl.":"http://www.",h=dojo.doc.getElementsByTagName("head")[0],n=dojo.create("script",{src:_2+"google-analytics.com/ga.js"},h);
n.onload=n.onreadystatechange=dojo.hitch(this,function(e){
if(e&&e.type=="load"||re.test(n.readyState)){
n.onload=n.onreadystatechange=null;
this._gotGA();
h.removeChild(n);
}
});
},_gotGA:function(){
this.tracker=_gat._getTracker(this.acct);
this.GAonLoad.apply(this,arguments);
},GAonLoad:function(){
this.trackPageView();
},trackPageView:function(_3){
this.tracker._trackPageview.apply(this,arguments);
}});
}
