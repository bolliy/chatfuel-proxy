'use strict';

const express = require('express');
const url = require('url');
const axios = require('axios');

var SERVER_IP = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    PORT = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;

const SAPCAI_REQUEST_TOKEN = process.env.TOKEN || 'XXX';

// Setting up our server
express()
  // This route will be triggered when Chatfuel sends a message
  .get('/', (req, res) => {
    const query = url.parse(req.url, true).query;
    console.log(query);
    const userId = query['chatfuel user id'];
    const userMessage = query['user_message'];

    // Call SAP Conversational AI API with the user message
    return axios
      .post(
        'https://api.cai.tools.sap/build/v1/dialog',
        {
          message: { content: userMessage, type: 'text' },
          conversation_id: userId,
        },
        { headers: { Authorization: `Token ${SAPCAI_REQUEST_TOKEN}` } }
      )
      .then(body => {
        // Format messages to Chatfuel format
        const formattedMessages = body.data.results.messages.map(chatfuelFormat);

        // Sends the answer back to Chatfuel
        res.json({
          messages: formattedMessages,
        });
      })
      .catch(error => {
        console.log(error);
      });
  })
  .listen(PORT,SERVER_IP, () => {
    console.log(`App started on port ${PORT}`);
    console.log('Token '+SAPCAI_REQUEST_TOKEN);
  });

// We need to manually "translate" SAP Conversational AI message object to Chatfuel's format
// For now I only implemented text and images but you can add others if you need to
// Check out the documentation I linked above to the see the json structure of the other formats
function chatfuelFormat(message) {
  // Source : { type: 'text', content: 'XXX' }
  // Destination { text: 'XXX' }
  if (message.type === 'text') {
    return { text: message.content };
  }

  // Source: { type: 'picture', content: 'URL' }
  // Destination: { attachment: { type: 'image', payload: { url: 'URL' } } }
  if (message.type === 'picture') {
    return {
      attachment: {
        type: 'image',
        payload: { url: message.content },
      },
    };
  }

  console.error('Unsupported message format: ', message.type);
  return { text: 'An error occured' };
}
