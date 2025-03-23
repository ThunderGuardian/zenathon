import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, Input, Button, Avatar, Typography, List, Spin, message } from "antd";
import axios from "axios";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";
import "./chat.css"
const { Title } = Typography;
const { TextArea } = Input;

const ChatAgent = () => {
    const { assistantId } = useParams();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
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
                { question: input },
                { headers: { "Content-Type": "application/json" } }
            );

            console.log("API Response:", response.data);

            let botResponse = "No response received";

            if (Array.isArray(response.data.response) && response.data.response.length > 0) {
                const firstMessage = response.data.response[0];
                if (firstMessage.type === "text" && firstMessage.text && firstMessage.text.value) {
                    botResponse = firstMessage.text.value;
                }
            }

            setMessages([...newMessages, { sender: "bot", text: botResponse }]);
        } catch (error) {
            console.error("Chat API Error:", error);
            message.error("Failed to get a response. Try again.");
        } finally {
            setLoading(false);
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
                            <div className="messageBubble">{msg.text}</div>
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
