import { characterAudio, walkLeft, characterAudioQueue, lowerHand, focusCharacter, raiseHand, turnCharacter, resetCharacter, thinkingPose, stopThinking } from './virtualcharacter.js';


var userInput; 

// Helper function to create a message
function createMessage(headerText, bodyText, isBot = false) {
chatWindow = document.getElementById('chatWindow');
 userInput = document.getElementById('userInput');
  const message = document.createElement('div');
  message.classList.add('message');
  message.classList.add(isBot ? 'bot-message' : 'user-message');

  // Header
  const header = document.createElement('div');
  header.classList.add('message-header');
  header.textContent = headerText;

  // Body
  const body = document.createElement('div');
  body.classList.add('message-body');
  body.textContent = bodyText;

  message.appendChild(header);
  message.appendChild(body);
  chatWindow.appendChild(message);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Main send function
function sendMessage() {
    chatWindow = document.getElementById('chatWindow');
 userInput = document.getElementById('userInput');
  const text = userInput.value.trim();
  if (!text) return;

  // Add user message
  createMessage("You", text, false);

  userInput.value = '';

  sendMessageToLLM('kuromi123', text)
}
var startBtn

window.addEventListener("load", () => {
    startBtn = document.getElementById("start-btn")
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.addEventListener('click', sendMessage);
    startBtn.addEventListener("click", function() {
        userInput = document.getElementById("userInput");
        console.log("USER INPUT IS", userInput)
        console.log("Starting")
        startBtn.style.opacity = 0
        startBtn.style.pointerEvents = "none";
        startBtn.disabled = true;
        document.getElementById("chat-input").style.opacity = 1;
        playIntroSequence().then(() => {
            console.log("Intro is done");
            thinkingPose();
        });
    let typingTimer;
    const debounceTime = 800;   // Cite: Skantze 2021
    const minWords = 3;

    userInput.addEventListener("input", () => {
        console.log("IN USER INPUT")
        clearTimeout(typingTimer);

        typingTimer = setTimeout(async () => {
            const text = userInput.value.trim();
            const wordCount = text.split(/\s+/).filter(Boolean).length;

            if (wordCount < minWords) return;
            console.log("IN CHECKING USER INPUT", text)

            // Soft check — do not auto-send
            const result = await callPrecheck(text);
            console.log("GOT A RESULT", result)

            if (!result.proceed) {
                console.log("CAN PROCEED")
                // showIntervention(result.message);
            }

        }, debounceTime);
    });

    })



async function callPrecheck(text) {
    const res = await fetch("http://127.0.0.1:8000/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
    });

    return await res.json();
}


//     console.log("HERE")
//     setTimeout(() => {
//         console.log("AB TO SEND ALEX MESSAGE")
//         var message = "Welcome! I'm Jordan, a virtual patient navigator."
//         createMessage("Jordan", message, true);
//     }, 1000);

//      // Fake bot response for now
//     setTimeout(() => {
//         console.log("AB TO SEND ALEX MESSAGE")
//         var message = "I was created by a team of doctors, researchers, and community members to help people navigate participating in research studies."
//         createMessage("Jordan", message, true);
//     }, 2000);

//     setTimeout(() => {
//         console.log("AB TO SEND ALEX MESSAGE")
//         var message = "Today we'll be exploring research studies that you might be a good fit for, but more importantly, are a good fit for you."
//         createMessage("Jordan", message, true);
//     }, 5000);

//     setTimeout(() => {
//     console.log("AB TO SEND ALEX MESSAGE")
//     var message = "First, let's get some basic information. Can you share with me your name, age, and gender?"
//     createMessage("Jordan", message, true);
//   }, 7000);

    
});

