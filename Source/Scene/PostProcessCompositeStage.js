define([
        '../Core/Check',
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        Check,
        defineProperties,
        destroyObject) {
    'use strict';

    /**
     * A post process stage that combines multiple {@link PostProcessStage}.
     *
     * @param {PostProcessStage[]} stages An array of post process stages.
     *
     * @alias PostProcessCompositeStage
     * @constructor
     */
    function PostProcessCompositeStage(stages) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('stages', stages);
        Check.typeOf.number.greaterThan('stages.length', stages.length, 0);
        //>>includeEnd('debug');

        this._stages = stages;

        /**
         * @inheritDoc PostProcessStage#show
         */
        this.show = true;
    }

    defineProperties(PostProcessCompositeStage.prototype, {
        /**
         * @inheritDoc PostProcessStage#ready
         */
        ready : {
            get : function() {
                var stages = this._stages;
                var length = stages.length;
                for (var i = 0; i < length; ++i) {
                    if (!stages[i].ready) {
                        return false;
                    }
                }
                return true;
            }
        },
        /**
         * The inner stages used in this composite stage.
         * @memberof PostProcessCompositeStage.prototype
         * @type {PostProcessStage[]}
         */
        stages : {
            get : function() {
                return this._stages;
            }
        }
    });

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessCompositeStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessCompositeStage.prototype.destroy = function() {
        var stages = this._stages;
        var length = stages.length;
        for (var i = 0; i < length; ++i) {
            stages[i].destroy();
        }

        return destroyObject(this);
    };

    return PostProcessCompositeStage;
});
