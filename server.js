const path = require('path');
const express = require('express');
const session = require('express-session');
const MSSQLStore = require('connect-mssql-v2');
const app = express();
const {Configuration, OpenAI, OpenAIApi} = require('openai')
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; // for aws, comment out for local testing
const ffmpeg = require('fluent-ffmpeg'); // Import ffmpeg for audio processing
const ffmpegPath = require('ffmpeg-static'); // Path to the static binary
ffmpeg.setFfmpegPath(ffmpegPath); // Set the path explicitly
const bodyParser = require('body-parser');
var sql = require("mssql");
var favicon = require('serve-favicon');

app.use(favicon(path.join(__dirname,'public','favicon.ico')));

require('dotenv').config();
const openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);
const rashi_openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);
const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY
app.use(bodyParser.json());

var prevDialogue = ""

const jsonDir = path.resolve(__dirname, './json_scripts')

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

const sessionStoreConfig = {
  user: "VergAdmin",
  password: process.env.PASSWORD,
  server: process.env.SERVER,
  port: parseInt(process.env.DBPORT, 10),
  database: process.env.DATABASE,
  options: {
      encrypt: true, // For Azure
      trustServerCertificate: true, // For local dev / self-signed certs
  },
  pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
  },
};

const sessionStoreOptions = {
  table: 'CTStudySessions',
  autoRemove: true,
  autoRemoveInterval: 1000 * 60 * 60 * 24 // check to delete every 24 hours

}
console.log("🔍 Attempting to initialize MSSQL session store...");

const sessionStore = new MSSQLStore(sessionStoreConfig, sessionStoreOptions);

console.log("🔍 MSSQLStore instance created.");

app.use(
  session({
      secret: process.env.SESSION_KEY,
      store: sessionStore, // Use MSSQL session store
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
          maxAge: 1000 * 60 * 120, // 30 min
      },
  })
);

sessionStore.on('connect', () => {
  console.log('✅ Successfully connected to the MSSQL session store.');
});

sessionStore.on('error', (err) => {
  console.error('❌ Error connecting to the MSSQL session store:', err.message);
});

sessionStore.on('sessionError', (error, classMethod) => {
  console.error('❌ Error connecting to the MSSQL session store:', error);
  console.error('❌ Class Method error connecting to the MSSQL session store:', classMethod);
})

app.use(express.static(path.join(__dirname, 'public')));

// index page
app.get('/', function(req, res) {
  req.session.params = {};
  req.session.params.id = req.params.id;
  req.session.params.condition = req.params.c;
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/interaction', function(req, res) {
  console.log(req.session.params)
  res.sendFile(path.join(__dirname, 'public', 'interaction.html'));
});

app.get('/intro', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'intro.html'));
});

app.get('/select', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'select.html'));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Decide whether to keep the process alive or shut it down
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally handle cleanup or decide to shut down gracefully
});


function removeSpecialFormat(text) {
    return text.replace(/【\d+:\d+†[^】]+】/g, '');
}

// app.post('/adjustHealthLiteracy', async (req, res, next) => {
//   var message = `MESSAGE: ${req.body.message}; ADJUSTMENT: ${req.body.adjustment}`
//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o",
//     messages: [{ 
//       role: "developer", 
//       content: "You are a helpful assistant whose goal is to lower the health literacy of the user's MESSAGE based on ADJUSTMENT, which is how they want the information presented, either 0 (low health iteracy) or 100 (high health literacy). Keep the message content the same, but the lower the health literacy based on ADJUSTMENT: if 100, use more medical jargon and more technical terms. if 0, use less medical jargon, less technical terms, and less complex sentence structure, and explain any terms or phrases that are specific to healthcare. Use these websites to help guide you for 0: https://www.cms.gov/training-education/learn/find-tools-to-help-you-help-others/guidelines-for-effective-writing, https://multco.us/file/plain_language_word_list/download, https://www.plainlanguage.gov/resources/checklists/checklist/. Return only the adjusted text." 
//     }, 
//     { 
//       role: "user", 
//       content: message 
//     }],
//     store: true,
//   });

