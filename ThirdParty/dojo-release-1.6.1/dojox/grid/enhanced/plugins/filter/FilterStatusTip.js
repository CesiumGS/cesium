/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterStatusTip"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterStatusTip"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter.FilterStatusTip");
dojo.requireLocalization("dojox.grid.enhanced","Filter",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hr,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit._base.popup");
dojo.require("dijit.form.Button");
dojo.require("dojo.string");
dojo.require("dojo.date.locale");
(function(){
var _1="",_2="",_3="",_4="",_5="dojoxGridFStatusTipOddRow",_6="dojoxGridFStatusTipHandle",_7="dojoxGridFStatusTipCondition",_8="dojoxGridFStatusTipDelRuleBtnIcon",_9="</tbody></table>";
dojo.declare("dojox.grid.enhanced.plugins.filter.FilterStatusTip",null,{constructor:function(_a){
var _b=this.plugin=_a.plugin;
this._statusHeader=["<table border='0' cellspacing='0' class='",_1,"'><thead><tr class='",_2,"'><th class='",_3,"'><div>",_b.nls["statusTipHeaderColumn"],"</div></th><th class='",_3," lastColumn'><div>",_b.nls["statusTipHeaderCondition"],"</div></th></tr></thead><tbody>"].join("");
this._removedCriterias=[];
this._rules=[];
this.statusPane=new dojox.grid.enhanced.plugins.filter.FilterStatusPane();
this._dlg=new dijit.TooltipDialog({"class":"dojoxGridFStatusTipDialog",content:this.statusPane,autofocus:false,onMouseLeave:dojo.hitch(this,function(){
this.closeDialog();
})});
this._dlg.connect(this._dlg.domNode,"click",dojo.hitch(this,this._modifyFilter));
},destroy:function(){
this._dlg.destroyRecursive();
},showDialog:function(_c,_d,_e){
this._pos={x:_c,y:_d};
dijit.popup.close(this._dlg);
this._removedCriterias=[];
this._rules=[];
this._updateStatus(_e);
dijit.popup.open({popup:this._dlg,parent:this.plugin.filterBar,x:_c-12,y:_d-3});
},closeDialog:function(){
dijit.popup.close(this._dlg);
if(this._removedCriterias.length){
this.plugin.filterDefDialog.removeCriteriaBoxes(this._removedCriterias);
this._removedCriterias=[];
this.plugin.filterDefDialog.onFilter();
}
},_updateStatus:function(_f){
var res,p=this.plugin,nls=p.nls,sp=this.statusPane,fdg=p.filterDefDialog;
if(fdg.getCriteria()===0){
sp.statusTitle.innerHTML=nls["statusTipTitleNoFilter"];
sp.statusRel.innerHTML=sp.statusRelPre.innerHTML=sp.statusRelPost.innerHTML="";
var _10=p.grid.layout.cells[_f];
var _11=_10?"'"+(_10.name||_10.field)+"'":nls["anycolumn"];
res=dojo.string.substitute(nls["statusTipMsg"],[_11]);
}else{
sp.statusTitle.innerHTML=nls["statusTipTitleHasFilter"];
sp.statusRelPre.innerHTML=nls["statusTipRelPre"]+"&nbsp;";
sp.statusRelPost.innerHTML="&nbsp;"+nls["statusTipRelPost"];
sp.statusRel.innerHTML=fdg._relOpCls=="logicall"?nls["all"]:nls["any"];
this._rules=[];
var i=0,c=fdg.getCriteria(i++);
while(c){
c.index=i-1;
this._rules.push(c);
c=fdg.getCriteria(i++);
}
res=this._createStatusDetail();
}
sp.statusDetailNode.innerHTML=res;
this._addButtonForRules();
},_createStatusDetail:function(){
return this._statusHeader+dojo.map(this._rules,function(_12,i){
return this._getCriteriaStr(_12,i);
},this).join("")+_9;
},_addButtonForRules:function(){
if(this._rules.length>1){
dojo.query("."+_6,this.statusPane.statusDetailNode).forEach(dojo.hitch(this,function(nd,idx){
(new dijit.form.Button({label:this.plugin.nls["removeRuleButton"],showLabel:false,iconClass:_8,onClick:dojo.hitch(this,function(e){
e.stopPropagation();
this._removedCriterias.push(this._rules[idx].index);
this._rules.splice(idx,1);
this.statusPane.statusDetailNode.innerHTML=this._createStatusDetail();
this._addButtonForRules();
})})).placeAt(nd,"last");
}));
}
},_getCriteriaStr:function(c,_13){
var res=["<tr class='",_4," ",(_13%2?_5:""),"'><td class='",_3,"'>",c.colTxt,"</td><td class='",_3,"'><div class='",_6,"'><span class='",_7,"'>",c.condTxt,"&nbsp;</span>",c.formattedVal,"</div></td></tr>"];
return res.join("");
},_modifyFilter:function(){
this.closeDialog();
var p=this.plugin;
p.filterDefDialog.showDialog(p.filterBar.getColumnIdx(this._pos.x));
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.FilterStatusPane",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.grid","enhanced/templates/FilterStatusPane.html","<div class=\"dojoxGridFStatusTip\">\n\t<div class=\"dojoxGridFStatusTipHead\">\n\t\t<span class=\"dojoxGridFStatusTipTitle\" dojoAttachPoint=\"statusTitle\"></span\n\t\t><span class=\"dojoxGridFStatusTipRelPre\" dojoAttachPoint=\"statusRelPre\"></span\n\t\t><span class=\"dojoxGridFStatusTipRel\" dojoAttachPoint=\"statusRel\"></span\n\t\t><span class=\"dojoxGridFStatusTipRelPost\" dojoAttachPoint=\"statusRelPost\"></span>\n\t</div>\n\t<div class=\"dojoxGridFStatusTipDetail\" dojoAttachPoint=\"statusDetailNode\"></div>\n</div>\n")});
})();
}
