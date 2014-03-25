/**
 * @license
 * Knockout ES5 plugin - https://github.com/SteveSanderson/knockout-es5
 * Copyright (c) Steve Sanderson
 * MIT license
 */

define(function() {
    'use strict';

    var OBSERVABLES_PROPERTY = '__knockoutObservables';
    var SUBSCRIBABLE_PROPERTY = '__knockoutSubscribable';

    // Model tracking
    // --------------
    //
    // This is the central feature of Knockout-ES5. We augment model objects by converting properties
    // into ES5 getter/setter pairs that read/write an underlying Knockout observable. This means you can
    // use plain JavaScript syntax to read/write the property while still getting the full benefits of
    // Knockout's automatic dependency detection and notification triggering.
    //
    // For comparison, here's Knockout ES3-compatible syntax:
    //
    //     var firstNameLength = myModel.user().firstName().length; // Read
    //     myModel.user().firstName('Bert'); // Write
    //
    // ... versus Knockout-ES5 syntax:
    //
    //     var firstNameLength = myModel.user.firstName.length; // Read
    //     myModel.user.firstName = 'Bert'; // Write

    // `ko.track(model)` converts each property on the given model object into a getter/setter pair that
    // wraps a Knockout observable. Optionally specify an array of property names to wrap; otherwise we
    // wrap all properties. If any of the properties are already observables, we replace them with
    // ES5 getter/setter pairs that wrap your original observable instances. In the case of readonly
    // ko.computed properties, we simply do not define a setter (so attempted writes will be ignored,
    // which is how ES5 readonly properties normally behave).
    //
    // By design, this does *not* recursively walk child object properties, because making literally
    // everything everywhere independently observable is usually unhelpful. When you do want to track
    // child object properties independently, define your own class for those child objects and put
    // a separate ko.track call into its constructor --- this gives you far more control.
    function track(obj, propertyNames) {
        if (!obj /*|| typeof obj !== 'object'*/) {
            throw new Error('When calling ko.track, you must pass an object as the first parameter.');
        }

        var ko = this,
            allObservablesForObject = getAllObservablesForObject(obj, true);
        propertyNames = propertyNames || Object.getOwnPropertyNames(obj);

        propertyNames.forEach(function(propertyName) {
            // Skip storage properties
            if (propertyName === OBSERVABLES_PROPERTY || propertyName === SUBSCRIBABLE_PROPERTY) {
                return;
            }
            // Skip properties that are already tracked
            if (propertyName in allObservablesForObject) {
                return;
            }

            var origValue = obj[propertyName],
                isArray = origValue instanceof Array,
                observable = ko.isObservable(origValue) ? origValue
                                              : isArray ? ko.observableArray(origValue)
                                                        : ko.observable(origValue);

            Object.defineProperty(obj, propertyName, {
                configurable: true,
                enumerable: true,
                get: observable,
                set: ko.isWriteableObservable(observable) ? observable : undefined
            });

            allObservablesForObject[propertyName] = observable;

            if (isArray) {
                notifyWhenPresentOrFutureArrayValuesMutate(ko, observable);
            }
        });

        return obj;
    }

    // Gets or creates the hidden internal key-value collection of observables corresponding to
    // properties on the model object.
    function getAllObservablesForObject(obj, createIfNotDefined) {
        var result = obj[OBSERVABLES_PROPERTY];
        if (!result && createIfNotDefined) {
            result = {};
            Object.defineProperty(obj, OBSERVABLES_PROPERTY, {
                value : result
            });
        }
        return result;
    }

    // Computed properties
    // -------------------
    //
    // The preceding code is already sufficient to upgrade ko.computed model properties to ES5
    // getter/setter pairs (or in the case of readonly ko.computed properties, just a getter).
    // These then behave like a regular property with a getter function, except they are smarter:
    // your evaluator is only invoked when one of its dependencies changes. The result is cached
    // and used for all evaluations until the next time a dependency changes).
    //
    // However, instead of forcing developers to declare a ko.computed property explicitly, it's
    // nice to offer a utility function that declares a computed getter directly.

    // Implements `ko.defineProperty`
    function defineComputedProperty(obj, propertyName, evaluatorOrOptions) {
        var ko = this,
            computedOptions = { owner: obj, deferEvaluation: true };

        if (typeof evaluatorOrOptions === 'function') {
            computedOptions.read = evaluatorOrOptions;
        } else {
            if ('value' in evaluatorOrOptions) {
                throw new Error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.');
            }

            if (typeof evaluatorOrOptions.get !== 'function') {
                throw new Error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".');
            }

            computedOptions.read = evaluatorOrOptions.get;
            computedOptions.write = evaluatorOrOptions.set;
        }

        obj[propertyName] = ko.computed(computedOptions);
        track.call(ko, obj, [propertyName]);
        return obj;
    }

    // Array handling
    // --------------
    //
    // Arrays are special, because unlike other property types, they have standard mutator functions
    // (`push`/`pop`/`splice`/etc.) and it's desirable to trigger a change notification whenever one of
    // those mutator functions is invoked.
    //
    // Traditionally, Knockout handles this by putting special versions of `push`/`pop`/etc. on observable
    // arrays that mutate the underlying array and then trigger a notification. That approach doesn't
    // work for Knockout-ES5 because properties now return the underlying arrays, so the mutator runs
    // in the context of the underlying array, not any particular observable:
    //
    //     // Operates on the underlying array value
    //     myModel.someCollection.push('New value');
    //
    // To solve this, Knockout-ES5 detects array values, and modifies them as follows:
    //  1. Associates a hidden subscribable with each array instance that it encounters
    //  2. Intercepts standard mutators (`push`/`pop`/etc.) and makes them trigger the subscribable
    // Then, for model properties whose values are arrays, the property's underlying observable
    // subscribes to the array subscribable, so it can trigger a change notification after mutation.

    // Given an observable that underlies a model property, watch for any array value that might
    // be assigned as the property value, and hook into its change events
    function notifyWhenPresentOrFutureArrayValuesMutate(ko, observable) {
        var watchingArraySubscription = null;
        ko.computed(function () {
            // Unsubscribe to any earlier array instance
            if (watchingArraySubscription) {
                watchingArraySubscription.dispose();
                watchingArraySubscription = null;
            }

            // Subscribe to the new array instance
            var newArrayInstance = observable();
            if (newArrayInstance instanceof Array) {
                watchingArraySubscription = startWatchingArrayInstance(ko, observable, newArrayInstance);
            }
        });
    }

    // Listens for array mutations, and when they happen, cause the observable to fire notifications.
    // This is used to make model properties of type array fire notifications when the array changes.
    // Returns a subscribable that can later be disposed.
    function startWatchingArrayInstance(ko, observable, arrayInstance) {
        var subscribable = getSubscribableForArray(ko, arrayInstance);
        return subscribable.subscribe(observable);
    }

    // Gets or creates a subscribable that fires after each array mutation
    function getSubscribableForArray(ko, arrayInstance) {
        var subscribable = arrayInstance[SUBSCRIBABLE_PROPERTY];
        if (!subscribable) {
            subscribable = new ko.subscribable();
            Object.defineProperty(arrayInstance, SUBSCRIBABLE_PROPERTY, {
                value : subscribable
            });

            var notificationPauseSignal = {};
            wrapStandardArrayMutators(arrayInstance, subscribable, notificationPauseSignal);
            addKnockoutArrayMutators(ko, arrayInstance, subscribable, notificationPauseSignal);
        }

        return subscribable;
    }

    // After each array mutation, fires a notification on the given subscribable
    function wrapStandardArrayMutators(arrayInstance, subscribable, notificationPauseSignal) {
        ['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'].forEach(function(fnName) {
            var origMutator = arrayInstance[fnName];
            arrayInstance[fnName] = function() {
                var result = origMutator.apply(this, arguments);
                if (notificationPauseSignal.pause !== true) {
                    subscribable.notifySubscribers(this);
                }
                return result;
            };
        });
    }

    // Adds Knockout's additional array mutation functions to the array
    function addKnockoutArrayMutators(ko, arrayInstance, subscribable, notificationPauseSignal) {
        ['remove', 'removeAll', 'destroy', 'destroyAll', 'replace'].forEach(function(fnName) {
            // Make it a non-enumerable property for consistency with standard Array functions
            Object.defineProperty(arrayInstance, fnName, {
                enumerable: false,
                value: function() {
                    var result;

                    // These additional array mutators are built using the underlying push/pop/etc.
                    // mutators, which are wrapped to trigger notifications. But we don't want to
                    // trigger multiple notifications, so pause the push/pop/etc. wrappers and
                    // delivery only one notification at the end of the process.
                    notificationPauseSignal.pause = true;
                    try {
                        // Creates a temporary observableArray that can perform the operation.
                        result = ko.observableArray.fn[fnName].apply(ko.observableArray(arrayInstance), arguments);
                    }
                    finally {
                        notificationPauseSignal.pause = false;
                    }
                    subscribable.notifySubscribers(arrayInstance);
                    return result;
                }
            });
        });
    }

    // Static utility functions
    // ------------------------
    //
    // Since Knockout-ES5 sets up properties that return values, not observables, you can't
    // trivially subscribe to the underlying observables (e.g., `someProperty.subscribe(...)`),
    // or tell them that object values have mutated, etc. To handle this, we set up some
    // extra utility functions that can return or work with the underlying observables.

    // Returns the underlying observable associated with a model property (or `null` if the
    // model or property doesn't exist, or isn't associated with an observable). This means
    // you can subscribe to the property, e.g.:
    //
    //     ko.getObservable(model, 'propertyName')
    //       .subscribe(function(newValue) { ... });
    function getObservable(obj, propertyName) {
        if (!obj /*|| typeof obj !== 'object'*/) {
            return null;
        }

        var allObservablesForObject = getAllObservablesForObject(obj, false);
        return (allObservablesForObject && allObservablesForObject[propertyName]) || null;
    }

    // Causes a property's associated observable to fire a change notification. Useful when
    // the property value is a complex object and you've modified a child property.
    function valueHasMutated(obj, propertyName) {
        var observable = getObservable(obj, propertyName);

        if (observable) {
            observable.valueHasMutated();
        }
    }

    // Extends a Knockout instance with Knockout-ES5 functionality
    function attachToKo(ko) {
        ko.track = track;
        ko.getObservable = getObservable;
        ko.valueHasMutated = valueHasMutated;
        ko.defineProperty = defineComputedProperty;
    }

    return {
        attachToKo : attachToKo
    };
});