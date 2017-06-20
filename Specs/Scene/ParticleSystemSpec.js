/*global defineSuite*/
defineSuite([
        'Scene/ParticleSystem',
        'Core/Cartesian3',
        'Core/Color',
        'Core/loadImage',
        'Core/Matrix4',
        'Scene/CircleEmitter',
        'Scene/ParticleBurst',
        'Specs/createScene'
    ], function(
        ParticleSystem,
        Cartesian3,
        Color,
        loadImage,
        Matrix4,
        CircleEmitter,
        ParticleBurst,
        createScene) {
    'use strict';

    var scene;
    var greenImage;

    beforeAll(function() {
        scene = createScene();
        return loadImage('./Data/Images/Green2x2.png').then(function(result) {
            greenImage = result;
        });
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('default constructor', function() {
        var p = new ParticleSystem();
        expect(p.show).toEqual(true);
        expect(p.forces).toBeUndefined();
        expect(p.emitter).toBeDefined();
        expect(p.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(p.emitterModelMatrix).toEqual(Matrix4.IDENTITY);
        expect(p.startColor).toEqual(Color.WHITE);
        expect(p.endColor).toEqual(Color.WHITE);
        expect(p.startScale).toEqual(1.0);
        expect(p.endScale).toEqual(1.0);
        expect(p.rate).toEqual(5.0);
        expect(p.bursts).toBeUndefined();
        expect(p.loop).toEqual(true);
        expect(p.minimumSpeed).toEqual(1.0);
        expect(p.maximumSpeed).toEqual(1.0);
        expect(p.minimumLife).toEqual(5.0);
        expect(p.maximumLife).toEqual(5.0);
        expect(p.minimumMass).toEqual(1.0);
        expect(p.maximumMass).toEqual(1.0);
        expect(p.image).toBeUndefined();
        expect(p.minimumWidth).toEqual(1.0);
        expect(p.maximumWidth).toEqual(1.0);
        expect(p.minimumHeight).toEqual(1.0);
        expect(p.maximumHeight).toEqual(1.0);
        expect(p.lifeTime).toEqual(Number.MAX_VALUE);
        expect(p.complete).toBeDefined();
        expect(p.isComplete).toEqual(false);
    });

    it('constructor', function() {
        var options = {
            show : false,
            forces : [function(p) { p.mass++; }],
            emitter : new CircleEmitter(10.0),
            modelMatrix : new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0),
            emitterModelMatrix : new Matrix4(10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0),
            startColor : Color.MAGENTA,
            endColor : Color.LAVENDAR_BLUSH,
            startScale : 19.0,
            endScale : 20.0,
            rate : 21.0,
            bursts : [new ParticleBurst()],
            loop : false,
            minimumSpeed : 22.0,
            maximumSpeed : 23.0,
            minimumLife : 24.0,
            maximumLife : 25.0,
            minimumMass : 26.0,
            maximumMass : 27.0,
            image : 'url/to/image',
            minimumWidth : 28.0,
            maximumWidth : 29.0,
            minimumHeight : 30.0,
            maximumHeight : 31.0,
            lifeTime : 32.0
        };
        var p = new ParticleSystem(options);
        expect(p.show).toEqual(options.show);
        expect(p.forces).toEqual(options.forces);
        expect(p.emitter).toEqual(options.emitter);
        expect(p.modelMatrix).toEqual(options.modelMatrix);
        expect(p.emitterModelMatrix).toEqual(options.emitterModelMatrix);
        expect(p.startColor).toEqual(options.startColor);
        expect(p.endColor).toEqual(options.endColor);
        expect(p.startScale).toEqual(options.startScale);
        expect(p.endScale).toEqual(options.endScale);
        expect(p.rate).toEqual(options.rate);
        expect(p.bursts).toEqual(options.bursts);
        expect(p.loop).toEqual(options.loop);
        expect(p.minimumSpeed).toEqual(options.minimumSpeed);
        expect(p.maximumSpeed).toEqual(options.maximumSpeed);
        expect(p.minimumLife).toEqual(options.minimumLife);
        expect(p.maximumLife).toEqual(options.maximumLife);
        expect(p.minimumMass).toEqual(options.minimumMass);
        expect(p.maximumMass).toEqual(options.maximumMass);
        expect(p.image).toEqual(options.image);
        expect(p.minimumWidth).toEqual(options.minimumWidth);
        expect(p.maximumWidth).toEqual(options.maximumWidth);
        expect(p.minimumHeight).toEqual(options.minimumHeight);
        expect(p.maximumHeight).toEqual(options.maximumHeight);
        expect(p.lifeTime).toEqual(options.lifeTime);
        expect(p.complete).toBeDefined();
        expect(p.isComplete).toEqual(false);
    });

    it('renders', function() {
        var p = scene.primitives.add(new ParticleSystem({
            image : greenImage,
            emitter : new CircleEmitter(1.0),
            rate : 10000,
            width : 100,
            height : 100
        }));
        scene.camera.position = new Cartesian3(0.0, 0.0, 20.0);
        scene.camera.direction = new Cartesian3(0.0, 0.0, -1.0);
        scene.camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        scene.camera.right = Cartesian3.clone(Cartesian3.UNIT_X);

        // no particles emitted at time 0
        scene.renderForSpecs();
        // billboard collection needs to create texture atlas
        scene.renderForSpecs();
        // finally render
        expect(scene).toRender([0, 255, 0, 255]);
    });

    it('isDestroyed', function() {
        var p = new ParticleSystem();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });
});
