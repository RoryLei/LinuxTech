/**
 * Linux Tech - Main Application
 * Handles routing, view mode switching, and rendering.
 */
(function () {
  'use strict';

  var mainEl = document.querySelector('main.container');
  var currentView = localStorage.getItem('linuxtech-view') || 'medium';
  var currentSort = localStorage.getItem('linuxtech-sort') || 'default';
  var currentCategory = localStorage.getItem('linuxtech-category') || 'all';
  var currentQuery = ''; // transient keyword search (not persisted)

  // Sort mode definitions
  var SORT_MODES = [
    { id: 'default',  label: 'Default Order' },
    { id: 'alpha',    label: 'A → Z' },
    { id: 'alpha-desc', label: 'Z → A' }
  ];

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
    var viewOptions = VIEW_MODES.map(function (mode) {
      var selected = mode.id === currentView ? ' selected' : '';
      return '<option value="' + mode.id + '"' + selected + '>' + mode.label + '</option>';
    }).join('');

    var sortOptions = SORT_MODES.map(function (mode) {
      var selected = mode.id === currentSort ? ' selected' : '';
      return '<option value="' + mode.id + '"' + selected + '>' + mode.label + '</option>';
    }).join('');

    var escapedQuery = escapeAttr(currentQuery);

    return '<div class="view-toolbar">' +
      '<div class="view-toolbar__search">' +
        '<label class="view-toolbar__label" for="search-input">Search:</label>' +
        '<div class="search-box">' +
          '<span class="search-box__icon" aria-hidden="true">&#128269;</span>' +
          '<input type="search" id="search-input" class="search-box__input" ' +
            'placeholder="Search topics by keyword..." ' +
            'aria-label="Search topics by keyword" ' +
            'autocomplete="off" spellcheck="false" value="' + escapedQuery + '">' +
          '<button type="button" id="search-clear" class="search-box__clear" ' +
            'aria-label="Clear search" title="Clear search"' +
            (currentQuery ? '' : ' hidden') + '>&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="view-toolbar__controls">' +
        '<label class="view-toolbar__label" for="sort-select">Sort:</label>' +
        '<select id="sort-select" class="view-toolbar__select" aria-label="Select sort order">' +
          sortOptions +
        '</select>' +
        '<label class="view-toolbar__label" for="view-select">View:</label>' +
        '<select id="view-select" class="view-toolbar__select" aria-label="Select view mode">' +
          viewOptions +
        '</select>' +
      '</div>' +
    '</div>';
  }

  // --- Escape a string for safe use in an HTML attribute ---
  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // --- Escape a string for use inside a RegExp ---
  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // --- Strip HTML tags from a string (for searching prose in section content) ---
  function stripHTML(html) {
    return String(html).replace(/<[^>]*>/g, ' ');
  }

  // --- Highlight matched query terms within a plain-text string ---
  function highlight(text) {
    var q = currentQuery.trim();
    if (!q) {
      return text;
    }
    var terms = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (terms.length === 0) {
      return text;
    }
    var re = new RegExp('(' + terms.join('|') + ')', 'gi');
    return text.replace(re, '<mark class="search-hit">$1</mark>');
  }

  // --- Build a single card based on view mode ---
  function buildCard(topic, view) {
    var href = '#' + topic.id;
    var title = highlight(topic.title);
    var desc = highlight(topic.description);

    if (view === 'large') {
      return '<a href="' + href + '" class="topic-card topic-card--large" role="article" aria-label="' + escapeAttr(topic.title) + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + title + '</h2>' +
        '<p class="topic-card__desc">' + desc + '</p>' +
      '</a>';
    }

    if (view === 'medium') {
      return '<a href="' + href + '" class="topic-card topic-card--medium" role="article" aria-label="' + escapeAttr(topic.title) + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + title + '</h2>' +
        '<p class="topic-card__desc">' + desc + '</p>' +
      '</a>';
    }

    if (view === 'small') {
      return '<a href="' + href + '" class="topic-card topic-card--small" role="article" aria-label="' + escapeAttr(topic.title) + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + title + '</h2>' +
      '</a>';
    }

    if (view === 'list') {
      return '<a href="' + href + '" class="topic-card topic-card--list" role="article" aria-label="' + escapeAttr(topic.title) + '">' +
        '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<h2 class="topic-card__title">' + title + '</h2>' +
        '<p class="topic-card__desc">' + desc + '</p>' +
      '</a>';
    }

    // details
    return '<a href="' + href + '" class="topic-card topic-card--details" role="article" aria-label="' + escapeAttr(topic.title) + '">' +
      '<span class="topic-card__icon" aria-hidden="true">' + topic.icon + '</span>' +
      '<div class="topic-card__info">' +
        '<h2 class="topic-card__title">' + title + '</h2>' +
        '<p class="topic-card__desc">' + desc + '</p>' +
        '<span class="topic-card__meta">' + topic.sections.length + ' sections</span>' +
      '</div>' +
    '</a>';
  }

  // --- Build a lowercase searchable text blob for a topic (memoized) ---
  function getSearchText(topic) {
    if (topic.__searchText) {
      return topic.__searchText;
    }
    var parts = [topic.id, topic.title, topic.description];
    // Optional explicit keywords array on a topic
    if (Array.isArray(topic.keywords)) {
      parts.push(topic.keywords.join(' '));
    }
    // Section titles + prose (HTML stripped) so deep content is findable
    if (Array.isArray(topic.sections)) {
      topic.sections.forEach(function (s) {
        parts.push(s.title || '');
        parts.push(stripHTML(s.content || ''));
      });
    }
    topic.__searchText = parts.join(' ').toLowerCase();
    return topic.__searchText;
  }

  // --- Filter topics by the current keyword query (AND across terms) ---
  function getFilteredTopics(topics) {
    var q = currentQuery.trim().toLowerCase();
    if (!q) {
      return topics;
    }
    var terms = q.split(/\s+/);
    return topics.filter(function (topic) {
      var text = getSearchText(topic);
      return terms.every(function (term) {
        return text.indexOf(term) !== -1;
      });
    });
  }

  // --- Get sorted topics ---
  function getSortedTopics() {
    var sorted = TOPICS.slice();
    if (currentSort === 'alpha') {
      sorted.sort(function (a, b) { return a.title.localeCompare(b.title); });
    } else if (currentSort === 'alpha-desc') {
      sorted.sort(function (a, b) { return b.title.localeCompare(a.title); });
    }
    return sorted;
  }

  // --- Category helpers ---

  // The list of categories, or an empty list if categories.js didn't load.
  function getCategories() {
    return (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) ? CATEGORIES : [];
  }

  // Resolve a topic's category id, falling back to 'other' when missing/unknown.
  function topicCategory(topic) {
    var known = getCategories().some(function (c) { return c.id === topic.category; });
    return known ? topic.category : 'other';
  }

  // Count topics per category id across the full topic set.
  function categoryCounts() {
    var counts = {};
    TOPICS.forEach(function (t) {
      var cid = topicCategory(t);
      counts[cid] = (counts[cid] || 0) + 1;
    });
    return counts;
  }

  // Filter a topic list to the current category ('all' = no filter).
  function getCategoryTopics(topics) {
    if (currentCategory === 'all') {
      return topics;
    }
    return topics.filter(function (t) { return topicCategory(t) === currentCategory; });
  }

  // Human-readable label for the active category.
  function currentCategoryLabel() {
    if (currentCategory === 'all') {
      return 'All Topics';
    }
    var cat = getCategories().find(function (c) { return c.id === currentCategory; });
    return cat ? cat.label : 'Topics';
  }

  // --- Build the category sidebar ---
  function buildSidebarHTML() {
    var counts = categoryCounts();
    var cats = getCategories();

    function item(id, icon, label, count) {
      var active = (id === currentCategory);
      return '<li>' +
        '<button type="button" class="category-item' + (active ? ' category-item--active' : '') + '" ' +
          'data-category="' + escapeAttr(id) + '" ' +
          (active ? 'aria-current="true" ' : '') +
          'aria-label="' + escapeAttr(label) + ', ' + count + ' topics">' +
          '<span class="category-item__icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="category-item__label">' + label + '</span>' +
          '<span class="category-item__count" aria-hidden="true">' + count + '</span>' +
        '</button>' +
      '</li>';
    }

    var lis = item('all', '&#128218;', 'All Topics', TOPICS.length);
    cats.forEach(function (c) {
      var n = counts[c.id] || 0;
      if (n === 0) { return; } // hide empty categories
      lis += item(c.id, c.icon, c.label, n);
    });

    return '<aside class="category-sidebar" aria-label="Topic categories">' +
      '<h2 class="category-sidebar__title">Categories</h2>' +
      '<ul class="category-list">' + lis + '</ul>' +
    '</aside>';
  }

  // --- Render just the results area (grid + count/empty state) ---
  //     Kept separate from the toolbar so typing doesn't rebuild the input
  //     and lose focus/cursor position.
  function buildResultsHTML() {
    // Apply category filter first, then keyword search, then sort.
    var inCategory = getCategoryTopics(getSortedTopics());
    var topics = getFilteredTopics(inCategory);
    var q = currentQuery.trim();

    // Heading: which category is being shown + how many topics.
    var headingHTML = '<div class="results-heading">' +
      '<h2 class="results-heading__title">' + escapeAttr(currentCategoryLabel()) + '</h2>' +
      '<span class="results-heading__count">' + topics.length +
        ' topic' + (topics.length === 1 ? '' : 's') + '</span>' +
    '</div>';

    var countHTML = '';
    if (q) {
      var scope = currentCategory === 'all' ? '' : ' in ' + escapeAttr(currentCategoryLabel());
      countHTML = '<p class="search-count" role="status" aria-live="polite">' +
        topics.length + ' result' + (topics.length === 1 ? '' : 's') +
        ' for &ldquo;' + escapeAttr(q) + '&rdquo;' + scope + '</p>';
    }

    if (topics.length === 0) {
      var emptyMsg = q
        ? 'No topics match &ldquo;' + escapeAttr(q) + '&rdquo;' +
            (currentCategory === 'all' ? '' : ' in ' + escapeAttr(currentCategoryLabel()))
        : 'No topics in this category yet';
      return headingHTML + countHTML +
        '<section class="search-empty" role="status" aria-live="polite">' +
          '<span class="search-empty__icon" aria-hidden="true">&#128269;</span>' +
          '<p class="search-empty__title">' + emptyMsg + '</p>' +
          '<p class="search-empty__hint">Try a different keyword or category, or ' +
            '<button type="button" class="search-empty__reset" id="search-reset">reset filters</button>.</p>' +
        '</section>';
    }

    var gridClass = 'topics-grid topics-grid--' + currentView;
    var cards = topics.map(function (topic) {
      return buildCard(topic, currentView);
    }).join('');

    return headingHTML + countHTML + '<section class="' + gridClass + '">' + cards + '</section>';
  }

  // --- Render topic grid page (sidebar + toolbar + results) ---
  function buildTopicGridHTML() {
    return '<div class="topics-layout">' +
      buildSidebarHTML() +
      '<div class="topics-main">' +
        buildViewToolbar() +
        '<div id="results-area">' + buildResultsHTML() + '</div>' +
      '</div>' +
    '</div>';
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

  // --- Handle sort mode change ---
  function onSortChange(e) {
    currentSort = e.target.value;
    localStorage.setItem('linuxtech-sort', currentSort);
    router();
  }

  // --- Re-render only the results area (preserves search-input focus) ---
  function refreshResults() {
    var area = document.getElementById('results-area');
    if (area) {
      area.innerHTML = buildResultsHTML();
      attachResultsListeners();
    }
    // Toggle the clear button without rebuilding the input
    var clearBtn = document.getElementById('search-clear');
    if (clearBtn) {
      clearBtn.hidden = !currentQuery;
    }
  }

  // --- Handle keyword input ---
  function onSearchInput(e) {
    currentQuery = e.target.value || '';
    refreshResults();
  }

  // --- Clear the search and refocus the input ---
  function clearSearch() {
    currentQuery = '';
    var input = document.getElementById('search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    refreshResults();
  }

  // --- Reset both the keyword search and the category filter ---
  function resetFilters() {
    currentQuery = '';
    setCategory('all');
    var input = document.getElementById('search-input');
    if (input) { input.value = ''; }
  }

  // --- Select a category and re-render (updates sidebar + results) ---
  function setCategory(id) {
    currentCategory = id;
    localStorage.setItem('linuxtech-category', currentCategory);

    // Update sidebar active state in place (no full router re-render needed).
    var items = document.querySelectorAll('.category-item');
    Array.prototype.forEach.call(items, function (btn) {
      var active = btn.getAttribute('data-category') === currentCategory;
      btn.classList.toggle('category-item--active', active);
      if (active) {
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    refreshResults();
  }

  // --- Attach listeners that live inside the results area ---
  function attachResultsListeners() {
    var reset = document.getElementById('search-reset');
    if (reset) {
      reset.addEventListener('click', resetFilters);
    }
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

    // Attach event listeners to dropdowns
    var select = document.getElementById('view-select');
    if (select) {
      select.addEventListener('change', onViewChange);
    }
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', onSortChange);
    }

    // Search input + clear button
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', onSearchInput);
      // Press Escape to clear while focused in the box
      searchInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') {
          clearSearch();
        }
      });
      // Restore focus/caret when re-rendering with an active query
      if (currentQuery) {
        searchInput.focus();
        var len = searchInput.value.length;
        try { searchInput.setSelectionRange(len, len); } catch (err) { /* noop */ }
      }
    }
    var searchClear = document.getElementById('search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', clearSearch);
    }

    // Category sidebar buttons
    var catButtons = document.querySelectorAll('.category-item');
    Array.prototype.forEach.call(catButtons, function (btn) {
      btn.addEventListener('click', function () {
        setCategory(btn.getAttribute('data-category'));
      });
    });

    attachResultsListeners();
  }

  // --- Global keyboard shortcut: "/" focuses the search box ---
  window.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && !window.location.hash.slice(1)) {
      var input = document.getElementById('search-input');
      var active = document.activeElement;
      var typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
      if (input && !typing) {
        ev.preventDefault();
        input.focus();
      }
    }
  });

  // --- Initialize ---
  window.addEventListener('hashchange', router);
  router();
})();
