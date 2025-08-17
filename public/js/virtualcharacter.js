// Importing the TalkingHead module
import { TalkingHead } from 'talkinghead';
var head; // TalkingHead instance
var head1;

var character
var characterBody

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var condition = urlParams.get('c')
condition = parseInt(condition)

console.log("In virtualcharacter.js")

if (condition === 0) {
  console.log("condition is 0")
  character = "/character-models/female.glb";
  characterBody = 'F'
} else {
    character = "/character-models/male.glb"
    characterBody = 'M'
}

var first=true;
var counter = 0;

console.log("about to load avatar")

// Load and show the avatar
document.addEventListener('DOMContentLoaded', async function (e) {
  const nodeAvatar = document.getElementById('virtualcharacter');
  head = new TalkingHead(nodeAvatar, {
    ttsEndpoint: "blah",
    ttsVoice: "en-US-Neural2-C",
    ttsPitch: 3,
    lipsyncModules: ["en"], // language
    cameraY: 0,
    cameraRotateY: 0,
    cameraView: "mid", // full, mid, upper, head
    cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
    // interactions w 3d scene, usually disable
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  });

  if (condition === 1) {
    const nodeAvatar1 = document.getElementById('virtualcharacter1');
    head1 = new TalkingHead(nodeAvatar1, {
      ttsEndpoint: "blah",
      ttsVoice: "en-US-Neural2-J",
      ttsPitch: -5,
      lipsyncModules: ["en"], // language
      cameraY: 0,
      cameraRotateY: 0,
      cameraView: "mid", // full, mid, upper, head
      cameraDistance: 0, // negative is zoom in from base, postitive zoom out (in meters)
      // interactions w 3d scene, usually disable
      cameraRotateEnable: false,
      cameraPanEnable: false,
      cameraZoomEnable: false,
    });
  }


  // Load and show the avatar
  try {
    // renders avatar on screen
    await head.showAvatar({
      url: "/character-models/female.glb",
      body: 'F', // either M or F, specified in charaterType
      avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
      lipsyncLang: 'en',
    }, (ev) => { });
    
    if (condition === 1) {
      await head1.showAvatar({
        url: "/character-models/male.glb",
        body: 'M', // either M or F, specified in charaterType
        avatarMood: 'happy', // neutral, happy, (most used, rest are there): angry, sad, fear, disgust, love, sleep
        lipsyncLang: 'en',
      }, (ev) => { });
    }
  } catch (error) {
    console.log(error);
  }

  head.playPose('straight');
  head1.playPose('straight');


});

export async function thinkingPose() {
  head.playGesture('thinking', 60);
  head.playGesture('👀', 60);
}

export async function raiseHand() {
  head1.stopGesture();
  head1.playGesture('🤚');
}

export async function lowerHand() {
  console.log("LOWERING HAND")
  head1.stopGesture();
}

export async function focusCharacter(character) {
  if (character === "doctor") {
      head.setLighting({
        lightDirectIntensity: 45,   // Dim directional light,
        lightSpotIntensity: 45,
      })
      if (condition === 1) {
        head1.setLighting({
          lightDirectIntensity: 0,   // Dim directional light
        })
        document.querySelector("#virtualcharacter1 > canvas").classList.add("dim")
      }
      
      document.querySelector("#virtualcharacter > canvas").classList.remove("dim")
  } else if (character==="support") {
    head.setLighting({
      lightDirectIntensity: 0,   // Dim directional light
    })
    head1.setLighting({
      lightDirectIntensity: 45,   // Dim directional light
      lightSpotIntensity: 45,
    })
    document.querySelector("#virtualcharacter1 > canvas").classList.remove("dim")
    document.querySelector("#virtualcharacter > canvas").classList.add("dim")
  } else {
    head.setLighting({
      lightDirectIntensity: 0,   // Dim directional light
    })
    if (condition === 1) {
      head1.setLighting({
        lightDirectIntensity: 0,   // Dim directional light
      })
      document.querySelector("#virtualcharacter1 > canvas").classList.add("dim")
    }
    document.querySelector("#virtualcharacter > canvas").classList.add("dim")
  }
}

export async function turnCharacter(character) {
  if (character === "doctor") {
    head.playGesture('🌹');
  } else {
    head1.playGesture('🌷');
  }
}

export async function resetCharacter(character) {
  if (character === "doctor") {
    head.stopGesture();
  } else {
    head1.stopGesture();
  }
}

// start audio for first agent audio (interrupts/disrupts any current audio)
export async function characterAudio(audio, emoji, agent, onSpeechEnd) {
  var agentHead = head;
  var direction = -.7
  if (agent === "support") {
      agentHead = head1;
      direction = .7
  }
  try {
      // Handle first-time gestures
      if (counter === 0) {
          agentHead.playGesture('👋');
          counter++;
      }
      agentHead.speakText(audio)

      // agentHead.replaceAndSpeakNewAudio(audio);
      // head1.rotateCharacter(direction)
      // head.rotateCharacter(.7)

      // Wait 3 seconds, then start checking for speaking status
      setTimeout(() => {
          const checkSpeakingStatus = setInterval(() => {
              if (!agentHead.isSpeaking) {
                  console.log("Character has finished speaking!");
                  // head1.rotateCharacter(0)
                  // head.rotateCharacter(0)
                  clearInterval(checkSpeakingStatus); // Stop checking

                  // **Trigger the callback when speaking finishes**
                  if (onSpeechEnd) {
                      onSpeechEnd();
                  }
              }
          }, 1000); // Check every 1s
      }, 3000); // Delay check start by 3s

  } catch (error) {
      console.error('Error during speech processing:', error);
  }
}

// for streaming audio, waits for current audio to finish
export async function characterAudioQueue(audio, emoji) {
  try {
    if (emoji) {
      head.playGesture(emoji);
    }

    // can have subtitles! and other stuff. hve to look more into if u want it
    // head.speakAudio(audio, null, null);
    head.speakText(audio, null, null);
    // do speak text, send in text message

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
