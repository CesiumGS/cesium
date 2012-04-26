/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.manager._ClassMixin"]){
dojo._hasResource["dojox.form.manager._ClassMixin"]=true;
dojo.provide("dojox.form.manager._ClassMixin");
dojo.require("dojox.form.manager._Mixin");
(function(){
var fm=dojox.form.manager,aa=fm.actionAdapter,ia=fm.inspectorAdapter;
dojo.declare("dojox.form.manager._ClassMixin",null,{gatherClassState:function(_1,_2){
var _3=this.inspect(ia(function(_4,_5){
return dojo.hasClass(_5,_1);
}),_2);
return _3;
},addClass:function(_6,_7){
this.inspect(aa(function(_8,_9){
dojo.addClass(_9,_6);
}),_7);
return this;
},removeClass:function(_a,_b){
this.inspect(aa(function(_c,_d){
dojo.removeClass(_d,_a);
}),_b);
return this;
}});
})();
}
