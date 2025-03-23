// ----- MODELS -----
import Assistant from "../models/assistantModel.js"; // Adjust the import path based on your project structure
import AssistantThread from "../models/assistantThreadModel.js";
import mongoose from "mongoose";
export const createAssistantInstance = async (assistant, userId, category, description, image_url, functionCalling, staticQuestions, userSelectedModel, assistantTypes,connectApps) => {
  const getAssistantType = await getAssistantIdByName(assistantTypes);
  const parsedConnectApps = connectAppsParseJSON(connectApps);

  const newAssistantInstance = new Assistant({
    assistant_id: assistant.id,
    name: assistant.name,
    model: userSelectedModel,
    instructions: assistant.instructions,
    tools: assistant.tools,
    assistantTypes: assistantTypes,
    assistantTypeId: getAssistantType._id,
    file_ids: assistant.file_ids,
    userId,
    category,
    description,
    image_url,
    functionCalling,
    static_questions: staticQuestions ? parseStaticQuestions(staticQuestions) : [],
    connectApps : parsedConnectApps,
  });

  return newAssistantInstance.save();
}

export const createAssistantInstanceV2 = async (
  assistant,
  userId,
  agentName,
  sqlUsername,
  sqlPassword,
  instructions,
  photoOption,
  assistantTypes,
  tables,
  userSelectedModel,
  description
) => {
  try {
    // Ensure correct data types
    assistantTypes = String(assistantTypes || "default_assistant_type");
    agentName = String(agentName || "default_agent_name");
    tables = Array.isArray(tables) ? tables : [];

    // Ensure `name` is properly formatted
    const assistantName = typeof assistant.name === "object" 
      ? JSON.stringify(assistant.name) 
      : String(assistant.name);

    console.log("Creating Assistant with data:", {
      assistant_id: assistant.id,
      name: assistantName,
      model: userSelectedModel,
      assistantTypes,
      tables: JSON.stringify(tables) // Debugging purposes
    });

    // Fetch Assistant Type ID
    const getAssistantType = await getAssistantIdByName(assistantTypes);

    // OpenAI file retrieval
    const openai = await getOpenAIInstance();
    const vectorStoreId = assistant?.tool_resources?.file_search?.vector_store_ids?.[0] || "";
    let attachedFileIds = [];
    if (vectorStoreId) {
      const fileIdsFromVectorStore = await getFileIdsFromVectorStore(openai, vectorStoreId);
      attachedFileIds = fileIdsFromVectorStore;
    }

    const generateInstructionText = (tables) => {
      let instructionText = `You are an AI agent that generates SQL queries for database analytics. You do not perform calculations but provide queries to fetch relevant data. The user will supply the actual data for computation. Your responses should be formatted as an array of objects, where each object represents a specific query request.\n\n`;
    
      instructionText += `The database contains the following tables:\n`;
    
      tables.forEach((tableObj) => {
        instructionText += `\n- **${tableObj.tableName} Table**:\n  This table consists of fields such as `;
        
        const columnDescriptions = tableObj.columns.map(col => `\`${col.columnName}\``).join(", ");
        instructionText += `${columnDescriptions}.\n`;
    
        instructionText += `  You can generate queries to retrieve all records, count the total number of records, or filter data using primary keys.\n`;
      });
    
      instructionText += `\nFor example, you can generate queries like:\n`;
      tables.forEach((tableObj) => {
        instructionText += `- To get all records from **${tableObj.tableName}**, use: \`SELECT * FROM ${tableObj.tableName};\`\n`;
        instructionText += `- To count records in **${tableObj.tableName}**, use: \`SELECT COUNT(*) FROM ${tableObj.tableName};\`\n`;
    
        tableObj.columns.forEach((column) => {
          if (column.columnType === "PRIMARY") {
            instructionText += `- To get a specific record from **${tableObj.tableName}** by **${column.columnName}**, use: \`SELECT * FROM ${tableObj.tableName} WHERE ${column.columnName} = ?;\`\n`;
          }
        });
      });
    
      instructionText += `\nReturn queries in the required JSON format, and ensure they align with the database schema.`;
    
      return instructionText;
    };
    
    // Example Usage
    const formattedInstructions = generateInstructionText(tables);

    const newAssistantInstance = new Assistant({
      assistant_id: assistant.id,
      vectorStoreId,
      name: assistantName,
      model: String(userSelectedModel),
      instructions: formattedInstructions,
      agentName,
      sqlUsername,
      sqlPassword,
      photoOption,
      tables,
      assistantTypes,
      userSelectedModel,
      description
    });

    return await newAssistantInstance.save();
  } catch (error) {
    console.error("Error creating assistant instance:", error);
    throw new Error("Assistant instance creation failed.");
  }
};




export const validateUserPromptForAssistant = ({ question }) => {
  const payload = { question };

  return createChatPerAssistantSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
}

