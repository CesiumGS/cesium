/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.AirDBStorageProvider"]){
dojo._hasResource["dojox.storage.AirDBStorageProvider"]=true;
dojo.provide("dojox.storage.AirDBStorageProvider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");
if(dojo.isAIR){
(function(){
if(!_1){
var _1={};
}
_1.File=window.runtime.flash.filesystem.File;
_1.SQLConnection=window.runtime.flash.data.SQLConnection;
_1.SQLStatement=window.runtime.flash.data.SQLStatement;
dojo.declare("dojox.storage.AirDBStorageProvider",[dojox.storage.Provider],{DATABASE_FILE:"dojo.db",TABLE_NAME:"__DOJO_STORAGE",initialized:false,_db:null,initialize:function(){
this.initialized=false;
try{
this._db=new _1.SQLConnection();
this._db.open(_1.File.applicationStorageDirectory.resolvePath(this.DATABASE_FILE));
this._sql("CREATE TABLE IF NOT EXISTS "+this.TABLE_NAME+"(namespace TEXT, key TEXT, value TEXT)");
this._sql("CREATE UNIQUE INDEX IF NOT EXISTS namespace_key_index ON "+this.TABLE_NAME+" (namespace, key)");
this.initialized=true;
}
catch(e){
}
dojox.storage.manager.loaded();
},_sql:function(_2,_3){
var _4=new _1.SQLStatement();
_4.sqlConnection=this._db;
_4.text=_2;
if(_3){
for(var _5 in _3){
_4.parameters[_5]=_3[_5];
}
}
_4.execute();
return _4.getResult();
},_beginTransaction:function(){
this._db.begin();
},_commitTransaction:function(){
this._db.commit();
},isAvailable:function(){
return true;
},put:function(_6,_7,_8,_9){
if(this.isValidKey(_6)==false){
throw new Error("Invalid key given: "+_6);
}
_9=_9||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_9)==false){
throw new Error("Invalid namespace given: "+_9);
}
try{
this._sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = :namespace AND key = :key",{":namespace":_9,":key":_6});
this._sql("INSERT INTO "+this.TABLE_NAME+" VALUES (:namespace, :key, :value)",{":namespace":_9,":key":_6,":value":_7});
}
catch(e){
_8(this.FAILED,_6,e.toString());
return;
}
if(_8){
_8(this.SUCCESS,_6,null,_9);
}
},get:function(_a,_b){
if(this.isValidKey(_a)==false){
throw new Error("Invalid key given: "+_a);
}
_b=_b||this.DEFAULT_NAMESPACE;
var _c=this._sql("SELECT * FROM "+this.TABLE_NAME+" WHERE namespace = :namespace AND key = :key",{":namespace":_b,":key":_a});
if(_c.data&&_c.data.length){
return _c.data[0].value;
}
return null;
},getNamespaces:function(){
var _d=[this.DEFAULT_NAMESPACE];
var rs=this._sql("SELECT namespace FROM "+this.TABLE_NAME+" DESC GROUP BY namespace");
if(rs.data){
for(var i=0;i<rs.data.length;i++){
if(rs.data[i].namespace!=this.DEFAULT_NAMESPACE){
_d.push(rs.data[i].namespace);
}
}
}
return _d;
},getKeys:function(_e){
_e=_e||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_e)==false){
throw new Error("Invalid namespace given: "+_e);
}
var _f=[];
var rs=this._sql("SELECT key FROM "+this.TABLE_NAME+" WHERE namespace = :namespace",{":namespace":_e});
if(rs.data){
for(var i=0;i<rs.data.length;i++){
_f.push(rs.data[i].key);
}
}
return _f;
},clear:function(_10){
if(this.isValidKey(_10)==false){
throw new Error("Invalid namespace given: "+_10);
}
this._sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = :namespace",{":namespace":_10});
},remove:function(key,_11){
_11=_11||this.DEFAULT_NAMESPACE;
this._sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = :namespace AND key = :key",{":namespace":_11,":key":key});
},putMultiple:function(_12,_13,_14,_15){
if(this.isValidKeyArray(_12)===false||!_13 instanceof Array||_12.length!=_13.length){
throw new Error("Invalid arguments: keys = ["+_12+"], values = ["+_13+"]");
}
if(_15==null||typeof _15=="undefined"){
_15=this.DEFAULT_NAMESPACE;
}
if(this.isValidKey(_15)==false){
throw new Error("Invalid namespace given: "+_15);
}
this._statusHandler=_14;
try{
this._beginTransaction();
for(var i=0;i<_12.length;i++){
this._sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = :namespace AND key = :key",{":namespace":_15,":key":_12[i]});
this._sql("INSERT INTO "+this.TABLE_NAME+" VALUES (:namespace, :key, :value)",{":namespace":_15,":key":_12[i],":value":_13[i]});
}
this._commitTransaction();
}
catch(e){
if(_14){
_14(this.FAILED,_12,e.toString(),_15);
}
return;
}
if(_14){
_14(this.SUCCESS,_12,null);
}
},getMultiple:function(_16,_17){
if(this.isValidKeyArray(_16)===false){
throw new Error("Invalid key array given: "+_16);
}
if(_17==null||typeof _17=="undefined"){
_17=this.DEFAULT_NAMESPACE;
}
if(this.isValidKey(_17)==false){
throw new Error("Invalid namespace given: "+_17);
}
var _18=[];
for(var i=0;i<_16.length;i++){
var _19=this._sql("SELECT * FROM "+this.TABLE_NAME+" WHERE namespace = :namespace AND key = :key",{":namespace":_17,":key":_16[i]});
_18[i]=_19.data&&_19.data.length?_19.data[0].value:null;
}
return _18;
},removeMultiple:function(_1a,_1b){
_1b=_1b||this.DEFAULT_NAMESPACE;
this._beginTransaction();
for(var i=0;i<_1a.length;i++){
this._sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = namespace = :namespace AND key = :key",{":namespace":_1b,":key":_1a[i]});
}
this._commitTransaction();
},isPermanent:function(){
return true;
},getMaximumSize:function(){
return this.SIZE_NO_LIMIT;
},hasSettingsUI:function(){
return false;
},showSettingsUI:function(){
throw new Error(this.declaredClass+" does not support a storage settings user-interface");
},hideSettingsUI:function(){
throw new Error(this.declaredClass+" does not support a storage settings user-interface");
}});
dojox.storage.manager.register("dojox.storage.AirDBStorageProvider",new dojox.storage.AirDBStorageProvider());
dojox.storage.manager.initialize();
})();
}
}
