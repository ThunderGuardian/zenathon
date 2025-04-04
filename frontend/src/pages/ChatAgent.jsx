import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Card, Input, Button, Avatar, Typography, List, Spin, Collapse, Select, message
} from "antd";
import axios from "axios";
import {
  UserOutlined, RobotOutlined
} from "@ant-design/icons";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

import "./chat.css"; // Ensure this is properly styled

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Option } = Select;
const COLORS = ["#8884d8", "#82ca9d", "#ffc658"];

const ChatAgent = () => {
  const { assistantId } = useParams();
  const { threadID } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState("bar");
  const chatContainerRef = useRef(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
  
    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
  
    try {
      const response = await axios.post(
        `http://localhost:5000/api/v1/assistants/${assistantId}/chat`,
        { question: input,
            threadID: threadID || null,
        },
        { headers: { "Content-Type": "application/json" } }
      );
  
      console.log("API Response:EEEEEEE", response.data.thread_id);
      const newThreadID = response.data.thread_id;

      // Update URL with new thread ID without refreshing the page
      window.history.pushState(null, "", `/agents/${assistantId}/${newThreadID}`);
  
      let botResponse = "No response received";
      let visualization = null;
  
      if (Array.isArray(response.data.response) && response.data.response.length > 0) {
        const firstMessage = response.data.response[0];
        if (firstMessage.type === "text" && firstMessage.text?.value) {
          const rawText = firstMessage.text.value.trim();
  
          // Try to convert JS-like object to real JS object
          if (rawText.startsWith("{") && rawText.includes("data")) {
            try {
              const parsed = new Function(`return (${rawText})`)(); // Safe-ish for trusted content
              botResponse = parsed.insight || "Here's a visualization";
              visualization = parsed;
            } catch (err) {
              console.error("Error parsing chart object:", err);
              botResponse = rawText; // fallback
            }
          } else {
            botResponse = rawText;
          }
        }
      }
  
      setMessages([...newMessages, { sender: "bot", text: botResponse, visualization }]);
    } catch (error) {
      console.error("Chat API Error:", error);
      message.error("Failed to get a response. Try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const renderChart = (data) => {
    if (!data?.data) return null;

    switch (chartType) {
      case "line":
        return (
          <LineChart data={data.data} margin={{ top: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        );
      case "pie":
        return (
          <PieChart>
            <Pie
              data={data.data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case "bar":
      default:
        return (
          <BarChart data={data.data} margin={{ top: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#1890ff" />
          </BarChart>
        );
    }
  };

  return (
    <div className="container">
      <Card className="chatCard">
        <Title level={3} className="title">Chat with Assistant</Title>

        <div ref={chatContainerRef} className="messageContainer">
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item className={msg.sender === "user" ? "userMessage" : "botMessage"}>
                <Avatar icon={msg.sender === "user" ? <UserOutlined /> : <RobotOutlined />} className="avatar" />
                <div className="messageBubble">
                  {msg.text}
                  {msg.visualization && (
                    <Collapse className="vizCollapse">
                      <Panel header="📊 View Suggested Visualization" key="1">
                        <div className="visualizationContainer">
                          <Paragraph strong>{msg.visualization.title}</Paragraph>
                          <Paragraph>{msg.visualization.insight}</Paragraph>
                          <div className="chartSelector">
                            <Select value={chartType} onChange={setChartType} style={{ width: 120, marginBottom: 10 }}>
                              <Option value="bar">Bar</Option>
                              <Option value="line">Line</Option>
                              <Option value="pie">Pie</Option>
                            </Select>
                          </div>
                          <div className="chartWrapper">
                            <ResponsiveContainer width="100%" height={300}>
                              {renderChart(msg.visualization)}
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </Panel>
                    </Collapse>
                  )}
                </div>
              </List.Item>
            )}
          />
          {loading && (
            <div className="loadingIndicator">
              <Spin size="small" /> <span className="typingText">AI is typing...</span>
            </div>
          )}
        </div>

        <div className="inputContainer">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask something..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="textArea"
          />
          <Button type="primary" className="sendButton" onClick={handleSendMessage} disabled={loading}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChatAgent;
