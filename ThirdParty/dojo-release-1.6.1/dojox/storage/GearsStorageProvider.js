/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.GearsStorageProvider"]){
dojo._hasResource["dojox.storage.GearsStorageProvider"]=true;
dojo.provide("dojox.storage.GearsStorageProvider");
dojo.require("dojo.gears");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.sql");
if(dojo.gears.available){
(function(){
dojo.declare("dojox.storage.GearsStorageProvider",dojox.storage.Provider,{constructor:function(){
},TABLE_NAME:"__DOJO_STORAGE",initialized:false,_available:null,_storageReady:false,initialize:function(){
if(dojo.config["disableGearsStorage"]==true){
return;
}
this.TABLE_NAME="__DOJO_STORAGE";
this.initialized=true;
dojox.storage.manager.loaded();
},isAvailable:function(){
return this._available=dojo.gears.available;
},put:function(_1,_2,_3,_4){
this._initStorage();
if(!this.isValidKey(_1)){
throw new Error("Invalid key given: "+_1);
}
_4=_4||this.DEFAULT_NAMESPACE;
if(!this.isValidKey(_4)){
throw new Error("Invalid namespace given: "+_1);
}
if(dojo.isString(_2)){
_2="string:"+_2;
}else{
_2=dojo.toJson(_2);
}
try{
dojox.sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = ? AND key = ?",_4,_1);
dojox.sql("INSERT INTO "+this.TABLE_NAME+" VALUES (?, ?, ?)",_4,_1,_2);
}
catch(e){
_3(this.FAILED,_1,e.toString(),_4);
return;
}
if(_3){
_3(dojox.storage.SUCCESS,_1,null,_4);
}
},get:function(_5,_6){
this._initStorage();
if(!this.isValidKey(_5)){
throw new Error("Invalid key given: "+_5);
}
_6=_6||this.DEFAULT_NAMESPACE;
if(!this.isValidKey(_6)){
throw new Error("Invalid namespace given: "+_5);
}
var _7=dojox.sql("SELECT * FROM "+this.TABLE_NAME+" WHERE namespace = ? AND "+" key = ?",_6,_5);
if(!_7.length){
return null;
}else{
_7=_7[0].value;
}
if(dojo.isString(_7)&&(/^string:/.test(_7))){
_7=_7.substring("string:".length);
}else{
_7=dojo.fromJson(_7);
}
return _7;
},getNamespaces:function(){
this._initStorage();
var _8=[dojox.storage.DEFAULT_NAMESPACE];
var rs=dojox.sql("SELECT namespace FROM "+this.TABLE_NAME+" DESC GROUP BY namespace");
for(var i=0;i<rs.length;i++){
if(rs[i].namespace!=dojox.storage.DEFAULT_NAMESPACE){
_8.push(rs[i].namespace);
}
}
return _8;
},getKeys:function(_9){
this._initStorage();
_9=_9||this.DEFAULT_NAMESPACE;
if(!this.isValidKey(_9)){
throw new Error("Invalid namespace given: "+_9);
}
var rs=dojox.sql("SELECT key FROM "+this.TABLE_NAME+" WHERE namespace = ?",_9);
var _a=[];
for(var i=0;i<rs.length;i++){
_a.push(rs[i].key);
}
return _a;
},clear:function(_b){
this._initStorage();
_b=_b||this.DEFAULT_NAMESPACE;
if(!this.isValidKey(_b)){
throw new Error("Invalid namespace given: "+_b);
}
dojox.sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = ?",_b);
},remove:function(_c,_d){
this._initStorage();
if(!this.isValidKey(_c)){
throw new Error("Invalid key given: "+_c);
}
_d=_d||this.DEFAULT_NAMESPACE;
if(!this.isValidKey(_d)){
throw new Error("Invalid namespace given: "+_c);
}
dojox.sql("DELETE FROM "+this.TABLE_NAME+" WHERE namespace = ? AND"+" key = ?",_d,_c);
},putMultiple:function(_e,_f,_10,_11){
this._initStorage();
if(!this.isValidKeyArray(_e)||!_f instanceof Array||_e.length!=_f.length){
throw new Error("Invalid arguments: keys = ["+_e+"], values = ["+_f+"]");
}
if(_11==null||typeof _11=="undefined"){
_11=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_11)){
throw new Error("Invalid namespace given: "+_11);
}
this._statusHandler=_10;
try{
dojox.sql.open();
dojox.sql.db.execute("BEGIN TRANSACTION");
var _12="REPLACE INTO "+this.TABLE_NAME+" VALUES (?, ?, ?)";
for(var i=0;i<_e.length;i++){
var _13=_f[i];
if(dojo.isString(_13)){
_13="string:"+_13;
}else{
_13=dojo.toJson(_13);
}
dojox.sql.db.execute(_12,[_11,_e[i],_13]);
}
dojox.sql.db.execute("COMMIT TRANSACTION");
dojox.sql.close();
}
catch(e){
if(_10){
_10(this.FAILED,_e,e.toString(),_11);
}
return;
}
if(_10){
_10(dojox.storage.SUCCESS,_e,null,_11);
}
},getMultiple:function(_14,_15){
this._initStorage();
if(!this.isValidKeyArray(_14)){
throw new ("Invalid key array given: "+_14);
}
if(_15==null||typeof _15=="undefined"){
_15=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_15)){
throw new Error("Invalid namespace given: "+_15);
}
var _16="SELECT * FROM "+this.TABLE_NAME+" WHERE namespace = ? AND "+" key = ?";
var _17=[];
for(var i=0;i<_14.length;i++){
var _18=dojox.sql(_16,_15,_14[i]);
if(!_18.length){
_17[i]=null;
}else{
_18=_18[0].value;
if(dojo.isString(_18)&&(/^string:/.test(_18))){
_17[i]=_18.substring("string:".length);
}else{
_17[i]=dojo.fromJson(_18);
}
}
}
return _17;
},removeMultiple:function(_19,_1a){
this._initStorage();
if(!this.isValidKeyArray(_19)){
throw new Error("Invalid arguments: keys = ["+_19+"]");
}
if(_1a==null||typeof _1a=="undefined"){
_1a=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_1a)){
throw new Error("Invalid namespace given: "+_1a);
}
dojox.sql.open();
dojox.sql.db.execute("BEGIN TRANSACTION");
var _1b="DELETE FROM "+this.TABLE_NAME+" WHERE namespace = ? AND key = ?";
for(var i=0;i<_19.length;i++){
dojox.sql.db.execute(_1b,[_1a,_19[i]]);
}
dojox.sql.db.execute("COMMIT TRANSACTION");
dojox.sql.close();
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
},_initStorage:function(){
if(this._storageReady){
return;
}
if(!google.gears.factory.hasPermission){
var _1c=null;
var _1d=null;
var msg="This site would like to use Google Gears to enable "+"enhanced functionality.";
var _1e=google.gears.factory.getPermission(_1c,_1d,msg);
if(!_1e){
throw new Error("You must give permission to use Gears in order to "+"store data");
}
}
try{
dojox.sql("CREATE TABLE IF NOT EXISTS "+this.TABLE_NAME+"( "+" namespace TEXT, "+" key TEXT, "+" value TEXT "+")");
dojox.sql("CREATE UNIQUE INDEX IF NOT EXISTS namespace_key_index"+" ON "+this.TABLE_NAME+" (namespace, key)");
}
catch(e){
throw new Error("Unable to create storage tables for Gears in "+"Dojo Storage");
}
this._storageReady=true;
}});
dojox.storage.manager.register("dojox.storage.GearsStorageProvider",new dojox.storage.GearsStorageProvider());
})();
}
}
