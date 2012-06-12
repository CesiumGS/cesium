(function(){
dojo.require("dojo.date.locale");
dojo.require("dojo.currency");
dojo.require("dijit.form.HorizontalSlider");
dojo.require("dijit.form.CurrencyTextBox");
dojo.require("dojox.grid.cells.dijit");
formatCurrency = function(inDatum){
	return isNaN(inDatum) ? '...' : dojo.currency.format(inDatum, this.constraint);
}
formatDate = function(inDatum){
	return dojo.date.locale.format(new Date(inDatum), this.constraint);
}
structure1 = [{
	defaultCell: { width: 8, editable: true, type: dojox.grid.cells._Widget, styles: 'text-align: right;'  },
	rows: [
		{ name: 'Id', field: 'id', editable: false /* Can't edit ID's of dojo.data items */ },
		{ name: 'Date', field: 'col8', width: 10,
			type: dojox.grid.cells.DateTextBox,
			formatter: formatDate,
			constraint: {formatLength: 'long', selector: "date"}},
		{ name: 'Priority', styles: 'text-align: center;', field: 'col1',
			type: dojox.grid.cells.ComboBox,
			options: ["normal", "note", "important"], width: 10},
		{ name: 'Mark', field: 'col2', width: 3, styles: 'text-align: center;',
			type: dojox.grid.cells.CheckBox},
		{
			field: 'col3', name: 'Status',
			styles: 'text-align: center;',
			type: dojox.grid.cells.Select,
			options: [ "new", "read", "replied" ]
		},
		{ name: 'Message', field: 'col4', styles: '', width: 'auto',
			type: dojox.grid.cells.Editor, editorToolbar: true },
		{ name: 'Amount', field: 'col5', formatter: formatCurrency, constraint: {currency: 'EUR'},
			widgetClass: dijit.form.CurrencyTextBox },
		{ name: 'Amount', field: 'col6', formatter: formatCurrency, constraint: {currency: 'EUR'},
			widgetClass: dijit.form.HorizontalSlider, width: 10}
	]
}];
})();