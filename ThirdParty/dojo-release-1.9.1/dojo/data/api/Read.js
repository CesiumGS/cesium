/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/api/Read",["../../_base/declare"],function(_1){
return _1("dojo.data.api.Read",null,{getValue:function(_2,_3,_4){
throw new Error("Unimplemented API: dojo.data.api.Read.getValue");
},getValues:function(_5,_6){
throw new Error("Unimplemented API: dojo.data.api.Read.getValues");
},getAttributes:function(_7){
throw new Error("Unimplemented API: dojo.data.api.Read.getAttributes");
},hasAttribute:function(_8,_9){
throw new Error("Unimplemented API: dojo.data.api.Read.hasAttribute");
},containsValue:function(_a,_b,_c){
throw new Error("Unimplemented API: dojo.data.api.Read.containsValue");
},isItem:function(_d){
throw new Error("Unimplemented API: dojo.data.api.Read.isItem");
},isItemLoaded:function(_e){
throw new Error("Unimplemented API: dojo.data.api.Read.isItemLoaded");
},loadItem:function(_f){
if(!this.isItemLoaded(_f.item)){
throw new Error("Unimplemented API: dojo.data.api.Read.loadItem");
}
},fetch:function(_10){
throw new Error("Unimplemented API: dojo.data.api.Read.fetch");
},getFeatures:function(){
return {"dojo.data.api.Read":true};
},close:function(_11){
throw new Error("Unimplemented API: dojo.data.api.Read.close");
},getLabel:function(_12){
throw new Error("Unimplemented API: dojo.data.api.Read.getLabel");
},getLabelAttributes:function(_13){
throw new Error("Unimplemented API: dojo.data.api.Read.getLabelAttributes");
}});
});
