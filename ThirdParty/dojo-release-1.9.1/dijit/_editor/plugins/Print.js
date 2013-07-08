//>>built
define("dijit/_editor/plugins/Print",["dojo/_base/declare","dojo/i18n","dojo/_base/lang","dojo/sniff","../../focus","../_Plugin","../../form/Button","dojo/i18n!../nls/commands"],function(_1,_2,_3,_4,_5,_6,_7){
var _8=_1("dijit._editor.plugins.Print",_6,{_initButton:function(){
var _9=_2.getLocalization("dijit._editor","commands"),_a=this.editor;
this.button=new _7({label:_9["print"],ownerDocument:_a.ownerDocument,dir:_a.dir,lang:_a.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"Print",tabIndex:"-1",onClick:_3.hitch(this,"_print")});
},setEditor:function(_b){
this.editor=_b;
this._initButton();
this.editor.onLoadDeferred.then(_3.hitch(this,function(){
if(!this.editor.iframe.contentWindow["print"]){
this.button.set("disabled",true);
}
}));
},updateState:function(){
var _c=this.get("disabled");
if(!this.editor.iframe.contentWindow["print"]){
_c=true;
}
this.button.set("disabled",_c);
},_print:function(){
var _d=this.editor.iframe;
if(_d.contentWindow["print"]){
if(!_4("opera")&&!_4("chrome")){
_5.focus(_d);
_d.contentWindow.print();
}else{
var _e=this.editor.document;
var _f=this.editor.get("value");
_f="<html><head><meta http-equiv='Content-Type' "+"content='text/html; charset='UTF-8'></head><body>"+_f+"</body></html>";
var win=window.open("javascript: ''","","status=0,menubar=0,location=0,toolbar=0,"+"width=1,height=1,resizable=0,scrollbars=0");
win.document.open();
win.document.write(_f);
win.document.close();
var _10=_e.getElementsByTagName("style");
if(_10){
var i;
for(i=0;i<_10.length;i++){
var _11=_10[i].innerHTML;
var _12=win.document.createElement("style");
_12.appendChild(win.document.createTextNode(_11));
win.document.getElementsByTagName("head")[0].appendChild(_12);
}
}
win.print();
win.close();
}
}
}});
_6.registry["print"]=function(){
return new _8({command:"print"});
};
return _8;
});
