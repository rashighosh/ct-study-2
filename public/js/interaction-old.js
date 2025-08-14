import { characterAudio, characterAudioQueue, stopSpeaking, focusCharacter } from './virtualcharacter.js';

var continueNode = null
var progress = 0;
var userInfo = ""
var informationTranscript = new Map()
var id = ''
var condition = ''
const textScript = "Text_Script_Audio.json"
const textScriptSupport = "Text_Script_Support_Audio.json"
var incrementTotal



function getCurrentDateTime() {
    var currentDate = new Date();
    // Convert the date and time to the user's local time zone
    var localDateTime = currentDate.toLocaleString();
    // Output the local date and time
    return localDateTime
}


document.addEventListener('DOMContentLoaded', (event) => {  
    document.getElementById("study-button-1").onclick = function() {
        document.getElementById("study1").style.display = 'block'
        document.getElementById("study2").style.display = 'none'
        document.getElementById("study3").style.display = 'none'
        document.getElementById("study-button-1").classList.add('active')
        document.getElementById("study-button-2").classList.remove('active')
        document.getElementById("study-button-3").classList.remove('active')
    }
    
    document.getElementById("study-button-2").onclick = function() {
        document.getElementById("study2").style.display = 'block'
        document.getElementById("study1").style.display = 'none'
        document.getElementById("study3").style.display = 'none'
        document.getElementById("study-button-2").classList.add('active')
        document.getElementById("study-button-1").classList.remove('active')
        document.getElementById("study-button-3").classList.remove('active')
    }
    
    document.getElementById("study-button-3").onclick = function() {
        document.getElementById("study3").style.display = 'block'
        document.getElementById("study1").style.display = 'none'
        document.getElementById("study2").style.display = 'none'
        document.getElementById("study-button-3").classList.add('active')
        document.getElementById("study-button-2").classList.remove('active')
        document.getElementById("study-button-1").classList.remove('active')
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    condition = urlParams.get('c')
    id = urlParams.get('id')
    condition = parseInt(condition)

    document.getElementById("finish-btn").addEventListener('click', () => {
        // window.location.href = "https://ufl.qualtrics.com/jfe/form/SV_b4xk3F1LVNROTWK?id=" + id + "&c=" + condition;
        console.log("CLICKED ASK")
        document.getElementById("virtualcharacter").style.filter = "blur(2px)"
        document.getElementById("virtualcharacter-1").style.filter = "blur(0px)"
        focusCharacter("support");
    });

    document.getElementById("finish-btn1").addEventListener('click', () => {
        // window.location.href = "https://ufl.qualtrics.com/jfe/form/SV_b4xk3F1LVNROTWK?id=" + id + "&c=" + condition;
        console.log("CLICKED ASK")
        document.getElementById("virtualcharacter").style.filter = "blur(0px)"
        document.getElementById("virtualcharacter-1").style.filter = "blur(2px)"
        focusCharacter("doctor");
    });

    let loadBody = { transcript: textScript }

    showLoading();
});

function currentSpeakingCharacter(agent) {
    focusCharacter(agent);
    if (agent === "support") {
        // document.getElementById("virtualcharacter").style.filter = "blur(2px)"
        // document.getElementById("virtualcharacter-1").style.filter = "blur(0px)"
    } else {
        // document.getElementById("virtualcharacter").style.filter = "blur(0px)"
        // document.getElementById("virtualcharacter-1").style.filter = "blur(2px)"
    }
}

function showLoading() {
    // document.getElementById('start').style.display = "none";
    document.getElementById('loading-animation').style.display = "block";
    CSS.registerProperty({
        name: "--p",
        syntax: "<integer>",
        initialValue: 0,
        inherits: true,
      });

    const animatedElement = document.getElementById("loader-animation");

    animatedElement.onanimationend = () => {
        document.getElementById('loading-screen').classList.add("out")
        handleUserInput(1, { userInput: "Start Introduction", script: textScript, gender: "female" });
        informationTranscript.set("SYSTEM " + getCurrentDateTime(), "Start Introduction");
        updateTranscript()
    };
}

function updateProgress(progress) {
    const progressBar = document.querySelector('.progress-bar3');
    
    // Update progress bar width
    progressBar.style.width = `${progress}%`;
    
    // Update loader text
    document.getElementById("progress-percent").innerHTML = Math.round(progress)
}

// Function to increment progress
function incrementProgress(double = false) {
    console.log("INCREMENT TOTAL IS", incrementTotal)
    var increment = (1/incrementTotal)*100
    if (double === true) {
        increment = increment * 2
    }
    var nextIncrement = progress + increment;
    if (nextIncrement >= 100) {
        nextIncrement = 100
    }
    console.log("PROGRESS IS", progress)
    console.log("NEXT INCREMENT IS", nextIncrement)
    const interval = setInterval(() => {
        progress += 1;
        if (progress >= 100) {
            progress = 100
            document.getElementById("finish-btn").style.display = "block"
        }
        updateProgress(progress);
        if (progress >= nextIncrement) {
            clearInterval(interval);
        }
    }, 50); // Adjust this value to change the speed of the progress
}

function appendMessage(message, speaker, agent, nextNode = null, passOn = null) {
    const chatBox = document.getElementById("chat-container")
    const labelText = document.createElement('div');
    const messageText = document.createElement('div');
    const messageItem = document.createElement('div');

    labelText.className = "label-text";

    if (speaker === 'user') {
        labelText.innerText = `You`
    } else {
        agent === 'doctor' ? labelText.innerText = `Alex` : labelText.innerText = `Skylar`;
    }
    speaker === 'user' ? messageText.className = "user-chatbot-message" : messageText.className = "alex-chatbot-message"

    if (speaker === 'user') {
        if (message === 'text') {
            message = document.getElementById('user-input').value;
            let messageBody = { userMessage: message }
            handleUserInput(nextNode, messageBody)
        }
        messageText.innerHTML = `${message}`;
        messageItem.className = "message-item"
        messageItem.appendChild(labelText);
        messageItem.appendChild(messageText);
        chatBox.appendChild(messageItem);
        informationTranscript.set("USER " + getCurrentDateTime(), message);
        updateTranscript()
    } else {
        messageItem.className = "message-item"
        messageItem.appendChild(labelText);
        messageItem.appendChild(messageText);
        chatBox.appendChild(messageItem)
        displaySubtitles(message, messageText, passOn)
        informationTranscript.set("ALEX " + getCurrentDateTime(), message);
        updateTranscript()
    }
    if (speaker === 'user') {
        document.getElementById('user-input').value = '';
        appendLoadingDots();
    }

    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
}

function appendLoadingDots() {
    const chatBox = document.getElementById("chat-container")

    const ellipse = document.createElement('div');
    ellipse.className = "lds-ellipsis";
    ellipse.setAttribute('id', "lds-ellipsis")


    const l1 = document.createElement('div');
    const l2 = document.createElement('div');
    const l3 = document.createElement('div');

    ellipse.appendChild(l1)
    ellipse.appendChild(l2)
    ellipse.appendChild(l3)

    chatBox.appendChild(ellipse);
}

async function handleStreamedResponse(reader) {
    const decoder = new TextDecoder();
    let partialData = '';
    var isFirstChunk = true;

    while (true) {
        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        partialData += decoder.decode(value, { stream: true });

        // Process each complete JSON chunk
        let boundaryIndex;
        while ((boundaryIndex = partialData.indexOf('\n')) !== -1) {
            const chunk = partialData.slice(0, boundaryIndex).trim();
            partialData = partialData.slice(boundaryIndex + 1);

            if (chunk) {
                const data = JSON.parse(chunk);

                // Special handling for the first chunk
                if (isFirstChunk) {
                    // Handle audio if present
                    if (data.audio && data.audio.audioBase64) {
                        // first piece of dynamic response
                        isFirstChunk = false;
                        const audioData = await parseAudio(data.audio, null);
                        characterAudioQueue(audioData, null); // queue to play after placeholder ends
                        // only need to render front end input/buttons/stuff once
                        // DISPLAYING STUFF TO FRONT END; small wait to show ellipses
                        const ellipse = document.getElementById('lds-ellipsis');
                        ellipse.remove();
                        // document.getElementById("thinking").style.display = "none"
                        console.log(data.annotations)
                        // Update dialogue
                        appendMessage(data.wholeDialogue, 'Alex', data.agent);
                        if (data.options) {
                            displayOptions(data.options)
                        }
                        if (data.input.allowed === true) {
                            const inputArea = document.getElementById("input-area")
                            const userInput = document.getElementById('user-input');
                            document.getElementById('send-btn').onclick = function() {
                                appendMessage('text', 'user', null, data.input.nextNode, null);
                                const optionsArea = document.getElementById("options-area")
                                optionsArea.innerHTML = ''
                                inputArea.style.visibility = 'visible'
                            };  
                            userInput.onkeydown = function(event) {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    appendMessage('text', 'user', null, data.input.nextNode, null);
                                    const optionsArea = document.getElementById("options-area")
                                    optionsArea.innerHTML = ''
                                    inputArea.style.visibility = 'visible'
                                }
                            };
                            
                        } else {
                            const inputArea = document.getElementById("input-area")
                            inputArea.style.visibility = 'visible'
                        }
                    }
                } else {
                    // keep rendering rest of audio stream as they come in!
                    if (data.audio && data.audio.audioBase64) {
                        const audioData = await parseAudio(data.audio, null);
                        characterAudioQueue(audioData, null);
                    }
                }
            }
        }
    }
}

