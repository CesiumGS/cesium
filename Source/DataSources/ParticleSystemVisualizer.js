/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        '../Scene/CircleEmitter',
        '../Scene/ParticleSystem',
        './BoundingSphereState',
        './Property'
    ], function(
        AssociativeArray,
        BoundingSphere,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        Matrix4,
        CircleEmitter,
        ParticleSystem,
        BoundingSphereState,
        Property) {
    'use strict';

    var defaultStartScale = 1.0;
    var defaultEndScale = 1.0;
    var defaultStartColor = Color.WHITE;
    var defaultEndColor = Color.WHITE;
    var defaultRate = 5.0;
    var defaultMinimumWidth = 16.0;
    var defaultMinimumHeight = 16.0;
    var defaultMaximumWidth = 16.0;
    var defaultMaximumHeight = 16.0;
    var defaultLifeTime = Number.MAX_VALUE;
    var defaultLoop = true;
    var defaultEmitterModelMatrix = Matrix4.IDENTITY;
    var defaultEmitter = new CircleEmitter({radius: 0.5});
    var defaultMinimumSpeed = 5.0;
    var defaultMaximumSpeed = 5.0;
    var defaultMinimumLife = 5.0;
    var defaultMaximumLife = 5.0;

    var modelMatrixScratch = new Matrix4();

    /**
     * A {@link Visualizer} which maps {@link Entity#particleSystem} to a {@link ParticleSystem}.
     * @alias ParticleSystemVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    function ParticleSystemVisualizer(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(ParticleSystemVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._primitives = scene.primitives;
        this._entityCollection = entityCollection;
        this._particleHash = {};
        this._entitiesToVisualize = new AssociativeArray();
        this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
    }

    /**
     * Updates particle systems created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    ParticleSystemVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entities = this._entitiesToVisualize.values;
        var particleHash = this._particleHash;
        var primitives = this._primitives;

        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var particleSystemGraphics = entity._particleSystem;

            var particleSystem = particleHash[entity.id];
            var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(particleSystemGraphics._show, time, true);

            var modelMatrix;
            if (show) {
                modelMatrix = entity._getModelMatrix(time, modelMatrixScratch);
                show = defined(modelMatrix);
            }

            if (!defined(particleSystem)) {
                particleSystem = new ParticleSystem();
                particleSystem.id = entity;
                primitives.add(particleSystem);
                particleHash[entity.id] = particleSystem;
            }

            particleSystem.show = show;
            particleSystem.image = Property.getValueOrUndefined(particleSystemGraphics._image, time);
            particleSystem.emitter = Property.getValueOrDefault(particleSystemGraphics._emitter, time, defaultEmitter);
            particleSystem.startScale = Property.getValueOrDefault(particleSystemGraphics._startScale, time, defaultStartScale);
            particleSystem.endScale = Property.getValueOrDefault(particleSystemGraphics._endScale, time, defaultEndScale);
            particleSystem.startColor = Property.getValueOrDefault(particleSystemGraphics._startColor, time, defaultStartColor);
            particleSystem.endColor = Property.getValueOrDefault(particleSystemGraphics._endColor, time, defaultEndColor);
            particleSystem.rate = Property.getValueOrDefault(particleSystemGraphics._rate, time, defaultRate);
            particleSystem.minimumWidth = Property.getValueOrDefault(particleSystemGraphics._minimumWidth, time, defaultMinimumWidth);
            particleSystem.maximumWidth = Property.getValueOrDefault(particleSystemGraphics._maximumWidth, time, defaultMaximumWidth);
            particleSystem.minimumHeight = Property.getValueOrDefault(particleSystemGraphics._minimumHeight, time, defaultMinimumHeight);
            particleSystem.maximumHeight = Property.getValueOrDefault(particleSystemGraphics._maximumHeight, time, defaultMaximumHeight);
            particleSystem.minimumSpeed = Property.getValueOrDefault(particleSystemGraphics._minimumSpeed, time, defaultMinimumSpeed);
            particleSystem.maximumSpeed = Property.getValueOrDefault(particleSystemGraphics._maximumSpeed, time, defaultMaximumSpeed);
            particleSystem.minimumLife = Property.getValueOrDefault(particleSystemGraphics._minimumLife, time, defaultMinimumLife);
            particleSystem.maximumLife = Property.getValueOrDefault(particleSystemGraphics._maximumLife, time, defaultMaximumLife);
            particleSystem.lifeTime = Property.getValueOrDefault(particleSystemGraphics._lifeTime, time, defaultLifeTime);
            particleSystem.loop = Property.getValueOrDefault(particleSystemGraphics._loop, time, defaultLoop);
            particleSystem.emitterModelMatrix = Property.getValueOrDefault(particleSystemGraphics._emitterModelMatrix, time, defaultEmitterModelMatrix);
            particleSystem.bursts = Property.getValueOrUndefined(particleSystemGraphics._bursts, time);
            particleSystem.forces = Property.getValueOrUndefined(particleSystemGraphics._forces, time);
            if (modelMatrix) {
                particleSystem.modelMatrix = modelMatrix;
            }
        }

        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    ParticleSystemVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    ParticleSystemVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(ParticleSystemVisualizer.prototype._onCollectionChanged, this);
        var entities = this._entitiesToVisualize.values;
        var particleHash = this._particleHash;
        var primitives = this._primitives;
        for (var i = entities.length - 1; i > -1; i--) {
            removeParticleSystem(this, entities[i], particleHash, primitives);
        }
        return destroyObject(this);
    };

    /**
     * Computes a bounding sphere which encloses the visualization produced for the specified entity.
     * The bounding sphere is in the fixed frame of the scene's globe.
     *
     * @param {Entity} entity The entity whose bounding sphere to compute.
     * @param {BoundingSphere} result The bounding sphere onto which to store the result.
     * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
     *                       BoundingSphereState.PENDING if the result is still being computed, or
     *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
     * @private
     */
    ParticleSystemVisualizer.prototype.getBoundingSphere = function(entity, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var particleSystem = this._particleHash[entity.id];
        if (!defined(particleSystem) || !particleSystem.show) {
            return BoundingSphereState.FAILED;
        }

        Matrix4.multiplyByPoint(particleSystem.modelMatrix, Cartesian3.ZERO, result.center);
        result.radius = 0.0;
        return BoundingSphereState.DONE;
    };

    /**
     * @private
     */
    ParticleSystemVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var entities = this._entitiesToVisualize;
        var particleHash = this._particleHash;
        var primitives = this._primitives;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._particleSystem) && defined(entity._position)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._particleSystem) && defined(entity._position)) {
                entities.set(entity.id, entity);
            } else {
                removeParticleSystem(this, entity, particleHash, primitives);
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            removeParticleSystem(this, entity, particleHash, primitives);
            entities.remove(entity.id);
        }
    };

    function removeParticleSystem(visualizer, entity, particleHash, primitives) {
        var particleSystem = particleHash[entity.id];
        if (defined(particleSystem)) {
            primitives.removeAndDestroy(particleSystem);
            delete particleHash[entity.id];
        }
    }

    return ParticleSystemVisualizer;
});
