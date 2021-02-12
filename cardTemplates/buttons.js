const { ActionTypes } = require("botbuilder");

const weatherToday = {
  type: ActionTypes.ImBack,
  title: 'What\'s the weather today? ⛅',
  value: 'What is the weather today?',
};

const defaultNews = {
  type: ActionTypes.ImBack,
  title: 'What is the latest news?',
  value: 'What is the latest news?',
};

const tellJoke = {
  type: ActionTypes.ImBack,
  title: 'Tell me a joke 🙃',
  value: 'Tell me a joke',
};

const worldNews = {
  type: ActionTypes.ImBack,
  title: '🌎 World news',
  value: 'World news'
};

const aiNews = {
  type: ActionTypes.ImBack,
  title: 'AI news 💪🏽',
  value: 'AI news',
}

const healthNews = {
  type: ActionTypes.ImBack,
  title: '🍏 Health news',
  value: 'Health news'
};

const itNews = {
  type: ActionTypes.ImBack,
  title: 'IT Tech news',
  value: 'IT Tech news',
};

const tomorrowWeather = {
  type: ActionTypes.ImBack,
  title: 'What about tomorrow?',
  value: 'What about tomorrow?',
};

const anotherJoke = {
  type: ActionTypes.ImBack,
  title: 'Another One',
  value: 'Another One',
}

module.exports = {
  weatherToday,
  defaultNews,
  tellJoke,
  worldNews,
  aiNews,
  healthNews,
  itNews,
  tomorrowWeather,
  anotherJoke
}