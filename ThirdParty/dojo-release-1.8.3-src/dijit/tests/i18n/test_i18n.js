var validateValues = [];
var formatWidgetCount = 0;
var validateWidgetCount = 0;

function getElementsById(id){
	var result = [];

	if(!id || typeof(id) != "string"){
		return result;
	}

	var ae = document.getElementsByTagName(dojo.byId(id).tagName);
	for(var i = 0; i < ae.length; i++){
		if(ae[i].id == id){
			result.push(ae[i]);
		}
	}
	return result;
}

function getString(n){
	return n && n.toString();
}

function startTest(t){
	startTestFormat(t);
	startTestValidate(t);
}

function getAllTestCases(){
	var allTestCases = [];
	for(var i = 0; i < formatWidgetCount; i++){
		allTestCases.push({
			name: "format-" + i,
			runTest: new Function("t", "startTestFormat(" + i + ", t)")
		});
	}
	for(i = 0; i < validateWidgetCount; i++){
		allTestCases.push({
			name: "validate-" + i,
			runTest: new Function("t", "startTestValidate(" + i + ", t)")
		});
	}
	return allTestCases;
}

function startTestFormat(i, t){
	var test_node = dojo.doc.getElementById("test_display_" + i);
	var exp = dojo.doc.getElementById("test_display_expected_" + i).value;
	var res_node = dojo.doc.getElementById("test_display_result_" + i);
	res_node.innerHTML = test_node.value;
	res_node.style.backgroundColor = (test_node.value == exp) ? "#AFA" : "#FAA";
	res_node.innerHTML += " <a style='font-size:0.8em' href='javascript:alert(\"Expected: " + encodeURIComponent(exp) + "\\n Result: " + encodeURIComponent(test_node.value) + "\")'>Compare (Escaped)</a>";
	t.is(exp, test_node.value);
}

function startTestValidate(i, t){
	var test_node = dojo.doc.getElementById("test_validate_" + i);
	var inp_node = dojo.doc.getElementById("test_validate_input_" + i);
	var exp = dojo.doc.getElementById("test_validate_expected_" + i).innerHTML;
	var res_node = dojo.doc.getElementById("test_validate_result_" + i);
	var val_node = dojo.doc.getElementById("test_display_value_" + i);

	test_node.value = inp_node.value;

	var widget = widget = dijit.getEnclosingWidget(test_node);

	if(widget){
		widget.focus();

		var expected = validateValues[i];
		var result = widget.getValue();
		if(validateValues[i].processValue){
			expected = validateValues[i].processValue(expected);
			result = validateValues[i].processValue(result);
		}
		var parseCorrect = getString(expected) == getString(result);
		val_node.style.backgroundColor = parseCorrect ?  "#AFA" : "#FAA";
		val_node.innerHTML = getString(result) + (parseCorrect ? "" : "<br>Expected: " + getString(expected));

		res_node.innerHTML = widget.isValid && !widget.isValid() ? "Wrong" : "Correct";
		res_node.style.backgroundColor = res_node.innerHTML == exp ? "#AFA" : "#FAA";

		t.is(getString(expected), getString(result));
	}
}

function genFormatTestCase(desc, dojoType, dojoAttrs, value, expValue, comment){
	var res = "";
	res += "<tr>";
	res += "<td>" + desc + "</td>";
	res += "<td>";
	res += "<input id='test_display_" + formatWidgetCount + "' type='text' value='" + value + "' ";
	res += "dojoType='" + dojoType + "' ";
	for(var attr in dojoAttrs){
		res += attr + "=\"" + dojoAttrs[attr] + "\" ";
	}
	res += "/>";
	res += "</td>";
	res += "<td><input id='test_display_expected_" + formatWidgetCount + "' value='" + expValue + "'></td>";
	res += "<td id='test_display_result_" + formatWidgetCount + "'></td>";
	res += "<td style='white-space:normal'>" + comment + "</td>";
	res += "</tr>";
	formatWidgetCount++;
	
	return res;
}
/*
[
	{attrs: {currency: "CNY", lang: "zh-cn"}, desc: "", value:"-123456789.46", expValue: "", comment: ""},
	...
]
*/
function genFormatTestCases(title, dojoType, testCases){
	var res = "";
	res += "<h2 class=testTitle>" + title + "</h2>";
	res += "<table border=1>";
	res += "<tr>";
	res += "<td class=title><b>Test Description</b></td>";
	res += "<td class=title><b>Test</b></td>";
	res += "<td class=title><b>Expected</b></td>";
	res += "<td class=title><b>Result</b></td>";
	res += "<td class=title><b>Comment</b></td>";
	res += "</tr>";

	for(var i = 0; i < testCases.length; i++){
		var testCase = testCases[i];
		res += genFormatTestCase(testCase.desc, dojoType, testCase.attrs, testCase.value, testCase.expValue, testCase.comment);
	}

	res += "</table>";
	
	dojo.place(res, dojo.body());
}

function genValidateTestCase(desc, dojoType, dojoAttrs, input, value, comment, isWrong){
	var res = "";
	res += "<tr>";
	res += "<td>" + desc + "</td>";
	res += "<td>";
	res += "<input id='test_validate_" + validateWidgetCount + "' type='text' ";
	res += "dojoType='" + dojoType + "' ";
	for(var attr in dojoAttrs){
		res += attr + "=\"" + dojoAttrs[attr] + "\" ";
	}
	res += "/>";
	res += "</td>";
	res += "<td><input id='test_validate_input_" + validateWidgetCount + "' value='" + input + "'></td>";
	res += "<td id='test_display_value_" + validateWidgetCount + "'></td>";
	res += "<td id='test_validate_expected_" + validateWidgetCount + "'>" + (isWrong ? "Wrong" : "Correct") + "</td>";
	res += "<td id='test_validate_result_" + validateWidgetCount + "'></td>";
	res += "<td style='white-space:normal'>" + comment + "</td>";
	res += "</tr>";
	validateValues.push(value);
	validateWidgetCount++;
	
	return res;
}
/*
[
	{attrs: {currency: "CNY", lang: "zh-cn"}, desc: "", value:false, expValue: "-123456789.46", comment: ""},
	...
]
*/
function genValidateTestCases(title, dojoType, testCases){
	var res = "";
	res += "<h2 class=testTitle>" + title + "</h2>";
	res += "<table border=1>";
	res += "<tr>";
	res += "<td class=title><b>Test Description</b></td>";
	res += "<td class=title><b>Test</b></td>";
	res += "<td class=title><b>Input</b></td>";
	res += "<td class=title><b>Parsed Value</b></td>";
	res += "<td class=title><b>Expected</b></td>";
	res += "<td class=title><b>Result</b></td>";
	res += "<td class=title><b>Comment</b></td>";
	res += "</tr>";

	for(var i = 0; i < testCases.length; i++){
		var testCase = testCases[i];
		res += genValidateTestCase(testCase.desc, dojoType, testCase.attrs, testCase.expValue, testCase.value, testCase.comment, testCase.isWrong);
	}

	res += "</table>";
	dojo.place(res, dojo.body());
}
