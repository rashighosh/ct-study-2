const express = require('express');
const router = express.Router();
const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const fastCsv = require('fast-csv');
const {OpenAI} = require('openai')
var sql = require("mssql");

const rashi_openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);

const knowledgeData = {
    "Knowledge_1": {
        description: "“Informed consent” means that I am given information about the trial so I can freely decide whether to participate.",
        correctValue: 1
    },
    "Knowledge_2": {
        description: "“Standard treatments” are the best treatments currently known for a cancer.",
        correctValue: 1
    },
    "Knowledge_3": {
        description: "Standard treatments are never as good as new research treatments.",
        correctValue: 2
    },
    "Knowledge_4": {
        description: "Treatments used in clinical trials may cause side effects.",
        correctValue: 1
    },
    "Knowledge_5": {
        description: "It is up to me to decide whether to be in a clinical trial.",
        correctValue: 1
    },
    "Knowledge_6": {
        description: "Patients in clinical trials must get their care at different places from patients getting standard treatments.",
        correctValue: 2
    },
    "Knowledge_7": {
        description: "If I were to join a clinical trial, I could decide to stop at any time.",
        correctValue: 1
    },
    "Knowledge_8": {
        description: "“Randomization” means that my treatment will be chosen by chance.",
        correctValue: 1
    },
    "Knowledge_9": {
        description: "Once I join a clinical trial, my own doctor will not know what happens to me.",
        correctValue: 2
    },
    "Knowledge_10": {
        description: "Most clinical trials involve a placebo (sugar pill).",
        correctValue: 2
    },
    "Knowledge_11": {
        description: "Side effects in clinical trials are usually worse than with standard treatments.",
        correctValue: 2
    },
    "Knowledge_12": {
        description: "Clinical trials are only used as a last resort.",
        correctValue: 2
    },
    "Knowledge_13": {
        description: "The only way to find out about clinical trials is from my doctor.",
        correctValue: 2
    },
    "Knowledge_14": {
        description: "Clinical trials are not appropriate for patients with cancer.",
        correctValue: 2
    },
    "Knowledge_15": {
        description: "My doctor can start a clinical trial without the approval of professionals who protect patient rights.",
        correctValue: 2
    },
    "Knowledge_16": {
        description: "A clinical trial is available for anyone with cancer who wants to take part.",
        correctValue: 2
    },
    "Knowledge_17": {
        description: "Institutional Review Boards review and monitor clinical trials to keep patients safe.",
        correctValue: 1
    },
    "Knowledge_18": {
        description: "Informed Consent mainly protects researchers from lawsuits.",
        correctValue: 2
    },
    "Knowledge_19": {
        description: "Clinical trials are done to improve standard treatments.",
        correctValue: 1
    }
};

const attitudesData = {
    Attitudes_77: "I believe clinical trials are only for people with cancer that cannot be treated any other way.",
    Attitudes_78: "I do not trust the medical system.",
    Attitudes_79: "I am worried that the treatment I receive in a clinical trial would not work for me.",
    Attitudes_80: "I am concerned that participating in a clinical trial may be dangerous.",
    Attitudes_81: "I have concerns about the time, transportation, and/or travel required to participate in a clinical trial.",
    Attitudes_82: "I am worried about the financial burden of participating in a clinical trial.",
    Attitudes_83: "I'm worried that my family wouldn't want me to go on a clinical trial.",
    Attitudes_84: "I am concerned about the privacy of my personal medical information if I participate in a clinical trial.",
    Attitudes_85: "I'm worried that my medical care won't be as good if I join a clinical trial.",
    Attitudes_86: "I am concerned about being treated as an experiment rather than a person in a clinical trial.",
    Attitudes_87: "I'm afraid I'll get a sugar pill (placebo) instead of real medicine on a clinical trial.",
    Attitudes_88: "I wouldn't ask about clinical trials unless my doctor brought them up first.",
    Attitudes_89: "I don't like to try new treatments until they've been around for a while.",
    Attitudes_90: "I am not familiar with what clinical trials are.",
    Attitudes_91: "I'm afraid that if I take part in a clinical trial my treatment will be selected at random by a computer rather than by my doctor."
};

const config = {
    user: 'VergAdmin',
    password: process.env.PASSWORD,
    server: process.env.SERVER,
    port: parseInt(process.env.DBPORT, 10), 
    database: process.env.DATABASE,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: true, // for azure
      trustServerCertificate: true // change to true for local dev / self-signed certs
    }
}

// Initialize the connection pool once when the app starts
async function connectDB() {
    try {
        await sql.connect(config);
        console.log("✅ MSSQL Database Connected");
    } catch (err) {
        console.error("❌ Database connection error:", err);
    }
}

connectDB(); // Call this at startup

