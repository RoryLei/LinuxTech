/**
 * Linux Tech - Main Application
 * Handles routing between the topic grid and individual topic pages.
 */
(function () {
  'use strict';

  const mainEl = document.querySelector('main.container');

  // --- Render topic cards grid HTML ---
  function buildTopicGridHTML() {
    return '<section class="topics-grid">' +
      TOPICS.map(function (topic) {
        return '<a href="#' + topic.id + '" class="topic-card" role="article" aria-label="' + topic.title + '">' +
          '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
          '<h2 class="topic-card__title">' + topic.title + '</h2>' +
          '<p class="topic-card__desc">' + topic.description + '</p>' +
        '</a>';
      }).join('') +
    '</section>';
  }

  // --- Render a single topic page HTML ---
  function buildTopicPageHTML(topic) {
    var sectionsHTML = topic.sections.map(function (section) {
      return '<div class="topic-section"><h3>' + section.title + '</h3>' + section.content + '</div>';
    }).join('');

    return '<section class="topic-page">' +
      '<button class="topic-page__back" onclick="window.location.hash=\'\'">&larr; 回到主題列表</button>' +
      '<div class="topic-page__header">' +
        '<h2>' + topic.icon + ' ' + topic.title + '</h2>' +
        '<p>' + topic.description + '</p>' +
      '</div>' +
      sectionsHTML +
    '</section>';
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
  }

  // --- Initialize ---
  window.addEventListener('hashchange', router);
  router();
})();
