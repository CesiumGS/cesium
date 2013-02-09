dojo.provide("dijit.tests.form.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?");

	doh.registerUrl("dijit.tests.form.ToggleButtonMixin", dojo.moduleUrl("dijit","tests/form/ToggleButtonMixin.html"+userArgs));
	doh.registerUrl("dijit.tests.form.robot.Button_mouse", dojo.moduleUrl("dijit","tests/form/robot/Button_mouse.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.Button_a11y", dojo.moduleUrl("dijit","tests/form/robot/Button_a11y.html"+userArgs), 999999);
	
	doh.registerUrl("dijit.tests.form.CheckBoxMixin", dojo.moduleUrl("dijit","tests/form/CheckBoxMixin.html"+userArgs));
	doh.registerUrl("dijit.tests.form.RadioButtonMixin", dojo.moduleUrl("dijit","tests/form/RadioButtonMixin.html"+userArgs));
	doh.registerUrl("dijit.tests.form.robot.CheckBox_mouse", dojo.moduleUrl("dijit","tests/form/robot/CheckBox_mouse.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.CheckBox_a11y", dojo.moduleUrl("dijit","tests/form/robot/CheckBox_a11y.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.ButtonMixin", dojo.moduleUrl("dijit","tests/form/ButtonMixin.html"+userArgs));
	doh.registerUrl("dijit.tests.form.test_validate", dojo.moduleUrl("dijit","tests/form/test_validate.html?mode=test"+userArgs.replace(/^[?]/,'&')), 999999);
	doh.registerUrl("dijit.tests.form.robot.ValidationTextBox", dojo.moduleUrl("dijit","tests/form/robot/ValidationTextBox.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.TextBox_onInput", dojo.moduleUrl("dijit","tests/form/robot/TextBox_onInput.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.DateTextBox", dojo.moduleUrl("dijit", "tests/form/test_DateTextBox.html?mode=test"+userArgs.replace(/^[?]/,'&')), 999999);
	doh.registerUrl("dijit.tests.form.robot.DateTextBox", dojo.moduleUrl("dijit","tests/form/robot/DateTextBox.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.TimeTextBox", dojo.moduleUrl("dijit","tests/form/robot/TimeTextBox.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.Form", dojo.moduleUrl("dijit", "tests/form/Form.html"), 999999);
	doh.registerUrl("dijit.tests.form.robot.FormState", dojo.moduleUrl("dijit","tests/form/robot/Form_state.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.Form_onsubmit", dojo.moduleUrl("dijit","tests/form/robot/Form_onsubmit.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.Select", dojo.moduleUrl("dijit", "tests/form/test_Select.html?mode=test"+userArgs.replace(/^[?]/,'&')), 999999);
	doh.registerUrl("dijit.tests.form.robot.Select", dojo.moduleUrl("dijit", "tests/form/robot/Select.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.AutoCompleterMixin", dojo.moduleUrl("dijit","tests/form/AutoCompleterMixin.html"+userArgs));
	doh.registerUrl("dijit.tests.form.ComboBox", dojo.moduleUrl("dijit","tests/form/_autoComplete.html"+(userArgs+"&testWidget=dijit.form.ComboBox&mode=test").replace(/^&/,"?")), 999999);
	doh.registerUrl("dijit.tests.form.robot.ComboBox_mouse", dojo.moduleUrl("dijit","tests/form/robot/_autoComplete_mouse.html"+(userArgs+"&testWidget=dijit.form.ComboBox").replace(/^&/,"?")), 999999);
	doh.registerUrl("dijit.tests.form.robot.ComboBox_a11y", dojo.moduleUrl("dijit","tests/form/robot/_autoComplete_a11y.html"+(userArgs+"&testWidget=dijit.form.ComboBox").replace(/^&/,"?")), 999999);
	doh.registerUrl("dijit.tests.form.FilteringSelect", dojo.moduleUrl("dijit","tests/form/_autoComplete.html"+(userArgs+"&testWidget=dijit.form.FilteringSelect&mode=test").replace(/^&/,"?")), 999999);
	doh.registerUrl("dijit.tests.form.robot.FilteringSelect_mouse", dojo.moduleUrl("dijit","tests/form/robot/_autoComplete_mouse.html"+(userArgs+"&testWidget=dijit.form.FilteringSelect").replace(/^&/,"?")), 999999);
	doh.registerUrl("dijit.tests.form.robot.FilteringSelect_a11y", dojo.moduleUrl("dijit","tests/form/robot/_autoComplete_a11y.html"+(userArgs+"&testWidget=dijit.form.FilteringSelect").replace(/^&/,"?")), 999999);

	doh.registerUrl("dijit.tests.form.robot.MultiSelect", dojo.moduleUrl("dijit","tests/form/robot/MultiSelect.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.robot.SimpleTextarea", dojo.moduleUrl("dijit","tests/form/robot/SimpleTextarea.html"+userArgs), 999999);
	
	doh.registerUrl("dijit.tests.form.robot.Slider_mouse", dojo.moduleUrl("dijit","tests/form/robot/Slider_mouse.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.Slider_a11y", dojo.moduleUrl("dijit","tests/form/robot/Slider_a11y.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.robot.Spinner_mouse", dojo.moduleUrl("dijit","tests/form/robot/Spinner_mouse.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.form.robot.Spinner_a11y", dojo.moduleUrl("dijit","tests/form/robot/Spinner_a11y.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.ExpandingTextAreaMixin", dojo.moduleUrl("dijit","tests/form/ExpandingTextAreaMixin.html"+userArgs));
	doh.registerUrl("dijit.tests.form.robot.Textarea", dojo.moduleUrl("dijit","tests/form/robot/Textarea.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.robot.validationMessages", dojo.moduleUrl("dijit","tests/form/robot/validationMessages.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.verticalAlign", dojo.moduleUrl("dijit","tests/form/test_verticalAlign.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.TextBox_types", dojo.moduleUrl("dijit","tests/form/TextBox_types.html"+userArgs), 999999);

	doh.registerUrl("dijit.tests.form.TextBox_sizes.tundra.ltr", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=tundra&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.tundra.rtl", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=tundra&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.tundra.quirks", dojo.moduleUrl("dijit", "tests/quirks.html?file=form/TextBox_sizes.html&theme=tundra&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.claro.ltr", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=claro&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.claro.rtl", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=claro&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.claro.quirks", dojo.moduleUrl("dijit", "tests/quirks.html?file=form/TextBox_sizes.html&theme=claro&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.soria.ltr", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=soria&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.soria.rtl", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=soria&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.soria.quirks", dojo.moduleUrl("dijit", "tests/quirks.html?file=form/TextBox_sizes.html&theme=soria&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.nihilo.ltr", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=nihilo&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.nihilo.rtl", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?theme=nihilo&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.nihilo.quirks", dojo.moduleUrl("dijit", "tests/quirks.html?file=form/TextBox_sizes.html&theme=nihilo&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.a11y.ltr", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?a11y=1&dir=ltr"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.a11y.rtl", dojo.moduleUrl("dijit", "tests/form/TextBox_sizes.html?a11y=1&dir=rtl"), 999999);
	doh.registerUrl("dijit.tests.form.TextBox_sizes.a11y.quirks", dojo.moduleUrl("dijit", "tests/quirks.html?file=form/TextBox_sizes.html&a11y=1&dir=ltr"), 999999);
}catch(e){
	doh.debug(e);
}
