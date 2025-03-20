require('dotenv').config();
const mysql = require('mysql2');

const { OpenAI } = require('openai');


const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


const executeQueries = async (queries) => {
    return new Promise((resolve) => {
        let resultsObject = {};
        let keys = Object.keys(queries);
        let values = Object.values(queries);

        const executeNextQuery = (index) => {
            if (index >= values.length) {
                connection.end(); 
                return resolve(resultsObject);
            }

            const key = keys[index];
            const query = values[index];

            connection.query(query, (err, results) => {
                if (err) {
                    console.error(`Error in "${key}":`, err.message);
                } else {
                    resultsObject[key] = results;
                }

                executeNextQuery(index + 1);
            });
        };

        executeNextQuery(0);
    });
};


async function sendToAssistant(results) {
    try {
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            console.log(`🆕 Created new thread ID: ${threadId}`);
        } else {
            console.log(`🔄 Reusing thread ID: ${threadId}`);
        }

        const userMessage = `Here are the SQL query results: ${JSON.stringify(results)}. Provide me the churn rate based on this data.`;
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: userMessage
        });

        const run = await openai.beta.threads.runs.create(threadId, { assistant_id: 'asst_ToWQjryS73xnKI7AdUe3nMYV' });

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


async function assistantChatController(req, res) {

}