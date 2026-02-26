import express from 'express';
import session from 'express-session';
import MSSQLStore from 'connect-mssql-v2';
import OpenAI from 'openai';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
// import ffmpegPath from '@ffmpeg-installer/ffmpeg'; // for AWS, comment out for local testing
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import bodyParser from 'body-parser';
import sql from 'mssql';
import favicon from 'serve-favicon';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import qualtricsRouter from './routes/qualtrics.mjs';

// Get __filename and __dirname equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Now you can use __dirname like before
const jsonDir = path.resolve(__dirname, './json_scripts');


const app = express();

ffmpeg.setFfmpegPath(ffmpegPath); // Set the path explicitly

app.use(favicon(path.join(__dirname,'public','favicon.ico')));

const rashi_openai = new OpenAI();
const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY
app.use(bodyParser.json());

var prevDialogue = ""

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

app.get('/demo', function(req, res) {
  console.log(req.session.params)
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.get('/interaction', function(req, res) {
  console.log(req.session.params)
  res.sendFile(path.join(__dirname, 'public', 'interaction.html'));
});

app.get('/home', function(req, res) {
  console.log(req.session.params)
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
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
  console.log("IN GENERATE SSML")
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
              { role: "system", content: 
                "You are a virtual doctor discussing clinical trials in general as one possible cancer care option. You will receive a patient message. Briefly acknowledge the patient's message, then directly respond with at least one concrete clarification, explanation, or example addressing barriers, processes, or decision-making in clinical trials. Do not refer to any specific trial. Respond naturally and conversationally in 30 words or less."
              },
              { role: "user", content: message }
            ]
          } else {
            console.log(prevDialogue)
            messages = [
              {
                role: "system",
                content: `
            You are simulating a patient's internal thoughts after reading a doctor's response.

            The user message will contain a dialogue formatted as:
            "Patient said: ..."
            "Doctor said: ..."

            Using that dialogue, write a short internal monologue (30 words or less) showing the patient's private thoughts after reading the doctor's most recent reply.

            The internal monologue should:
            - Reflect on what the response means personally
            - Prioritize identifying vague or general phrases used in the doctor's response; if none, then any remaining uncertainties; if none, indicate so
            - Consider possible follow-up questions or next steps (max 1)
            - Sound natural and realistic (not clinical or academic)
            - Not introduce new medical facts beyond what was stated
            - Not continue the conversation

            Write in first person (e.g., "Okay, so…"). Any follow-up questions should be directed toward Dr. Alex in the dialogue.
            Output only the internal monologue.
            `
              },
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
          prevDialogue =
          "Patient said:\n" + message + "\n\n" +
          "Doctor said:\n" + agentDialogue
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

// Helper to view past conversation
async function checkConversation() {
  if (!conversationId) return;
  try {
    const items = await rashi_openai.conversations.items.list(conversationId, { limit: 10 });
    console.log(items.data);
  } catch (err) {
    console.error("Error listing conversation:", err);
  }
}

function debugResponseSimple(response) {
  console.log("=== RAW RESPONSE ===");
  console.log(JSON.stringify(response, null, 2));

  if (!response.output || response.output.length === 0) {
    console.log("No output returned by the model.");
    return;
  }

  const firstMessage = response.output[0];
  if (!firstMessage.content || firstMessage.content.length === 0) {
    console.log("Output exists but no content blocks found in the first message.");
    return;
  }

  const firstContent = firstMessage.content[0];
  if (firstContent.type !== "text") {
    console.log(`First content block is type "${firstContent.type}", not text.`);
    console.log(response.output_text)
  } else {
    console.log("Text returned by the model:", firstContent.text);
  }
}

// Wrap initialization in an async IIFE so you can await
let conversationId = null;

(async () => {
  try {
    const conversation = await rashi_openai.conversations.create({
      metadata: { topic: "demo" },
      items: [
        { type: "message", role: "user", content: "Hello!" }
      ],
    });

    console.log("CONVERSATION CREATED", conversation);
    conversationId = conversation.id;
  } catch (err) {
    console.error("Error creating conversation:", err);
  }
})();

// Route
app.post("/chat", async (req, res) => {
  try {
    const { message, assistant_role } = req.body;

    var promptId
    var historyMessage
    var vectorStore

    var doctor_prompt_id = "pmpt_68b4c600a9f48193839671a35f08d9350d4129db604e02c6"
    var support_prompt_id = "pmpt_68b4d08a5d708193ba3a3c98678bbcd108664778d782cf1d"

    var doctor_vector_store = "vs_68b46fbd79648191bb803803b96cc85b"
    var support_vector_store = "vs_68b477f6bda08191a5c1a4f98d9f33ba"

    if (assistant_role === "Doctor") {
      console.log("IS DOCTOR")
      promptId = doctor_prompt_id
      historyMessage = "Doctor: " + message
      vectorStore = doctor_vector_store
    } else {
      console.log("IS SUPPORT")
      promptId = support_prompt_id
      historyMessage = "Support: " + message
      vectorStore = support_vector_store
    }

    const response = await rashi_openai.responses.create({
      model: "gpt-4-turbo",
      conversation: conversationId, // reuse existing thread
      prompt: {
        id: promptId
      },
      input: historyMessage,
      stream: true
    });

    const reply = response.output_text;
    // const reply = "Testing rn"
    console.log("GOT REPLY", reply)

    console.log(vectorStore)

    var list_of_stores = await rashi_openai.vector_stores.retrieve({
        vector_store_id: "vs_68b477f6bda08191a5c1a4f98d9f33ba"
    });
    console.log("LIST OF VECTOR STORES", list_of_stores)

    const vectorStoreResults = await rashi_openai.vectorStores.search({
        vector_store_id: "vs_68b477f6bda08191a5c1a4f98d9f33ba",
        query: historyMessage,
    });

    console.log("VECTOR STORE RESULTS", vectorStoreResults)

    res.json({
      reply    
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/qualtrics', qualtricsRouter); 

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});