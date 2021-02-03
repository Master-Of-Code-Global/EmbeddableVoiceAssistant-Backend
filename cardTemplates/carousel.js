buildNewsCarousel = (newsList) => {
  let bodyItems = [];
  newsList.forEach(element => {
    bodyItems.push({
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": [{
          "type": "Container",
          "items": [{
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "Image",
                    "url": (((element.image || {}).thumbnail || {}).contentUrl || ''),
                    "size": "medium"
                  }
                ]
              },{
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": element.name,
                    "weight": "bolder",
                    "size": "Large"
                  }
                ]
              }
            ]
          }, {
              "type": "TextBlock",
              "text": element.description,
              "weight": "normal",
              "size": "medium"
          }, {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "Image",
                    "url": ((((element.provider[0] || {}).image || {}).thumbnail || {}).contentUrl || ''),
                    "size": "small"
                  }
                ]
              },{
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": ((element.provider[0] || {}).name || {}),
                    "weight": "normal",
                    "size": "small"
                  }
                ]
              }
            ]
          }]
        }],
        "tap": {
          "type": "openUrl",
          "value": (element.ampUrl) ? element.ampUrl : element.url,
        }
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