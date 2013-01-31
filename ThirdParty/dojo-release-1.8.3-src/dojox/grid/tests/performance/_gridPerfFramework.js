dojo.require("dojo.data.ItemFileWriteStore");
dojo.provide("dojox.grid.tests.performance._gridPerfFramework");

(function(){
	// some sample data
	var data_list = [
		{ col1: "normal", col2: false, col3: "new", col4: 'But are not followed by two hexadecimal', col5: 29.91, col6: 10, col7: false },
		{ col1: "important", col2: false, col3: "new", col4: 'Because a % sign always indicates', col5: 9.33, col6: -5, col7: false },
		{ col1: "important", col2: true, col3: "read", col4: 'Signs can be selectively', col5: 19.34, col6: 0, col7: true },
		{ col1: "note", col2: false, col3: "read", col4: 'However the reserved characters', col5: 15.63, col6: 0, col7: true },
		{ col1: "normal", col2: true, col3: "replied", col4: 'It is therefore necessary', col5: 24.22, col6: 5.50, col7: true },
		{ col1: "important", col2: false, col3: "replied", col4: 'To problems of corruption by', col5: 9.12, col6: -3, col7: true },
		{ col1: "note", col2: false, col3: "replied", col4: 'Which would simply be awkward in', col5: 12.15, col6: -4, col7: false }
	];
	
	// default querystring values
	var default_obj = {rows: "100", layout: "single", rowSelector: "false", doProfiling: "false"};

	// values for the performance tests
	var iterations = 100;
	var duration = 100;
	var delay = 100;
	
	// Store functions
	var stores = {};
	dojo.setObject("getStore", function(numRows, force){
		if(force){
			delete stores[numRows];
		}
		if(!stores[numRows]){
			var data = {
				identifier: 'id',
				label: 'id',
				items: []
			};
			for(var i=0, l=data_list.length; i<numRows; i++){
				data.items.push(dojo.mixin({ id: i }, data_list[i%l]));
			}
			stores[numRows] = new dojo.data.ItemFileWriteStore({data: data});
		}
		return stores[numRows];
	});
	
	// Layout generation functions
	dojo.setObject("getLayout", function(type){
		switch (type.toLowerCase()){
			case "dual":
				return [{
					cells: [
						{name: 'Column 0', field: 'id',   width: '100px' },
						{name: 'Column 1', field: 'col1', width: '100px' },
						{name: 'Column 2', field: 'col2', width: '100px' },
						{name: 'Column 3', field: 'col3', width: '100px' }
					],
					noscroll: true
				},{
					cells: [
						{name: 'Column 4', field: 'col4', width: '300px' },
						{name: 'Column 5', field: 'col5', width: '150px' },
						{name: 'Column 6', field: 'col6', width: '150px' },
						{name: 'Column 7', field: 'col7', width: '150px' },
						{name: 'Column 8', field: 'col8', width: '150px' }
					]
				}];
			case "single":
			default:
				return [
					[
						{ name: 'Column 0', field: 'id',   width: '10%' },
						{ name: 'Column 1', field: 'col1', width: '10%' },
						{ name: 'Column 2', field: 'col2', width: '10%' },
						{ name: 'Column 3', field: 'col3', width: '10%' },
						{ name: 'Column 4', field: 'col4', width: '20%' },
						{ name: 'Column 5', field: 'col5', width: '10%' },
						{ name: 'Column 6', field: 'col6', width: '10%' },
						{ name: 'Column 7', field: 'col7', width: '10%' },
						{ name: 'Column 8', field: 'col3', width: '10%' }
					]
				];
		}
	});

	// Returns the parameters in the query string as an object
	// It mixes in over the defaultObj you pass it - if you pass
	// true, it will mix in over the global default obj.
	dojo.setObject("searchParamsAsObj", function(defaultObj){
		var s = (window.location.search||"").replace(/^\?/, "");
		var p = s.split("&");
		var o = {}
		dojo.forEach(p, function(i){
			var b = i.split("=");
			o[b[0]] = b[1];
		});
		if(defaultObj === true){
			defaultObj = default_obj;
		}
		return dojo.mixin(dojo.clone(defaultObj||{}), o);
	});
	
	// Gets the tests for a row/layout/selector type test (the common one)
	// This parses the object and returns a single instance and either perf
	// tests (if run within the runner) or buttons for changing value (if
	// run directly)
	//
	// getRunFunction is the core function to call.  It gets the row, layout
	// and selector values, as well as a boolean if it's a perf function or
	// not.
	dojo.setObject("getRLSTests", function(getRunFunction, getSetUpFunction, getTearDownFunction){
		var isTop = (window.top == window);
		var obj = searchParamsAsObj(default_obj);
		var rows = parseInt(obj.rows, 10);
		var layout = obj.layout;
		var rowSelector = (obj.rowSelector.toLowerCase() == "true");
		var doProfiling = isTop && dojo.isMoz && obj.doProfiling.toLowerCase() == "true";
		var name = layout + " Layout" + (rowSelector ? " w/ Row Selector" : "");
		var t = {
			name: name,
			runTest: getRunFunction(rows, layout, rowSelector, doProfiling, false)
		};
		if(getSetUpFunction){
			t.setUp = getSetUpFunction(rows, layout, rowSelector, doProfiling, false);
		}
		if(getTearDownFunction){
			t.tearDown = getTearDownFunction(rows, layout, rowSelector, doProfiling, false);
		}
		var tests = [ t ];
		if(isTop && !window._buttonsAdded){
			// Give buttons amd text boxes for changing views/rows/etc
			var n = dojo.query(".heading")[0];
			n = dojo.create("span", {innerHTML: "Rows: "}, n, "after");
			n = dojo.create("input", {
				type: "text",
				value: rows,
				size: 5,
				onchange: function(){
					v = parseInt(this.value, 10);
					if(v && !isNaN(v)){
						window.location.search="?rows=" + v +
								"&layout=" + layout +
								"&rowSelector=" + (rowSelector ? "true" : "false") +
								"&doProfiling=" + (doProfiling ? "true" : "false");
					}
				}
			}, n, "after");
			n = dojo.create("button", {
				innerHTML: layout == "single" ? "Dual Layout" : "Single Layout",
				onclick: function(){window.location.search="?rows=" + rows +
								"&layout=" + (layout == "single" ? "dual" : "single") +
								"&rowSelector=" + (rowSelector ? "true" : "false") +
								"&doProfiling=" + (doProfiling ? "true" : "false")}
			}, n, "after");
			n = dojo.create("button", {
				innerHTML: rowSelector ? "Remove Row Selector" : "Add Row Selector",
				onclick: function(){window.location.search="?rows=" + rows +
								"&layout=" + layout +
								"&rowSelector=" + (!rowSelector ? "true" : "false") +
								"&doProfiling=" + (doProfiling ? "true" : "false")}
			}, n, "after");
			if(dojo.isMoz){
				n = dojo.create("button", {
					innerHTML: doProfiling ? "No Profiling" : "Do Profiling",
					onclick: function(){window.location.search="?rows=" + rows +
									"&layout=" + layout +
									"&rowSelector=" + (rowSelector ? "true" : "false") +
									"&doProfiling=" + (!doProfiling ? "true" : "false")}
				}, n, "after");
			}
			window._buttonsAdded = true;
		}else if (!isTop){
			// Only run the perf tests if we are within the runner (which
			// gives us pretty graphs and statistics...)
			t = {
				name: "Perf " + name,
				testType: "perf",
				trialDuration: duration,
				trialIterations: iterations,
				trialDelay: delay,
				runTest: getRunFunction(rows, layout, rowSelector, doProfiling, true)
			}
			if(getSetUpFunction){
				t.setUp = getSetUpFunction(rows, layout, rowSelector, doProfiling, true);
			}
			if(getTearDownFunction){
				t.tearDown = getTearDownFunction(rows, layout, rowSelector, doProfiling, true);
			}
			tests.push(t);
		}
		return tests;
	})

})();
