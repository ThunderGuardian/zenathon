import React, { useState, useEffect } from 'react';
import { Table, Button, message, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmbedCode from '../components/EmbedCode';

const { Title } = Typography;

const MyAgents = () => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const baseURL = "http://localhost:5000";

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const response = await axios.get(`${baseURL}/api/v1/assistants/all`);
            setAgents(response.data); 
        } catch (error) {
            message.error("Failed to fetch agents. Please try again.");
            console.error("Error fetching agents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmbedClick = (record) => {
        setSelectedRecord(record);
        setIsModalVisible(true);
    };

    const columns = [
        {
            title: 'Agent Name',
            dataIndex: 'agentName',
            key: 'agentName',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text) => text || 'No description available',
        },
        {
            title: 'Model',
            dataIndex: 'userSelectedModel',
            key: 'userSelectedModel',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <>
                    <Button type="link" onClick={() => handleViewAgent(record)}>
                        Chat With Agent
                    </Button>
                    <Button type="link" onClick={() => handleEmbedClick(record)}>
                        Embed Code
                    </Button>
                </>
            ),
        },
    ];

    const handleViewAgent = (agent) => {
        navigate(`/agents/${agent.assistant_id}`);
    };
    
    return (
        <div style={{ padding: '20px' }}>
            <Title level={2}>My Agents</Title>
            <Button type="primary" style={{ marginBottom: 20 }} onClick={() => navigate('/')}>Back to Home</Button>

            {loading ? (
                <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />
            ) : (
                <Table columns={columns} dataSource={agents} rowKey="_id" />
            )}

            <EmbedCode 
                isModalVisible={isModalVisible} 
                setIsModalVisible={setIsModalVisible} 
                selectedRecord={selectedRecord} 
                baseURL={baseURL} 
            />
        </div>
    );
};

export default MyAgents;