import {
  defined,
  Clock,
  ClockRange,
  Timeline,
  TimeInterval,
  JulianDate,
  Color,
  ClockViewModel,
  AnimationViewModel,
  Animation,
} from "cesium";

const today = JulianDate.now();
const tomorrow = JulianDate.addDays(today, 1, new JulianDate());
let startDatePart = JulianDate.toIso8601(today).slice(0, 10);
let endDatePart = JulianDate.toIso8601(tomorrow).slice(0, 10);
let startTimePart = "00:00";
let endTimePart = "00:00";

let timeline,
  clock,
  endBeforeStart,
  containerElement,
  animationViewModel,
  animation;

function updateScrubTime(julianDate) {
  document.getElementById("mousePos").innerHTML = `${timeline.makeLabel(
    julianDate,
  )}`;
}

function handleSetTime(e) {
  if (defined(timeline)) {
    const scrubJulian = e.timeJulian;
    clock.shouldAnimate = false;
    clock.currentTime = scrubJulian;
    updateScrubTime(scrubJulian);
  }
}

function spanToString(span) {
  let spanUnits = "sec";
  if (span > 31536000) {
    span /= 31536000;
    spanUnits = "years";
  } else if (span > 2592000) {
    span /= 2592000;
    spanUnits = "months";
  } else if (span > 604800) {
    span /= 604800;
    spanUnits = "weeks";
  } else if (span > 86400) {
    span /= 86400;
    spanUnits = "days";
  } else if (span > 3600) {
    span /= 3600;
    spanUnits = "hours";
  } else if (span > 60) {
    span /= 60;
    spanUnits = "minutes";
  }
  return `${span.toString()} ${spanUnits}`;
}

function handleSetZoom(e) {
  document.getElementById("formatted").innerHTML =
    `<br/>Start: ${timeline.makeLabel(e.startJulian)}` +
    `<br/>&nbsp;Stop: ${timeline.makeLabel(e.endJulian)}` +
    `<br/>&nbsp;Span: ${spanToString(
      e.totalSpan,
    )}<br/>&nbsp;&nbsp;Tic: ${spanToString(e.mainTicSpan)}`;
  updateScrubTime(clock.currentTime);
}

function makeTimeline(startJulian, scrubJulian, endJulian) {
  clock = new Clock({
    startTime: startJulian,
    currentTime: scrubJulian,
    stopTime: endJulian,
    clockRange: ClockRange.LOOP_STOP,
    multiplier: 60,
    shouldAnimate: true,
  });

  timeline = new Timeline("time1", clock);
  timeline.addEventListener("settime", handleSetTime, false);
  timeline.addEventListener("setzoom", handleSetZoom, false);

  timeline.addTrack(
    new TimeInterval({
      start: startJulian,
      stop: JulianDate.addSeconds(startJulian, 60 * 60, new JulianDate()),
    }),
    8,
    Color.RED,
    new Color(0.55, 0.55, 0.55, 0.25),
  );

  timeline.addTrack(
    new TimeInterval({
      start: JulianDate.addSeconds(endJulian, -60 * 60, new JulianDate()),
      stop: endJulian,
    }),
    8,
    Color.LIME,
  );

  const middle = JulianDate.secondsDifference(endJulian, startJulian) / 4;
  timeline.addTrack(
    new TimeInterval({
      start: JulianDate.addSeconds(startJulian, middle, new JulianDate()),
      stop: JulianDate.addSeconds(startJulian, middle * 3, new JulianDate()),
    }),
    8,
    Color.DEEPSKYBLUE,
    new Color(0.55, 0.55, 0.55, 0.25),
  );

  const clockViewModel = new ClockViewModel(clock);
  animationViewModel = new AnimationViewModel(clockViewModel);
  animation = new Animation(
    document.getElementById("animationWidget"),
    animationViewModel,
  );

  function tick() {
    const time = clock.tick();
    updateScrubTime(time);
    requestAnimationFrame(tick);
  }
  tick();
}

// Adjust start/end dates in reaction to any input changes
function newDatesSelected() {
  let startJulian, endJulian;

  if (startDatePart && startTimePart) {
    startJulian = JulianDate.fromIso8601(`${startDatePart}T${startTimePart}Z`); // + 'Z' for UTC
  }
  if (endDatePart && endTimePart) {
    endJulian = JulianDate.fromIso8601(`${endDatePart}T${endTimePart}Z`);
  }

  if (startJulian && endJulian) {
    if (JulianDate.secondsDifference(endJulian, startJulian) < 0.1) {
      endBeforeStart.style.display = "block";
      containerElement.style.visibility = "hidden";
    } else {
      endBeforeStart.style.display = "none";
      containerElement.style.visibility = "visible";
      if (!timeline) {
        makeTimeline(startJulian, startJulian, endJulian);
      }
      clock.startTime = startJulian;
      clock.stopTime = endJulian;
      timeline.zoomTo(startJulian, endJulian);
    }
  }
}

window.addEventListener(
  "resize",
  function () {
    timeline.resize();
    animation.resize();
  },
  false,
);

function setupPage() {
  endBeforeStart = document.querySelector(".end-before-start");
  containerElement = document.getElementById("timelineAndAnimation");

  const startDate = document.querySelector(".start-date");
  const startTime = document.querySelector(".start-time");
  const endDate = document.querySelector(".end-date");
  const endTime = document.querySelector(".end-time");
  startDate.addEventListener("change", (e) => {
    startDatePart = e.target.value;
    newDatesSelected();
  });
  startTime.addEventListener("change", (e) => {
    startTimePart = e.target.value;
    newDatesSelected();
  });
  endDate.addEventListener("change", (e) => {
    endDatePart = e.target.value;
    newDatesSelected();
  });
  endTime.addEventListener("change", (e) => {
    endTimePart = e.target.value;
    newDatesSelected();
  });

  startDate.value = startDatePart;
  startTime.value = startTimePart;
  endDate.value = endDatePart;
  endTime.value = endTimePart;
  newDatesSelected();
}

setupPage();