export const getAssistantByAssistantID = async (assistant_id) => {
  const assistant = await Assistant.findOne({
    assistant_id,
    is_deleted: false
  });

  return assistant;
}

export const getAssistantByObjectID = async (_id) => {
  const assistant = await Assistant.findOne({
    _id,
    is_deleted: false
  });

  return assistant;
}

export const getAssistantByName = async (name) => {
  const assistant = await Assistant.findOne({
    name,
    is_deleted: false
  });

  return assistant;
}


export const updateAssistantFromPlayground = async (
  assistantId,
  localAssistant
) => {
  try {
    const openai = await getOpenAIInstance();

    const playgroundAssistant = await retrieveAssistantFromOpenAI(openai, assistantId);

    // Compare the fields with the local MongoDB model
    const fieldsToCheck = [
      "name",
      "model",
      "instructions",
      "tools",
      "file_ids",
    ];
    const needsUpdate = fieldsToCheck.some(
      (field) =>
        JSON.stringify(playgroundAssistant[field]) !==
        JSON.stringify(localAssistant[field])
    );

    if (needsUpdate) {
      // Update the local MongoDB model
      await Assistant.findOneAndUpdate(
        { assistant_id: assistantId },
        {
          name: playgroundAssistant.name,
          model: playgroundAssistant.model,
          instructions: playgroundAssistant.instructions,
          tools: playgroundAssistant.tools,
          file_ids: playgroundAssistant.file_ids,
        }
      );
    }
  } catch (error) {
    console.error(
      `Error updating assistant ${assistantId} from the OpenAI Playground: ${error.message}`
    );
  }
};

// ----- THREAD -----
export const createAssistantThreadInDb = async (
  assistantId,
  userId,
  threadId,
  question
) => {
  const newAssistantThread = new AssistantThread({
    assistant_id: assistantId,
    user: userId,
    thread_id: threadId,
    title: question.substring(0, 50),
  });
  await newAssistantThread.save();
  return newAssistantThread;
};

// service that gets single assistant thread by id
export const getAssistantThreadsByQuery = async (query) => {
  const threads = await AssistantThread.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "assistants",
        localField: "assistant_id",
        foreignField: "assistant_id",
        as: "assistant",
      },
    },
    {
      $addFields: {
        name: { $ifNull: [{ $arrayElemAt: ["$assistant.name", 0] }, null] },
        description: "$title",
      },
    },
  ]);

  return threads;
};


export const getAssistantThreadById = async (threadId) => {
  const thread = await AssistantThread.findById(threadId);

  return thread;
};

export const softDeleteAssistant = async (existingAssistant) => {
  existingAssistant.is_deleted = true;
  await existingAssistant.save();
};

export const hardDeleteAssistant = async (assistantId, existingAssistant) => {
  try {
    const openai = await getOpenAIInstance();
    const openaiAssistant = await retrieveAssistantFromOpenAI(openai, assistantId);
    
    if (openaiAssistant) {
      // Get all file IDs from different sources
      const codeInterpreterFileIds = openaiAssistant?.tool_resources?.code_interpreter?.file_ids || [];
      const vectorStoreId = openaiAssistant?.tool_resources?.file_search?.vector_store_ids?.[0] || existingAssistant?.vectorStoreId;

      let vectorStoreFileIds = [];
      if (vectorStoreId) {
        try {
          // Get file IDs from vector store before deleting it
          const vectorStoreFiles = await openai.beta.vectorStores.files.list(vectorStoreId);
          vectorStoreFileIds = vectorStoreFiles.data.map(file => file.id);
          // Delete files from vector store first
          for (const fileId of vectorStoreFileIds) {
            try {
              await openai.beta.vectorStores.files.del(vectorStoreId, fileId);
            } catch (error) {
              console.error(`Failed to delete file ${fileId} from vector store:`, error.message);
            }
          }

          // Delete the vector store itself
          await openai.beta.vectorStores.del(vectorStoreId);
        } catch (error) {
          console.error(`Failed to handle vector store ${vectorStoreId}:`, error.message);
        }
      }

      // Combine all file IDs and remove duplicates
      const allFileIds = [...new Set([
        ...codeInterpreterFileIds,
        ...vectorStoreFileIds
      ])];
      // Delete all files from OpenAI
      for (const fileId of allFileIds) {
        try {
          await openai.files.del(fileId);
        } catch (error) {
          console.error(`Failed to delete file ${fileId} from OpenAI:`, error.message);
        }
      }
      try {
        await openai.beta.assistants.del(assistantId);
        await Assistant.findByIdAndDelete(existingAssistant._id);
      } catch (error) {
        await Assistant.findByIdAndDelete(existingAssistant._id);
      }
    } else {
        await Assistant.findByIdAndDelete(existingAssistant._id);
    }
    if (openaiAssistant) {
      const findKnowledgeBaseAssistant = await KnowledgeBaseAssistants.findOne({ assistantId: assistantId });
      for (const file of findKnowledgeBaseAssistant?.file_ids) {
        const isKnowledgeBaseFileExistInSyncTable = await WorkBoardSync.findOne({ knowledgeBaseId: file.key });
        if (isKnowledgeBaseFileExistInSyncTable) {
          for (const useCase of isKnowledgeBaseFileExistInSyncTable?.useCaseData) {
            if (useCase?.assistantId === existingAssistant._id.toString()) {
              const deleteFromSyncTable = await deleteUseCaseData(file?.key, useCase?.assistantId);
            }
          }
        }
      }

      if (findKnowledgeBaseAssistant && findKnowledgeBaseAssistant !== null) {
        const deleteAssistantFromKnowledgeBase = await KnowledgeBaseAssistants.findByIdAndDelete({ _id: findKnowledgeBaseAssistant?._id });
      }
    }
  } catch (error) {
    throw error;
  }
};
//-----------Assistant-------------------
export const getSingleAssistantByIdService = async (assistant_id) => {
  return await Assistant.findOne({ assistant_id }).lean().populate([
    {
      path: "userId",
      select: "fname lname email _id"
    }
  ]);
};

