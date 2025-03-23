import mongoose from "mongoose";

const AssistantSchema = new mongoose.Schema(
  {
    assistant_id: { type: String, required: true }, 
    agentName: { type: String, required: true },
    sqlUsername: { type: String, required: true },
    sqlPassword: { type: String, required: true },
    instructions: { type: String, required: false },
    description: { type: String },
    tables: [
      {
        tableName: { type: String, required: true },
        columns: [
          {
            columnName: { type: String, required: true },
            dataType: { 
              type: String, 
              enum: ["INT", "VARCHAR", "TEXT", "BOOLEAN", "DATE", "FLOAT"], 
              required: true 
            }, 
            columnType: { type: String, enum: ["NONE", "PRIMARY", "FOREIGN"], required: true },
          },
        ],
      },
    ],
    assistantTypes: [{ type: String }],
    userSelectedModel: { type: String, default: "gpt-4-turbo" },
  },
  { timestamps: true }
);

export default mongoose.model("Assistant", AssistantSchema);
