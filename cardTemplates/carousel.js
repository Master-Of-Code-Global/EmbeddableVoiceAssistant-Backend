buildNewsCarousel = (newsList) => {
  const bodyItems = [];
  newsList.forEach(element => {
    const cardObj = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.0',
        body: [{
          type: 'Container',
          items: [{
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: element.name,
                    weight: 'bolder',
                    size: 'Large'
                  }
                ]
              }
            ]
          }, {
            type: 'TextBlock',
            text: element.description,
            weight: 'normal',
            size: 'medium'
          }, {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: ((element.provider[0] || {}).name || {}),
                    weight: 'normal',
                    size: 'small'
                  }
                ]
              }
            ]
          }]
        }],
        actions: [{
          type: 'Action.OpenUrl',
          title: 'Read more',
          url: (element.ampUrl) ? element.ampUrl : element.url
        }]
      }
    };

    if (element.image && element.image.thumbnail && element.image.thumbnail.contentUrl) {
      cardObj.content.body[0].items[0].columns.unshift({
        type: 'Column',
        width: 'auto',
        items: [
          {
            type: 'Image',
            url: element.image.thumbnail.contentUrl,
            size: 'Large'
          }
        ]
      });
    }

    if (element.provider[0] && element.provider[0].image && element.provider[0].image.thumbnail && element.provider[0].image.thumbnail.contentUrl) {
      cardObj.content.body[0].items[2].columns.unshift({
        type: 'Column',
        width: 'auto',
        items: [
          {
            type: 'Image',
            url: element.provider[0].image.thumbnail.contentUrl,
            size: 'small'
          }
        ]
      });
    }

    bodyItems.push(cardObj);
  });

  return {
    attachmentLayout: 'carousel',
    attachments: bodyItems
  };
};

module.exports = {
  buildNewsCarousel
};
