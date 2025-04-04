import { getOpenAIInstance } from "../services/openai.js";
import AssistantModel from "../models/AssistantModel.js";
import ChatModel from "../models/ChatModel.js";
import { StatusCodes } from "http-status-codes";
import mysql from "mysql2"
import OpenAI from "openai";
import dotenv from "dotenv";
const generateInstructions = (schemaDescription) => {
  return `
You are a agent which first provides sql queries for user prompts based on the mysql ddatabase schema provided to you below. 
Those sql queries later will be executed all the data will be provided to you. Now you should precisely and accurately process the data and provide what the user wants. 
You should provide the sql queries in the following no matter what format so you can provide more then one query to be excuted:
queries = [{ "Query Description": "<The query>" }];
The data will also be provided in this format to you:
result = [{ "Query Description": "<The query result>" }];
You should be accurate and precise since each record is valuable while processing.
Following is the data base schema:
1. Customer Table: customers
Columns:
CustomerID: An integer that serves as the Primary Key. It uniquely identifies each customer.
FirstName: A string (VARCHAR) with a maximum length of 50 characters to store the customer's first name.
LastName: A string (VARCHAR) with a maximum length of 50 characters to store the customer's last name.
Email: A string (VARCHAR) with a maximum length of 100 characters to store the customer's email address.
PhoneNumber: A string (VARCHAR) with a maximum length of 15 characters to store the customer's phone number.
Address: A string (VARCHAR) with a maximum length of 255 characters to store the customer's address.

2. Product Table: products
Columns:
ProductID: An integer that serves as the Primary Key. It uniquely identifies each product.
ProductName: A string (VARCHAR) with a maximum length of 100 characters to describe the product's name.
Description: A text field to provide details about the product.
Price: A decimal value representing the price of the product.
StockQuantity: An integer indicating how many units are available in stock.

3. Invoice Table: invoices
Columns:
InvoiceID: An integer that serves as the Primary Key. It uniquely identifies each invoice transaction.
Foreign Keys:
 CustomerID: Data Type: Integerrpose: Links an invoice to a specific customer who made a purchase
 ProductID:Data Type: Integerferences: The ProductID column in the Product table
Additional Columns:
 InvoiceDate: Data Type: DateTime
 Quantity: Data Type: Integer
 TotalAmount: Data Type: Decimal

4. Inventory Restocking Table: inventory_restock
RestockID (Primary Key, INT, AUTO_INCREMENT): Uniquely identifies each restocking event.
ProductID (Foreign Key, INT → products.ProductID): Indicates which product was restocked.
RestockDate (DATETIME): The date and time when restocking occurred.
QuantityAdded (INT): The number of units added to stock.
Supplier (VARCHAR(100)): Name of the supplier who provided the stock.

Relationships:
Customer and Invoice Relationship:
Each entry in the Invoice table is associated with one entry in the Customer table through its foreign key (CustomerID). This establishes which customer made which purchase(s).

Product and Invoice Relationship:
Each entry in an Invoice can be linked back to one or more entries in Products via its foreign key (ProductID). This indicates what products were included within any given transaction recorded under invoice,

Product and Inventory Restocking Relationship:
Each entry in the Inventory Restocking table is associated with one entry in the Products table through its foreign key (ProductID). This records when a product was restocked, how many units were added, and from which supplier.
Once you have the sql query data you will need to only send its insights in the following example format so an object directly wihtout any other text or formatting and the foloowing is just an example so just take the format nothing else. Just return a literal object please:
{
        title: "Can be the prompt",
        insight: "<The insights in text format>",
        data: [
          { label: "Jan", value: 400 },
          { label: "Feb", value: 300 },
          { label: "Mar", value: 500 },
          { label: "Apr", value: 600 },
          { label: "May", value: 700 },
          { label: "Jun", value: 800 },
        ],
};  
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
  const { question,threadID } = req.body;
  console.log("threadId", threadID);

  try {
    const openai = await getOpenAIInstance();

    const existingAssistant = await AssistantModel.findOne({ assistant_id: assistantId });
    if (!existingAssistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }
    let threadId="";
    if(threadID==null){
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }else{
      threadId=threadID;
    }

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

function extractQueries(response) {
  const queries = [];
  console.log("response", response);

  response.forEach(item => {
    if (item.type === 'text' && item.text.value) {
      let text = item.text.value;

      // If it's inside a code block like ```sql ... ```
      const codeBlockMatch = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
      if (codeBlockMatch) {
        text = codeBlockMatch[1];
      }

      // Extract queries = [{ ... }] part
      const queriesMatch = text.match(/queries\s*=\s*(\[[\s\S]*?\]);?/);
      if (queriesMatch) {
        try {
          // Safely parse the JSON-like string
          const jsonString = queriesMatch[1]
            .replace(/([{,])\s*(\w+)\s*:/g, '$1 "$2":') // Ensure keys are quoted
            .replace(/;\s*$/, ''); // Remove ending semicolon if any

          const queryArray = JSON.parse(jsonString);

          queryArray.forEach(queryObj => {
            const [key, value] = Object.entries(queryObj)[0];
            const query = value.replace(/\s+/g, ' ').trim();
            queries.push({ [key]: query });
          });
        } catch (err) {
          console.error("❌ Error parsing queries:", err.message);
        }
      }
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
        console.log("Extracted Queries", extractedQueries);
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
    console.log("AgentResponse", agentResponse);
    return agentResponse;
  } catch (error) {
    console.error('🚨 Unexpected Error:', error.message);
  }

}// Function to execute queries dynamically
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