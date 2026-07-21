/**
 * Linux Tech - Main Application
 * Handles routing between the topic grid and individual topic pages.
 */
(function () {
  'use strict';

  const mainEl = document.querySelector('main .container');
  const topicsSection = document.getElementById('topics');

  // --- Render topic cards on the landing page ---
  function renderTopicGrid() {
    topicsSection.innerHTML = TOPICS.map(topic => `
      <a href="#${topic.id}" class="topic-card" role="article" aria-label="${topic.title}">
        <span class="topic-card__icon" aria-hidden="true">${topic.icon}</span>
        <h2 class="topic-card__title">${topic.title}</h2>
        <p class="topic-card__desc">${topic.description}</p>
      </a>
    `).join('');
  }

  // --- Render a single topic page ---
  function renderTopicPage(topic) {
    const html = `
      <section class="topic-page">
        <button class="topic-page__back" onclick="window.location.hash=''">&larr; 回到主題列表</button>
        <div class="topic-page__header">
          <h2>${topic.icon} ${topic.title}</h2>
          <p>${topic.description}</p>
        </div>
        ${topic.sections.map(section => `
          <div class="topic-section">
            <h3>${section.title}</h3>
            ${section.content}
          </div>
        `).join('')}
      </section>
    `;
    mainEl.innerHTML = html;
  }

  // --- Simple hash-based router ---
  function router() {
    const hash = window.location.hash.slice(1); // remove '#'

    if (hash) {
      const topic = TOPICS.find(t => t.id === hash);
      if (topic) {
        renderTopicPage(topic);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Default: show grid
    mainEl.innerHTML = '';
    mainEl.appendChild(topicsSection);
    renderTopicGrid();
  }

  // --- Initialize ---
  window.addEventListener('hashchange', router);
  router();
})();