export const getSingleAssistantByIdWithUserDetailsService = async (assistant_id) => {
  return await Assistant.findOne({ assistant_id }).populate('userId','fname lname').lean();
};
export const getAssistantByIdOrAssistantIdService = async (assistant_id) => {
  const assistantId = new mongoose.Types.ObjectId(assistant_id)
  return await Assistant.findOne({ _id:  assistantId});
};

// Function to extract the question part
export const extractQuestion =(text)=>{
  const questionRegex = /Based on the following documents, answer the question: (.*)\n\nDocuments:/;
  const match = text.match(questionRegex);
  return match ? match[1] : null;
}
const decodeLink = (encodedLink)=>{
  return Buffer.from(encodedLink, 'base64').toString('utf-8');  // Decode the base64 link
}

export const updateChatPrompts = (messages) => {
  const questionRegex = /Based on the following documents, answer the question:([\s\S]*?)\n\nDocuments:/;

  return messages.map((message) => {
    const matchResult = message.chatPrompt.match(questionRegex);
    if (matchResult) {
      let question = matchResult[1]; // Extract the question part
      const encodedLinkMatch = question.match(/\[ENCODED_LINK:(.*)\]/);
      if (encodedLinkMatch && encodedLinkMatch[1]) {
        const decodedLink = decodeLink(encodedLinkMatch[1]);
        question = question.replace(encodedLinkMatch[0], decodedLink); 
      }
      question = question.replace(/,ignore if there is any 'ENCODED_LINK' found in the question and do not try to access ENCODED_LINK./i, '').trim();
      message.chatPrompt = question;
    }

    return message;
  });
};
export const connectAppsParseJSON = (connectApps)=>{
  const defaultValue = []
  if (!connectApps || connectApps === "undefined") return defaultValue;
  try {
    return JSON.parse(connectApps);
  } catch (error) {
    console.error("Invalid JSON:", connectApps, error);
    return defaultValue;
  }
}

export const deleteFilesVectorStore = async (openai,vectorStoreId,opeanaiFileId)=>{
  return await openai.beta.vectorStores.files.del(
    vectorStoreId,
    opeanaiFileId
  );
};
export const updateAssistantFileIds = async (assistantId,fileIds) =>{
  return await Assistant.updateOne({assistant_id:assistantId},{file_ids : fileIds});
};

export const extractFluxPrompt = (text) => {
  const match = text?.chatPrompt?.match(/@image\s+(.*?)\s+Description:/);
  return {
    botMessage:text.botMessage,
    chatPrompt: match ? match[1] : text?.chatPrompt,
    msg_id:text?.msg_id,
    created_at: text?.created_at
  }
};

/**
 * Adds a message with its ID and code interpreter output to an assistant thread.
 * @param {string} threadId - The ID of the thread.
 * @param {string} msgId - The ID of the message.
 * @param {string|null} codeInterpreterOutput - The code interpreter output (null if none).
 * @returns {Promise<Object>} The updated AssistantThread document.
 * @throws {Error} If the thread is not found or an error occurs during saving.
 */
export const addMessageToThread = async (
  threadId,
  msgId,
  codeInterpreterOutput
) => {
  try {
    const assistantThread = await AssistantThread.findOne({
      thread_id: threadId,
    });
    if (!assistantThread) {
      throw new Error(`AssistantThread not found for thread_id: ${threadId}`);
    }

    const messageData = {
      msg_id: msgId,
      codeInterpreterOutput: codeInterpreterOutput || null,
    };

    assistantThread.messages.push(messageData);
    await assistantThread.save();
    return assistantThread;
  } catch (error) {
    throw error;
  }
};
