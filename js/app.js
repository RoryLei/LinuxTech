/**
 * Linux Tech - Main Application
 * Handles routing, view mode switching, and rendering.
 */
(function () {
  'use strict';

  var mainEl = document.querySelector('main.container');
  var currentView = localStorage.getItem('linuxtech-view') || 'medium';

  // View mode definitions
  var VIEW_MODES = [
    { id: 'large',   label: 'Large Icons',  icon: '&#9638;' },
    { id: 'medium',  label: 'Medium Icons', icon: '&#9638;&#9638;' },
    { id: 'small',   label: 'Small Icons',  icon: '&#9638;&#9638;&#9638;' },
    { id: 'list',    label: 'List',         icon: '&#9776;' },
    { id: 'details', label: 'Details',      icon: '&#9776;&#9776;' }
  ];

  // --- Build the view toolbar ---
  function buildViewToolbar() {
    var options = VIEW_MODES.map(function (mode) {
      var selected = mode.id === currentView ? ' selected' : '';
      return '<option value="' + mode.id + '"' + selected + '>' + mode.label + '</option>';
    }).join('');

    return '<div class="view-toolbar">' +
      '<label class="view-toolbar__label" for="view-select">View:</label>' +
      '<select id="view-select" class="view-toolbar__select" aria-label="Select view mode">' +
        options +
      '</select>' +
    '</div>';
  }

  // --- Build a single card based on view mode ---
  function buildCard(topic, view) {
    var href = '#' + topic.id;

    if (view === 'large') {
      return '<a href="' + href + '" class="topic-card topic-card--large" role="article" aria-label="' + topic.title + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + topic.title + '</h2>' +
        '<p class="topic-card__desc">' + topic.description + '</p>' +
      '</a>';
    }

    if (view === 'medium') {
      return '<a href="' + href + '" class="topic-card topic-card--medium" role="article" aria-label="' + topic.title + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + topic.title + '</h2>' +
        '<p class="topic-card__desc">' + topic.description + '</p>' +
      '</a>';
    }

    if (view === 'small') {
      return '<a href="' + href + '" class="topic-card topic-card--small" role="article" aria-label="' + topic.title + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + topic.title + '</h2>' +
      '</a>';
    }

    if (view === 'list') {
      return '<a href="' + href + '" class="topic-card topic-card--list" role="article" aria-label="' + topic.title + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + topic.title + '</h2>' +
        '<p class="topic-card__desc">' + topic.description + '</p>' +
      '</a>';
    }

    // details
    return '<a href="' + href + '" class="topic-card topic-card--details" role="article" aria-label="' + topic.title + '">' +
      '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
      '<div class="topic-card__info">' +
        '<h2 class="topic-card__title">' + topic.title + '</h2>' +
        '<p class="topic-card__desc">' + topic.description + '</p>' +
        '<span class="topic-card__meta">' + topic.sections.length + ' sections</span>' +
      '</div>' +
    '</a>';
  }

  // --- Render topic grid with current view mode ---
  function buildTopicGridHTML() {
    var gridClass = 'topics-grid topics-grid--' + currentView;
    var cards = TOPICS.map(function (topic) {
      return buildCard(topic, currentView);
    }).join('');

    return buildViewToolbar() +
      '<section class="' + gridClass + '">' + cards + '</section>';
  }

  // --- Render a single topic page ---
  function buildTopicPageHTML(topic) {
    var sectionsHTML = topic.sections.map(function (section) {
      return '<div class="topic-section"><h3>' + section.title + '</h3>' + section.content + '</div>';
    }).join('');

    return '<section class="topic-page">' +
      '<button class="topic-page__back" onclick="window.location.hash=\'\'">&larr; Back to Topics</button>' +
      '<div class="topic-page__header">' +
        '<h2>' + topic.icon + ' ' + topic.title + '</h2>' +
        '<p>' + topic.description + '</p>' +
      '</div>' +
      sectionsHTML +
    '</section>';
  }

  // --- Handle view mode change ---
  function onViewChange(e) {
    currentView = e.target.value;
    localStorage.setItem('linuxtech-view', currentView);
    router();
  }

  // --- Simple hash-based router ---
  function router() {
    var hash = window.location.hash.slice(1);

    if (hash) {
      var topic = TOPICS.find(function (t) { return t.id === hash; });
      if (topic) {
        mainEl.innerHTML = buildTopicPageHTML(topic);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Default: show topic grid
    mainEl.innerHTML = buildTopicGridHTML();

    // Attach event listener to the dropdown
    var select = document.getElementById('view-select');
    if (select) {
      select.addEventListener('change', onViewChange);
    }
  }

  // --- Initialize ---
  window.addEventListener('hashchange', router);
  router();
})();
