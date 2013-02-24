jsdoc = {nodes: {}};

dojo.addOnLoad(function(){
	dojo.query("#jsdoc-manage table").forEach(function(table){
		dojo.connect(dojo.byId("jsdoc-manage"), "onsubmit", function(e){
			var valid = true;
			dojo.query("select", table).forEach(function(select){
				if(select.options.length > 1 && select.selectedIndex == 0){
					valid = false;
				}
			});
			if(!valid){
				alert("All variables must either be marked as new, or used in a rename.");
				dojo.stopEvent(e);
			}
		});

		var available = {};

		dojo.query("input", table).forEach(function(checkbox){
			checkbox.checked = true;
			var parts = checkbox.value.split("|");
			var node = {
				project: parts[0],
				resource: parts[1],
				title: parts[2],
				nid: parts[3],
				vid: parts[4]
			}
			jsdoc.nodes[node.nid + "_" + node.vid] = node;
			dojo.connect(checkbox, "onchange", function(e){
				var checked = e.target.checked;

				if(!available[node.project]){
					e.target.checked = true;
				}
				if(available[node.project] || checked){
					dojo.publish("/jsdoc/onchange", [checkbox.checked, node.nid + "_" + node.vid]);
				}

				if(!checked && available[node.project]){
					--available[node.project];
				}else if(checked) {
					++available[node.project];
				}
			});
		});

		dojo.query("select", table).forEach(function(select){
			var project = select.name.slice(9, select.name.indexOf("]"));
			available[project] = (available[project] || 0) + 1;

			dojo.connect(select, "onchange", function(){
				if(select.selectedIndex == 0){
					if(select.last){
						dojo.publish("/jsdoc/onchange", [false, select.last, select]);
						select.last = 0;
					}
				}else if(select.selectedIndex > 0){
					if(select.last){
						dojo.publish("/jsdoc/onchange", [false, select.last, select]);
					}
					var option = select.options[select.selectedIndex];
					select.last = option.value;
					dojo.publish("/jsdoc/onchange", [true, option.value, select]);
				}
			});

			dojo.subscribe("/jsdoc/onchange", null, function(checked, id, current){
				if(current === select){
					return;
				}

				var node = jsdoc.nodes[id];

				if(!checked){
					if(select.name.indexOf("modified[" + node.project + "]") == 0){
						var i = select.options.length++;
						select.options[i].value = id;
						select.options[i].text = node.title + " in " + node.resource;
					}
				}else{
					dojo.query("option[value=" + id + "]", select).orphan();
					if(!select.options.length){
						select.selectedIndex = 0;
					}
				}
			});
		});
	});
});