//   return res.json({ message: completion.choices[0].message.content });
// })

app.get('/getQuestionsJSON', (req, res, next) => {
  var questionsJSON = JSON.parse(fs.readFileSync(path.join(jsonDir, "Questions.json")), 'utf8')
  return res.json({ questions: questionsJSON });
})

app.get('/getIntroQuestionsJSON', (req, res, next) => {
  var introQuestionsJSON = JSON.parse(fs.readFileSync(path.join(jsonDir, "Intro_Questions.json")), 'utf8')
  return res.json({ introQuestions: introQuestionsJSON });
})

async function generateGoogleTTS(ssml, voice = null, pitch = null) {
  // Convert text to SSML
  const o = {
      method: "POST",
      headers: {
          "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
          "input": {
              "ssml": ssml
          },
          "voice": {
              "languageCode": "en-US",
              "name": voice
          },
          "audioConfig": {
              "audioEncoding": "OGG_OPUS",
              "speakingRate": 1.15,
              "pitch": pitch
          },
          "enableTimePointing": ["SSML_MARK"]
      })
  };

  const ttsEndpoint = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_API_KEY}`;
  const res = await fetch(ttsEndpoint, o);
  const data = await res.json();
  if (!res.ok) {
      console.error("Google TTS API Error:", data); // Log detailed error message
  }
  if (res.status == 200 && data && data.audioContent) {
      return data; // ✅ Return `data` directly, no wrapping
  }

}

app.post('/generateSSML', async (req, res) => {
  const { ssml, voice, pitch } = req.body;
  // const ssml = "Test sentence for testing purposes at test dot com"
  if (!ssml) {
      return res.status(400).json({ error: 'Missing ssml object' });
  }
  const audioResponse = await generateGoogleTTS(ssml, voice, pitch)
  res.json({ audioResponse });
})

app.post('/interact/:nodeId', async (req, res, next) => {
  const nodeId = parseInt(req.params.nodeId);
  var message = req.body.userMessage || {};
  var gender = req.body.gender
  var script = req.body.script
  var openai_assistant = ''
  console.log("IN INTERACT, MESSAGE IS", message)
  try {
      // Find node data in preloaded metadata
      var nodeData
      var scriptData =  JSON.parse(fs.readFileSync(path.join(jsonDir, script), 'utf8'));

      nodeData = scriptData.find(item => item.nodeId === nodeId);
      openai_assistant = "asst_fcNdxIROJV8pDLdeQpLLIvpm"

      if (!nodeData) {
          console.error(`Node with ID ${nodeId} not found.`);
          return res.status(404).json({ error: `Node with ID ${nodeId} not found` });
      }

      var agentDialogue = nodeData.dialogue
      console.log("FOUND NODE")

      if (nodeData.response) {
        console.log(nodeData.response)
        if (nodeData.response.useAi.modifyDialogue) {
          var messages;
          if (nodeId === 2) {
            messages = [
              { role: "system", content: "You are a virtual doctor helping raise awareness about clinical trials as an option for cancer care to a real cancer patient. Address their questions and concerns in 30 words or less." },
              { role: "user", content: message }
            ]
          } else {
            console.log(prevDialogue)
            messages = [
              { role: "system", content: "You are a support agent helping a real cancer patient decide whether or not a clinical trial is right for them. The following message is from a doctor, Doctor Alex. Directly address Doctor Alex and acknowledge what they said with backchannels. Then address the real cancer patient and suggest a useful question for the patient to ask based on what Doctor Alex said. Keep your response to 30 words or less." },
              { role: "user", content: prevDialogue }
            ]
          }
          const completion = await rashi_openai.chat.completions.create({
            model: "gpt-4o-mini", // or "gpt-4o", "gpt-3.5-turbo"
            messages: messages,
            temperature: 0.7 // adjust for creativity
          });

          agentDialogue = removeSpecialFormat(
            completion.choices[0].message.content
          );

          console.log("GOT RESPONSE");
          console.log(agentDialogue);
          prevDialogue = agentDialogue
          // console.log("MAKING CALL TO OPENAI")
          // console.log(message)
          // const openAiAssistant = 'asst_NkwHAFS69vs6Yde0IU24czgD'
          // console.log(openAiAssistant)
          // const thread = await rashi_openai.beta.threads.create();
          // await rashi_openai.beta.threads.messages.create(thread.id, {
          //     role: 'user',
          //     content: message
          //   });
          //   const run = await rashi_openai.beta.threads.runs.create(thread.id, {
          //     assistant_id: openAiAssistant
          //   });
          // let runStatus = await rashi_openai.beta.threads.runs.retrieve(thread.id, run.id);

          // while (runStatus.status !== 'completed') {
          //   console.log("WAITING FOR RESPONSE ...")
          //   await new Promise(resolve => setTimeout(resolve, 3000));
          //   runStatus = await rashi_openai.beta.threads.runs.retrieve(thread.id, run.id);
          // }
          // console.log("GOT RESPONSE")
          // const messages = await rashi_openai.beta.threads.messages.list(thread.id);
          // var generatedDialogue = messages.data[0].content[0].text.value;
          // agentDialogue = removeSpecialFormat(generatedDialogue)
          // console.log(agentDialogue)
        }
      }

      const responseData = { 
        dialogue: agentDialogue, 
        nodeId: nodeData.nodeId, 
        agent: nodeData.agent, 
        input: nodeData.input || null, 
        passOn: nodeData.passOn || null,
        showQuestions: nodeData.showQuestions || null,
        options: nodeData.options || []
      }
      console.log("RETURNING TO FRONT END", responseData)
      return res.json(responseData);
  } catch (err) {
      console.error('Error during request processing:', err);
      return res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/updateTranscript', (req, res) => {
    const { id, transcriptType, transcript } = req.body;
  
    sql.connect(config, function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      var request = new sql.Request();
      const queryString = `UPDATE CTStudy2 SET ${transcriptType} = @transcript WHERE id = @id`;
  
      request.input('id', sql.NVarChar, id);
      request.input('transcript', sql.NVarChar, transcript);
  
      request.query(queryString, function (err, recordset) {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
  
        res.status(200).json({ message: 'Transcript inserted successfully.' });
      });
    });
  });

  app.post('/logItem', (req, res) => {
    const { id, columnName, value, valueType } = req.body;
  
    sql.connect(config, function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      var request = new sql.Request();
      const queryString = `UPDATE CTStudy2 SET ${columnName} = @value WHERE id = @id`;
  
      request.input('id', sql.NVarChar, id);
      if (valueType === "int") {
        request.input('value', sql.Int, value);
      }
      if (valueType === "varchar") {
        request.input('value', sql.NVarChar, value);
      }
  
      request.query(queryString, function (err, recordset) {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
  
        res.status(200).json({ message: 'Value inserted successfully.' });
      });
    });
  });

  async function getTranscript(id) {
    return new Promise((resolve, reject) => {
      sql.connect(config, function (err) {
        if (err) {
          console.log(err);
          reject(err);
        }
  
        var request = new sql.Request();
        const queryString = `SELECT * FROM CTStudy2 WHERE id = @id`;
  
        request.input('id', sql.NVarChar, id);
  
        request.query(queryString, function (err, recordset) {
          if (err) {
            console.log(err);
            reject(err);
          }
  
          if (recordset.recordset.length === 0) {
            reject(new Error('Transcript not found'));
          }
  
          resolve(recordset.recordset[0].informationTranscript);
        });
      });
    });
  }
  

  app.post('/logUser', (req, res) => {
    // Extracting data from the request body
    const { id, condition, startTime } = req.body;
  
    // BEGIN DATABASE STUFF: SENDING VERSION (R24 OR U01) AND ID TO DATABASE
    sql.connect(config, function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      // create Request object
      var request = new sql.Request();
  
      // Check if ID already exists
      let checkIfExistsQuery = `SELECT TOP 1 id FROM CTStudy2 WHERE id = @id`;
  
      // Bind parameterized value for ID
      request.input('id', sql.NVarChar, id);
  
      // Execute the query to check if the ID already exists
      request.query(checkIfExistsQuery, function (err, recordset) {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Database: Internal Server Error' });
        }
  
        // If the recordset has rows, then the ID already exists
        if (recordset && recordset.recordset.length > 0) {
          return res.status(200).json({ message: 'Database: id already exists.' });
        } else {
          // Construct SQL query with parameterized values to insert the record
          let insertQuery = `INSERT INTO CTStudy2 (id, condition, startTime) VALUES (@id, @condition, @startTime)`;
        
          // Bind parameterized values
          request.input('condition', sql.Int, condition);
          request.input('startTime', sql.NVarChar, startTime);
  
          // Execute the query to insert the record
          request.query(insertQuery, function (err, recordset) {
            if (err) {
              console.log(err);
              return res.status(500).json({ error: 'Database: Internal Server Error' });
            }
            res.status(200).json({ message: 'Database: User inserted successfully.' });
          }); 
        }
      });
    });
  });


// Endpoint to handle chat transcript summarization and PDF generation
app.post('/summarize', async (req, res) => {
  const { id, condition } = req.body;
  var transcript = await getTranscript(id)
  var instructions
  if (condition === 'tailored') {
    instructions = `Please generate a summary based on the information in the transcript, using the following headers (use ### for headers): Paying for Clinical Trials, Treatment Options, Randomization, Discussing with Family, Trust, Reasons for Participation. Refer to the user as "you", and mention their preferences at the beginning of each section. Here is the transcript:\n\n${JSON.stringify(transcript)}`
  } else {
    instructions = `Please generate a summary based on the information in the transcript, using the following headers (use ### for headers): Paying for Clinical Trials, Treatment Options, Randomization, Discussing with Family, Trust, Reasons for Participation. Here is the transcript:\n\n${JSON.stringify(transcript)}`
  }

  try {
    // Step 1: Summarize the chat transcript using OpenAI API
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an assistant that generates summaries based on chat transcripts.' },
        { role: 'user', content: instructions }
      ],
    });

    const summary = summaryResponse.choices[0].message;

    // Step 2: Generate PDF from the summary
    const doc = new PDFDocument();
    // Register custom fonts
    doc.registerFont('Poppins-Light', 'fonts/Poppins-Light.ttf');
    doc.registerFont('Poppins-Bold', 'fonts/Poppins-Bold.ttf');
    const pdfBuffer = [];
    const tokens = marked.lexer(summary.content);
    doc.on('data', chunk => pdfBuffer.push(chunk));
    doc.on('end', () => {
      // Send the PDF as a response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=chat-summary.pdf');
      res.send(Buffer.concat(pdfBuffer));
    });

  // Add an image
  const pageWidth = doc.page.width; // Width of the current page
  const imageWidth = 250; // Width you set for the image (fit width)
  const imageX = (pageWidth - imageWidth) / 2; // Centered X position

  doc.image('images/example.png', imageX, doc.y, {
    fit: [250, 250], // Fit the image within these dimensions
  });

  // Move the cursor down to avoid text overlapping the image
  doc.moveDown(5.5); // Adjust as needed
    doc.font('Poppins-Bold').fontSize(19).text('Conversation Summary', { align: 'center' });
    doc.moveDown();

    tokens.forEach((token) => {
      if (token.type === 'heading') {
        doc.font('Poppins-Bold').fontSize(15).text(token.text, { underline: true }).moveDown(0.5);
      } else if (token.type === 'paragraph') {
        doc.font('Poppins-Light').fontSize(13).text(token.text).moveDown(0.5);
      }
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while generating the summary.');
  }
});

// prevent server from restarting
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Decide whether to keep the process alive or shut it down
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally handle cleanup or decide to shut down gracefully
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});