import { getOpenAIInstance } from "../services/openai.js";
import AssistantModel from "../models/AssistantModel.js";
import ChatModel from "../models/ChatModel.js";
import { StatusCodes } from "http-status-codes";
import mysql from "mysql2"
import OpenAI from "openai";
import dotenv from "dotenv";
const generateInstructions = (schemaDescription) => {
  return `
You are an AI assistant specializing in SQL query generation for database analytics. 
Your task is to generate SQL queries based on user prompts. Do not perform calculations; instead, provide the appropriate SQL query to fetch the required data.

Always return your responses as an array of objects like this:
[
  {"query_description": "SQL Query"},
  {"another_query": "SQL Query"}
]

You should provide only the SQL query needed to extract the relevant data, without performing any calculations yourself.

Here is the database schema:
${schemaDescription}

Use this schema to generate appropriate SQL queries in response to user queries.
  `;
};

const formatTableSchema = (tables) => {
  if (!Array.isArray(tables) || tables.length === 0) {
    return "No schema provided.";
  }

  return tables
    .map((table, index) => {
      const { tableName, columns } = table;
      const formattedColumns = columns
        .map(
          (col) =>
            `${col.columnName}: ${col.dataType} ${col.columnType === "PRIMARY" ? "(Primary Key)" : col.columnType === "FOREIGN" ? "(Foreign Key)" : ""}`
        )
        .join("\n  ");

      return `${index + 1}. Table: ${tableName}\n  Columns:\n  ${formattedColumns}`;
    })
    .join("\n\n");
};

export const createAssistant = async (req, res, next) => {
  try {
    console.log("Received Data:", req.body);

    let {
      agentName,
      sqlUsername,
      sqlPassword,
      instructions = "",
      description = "",
      photoOption = "",
      tables = [],
      assistantTypes = [],
      userSelectedModel = "gpt-4-turbo",
    } = req.body;

    console.log("instrucrions", instructions);


    const missingFields = [];
    if (!agentName) missingFields.push("agentName");
    if (!sqlUsername) missingFields.push("sqlUsername");
    if (!sqlPassword) missingFields.push("sqlPassword");
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }

    const formattedSchema = formatTableSchema(tables);
    instructions = generateInstructions(formattedSchema);
   


    const openai = await getOpenAIInstance();

    const openAIAssistant = await openai.beta.assistants.create({
      name: agentName,
      instructions: instructions,
      model: userSelectedModel,
    });




    if (!openAIAssistant?.id) {
      return res.status(500).json({ error: "Failed to create OpenAI Assistant" });
    }

    const assistantId = openAIAssistant.id;

    const newAssistant = new AssistantModel({
      assistant_id: assistantId,
      agentName,
      sqlUsername,
      sqlPassword,
      instructions,
      description,
      photoOption,
      tables,
      assistantTypes,
      userSelectedModel,
    });

    await newAssistant.save();

    res.status(201).json({ message: "Assistant created successfully", assistant: newAssistant });
  } catch (error) {
    console.error("Error creating assistant:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};



export const getAllAssistants = async (req, res) => {
  try {
    const assistants = await AssistantModel.find();
    res.status(200).json(assistants);
  } catch (error) {
    console.error("Error fetching assistants:", error);
    res.status(500).json({ error: "Failed to fetch assistants" });
  }
};

export const createChatPerAssistant = async (req, res) => {
  const { assistantId } = req.params; 
  const { question } = req.body;

  try {
    const openai = await getOpenAIInstance();

    const existingAssistant = await AssistantModel.findOne({ assistant_id: assistantId });
    if (!existingAssistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;

   let mostRecentMessage = await sqlAssistantChatController(question, threadId, assistantId, openai);

    if (mostRecentMessage) {
        return res.status(201).json({
            response: mostRecentMessage.content,
            thread_id: threadId,
        });
    } else {
        return res.status(500).json({ error: "Something went wrong" });
    }
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
// Function to execute queries dynamically
const executeQueries = async (queries) => {
  return new Promise((resolve) => {
    let resultsObject = {};
    let keys = Object.keys(queries);
    let values = Object.values(queries);

    const executeNextQuery = (index) => {
      if (index >= values.length) {
        // connection.end(); // Close connection after all queries
        return resolve(resultsObject);
      }

      const key = keys[index];
      const query = values[index];

      connection.query(query, (err, results) => {
        if (err) {
          console.error(`❌ Error in "${key}":`, err.message);
        } else {
          resultsObject[key] = results;
        }

        executeNextQuery(index + 1); // Move to the next query
      });
    };

    executeNextQuery(0);
  });
};
function extractQueries(response) {
  const queries = [];
  console.log("response", response);

  response.forEach(item => {
    if (item.type === 'text' && item.text.value) {
      const matches = [...item.text.value.matchAll(/"(.+?)":\s*"""\s*([\s\S]+?)\s*"""/g)];

      matches.forEach(match => {
        const queryName = match[1];
        const query = match[2].replace(/\s+/g, ' ').trim();

        queries.push({ [queryName]: query });
      });
    }
  });

  return queries;
}

async function sendQueryResultsToAssistant(results,threadId, assistantId, openai,question) {
  try {
    const userMessage = `Here are the SQL query results: ${JSON.stringify(results)}. And answer the question ${question}`;
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userMessage
    });

    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });

    let completed = false;
    while (!completed) {
      const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      if (runStatus.status === 'completed') {
        completed = true;
        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        console.log('🤖 Assistant Response:', lastMessage.content);
        return lastMessage;
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('🚨 OpenAI API Error:', error.message);
  }
}
async function chatAssistant(prompt,threadId, assistantId, openai) {

  try {
  


    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: prompt
    });

    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });

    let completed = false;
    while (!completed) {
      const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      if (runStatus.status === 'completed') {
        completed = true;
        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        console.log('🤖 Assistant Response:', lastMessage.content);
        const extractedQueries = extractQueries(lastMessage.content);
        console.log("extractedddddd", extractedQueries);
        return extractedQueries;
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('🚨 OpenAI API Errorrrrrr:', error.message);
  }
}


async function sqlAssistantChatController(question, threadId, assistantId, openai) {
  console.log("reached?");

  try {
    let prompt = question;
    console.log("prompt", prompt);

    const queries=await chatAssistant(prompt,threadId, assistantId, openai);
    let formattedQueries = queries.reduce((acc, obj) => {
      return { ...acc, ...obj };
    }, {});
    console.log("Formatted", formattedQueries);


    const results = await executeQueries(formattedQueries);
    console.log(JSON.stringify(results, null, 2));
    const agentResponse = await sendQueryResultsToAssistant(results,threadId, assistantId, openai,question);
    return agentResponse;
  } catch (error) {
    console.error('🚨 Unexpected Error:', error.message);
  }

}