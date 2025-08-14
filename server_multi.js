const path = require('path');
const express = require('express');
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
const PDFDocument = require('pdfkit');
const { marked } = require('marked');


app.use(favicon(path.join(__dirname,'public','favicon.ico')));


require('dotenv').config();
const openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);
const rashi_openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);
app.use(bodyParser.json());

const jsonDir = path.resolve(__dirname, './json_scripts/people_scripts')


// Preload data at the beginning

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


app.use(express.static(path.join(__dirname, 'public')));


// index page
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/interaction', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'interaction.html'));
});

app.get('/intro', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'intro.html'));
});


app.get('/select', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'select.html'));
});

function checkScripts(filesToCheck) {
  const existingFiles = [];
  const missingFiles = [];
  console.log(jsonDir)
  filesToCheck.forEach(file => {
    const filePath = path.join(jsonDir, file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error("The following files do not exist:", missingFiles);
  } else {
    try {
      const scriptData = existingFiles.map(file => {
        const filePath = path.join(jsonDir, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      });
      // Process scriptData as needed
    } catch (err) {
      console.error("Error reading or parsing files:", err);
    }
  }
}

const filesToCheck = [
  "Text_Script_Rashi_Audio.json",
  "Text_Script_Chris_Audio.json",
  "Text_Script_Roshan_Audio.json",
  "Text_Script_Danish_Audio.json"
];


checkScripts(filesToCheck);

// Route to generate audio for all dialogue nodes and save as JSON
app.get("/generate/prescripted", async (req, res) => {
  console.log("GENERATING PRESCRIPT")
  console.log(req.body)
  const audioMetadata = [];
  const inputFile = path.join(jsonDir, req.body.script + '.json');
  const outputFile = path.join(jsonDir, req.body.script + '_Audio.json');

  // Load the original JSON data
  let dialogueNodes;
  try {
      dialogueNodes = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
      console.log(`Number of items in dialogueNodes: ${dialogueNodes.length}`);
      console.log("Success loading in Text JSON")
  } catch (error) {
      console.error("Error reading input JSON file:", error);
      //return res.status(500).json({ error: 'Failed to read input JSON file.' });
  }

  // Process each node
  console.log("Processing each node ...")
  for (const node of dialogueNodes) {
      try {
        console.log("Processing node " + node.nodeId)
          let audioDataF = null;
          let audioDataM = null;

          // Process nodes with dialogue
          if (node.dialogue && (node.response == null || node.response.alterDialogue === false)) {
            console.log("This node either has a pregenerated response, or will append a pregenerated script to ChatGPT generated response.")
              const textToConvert = node.dialogue;

              // Generate audio for Female voice
              audioDataF = await generateAudio(textToConvert, 'nova');

            //   Generate audio for Male voice
              audioDataM = await generateAudio(textToConvert, 'onyx');
          }

          // Add audioM and audioF fields to the node
          const updatedNode = {
              ...node,
              audioM: audioDataM,
              audioF: audioDataF,
          };

          audioMetadata.push(updatedNode);
      } catch (error) {
          console.error(`Error processing node ${node.nodeId}:`, error);
      }
  }

  // Save the updated JSON
  try {
      await fs.promises.writeFile(outputFile, JSON.stringify(audioMetadata, null, 2));
      console.log(`Updated JSON with audio metadata saved to ${outputFile}`);
  } catch (error) {
      console.error("Error writing updated JSON to file:", error);
      return res.status(500).json({ error: 'Failed to write updated JSON file.' });
  }

  res.json({ message: 'Audio generation complete', outputFile });
});

// Function to generate audio and transcriptions
async function generateAudio(text, voice) {
  try {
      // Generate speech
      const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: voice,
          input: text,
          response_format: "wav",
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const uniqueFilename = `speech_${uuidv4()}.wav`;
      const speechFile = path.resolve(jsonDir, `./audio/${uniqueFilename}`);

      await fs.promises.writeFile(speechFile, buffer);

      // Adjust audio speed
      const spedUpFilename = `spedup_${uniqueFilename}`;
      const spedUpFilePath = path.resolve(jsonDir, `./audio/${spedUpFilename}`);

      await new Promise((resolve, reject) => {
          ffmpeg(speechFile)
              .audioFilters('atempo=1.1') // Speed up the audio
              .save(spedUpFilePath)
              .on('end', resolve)
              .on('error', reject);
      });

      // Convert to Base64
      const spedUpBuffer = await fs.promises.readFile(spedUpFilePath);
      const audioBase64 = spedUpBuffer.toString('base64');

      // Transcribe audio
      const transcriptionResponse = await openai.audio.transcriptions.create({
          file: fs.createReadStream(spedUpFilePath),
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["word", "segment"],
      });

      if (transcriptionResponse && transcriptionResponse.words) {
          return {
              audioBase64: audioBase64,
              words: transcriptionResponse.words.map(x => x.word),
              wtimes: transcriptionResponse.words.map(x => 1000 * x.start - 150),
              wdurations: transcriptionResponse.words.map(x => 1000 * (x.end - x.start)),
          };
      }

      return null;
  } catch (error) {
      console.error("Error generating audio:", error);
      return null;
  }
}

async function processSentence(sentence, nodeData, req, isFirstChunk, agentGender, citations) {
    const chunkType = isFirstChunk ? "NEW AUDIO" : "CHUNK";
    const createdFiles = [];
    const tempDir = '/tmp'; // Directory for temporary files
    const gender = agentGender;
    try {
        // Ensure /tmp directory exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const voice = gender === "male" ? 'onyx' : 'nova';

        // Generate audio
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: sentence,
            response_format: "wav",
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const uniqueFilename = `speech_${uuidv4()}.wav`;
        const speechFile = path.join(tempDir, uniqueFilename);
        await fs.promises.writeFile(speechFile, buffer);
        createdFiles.push(speechFile);

        // Speed up audio
        const spedUpFilename = `spedup_${uniqueFilename}`;
        const spedUpFilePath = path.join(tempDir, spedUpFilename);
        await new Promise((resolve, reject) => {
            ffmpeg(speechFile)
                .audioFilters('atempo=1.1')
                .save(spedUpFilePath)
                .on('end', resolve)
                .on('error', reject);
        });
        createdFiles.push(spedUpFilePath);

        // Convert to Base64
        const spedUpBuffer = await fs.promises.readFile(spedUpFilePath);
        const audioBase64 = spedUpBuffer.toString('base64');

        // Transcription
        const transcriptionResponse = await openai.audio.transcriptions.create({
            file: fs.createReadStream(spedUpFilePath),
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word", "segment"],
        });

        const sentenceAudio = transcriptionResponse?.words
            ? {
                audioBase64,
                words: transcriptionResponse.words.map(x => x.word),
                wtimes: transcriptionResponse.words.map(x => 1000 * x.start - 150),
                wdurations: transcriptionResponse.words.map(x => 1000 * (x.end - x.start)),
            }
            : { audioBase64 };

        return {
            userId: req.session?.params?.id || null,
            nodeId: nodeData.nodeId,
            dialogue: sentence,
            audio: sentenceAudio,
            input: nodeData.input || null,
            options: nodeData.options || [],
            url: nodeData.url || null,
            progressInterview: nodeData.progressInterview || null,
            type: chunkType,
            wholeDialogue: nodeData.wholeDialogue,
            sources: nodeData.sources,
            annotations: citations
        };
    } catch (error) {
        console.error("Error processing sentence:", error);
        return { error: `Failed to process sentence: ${sentence}` };
    } finally {
        // Cleanup: Delete all created audio files
        for (const filePath of createdFiles) {
            try {
                await fs.promises.unlink(filePath);
            } catch (cleanupError) {
                console.error(`Failed to delete file: ${filePath}`, cleanupError);
            }
        }
    }
}


function splitTextIntoSentences(text) {
    // Modern approach using Intl.Segmenter
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
        return Array.from(segmenter.segment(text), segment => segment.segment);
    }

    // Fallback for environments without Intl.Segmenter
    return text.match(/[^.!?]+[.!?]+/g) || [text];
}

function removeSpecialFormat(text) {
    return text.replace(/【\d+:\d+†[^】]+】/g, '');
}


app.post('/interact/:nodeId', async (req, res, next) => {
  const nodeId = parseInt(req.params.nodeId);
  var message = req.body.userMessage || {};
  var gender = req.body.gender
  var script = req.body.script
  var openai_assistant = ''
  console.log(req.body)

  try {
      // Find node data in preloaded metadata
      var nodeData
      if (script === "Text_Script_Audio.json") {
        nodeData = scriptData.find(item => item.nodeId === nodeId);
        openai_assistant = "asst_fcNdxIROJV8pDLdeQpLLIvpm"
      }
      if (script === "Text_Script_Support_Audio.json") {
        nodeData = scriptDataSupport.find(item => item.nodeId === nodeId);
        openai_assistant = "asst_3bdqP1yDe38blhEGJNGS2qaT"
      } 

      if (!nodeData) {
          console.error(`Node with ID ${nodeId} not found.`);
          return res.status(404).json({ error: `Node with ID ${nodeId} not found` });
      }

      if (nodeData.dialogue && nodeData.response == null) {
          var audio
          if (gender === "male") {
            audio = nodeData.audioM;
          } else {
            audio = nodeData.audioF;
          }
          const responseData = {
              nodeId: nodeId,
              dialogue: nodeData.dialogue,
              agent: nodeData.agent,
              audio: audio,
              passOn: nodeData.passOn || null,
              input: nodeData.input || null,
              options: nodeData.options || [],
              sources: nodeData.sources || null,
          };
          res.setHeader('Content-Type', 'application/json; type=prerecorded'); // set type=precorded for front end otherwise no type
          return res.json(responseData);
      } else {
        const thread = await rashi_openai.beta.threads.create();
        if (nodeData.response.alterDialogue === true) {
            message = "Construct a similar response based on the given 'Response' using your knowledge base, using any relevant information from 'userInfo':\n Response: " + nodeData.dialogue + "\n userInfo: " + req.body.userInfo
        } else {
            message = "Respond to the following Message optionally using any relevant information from userInfo. Focus on addressing the Message:\n Message: " + req.body.userMessage + "\n userInfo: " + req.body.userInfo
        }
        await rashi_openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message
          });
          const run = await rashi_openai.beta.threads.runs.create(thread.id, {
            assistant_id: openai_assistant
          });
        let runStatus = await rashi_openai.beta.threads.runs.retrieve(thread.id, run.id);

        while (runStatus.status !== 'completed') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await rashi_openai.beta.threads.runs.retrieve(thread.id, run.id);
        }
        const messages = await rashi_openai.beta.threads.messages.list(thread.id);
        var generatedDialogue = messages.data[0].content[0].text.value;

        const annotations = messages.data[0].content[0].text.annotations;
        let citations = [];
        
        const fileIds = annotations.map(annotation => annotation.file_citation.file_id);

        const retrievedFiles = await Promise.all(fileIds.map(async fileId => {
          return await rashi_openai.files.retrieve(fileId);
        }));

        generatedDialogue = removeSpecialFormat(generatedDialogue)

        let entireDialogue

        if (nodeData.response.alterDialogue === false) {
            entireDialogue = generatedDialogue + nodeData.dialogue
        } else {
            entireDialogue = generatedDialogue
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        console.log("CITATIONS BEFORE SENDING STUFF", citations)
        var responseData = {
            nodeId: nodeId,
            dialogue: generatedDialogue,
            audio: null,
            input: nodeData.input || null,
            options: nodeData.options || [],
            wholeDialogue: entireDialogue,
            type: "NEW AUDIO",
            sources: nodeData.sources || null,
            annotations: citations
        };

        // Audio Chunk Streaming
        const sentences = splitTextIntoSentences(generatedDialogue);
        // console.log("Split dialogue into sentences:", sentences);

        // Process first chunk immediately
        const firstChunk = await processSentence(sentences[0], responseData, req, true, gender, citations);
        res.write(JSON.stringify(firstChunk) + '\n');

        // Process remaining chunks concurrently
        const remainingChunksPromises = sentences.slice(1).map((sentence, index) =>
            processSentence(sentence, responseData, req, false, gender, citations)
        );
        try {
            const remainingChunks = await Promise.all(remainingChunksPromises);

            // Stream remaining chunks as they finish
            remainingChunks.forEach(chunk => {
                res.write(JSON.stringify(chunk) + '\n');
            });

            // Only execute this AFTER all remaining chunks are done
            if (nodeData.response != null) {
                // console.log("Sending pre-generated sentence:", nodeData.dialogue);
                const audio = gender === "female" ? nodeData.audioF : nodeData.audioM;
                responseData.dialogue = nodeData.dialogue;
                responseData.audio = audio;
                responseData.type = "END CHUNK";
                res.write(JSON.stringify(responseData) + '\n');
            }

            console.log("Finished processing all sentences. Ending response stream.");
            res.end();
        } catch (err) {
            console.error('Error processing remaining chunks:', err);
            res.end();
        }
      } 
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
    const { id, columnName, value } = req.body;
  
    sql.connect(config, function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      var request = new sql.Request();
      const queryString = `UPDATE CTStudy2 SET ${columnName} = @value WHERE id = @id`;
  
      request.input('id', sql.NVarChar, id);
      request.input('value', sql.Int, value);
  
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