async function exportSurvey(apiToken, surveyId, dataCenter, fileFormat) {
    // Setting static parameters
    let requestCheckProgress = 0.0;
    let progressStatus = "inProgress";
    const baseUrl = `https://${dataCenter}.qualtrics.com/API/v3/surveys/${surveyId}/export-responses/`;
    const headers = {
        "content-type": "application/json",
        "x-api-token": apiToken,
    };
    let requestCheckResponse

    // Step 1: Creating Data Export
    try {
        const downloadRequestPayload = JSON.stringify({ format: fileFormat });
        const downloadRequestResponse = await axios.post(baseUrl, downloadRequestPayload, { headers });
        const progressId = downloadRequestResponse.data.result.progressId;

        // Step 2: Checking on Data Export Progress and waiting until export is ready
        while (progressStatus !== "complete" && progressStatus !== "failed") {
            const requestCheckUrl = baseUrl + progressId;
            requestCheckResponse = await axios.get(requestCheckUrl, { headers });
            requestCheckProgress = requestCheckResponse.data.result.percentComplete;
            console.log("Download is " + requestCheckProgress + " complete");
            progressStatus = requestCheckResponse.data.result.status;
        }

        // Step 2.1: Check for error
        if (progressStatus === "failed") {
            throw new Error("export failed");
        }

        const fileId = requestCheckResponse.data.result.fileId;

        // Step 3: Downloading file
        const requestDownloadUrl = baseUrl + fileId + '/file';
        const requestDownload = await axios.get(requestDownloadUrl, { headers, responseType: 'arraybuffer' });

        // Step 4: Unzipping the file
        const zip = new AdmZip(requestDownload.data);
        zip.extractAllTo(path.join(__dirname, "MultiAgent"), true);
        console.log('Complete');
    } catch (error) {
        console.error("Error:", error.message);
    }
}

const cleanCSV = async (inputFile, outputFile, responseIdToKeep) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const columnsToKeep = new Set();
        let rowIndex = 0;

        fs.createReadStream(inputFile)
            .pipe(csv())
            .on('headers', (headers) => {
                headers.forEach(header => {
                    if (header === 'ResponseId' || header.startsWith('Knowledge_') || header.startsWith('Attitudes_')) {
                        columnsToKeep.add(header);
                    }
                });
            })
            .on('data', (row) => {
                rowIndex++;

                // Skip the second and third rows
                if (rowIndex === 1 || rowIndex === 2) return;

                // If a responseIdToKeep is provided, only keep that row
                if (responseIdToKeep && row['ResponseId'] !== responseIdToKeep) return;

                const filteredRow = {};
                for (let key in row) {
                    if (columnsToKeep.has(key)) {
                        filteredRow[key] = row[key];
                    }
                }
                results.push(filteredRow);
            })
            .on('end', () => {
                if (results.length === 0) {
                    return reject(new Error('No matching ResponseId found.'));
                }

                const ws = fs.createWriteStream(outputFile);
                fastCsv
                    .write(results, { headers: true })
                    .pipe(ws)
                    .on('finish', resolve)
                    .on('error', reject);
            })
            .on('error', reject);
    });
};

const scoreResponses = (inputFile, knowledgeData, attitudesData) => {
    return new Promise((resolve, reject) => {
        let correct = [];
        let wrong = [];
        let unsure = [];
        let attitudes = [];

        fs.createReadStream(inputFile)
            .pipe(csv())
            .on('data', (row) => {
                Object.keys(knowledgeData).forEach((question) => {
                    if (row[question] !== undefined) {
                        let response = parseInt(row[question], 10);
                        let correctValue = knowledgeData[question].correctValue;

                        let result = {
                            question: question,
                            description: knowledgeData[question].description,
                            correctValue: correctValue,
                            userResponse: response
                        };

                        if (response === correctValue) {
                            correct.push(result);
                        } else if (response === 3) { // Assuming "3" means unsure
                            unsure.push(result);
                        } else {
                            wrong.push(result);
                        }
                    }
                });
                // Process attitudes questions
                Object.keys(attitudesData).forEach((attitude) => {
                    if (row[attitude] !== undefined) {
                        if (parseInt(row[attitude], 10) > 50) {
                            let attitudeResult = {
                                question: attitude,
                                description: attitudesData[attitude],
                                score: parseInt(row[attitude], 10)
                            }
                            attitudes.push(attitudeResult)
                        }     
                    }
                });
            })
            .on('end', () => {
                resolve({ correct, wrong, unsure, attitudes });
            })
            .on('error', reject);
    });
};

