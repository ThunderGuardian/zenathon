require('dotenv').config();
const mysql = require('mysql2');

const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: 'Openaikey' }); // Replace with your API key
let threadId = "ThreadId"; // Store thread ID for reuse
let assistantId = "assistantId"; // Store thread ID for reuse

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
                connection.end(); // Close connection after all queries
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
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            console.log(`🆕 Created new thread ID: ${threadId}`);
        } else {
            console.log(`🔄 Reusing thread ID: ${threadId}`);
        }

        //****Replace the userMessage wth the prompt at the end******
        const userMessage = `Here are the SQL query results: ${JSON.stringify(results)}. Find Monthly Restocking Trends.`; 
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
                console.log(extractedQueries);
                return extractedQueries;
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    } catch (error) {
        console.error('🚨 OpenAI API Error:', error.message);
    }
}


async function sqlAssistantChatController(req, res) {
    try {
        const prompt="Find Monthly Restocking Trends";
        const queries=await chatAssistant(prompt);
        // Convert array of objects into a single object
        let formattedQueries = queries.reduce((acc, obj) => {
            return { ...acc, ...obj };
        }, {});

        const results = await executeQueries(formattedQueries);

        console.log('✅ Query Results:', results);
        console.log(JSON.stringify(results, null, 2));
        const agentResponse=await sendQueryResultsToAssistant(results);

    } catch (error) {
        console.error('🚨 Unexpected Error:', error.message);
    }

}