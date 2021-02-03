buildNewsCarousel = (newsList) => {
  let bodyItems = [];
  newsList.forEach(element => {
    bodyItems.push({
      "contentType": "application/vnd.microsoft.card.thumbnail",
      "content": {
        "title": element.name,
        "subtitle": element.description,
        "images": [
          {
            "url": (element.image && element.image.thumbnail && element.image.thumbnail.contentUrl) ? element.image.thumbnail.contentUrl : '',
          }
        ],
        "buttons": [{
          "type": "openUrl",
          "title": "Read more",
          "value": (element.ampUrl) ? element.ampUrl : element.url,
        }]
      }
    });
  });

  return {
    "attachmentLayout": "carousel",
    "attachments": bodyItems
  }
}

module.exports = {
  buildNewsCarousel
}