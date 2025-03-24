import { getOpenAIInstance } from "../services/openai.js";
import AssistantModel from "../models/AssistantModel.js";
import ChatModel from "../models/ChatModel.js";
import { StatusCodes } from "http-status-codes";
import mysql from "mysql2"
import OpenAI from "openai";
import dotenv from "dotenv";
// const generateInstructions = (schemaDescription) => {
//   return `
// You are an AI assistant specializing in SQL query generation for database analytics. 
// Your task is to generate SQL queries based on user prompts. Do not perform calculations; instead, provide the appropriate SQL query to fetch the required data.

// Always return your responses as an array of objects like this:
// [
//   {"query_description": "SQL Query"},
//   {"another_query": "SQL Query"}
// ]

// You should provide only the SQL query needed to extract the relevant data, without performing any calculations yourself.

// Here is the database schema:
// ${schemaDescription}

// Use this schema to generate appropriate SQL queries in response to user queries.
//   `;
// };

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
    // instructions = generateInstructions(formattedSchema);
    instructions = `
You are an agent which first provides SQL queries for user prompts based on the MySQL database schema provided to you below. Those SQL queries later will be executed, and all the data will be provided to you. Now you should precisely and accurately process the data and provide what the user wants.

You should provide the SQL queries in this format so you can provide more than one query to be executed:
queries = [ { "Query Description": "<The query>" }, ];

The data will also be provided in this format to you:
result = [ { "Query Description": "<The query result>" }, ];

You should be accurate and precise since each record is valuable while processing.

Following is the database schema:

1. Customer Table: customers
   - CustomerID: An integer that serves as the Primary Key. It uniquely identifies each customer.
   - FirstName: A string (VARCHAR) with a maximum length of 50 characters to store the customer's first name.
   - LastName: A string (VARCHAR) with a maximum length of 50 characters to store the customer's last name.
   - Email: A string (VARCHAR) with a maximum length of 100 characters to store the customer's email address.
   - PhoneNumber: A string (VARCHAR) with a maximum length of 15 characters to store the customer's phone number.
   - Address: A string (VARCHAR) with a maximum length of 255 characters to store the customer's address.

2. Product Table: products
   - ProductID: An integer that serves as the Primary Key. It uniquely identifies each product.
   - ProductName: A string (VARCHAR) with a maximum length of 100 characters to describe the product's name.
   - Description: A text field to provide details about the product.
   - Price: A decimal value representing the price of the product.
   - StockQuantity: An integer indicating how many units are available in stock.

3. Invoice Table: invoices
   - InvoiceID: An integer that serves as the Primary Key. It uniquely identifies each invoice transaction.
   - CustomerID: Data Type: Integer. Purpose: Links an invoice to a specific customer who made a purchase.
   - ProductID: Data Type: Integer. References: The ProductID column in the Product table.
   - InvoiceDate: Data Type: DateTime.
   - Quantity: Data Type: Integer.
   - TotalAmount: Data Type: Decimal.

4. Inventory Restocking Table: inventory_restock
   - RestockID (Primary Key, INT, AUTO_INCREMENT): Uniquely identifies each restocking event.
   - ProductID (Foreign Key, INT → products.ProductID): Indicates which product was restocked.
   - RestockDate (DATETIME): The date and time when restocking occurred.
   - QuantityAdded (INT): The number of units added to stock.
   - Supplier (VARCHAR(100)): Name of the supplier who provided the stock.

Relationships:
- Customer and Invoice Relationship: Each entry in the Invoice table is associated with one entry in the Customer table through its foreign key (CustomerID). This establishes which customer made which purchase(s).
- Product and Invoice Relationship: Each entry in an Invoice can be linked back to one or more entries in Products via its foreign key (ProductID). This indicates what products were included within any given transaction recorded under an invoice.
- Product and Inventory Restocking Relationship: Each entry in the Inventory Restocking table is associated with one entry in the Products table through its foreign key (ProductID). This records when a product was restocked, how many units were added, and from which supplier.
`;


    const openai = await getOpenAIInstance();

    const openAIAssistant = await openai.beta.assistants.create({
      name: agentName,
      instructions: instructions,
      model: userSelectedModel,
    });

    console.log("OPPPP", openAIAssistant);


    if (!openAIAssistant?.id) {
      return res.status(500).json({ error: "Failed to create OpenAI Assistant" });
    }

    const assistantId = openAIAssistant.id;

    console.log("inn", instructions);


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
// 
    // const thread = await openai.beta.threads.create();
    const threadId = "thread_45ucgnRFAl1PstMSOvKy2PLC";
    console.log("Thread ID", threadId);

   let mostRecentMessage = await sqlAssistantChatController(question);

    // await openai.beta.threads.messages.create(threadId, {
    //     role: "user",
    //     content: question,
    // });

    // const run = await openai.beta.threads.runs.create(threadId, {
    //     assistant_id: assistantId,
    // });

    // let runId = run.id;
    // let retrieveRun = await openai.beta.threads.runs.retrieve(threadId, runId);

    // while (retrieveRun.status !== "completed") {
    //     await new Promise((resolve) => setTimeout(resolve, 1000));
    //     retrieveRun = await openai.beta.threads.runs.retrieve(threadId, runId);

    //     if (["failed", "cancelled", "expired"].includes(retrieveRun.status)) {
    //         return res.status(500).json({ error: "AI response failed. Please try again." });
    //     }
    // }

    // const threadMessages = await openai.beta.threads.messages.list(threadId);
    // const mostRecentMessage = threadMessages.data.find(
    //     (msg) => msg.run_id === runId && msg.role === "assistant"
    // );

    if (mostRecentMessage) {
      console.log("MOSSSSSSSSSSS", mostRecentMessage);
      
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

const openai = new OpenAI({ apiKey: ""})
let threadId = "thread_45ucgnRFAl1PstMSOvKy2PLC"; // Store thread ID for reuse
let assistantId = "assistantId"; // Store thread ID for reuse

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "MySQL@12345",
  database: "zenathon"
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

async function sendQueryResultsToAssistant(results) {
  try {

      // const thread = await openai.beta.threads.create();
      // threadId = thread.id;
      // console.log(`🆕 Created new thread ID: ${threadId}`);


    //****Replace the userMessage wth the prompt at the end******
    const userMessage = `Here are the SQL query results: ${JSON.stringify(results)}. Find Monthly Restocking Trends.`;
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userMessage
    });

    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: "asst_bshLvBNMEx9bOMx1ZoGVua7U" });

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
async function chatAssistant(prompt) {

  try {
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      console.log(`🆕 Created new thread ID: ${threadId}`);
    } else {
      console.log(`🔄 Reusing thread ID: ${threadId}`);
    }


    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: prompt
    });

    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: "asst_bshLvBNMEx9bOMx1ZoGVua7U" });

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


