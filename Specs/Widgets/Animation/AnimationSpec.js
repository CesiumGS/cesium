import { defined } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";
import { Animation } from "../../../Source/Cesium.js";
import { AnimationViewModel } from "../../../Source/Cesium.js";
import { ClockViewModel } from "../../../Source/Cesium.js";

describe("Widgets/Animation/Animation", function () {
  let container;
  let animation;
  afterEach(function () {
    if (defined(animation)) {
      animation = animation.destroy();
    }
    if (defined(container) && defined(container.parentNode)) {
      container.parentNode.removeChild(container);
    }
  });

  it("Can create and destroy", function () {
    const clockViewModel = new ClockViewModel();
    const animationViewModel = new AnimationViewModel(clockViewModel);
    animation = new Animation(document.body, animationViewModel);
  });

  it("Can create with container not in the DOM", function () {
    container = document.createElement("div");
    const clockViewModel = new ClockViewModel();
    const animationViewModel = new AnimationViewModel(clockViewModel);
    const animation = new Animation(container, animationViewModel);

    //Verify applyThemeChanges is called when we add the container to the DOM.
    spyOn(animation, "applyThemeChanges").and.callThrough();
    document.body.appendChild(container);

    //This is done via polling because we can't control when the DOM decides to
    //fire the Mutation event.
    return pollToPromise(function () {
      return animation.applyThemeChanges.calls.count() === 1;
    });
  });

  it("Can destroy without container ever being in the DOM", function () {
    container = document.createElement("div");
    const clockViewModel = new ClockViewModel();
    const animationViewModel = new AnimationViewModel(clockViewModel);
    animation = new Animation(container, animationViewModel);
  });
});
