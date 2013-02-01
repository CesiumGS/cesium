dojo.provide("dojox.wire.demos.TableContainer");

dojo.require("dojo.parser");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.declare("dojox.wire.demos.TableContainer", [ dijit._Widget, dijit._Templated, dijit._Container ], {
	// summary:
	//		Extremely simple 'widget' that is a table generator with an addRow function that takes an array
	//		as the row to add, where each entry is a cell in the row.  This demo widget is for use with the
	//		wire demos.

	templateString: "<table class='tablecontainer'><tbody dojoAttachPoint='tableContainer'></tbody></table>",
	rowCount: 0,
	headers: "",
	addRow: function(array){
		// summary:
		//		Function to add in a new row from the elements in the array map to cells in the row.
		// array:
		//		Array of row values to add.
		try{
			var row = document.createElement("tr");
			if((this.rowCount%2) === 0){
				dojo.addClass(row, "alternate");
			}
			this.rowCount++;
			for(var i in array){
				var cell = document.createElement("td");
				var text = document.createTextNode(array[i]);
				cell.appendChild(text);
				row.appendChild(cell);
				
			}
			this.tableContainer.appendChild(row);
		}catch(e){ console.debug(e); }
	},

	clearTable: function(){
		// summary:
		//		Function to clear all the current rows in the table, except for the header.

		//Always leave the first row, which is the table header.
		while(this.tableContainer.firstChild.nextSibling){
			this.tableContainer.removeChild(this.tableContainer.firstChild.nextSibling);
		}
		this.rowCount = 0;
	},

	postCreate: function(){
		// summary:
		//		Widget lifecycle function to handle generation of the header elements in the table.
		var headers = this.headers.split(",");
		var tr = document.createElement("tr");
		for(i in headers){
			
			var header = headers[i];
			var th = document.createElement("th");
			var text = document.createTextNode(header);
			th.appendChild(text);
			tr.appendChild(th);
		}
		this.tableContainer.appendChild(tr);
	}
});
