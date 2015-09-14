import './main.scss';

import $ from 'jquery';
import Debug from 'debug';
import Promise from 'bluebird';

/**
 *
 */

let STORY_PERMALINK = 'https://www.pivotaltracker.com/story/show/%ITEM_ID%';

/**
 *
 */

let PLATFORM_CONFIG = {
  applicationName: 'PivotalTracker',
  permalink: STORY_PERMALINK,
  skipStyling: true
};

/**
 *
 */

let debug = Debug('harvest-tracker-extension');

/**
 *
 */

let uniqueIdCounter = 0;

/**
 *
 */

let uniqueId = function uniqueId(prefix) {
  return `${prefix}${uniqueIdCounter += 1}`
};

/**
 *
 */

let projectData;

/**
 *
 */

let getProjectData = function getProjectData() {
  if (!projectData) {
    projectData = {
      id: parseInt(window.location.pathname.match(/projects\/(\d+)/)[1]),
      name: $('header.tc_page_header').find('.raw_context_name').text()
    };
  }

  return projectData;
};

/**
 *
 */

let storyTypes = [{
  name: 'collapsed',
  check: ($el) => {
    let href = /\/projects\/\d+\/?$/.test(window.location.href);
    return href && $el.has('header.preview').length;
  },
  fn: ($el, setupTimer) => {
    setupTimer(
      $el,
      parseInt($el.data('id')),
      $el.find('span.story_name').text(),
      'harvest-timer-collapsed',
      $el.find('.label'),
      $el
    );
  }
},{
  name: 'expanded',
  check: ($el) => {
    let href = /\/projects\/\d+\/?$/.test(window.location.href);
    let $details = $el.has('div.edit.details');
    return href && $el.is(':not(.maximized)') && $details.length;
  },
  fn: ($el, setupTimer) => {
    setupTimer(
      $el,
      parseInt($el.data('id')),
      $el.find('[name="story[name]"]').val(),
      'harvest-timer-expanded',
      $el.find('ul.selected.labels a.label'),
      $el.find('nav.edit div.actions')
    );
  }
},{
  name: 'detail',
  check: ($el) => {
    let href = /\/projects\/\d+\/stories\/\d+\/?$/.test(window.location.href);
    let $details = $el.has('div.edit.details');
    return href && $el.is('.maximized') && $details.length;
  },
  fn: ($el, setupTimer) => {
    setupTimer(
      $el,
      parseInt($el.find('.clipboard_button.id').data('clipboard-text').replace('#', '')),
      $el.find('[name="story[name]"]').val(),
      'harvest-timer-detail',
      $el.find('ul.selected.labels a.label.name'),
      $el.find('nav.edit div.actions')
    );
  }
}];

/**
 *
 */

let findStoryType = function findStoryType($el) {
  return storyTypes.filter((storyType) => {
    return storyType.check($el);
  }).shift();
};

/**
 *
 */

let parseLabelElements = function parseLabelElements($labels) {
  return $labels.map((i, el) => {
    return $(el).text().replace(/\,\s$/, '');
  }).get().filter((v, k, arr) => {
    return k === arr.indexOf(v);
  });
};

/**
 *
 */

let injectHarvestPlatformConfig = function injectHarvestPlatformConfig() {
  return new Promise((resolve, reject) => {
    let script = document.createElement('script');
    let entry = document.getElementsByTagName('script')[0];
    let platformConfig = JSON.stringify(PLATFORM_CONFIG);

    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `window._harvestPlatformConfig = ${platformConfig}`;
    entry.parentNode.insertBefore(script, entry);

    resolve();
  });
};

/**
 *
 */

let setupTimers = function setupTimers() {
  return new Promise((resolve, reject) => {
    let $stories = $('.story.model.item').not(':has(.harvest-timer), .unscheduled');

    $stories.each((i, el) => {
      let $el = $(el);
      let storyType = findStoryType($el);
      (storyType.fn || $.noop)($el, setupTimer);
    }.bind(this));

    resolve($stories.find('.harvest-timer'));
  });
};

/**
 *
 */

let setupTimer = function setupTimer($el, id, name, className, $labels, $appendTo) {
  let data = {};
  let labels = parseLabelElements($labels);
  let $timer = $el.find('.harvest-timer');

  data.id = id;
  data.name = name;
  data.name += labels.length ? ` [${labels.join(', ')}]` : '';
  data.name += ` ${STORY_PERMALINK.replace('%ITEM_ID%', id)}`;

  if (!$timer.length) {
    $timer = $('<div />')
      .appendTo($appendTo)
      .addClass(`harvest-timer ${className}`)
      .attr('data-uid', uniqueId('timer_'))
      .attr('data-project', JSON.stringify(getProjectData()))
      .attr('data-item', JSON.stringify(data));
  }
};

/**
 *
 */

let loadHarvestPlatform = function loadHarvestPlatform() {
  let url = 'https://platform.harvestapp.com/assets/platform.js';
  return Promise.resolve($.getScript(url));
};

/**
 *
 */

let setupEventProxy = function setupEventProxy() {
  return new Promise((resolve, reject) => {
    let script = document.createElement('script');
    let fn = [
      '(function(){',
      '  window.addEventListener("reinitializeTimer", function (evt) {',
      '    var target = document.querySelector("#harvest-messaging");',
      '    var query = "[data-uid=\'" + evt.detail.uid + "\']";',
      '    var timer = document.querySelector(query);',
      '    var harvest = document.querySelector("#harvest-messaging");',
      '    var data = { detail: { element: timer } };',
      '    harvest.dispatchEvent(new CustomEvent("harvest-event:timers:add", data));',
      '  });',
      '}());'
    ].join('\n');

    script.textContent = fn;
    (document.head || document.documentElement).appendChild(script);
    resolve();
  });
};

/**
 *
 */

let reinitializeTimer = function reinitializeTimer(i, el) {
  window.dispatchEvent(new CustomEvent('reinitializeTimer', {
    detail: {
      uid: $(el).data('uid')
    }
  }));
};

/**
 *
 */

let reinitializeTimers = function reinitializeTimers() {
  debug(`reinitializing timers...`);
  return setupTimers().then(function ($timers) {
    $timers.each(reinitializeTimer);
    debug(`reinitialized (${$timers.length}) timers`);
  });
};

/**
 *
 */

let run = function run() {
  return Promise.resolve().bind(this)
    .tap(debug.bind(null, 'injecting Harvest Platform configuration...'))
    .then(injectHarvestPlatformConfig)
    .tap(debug.bind(null, 'setting up timers...'))
    .then(setupTimers)
    .tap(debug.bind(null, 'injecting Harvest Platform...'))
    .then(loadHarvestPlatform)
    .tap(debug.bind(null, 'setting up event proxy...'))
    .then(setupEventProxy)
    .tap(debug.bind(null, 'setting up reinitialization loop...'))
    .then(function reinitializationLoop() {
      setInterval(reinitializeTimers, 1000);
    }).catch(debug);
};

/**
 *
 */

$(window).on('load', () => {
  (function waitForStoriesThenRun(){
    let $stories = $('.story.model');

    if (!$stories.length) {
      debug('waiting for stories...');
      return setTimeout(waitForStoriesThenRun, 250);
    }

    debug('found (%s) stories...', $stories.length);
    run();
  }());
});