function detectBrowser() {
    const ua = navigator.userAgent;

    // iOS wrappers (must come first)
    const mCriOS = ua.match(/CriOS\/([\d.]+)/i);   // Chrome on iOS
    if (mCriOS) return `Google Chrome (iOS): ${mCriOS[1]}`;
    const mFxiOS = ua.match(/FxiOS\/([\d.]+)/i);   // Firefox on iOS
    if (mFxiOS) return `Mozilla Firefox (iOS): ${mFxiOS[1]}`;
    const mEdgiOS = ua.match(/EdgiOS\/([\d.]+)/i); // Edge on iOS
    if (mEdgiOS) return `Microsoft Edge (iOS): ${mEdgiOS[1]}`;

    // Samsung Internet
    const mSamsung = ua.match(/SamsungBrowser\/([\d.]+)/i);
    if (mSamsung) return `Samsung Internet: ${mSamsung[1]}`;

    // Edge (Chromium + legacy)
    const mEdge = ua.match(/Edg(?:A|iOS)?\/([\d.]+)/i) || ua.match(/Edge\/([\d.]+)/i);
    if (mEdge) return `Microsoft Edge: ${mEdge[1]}`;

    // Opera
    const mOPR = ua.match(/OPR\/([\d.]+)/i) || ua.match(/Opera\/([\d.]+)/i);
    if (mOPR) return `Opera: ${mOPR[1]}`;

    // Vivaldi / Yandex (optional but common)
    const mVivaldi = ua.match(/Vivaldi\/([\d.]+)/i);
    if (mVivaldi) return `Vivaldi: ${mVivaldi[1]}`;
    const mYandex = ua.match(/YaBrowser\/([\d.]+)/i);
    if (mYandex) return `Yandex Browser: ${mYandex[1]}`;

    // Chrome (desktop/Android) — exclude other Chromium brands above
    const mChrome = ua.match(/Chrome\/([\d.]+)/i);
    if (mChrome && !/OPR|Opera|Edg|EdgiOS|EdgA|CriOS|FxiOS/i.test(ua)) {
        return `Google Chrome: ${mChrome[1]}`;
    }

    // Firefox (desktop/Android)
    const mFF = ua.match(/Firefox\/([\d.]+)/i);
    if (mFF) return `Mozilla Firefox: ${mFF[1]}`;

    // Safari (must be last among WebKit UAs)
    const mSafari = ua.match(/Version\/([\d.]+).*Safari/i);
    if (mSafari && !/Chrome|CriOS|OPR|Edg/i.test(ua)) {
        return `Apple Safari: ${mSafari[1]}`;
    }

    return `Unknown: ${ua}`;
}


function detectDeviceType() {
    const ua = navigator.userAgent;

    if (/Mobi/i.test(ua)) {
        return "Mobile";
    }

    // iPad or Android tablets
    if (/Tablet|iPad/i.test(ua)) {
        return "Tablet";
    }

    // iPadOS 13+ reports as Mac but is actually touch device
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) {
        return "Tablet";
    }

    return "Desktop";
}
function detectOS() {
    const ua = navigator.userAgent;

    if (/Windows NT/i.test(ua)) return "Windows";
    if (/CrOS/i.test(ua)) return "Chrome OS";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";

    // iPadOS masquerading as Mac
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "iOS";

    if (/Mac/i.test(ua)) return "Mac";
    if (/Linux/i.test(ua)) return "Linux";
    if (/X11/i.test(ua)) return "Unix";

    return "Unknown";
}

async function sendGeneralData(browserInfo, deviceType, os) {
    try {
        // console.log("IN SEND TO SERVER GENERAL DATA")
        let url = '/generalData';
        let data = {
            'DeviceType': deviceType,
            'OperatingSystem': os,
            'Browser': browserInfo,
        };

        let res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            // let ret = await res.json();
            // console.log(ret)
            return; // ret.message
        } else {
            return alert("Seems like there was an error when submitting your info. Mind refreshing and trying again?");
        }
    }

    catch (err) {
        console.error("generalData failed:", err);
    }
}


async function logLanguage() {
    try {
        let url = '/updateDatabase';
        let data = {
            'Language': language
        };

        let res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            // let ret = await res.json();
            // console.log(ret);
            return; // ret;

        } else {
            return `HTTP error: ${res.status}`;
        }
    }
    catch (err) {
        console.error("Language failed:", err);
        // because you returned here, user can click Begin again
    }

}

let currentAudio = null;

function playTTS(text) {

    return new Promise((resolve) => {

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const encodedText = encodeURIComponent(text);
        currentAudio = new Audio(`http://127.0.0.1:8888/tts?text=${encodedText}`);

        currentAudio.addEventListener("play", () => {
            //characterIcon.classList.add("pulse-talking");
        });

        currentAudio.addEventListener("ended", () => {
            //characterIcon.classList.remove("pulse-talking");
            resolve();
        });

        currentAudio.play();
    });
}


var introMessages = [
    // "Welcome! I'm Jordan, a virtual patient navigator.",
    // "Today we'll be exploring research studies that you might be a good fit for, but more importantly, are a good fit for you.",
    // "I'll be taking notes on the side as I get to know you a bit better.",
    "To start, tell me a bit about what motivates you to search for clinical trials."
];

async function playIntroSequence() {
  console.log("IN PLAY INTRO SEQUENCE");
  for (let i = 0; i < introMessages.length; i++) {
    const message = introMessages[i];

    createMessage("Jordan", message, true);

    if (i === 0) {
      const chatContainer = document.getElementById("chat-container");
      chatContainer.classList.add("move-right");
      document.getElementById("user-info").style.opacity = "1";
    }

    // ⬇️ This now waits until speech is done
    await characterAudio(message, null, "doctor");

    await new Promise(r => setTimeout(r, 500));
  }
}

