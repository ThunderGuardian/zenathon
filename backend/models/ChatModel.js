import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    assistant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assistant",
      required: true,
    },
    thread_id: {
      type: String,
      required: true,
    },
    messages: [messageSchema], // Stores the conversation history
  },
  { timestamps: true }
);

const ChatModel = mongoose.model("Chat", chatSchema);

export default ChatModel;
