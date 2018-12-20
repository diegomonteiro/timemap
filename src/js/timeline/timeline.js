/*
  TIMELINE
  Displays events over the course of the night
  Allows brushing and selecting periods of time in it
  TODO: is it possible to express this idiomatically as React?
*/
import {
  areEqual,
  parseDate,
  formatterWithYear
} from '../utilities';
import hash from 'object-hash';
import esLocale from '../data/es-MX.json';
import copy from '../data/copy.json';

export default function(newApp, ui, methods) {
  d3.timeFormatDefaultLocale(esLocale);

  const domain = {
    events: [],
    categories: [],
    narratives: []
  }
  const app = {
    timerange: newApp.timerange,
    selected: [],
    language: newApp.language,
    zoomLevels: newApp.zoomLevels
  }

  // Dimension of the client
  const WIDTH_CONTROLS = 100;
  const HEIGHT = 140;
  const boundingClient = d3.select(`#${ui.dom.timeline}`).node().getBoundingClientRect();
  let WIDTH = boundingClient.width - WIDTH_CONTROLS;

  // Highlight events with a larger white ring marker
  const markerRadius = 15;

  // NB: is it possible to do this with SCSS?
  // A: Maybe, although we are using it programmatically here for now
  const margin = { left: 120 };

  // Drag behavior
  let dragPos0;
  let transitionDuration = 500;

  /**
   * Create scales
   */
  const scale = {};
  scale.x = d3.scaleTime()
      .domain(app.timerange)
      .range([margin.left, WIDTH]);

  scale.y = d3.scaleOrdinal()


  /**
   * Initilize SVG elements and groups
   */
  const dom = {};

  dom.svg =
    d3.select(`#${ui.dom.timeline}`)
    .append('svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT);

  dom.clip = dom.svg.append("svg:clipPath")
    .attr("id", "clip")
    .append("svg:rect")
    .attr("x", margin.left)
    .attr("y", 0)
    .attr("width", WIDTH - margin.left)
    .attr("height", HEIGHT - 25);

  dom.controls =
    d3.select(`#${ui.dom.timeline}`)
    .append('svg')
    .attr('class', 'time-controls')
    .attr('width', WIDTH_CONTROLS)
    .attr('height', HEIGHT);


  /*
   * Axis group elements
   */
  dom.axis = {};

  dom.axis.x0 = dom.svg.append('g')
    .attr('transform', `translate(0, 25)`)
    .attr('class', 'axis xAxis');

  dom.axis.x1 = dom.svg.append('g')
    .attr('transform', `translate(0, 105)`)
    .attr('class', 'axis axisHourText');

  dom.axis.y = dom.svg.append('g')
    .attr('transform', `translate(${WIDTH}, 0)`)
    .attr('class', 'yAxis');

  dom.axis.boundaries = dom.svg.selectAll('.axisBoundaries')
    .data([0, 1])
    .enter().append('line')
    .attr('class', 'axisBoundaries');

  dom.axis.label0 = dom.svg.append('text')
    .attr('class', 'timeLabel0 timeLabel');

  dom.axis.label1 = dom.svg.append('text')
    .attr('class', 'timelabelF timeLabel');


  /*
   * Plottable elements
   */

  dom.body = dom.svg.append("g").attr("clip-path", "url(#clip)");
  dom.events = dom.body.append('g');
  dom.markers = dom.body.append('g');


  /*
   * Time Controls
   */
  dom.forward = dom.svg.append('g').attr('class', 'time-controls-inline');
  dom.forward.append('circle');
  dom.forward.append('path');

  dom.backwards = dom.svg.append('g').attr('class', 'time-controls-inline');
  dom.backwards.append('circle');
  dom.backwards.append('path');

  dom.zooms = dom.controls.append('g');

  dom.zooms.selectAll('.zoom-level-button')
    .data(app.zoomLevels)
    .enter().append('text')
    .attr('class', 'zoom-level-button');


  /*
   * Initialize axis function and element group
   */
  const axis = {};

  axis.x0 =
    d3.axisBottom(scale.x)
    .ticks(10)
    .tickPadding(5)
    .tickSize(80)
    .tickFormat(d3.timeFormat('%d %b'));

  axis.x1 =
    d3.axisBottom(scale.x)
    .ticks(10)
    .tickPadding(20)
    .tickSize(0)
    .tickFormat(d3.timeFormat('%H:%M'));

  axis.y =
    d3.axisLeft(scale.y)
    .tickValues([]);

  updateAxis();


  /**
   * Adapt dimensions when resizing
   */
  function getCurrentWidth() {
    return d3.select(`#${ui.dom.timeline}`).node()
      .getBoundingClientRect().width;
  }


  /**
   * Resize timeline one window resice
   */
  function addResizeListener() {
    window.addEventListener('resize', () => {
      if (d3.select(`#${ui.dom.timeline}`).node() !== null) {
        WIDTH = getCurrentWidth() - WIDTH_CONTROLS;

        dom.svg.attr('width', WIDTH);
        scale.x.range([margin.left, WIDTH]);
        axis.y.tickSize(WIDTH - margin.left);
        dom.axis.y.attr('transform', `translate(${WIDTH}, 0)`)
        render(null);
      }
    });
  }
  addResizeListener();


  /**
   * Return which color event circle should be based on incident type
   * @param {object} eventPoint data object
   */
  function getEventPointFillColor(eventPoint) {
    return methods.getCategoryColor(eventPoint.category);
  }


  /**
   * Given an event, get all the filtered events that happen simultaneously
   * @param {object} eventPoint: regular eventPoint data
   */
  function getAllEventsAtOnce(eventPoint) {
    const timestamp = eventPoint.timestamp;
    const category = eventPoint.category;
    return domain.events
      .filter(event => (event.timestamp === timestamp && category === event.category))
  }


  /*
   * Get y height of eventPoint, considering the ordinal Y scale
   * @param {object} eventPoint: regular eventPoint data
   */
  function getEventY(eventPoint) {
    const yGroup = eventPoint.category;
    return scale.y(yGroup);
  }


  /*
   * Get x position of eventPoint, considering the time scale
   * @param {object} eventPoint: regular eventPoint data
   */
  function getEventX(eventPoint) {
    return scale.x(parseDate(eventPoint.timestamp));
  }

  function getTimeScaleExtent() {
    return (scale.x.domain()[1].getTime() - scale.x.domain()[0].getTime()) / 60000;
  }


  /*
   * Given a number of minutes, calculate the width based on current scale.x
   * @param {number} minutes: number of minutes
   */
  function getWidthOfTime(minutes) {
    const allMins = getTimeScaleExtent();
    return (minutes * WIDTH) / allMins;
  }


  /*
  * TODO: Highlight zoom level based on time range selected
  */
  function highlightZoomLevel(zoom) {
    app.zoomLevels.forEach((level) => {
      if (level.label === zoom.label) {
        level.active = true;
      } else {
        level.active = false;
      }
    });

    dom.zooms.selectAll('text')
      .classed('active', level => level.active);
  }


  /**
   * Apply zoom level to timeline
   * @param {object} zoom: zoom level from zoomLevels
   */
  function applyZoom(zoom) {
    highlightZoomLevel(zoom);

    const extent = getTimeScaleExtent();
    const newCentralTime = d3.timeMinute.offset(scale.x.domain()[0], extent / 2);

    const domain0 = d3.timeMinute.offset(newCentralTime, -zoom.duration / 2);
    const domainF = d3.timeMinute.offset(newCentralTime, zoom.duration / 2);

    scale.x.domain([domain0, domainF]);
    methods.onUpdateTimerange(scale.x.domain());
  }


  /**
   * Shift time range by moving forward or backwards
   * @param {String} direction: 'forward' / 'backwards'
   */
  function moveTime(direction) {
    methods.onSelect();
    const extent = getTimeScaleExtent();
    const newCentralTime = d3.timeMinute.offset(scale.x.domain()[0], extent / 2);

    // if forward
    let domain0 = newCentralTime;
    let domainF = d3.timeMinute.offset(newCentralTime, extent);

    // if backwards
    if (direction === 'backwards') {
      domain0 = d3.timeMinute.offset(newCentralTime, -extent);
      domainF = newCentralTime;
    }

    scale.x.domain([domain0, domainF]);
    methods.onUpdateTimerange(scale.x.domain());
  }

  function toggleTransition(isTransition) {
    transitionDuration = (isTransition) ? 500 : 0;
  }


  /*
   * Setup drag behavior
   */
  const drag = d3.drag()
    .on('start', () => {
      d3.event.sourceEvent.stopPropagation();
      dragPos0 = d3.event.x;
      toggleTransition(false);
    })
    .on('drag', () => {
      const drag0 = scale.x.invert(dragPos0).getTime();
      const dragNow = scale.x.invert(d3.event.x).getTime();
      const timeShift = (drag0 - dragNow) / 1000;

      const newDomain0 = d3.timeSecond.offset(app.timerange[0], timeShift);
      const newDomainF = d3.timeSecond.offset(app.timerange[1], timeShift);

      scale.x.domain([newDomain0, newDomainF]);
      render();
    })
    .on('end', () => {
      toggleTransition(true);
      app.timerange = scale.x.domain();
      methods.onUpdateTimerange(scale.x.domain());
    });


  /**
   * Highlight event circle on hover
   */
  function handleMouseOver() {
    d3.select(this)
      .attr('r', 7)
      .classed('mouseover', true);
  }


  /**
   * Unhighlight event when mouse out
   */
  function handleMouseOut() {
    d3.select(this)
      .attr('r', 5)
      .classed('mouseover', false);
  }


  /**
   * It automatically sets brush timeline to a domain set by the params
   */
  function updateTimeRange() {
    scale.x.domain(app.timerange);
    axis.x0.scale(scale.x);
    axis.x1.scale(scale.x);
  }


  /**
   * Display the current time range in the time label above the timeline
   */
  function renderTimeLabels() {
    dom.axis.label0
      .attr('x', 5)
      .attr('y', 15)
      .text(formatterWithYear(app.timerange[0]));

    dom.axis.label1
      .attr('x', WIDTH - 5)
      .attr('y', 15)
      .text(formatterWithYear(app.timerange[1]))
      .style('text-anchor', 'end');
  }


  /**
   * Makes a circular ring mark in all selected events
   * @param {object} eventPoint: object with eventPoint data (time, loc, tags)
   */
  function renderHighlight() {
    const markers = dom.markers
      .selectAll('circle')
      .data(app.selected);

    markers
      .enter()
      .append('circle')
      .attr('class', 'timeline-marker')
      .merge(markers)
      .attr('cy', eventPoint => getEventY(eventPoint))
      .attr('cx', eventPoint => getEventX(eventPoint))
      .attr('r', 10)
      .style('opacity', .9);

    markers.exit().remove();
  }


  /**
   * Return event circles of different groups
   */
  function renderEvents() {
    const eventsDom = dom.events
      .selectAll('.event')
      .data(domain.events, d => d.id);

    eventsDom
      .exit()
      .remove();

    eventsDom
      .transition()
      .duration(transitionDuration)
      .attr('cx', eventPoint => getEventX(eventPoint));

    eventsDom
      .enter()
      .append('circle')
      .attr('class', 'event')
      .attr('cx', eventPoint => getEventX(eventPoint))
      .attr('cy', eventPoint => getEventY(eventPoint))
      .style('fill', eventPoint => getEventPointFillColor(eventPoint))
      .on('click', eventPoint => {
        return methods.onSelect(getAllEventsAtOnce(eventPoint))
      })
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut)
      .transition()
      .delay(300)
      .duration(200)
      .attr('r', 5);
  }


  /**
   * Render axis on timeline and viewbox boundaries
   */
  function renderAxis() {
    dom.axis.x0
      .call(drag);

    dom.axis.x1
      .call(drag);

    dom.axis.x0
      .transition()
      .duration(transitionDuration)
      .call(axis.x0);

    dom.axis.x1
      .transition()
      .duration(transitionDuration)
      .call(axis.x1);

    axis.y.tickSize(WIDTH - margin.left);

    dom.axis.y
      .call(axis.y)
      .call(drag);

    dom.axis.boundaries
      .attr('x1', (d, i) => scale.x.range()[i])
      .attr('x2', (d, i) => scale.x.range()[i])
      .attr('y1', 10)
      .attr('y2', 20);

    dom.axis.label1
      .attr('x', scale.x.range()[1] - 5);
  }


  /**
   * Render left and right time shifting controls
   */
  function renderTimeControls() {
    const zoomLabels = copy[app.language].timeline.zooms;
    app.zoomLevels.forEach((level, i) => {
      level.label = zoomLabels[i];
    });

    // These controls on timeline svg
    dom.backwards.select('circle')
      .attr('transform', `translate(${scale.x.range()[0] + 20}, 62)`)
      .attr('r', 15);

    dom.backwards.select('path')
      .attr('d', d3.symbol().type(d3.symbolTriangle).size(80))
      .attr('transform', `translate(${scale.x.range()[0] + 20}, 62)rotate(270)`);

    dom.forward.select('circle')
      .attr('transform', `translate(${scale.x.range()[1] - 20}, 62)`)
      .attr('r', 15);

    dom.forward.select('path')
      .attr('d', d3.symbol().type(d3.symbolTriangle).size(80))
      .attr('transform', `translate(${scale.x.range()[1] - 20}, 62)rotate(90)`);

    dom.zooms.selectAll('text')
      .text(d => d.label)
      .attr('x', 60)
      .attr('y', (d, i) => (i * 15) + 20)
      .classed('active', level => level.active);

    dom.forward
      .on('click', () => moveTime('forward'));

    dom.backwards
      .on('click', () => moveTime('backwards'));

    dom.zooms.selectAll('text')
      .on('click', zoom => applyZoom(zoom));
  }


  /**
   * Updates data displayed by this timeline, but only render if necessary
   * @param {Object} domain: Redux state domain subtree
   * @param {Object} app: Redux state app subtree
   */
  function updateAxis() {
    const groupStep = (106 - 30) / domain.categories.length;
    let groupYs = Array.apply(null, Array(domain.categories.length));
    groupYs = groupYs.map((g, i) => {
      return 30 + i * groupStep;
    });

    scale.y = d3.scaleOrdinal()
      .domain(domain.categories)
      .range(groupYs);

    axis.y =
      d3.axisLeft(scale.y)
        .tickValues(domain.categories.map(c => c.category));
  }


  /**
   * Updates displayable data on the timeline: events, selected and
   * potentially adjusts time range
   * @param {Object} newDomain: object of arrays of events and categories
   * @param {Object} newApp: object of time range and selected events
   */
  function update(newDomain, newApp) {
    const isNewDomain = (hash(domain) !== hash(newDomain));
    const isNewAppProps = (hash(app) !== hash(newApp));

    if (isNewDomain) {
      domain.categories = newDomain.categories;
      domain.events = newDomain.events;
      domain.narratives = newDomain.narratives;
    }

    if (isNewAppProps) {
      app.timerange = newApp.timerange;
      app.selected = newApp.selected.slice(0);
    }

    if (isNewDomain || isNewAppProps) renderContent();
    if (isNewAppProps) renderContext();
  }

  function renderContext() {
    renderTimeControls();
    renderTimeLabels();
  }

  function renderContent() {
    updateAxis();
    renderAxis();
    renderEvents();
    renderHighlight();
  }

  function render() {
    renderContext();
    renderContent();
  }

  return {
    update,
  };
}