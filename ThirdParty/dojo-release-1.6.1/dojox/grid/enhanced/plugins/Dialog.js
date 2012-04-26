/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Dialog"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Dialog"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Dialog");
dojo.require("dijit.Dialog");
dojo.require("dojo.window");
dojo.declare("dojox.grid.enhanced.plugins.Dialog",dijit.Dialog,{refNode:null,_position:function(){
if(this.refNode&&!this._relativePosition){
var _1=dojo.position(dojo.byId(this.refNode)),_2=dojo.position(this.domNode),_3=dojo.window.getBox();
if(_1.x<0){
_1.x=0;
}
if(_1.x+_1.w>_3.w){
_1.w=_3.w-_1.x;
}
if(_1.y<0){
_1.y=0;
}
if(_1.y+_1.h>_3.h){
_1.h=_3.h-_1.y;
}
_1.x=_1.x+_1.w/2-_2.w/2;
_1.y=_1.y+_1.h/2-_2.h/2;
if(_1.x>=0&&_1.x+_2.w<=_3.w&&_1.y>=0&&_1.y+_2.h<=_3.h){
this._relativePosition=_1;
}
}
this.inherited(arguments);
}});
}
