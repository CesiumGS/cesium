//>>built
define("dijit/_editor/plugins/NewPage",["dojo/_base/declare","dojo/i18n","dojo/_base/lang","../_Plugin","../../form/Button","dojo/i18n!../nls/commands"],function(_1,_2,_3,_4,_5){
var _6=_1("dijit._editor.plugins.NewPage",_4,{content:"<br>",_initButton:function(){
var _7=_2.getLocalization("dijit._editor","commands"),_8=this.editor;
this.button=new _5({label:_7["newPage"],ownerDocument:_8.ownerDocument,dir:_8.dir,lang:_8.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"NewPage",tabIndex:"-1",onClick:_3.hitch(this,"_newPage")});
},setEditor:function(_9){
this.editor=_9;
this._initButton();
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},_newPage:function(){
this.editor.beginEditing();
this.editor.set("value",this.content);
this.editor.endEditing();
this.editor.focus();
}});
_4.registry["newPage"]=_4.registry["newpage"]=function(_a){
return new _6({content:("content" in _a)?_a.content:"<br>"});
};
return _6;
});
