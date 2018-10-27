defineSuite([
        'Scene/JobScheduler',
        'Scene/JobType'
    ], function(
        JobScheduler,
        JobType) {
    'use strict';

    var originalGetTimestamp;

    beforeAll(function() {
        originalGetTimestamp = JobScheduler.getTimestamp;

        var time = 0.0;
        JobScheduler.getTimestamp = function() {
            return time++;
        };
    });

    afterAll(function() {
        JobScheduler.getTimestamp = originalGetTimestamp;
    });

    ///////////////////////////////////////////////////////////////////////////

    var MockJob = function() {
        this.executed = false;
    };

    MockJob.prototype.execute = function() {
        this.executed = true;
    };

    ///////////////////////////////////////////////////////////////////////////

    it('constructs with defaults', function() {
        var js = new JobScheduler();
        expect(js.totalBudget).toEqual(50.0);

        var budgets = js._budgets;
        expect(budgets.length).toEqual(JobType.NUMBER_OF_JOB_TYPES);
        expect(budgets[JobType.TEXTURE].total).toEqual(10.0);
        expect(budgets[JobType.PROGRAM].total).toEqual(10.0);
        expect(budgets[JobType.BUFFER].total).toEqual(30.0);
    });

    it('executes a job', function() {
        var js = new JobScheduler([2.0, // JobType.TEXTURE
            0.0,                        // JobType.PROGRAM
            0.0]);                      // JobType.BUFFER

        var job = new MockJob();
        var executed = js.execute(job, JobType.TEXTURE);

        expect(executed).toEqual(true);
        expect(job.executed).toEqual(true);
        expect(js._totalUsedThisFrame).toEqual(1.0);
        expect(js._budgets[JobType.TEXTURE].total).toEqual(2.0);
        expect(js._budgets[JobType.TEXTURE].usedThisFrame).toEqual(1.0);
    });

    it('disableThisFrame does not execute a job', function() {
        var js = new JobScheduler([2.0, 0.0, 0.0]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);

        js.disableThisFrame();
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);
    });

    it('executes different job types', function() {
        var js = new JobScheduler([1.0, 1.0, 1.0]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(true);

        expect(js._totalUsedThisFrame).toEqual(3.0);
        var budgets = js._budgets;
        expect(budgets[JobType.TEXTURE].usedThisFrame).toEqual(1.0);
        expect(budgets[JobType.PROGRAM].usedThisFrame).toEqual(1.0);
        expect(budgets[JobType.BUFFER].usedThisFrame).toEqual(1.0);
    });

    it('executes a second job', function() {
        var js = new JobScheduler([2.0, 0.0, 0.0]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js._totalUsedThisFrame).toEqual(2.0);
        expect(js._budgets[JobType.TEXTURE].usedThisFrame).toEqual(2.0);
    });

    it('does not execute second job (exceeds total time)', function() {
        var js = new JobScheduler([1.0, 0.0, 0.0]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);
        expect(js._budgets[JobType.TEXTURE].starvedThisFrame).toEqual(true);
    });

    it('executes a second job (TEXTURE steals PROGRAM budget)', function() {
        var js = new JobScheduler([1.0, 1.0, 0.0]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js._totalUsedThisFrame).toEqual(2.0);

        var budgets = js._budgets;
        expect(budgets[JobType.TEXTURE].usedThisFrame).toEqual(1.0);
        expect(budgets[JobType.TEXTURE].starvedThisFrame).toEqual(true);
        expect(budgets[JobType.PROGRAM].usedThisFrame).toEqual(0.0);
        expect(budgets[JobType.PROGRAM].stolenFromMeThisFrame).toEqual(1.0);
        expect(budgets[JobType.PROGRAM].starvedThisFrame).toEqual(false);

        // There are no budgets left to steal from
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true); // Allowed once per frame
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(false);
        expect(budgets[JobType.PROGRAM].starvedThisFrame).toEqual(true);
    });

    it('does not steal in the same frame', function() {
        var js = new JobScheduler([1.0, 1.0, 1.0]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(true);

        // Exhaust budget for all job types in the first frame
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(false);
        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(false);

        // In this next frame, no job type can steal from another since
        // they all exhausted their budgets in the previous frame
        js.resetBudgets();
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);

        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(false);

        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(false);
    });

    it('does not steal from starving job types over multiple frames', function() {
        var js = new JobScheduler([1.0, 1.0, 0.0]);

        // Exhaust in first frame
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true); // Stolen from PROGRAM
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);

        js.resetBudgets();
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(false); // Can't steal from TEXTURE
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);

        js.resetBudgets();
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(false); // Can't steal from TEXTURE yet

        js.resetBudgets();
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true); // Can steal from TEXTURE since it wasn't exhausted last frame
    });

    it('Allows progress on all job types once per frame', function() {
        var js = new JobScheduler([1.0, 1.0, 1.0]);

        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true); // Steal from PROGRAM
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true); // Steal from BUFFER

        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(false);

        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true); // Still gets to make progress once this frame
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(false);

        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(true); // Still gets to make progress once this frame
        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(false);
    });

    it('Long job still allows progress on other job types once per frame', function() {
        // Job duration is always 1.0 in the tests so shorten budget
        var js = new JobScheduler([0.5, 0.2, 0.2]);
        expect(js.execute(new MockJob(), JobType.TEXTURE)).toEqual(true); // Goes over total budget
        expect(js.execute(new MockJob(), JobType.PROGRAM)).toEqual(true); // Still gets to make progress once this frame
        expect(js.execute(new MockJob(), JobType.BUFFER)).toEqual(true); // Still gets to make progress once this frame
    });

    it('constructor throws when budgets.length is not JobType.NUMBER_OF_JOB_TYPES', function() {
      expect(function() {
          return new JobScheduler([1.0]);
      }).toThrowDeveloperError();
  });
});
