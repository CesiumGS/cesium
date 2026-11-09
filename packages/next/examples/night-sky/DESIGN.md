# Night sky: design

How the night-sky page reads and behaves. It follows
[Dyno's design guide](../../bench/suite/DESIGN.md) and uses the observer panel
(`widgets/observerPanel.ts`), which carries the rules for exposure, models and
looks.

## The story

You are an observer. The page puts you at a place and a time, and the panel is
the observer: an eye that adapts, or a camera set to an exposure. Change who is
looking and the same sky changes with it: stars come and go with the eye's
adaptation, a long exposure lifts the Milky Way, a bright source gets a veil
or spikes in a lens. Nothing is added to the light of the scene. What is
physics, what is a model of an eye or a lens, and what is a look says so, in the
panel, beside each control.

## Audience

Someone judging how the engine draws light, not an astronomer: a graphics or
product person first, then someone who knows exposure and wants EV100 to mean
what it means on a camera. Every figure is shown with its unit and in context.

## Layout

- The view fills the stage. You look around by dragging, zoom with the wheel
  (the field of view), and move with the arrow keys when it has focus.
- The side column has two parts. The first is the presets, one line each,
  with what each one is for. They are data: a date, a place or a direction, and
  an observer (§13.30). The second is the observer panel, in four sections
  (Exposure, Optics, Look, Sky data), each tagged Physics, Model, Look or Data.
- Narrow windows stack: the view first, then the column, with the page
  scrolling. Nothing is cut off at 380 px, and no readout changes its box as
  its number changes.

## Behavior

- A preset sets the clock, the place and direction, and the observer, and
  leaves the panel where it is, so it shows what the preset chose.
- With no sky pack it draws 1.x's star map. `?pack=local` uses a pack from
  the dev server where one is offered, and the panel says when it isn't cleared.
  Nothing from a pack is committed.
- Sliders run right for brighter. The exposure slider is in EV100, with its
  darker and brighter ends named.
- Keyboard: every control is reachable with Tab, sliders move with the arrow
  keys (Shift or Page Up and Page Down for a stop), the exposure mode is a
  radio group, and the view has its own arrow-key look-around.
- Reduced motion: nothing here moves by itself, and presets cut rather than fly.

## Not here

Planets and deep-sky objects, a shutter that accumulates, and per-body skies
(plan 5e). The panel's eye doesn't adapt for longer than the observer's speed
setting allows, and the page says nothing about what a real eye would see
beyond what the model states.
