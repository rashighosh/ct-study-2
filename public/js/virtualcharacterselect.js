// Importing the TalkingHead module
import { TalkingHead } from 'talkinghead';

var headrashi; // TalkingHead instance
var headchris; // TalkingHead instance
var headroshan; // TalkingHead instance
var headdanish; // TalkingHead instance

console.log("IN VIRTUaL CHARaCTER SELECT")

// Load and show the avatar
document.addEventListener('DOMContentLoaded', async function (e) {
  const nodeAvatarRashi = document.getElementById('rashi-glb');
  headrashi = new TalkingHead(nodeAvatarRashi, {
    ttsEndpoint: "blah",
    lipsyncModules: ["en"], // language
    cameraY: 0,
    cameraView: "full", // full, mid, upper, head
    cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
    // interactions w 3d scene, usually disable
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  });

  const nodeAvatarChris = document.getElementById('chris-glb');
  headchris = new TalkingHead(nodeAvatarChris, {
    ttsEndpoint: "blah",
    lipsyncModules: ["en"], // language
    cameraY: 0,
    cameraView: "full", // full, mid, upper, head
    cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
    // interactions w 3d scene, usually disable
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  });

  const nodeAvatarRoshan = document.getElementById('roshan-glb');
  headroshan = new TalkingHead(nodeAvatarRoshan, {
    ttsEndpoint: "blah",
    lipsyncModules: ["en"], // language
    cameraY: 0,
    cameraView: "full", // full, mid, upper, head
    cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
    // interactions w 3d scene, usually disable
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  });

  const nodeAvatarDanish = document.getElementById('danish-glb');
  headdanish = new TalkingHead(nodeAvatarDanish, {
    ttsEndpoint: "blah",
    lipsyncModules: ["en"], // language
    cameraY: 0,
    cameraView: "full", // full, mid, upper, head
    cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
    // interactions w 3d scene, usually disable
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  });

  try {
    // renders avatar on screen
    await headrashi.showAvatar({
      url: '/character-models/rashi.glb',
      body: 'F', // either M or F, specified in charaterType
      avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
      lipsyncLang: 'en',
    }, (ev) => { });
    // renders avatar on screen
    await headchris.showAvatar({
        url: '/character-models/chris.glb',
        body: 'M', // either M or F, specified in charaterType
        avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
        lipsyncLang: 'en',
      }, (ev) => { });
      // renders avatar on screen
    await headroshan.showAvatar({
        url: '/character-models/roshan.glb',
        body: 'M', // either M or F, specified in charaterType
        avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
        lipsyncLang: 'en',
      }, (ev) => { });
      // renders avatar on screen
    await headdanish.showAvatar({
        url: '/character-models/demo.glb', //CHANGE
        body: 'F', //CHANGE
        avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
        lipsyncLang: 'en',
      }, (ev) => { });
  } catch (error) {
    console.log(error);
  }

});