async function handleUserInput(nodeId, body) {
    body.userInfo = userInfo
    // body.characterGender = gender
    // body.script = textScript
    console.log("ABOUT TO CALL BACKEND", body)
    const response = await fetch(`/interact/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    console.log("GOT RESPONSE FROM BACKEND")
    if (!response.ok) {
        console.error('Failed to fetch response:', response.statusText);
        return;
    }

    const contentType = response.headers.get('Content-Type');
    var agent = body.script === textScript ? "doctor" : "support"
    console.log(agent)

    // Handle streamed response
    if (contentType && contentType.includes('prerecorded')) { // not expecting ANY streamed response
        // Handle pre-recorded response
        const data = await response.json(); // gives ENTIRE audio at once
        // process audio for front end
        await handlePreRecordedResponse(data, agent);
    }
    else if (contentType && contentType.includes('application/json; charset=utf-8')) { // has some sort of ChatGPT element to it (streamed)
        const reader = response.body.getReader(); // getReader bc backend is writing stream by stream, not all at once, don't to close connection immedietely
        await handleStreamedResponse(reader);
    }
    else {
        console.error("Unknown response type. Unable to process.");
    }
}

async function handlePreRecordedResponse(data, agent) {
    // Handle audio if present; parse it for being ready for front end
    var audioData
    if (data.audio && data.audio.audioBase64) {
        audioData = await parseAudio(data.audio, null);
    }
    stopSpeaking();
    var timeout;
    // DISPLAYING STUFF TO FRONT END; small wait to show ellipses
    if (condition === 0 || condition === 1 || condition === 4 || condition === 5) {
        timeout = 1500
    } else {
        timeout = 5000
    }
    setTimeout(() => {
        // characterAudio(audioData, null, agent);
        characterAudio(audioData, null, agent, () => {
            console.log("✅ Interaction.js notified: Speech has ended!");
            if (data.passOn) {
                console.log("MOVING ON TO SKYLAR")
                handleUserInput(1, { userInput: "Start Introduction", script: textScriptSupport, gender: "male" });
                currentSpeakingCharacter("support")
            }
        });
        
        const ellipse = document.getElementById('lds-ellipsis');
        // document.getElementById("thinking").style.display = "none"
        if (ellipse) {
            ellipse.remove();
        }
        // Update dialogue
        console.log("DATA", data)
        if (data.passOn) { 
            console.log("HAS PASS ON")
            appendMessage(data.dialogue, 'Alex',  data.agent, null, data.passOn);
        } else {
            appendMessage(data.dialogue, 'Alex',  data.agent);
        } 
        if (data.options) {
            displayOptions(data.options)
        }
        if (data.input.allowed === true) {
            const inputArea = document.getElementById("input-area")
            const userInput = document.getElementById('user-input');
            inputArea.style.visibility = 'visible'
            document.getElementById('send-btn').onclick = function() {
                inputArea.style.visibility = 'visible'
                appendMessage('text', 'user', null, data.input.nextNode, null);
                const optionsArea = document.getElementById("options-area")
                optionsArea.innerHTML = ''
            };  
            userInput.onkeydown = function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    appendMessage('text', 'user', null, data.input.nextNode, null);
                    const optionsArea = document.getElementById("options-area")
                    optionsArea.innerHTML = ''
                    inputArea.style.visibility = 'visible'
                }
            };
            
        } else {
            const inputArea = document.getElementById("input-area")
            inputArea.style.visibility = 'visible'
        }
    }, timeout); // 1500 milliseconds = 1.5 seconds
}

function displayOptions(options) {
    options.forEach(option => {
        const optionsArea = document.getElementById("options-area")
        optionsArea.style.visibility = "hidden"
        const button = document.createElement('button');
        const userText = option.optionText
        button.textContent = userText;
        button.classList.add("option-btn")
        if (option.continueNode) {
            continueNode = option.continueNode
        }
        if (option.optionText === "View Resource.") {
            button.onclick = function() {
                moreInfoModal.style.display = "flex";
            }
        } 
        else if (option.optionText === "View Sample Clinical Trials.") {
            button.onclick = function() {
                document.getElementById("studies-modal").style.display = "flex";
            }
        } else {
            button.addEventListener('click', () => {
                optionsArea.innerHTML = ''
                appendMessage(userText, 'user', null, null, null)
                let messageBody = { userMessage: option.optionText }
                if (option.nextNode) {
                    if (option.increment === true) {
                        if (option.userInfo) {
                            userInfo = option.userInfo
                            // document.getElementById("thinking").style.display = "flex"
                        }
                        if (option.value === 0 || option.value ===1) {
                           logItem("browseChoice", option.value)
                        }
                        incrementProgress();
                        if (option.doubleIncrement) {
                            incrementProgress(true);
                        }
                    }
                    handleUserInput(option.nextNode, messageBody)
                } else {
                    incrementProgress();
                    handleUserInput(continueNode, messageBody)
                }
                
                // You can add more actions here based on nextNode
            });
        }
        
        optionsArea.appendChild(button);
    });
}

// Important to Keep
async function parseAudio(audio, emoji) {
    try {
        // Get the Base64 audio string
        const base64Audio = audio.audioBase64;

        // Decode the Base64 audio string into an ArrayBuffer
        const arrayBuffer = await fetch(`data:audio/wav;base64,${base64Audio}`)
            .then(response => response.arrayBuffer());

        // Create an AudioContext
        const audioContext = new AudioContext();

        // Decode the ArrayBuffer into an AudioBuffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create a new audio object with the decoded AudioBuffer
        const audioWithWav = {
            ...audio,
            audio: audioBuffer,
            sampleRate: audioBuffer.sampleRate,
        };

        return audioWithWav;
    } catch (error) {
        console.error("Error decoding audio data:", error);
        throw error;
    }
}

function displaySubtitles(dialogue, divItem, passOn = null) {
    const dialogueSection = divItem;
    const chatBox = document.getElementById("chat-container")
    console.log("PASS ON IN SUBTITLES IS", passOn)

    // Start with the current content to avoid overwriting
    let existingText = dialogueSection.innerText.trim();
    let textToAdd = dialogue; // Dialogue to type
    let typewriterRunning = true;
    let i = 0; // Character index

    // Typewriter effect
    function typeWriter() {
        if (!typewriterRunning) {
            // If the effect is canceled, instantly show remaining text
            cancelTypewriterEffect(dialogueSection, dialogue, sources);
            return;
        }
        if (i < textToAdd.length) {
            // Append each character
            if (i === 0 && existingText.length > 0) {
                dialogueSection.innerHTML += ' '; // Add a space before new text
            }
            dialogueSection.innerHTML += textToAdd[i]; // Append character
            i++;
            setTimeout(typeWriter, 30); // Adjust speed (20ms per character)
        } else {
            typewriterRunning = false; // Reset the flag when done
            const optionsArea = document.getElementById("options-area")
            optionsArea.style.visibility = "visible"
        }
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
    }

    typeWriter(); // Start typing animation
}

function cancelTypewriterEffect(dialogueSection, wholeDialogue, sources) {
    typewriterRunning = false;
    dialogueSection.innerHTML = wholeDialogue; // Instantly display the complete dialogue
    if (sources !== null) {
        for (var j = 0; j < sources.length; j++) {
            const link = document.createElement('p');
            link.className = "source-link";
            link.textContent = `[ Source: ${j+1} ]`;
        
            var pdfModal = document.getElementById('pdfModal');
            var pdfViewer = document.getElementById('pdfViewer');
            document.getElementById('resource-item').innerText = sources[j].slice(0, -4);
        
            link.onclick = (function(index) {
                return function() {
                    pdfModal.style.display = 'flex';
                    pdfViewer.src = '../sources/' + sources[index];
                };
            })(j);
        
            dialogueSection.appendChild(document.createTextNode(' ')); // Add a space
            dialogueSection.appendChild(link);
        }
        
        // Move this outside the loop
        window.onclick = function(event) {
            if (event.target == pdfModal) {
                pdfModal.style.display = 'none';
            }
        };
        
    }
}

function updateTranscript() {
    let transcriptString = JSON.stringify(Object.fromEntries(informationTranscript));
    fetch('/updateTranscript', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: id, 
            transcriptType: 'informationTranscript', 
            transcript: transcriptString
        })
    })
    .then(response => response.json())
    .then(data => {
    })
    .catch(error => console.error('Error logging transcript:', error));
}

function logItem(columnName, value) {
    fetch('/logItem', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: id, 
            columnName: columnName, 
            value: value
        })
    })
    .then(response => response.json())
    .then(data => {
    })
    .catch(error => console.error('Error logging transcript:', error));
}

// Get the modal
var helpModal = document.getElementById("help-modal");

// Get the button that opens the modal
var helpBtn = document.getElementById("help-icon");

var closeHelp = document.getElementById("help-close");

closeHelp.onclick = function() {
    helpModal.style.display = "none";
}

// When the user clicks on the button, open the modal
helpBtn.onclick = function() {
    helpModal.style.display = "flex";
    var currentURLelement = document.getElementById("current-link-help")
    const currentURL = window.location.href;
    currentURLelement.innerHTML = currentURL
}

// Get the modal
var moreInfoModal = document.getElementById("more-info-modal");
var closeMoreInfoModal = document.getElementById("close-more-info-modal");
closeMoreInfoModal.onclick = function() {
    moreInfoModal.style.display = "none";
}

var ctModal = document.getElementById("studies-modal");
document.getElementById("close-ct-modal").onclick = function() {
    ctModal.style.display = "none";
}

var closePDFModal = document.getElementById("close-pdf-modal");
closePDFModal.onclick = function() {
    document.getElementById("pdfModal").style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == helpModal) {
      helpModal.style.display = "none";
    }
  
    if (event.target == moreInfoModal) {
      moreInfoModal.style.display = "none";
    }

    if (event.target == ctModal) {
        ctModal.style.display = "none";
      }
  }


