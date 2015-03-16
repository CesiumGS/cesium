/*jslint sloppy:true browser:true */
/*global esprima:true, require:true */
var validateId;

function validate(delay) {
    if (validateId) {
        window.clearTimeout(validateId);
    }

    validateId = window.setTimeout(function () {
        var code, result, syntax, errors, i, str;

        if (typeof window.editor === 'undefined') {
            code = document.getElementById('editor').value;
        } else {
            code = window.editor.getText();
            window.editor.removeAllErrorMarkers();
        }
        result = document.getElementById('info');

        try {
            syntax = esprima.parse(code, { tolerant: true, loc: true });
            errors = syntax.errors;
            if (errors.length > 0) {
                result.innerHTML = 'Invalid code. Total issues: ' + errors.length;
                for (i = 0; i < errors.length; i += 1) {
                    window.editor.addErrorMarker(errors[i].index, errors[i].description);
                }
                result.setAttribute('class', 'alert-box alert');
            } else {
                result.innerHTML = 'Code is syntatically valid.';
                result.setAttribute('class', 'alert-box success');
                if (syntax.body.length === 0) {
                    result.innerHTML = 'Empty code. Nothing to validate.';
                }
            }
        } catch (e) {
            window.editor.addErrorMarker(e.index, e.description);
            result.innerHTML = e.toString();
            result.setAttribute('class', 'alert-box alert');
        }

        validateId = undefined;
    }, delay || 811);
}

window.onload = function () {
    try {
        require(['custom/editor'], function (editor) {
            window.editor = editor({ parent: 'editor', lang: 'js' });
            window.editor.getTextView().getModel().addEventListener("Changed", validate);
        });
        validate(55);
    } catch (e) {
    }
};
