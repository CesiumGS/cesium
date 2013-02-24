define(["dojo/_base/lang", "./_base"], function(lang, validate){

var br = lang.getObject("br", true, validate);
br.isValidCnpj = function(/*String*/value){
	// summary:
	//		Validates a CNPJ/CGC number
	// value: String
	//		The CNPJ/CGC number in ##.###.###/####-##, ########/####-##,
	//		############-## or ############## format
	if(!lang.isString(value)){
		if(!value){
			return false;
		}
		value = value + "";
		while(value.length < 14){
			value = "0" + value;
		}
	}
	var flags = {
		format: [
			"##.###.###/####-##",
			"########/####-##",
			"############-##",
			"##############"
		]
	};
	if(validate.isNumberFormat(value, flags)){
		// Matched the initial test, so break this down into the
		// parts to be validated.
		value = value.replace("/", "").replace(/\./g, "").replace("-", "");
		var cgc = [];
		var dv = [];
		var i, j, tmp;

		// Check for obvious bad combos
		// all 0s to all 9's.
		for(i = 0; i < 10; i++){
			tmp = "";
			for(j = 0; j < value.length; j++){
				tmp += "" + i;
			}
			if(value === tmp){
				return false;
			}
		}

		//Split out the DV from the main number.
		for(i = 0; i < 12; i++){
			cgc.push(parseInt(value.charAt(i), 10));
		}
		for(i = 12; i < 14; i++){
			dv.push(parseInt(value.charAt(i), 10));
		}
		
		var base = [9,8,7,6,5,4,3,2,9,8,7,6].reverse();
		var sum = 0;
		for(i = 0; i < cgc.length; i++){
			sum += cgc[i] * base[i];
		}
		var dv0 = sum % 11;
		if(dv0 == dv[0]){
			// Still seems valid, keep going.
			sum = 0;
			base = [9,8,7,6,5,4,3,2,9,8,7,6,5].reverse();
			cgc.push(dv0);
			for(i = 0; i < cgc.length; i++){
				sum += cgc[i] * base[i];
			}
			var dv1 = sum % 11;
			if(dv1 === dv[1]){
				// Whew, looks valid.
				return true;
			}
		}
	}
	return false;
};

br.computeCnpjDv = function(/*String*/value){
	// summary:
	//		Generate the DV code (checksum part) for a Cnpj number
	// value:
	//		The CGC number in ##.###.###/#### or ############ format
	if(!lang.isString(value)){
		if(!value){
			return "";
		}
		value = value + "";
		while(value.length < 12){
			value = "0" + value;
		}
	}
	var flags = {
		format: [
			"##.###.###/####",
			"########/####",
			"############"
		]
	};
	if(validate.isNumberFormat(value, flags)){
		// Matched the initial test, so break this down into the
		// parts to compute the DV.
		value = value.replace("/", "").replace(/\./g, "");
		var cgc = [];
		var i, j, tmp;

		// Check for obvious bad combos
		// all 0s to all 9's.
		for(i = 0; i < 10; i++){
			tmp = "";
			for(j = 0; j < value.length; j++){
				tmp += "" + i;
			}
			if(value === tmp){
				return "";
			}
		}

		for(i = 0; i < value.length; i++){
			cgc.push(parseInt(value.charAt(i), 10));
		}
		var base = [9,8,7,6,5,4,3,2,9,8,7,6].reverse();
		var sum = 0;
		for(i = 0; i < cgc.length; i++){
			sum += cgc[i] * base[i];
		}
		var dv0 = sum % 11;
		sum = 0;
		base = [9,8,7,6,5,4,3,2,9,8,7,6,5].reverse();
		cgc.push(dv0);
		for(i = 0; i < cgc.length; i++){
			sum += cgc[i] * base[i];
		}
		var dv1 = sum % 11;
		return ("" + dv0) + dv1;
	}
	return "";
};


br.isValidCpf = function(/*String*/value){
	// summary:
	//		Validates a CPF number
	// value: String
	//		The CPF number in #########-## or ###########,
	//		format
	if(!lang.isString(value)){
		if(!value){
			return false;
		}
		value = value + "";
		while(value.length < 11){
			value = "0" + value;
		}
	}
	var flags = {
		format: [
			"###.###.###-##",
			"#########-##",
			"###########"
		]
	};
	if(validate.isNumberFormat(value, flags)){
		// Matched the initial test, so break this down into the
		// parts to be validated.
		value = value.replace("-", "").replace(/\./g, "");
		var cpf = [];
		var dv = [];
		var i, j, tmp;

		// Check for obvious bad combos
		// all 0s to all 9's.
		for(i = 0; i < 10; i++){
			tmp = "";
			for(j = 0; j < value.length; j++){
				tmp += "" + i;
			}
			if(value === tmp){
				return false;
			}
		}

		//Split out the DV from the main number.
		for(i = 0; i < 9; i++){
			cpf.push(parseInt(value.charAt(i), 10));
		}
		for(i = 9; i < 12; i++){
			dv.push(parseInt(value.charAt(i), 10));
		}
		
		var base = [9,8,7,6,5,4,3,2,1].reverse();
		var sum = 0;
		for(i = 0; i < cpf.length; i++){
			sum += cpf[i] * base[i];
		}
		var dv0 = sum % 11;
		if(dv0 == dv[0]){
			// Still seems valid, keep going.
			sum = 0;
			base = [9,8,7,6,5,4,3,2,1,0].reverse();
			cpf.push(dv0);
			for(i = 0; i < cpf.length; i++){
				sum += cpf[i] * base[i];
			}
			var dv1 = sum % 11;
			if(dv1 === dv[1]){
				// Whew, looks valid.
				return true;
			}
		}
	}
	return false;
};

br.computeCpfDv = function(/*String*/value){
	// summary:
	//		Generate the DV code (checksum part) for a CPF number
	// value: String
	//		The CPF number in ######### format
	if(!lang.isString(value)){
		if(!value){
			return "";
		}
		value = value + "";
		while(value.length < 9){
			value = "0" + value;
		}
	}
	var flags = {
		format: [
			"###.###.###",
			"#########"
		]
	};
	if(validate.isNumberFormat(value, flags)){
		// Matched the initial test, so break this down into the
		// parts to compute the DV.
		value = value.replace(/\./g, "");
		var cpf = [];
		
		// Check for obvious bad combos
		// all 0s to all 9's.
		for(i = 0; i < 10; i++){
			tmp = "";
			for(j = 0; j < value.length; j++){
				tmp += "" + i;
			}
			if(value === tmp){
				return "";
			}
		}

		for(i = 0; i < value.length; i++){
			cpf.push(parseInt(value.charAt(i), 10));
		}
		var base = [9,8,7,6,5,4,3,2,1].reverse();
		var sum = 0;
		for(i = 0; i < cpf.length; i++){
			sum += cpf[i] * base[i];
		}
		var dv0 = sum % 11;
		sum = 0;
		base = [9,8,7,6,5,4,3,2,1,0].reverse();
		cpf.push(dv0);
		for(i = 0; i < cpf.length; i++){
			sum += cpf[i] * base[i];
		}
		var dv1 = sum % 11;
		return ("" + dv0) + dv1;
	}
	return "";
};

return br;
});
