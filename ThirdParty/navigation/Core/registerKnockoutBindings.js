import SvgPathBindingHandler from '../../../Source/Widgets/SvgPathBindingHandler.js';
import Knockout from '../../../Source/ThirdParty/knockout.js';
import KnockoutMarkdownBinding from './KnockoutMarkdownBinding.js';
import KnockoutHammerBinding from './KnockoutHammerBinding.js';

var registerKnockoutBindings = function () {
    SvgPathBindingHandler.register(Knockout);
    //KnockoutMarkdownBinding.register(Knockout);
    //KnockoutHammerBinding.register(Knockout);

    Knockout.bindingHandlers.embeddedComponent = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            var component = Knockout.unwrap(valueAccessor());
            component.show(element);
            return { controlsDescendantBindings: true };
        },
        update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        }
    };
};

export default registerKnockoutBindings;


