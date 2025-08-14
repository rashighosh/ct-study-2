var qualtricsLoaded = false
var fetchedTopics = false

document.addEventListener('DOMContentLoaded', (event) => {    
    console.log("Start") 
    var condition
    var id
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.size === 0) {
        condition = '0'
        id = 'R_6OJi7FcmMOb3GZe'
    } else {
        condition = urlParams.get('c')
        id = urlParams.get('id')
    }
    condition = parseInt(condition)
    console.log("CONDITION IS,", condition)
    var currentDate = new Date();
    logToDatabase(id, condition, currentDate);

    getQualtricsInfromation(id)
    
    if (condition === 0) {
        sessionStorage.setItem("character", "female.glb")
        sessionStorage.setItem("body", "F")
        document.getElementById("part1").innerHTML = 'Welcome! The purpose of this intervention is to <b>provide information</b> about joining a cancer clinical trial. You will interact with a <b>virtual character</b>, which is a digital representations of a person. <br/> For the best experience, please make your <b>browser window full screen or the maximum size</b>.'
        document.getElementById("part2").innerHTML = '●○○○<br/>Specifically, you will be interacting with <b>a virtual character named Dr. Alex.</b> <br/> <b style="color: #fa4616">Dr. Alex</b> is a <b style="color: #fa4616">virtual oncologist</b>.'
        document.getElementById("part3").innerHTML = '○●○○<br/>The <b>virtual character will respond to you</b> with both <b>text and audio</b>, so make sure your <b>volume is turned up!</b>'
        document.getElementById("part4").innerHTML = '○○●○<br/>You will <b>click buttons</b> to interact with the virtual character.</b>'
        document.getElementById("info2").src = '/images/info2_control.png'
        document.getElementById("info3").src = '/images/info3_control.gif'
        document.getElementById("info4").src = '/images/info4_control.gif'
        document.getElementById("info5").src = '/images/info5_control.gif'
    }

    console.log("id is:", id)
    console.log("condition is:", condition)

    document.getElementById('back1').addEventListener('click', part1);
    document.getElementById('part1-btn').addEventListener('click', part2);
    document.getElementById('part2-btn').addEventListener('click', part3);
    document.getElementById('back2').addEventListener('click', part2);
    document.getElementById('part3-btn').addEventListener('click', part4);
    document.getElementById('back3').addEventListener('click', part3);
    document.getElementById('part4-btn').addEventListener('click', part5);
    document.getElementById('back4').addEventListener('click', part4);
    document.getElementById('part5-btn').addEventListener('click', part6);
    document.getElementById('back5').addEventListener('click', part5);
    document.getElementById('part6-btn').addEventListener('click', function() {
        window.location.href = "/interaction?id=" + id + "&c=" + condition;
    });
});

function part1() {
    document.getElementById("part1").style.display = "block"
    document.getElementById("part2").style.display = "none"
    document.getElementById("info2").style.display = "none"
    document.getElementById("header-area").classList.remove("scaled-header")
    document.getElementById("part2-btn").style.display = "none"
    document.getElementById("part1-btn").style.display = "block"
    document.getElementById("back1").style.display = "none"
}

function part2() {
    document.getElementById("part1").style.display = "none"
    document.getElementById("part3").style.display = "none"
    document.getElementById("part2").style.display = "block"
    document.getElementById("info2").style.display = "flex"
    document.getElementById("info3").style.display = "none"
    document.getElementById("header-area").classList.add("scaled-header")
    document.getElementById("part2-btn").style.display = "block"
    document.getElementById("part3-btn").style.display = "none"
    document.getElementById("part1-btn").style.display = "none"
    document.getElementById("back1").style.display = "block"
    document.getElementById("back2").style.display = "none"
}

function part3() {
    document.getElementById("part2").style.display = "none"
    document.getElementById("part4").style.display = "none"
    document.getElementById("part3").style.display = "block"
    document.getElementById("part2-btn").style.display = "none"
    document.getElementById("part4-btn").style.display = "none"
    document.getElementById("part3-btn").style.display = "block"
    document.getElementById("info2").style.display = "none"
    document.getElementById("info4").style.display = "none"
    document.getElementById("info3").style.display = "flex"
    document.getElementById("back1").style.display = "none"
    document.getElementById("back3").style.display = "none"
    document.getElementById("back2").style.display = "block"
}

function part4() {
    document.getElementById("part3").style.display = "none"
    document.getElementById("part5").style.display = "none"
    document.getElementById("part4").style.display = "block"
    document.getElementById("part3-btn").style.display = "none"
    document.getElementById("part5-btn").style.display = "none"
    document.getElementById("part4-btn").style.display = "block"
    document.getElementById("info3").style.display = "none"
    document.getElementById("info5").style.display = "none"
    document.getElementById("info4").style.display = "flex"
    document.getElementById("back2").style.display = "none"
    document.getElementById("back4").style.display = "none"
    document.getElementById("back3").style.display = "block"
}

function part5() {
    console.log("IN PART 5")
    document.getElementById("part4").style.display = "none"
    document.getElementById("part6").style.display = "none"
    document.getElementById("part5").style.display = "block"
    document.getElementById("part4-btn").style.display = "none"
    document.getElementById("part5-btn").style.display = "block"
    document.getElementById("part6-btn").style.display = "none"
    document.getElementById("loader").style.display = "none"
    document.getElementById("info4").style.display = "none"
    document.getElementById("info5").style.display = "flex"
    document.getElementById("back3").style.display = "none"
    document.getElementById("back5").style.display = "none"
    document.getElementById("back4").style.display = "block"
    document.getElementById("header-area").classList.add("scaled-header")
}

