import dotenv from "dotenv";
import superagent from "superagent";
import moment from "moment"
import _ from "lodash";


dotenv.config();

var events = [];

var botToken = process.env.DISCORD_BOT_TOKEN;
var appID = process.env.DISCORD_APP_ID;
var appPublicKey = process.env.DISCORD_PUBLIC_KEY;
var blueGreenChannel = process.env.DISCORD_CHANNEL_ID;

//console.log("blueGreenChannel", blueGreenChannel);
function discordRest(method, path, data) {

  //    return Promise.resolve("mocking notification", data);
  return superagent
  [method](`https://discord.com/api/v10/${path}`)
    .set('Authorization', `Bot ${botToken}`)
    .set('User-Agent', 'DiscordBot pizza-stop-alerts')
    .send(data)
    .catch(err => {
      console.error(err)
    })
}
function doNotify(content, context) {

  var e = {
    timestamp: moment(),
    result: `${content}${_.isObject(context) ? "  \n Context: \n" + JSON.stringify(context, null, 2) : ""}`
  };
  console.log(e);
  events.push(e);
  if (_.size(events) > 100) {
    events = _.drop(events);
  }

  msgHistory().then(messages => {
    var exists = _.find(messages, msg => {
      var msgDate = moment(msg.timestamp);
      var ago = moment().diff(msgDate, 'hours');
      return msg.content == content && ago < 24;
    });
    if (!exists) {
      return discordRest('post', `channels/${blueGreenChannel}/messages`, { content: content });
    } else {
      // console.log('do not want to spam too much: ', content);
    }
  });
}
function msgHistory() {
  return discordRest('get', `channels/${blueGreenChannel}/messages`)
    .then(result => {
      return result.body;
    })
}

export default {
  notify:doNotify,
  getEvents: () => events,
  test: () => doNotify('testing notifier')
};