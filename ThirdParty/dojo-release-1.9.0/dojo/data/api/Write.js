/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/api/Write",["../../_base/declare","./Read"],function(_1,_2){
return _1("dojo.data.api.Write",_2,{getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Write":true};
},newItem:function(_3,_4){
throw new Error("Unimplemented API: dojo.data.api.Write.newItem");
},deleteItem:function(_5){
throw new Error("Unimplemented API: dojo.data.api.Write.deleteItem");
},setValue:function(_6,_7,_8){
throw new Error("Unimplemented API: dojo.data.api.Write.setValue");
},setValues:function(_9,_a,_b){
throw new Error("Unimplemented API: dojo.data.api.Write.setValues");
},unsetAttribute:function(_c,_d){
throw new Error("Unimplemented API: dojo.data.api.Write.clear");
},save:function(_e){
throw new Error("Unimplemented API: dojo.data.api.Write.save");
},revert:function(){
throw new Error("Unimplemented API: dojo.data.api.Write.revert");
},isDirty:function(_f){
throw new Error("Unimplemented API: dojo.data.api.Write.isDirty");
}});
});