function renderList(elementId, items) {
    const container = document.getElementById(elementId);
    if (!items || items.length === 0) {
        return;
    }

    // Create a <ul> with each item as <li>
    const listHtml = "<ul>" + items.map(item => `<li>${item}</li>`).join("") + "</ul>";
    container.innerHTML = listHtml;
}


async function sendMessageToLLM(session_id, message) {
    try {
        console.log("Calling server...");
        const url = 'http://127.0.0.1:8888/litellm-user';
        const data = { session_id, message };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            const body = await res.json();   // ✅ call json() only once
            console.log(body);               // ✅ now log the parsed JSON
            createMessage("Jordan", body.reply, true);
            // playTTS(body.reply);

            // if (body.done == true) {
                document.getElementById("user-conditions").innerText = body.user_state.conditions
                document.getElementById("user-age").innerText = body.user_state.age
                document.getElementById("user-gender").innerText = body.user_state.gender
                document.getElementById("user-location").innerText = body.user_state.location
                // Render motivations, concerns, constraints as lists
                renderList("user-motivation", body.user_state.motivation);
                renderList("user-concerns", body.user_state.concerns);
                renderList("user-participation_constraints", body.user_state.participation_constraints);
                searchTrials(body.user_state)
            // }
             // ⬇️ This now waits until speech is done
             stopThinking()
            await characterAudio(body.reply, null, "doctor");
            thinkingPose();
            return {
                success: true,
                body
            };
        } else {
            const text = await res.text();
            return {
                success: false,
                status: res.status,
                body: text
            };
        }
    } catch (err) {
        console.error("Error sending message rip!", err);
        alert("Seems like there was an error when submitting your info. Mind refreshing and trying again?");
        return {
            success: false,
            error: err.message || err.toString()
        };
    }
}

function printStudyHighlights(studyList, userCity, userState) {
    studyList.forEach((study, index) => {
        const protocol = study.protocolSection || {};
        const locations = protocol.contactsLocationsModule?.locations || [];

        const matchingLocation = locations.find(loc =>
            loc.city?.toLowerCase() === userCity.toLowerCase() &&
            loc.state?.toLowerCase() === userState.toLowerCase()
        );

        if (matchingLocation) {
            const eligibility = protocol.eligibilityModule || {};

            console.log(`\nStudy #${index + 1}: ${protocol.identificationModule.briefTitle}`);
            console.log(
            `Location: ${matchingLocation.city}, ${matchingLocation.state}, ${matchingLocation.country}`
            );
            console.log(
            `Age Range: ${eligibility.minimumAge || "N/A"} - ${eligibility.maximumAge || "N/A"}`
            );
            console.log(`Sex: ${eligibility.sex || "ALL"}`);
        }
    });

}

async function searchTrials(user) {
    try {
        console.log("Calling server...");
        const url = 'http://127.0.0.1:8888/search_trials';
        const data = user;
        console.log(data)
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            const body = await res.json();   // ✅ call json() only once
            console.log(body);               // ✅ now log the parsed JSON
            // printStudyHighlights(body.results, body.study_criteria.city, body.study_criteria.state)
            return {
                success: true,
                body
            };
        } else {
            const text = await res.text();
            return {
                success: false,
                status: res.status,
                body: text
            };
        }
    } catch (err) {
        console.error("Error sending message rip!", err);
        alert("Seems like there was an error when submitting your info. Mind refreshing and trying again?");
        return {
            success: false,
            error: err.message || err.toString()
        };
    }
}


// ==== RECAPTCHA FUNCTIONS ==== //

function onloadCallback() {
    console.log("reCAPTCHA loaded!");
    // Optionally render here, or wait for modal open
}

function renderRecaptcha() {
    const container = document.getElementById("recaptcha-container");

    if (!container) {
        console.error("reCAPTCHA container not found!");
        return;
    }

    if (recaptchaWidgetId === null) {
        recaptchaWidgetId = grecaptcha.enterprise.render(container, {
            sitekey: '6LdTyIYrAAAAACUTRt_-0qLqXmMaL1UdbWwPYkIc',
            action: 'login',
            theme: 'light'
        });
    }

    /* if (recaptchaWidgetId !== null) {
      // Already rendered: reset it
      grecaptcha.enterprise.reset(recaptchaWidgetId);
    } else {
      // Not rendered yet: render now
      recaptchaWidgetId = grecaptcha.enterprise.render(container, {
        sitekey: '6LdTyIYrAAAAACUTRt_-0qLqXmMaL1UdbWwPYkIc',
        action: 'send_email',
        theme: 'light'
      });
    } */

}

function onNextPageClick() {
    var token = null;
    if (overrideRecaptcha != "true") {
        token = grecaptcha.enterprise.getResponse(recaptchaWidgetId);
        if (!token) {
            console.log("CAPTCHA not solved");
            alert("Please complete the reCAPTCHA.");
            return;
        }
    }
    return beginIntervention(token);
}



