import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import assistantRoutes from "./routers/assistantRoutes.js"

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log(" MongoDB Connected"))
    .catch(err => console.log("MongoDB Connection Error:", err));

app.use("/api/v1/assistants", assistantRoutes);

app.get("/", (req, res) => res.send(" Backend is running!"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
