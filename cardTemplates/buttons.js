const { ActionTypes } = require('botbuilder');

const weatherToday = {
  type: ActionTypes.ImBack,
  title: 'What is the weather today?',
  value: 'What is the weather today?'
};

const weatherTomorrow = {
  type: ActionTypes.ImBack,
  title: 'What is the weather tomorrow?',
  value: 'What is the weather tomorrow?'
};

const weatherThisWeek = {
  type: ActionTypes.ImBack,
  title: 'Weather for this week',
  value: 'Weather for this week'
};

const defaultNews = {
  type: ActionTypes.ImBack,
  title: 'What is the latest news?',
  value: 'What is the latest news?'
};

const breakingNews = {
  type: ActionTypes.ImBack,
  title: 'Breaking news',
  value: 'Breaking news'
};

const tellJoke = {
  type: ActionTypes.ImBack,
  title: 'Tell me a joke',
  value: 'Tell me a joke'
};

const worldNews = {
  type: ActionTypes.ImBack,
  title: 'World news',
  value: 'World news'
};

const aiNews = {
  type: ActionTypes.ImBack,
  title: 'AI news',
  value: 'AI news'
};

const healthNews = {
  type: ActionTypes.ImBack,
  title: 'Health news',
  value: 'Health news'
};

const itNews = {
  type: ActionTypes.ImBack,
  title: 'IT Tech news',
  value: 'IT Tech news'
};

const anotherJoke = {
  type: ActionTypes.ImBack,
  title: 'Another One',
  value: 'Another One'
};

module.exports = {
  weatherToday,
  weatherTomorrow,
  weatherThisWeek,
  defaultNews,
  breakingNews,
  tellJoke,
  worldNews,
  aiNews,
  healthNews,
  itNews,
  anotherJoke
};
