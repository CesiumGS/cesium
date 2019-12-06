///*global require*/
//define([
//    'markdown-it-sanitizer',
//    'markdown-it'
//], function (
//    MarkdownItSanitizer,
//    MarkdownIt) {
//    'use strict';
//
//    var htmlTagRegex = /<html(.|\s)*>(.|\s)*<\/html>/im;
//
//    var md = new MarkdownIt({
//        html: true,
//        linkify: true
//    });
//
//    md.use(MarkdownItSanitizer, {
//        imageClass: '',
//        removeUnbalanced: false,
//        removeUnknown: false
//    });
//
//    var KnockoutMarkdownBinding = {
//        register: function (Knockout) {
//            Knockout.bindingHandlers.markdown = {
//                'init': function () {
//                    // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
//                    return { 'controlsDescendantBindings': true };
//                },
//                'update': function (element, valueAccessor) {
//                    // Remove existing children of this element.
//                    while (element.firstChild) {
//                        Knockout.removeNode(element.firstChild);
//                    }
//
//                    var rawText = Knockout.unwrap(valueAccessor());
//
//                    // If the text contains an <html> tag, don't try to interpret it as Markdown because
//                    // we'll probably break it in the process.
//                    var html;
//                    if (htmlTagRegex.test(rawText)) {
//                        html = rawText;
//                    } else {
//                        html = md.render(rawText);
//                    }
//
//                    var nodes = Knockout.utils.parseHtmlFragment(html, element);
//                    element.className = element.className + ' markdown';
//
//                    for (var i = 0; i < nodes.length; ++i) {
//                        var node = nodes[i];
//                        setAnchorTargets(node);
//                        element.appendChild(node);
//                    }
//                }
//            };
//        }
//    };
//
//    function setAnchorTargets(element) {
//        if (element instanceof HTMLAnchorElement) {
//            element.target = '_blank';
//        }
//
//        if (element.childNodes && element.childNodes.length > 0) {
//            for (var i = 0; i < element.childNodes.length; ++i) {
//                setAnchorTargets(element.childNodes[i]);
//            }
//        }
//    }
//
//    return KnockoutMarkdownBinding;
//});

export default null;