async function sqlAssistantChatController(question) {
  console.log("reached?");

  try {
    let prompt = question;
    console.log("prompt", prompt);

    const queries=await chatAssistant(prompt);
    // const queries = [
    //   {
    //     "Sales Data Analysis": "SELECT p.ProductID, p.ProductName, SUM(i.Quantity) AS TotalSold, COUNT(i.InvoiceID) AS SalesFrequency FROM products p JOIN invoices i ON p.ProductID = i.ProductID GROUP BY p.ProductID ORDER BY TotalSold DESC;"
    //   },
    //   {
    //     "Restocking Frequency": "SELECT p.ProductID, p.ProductName, SUM(ir.QuantityAdded) AS TotalRestocked, COUNT(ir.RestockID) AS RestockFrequency FROM products p JOIN inventory_restock ir ON p.ProductID = ir.ProductID GROUP BY p.ProductID ORDER BY TotalRestocked DESC;"
    //   },
    // ];
    // Convert array of objects into a single object
    let formattedQueries = queries.reduce((acc, obj) => {
      return { ...acc, ...obj };
    }, {});
    console.log("Formatted", formattedQueries);


    const results = await executeQueries(formattedQueries);

    console.log('✅ Query Results:', results);
    console.log(JSON.stringify(results, null, 2));
    const agentResponse = await sendQueryResultsToAssistant(results);
    return agentResponse;
  } catch (error) {
    console.error('🚨 Unexpected Error:', error.message);
  }

}