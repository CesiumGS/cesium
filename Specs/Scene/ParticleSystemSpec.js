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

    it('getters/setters', function() {
        var show = false;
        var forces = [function(p) { p.mass++; }];
        var emitter = new CircleEmitter(10.0);
        var modelMatrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var emitterModelMatrix = new Matrix4(10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0);
        var startColor = Color.MAGENTA;
        var endColor = Color.LAVENDAR_BLUSH;
        var startScale = 19.0;
        var endScale = 20.0;
        var rate = 21.0;
        var bursts = [new ParticleBurst()];
        var loop = false;
        var minimumSpeed = 22.0;
        var maximumSpeed = 23.0;
        var minimumLife = 24.0;
        var maximumLife = 25.0;
        var minimumMass = 26.0;
        var maximumMass = 27.0;
        var image = 'url/to/image';
        var minimumWidth = 28.0;
        var maximumWidth = 29.0;
        var minimumHeight = 30.0;
        var maximumHeight = 31.0;
        var lifeTime = 32.0;

        var p = new ParticleSystem();
        p.show = show;
        p.forces = forces;
        p.emitter = emitter;
        p.modelMatrix = modelMatrix;
        p.emitterModelMatrix = emitterModelMatrix;
        p.startColor = startColor;
        p.endColor = endColor;
        p.startScale = startScale;
        p.endScale = endScale;
        p.rate = rate;
        p.bursts = bursts;
        p.loop = loop;
        p.minimumSpeed = minimumSpeed;
        p.maximumSpeed = maximumSpeed;
        p.minimumLife = minimumLife;
        p.maximumLife = maximumLife;
        p.minimumMass = minimumMass;
        p.maximumMass = maximumMass;
        p.image = image;
        p.minimumWidth = minimumWidth;
        p.maximumWidth = maximumWidth;
        p.minimumHeight = minimumHeight;
        p.maximumHeight = maximumHeight;
        p.lifeTime = lifeTime;

        expect(p.show).toEqual(show);
        expect(p.forces).toEqual(forces);
        expect(p.emitter).toEqual(emitter);
        expect(p.modelMatrix).toEqual(modelMatrix);
        expect(p.emitterModelMatrix).toEqual(emitterModelMatrix);
        expect(p.startColor).toEqual(startColor);
        expect(p.endColor).toEqual(endColor);
        expect(p.startScale).toEqual(startScale);
        expect(p.endScale).toEqual(endScale);
        expect(p.rate).toEqual(rate);
        expect(p.bursts).toEqual(bursts);
        expect(p.loop).toEqual(loop);
        expect(p.minimumSpeed).toEqual(minimumSpeed);
        expect(p.maximumSpeed).toEqual(maximumSpeed);
        expect(p.minimumLife).toEqual(minimumLife);
        expect(p.maximumLife).toEqual(maximumLife);
        expect(p.minimumMass).toEqual(minimumMass);
        expect(p.maximumMass).toEqual(maximumMass);
        expect(p.image).toEqual(image);
        expect(p.minimumWidth).toEqual(minimumWidth);
        expect(p.maximumWidth).toEqual(maximumWidth);
        expect(p.minimumHeight).toEqual(minimumHeight);
        expect(p.maximumHeight).toEqual(maximumHeight);
        expect(p.lifeTime).toEqual(lifeTime);
        expect(p.complete).toBeDefined();
        expect(p.isComplete).toEqual(false);
    });

    it('throws with invalid emitter', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.emitter = undefined;
        }).toThrowDeveloperError();
    });

    it('throws with invalid modelMatrix', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.modelMatrix = undefined;
        }).toThrowDeveloperError();
    });

    it('throws with invalid emitterModelMatrix', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.emitterModelMatrix = undefined;
        }).toThrowDeveloperError();
    });

    it('throws with invalid startColor', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.startColor = undefined;
        }).toThrowDeveloperError();
    });

    it('throws with invalid endColor', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.endColor = undefined;
        }).toThrowDeveloperError();
    });

    it('throws with invalid startScale', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.startScale = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid endScale', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.endScale = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid rate', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.rate = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid minimumSpeed', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.minimumSpeed = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid maximumSpeed', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.maximumSpeed = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid minimumLife', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.minimumLife = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid maximumLife', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.maximumLife = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid minimumMass', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.minimumMass = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid maximumMass', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.maximumMass = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid minimumWidth', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.minimumWidth = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid maximumWidth', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.maximumWidth = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid minimumHeight', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.minimumHeight = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid maximumHeight', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.maximumHeight = -1.0;
        }).toThrowDeveloperError();
    });

    it('throws with invalid lifeTime', function() {
        var p = new ParticleSystem();
        expect(function() {
            p.lifeTime = -1.0;
        }).toThrowDeveloperError();
    });

    it('renders', function() {
        scene.primitives.add(new ParticleSystem({
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
