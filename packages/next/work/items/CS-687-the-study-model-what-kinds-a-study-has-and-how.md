---
id: CS-687
title: "The study model: what kinds a study has, and how it draws on a set of instruments"
kind: decision
state: done
created: 2026-11-18
project: CS-389
decider: owner
answer: A
answered_at: 2026-11-20T02:31:17.676Z
answered_via: question-tool
answered_by: owner
---

## Question

What is a study's model before CS-404 builds its file format: what kinds of study are there, and how does a study draw on Dyno's instruments (the Lab pages, scenes and suites)?

The owner, 2026-11-17: "i like the idea of a study having an inventory of tools to work with, i'm unsure whether its a kind or a collection though. might a study want to use multiple instruments together to answer a question? i think probably yes. what does that imply for the design?" Research the same day found that none of Lab's pages is a study: each is an instrument (a regression check, an A/B comparison, a cost sweep, a calibration against a reference, or a feasibility spike) that a study's runs could use. hitld leaves studies to the project's benchmark tool and cites them by ID (`03-data-model.md`, "Study, run, verdict"); a learning milestone's check is `study <ID>`.

## Options and recommendation

- **A. Two axes: a kind and a set of instruments.** The kind (comparison, sweep, feasibility, calibration) is the shape of the reasoning: what's written down before results (baseline and candidate with a primary metric, guardrails and tolerance; axes and the noise floor; what "feasible" means and its budget; the reference and the error tolerance per quantity) and what the verdict looks like. The instruments are a set: each declares its metrics, units and noise floor in a catalog; runs from different instruments join by commit and settings; the method says how they combine (for example the primary metric from one, guardrails from others); the verdict cites runs across instruments. Regression watches aren't a kind: they're standing checks that open a study when they fail. Lab becomes the instrument catalog, showing what each measures, its standing check and the studies that used it.
- **B. One instrument per study,** with kinds.
- **C. No kinds:** a free-form study with any instruments.

Recommendation: A. Questions worth a study usually need more than one instrument (correctness and cost together), and kinds make the pre-registration checkable. It's a file format others will write, so it's the owner's call, before CS-404 starts.

## Answer

A, two axes: a kind and a set of instruments (owner, 2026-11-19). CS-404 builds the study file format on this model.
