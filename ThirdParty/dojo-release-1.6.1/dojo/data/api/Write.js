/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.api.Write"]){
dojo._hasResource["dojo.data.api.Write"]=true;
dojo.provide("dojo.data.api.Write");
dojo.require("dojo.data.api.Read");
dojo.declare("dojo.data.api.Write",dojo.data.api.Read,{getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Write":true};
},newItem:function(_1,_2){
var _3;
throw new Error("Unimplemented API: dojo.data.api.Write.newItem");
return _3;
},deleteItem:function(_4){
throw new Error("Unimplemented API: dojo.data.api.Write.deleteItem");
return false;
},setValue:function(_5,_6,_7){
throw new Error("Unimplemented API: dojo.data.api.Write.setValue");
return false;
},setValues:function(_8,_9,_a){
throw new Error("Unimplemented API: dojo.data.api.Write.setValues");
return false;
},unsetAttribute:function(_b,_c){
throw new Error("Unimplemented API: dojo.data.api.Write.clear");
return false;
},save:function(_d){
throw new Error("Unimplemented API: dojo.data.api.Write.save");
},revert:function(){
throw new Error("Unimplemented API: dojo.data.api.Write.revert");
return false;
},isDirty:function(_e){
throw new Error("Unimplemented API: dojo.data.api.Write.isDirty");
return false;
}});
}
