const { App } = require('@slack/bolt');
const { config } = require('dotenv');

config();
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 * Messages can be listened for, using specific words and phrases.
 * Note: your Slack app *must* be subscribed to the following events
 * and scopes, as well as be present in the channels where they occur.
 * 
 * Please see the 'Event Subscriptions' and 'OAuth & Permissions'
 * sections of your app's configuration to add the following:
 * 
 * Event subscription required:   messages.channels
 * OAuth scope required:          chat:write
 * 
 * Further Information & Resources
 * https://slack.dev/bolt-js/concepts#message-listening
 * https://api.slack.com/messaging/retrieving#permissions
 */
app.message('hello', async ({ message, say }) => {
  await say(`Hello, <@${message.user}>!`);
});


/**
 * Shortcuts can be global (accessible from anywhere in Slack), 
 * or specific to messages (shown only in message context menus).
 * 
 * Shortcuts can trigger both modals and other app interactions.
 *  
 * Further Information & Resources
 * https://slack.dev/bolt-js/concepts#shortcuts
 */
app.shortcut('create_poll', async ({ ack, shortcut, client }) => {
  await ack();

  const { user, trigger_id } = shortcut;

  await client.views.open({
    trigger_id,
    view: {
      type: 'modal',
      callback_id: 'poll_shortcut_modal',
      title: {
        type: 'plain_text',
        text: 'Create new poll',
      },
      blocks: [

        // Channel Selection
        {
          type: "input",
          block_id: "target_conversation",
          element: {
            type: "conversations_select",
            placeholder: {
              type: "plain_text",
              text: "Select a conversation",
              emoji: true
            },
            filter: {
              include: [
                "public",
                "mpim"
              ],
              exclude_bot_users: true
            },
            action_id: 'input',
          },
          label: {
            type: "plain_text",
            text: "Select the conversation to publish your poll to:",
            emoji: true
          }
        },

        // Poll Question
        {
          type: 'input',
          block_id: 'poll_question',
          element: {
            type: 'plain_text_input',
            action_id: 'input'
          },
          label: {
            type: 'plain_text',
            text: 'Poll Question',
            emoji: true
          }
        },

        // Poll Options
        {
          type: 'input',
          block_id: 'option_1',
          element: {
            type: 'plain_text_input',
            action_id: 'input'
          },
          label: {
            type: 'plain_text',
            text: 'Option 1',
            emoji: true
          }
        },
        {
          type: 'input',
          block_id: 'option_2',
          element: {
            type: 'plain_text_input',
            action_id: 'input'
          },
          label: {
            type: 'plain_text',
            text: 'Option 2',
            emoji: true
          }
        },
        {
          type: 'input',
          block_id: 'option_3',
          element: {
            type: 'plain_text_input',
            action_id: 'input'
          },
          label: {
            type: 'plain_text',
            text: 'Option 3',
            emoji: true
          }
        }
      ],
      submit: {
        type: 'plain_text',
        text: 'Start Poll'
      },
    },
  });
});

/**
 * The view_sumbmission event occurs when a modal is submitted by 
 * the user.
 * 
 * The ID used in app.view() to identify the view corresponds to
 * the callback_id used where the view was defined and sent via
 * client.views.open(). 
 *  
 * Further Information & Resources
 * https://slack.dev/bolt-js/concepts#view_submissions
 */
app.view('poll_shortcut_modal', async ({ ack, body, view, client }) => {
  await ack();

  const { user } = body;

  /* Grab Modal Input Values */
  const {
    target_conversation,
    poll_question,
    option_1,
    option_2,
    option_3,
  } = view.state.values;

  // TODO :: when posting to a channel the bot isn't currently in, the following
  // error occurs (even with chat:write.public scope):
  // UnhandledPromiseRejectionWarning: Error: An API error occurred: not_in_channel

  /* Add Voting Emoji Options */
  // Your app *must* be in the channel you're posting to
  // Required scope(s): chat:write
  const { channel, ts } = await client.chat.postMessage({
    channel: target_conversation.input.selected_conversation,
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `<@${user.id}> wants to know: *${poll_question.input.value}*`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": `:one: ${option_1.input.value}`,
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": `:two: ${option_2.input.value}`,
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": `:three: ${option_3.input.value}`,
          "emoji": true
        }
      }
    ]
  });

  // TODO :: the following calls result in this error, x6:
  /*
    [WARN]  bolt-app Request verification failed (
      code: slack_bolt_receiver_authenticity_error,
      message: Slack request signing verification failed. Signature mismatch.
    )
  */

  /* Add Voting Emoji Options */
  // Required scope(s): reactions:write
  await client.reactions.add({
    channel,
    name: "one",
    timestamp: ts
  });

  await client.reactions.add({
    channel,
    name: "two",
    timestamp: ts
  });

  await client.reactions.add({
    channel,
    name: "three",
    timestamp: ts
  });
});

// TODO :: bring doc string up to same quality as previous examples

/* Listening for Reaction Emojis */
// Your app *must* be in the channel of the message
// Event subscription: reaction_added
// Required scope(s): reactions:read
app.event('reaction_added', async ({ event, client }) => {
  const { reaction, user, item: { channel, ts } } = event;

  // Warning: some flags don't contain 'flag-' (US, Japan)
  if (!reaction.includes('flag-')) return;

  const [x, country] = reaction.split('-');

  let translatedText;

  // TODO :: better to turn this into a map of emoji country codes with values 
  // of the corresponding API country code if they differ (unverified)
  switch (country) {
    case 'mx':
      // TODO :: call translation API
      translatedText = 'This is in Spanish';
      break;
    case 'jp':
      // TODO :: call translation API
      translatedText = 'This is in Japanese';
      break;
  }

  if (translatedText) {
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: translatedText
    });
  }

});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running! ⚡️');
})();
