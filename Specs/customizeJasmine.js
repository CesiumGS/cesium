import addDefaultMatchers from './addDefaultMatchers.js';
import equalsMethodEqualityTester from './equalsMethodEqualityTester.js';

    function customizeJasmine(env, includedCategory, excludedCategory, webglValidation, webglStub, release) {
        // set this for uniform test resolution across devices
        window.devicePixelRatio = 1;

        window.specsUsingRelease = release;

        var originalDescribe = window.describe;

        window.describe = function (name, suite, categories) {
            // exclude this spec if we're filtering by category and it's not the selected category
            // otherwise if we have an excluded category, exclude this test if the category of this spec matches
            if (includedCategory && categories !== includedCategory) {
                return;
            } else if (excludedCategory && categories === excludedCategory) {
                return;
            }

            originalDescribe(name, suite, categories);
        };

        if (webglValidation) {
            window.webglValidation = true;
        }

        if (webglStub) {
            window.webglStub = true;
        }

        //env.catchExceptions(true);

        env.beforeEach(function () {
            addDefaultMatchers(!release).call(env);
            env.addCustomEqualityTester(equalsMethodEqualityTester);
        });
    }
export default customizeJasmine;
