/*global define*/
define([
        '../Core/defaultValue',
        '../Core/getTimestamp',
        './JobType'
    ], function(
        defaultValue,
        getTimestamp,
        JobType) {
    "use strict";

    var Budget = function(total) {
        // Total budget, in ms, allowed for one frame
        this.total = total;

        // Remaining budget, in ms, for this frame
        this.remainingThisFrame = total;
    };

    /**
     * @private
     */
    var JobScheduler = function() {
        var budgets = new Array(JobType.NUMBER_OF_JOB_TYPES);

// TODO: allow "stealing" time slices, e.g., override argument or temporal coherence so
//       for example, buffers can use the textures time slice, if no textures were
//       created last frame.
        budgets[JobType.TEXTURE] = new Budget(8.0);
        budgets[JobType.PROGRAM] = new Budget(2.0);
        budgets[JobType.BUFFER] = new Budget(6.0);

        this._budgets = budgets;
    };

    JobScheduler.prototype.clearBudgets = function() {
        var budgets = this._budgets;
        var length = budgets.length;
        for (var i = 0; i < length; ++i) {
            budgets[i].remainingThisFrame = 0.0;
        }
    };

    JobScheduler.prototype.resetBudgets = function() {
        var budgets = this._budgets;
        var length = budgets.length;
        for (var i = 0; i < length; ++i) {
            var budget = budgets[i];
            budget.remainingThisFrame = budget.total;
        }
    };

    JobScheduler.prototype.execute = function(job, jobType) {
        var budget = this._budgets[jobType];

        if (budget.remainingThisFrame <= 0.0) {
            return false;
        }

        var startTime = getTimestamp();
        job.executeJob();
        var duration = getTimestamp() - startTime;
        budget.remainingThisFrame -= duration;

        return true;
    };

    return JobScheduler;
});
