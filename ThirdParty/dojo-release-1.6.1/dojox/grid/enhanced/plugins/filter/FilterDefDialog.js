/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterDefDialog"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterDefDialog"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter.FilterDefDialog");
dojo.require("dijit.dijit");
dojo.require("dijit.Tooltip");
dojo.require("dojox.grid.enhanced.plugins.Dialog");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.TimeTextBox");
dojo.require("dijit.form.Button");
dojo.require("dijit.layout.AccordionContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojo.date.locale");
dojo.require("dojo.string");
dojo.require("dojox.grid.enhanced.plugins.filter.FilterBuilder");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojox.html.ellipsis");
dojo.require("dojox.html.metrics");
dojo.require("dojo.window");
(function(){
var _1=dojox.grid.enhanced.plugins.filter,_2={relSelect:60,accordionTitle:70,removeCBoxBtn:-1,colSelect:90,condSelect:95,valueBox:10,addCBoxBtn:20,filterBtn:30,clearBtn:40,cancelBtn:50};
dojo.declare("dojox.grid.enhanced.plugins.filter.FilterDefDialog",null,{curColIdx:-1,_relOpCls:"logicall",_savedCriterias:null,plugin:null,constructor:function(_3){
var _4=this.plugin=_3.plugin;
this.builder=new _1.FilterBuilder();
this._setupData();
this._cboxes=[];
this.defaultType=_4.args.defaultType||"string";
(this.filterDefPane=new _1.FilterDefPane({"dlg":this})).startup();
(this._defPane=new dojox.grid.enhanced.plugins.Dialog({"refNode":this.plugin.grid.domNode,"title":_4.nls.filterDefDialogTitle,"class":"dojoxGridFDTitlePane","iconClass":"dojoxGridFDPaneIcon","content":this.filterDefPane})).startup();
this._defPane.connect(_4.grid.layer("filter"),"filterDef",dojo.hitch(this,"_onSetFilter"));
_4.grid.setFilter=dojo.hitch(this,"setFilter");
_4.grid.getFilter=dojo.hitch(this,"getFilter");
_4.grid.getFilterRelation=dojo.hitch(this,function(){
return this._relOpCls;
});
_4.connect(_4.grid.layout,"moveColumn",dojo.hitch(this,"onMoveColumn"));
},onMoveColumn:function(_5,_6,_7,_8,_9){
if(this._savedCriterias&&_7!=_8){
if(_9){
--_8;
}
var _a=_7<_8?_7:_8;
var _b=_7<_8?_8:_7;
var _c=_8>_a?1:-1;
dojo.forEach(this._savedCriterias,function(sc){
var _d=parseInt(sc.column,10);
if(!isNaN(_d)&&_d>=_a&&_d<=_b){
sc.column=String(_d==_7?_d+(_b-_a)*_c:_d-_c);
}
});
}
},destroy:function(){
this._defPane.destroyRecursive();
this._defPane=null;
this.filterDefPane=null;
this.builder=null;
this._dataTypeMap=null;
this._cboxes=null;
var g=this.plugin.grid;
g.setFilter=null;
g.getFilter=null;
g.getFilterRelation=null;
this.plugin=null;
},_setupData:function(){
var _e=this.plugin.nls;
this._dataTypeMap={"number":{valueBoxCls:{dft:dijit.form.NumberTextBox},conditions:[{label:_e.conditionEqual,value:"equalto",selected:true},{label:_e.conditionNotEqual,value:"notequalto"},{label:_e.conditionLess,value:"lessthan"},{label:_e.conditionLessEqual,value:"lessthanorequalto"},{label:_e.conditionLarger,value:"largerthan"},{label:_e.conditionLargerEqual,value:"largerthanorequalto"},{label:_e.conditionIsEmpty,value:"isempty"}]},"string":{valueBoxCls:{dft:dijit.form.TextBox,ac:_1.UniqueComboBox},conditions:[{label:_e.conditionContains,value:"contains",selected:true},{label:_e.conditionIs,value:"equalto"},{label:_e.conditionStartsWith,value:"startswith"},{label:_e.conditionEndWith,value:"endswith"},{label:_e.conditionNotContain,value:"notcontains"},{label:_e.conditionIsNot,value:"notequalto"},{label:_e.conditionNotStartWith,value:"notstartswith"},{label:_e.conditionNotEndWith,value:"notendswith"},{label:_e.conditionIsEmpty,value:"isempty"}]},"date":{valueBoxCls:{dft:dijit.form.DateTextBox},conditions:[{label:_e.conditionIs,value:"equalto",selected:true},{label:_e.conditionBefore,value:"lessthan"},{label:_e.conditionAfter,value:"largerthan"},{label:_e.conditionRange,value:"range"},{label:_e.conditionIsEmpty,value:"isempty"}]},"time":{valueBoxCls:{dft:dijit.form.TimeTextBox},conditions:[{label:_e.conditionIs,value:"equalto",selected:true},{label:_e.conditionBefore,value:"lessthan"},{label:_e.conditionAfter,value:"largerthan"},{label:_e.conditionRange,value:"range"},{label:_e.conditionIsEmpty,value:"isempty"}]},"boolean":{valueBoxCls:{dft:_1.BooleanValueBox},conditions:[{label:_e.conditionIs,value:"equalto",selected:true},{label:_e.conditionIsEmpty,value:"isempty"}]}};
},setFilter:function(_f,_10){
_f=_f||[];
if(!dojo.isArray(_f)){
_f=[_f];
}
var _11=function(){
if(_f.length){
this._savedCriterias=dojo.map(_f,function(_12){
var _13=_12.type||this.defaultType;
return {"type":_13,"column":String(_12.column),"condition":_12.condition,"value":_12.value,"colTxt":this.getColumnLabelByValue(String(_12.column)),"condTxt":this.getConditionLabelByValue(_13,_12.condition),"formattedVal":_12.formattedVal||_12.value};
},this);
this._criteriasChanged=true;
if(_10==="logicall"||_10==="logicany"){
this._relOpCls=_10;
}
var _14=dojo.map(_f,this.getExprForCriteria,this);
_14=this.builder.buildExpression(_14.length==1?_14[0]:{"op":this._relOpCls,"data":_14});
this.plugin.grid.layer("filter").filterDef(_14);
this.plugin.filterBar.toggleClearFilterBtn(false);
}
this._closeDlgAndUpdateGrid();
};
if(this._savedCriterias){
this._clearWithoutRefresh=true;
var _15=dojo.connect(this,"clearFilter",this,function(){
dojo.disconnect(_15);
this._clearWithoutRefresh=false;
_11.apply(this);
});
this.onClearFilter();
}else{
_11.apply(this);
}
},getFilter:function(){
return dojo.clone(this._savedCriterias)||[];
},getColumnLabelByValue:function(v){
var nls=this.plugin.nls;
if(v.toLowerCase()=="anycolumn"){
return nls["anyColumnOption"];
}else{
var _16=this.plugin.grid.layout.cells[parseInt(v,10)];
return _16?(_16.name||_16.field):"";
}
},getConditionLabelByValue:function(_17,c){
var _18=this._dataTypeMap[_17].conditions;
for(var i=_18.length-1;i>=0;--i){
var _19=_18[i];
if(_19.value==c.toLowerCase()){
return _19.label;
}
}
return "";
},addCriteriaBoxes:function(cnt){
if(typeof cnt!="number"||cnt<=0){
return;
}
var cbs=this._cboxes,cc=this.filterDefPane.cboxContainer,_1a=this.plugin.args.ruleCount,len=cbs.length,_1b;
if(_1a>0&&len+cnt>_1a){
cnt=_1a-len;
}
for(;cnt>0;--cnt){
_1b=new _1.CriteriaBox({dlg:this});
cbs.push(_1b);
cc.addChild(_1b);
}
cc.startup();
this._updatePane();
this._updateCBoxTitles();
cc.selectChild(cbs[cbs.length-1]);
this.filterDefPane.criteriaPane.scrollTop=1000000;
if(cbs.length===4){
if(dojo.isIE<=6&&!this.__alreadyResizedForIE6){
var _1c=dojo.position(cc.domNode);
_1c.w-=dojox.html.metrics.getScrollbar().w;
cc.resize(_1c);
this.__alreadyResizedForIE6=true;
}else{
cc.resize();
}
}
},removeCriteriaBoxes:function(cnt,_1d){
var cbs=this._cboxes,cc=this.filterDefPane.cboxContainer,len=cbs.length,_1e=len-cnt,end=len-1,_1f,_20=dojo.indexOf(cbs,cc.selectedChildWidget.content);
if(dojo.isArray(cnt)){
var i,_21=cnt;
_21.sort();
cnt=_21.length;
for(i=len-1;i>=0&&dojo.indexOf(_21,i)>=0;--i){
}
if(i>=0){
if(i!=_20){
cc.selectChild(cbs[i]);
}
for(i=cnt-1;i>=0;--i){
if(_21[i]>=0&&_21[i]<len){
cc.removeChild(cbs[_21[i]]);
cbs.splice(_21[i],1);
}
}
}
_1e=cbs.length;
}else{
if(_1d===true){
if(cnt>=0&&cnt<len){
_1e=end=cnt;
cnt=1;
}else{
return;
}
}else{
if(cnt instanceof _1.CriteriaBox){
_1f=cnt;
cnt=1;
_1e=end=dojo.indexOf(cbs,_1f);
}else{
if(typeof cnt!="number"||cnt<=0){
return;
}else{
if(cnt>=len){
cnt=end;
_1e=1;
}
}
}
}
if(end<_1e){
return;
}
if(_20>=_1e&&_20<=end){
cc.selectChild(cbs[_1e?_1e-1:end+1]);
}
for(;end>=_1e;--end){
cc.removeChild(cbs[end]);
}
cbs.splice(_1e,cnt);
}
this._updatePane();
this._updateCBoxTitles();
if(cbs.length===3){
cc.resize();
}
},getCriteria:function(idx){
if(typeof idx!="number"){
return this._savedCriterias?this._savedCriterias.length:0;
}
if(this._savedCriterias&&this._savedCriterias[idx]){
return dojo.mixin({relation:this._relOpCls=="logicall"?this.plugin.nls.and:this.plugin.nls.or},this._savedCriterias[idx]);
}
return null;
},getExprForCriteria:function(_22){
if(_22.column=="anycolumn"){
var _23=dojo.filter(this.plugin.grid.layout.cells,function(_24){
return !(_24.filterable===false||_24.hidden);
});
return {"op":"logicany","data":dojo.map(_23,function(_25){
return this.getExprForColumn(_22.value,_25.index,_22.type,_22.condition);
},this)};
}else{
return this.getExprForColumn(_22.value,_22.column,_22.type,_22.condition);
}
},getExprForColumn:function(_26,_27,_28,_29){
_27=parseInt(_27,10);
var _2a=this.plugin.grid.layout.cells[_27],_2b=_2a.field||_2a.name,obj={"datatype":_28||this.getColumnType(_27),"args":_2a.dataTypeArgs,"isColumn":true},_2c=[dojo.mixin({"data":this.plugin.args.isServerSide?_2b:_2a},obj)];
obj.isColumn=false;
if(_29=="range"){
_2c.push(dojo.mixin({"data":_26.start},obj),dojo.mixin({"data":_26.end},obj));
}else{
if(_29!="isempty"){
_2c.push(dojo.mixin({"data":_26},obj));
}
}
return {"op":_29,"data":_2c};
},getColumnType:function(_2d){
var _2e=this.plugin.grid.layout.cells[parseInt(_2d,10)];
if(!_2e||!_2e.datatype){
return this.defaultType;
}
var _2f=String(_2e.datatype).toLowerCase();
return this._dataTypeMap[_2f]?_2f:this.defaultType;
},clearFilter:function(_30){
if(!this._savedCriterias){
return;
}
this._savedCriterias=null;
this.plugin.grid.layer("filter").filterDef(null);
try{
this.plugin.filterBar.toggleClearFilterBtn(true);
this.filterDefPane._clearFilterBtn.set("disabled",true);
this.removeCriteriaBoxes(this._cboxes.length-1);
this._cboxes[0].load({});
}
catch(e){
}
if(_30){
this.closeDialog();
}else{
this._closeDlgAndUpdateGrid();
}
},showDialog:function(_31){
this._defPane.show();
this.plugin.filterStatusTip.closeDialog();
this._prepareDialog(_31);
},closeDialog:function(){
this._defPane.hide();
},onFilter:function(e){
if(this.canFilter()){
this._defineFilter();
this._closeDlgAndUpdateGrid();
this.plugin.filterBar.toggleClearFilterBtn(false);
}
},onClearFilter:function(e){
if(this._savedCriterias){
if(this._savedCriterias.length>1){
this.plugin.clearFilterDialog.show();
}else{
this.clearFilter(this._clearWithoutRefresh);
}
}
},onCancel:function(e){
var sc=this._savedCriterias;
var cbs=this._cboxes;
if(sc){
this.addCriteriaBoxes(sc.length-cbs.length);
this.removeCriteriaBoxes(cbs.length-sc.length);
dojo.forEach(sc,function(c,i){
cbs[i].load(c);
});
}else{
this.removeCriteriaBoxes(cbs.length-1);
cbs[0].load({});
}
this.closeDialog();
},onRendered:function(_32){
if(!dojo.isFF){
var _33=dijit._getTabNavigable(dojo.byId(_32.domNode));
dijit.focus(_33.lowest||_33.first);
}else{
var dp=this._defPane;
dp._getFocusItems(dp.domNode);
dijit.focus(dp._firstFocusItem);
}
},_onSetFilter:function(_34){
if(_34===null&&this._savedCriterias){
this.clearFilter();
}
},_prepareDialog:function(_35){
var sc=this._savedCriterias,cbs=this._cboxes,i,_36;
this.curColIdx=_35;
if(!sc){
if(cbs.length===0){
this.addCriteriaBoxes(1);
}else{
for(i=0;(_36=cbs[i]);++i){
_36.changeCurrentColumn();
}
}
}else{
if(this._criteriasChanged){
this.filterDefPane._relSelect.set("value",this._relOpCls==="logicall"?"0":"1");
this._criteriasChanged=false;
var _37=sc.length>cbs.length;
this.addCriteriaBoxes(sc.length-cbs.length);
this.removeCriteriaBoxes(cbs.length-sc.length);
this.filterDefPane._clearFilterBtn.set("disabled",false);
if(_37){
dojo.forEach(sc,function(c,i){
var _38=dojo.connect(this,"onRendered",function(_39){
if(_39==cbs[i]){
dojo.disconnect(_38);
_39.load(c);
}
});
},this);
}else{
for(i=0;i<sc.length;++i){
cbs[i].load(sc[i]);
}
}
}
}
this.filterDefPane.cboxContainer.resize();
},_defineFilter:function(){
var cbs=this._cboxes,_3a=function(_3b){
return dojo.filter(dojo.map(cbs,function(_3c){
return _3c[_3b]();
}),function(_3d){
return !!_3d;
});
},_3e=_3a("getExpr");
this._savedCriterias=_3a("save");
_3e=_3e.length==1?_3e[0]:{"op":this._relOpCls,"data":_3e};
_3e=this.builder.buildExpression(_3e);
this.plugin.grid.layer("filter").filterDef(_3e);
this.filterDefPane._clearFilterBtn.set("disabled",false);
},_updateCBoxTitles:function(){
for(var cbs=this._cboxes,i=cbs.length;i>0;--i){
cbs[i-1].updateRuleIndex(i);
cbs[i-1].setAriaInfo(i);
}
},_updatePane:function(){
var cbs=this._cboxes,_3f=this.filterDefPane;
_3f._addCBoxBtn.set("disabled",cbs.length==this.plugin.args.ruleCount);
_3f._filterBtn.set("disabled",!this.canFilter());
},canFilter:function(){
return dojo.filter(this._cboxes,function(_40){
return !_40.isEmpty();
}).length>0;
},_closeDlgAndUpdateGrid:function(){
this.closeDialog();
var g=this.plugin.grid;
g.showMessage(g.loadingMessage);
setTimeout(dojo.hitch(g,g._refresh),this._defPane.duration+10);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.FilterDefPane",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.grid","enhanced/templates/FilterDefPane.html","<div class=\"dojoxGridFDPane\">\n\t<div class=\"dojoxGridFDPaneRelation\">${_relMsgFront}\n\t<span class=\"dojoxGridFDPaneModes\" dojoAttachPoint=\"criteriaModeNode\">\n\t\t<select dojoAttachPoint=\"_relSelect\" dojoType=\"dijit.form.Select\" dojoAttachEvent=\"onChange: _onRelSelectChange\">\n\t\t\t<option value=\"0\">${_relAll}</option>\n\t\t\t<option value=\"1\">${_relAny}</option>\n\t\t</select>\n\t</span>\n\t${_relMsgTail}\n\t</div>\n\t<div dojoAttachPoint=\"criteriaPane\" class=\"dojoxGridFDPaneRulePane\"></div>\n\t<div dojoAttachPoint=\"_addCBoxBtn\" dojoType=\"dijit.form.Button\" \n\t\tclass=\"dojoxGridFDPaneAddCBoxBtn\" iconClass=\"dojoxGridFDPaneAddCBoxBtnIcon\"\n\t\tdojoAttachEvent=\"onClick:_onAddCBox\" label=\"${_addRuleBtnLabel}\" showLabel=\"false\">\n\t</div>\n\t<div class=\"dojoxGridFDPaneBtns\" dojoAttachPoint=\"buttonsPane\">\n\t\t<span dojoAttachPoint=\"_cancelBtn\" dojoType=\"dijit.form.Button\" \n\t\t\tdojoAttachEvent=\"onClick:_onCancel\" label=\"${_cancelBtnLabel}\">\n\t\t</span>\n\t\t<span dojoAttachPoint=\"_clearFilterBtn\" dojoType=\"dijit.form.Button\" \n\t\t\tdojoAttachEvent=\"onClick:_onClearFilter\" label=\"${_clearBtnLabel}\" disabled=\"true\">\n\t\t</span>\n\t\t<span dojoAttachPoint=\"_filterBtn\" dojoType=\"dijit.form.Button\" \n\t\t\tdojoAttachEvent=\"onClick:_onFilter\" label=\"${_filterBtnLabel}\" disabled=\"true\">\n\t\t</span>\n\t</div>\n</div>\n"),widgetsInTemplate:true,dlg:null,postMixInProperties:function(){
this.plugin=this.dlg.plugin;
var nls=this.plugin.nls;
this._addRuleBtnLabel=nls.addRuleButton;
this._cancelBtnLabel=nls.cancelButton;
this._clearBtnLabel=nls.clearButton;
this._filterBtnLabel=nls.filterButton;
this._relAll=nls.relationAll;
this._relAny=nls.relationAny;
this._relMsgFront=nls.relationMsgFront;
this._relMsgTail=nls.relationMsgTail;
},postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onkeypress","_onKey");
(this.cboxContainer=new _1.AccordionContainer({nls:this.plugin.nls})).placeAt(this.criteriaPane);
this._relSelect.set("tabIndex",_2.relSelect);
this._addCBoxBtn.set("tabIndex",_2.addCBoxBtn);
this._cancelBtn.set("tabIndex",_2.cancelBtn);
this._clearFilterBtn.set("tabIndex",_2.clearBtn);
this._filterBtn.set("tabIndex",_2.filterBtn);
var nls=this.plugin.nls;
dijit.setWaiState(this._relSelect.domNode,"label",nls.waiRelAll);
dijit.setWaiState(this._addCBoxBtn.domNode,"label",nls.waiAddRuleButton);
dijit.setWaiState(this._cancelBtn.domNode,"label",nls.waiCancelButton);
dijit.setWaiState(this._clearFilterBtn.domNode,"label",nls.waiClearButton);
dijit.setWaiState(this._filterBtn.domNode,"label",nls.waiFilterButton);
this._relSelect.set("value",this.dlg._relOpCls==="logicall"?"0":"1");
},uninitialize:function(){
this.cboxContainer.destroyRecursive();
this.plugin=null;
this.dlg=null;
},_onRelSelectChange:function(val){
this.dlg._relOpCls=val=="0"?"logicall":"logicany";
dijit.setWaiState(this._relSelect.domNode,"label",this.plugin.nls[val=="0"?"waiRelAll":"waiRelAny"]);
},_onAddCBox:function(){
this.dlg.addCriteriaBoxes(1);
},_onCancel:function(){
this.dlg.onCancel();
},_onClearFilter:function(){
this.dlg.onClearFilter();
},_onFilter:function(){
this.dlg.onFilter();
},_onKey:function(e){
if(e.keyCode==dojo.keys.ENTER){
this.dlg.onFilter();
}
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.CriteriaBox",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.grid","enhanced/templates/CriteriaBox.html","<div class=\"dojoxGridFCBox\">\n\t<div class=\"dojoxGridFCBoxSelCol\" dojoAttachPoint=\"selColNode\">\n\t\t<span class=\"dojoxGridFCBoxField\">${_colSelectLabel}</span>\n\t\t<select dojoAttachPoint=\"_colSelect\" dojoType=\"dijit.form.Select\" \n\t\t\tclass=\"dojoxGridFCBoxColSelect\"\n\t\t\tdojoAttachEvent=\"onChange:_onChangeColumn\">\n\t\t</select>\n\t</div>\n\t<div class=\"dojoxGridFCBoxCondition\" dojoAttachPoint=\"condNode\">\n\t\t<span class=\"dojoxGridFCBoxField\">${_condSelectLabel}</span>\n\t\t<select dojoAttachPoint=\"_condSelect\" dojoType=\"dijit.form.Select\" \n\t\t\tclass=\"dojoxGridFCBoxCondSelect\"\n\t\t\tdojoAttachEvent=\"onChange:_onChangeCondition\">\n\t\t</select>\n\t\t<div class=\"dojoxGridFCBoxCondSelectAlt\" dojoAttachPoint=\"_condSelectAlt\" style=\"display:none;\"></div>\n\t</div>\n\t<div class=\"dojoxGridFCBoxValue\" dojoAttachPoint=\"valueNode\">\n\t\t<span class=\"dojoxGridFCBoxField\">${_valueBoxLabel}</span>\n\t</div>\n</div>\n"),widgetsInTemplate:true,dlg:null,postMixInProperties:function(){
this.plugin=this.dlg.plugin;
this._curValueBox=null;
var nls=this.plugin.nls;
this._colSelectLabel=nls.columnSelectLabel;
this._condSelectLabel=nls.conditionSelectLabel;
this._valueBoxLabel=nls.valueBoxLabel;
this._anyColumnOption=nls.anyColumnOption;
},postCreate:function(){
var dlg=this.dlg,g=this.plugin.grid;
this._colSelect.set("tabIndex",_2.colSelect);
this._colOptions=this._getColumnOptions();
this._colSelect.addOption([{label:this.plugin.nls.anyColumnOption,value:"anycolumn",selected:dlg.curColIdx<0},{value:""}].concat(this._colOptions));
this._condSelect.set("tabIndex",_2.condSelect);
this._condSelect.addOption(this._getUsableConditions(dlg.getColumnType(dlg.curColIdx)));
this._showSelectOrLabel(this._condSelect,this._condSelectAlt);
this.connect(g.layout,"moveColumn","onMoveColumn");
},_getColumnOptions:function(){
var _41=this.dlg.curColIdx>=0?String(this.dlg.curColIdx):"anycolumn";
return dojo.map(dojo.filter(this.plugin.grid.layout.cells,function(_42){
return !(_42.filterable===false||_42.hidden);
}),function(_43){
return {label:_43.name||_43.field,value:String(_43.index),selected:_41==String(_43.index)};
});
},onMoveColumn:function(){
var tmp=this._onChangeColumn;
this._onChangeColumn=function(){
};
var _44=this._colSelect.get("selectedOptions");
this._colSelect.removeOption(this._colOptions);
this._colOptions=this._getColumnOptions();
this._colSelect.addOption(this._colOptions);
var i=0;
for(;i<this._colOptions.length;++i){
if(this._colOptions[i].label==_44.label){
break;
}
}
if(i<this._colOptions.length){
this._colSelect.set("value",this._colOptions[i].value);
}
var _45=this;
setTimeout(function(){
_45._onChangeColumn=tmp;
},0);
},onRemove:function(){
this.dlg.removeCriteriaBoxes(this);
},uninitialize:function(){
if(this._curValueBox){
this._curValueBox.destroyRecursive();
this._curValueBox=null;
}
this.plugin=null;
this.dlg=null;
},_showSelectOrLabel:function(sel,alt){
var _46=sel.getOptions();
if(_46.length==1){
alt.innerHTML=_46[0].label;
dojo.style(sel.domNode,"display","none");
dojo.style(alt,"display","");
}else{
dojo.style(sel.domNode,"display","");
dojo.style(alt,"display","none");
}
},_onChangeColumn:function(val){
this._checkValidCriteria();
var _47=this.dlg.getColumnType(val);
this._setConditionsByType(_47);
this._setValueBoxByType(_47);
this._updateValueBox();
},_onChangeCondition:function(val){
this._checkValidCriteria();
var f=(val=="range");
if(f^this._isRange){
this._isRange=f;
this._setValueBoxByType(this.dlg.getColumnType(this._colSelect.get("value")));
}
this._updateValueBox();
},_updateValueBox:function(_48){
this._curValueBox.set("disabled",this._condSelect.get("value")=="isempty");
},_checkValidCriteria:function(){
setTimeout(dojo.hitch(this,function(){
this.updateRuleTitle();
this.dlg._updatePane();
}),0);
},_createValueBox:function(cls,arg){
var _49=dojo.hitch(arg.cbox,"_checkValidCriteria");
return new cls(dojo.mixin(arg,{tabIndex:_2.valueBox,onKeyPress:_49,onChange:_49,"class":"dojoxGridFCBoxValueBox"}));
},_createRangeBox:function(cls,arg){
var _4a=dojo.hitch(arg.cbox,"_checkValidCriteria");
dojo.mixin(arg,{tabIndex:_2.valueBox,onKeyPress:_4a,onChange:_4a});
var div=dojo.create("div",{"class":"dojoxGridFCBoxValueBox"}),_4b=new cls(arg),txt=dojo.create("span",{"class":"dojoxGridFCBoxRangeValueTxt","innerHTML":this.plugin.nls.rangeTo}),end=new cls(arg);
dojo.addClass(_4b.domNode,"dojoxGridFCBoxStartValue");
dojo.addClass(end.domNode,"dojoxGridFCBoxEndValue");
div.appendChild(_4b.domNode);
div.appendChild(txt);
div.appendChild(end.domNode);
div.domNode=div;
div.set=function(_4c,_4d){
if(dojo.isObject(_4d)){
_4b.set("value",_4d.start);
end.set("value",_4d.end);
}
};
div.get=function(){
var s=_4b.get("value"),e=end.get("value");
return s&&e?{start:s,end:e}:"";
};
return div;
},changeCurrentColumn:function(_4e){
var _4f=this.dlg.curColIdx;
this._colSelect.removeOption(this._colOptions);
this._colOptions=this._getColumnOptions();
this._colSelect.addOption(this._colOptions);
this._colSelect.set("value",_4f>=0?String(_4f):"anycolumn");
this.updateRuleTitle(true);
},curColumn:function(){
return this._colSelect.getOptions(this._colSelect.get("value")).label;
},curCondition:function(){
return this._condSelect.getOptions(this._condSelect.get("value")).label;
},curValue:function(){
var _50=this._condSelect.get("value");
if(_50=="isempty"){
return "";
}
return this._curValueBox?this._curValueBox.get("value"):"";
},save:function(){
if(this.isEmpty()){
return null;
}
var _51=this._colSelect.get("value"),_52=this.dlg.getColumnType(_51),_53=this.curValue(),_54=this._condSelect.get("value");
return {"column":_51,"condition":_54,"value":_53,"formattedVal":this.formatValue(_52,_54,_53),"type":_52,"colTxt":this.curColumn(),"condTxt":this.curCondition()};
},load:function(obj){
var tmp=[this._onChangeColumn,this._onChangeCondition];
this._onChangeColumn=this._onChangeCondition=function(){
};
if(obj.column){
this._colSelect.set("value",obj.column);
}
if(obj.condition){
this._condSelect.set("value",obj.condition);
}
if(obj.type){
this._setValueBoxByType(obj.type);
}else{
obj.type=this.dlg.getColumnType(this._colSelect.get("value"));
}
var _55=obj.value||"";
if(_55||(obj.type!="date"&&obj.type!="time")){
this._curValueBox.set("value",_55);
}
this._updateValueBox();
setTimeout(dojo.hitch(this,function(){
this._onChangeColumn=tmp[0];
this._onChangeCondition=tmp[1];
}),0);
},getExpr:function(){
if(this.isEmpty()){
return null;
}
var _56=this._colSelect.get("value");
return this.dlg.getExprForCriteria({"type":this.dlg.getColumnType(_56),"column":_56,"condition":this._condSelect.get("value"),"value":this.curValue()});
},isEmpty:function(){
var _57=this._condSelect.get("value");
if(_57=="isempty"){
return false;
}
var v=this.curValue();
return v===""||v===null||typeof v=="undefined"||(typeof v=="number"&&isNaN(v));
},updateRuleTitle:function(_58){
var _59=this._pane._buttonWidget.titleTextNode;
var _5a=["<div class='dojoxEllipsis'>"];
if(_58||this.isEmpty()){
_59.title=dojo.string.substitute(this.plugin.nls.ruleTitleTemplate,[this._ruleIndex||1]);
_5a.push(_59.title);
}else{
var _5b=this.dlg.getColumnType(this._colSelect.get("value"));
var _5c=this.curColumn();
var _5d=this.curCondition();
var _5e=this.formatValue(_5b,this._condSelect.get("value"),this.curValue());
_5a.push(_5c,"&nbsp;<span class='dojoxGridRuleTitleCondition'>",_5d,"</span>&nbsp;",_5e);
_59.title=[_5c," ",_5d," ",_5e].join("");
}
_59.innerHTML=_5a.join("");
if(dojo.isMoz){
var tt=dojo.create("div",{"style":"width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 9999;"},_59);
tt.title=_59.title;
}
},updateRuleIndex:function(_5f){
if(this._ruleIndex!=_5f){
this._ruleIndex=_5f;
if(this.isEmpty()){
this.updateRuleTitle();
}
}
},setAriaInfo:function(idx){
var dss=dojo.string.substitute,nls=this.plugin.nls;
dijit.setWaiState(this._colSelect.domNode,"label",dss(nls.waiColumnSelectTemplate,[idx]));
dijit.setWaiState(this._condSelect.domNode,"label",dss(nls.waiConditionSelectTemplate,[idx]));
dijit.setWaiState(this._pane._removeCBoxBtn.domNode,"label",dss(nls.waiRemoveRuleButtonTemplate,[idx]));
this._index=idx;
},_getUsableConditions:function(_60){
var _61=this.dlg._dataTypeMap[_60].conditions;
var _62=(this.plugin.args.disabledConditions||{})[_60];
var _63=parseInt(this._colSelect.get("value"),10);
var _64=isNaN(_63)?(this.plugin.args.disabledConditions||{})["anycolumn"]:this.plugin.grid.layout.cells[_63].disabledConditions;
if(!dojo.isArray(_62)){
_62=[];
}
if(!dojo.isArray(_64)){
_64=[];
}
var arr=_62.concat(_64);
if(arr.length){
var _65={};
dojo.forEach(arr,function(c){
if(dojo.isString(c)){
_65[c.toLowerCase()]=true;
}
});
return dojo.filter(_61,function(_66){
return !(_66.value in _65);
});
}
return _61;
},_setConditionsByType:function(_67){
var _68=this._condSelect;
_68.removeOption(_68.options);
_68.addOption(this._getUsableConditions(_67));
this._showSelectOrLabel(this._condSelect,this._condSelectAlt);
},_setValueBoxByType:function(_69){
if(this._curValueBox){
this.valueNode.removeChild(this._curValueBox.domNode);
try{
this._curValueBox.destroyRecursive();
}
catch(e){
}
delete this._curValueBox;
}
var _6a=this.dlg._dataTypeMap[_69].valueBoxCls[this._getValueBoxClsInfo(this._colSelect.get("value"),_69)],_6b=this._getValueBoxArgByType(_69);
this._curValueBox=this[this._isRange?"_createRangeBox":"_createValueBox"](_6a,_6b);
this.valueNode.appendChild(this._curValueBox.domNode);
dijit.setWaiState(this._curValueBox.domNode,"label",dojo.string.substitute(this.plugin.nls.waiValueBoxTemplate,[this._index]));
this.dlg.onRendered(this);
},_getValueBoxArgByType:function(_6c){
var g=this.plugin.grid,_6d=g.layout.cells[parseInt(this._colSelect.get("value"),10)],res={cbox:this};
if(_6c=="string"){
if(_6d&&(_6d.suggestion||_6d.autoComplete)){
dojo.mixin(res,{store:g.store,searchAttr:_6d.field||_6d.name,fetchProperties:{sort:[{"attribute":_6d.field||_6d.name}]}});
}
}else{
if(_6c=="boolean"){
dojo.mixin(res,this.dlg.builder.defaultArgs["boolean"]);
}
}
if(_6d&&_6d.dataTypeArgs){
dojo.mixin(res,_6d.dataTypeArgs);
}
return res;
},formatValue:function(_6e,_6f,v){
if(_6f=="isempty"){
return "";
}
if(_6e=="date"||_6e=="time"){
var opt={selector:_6e},fmt=dojo.date.locale.format;
if(_6f=="range"){
return dojo.string.substitute(this.plugin.nls.rangeTemplate,[fmt(v.start,opt),fmt(v.end,opt)]);
}
return fmt(v,opt);
}else{
if(_6e=="boolean"){
return v?this._curValueBox._lblTrue:this._curValueBox._lblFalse;
}
}
return v;
},_getValueBoxClsInfo:function(_70,_71){
var _72=this.plugin.grid.layout.cells[parseInt(_70,10)];
if(_71=="string"){
return (_72&&(_72.suggestion||_72.autoComplete))?"ac":"dft";
}
return "dft";
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.AccordionContainer",dijit.layout.AccordionContainer,{nls:null,addChild:function(_73,_74){
var _75=arguments[0]=_73._pane=new dijit.layout.ContentPane({content:_73});
this.inherited(arguments);
this._modifyChild(_75);
},removeChild:function(_76){
var _77=_76,_78=false;
if(_76._pane){
_78=true;
_77=arguments[0]=_76._pane;
}
this.inherited(arguments);
if(_78){
this._hackHeight(false,this._titleHeight);
var _79=this.getChildren();
if(_79.length===1){
dojo.style(_79[0]._removeCBoxBtn.domNode,"display","none");
}
}
_77.destroyRecursive();
},selectChild:function(_7a){
if(_7a._pane){
arguments[0]=_7a._pane;
}
this.inherited(arguments);
},resize:function(){
this.inherited(arguments);
dojo.forEach(this.getChildren(),this._setupTitleDom);
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(parseInt(dojo.isIE,10)==7){
dojo.some(this._connects,function(_7b){
if(_7b[0][1]=="onresize"){
this.disconnect(_7b);
return true;
}
},this);
}
dojo.forEach(this.getChildren(),function(_7c){
this._modifyChild(_7c,true);
},this);
},_onKeyPress:function(e,_7d){
if(this.disabled||e.altKey||!(_7d||e.ctrlKey)){
return;
}
var k=dojo.keys,c=e.charOrCode,ltr=dojo._isBodyLtr(),_7e=null;
if((_7d&&c==k.UP_ARROW)||(e.ctrlKey&&c==k.PAGE_UP)){
_7e=false;
}else{
if((_7d&&c==k.DOWN_ARROW)||(e.ctrlKey&&(c==k.PAGE_DOWN||c==k.TAB))){
_7e=true;
}else{
if(c==(ltr?k.LEFT_ARROW:k.RIGHT_ARROW)){
_7e=this._focusOnRemoveBtn?null:false;
this._focusOnRemoveBtn=!this._focusOnRemoveBtn;
}else{
if(c==(ltr?k.RIGHT_ARROW:k.LEFT_ARROW)){
_7e=this._focusOnRemoveBtn?true:null;
this._focusOnRemoveBtn=!this._focusOnRemoveBtn;
}else{
return;
}
}
}
}
if(_7e!==null){
this._adjacent(_7e)._buttonWidget._onTitleClick();
}
dojo.stopEvent(e);
dojo.window.scrollIntoView(this.selectedChildWidget._buttonWidget.domNode.parentNode);
if(dojo.isIE){
this.selectedChildWidget._removeCBoxBtn.focusNode.setAttribute("tabIndex",this._focusOnRemoveBtn?_2.accordionTitle:-1);
}
dijit.focus(this.selectedChildWidget[this._focusOnRemoveBtn?"_removeCBoxBtn":"_buttonWidget"].focusNode);
},_modifyChild:function(_7f,_80){
if(!_7f||!this._started){
return;
}
dojo.style(_7f.domNode,"overflow","hidden");
_7f._buttonWidget.connect(_7f._buttonWidget,"_setSelectedAttr",function(){
this.focusNode.setAttribute("tabIndex",this.selected?_2.accordionTitle:"-1");
});
var _81=this;
_7f._buttonWidget.connect(_7f._buttonWidget.domNode,"onclick",function(){
_81._focusOnRemoveBtn=false;
});
(_7f._removeCBoxBtn=new dijit.form.Button({label:this.nls.removeRuleButton,showLabel:false,iconClass:"dojoxGridFCBoxRemoveCBoxBtnIcon",tabIndex:_2.removeCBoxBtn,onClick:dojo.hitch(_7f.content,"onRemove"),onKeyPress:function(e){
_81._onKeyPress(e,_7f._buttonWidget.contentWidget);
}})).placeAt(_7f._buttonWidget.domNode);
var i,_82=this.getChildren();
if(_82.length===1){
_7f._buttonWidget.set("selected",true);
dojo.style(_7f._removeCBoxBtn.domNode,"display","none");
}else{
for(i=0;i<_82.length;++i){
if(_82[i]._removeCBoxBtn){
dojo.style(_82[i]._removeCBoxBtn.domNode,"display","");
}
}
}
this._setupTitleDom(_7f);
if(!this._titleHeight){
for(i=0;i<_82.length;++i){
if(_82[i]!=this.selectedChildWidget){
this._titleHeight=dojo.marginBox(_82[i]._buttonWidget.domNode.parentNode).h;
break;
}
}
}
if(!_80){
this._hackHeight(true,this._titleHeight);
}
},_hackHeight:function(_83,_84){
var _85=this.getChildren(),dn=this.domNode,h=dojo.style(dn,"height");
if(!_83){
dn.style.height=(h-_84)+"px";
}else{
if(_85.length>1){
dn.style.height=(h+_84)+"px";
}else{
return;
}
}
this.resize();
},_setupTitleDom:function(_86){
var w=dojo.contentBox(_86._buttonWidget.titleNode).w;
if(dojo.isIE<8){
w-=8;
}
dojo.style(_86._buttonWidget.titleTextNode,"width",w+"px");
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.UniqueComboBox",dijit.form.ComboBox,{_openResultList:function(_87){
var _88={},s=this.store,_89=this.searchAttr;
arguments[0]=dojo.filter(_87,function(_8a){
var key=s.getValue(_8a,_89),_8b=_88[key];
_88[key]=true;
return !_8b;
});
this.inherited(arguments);
},_onKey:function(evt){
if(evt.charOrCode===dojo.keys.ENTER&&this._opened){
dojo.stopEvent(evt);
}
this.inherited(arguments);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.BooleanValueBox",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.grid","enhanced/templates/FilterBoolValueBox.html","<div class=\"dojoxGridBoolValueBox\">\n\t<div class=\"dojoxGridTrueBox\">\n\t\t<input dojoType=\"dijit.form.RadioButton\" type='radio' name='a1' id='${_baseId}_rbTrue' checked=\"true\" \n\t\t\tdojoAttachPoint=\"rbTrue\" dojoAttachEvent=\"onChange: onChange\"/>\n\t\t<div class=\"dojoxGridTrueLabel\" for='${_baseId}_rbTrue'>${_lblTrue}</div>\n\t</div>\n\t<div class=\"dojoxGridFalseBox\">\n\t\t<input dojoType=\"dijit.form.RadioButton\" dojoAttachPoint=\"rbFalse\" type='radio' name='a1' id='${_baseId}_rbFalse'/>\n\t\t<div class=\"dojoxGridTrueLabel\" for='${_baseId}_rbFalse'>${_lblFalse}</div>\n\t</div>\n</div>\n"),widgetsInTemplate:true,constructor:function(_8c){
var nls=_8c.cbox.plugin.nls;
this._baseId=_8c.cbox.id;
this._lblTrue=_8c.trueLabel||nls.trueLabel||"true";
this._lblFalse=_8c.falseLabel||nls.falseLabel||"false";
this.args=_8c;
},postCreate:function(){
this.onChange();
},onChange:function(){
},get:function(_8d){
return this.rbTrue.get("checked");
},set:function(_8e,v){
this.inherited(arguments);
if(_8e=="value"){
this.rbTrue.set("checked",!!v);
this.rbFalse.set("checked",!v);
}
}});
})();
}
