Zenathon

Project Overview

Zenathon is an AI-powered SQL agent designed to work locally, enabling users to dynamically interact with their MySQL database. This agent generates and executes SQL queries, providing real-time responses and visual analytics in a dashboard format. Additionally, an embeddable script allows easy integration of the SQL agent into external websites.

Features

Local AI Agent: Runs OpenAI's agent locally for secure processing.

Dynamic SQL Execution: Accepts user-provided data and instructions to generate and execute SQL queries.

Real-time Visualization: Converts analytical data (e.g., chunk rates, sales data) into interactive dashboards.

Embeddable Agent: A script tag allows seamless integration into any website.

Local MySQL Connection: Queries are executed within a locally hosted MySQL database.

Installation & Setup

Prerequisites

Node.js & npm

MySQL installed and running locally

OpenAI API Key (for agent processing)

Steps to Run Locally

Clone the repository:

git clone https://github.com/ThunderGuardian/zenathon
cd zenathon

Install dependencies:

npm install

Start the MySQL server and create required tables (see below for schema).

Configure the backend to connect to MySQL.

Run the backend:

npm run dev

Start the frontend:

npm run dev

Database Schema

Tables Used

Users Table

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Sales Data Table

CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255),
    quantity_sold INT,
    revenue DECIMAL(10,2),
    sale_date DATE
);

Chunks Table

CREATE TABLE chunks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chunk_name VARCHAR(255),
    chunk_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Example SQL Queries

1. Fetch Total Sales Revenue

SELECT SUM(revenue) AS total_revenue FROM sales;

2. Get Chunk Rate Analysis

SELECT chunk_name, AVG(chunk_rate) AS avg_rate FROM chunks GROUP BY chunk_name;

3. Top Selling Product

SELECT product_name, SUM(quantity_sold) AS total_sold
FROM sales
GROUP BY product_name
ORDER BY total_sold DESC
LIMIT 1;

Dashboard Example

The AI agent responds with structured data that is visualized using D3.js. Example response:

{
  "response": [
    { "label": "Jan", "value": 400 },
    { "label": "Feb", "value": 800 },
    { "label": "Mar", "value": 600 }
  ]
}

The frontend visualizes this as a line chart, bar graph, or other graphical representation.

Embeddable Code

<script src="https://yourdomain.com/sql-agent.js"></script>
<div id="sql-agent-widget"></div>
<script>
  SQLAgent.init({ apiKey: 'your-api-key' });
</script>

This allows external websites to integrate the SQL agent with minimal setup.

Future Enhancements

Support for additional databases (PostgreSQL, SQLite, etc.)

Advanced filtering and querying options

AI-powered SQL optimization suggestions

More interactive and customizable visualizations

Contributors

1. Sayeem Khan
2. Afshan Khan