function part6() {
    document.getElementById("part5").style.display = "none"
    document.getElementById("part5-btn").style.display = "none"
    document.getElementById("info5").style.display = "none"
    document.getElementById("header-area").classList.remove("scaled-header")
    document.getElementById("back4").style.display = "none"
    document.getElementById("back5").style.display = "block"

    console.log("Checking fetchedTopics...");
    document.getElementById("part6").style.display = "block"
    document.getElementById("part6").innerHTML = "You're about to start the virtual character intervention. Please give us a moment to prepare the intervention. This shouldn't take longer than 1 minute."
    document.getElementById("loader").style.display = "block"

  
    function checkFetchedTopics() {
        console.log("Checking fetchedTopics...");
        if (fetchedTopics) {
            clearInterval(intervalId);
            console.log("fetchedTopics is true. Stopping checks.");
            document.getElementById("loader").style.display = "none"
            document.getElementById("part6").style.display = "block"
            document.getElementById("part6").innerHTML = "The virtual character intervention is ready! Please click the button below when you're ready to start."
            document.getElementById("part6-btn").style.display = "block"
        }
    }
    
    const intervalId = setInterval(checkFetchedTopics, 3000);

    
}

async function getQualtricsInfromation(id) {
    try {
        const response = await fetch('/qualtrics/getSurveyResponses', {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });

        if (response.status === 409) {
            const surveyData = await response.json();
            throw new Error(surveyData.message);
        }
        if (!response.ok) {
            throw new Error('Server responded with error ' + response.status);
        }

        const surveyData = await response.json();
        console.log(surveyData);
        
        try {
            const response = await fetch('/qualtrics/processSurveyResponses', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: id})
            });
    
            if (response.status === 409) {
                const surveyResponseData = await response.json();
                throw new Error(surveyResponseData.message);
            }
            if (!response.ok) {
                throw new Error('Server responded with error ' + response.status);
            }
    
            const surveyResponseData = await response.json();
            console.log(surveyResponseData);
            qualtricsLoaded = true
        } catch (error) {
            console.error('Error:', error.message);
            throw error; // Re-throw the error
        }
    } catch (error) {
        console.error('Error:', error.message);
        throw error; // Re-throw the error
    }
}



async function fetchOrGenerateTopics(id) {
    console.log("In some function, checking topics ...")
    try {
        const result = await checkTopics(id);
        if (result.topics === false) {
            console.log("Topics does not exist, generating...", result.topics)
            getConversationTopics(id)
            return
        } else {
            console.log("Topics exists!")
            var topics = result.topics
            console.log(topics)
            var firstSevenTopics = {};
            firstSevenTopics["Topics"] = Object.fromEntries(Object.entries(topics.Topics).slice(0, 7));
            console.log(firstSevenTopics)
            sessionStorage.setItem("topics", JSON.stringify(firstSevenTopics))
            fetchedTopics = true
        }
        // Continue with the rest of your code
    } catch (error) {
        console.error("An error occurred:", error);
        // Handle the error appropriately
    }
}

async function checkTopics(id) {
    try {
        const response = await fetch('/qualtrics/checkTopics', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: id})
        });

        if (response.status === 409) {
            const data = await response.json();
            throw new Error(data.message);
        }
        if (!response.ok) {
            throw new Error('Server responded with error ' + response.status);
        }

        const data = await response.json();
        console.log(data);
        return data; // Return the data
    } catch (error) {
        console.error('Error:', error.message);
        throw error; // Re-throw the error
    }
}


function getConversationTopics(id) {
    fetch('/qualtrics/scoreSurveyResponses', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: id})
    })
    .then(async response => {
        if (response.status === 409) {
            const data = await response.json();
            throw new Error(data.message); // Throw error with the message from server
        }
        if (!response.ok) {
            throw new Error('Server responded with error ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log(data.sortedTopics);
        var sortedTopics = data.sortedTopics
        console.log(sortedTopics)
        var firstSevenTopics = {};
        firstSevenTopics["Topics"] = Object.fromEntries(Object.entries(sortedTopics.Topics).slice(0, 7));
        console.log(firstSevenTopics)
        sessionStorage.setItem("topics", JSON.stringify(firstSevenTopics))
        fetchedTopics = true
    })
    .catch(error => {
        console.error('Error:', error.message);
    });  
}

function logToDatabase(id, condition, currentDate) {
    fetch('/logUser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: id, condition: condition, startTime: currentDate})
    })
    .then(async response => {
        if (response.status === 409) {
            const data = await response.json();
            throw new Error(data.message); // Throw error with the message from server
        }
        if (!response.ok) {
            throw new Error('Server responded with error ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);
        function checkQualtricsLoaded() {
            console.log("Checking if qualtrics has loaded...");
            if (qualtricsLoaded) {
                clearInterval(intervalId);
                console.log("Qualtrics has loaded is true. Stopping checks. Now fetching or generating topics");
                fetchOrGenerateTopics(id);
            }
        } 
        const intervalId = setInterval(checkQualtricsLoaded, 3000);
    })
    .catch(error => {
        console.error('Error:', error.message);
    });  
}