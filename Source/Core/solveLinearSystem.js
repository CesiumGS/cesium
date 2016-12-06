/*global define*/
define([
    './defaultValue',
    './defined',
    './DeveloperError'
], function(
    defaultValue,
    defined,
    DeveloperError) {
    'use strict';

    var LinearSolveMethod = {
        GAUSSIAN_ELIMINATION : 0,
        QR_DECOMPOSITION : 1
    };

    function matrixMultiply(rowA, colA, colB, matrixA, matrixB, matrixC) {
        var i;
        var j;
        var k;

        for (i = 0; i < colA; i++) {
            for (j = 0; j < colB; j++) {
                for (k = 0, matrixC[i][j] = 0.0; k < rowA; k++) {
                    matrixC[i][j] += matrixA[k][i] * matrixB[k][j];
                }
            }
        }
    }

    function identityMatrix(dim, matrix) {
        for (var i = 0; i < dim; i++) {
            for (var j = 0; j < dim; j++) {
                matrix[i][j] = 0.0;
            }
            matrix[i][i] = 1.0;
        }
        return matrix;
    }

    function decomposeQr(dim, matrixA, matrixQ) {
        var i;
        var j;
        var ir;
        var fac1;
        var sr;
        var sign;
        var p = new Array(dim);
        var q = new Array(dim);
        var u = new Array(dim);

        for (i = 0; i < dim; i++) {
            matrixQ = identityMatrix(dim, matrixQ);
        }

        for (ir = 0; ir < (dim - 1); ir++) {
            for (sr = 0.0, i = ir + 1; i < dim; i++) {
                sr += matrixA[i][ir] * matrixA[i][ir];
                u[i] = matrixA[i][ir];
            }

            if (sr > 0) {
                sr = Math.sqrt(sr + matrixA[ir][ir] * matrixA[ir][ir]);
                sign = (matrixA[ir][ir] > 0.0) ? 1.0 : -1.0;
                fac1 = (sr + sign * matrixA[ir][ir]) * sr;
                u[ir] = matrixA[ir][ir] + sign * sr;

                for (i = ir; i < dim; p[i] /= fac1, i++) {
                    for (j = ir, p[i] = 0.0; j < dim; j++) {
                        p[i] += matrixA[j][i] * u[j];
                    }
                }

                for (i = 0; i < dim; i++) {
                    for (j = ir, q[i] = 0.0; j < dim; j++) {
                        if (i >= ir) {
                            matrixA[i][j] -= u[i] * p[j];
                        }
                        q[i] += matrixQ[i][j] * u[j];
                    }

                    q[i] /= fac1;

                    for (j = ir; j < dim; j++) {
                        matrixQ[i][j] -= q[i] * u[j];
                    }
                }
            }
        }

        for (i = 1; i < dim; i++) { // clear lower triangle
            var row = matrixA[i];
            for (j = 0; j < i; j++) {
                row[j] = 0;
            }
        }
        return matrixA;
    }

    /**
     * Solves a linear system
     *
     * @exports solveLinearSystem
     *
     * @param {Number[][]} matrixA A square matrix of the given dimension
     * @param {Number[][]} matrixB A square matrix of the given dimension
     * @param {Number} dimension The array dimension
     * @param {LinearSolveMethod} [method = LinearSolveMethod.GAUSSIAN_ELIMINATION
     * @param {Number[][]} [result] The result matrix
     *
     * @returns the solved system
     *
     * @exception {DeveloperError} numberOfArrays must be greater than 0.
     */
    function solveLinearSystem(matrixA, matrixB, dimension, method, result) {
        var i;
        var j;
        var k;
        var l;
        var colC;
        var nextRow;
        var xindex;
        var temp;
        var ratio;
        var test;
        var sum;
        var C;
        var Q;
        var QtB;

        var abs = Math.abs;

        /*           initialization        */

        C = new Array(dimension);
        for (i = 0; i < dimension; i++) {
            C[i] = new Array(dimension + 1);
        }

        method = defaultValue(method, LinearSolveMethod.GAUSSIAN_ELIMINATION);
        if (method === LinearSolveMethod.GAUSSIAN_ELIMINATION) {
            colC = dimension + 1;

            /*           calculate norm of A for singularity test   */

            ratio = 0.0;
            for (i = 0; i < dimension; i++) {
                C[i][dimension] = matrixB[i][0];
                sum = 0.0;

                for (j = 0; j < dimension; j++) {
                    C[i][j] = matrixA[i][j];
                    sum += abs(C[i][j]);
                }

                if (ratio < sum) {
                    ratio = sum;
                }
            }

            test = 1.e-30 * ratio;

            for (i = 0; i < dimension; i++) { //triangularization

                temp = 0.0;
                nextRow = 0;

                for (j = i; j < dimension; j++) { //find element for row pivot
                    if (temp < abs(C[j][i])) {
                        temp = abs(C[j][i]);
                        nextRow = j;
                    }
                }

                if (i < nextRow) { //interchange rows if necessary
                    for (k = i; k < colC; k++) {
                        temp = C[i][k];
                        C[i][k] = C[nextRow][k];
                        C[nextRow][k] = temp;
                    }
                }

                if (abs(C[i][i]) < test) {
                    return; //singular matrix, no inverse
                }

                if (i < (dimension - 1)) {
                    for (k = i + 1; k < dimension; k++) {
                        if (abs(C[k][i]) !== 0.0) {
                            ratio = C[k][i] / C[i][i];
                            for (l = i + 1; l < colC; l++) {
                                C[k][l] -= ratio * C[i][l];
                            }
                        }
                    }
                }
            }
        } else if (method === LinearSolveMethod.QR_DECOMPOSITION) {
            QtB = new Array(dimension);
            Q = new Array(dimension);
            for (i = 0; i < dimension; i++) {
                Q[i] = new Array(dimension);
            }
            C = new Array(dimension);
            for (i = 0; i < dimension; i++) {
                C[i] = new Array(dimension);
                for (j = 0; j < dimension; i++) {
                    C[i][j] = matrixA[i][j];
                }
            }

            decomposeQr(dimension, C, Q);

            matrixMultiply(dimension, dimension, 1, Q, matrixB, QtB);

            for (i = 0; i < dimension; i++) {
                C[i][dimension] = QtB[i][0];
            }
        }

        // back substitution - shared for both methods

        for (i = 0; i < dimension; i++) {
            sum = 0.0;
            xindex = dimension - i - 1;

            if (xindex < dimension) {
                for (j = xindex + 1; j < dimension; j++) {
                    sum += C[xindex][j] * result[j];
                }
            }

            ratio = C[xindex][dimension];
            result[xindex] = (ratio - sum) / C[xindex][xindex];
        }

        return result;
    }

    solveLinearSystem.LinearSolveMethod = LinearSolveMethod;

    return solveLinearSystem;
});