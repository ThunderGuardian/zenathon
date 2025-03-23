import { getOpenAIInstance } from "../services/openai.js";
import AssistantModel from "../models/AssistantModel.js";
import ChatModel from "../models/ChatModel.js";
import { StatusCodes } from "http-status-codes";

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
      instructions,
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
  const { assistantId } = req.params;  // Get assistantId from URL
  const { question } = req.body; 
  console.log("Received question:", question);

  try {
      const openai = await getOpenAIInstance();

      const existingAssistant = await AssistantModel.findOne({ assistant_id: assistantId });
      if (!existingAssistant) {
          return res.status(404).json({ error: "Assistant not found" });
      }

      const thread = await openai.beta.threads.create();
      const threadId = thread.id;

      await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: question,
      });

      const run = await openai.beta.threads.runs.create(threadId, {
          assistant_id: assistantId,
      });

      let runId = run.id;
      let retrieveRun = await openai.beta.threads.runs.retrieve(threadId, runId);

      while (retrieveRun.status !== "completed") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          retrieveRun = await openai.beta.threads.runs.retrieve(threadId, runId);

          if (["failed", "cancelled", "expired"].includes(retrieveRun.status)) {
              return res.status(500).json({ error: "AI response failed. Please try again." });
          }
      }

      const threadMessages = await openai.beta.threads.messages.list(threadId);
      const mostRecentMessage = threadMessages.data.find(
          (msg) => msg.run_id === runId && msg.role === "assistant"
      );

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
