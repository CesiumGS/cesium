(function() {
    //
    // Imports
    //

    if (!jasmineNode) {
        var jasmineNode = {};
    }

    //
    // Helpers
    //
    function noop() {
    }

    jasmineNode.ANSIColors = {
        pass : function() {
            return '\033[32m';
        }, // Green
        fail : function() {
            return '\033[31m';
        }, // Red
        neutral : function() {
            return '\033[0m';
        } // Normal
    };

    jasmineNode.NoColors = {
        pass : function() {
            return '';
        },
        fail : function() {
            return '';
        },
        neutral : function() {
            return '';
        }
    };

    jasmineNode.TerminalReporter = function(config) {
        this.print_ = config.print || print;
        this.color_ = config.color ? jasmineNode.ANSIColors : jasmineNode.NoColors;

        this.started_ = false;
        this.finished_ = false;

        this.callback_ = config.onComplete || false;

        this.suites_ = [];
        this.specResults_ = {};
        this.failures_ = {};
        this.failures_.length = 0;
    };

    jasmineNode.TerminalReporter.prototype = {
        reportRunnerStarting : function(runner) {
            this.started_ = true;
            this.startedAt = new Date();
            var suites = runner.topLevelSuites();
            for ( var i = 0; i < suites.length; i++) {
                var suite = suites[i];
                this.suites_.push(this.summarize_(suite));
            }
        },

        summarize_ : function(suiteOrSpec) {
            var isSuite = suiteOrSpec instanceof jasmine.Suite;

            // We could use a separate object for suite and spec
            var summary = {
                id : suiteOrSpec.id,
                name : suiteOrSpec.description,
                type : isSuite ? 'suite' : 'spec',
                suiteNestingLevel : 0,
                children : []
            };

            if (isSuite) {
                var calculateNestingLevel = function(examinedSuite) {
                    var nestingLevel = 0;
                    while (examinedSuite.parentSuite !== null) {
                        nestingLevel += 1;
                        examinedSuite = examinedSuite.parentSuite;
                    }
                    return nestingLevel;
                };

                summary.suiteNestingLevel = calculateNestingLevel(suiteOrSpec);

                var children = suiteOrSpec.children();
                for ( var i = 0; i < children.length; i++) {
                    summary.children.push(this.summarize_(children[i]));
                }
            }

            return summary;
        },

        // This is heavily influenced by Jasmine's Html/Trivial Reporter
        reportRunnerResults : function(runner) {
            this.reportFailures_();

            var results = runner.results();
            var resultColor = (results.failedCount > 0) ? this.color_.fail() : this.color_.pass();

            var specs = runner.specs();
            var specCount = specs.length;

            var message = "\n\nFinished in "
                    + ((new Date().getTime() - this.startedAt.getTime()) / 1000)
                    + " seconds";
            this.printLine_(message);

            // This is what jasmine-html.js has
            // message = "" + specCount + " spec" + ( specCount === 1 ? "" : "s") + ", " + results.failedCount + " failure" + ((results.failedCount === 1) ? "" : "s");

            this.printLine_(this.stringWithColor_(this.printRunnerResults_(runner), resultColor));

            this.finished_ = true;
            if (this.callback_) {
                this.callback_(runner);
            }
        },

        reportFailures_ : function() {
            if (this.failures_.length === 0) {
                return;
            }

            var indent = '  ', failure;
            this.printLine_('\n');

            this.print_('Failures:');

            for ( var suite in this.failures_) {
                if (this.failures_.hasOwnProperty(suite) && suite !== "length") {
                    this.printLine_('\n');
                    this.printLine_(suite);
                    failures = this.failures_[suite];
                    for ( var i = 0; i < failures.length; i++) {
                        failure = failures[i];
                        this.printLine_('\n');
                        this.printLine_(indent + (i + 1) + ') ' + failure.spec);
                        this.printLine_(indent + 'Message:');
                        this.printLine_(indent + indent + this.stringWithColor_(failure.message, this.color_.fail()));
                        this.printLine_(indent + 'Stacktrace:');
                        this.print_(indent + indent + failure.stackTrace);
                    }
                }
            }

        },

        reportSuiteResults : function(suite) {
            // Not used in this context
        },

        reportSpecResults : function(spec) {
            var result = spec.results();
            var msg = '';
            if (result.passed()) {
                msg = this.stringWithColor_('.', this.color_.pass());
                // } else if (result.skipped) { TODO: Research why "result.skipped" returns false when "xit" is called on a spec?
                // msg = (colors) ? (ansi.yellow + '*' + ansi.none) : '*';
            } else {
                msg = this.stringWithColor_('F', this.color_.fail());
                this.addFailureToFailures_(spec);
            }
            this.spec_results += msg;
            this.print_(msg);
        },

        addFailureToFailures_ : function(spec) {
            var result = spec.results();
            var failureItem = null;
            var suite = spec.suite.getFullName();
            var failures = null;
            var items_length = result.items_.length;
            for ( var i = 0; i < items_length; i++) {
                if (result.items_[i].passed_ === false) {
                    failureItem = result.items_[i];
                    var failure = {
                        spec : spec.description,
                        message : failureItem.message,
                        stackTrace : failureItem.trace.stack
                    };
                    failures = this.failures_[suite];
                    if (!failures) {
                        this.failures_[suite] = [];
                    }
                    this.failures_[suite].push(failure);
                    this.failures_.length++;
                }
            }
        },

        printRunnerResults_ : function(runner) {
            var results = runner.results();
            var specs = runner.specs();
            var msg = '';
            msg += specs.length + ' test' + ((specs.length === 1) ? '' : 's') + ', ';
            msg += results.totalCount + ' assertion' + ((results.totalCount === 1) ? '' : 's') + ', ';
            msg += results.failedCount + ' failure' + ((results.failedCount === 1) ? '' : 's') + '\n';
            return msg;
        },

        // Helper Methods //
        stringWithColor_ : function(stringValue, color) {
            return (color || this.color_.neutral()) + stringValue + this.color_.neutral();
        },

        printLine_ : function(stringValue) {
            this.print_(stringValue);
            this.print_('\n');
        }
    };

    // ***************************************************************
    // TerminalVerboseReporter uses the TerminalReporter's constructor
    // ***************************************************************
    jasmineNode.TerminalVerboseReporter = function(config) {
        jasmineNode.TerminalReporter.call(this, config);
        // The extra field in this object
        this.indent_ = 0;
    };

    jasmineNode.TerminalVerboseReporter.prototype = {
        reportSpecResults : function(spec) {
            if (spec.results().failedCount > 0) {
                this.addFailureToFailures_(spec);
            }

            this.specResults_[spec.id] = {
                messages : spec.results().getItems(),
                result : spec.results().failedCount > 0 ? 'failed' : 'passed'
            };
        },

        reportRunnerResults : function(runner) {
            var messages = new Array();
            this.buildMessagesFromResults_(messages, this.suites_);

            var messages_length = messages.length;
            for ( var i = 0; i < messages_length - 1; i++) {
                this.printLine_(messages[i]);
            }

            this.print_(messages[messages_length - 1]);

            // Call the parent object's method
            jasmineNode.TerminalReporter.prototype.reportRunnerResults.call(this, runner);
        },

        buildMessagesFromResults_ : function(messages, results) {
            var element, specResult, specIndentSpaces, msg = '';

            var results_length = results.length;
            for ( var i = 0; i < results_length; i++) {
                element = results[i];

                if (element.type === 'spec') {
                    specResult = this.specResults_[element.id.toString()];

                    specIndentSpaces = this.indent_ + 2;
                    if (specResult.result === 'passed') {
                        msg = this.stringWithColor_(this.indentMessage_(element.name, specIndentSpaces), this.color_.pass());
                    } else {
                        msg = this.stringWithColor_(this.indentMessage_(element.name, specIndentSpaces), this.color_.fail());
                    }

                    messages.push(msg);
                } else {
                    this.indent_ = element.suiteNestingLevel * 2;

                    messages.push('');
                    messages.push(this.indentMessage_(element.name,this.indent_));
                }

                this.buildMessagesFromResults_(messages, element.children);
            }
        },

        indentMessage_ : function(message, indentCount) {
            var _indent = '';
            for ( var i = 0; i < indentCount; i++) {
                _indent += ' ';
            }
            return (_indent + message);
        }
    };

    // Inherit from TerminalReporter
    jasmineNode.TerminalVerboseReporter.prototype.__proto__ = jasmineNode.TerminalReporter.prototype;

    //
    // Exports
    //
    exports.jasmineNode = jasmineNode;
})();