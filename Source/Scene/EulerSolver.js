/*global define*/
define(function() {
    "use strict";

    function EulerSolver() {
    }

    // TODO: adaptive step-size
    EulerSolver.step = function(particleSystem, timeStep) {
        if (particleSystem) {
            timeStep = timeStep || 1.0;

            var derivativeVector = particleSystem.calculateDerivative();
            EulerSolver._scaleVector(derivativeVector, timeStep);

            var stateVector = particleSystem.getState();
            EulerSolver._addVectors(stateVector, derivativeVector);

            particleSystem.setState(stateVector);
            particleSystem.time += timeStep;
        }
    };

    EulerSolver._scaleVector = function(vector, scalar) {
        var length = vector.length;
        for ( var i = 0; i < length; ++i) {
            vector[i] *= scalar;
        }
    };

    EulerSolver._addVectors = function(vector, incrementVector) {
        var length = vector.length;
        for ( var i = 0; i < length; ++i) {
            vector[i] += incrementVector[i];
        }
    };

    // TODO:  Midpoint and 4th-order Runge-Kutta solvers
    return EulerSolver;
});