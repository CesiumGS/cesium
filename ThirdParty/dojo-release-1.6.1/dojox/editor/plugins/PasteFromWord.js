/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.PasteFromWord"]){
dojo._hasResource["dojox.editor.plugins.PasteFromWord"]=true;
dojo.provide("dojox.editor.plugins.PasteFromWord");
dojo.require("dojo.string");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dijit.Dialog");
dojo.require("dojo.i18n");
dojo.require("dojox.html.format");
dojo.requireLocalization("dojox.editor.plugins","PasteFromWord",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.PasteFromWord",dijit._editor._Plugin,{iconClassPrefix:"dijitAdditionalEditorIcon",width:"400px",height:"300px",_template:["<div class='dijitPasteFromWordEmbeddedRTE'>","<div style='width: ${width}; padding-top: 5px; padding-bottom: 5px;'>${instructions}</div>","<div id='${uId}_rte' style='width: ${width}; height: ${height}'></div>","<table style='width: ${width}' tabindex='-1'>","<tbody>","<tr>","<td align='center'>","<button type='button' dojoType='dijit.form.Button' id='${uId}_paste'>${paste}</button>","&nbsp;","<button type='button' dojoType='dijit.form.Button' id='${uId}_cancel'>${cancel}</button>","</td>","</tr>","</tbody>","</table>","</div>"].join(""),_filters:[{regexp:/(<meta\s*[^>]*\s*>)|(<\s*link\s* href="file:[^>]*\s*>)|(<\/?\s*\w+:[^>]*\s*>)/gi,handler:""},{regexp:/(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi,handler:""},{regexp:/(class="Mso[^"]*")|(<!--(.|\s){1,}?-->)/gi,handler:""},{regexp:/(<p[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/p[^>]*>)|(<p[^>]*>\s*<font[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/\s*font\s*>\s<\/p[^>]*>)/ig,handler:""},{regexp:/(style="[^"]*mso-[^;][^"]*")|(style="margin:\s*[^;"]*;")/gi,handler:""},{regexp:/(<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>)|(<\s*script\b([^<>]|\s)*>?)|(<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>)/ig,handler:""}],_initButton:function(){
var _1=dojo.i18n.getLocalization("dojox.editor.plugins","PasteFromWord");
this.button=new dijit.form.Button({label:_1["pasteFromWord"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"PasteFromWord",tabIndex:"-1",onClick:dojo.hitch(this,"_openDialog")});
this._uId=dijit.getUniqueId(this.editor.id);
_1.uId=this._uId;
_1.width=this.width||"400px";
_1.height=this.height||"300px";
this._dialog=new dijit.Dialog({title:_1["pasteFromWord"]}).placeAt(dojo.body());
this._dialog.set("content",dojo.string.substitute(this._template,_1));
dojo.style(dojo.byId(this._uId+"_rte"),"opacity",0.001);
this.connect(dijit.byId(this._uId+"_paste"),"onClick","_paste");
this.connect(dijit.byId(this._uId+"_cancel"),"onClick","_cancel");
this.connect(this._dialog,"onHide","_clearDialog");
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},setEditor:function(_2){
this.editor=_2;
this._initButton();
},_openDialog:function(){
this._dialog.show();
if(!this._rte){
setTimeout(dojo.hitch(this,function(){
this._rte=new dijit._editor.RichText({height:this.height||"300px"},this._uId+"_rte");
this._rte.onLoadDeferred.addCallback(dojo.hitch(this,function(){
dojo.animateProperty({node:this._rte.domNode,properties:{opacity:{start:0.001,end:1}}}).play();
}));
}),100);
}
},_paste:function(){
var _3=dojox.html.format.prettyPrint(this._rte.get("value"));
this._dialog.hide();
var i;
for(i=0;i<this._filters.length;i++){
var _4=this._filters[i];
_3=_3.replace(_4.regexp,_4.handler);
}
_3=dojox.html.format.prettyPrint(_3);
this.editor.execCommand("inserthtml",_3);
},_cancel:function(){
this._dialog.hide();
},_clearDialog:function(){
this._rte.set("value","");
},destroy:function(){
if(this._rte){
this._rte.destroy();
}
if(this._dialog){
this._dialog.destroyRecursive();
}
delete this._dialog;
delete this._rte;
this.inherited(arguments);
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _5=o.args.name.toLowerCase();
if(_5==="pastefromword"){
o.plugin=new dojox.editor.plugins.PasteFromWord({width:("width" in o.args)?o.args.width:"400px",height:("height" in o.args)?o.args.width:"300px"});
}
});
}
