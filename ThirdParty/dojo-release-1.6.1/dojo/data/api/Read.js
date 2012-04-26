/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.api.Read"]){
dojo._hasResource["dojo.data.api.Read"]=true;
dojo.provide("dojo.data.api.Read");
dojo.require("dojo.data.api.Request");
dojo.declare("dojo.data.api.Read",null,{getValue:function(_1,_2,_3){
var _4=null;
throw new Error("Unimplemented API: dojo.data.api.Read.getValue");
return _4;
},getValues:function(_5,_6){
var _7=[];
throw new Error("Unimplemented API: dojo.data.api.Read.getValues");
return _7;
},getAttributes:function(_8){
var _9=[];
throw new Error("Unimplemented API: dojo.data.api.Read.getAttributes");
return _9;
},hasAttribute:function(_a,_b){
throw new Error("Unimplemented API: dojo.data.api.Read.hasAttribute");
return false;
},containsValue:function(_c,_d,_e){
throw new Error("Unimplemented API: dojo.data.api.Read.containsValue");
return false;
},isItem:function(_f){
throw new Error("Unimplemented API: dojo.data.api.Read.isItem");
return false;
},isItemLoaded:function(_10){
throw new Error("Unimplemented API: dojo.data.api.Read.isItemLoaded");
return false;
},loadItem:function(_11){
if(!this.isItemLoaded(_11.item)){
throw new Error("Unimplemented API: dojo.data.api.Read.loadItem");
}
},fetch:function(_12){
var _13=null;
throw new Error("Unimplemented API: dojo.data.api.Read.fetch");
return _13;
},getFeatures:function(){
return {"dojo.data.api.Read":true};
},close:function(_14){
throw new Error("Unimplemented API: dojo.data.api.Read.close");
},getLabel:function(_15){
throw new Error("Unimplemented API: dojo.data.api.Read.getLabel");
return undefined;
},getLabelAttributes:function(_16){
throw new Error("Unimplemented API: dojo.data.api.Read.getLabelAttributes");
return null;
}});
}