const generateTopics = async (message) => {
    const thread = await rashi_openai.beta.threads.create();
    await rashi_openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message
        });
        const run = await rashi_openai.beta.threads.runs.create(thread.id, {
        assistant_id: "asst_iPjLaF7ODxGVWInpqLB2GHB7"
        });
    let runStatus = await rashi_openai.beta.threads.runs.retrieve(thread.id, run.id);

    while (runStatus.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await rashi_openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    const messages = await rashi_openai.beta.threads.messages.list(thread.id);
    var generatedDialogue = messages.data[0].content[0].text.value;
    console.log(generatedDialogue)

    try {
        console.log("Successfully parsed JSON")
        return JSON.parse(generatedDialogue.trim());
    } catch (error) {
        console.error("Error parsing JSON, trying to parse string:", error);
        const jsonMatch = generatedDialogue.match(/```json([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                console.log("Successfully parsed JSON string")
                return JSON.parse(jsonMatch[1].trim());
            } catch (error) {
                console.error("Error parsing both attempts for JSON:", error);
                return null;
            }
        } else {
            console.error("No JSON found in response.");
            return null;
        }
    }
}

const sortTopicsByRelevance = (data) => {
    // Convert object to array
    const sortedTopics = Object.entries(data.Topics)
        .sort((a, b) => b[1].relevanceScore - a[1].relevanceScore) // Sort by relevanceScore (descending)
        .reduce((acc, [key, value]) => {
            acc[key] = value; // Convert back to object
            return acc;
        }, {});

    return { Topics: sortedTopics };
};

// Display registration form
router.get('/getSurveyResponses', async (req, res) => {
    try {
        const apiToken = process.env.QUALTRICS_APIKEY;
        const dataCenter = process.env.QUALTRICS_DATACENTER;

        if (!apiToken || !dataCenter) {
            throw new Error("Set environment variables APIKEY and DATACENTER");
        }

        const surveyId = req.query.surveyId || "SV_881ymxhR2uCez30";
        const fileFormat = req.query.fileFormat || "csv";

        if (!["csv", "tsv", "spss"].includes(fileFormat)) {
            throw new Error('fileFormat must be either csv, tsv, or spss');
        }

        const surveyIdRegex = /^SV_.*/;
        if (!surveyIdRegex.test(surveyId)) {
            throw new Error("survey Id must match ^SV_.*");
        }

        await exportSurvey(apiToken, surveyId, dataCenter, fileFormat);
        res.json({message: 'Survey export completed successfully'});
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Route to process the survey responses and clean the CSV
router.post('/processSurveyResponses', async (req, res) => {
    console.log("Qualtrics ID is", req.body.id)
    try {
        const responseIdToKeep = req.body.id; // Get id from query params
        if (!responseIdToKeep) {
            return res.status(400).send('Missing required query parameter: id');
        }

        const inputFile = path.join(__dirname, "MultiAgent/MultiAgent - Pre.csv");
        const outputFile = path.join(__dirname, "MultiAgent/MultiAgent_Cleaned.csv");

        await cleanCSV(inputFile, outputFile, responseIdToKeep);
        res.json({message: 'CSV file cleaned successfully. Only the row with the specified ResponseID was kept.'});
    } catch (error) {
        console.error('Error cleaning CSV:', error);
        res.status(500).send(error.message || 'Error cleaning CSV file');
    }
});

router.post('/checkTopics', async (req, res) => { 
    const { id } = req.body;
    const queryString = `
    SELECT * FROM CTStudy
    WHERE id = '${id}' 
    `;
    try {
        const request = new sql.Request();
        request.query(queryString, (err, recordset) => {
            if (err) {
                console.error(err);
                return;
            }
            if (recordset.recordset[0].topics) {
                console.log("Topics already exists.")
                res.json({ message: "Topics already exists", topics: JSON.parse(recordset.recordset[0].topics)});
            } else {
                res.json({ message: "Topics does not exists", topics: false });
            }
        });
    } catch (err) {
        console.error(err);
    }
})

router.post('/scoreSurveyResponses', async (req, res) => { 
    const id = req.body.id;
    try {
        console.log("Topics does not exist -- generating.")
        const inputFile = path.join(__dirname, "MultiAgent/MultiAgent_Cleaned.csv");

        // Wait for scoreResponses to complete
        const result = await scoreResponses(inputFile, knowledgeData, attitudesData);

        var gptMessage = "Wrong Clinical Trial Knowledge Answers: " + JSON.stringify(result.wrong) + "\n" +
                         "Unsure Clinical Trial Knowledge Answers: " + JSON.stringify(result.unsure) + "\n" +
                         "Attitudes: " + JSON.stringify(result.attitudes);

        // Wait for generateTopics to complete
        const topics = await generateTopics(gptMessage);

        var sortedTopics = sortTopicsByRelevance(topics)
        console.log("Got topics, inserting into DB.")

        let sortedTopicsJSON = JSON.stringify(sortedTopics)

        sql.connect(config, function (err) {
            if (err) {
              console.log(err);
              return res.status(500).json({ error: 'Internal Server Error' });
            }
        
            var request = new sql.Request();
            const queryString = `UPDATE CTStudy SET topics = @sortedTopicsJSON WHERE id = @id`;
        
            request.input('id', sql.NVarChar, id);
            request.input('sortedTopicsJSON', sql.NVarChar, sortedTopicsJSON);
        
            request.query(queryString, function (err, recordset) {
              if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
              }
        
              res.json({ message: "Responses have been scored, stored in database, and relevance scores have been assigned!", sortedTopics });
            });
          });
    } catch (error) {
        res.status(500).send(error.message || 'Error scoring responses.');
    }
});



module.exports = router;
