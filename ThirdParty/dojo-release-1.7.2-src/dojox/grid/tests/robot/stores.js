(function(){
dojo.require("dojo.data.ItemFileWriteStore");
structure1_store1_data = [];
structure1_store2_data = [];
structure1_store3_data = [];
structure1_store4_data = [];
for(var i=0; i<100; i++){
	var item = {
		id: i,
		col1: 'normal',
		col2: false,
		col3: 'new',
		col4: 'Now is the time for all good men to come to the aid of their party.',
		col5: 99.99,
		col6: 9.99,
		col7: false,
		col8: new Date()
	};
	structure1_store1_data.push(dojo.mixin({},item));
	structure1_store2_data.push(dojo.mixin({},item));
	structure1_store3_data.push(dojo.mixin({},item));
	structure1_store4_data.push(dojo.mixin({},item));
}
//TODO: populate data
structure1_store1 = new dojo.data.ItemFileWriteStore({
	data:{
		identifier:"id",
		items:structure1_store1_data
	}
});
structure1_store2 = new dojo.data.ItemFileWriteStore({
	data:{
		identifier:"id",
		items:structure1_store2_data
	}
});
structure1_store3 = new dojo.data.ItemFileWriteStore({
	data:{
		identifier:"id",
		items:structure1_store3_data
	}
});
structure1_store4 = new dojo.data.ItemFileWriteStore({
	data:{
		identifier:"id",
		items:structure1_store4_data
	}
});
})();