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

    /**
     * @private
     */
    var JobScheduler = function(budgets) {
        var budgetPerType = new Array(JobType.NUMBER_OF_JOB_TYPES);

// TODO: allow "stealing" time slices, e.g., override argument or temporal coherence so
//       for example, buffers can use the textures time slice, if no textures were
//       created last frame.
        budgetPerType[JobType.TEXTURE] = 8.0;
        budgetPerType[JobType.PROGRAM] = 2.0;
        budgetPerType[JobType.BUFFER] = 6.0;

        // Time budget, in ms, each frame for each job type.  Changes to this take
        // effect next time resetBudgets() is called.
        this.budgetPerType = budgetPerType;

        // Remaining budget, in ms, this frame for each job type
        this._remainingBudgetPerType = new Array(length);

        this.resetBudgets();
    };

    JobScheduler.prototype.clearBudgets = function() {
        var remainingBudgetPerType = this._remainingBudgetPerType;
        var length = JobType.NUMBER_OF_JOB_TYPES;
        for (var i = 0; i < length; ++i) {
            remainingBudgetPerType[i] = 0.0;
        }
    };

    JobScheduler.prototype.resetBudgets = function() {
        var budgetPerType = this.budgetPerType;
        var remainingBudgetPerType = this._remainingBudgetPerType;
        var length = JobType.NUMBER_OF_JOB_TYPES;
        for (var i = 0; i < length; ++i) {
            remainingBudgetPerType[i] = budgetPerType[i];
        }
    };

    JobScheduler.prototype.execute = function(job, jobType) {
        if (this._remainingBudgetPerType[jobType] <= 0.0) {
            return false;
        }

        var startTime = getTimestamp();
        job.executeJob();
        var duration = getTimestamp() - startTime;
        this._remainingBudgetPerType[jobType] -= duration;

        return true;
    };

    return JobScheduler;
});
