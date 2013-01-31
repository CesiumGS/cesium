define([
	"dojo/_base/declare",
	"dojox/mvc",
	"dojox/mvc/StatefulModel",
	"dojo/data/ItemFileWriteStore"
], function(declare, mvc, StatefulModel, ItemFileWriteStore){

	return declare("dojox.mvc.tests.models.LoanWizardModel", [StatefulModel], {

		// data store for pie chart
		chartStore: new ItemFileWriteStore({ data: {
			"hierarchical" : false,
			"identifier"   : "id",
			"items" : [
			           { "id" : "mortgage", "x"  : 1, "y"	: 0 },
			           { "id" : "taxes", "x"  : 2, "y"	 : 0 },
			           { "id" : "otherhousing", "x"  : 3, "y"	: 0 }
			           ]
		}}),

		constructor: function (args) {
			// try to precompute address fields from the zipcode and country...	 
			mvc.bindInputs([this.Zip, this.Country], dojo.hitch(this, this._lookupAddrs));
			// simple dependence of percentages on input values and total
			mvc.bindInputs([this.Mortgage, this.Taxes, this.OtherHousing, this.BaseIncome, this.BonusIncome], dojo.hitch(this, this._recomputeTotalAndPercentages));

			mvc.bind(this.HousingPercent, "value", this.HousingPercent, "valid", dojo.hitch(this, this._isHousingLessThanOrEqualToThirtyThreePercent), true);

			mvc.bind(this.HousingPercent, "value", this.HousingPercent, "relevant", dojo.hitch(this, this._nonZeroRelevance), true);
			mvc.bind(this.TotalHousing, "value", this.TotalHousing, "relevant", dojo.hitch(this, this._nonZeroRelevance), true);

			this._recomputeTotalAndPercentages();  // get things going first time...
		},

		_lookupItem: function( dataSource, identity ) {
			var found_item;
			dataSource.fetchItemByIdentity( { "identity": identity, 
				"onItem": function (item) { found_item = item; } } );
			return found_item;
		},

		_lookupAddrs: function() {
			if ( this.Zip.get("value") == null || isNaN(this.Zip.get("value"))) return;
			var pThis = this;
			var query = { "postalcode": this.Zip.get("value"), "country": this.Country.get("value") };		
			var xhrArgs = {
					url: "zips/"+this.Zip.get("value")+".json",
					sync: true,
					content: query,
					preventCache: true,
					handleAs: "json",
					load: function(data, io) {
						pThis.City.set("value", data.postalcodes[0].placeName );
						pThis.County.set("value", data.postalcodes[0].adminName2 );
						pThis.State.set("value", data.postalcodes[0].adminCode1 );
						pThis.Zip.set("valid", true ); 
					},
					error: function (data) {
						// we couldn't find this country/zip combination...clear the fields and set validity=false
						pThis.City.set("value", "" );
						pThis.County.set("value", "" );
						pThis.State.set("value", "" );
						pThis.Zip.set("valid", false );
					}
			};
			//Call the synchronous xhrGet
			var deferred = dojo.xhrGet(xhrArgs);	
		},

		_recomputeTotalAndPercentages: function() {
			var mortgage = parseInt(this.Mortgage.get("value"));
			var taxes = parseInt(this.Taxes.get("value"));
			var otherHousing = parseInt(this.OtherHousing.get("value"));
			var totalHousing = mortgage + taxes + otherHousing;

			var baseIncome = parseInt(this.BaseIncome.get("value"));
			var bonusIncome = parseInt(this.BonusIncome.get("value"));
			var totalIncome = baseIncome + bonusIncome;

			var housingPercentage = Math.round(totalHousing / totalIncome * 100);

			this.HousingPercent.set("value", housingPercentage);
			this.TotalHousing.set("value", totalHousing);
			this.TotalIncome.set("value", totalIncome);

			// map the values into the data source structure required for chart display as well...
			var mortgageItem = this._lookupItem(this.chartStore, "mortgage");
			var taxesItem = this._lookupItem(this.chartStore, "taxes");
			var otherItem = this._lookupItem(this.chartStore, "otherhousing");
			this.chartStore.setValue(mortgageItem, "y", mortgage);
			this.chartStore.setValue(taxesItem, "y", taxes);
			this.chartStore.setValue(otherItem, "y", otherHousing);
		},

		_isHousingLessThanOrEqualToThirtyThreePercent: function(newValue) {
			return newValue <= 33;
		},

		_nonZeroRelevance: function(newValue) {
			if ( newValue > 0 ) return true;
			else return false;
		}

	});
});
