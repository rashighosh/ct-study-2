// Importing the TalkingHead module
import { TalkingHead } from 'talkinghead';


var head; // TalkingHead instance
var character = sessionStorage.getItem("character")
var characterBody = sessionStorage.getItem("body")

// Load and show the avatar
document.addEventListener('DOMContentLoaded', async function (e) {
  const nodeAvatar = document.getElementById('virtualcharacter');
  head = new TalkingHead(nodeAvatar, {
    ttsEndpoint: "blah",
    lipsyncModules: ["en"], // language
    cameraY: 0,
    cameraView: "mid", // full, mid, upper, head
    cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
    // interactions w 3d scene, usually disable
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  });


  // Load and show the avatar
  try {
    // renders avatar on screen
    await head.showAvatar({
      url: '/character-models/' + character,
      body: characterBody, // either M or F, specified in charaterType
      avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
      lipsyncLang: 'en',
    }, (ev) => {});
  } catch (error) {
    console.log(error);
  }

});

// start audio for first agent audio (interrupts/disrupts any current audio)
export async function characterAudio(audio, emoji, agent, onSpeechEnd) {
    head.playGesture('👋');
    head.replaceAndSpeakNewAudio(audio);
}

// for streaming audio, waits for current audio to finish
export async function characterAudioQueue(audio, emoji) {
  try {
    if (emoji) {
      head.playGesture(emoji);
    }

    // can have subtitles! and other stuff. hve to look more into if u want it
    head.speakAudio(audio, null, null);

  } catch (error) {
    console.error('Error during speech processing:', error);
  }
}

// for streaming audio, waits for current audio to finish
export async function stopSpeaking() {
  try {
    head.stopSpeaking();
  } catch (error) {
    console.error('Stopping speaking', error);
  }
}
