/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.tag.date"]){
dojo._hasResource["dojox.dtl.tag.date"]=true;
dojo.provide("dojox.dtl.tag.date");
dojo.require("dojox.dtl._base");
dojo.require("dojox.dtl.utils.date");
dojox.dtl.tag.date.NowNode=function(_1,_2){
this._format=_1;
this.format=new dojox.dtl.utils.date.DateFormat(_1);
this.contents=_2;
};
dojo.extend(dojox.dtl.tag.date.NowNode,{render:function(_3,_4){
this.contents.set(this.format.format(new Date()));
return this.contents.render(_3,_4);
},unrender:function(_5,_6){
return this.contents.unrender(_5,_6);
},clone:function(_7){
return new this.constructor(this._format,this.contents.clone(_7));
}});
dojox.dtl.tag.date.now=function(_8,_9){
var _a=_9.split_contents();
if(_a.length!=2){
throw new Error("'now' statement takes one argument");
}
return new dojox.dtl.tag.date.NowNode(_a[1].slice(1,-1),_8.create_text_node());
};
}
