const Slack = require('@slack/bolt');
const { slackSigningSecret, slackBotToken, config } = require('../serverConfig');

const slackMess = async (message) => {
    if (slackSigningSecret === '' || slackBotToken === '') {
        return '';
    }

    const app = new Slack.App({
        signingSecret: slackSigningSecret,
        token: slackBotToken
    });

    await app.client.chat.postMessage({
        token: slackBotToken,
        channel: config.slackChannelName,
        text: message
    });

    return 'Message sent to Slack';
};

module.exports = {
    slackMess
};
