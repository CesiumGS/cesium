/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app._Widget"]){
dojo._hasResource["dojox.mobile.app._Widget"]=true;
dojo.provide("dojox.mobile.app._Widget");
dojo.experimental("dojox.mobile.app._Widget");
dojo.require("dijit._WidgetBase");
dojo.declare("dojox.mobile.app._Widget",dijit._WidgetBase,{getScroll:function(){
return {x:dojo.global.scrollX,y:dojo.global.scrollY};
},connect:function(_1,_2,fn){
if(_2.toLowerCase()=="dblclick"||_2.toLowerCase()=="ondblclick"){
if(dojo.global["Mojo"]){
return this.connect(_1,Mojo.Event.tap,fn);
}
}
return this.inherited(arguments);
}});
}
