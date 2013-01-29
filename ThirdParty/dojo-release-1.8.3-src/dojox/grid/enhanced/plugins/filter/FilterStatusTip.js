define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/query",
	"dojo/string",
	"dojo/date/locale",
	"dijit/_Widget", 
	"dijit/_TemplatedMixin", 
	"dijit/_WidgetsInTemplateMixin", 
	"dijit/TooltipDialog",
	"dijit/form/Button",
	"dijit/_base/popup",
	"dojo/text!../../templates/FilterStatusPane.html",
	"dojo/i18n!../../nls/Filter"
], function(declare, array, lang, query, string, dateLocale, _Widget, 
	_TemplatedMixin, _WidgetsInTemplateMixin, TooltipDialog, Button, popup, template){

	var gridCssCls = "", headerCssCls = "", cellCssCls = "", rowCssCls = "",
		oddRowCssCls = "dojoxGridFStatusTipOddRow",
		handleHolderCssCls = "dojoxGridFStatusTipHandle",
		conditionCssCls = "dojoxGridFStatusTipCondition",
		_removeRuleIconCls = "dojoxGridFStatusTipDelRuleBtnIcon",
		_statusFooter = "</tbody></table>";

	var FilterStatusPane = declare("dojox.grid.enhanced.plugins.filter.FilterStatusPane", [_Widget, _TemplatedMixin], {
		templateString: template
	});

	return declare("dojox.grid.enhanced.plugins.filter.FilterStatusTip", null, {
		// summary:
		//		Create the status tip UI.
		constructor: function(args){
			var plugin = this.plugin = args.plugin;
			this._statusHeader = ["<table border='0' cellspacing='0' class='",
				gridCssCls, "'><thead><tr class='",
				headerCssCls, "'><th class='",
				cellCssCls, "'><div>", plugin.nls["statusTipHeaderColumn"], "</div></th><th class='",
				cellCssCls, " lastColumn'><div>", plugin.nls["statusTipHeaderCondition"], "</div></th></tr></thead><tbody>"
			].join('');
			this._removedCriterias = [];
			this._rules = [];
			this.statusPane = new FilterStatusPane();
			this._dlg = new TooltipDialog({
				"class": "dijitTooltipBelow dojoxGridFStatusTipDialog",
				content: this.statusPane,
				autofocus: false
			});
			this._dlg.connect(this._dlg.domNode, 'onmouseleave', lang.hitch(this, this.closeDialog));
			this._dlg.connect(this._dlg.domNode, 'click', lang.hitch(this, this._modifyFilter));
		},
		destroy: function(){
			this._dlg.destroyRecursive();
		},
		//-----------------Public Functions------------------------
		showDialog: function(/* int */pos_x,/* int */pos_y, columnIdx){
			this._pos = {x:pos_x,y:pos_y};
			popup.close(this._dlg);
			this._removedCriterias = [];
			this._rules = [];
			this._updateStatus(columnIdx);
			popup.open({
				popup: this._dlg,
				parent: this.plugin.filterBar,
				onCancel: function(){},
				x:pos_x - 12,
				y:pos_y - 3
			});
		},
		closeDialog: function(){
			popup.close(this._dlg);
			if(this._removedCriterias.length){
				this.plugin.filterDefDialog.removeCriteriaBoxes(this._removedCriterias);
				this._removedCriterias = [];
				this.plugin.filterDefDialog.onFilter();
			}
		},
		//-----------------Private Functions---------------------------
		_updateStatus: function(columnIdx){
			var res, p = this.plugin,
				nls = p.nls,
				sp = this.statusPane,
				fdg = p.filterDefDialog;
			if(fdg.getCriteria() === 0){
				sp.statusTitle.innerHTML = nls["statusTipTitleNoFilter"];
				sp.statusRel.innerHTML = "";
				var cell = p.grid.layout.cells[columnIdx];
				var colName = cell ? "'" + (cell.name || cell.field) + "'" : nls["anycolumn"];
				res = string.substitute(nls["statusTipMsg"], [colName]);
			}else{
				sp.statusTitle.innerHTML = nls["statusTipTitleHasFilter"];
				sp.statusRel.innerHTML = fdg._relOpCls == "logicall" ? nls["statusTipRelAll"] : nls["statusTipRelAny"];
				this._rules = [];
				var i = 0, c = fdg.getCriteria(i++);
				while(c){
					c.index = i - 1;
					this._rules.push(c);
					c = fdg.getCriteria(i++);
				}
				res = this._createStatusDetail();
			}
			sp.statusDetailNode.innerHTML = res;
			this._addButtonForRules();
		},
		_createStatusDetail: function(){
			return this._statusHeader + array.map(this._rules, function(rule, i){
				return this._getCriteriaStr(rule, i);
			}, this).join('') + _statusFooter;
		},
		_addButtonForRules: function(){
			if(this._rules.length > 1){
				query("." + handleHolderCssCls, this.statusPane.statusDetailNode).forEach(lang.hitch(this, function(nd, idx){
					(new Button({
						label: this.plugin.nls["removeRuleButton"],
						showLabel: false,
						iconClass: _removeRuleIconCls,
						onClick: lang.hitch(this, function(e){
							e.stopPropagation();
							this._removedCriterias.push(this._rules[idx].index);
							this._rules.splice(idx,1);
							this.statusPane.statusDetailNode.innerHTML = this._createStatusDetail();
							this._addButtonForRules();
						})
					})).placeAt(nd, "last");
				}));
			}
		},
		_getCriteriaStr: function(/* object */c, /* int */rowIdx){
			var res = ["<tr class='", rowCssCls,
				" ", (rowIdx % 2 ? oddRowCssCls : ""),
				"'><td class='", cellCssCls, "'>", c.colTxt,
				"</td><td class='", cellCssCls,
				"'><div class='", handleHolderCssCls, "'><span class='", conditionCssCls,
				"'>", c.condTxt, "&nbsp;</span>",
				c.formattedVal, "</div></td></tr>"];
			return res.join('');
		},
		_modifyFilter: function(){
			this.closeDialog();
			var p = this.plugin;
			p.filterDefDialog.showDialog(p.filterBar.getColumnIdx(this._pos.x));
		}
	});
});
