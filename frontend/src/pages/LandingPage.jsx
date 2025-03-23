import React, { useState } from 'react';
import { Button, Row, Col, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import CreateAgentForm from '../components/CreateAgentForm';

const { Title, Paragraph } = Typography;

const LandingPage = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const navigate = useNavigate();

    const handleCreate = (values) => {
        console.log('Agent Created:', values);
        setIsModalVisible(false);
    };

    return (
        <div style={{ position: 'relative', height: '100vh', padding: '20px' }}>
            {/* Buttons Container */}
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px' }}>
                <Button type="primary" onClick={() => setIsModalVisible(true)}>
                    Create Agent
                </Button>
                <Button onClick={() => navigate('/my-agents')}>
                    View Agents
                </Button>
            </div>

            <Row justify="center" align="middle" style={{ height: '100%' }}>
                <Col span={12} style={{ textAlign: 'center' }}>
                    <Title>Welcome to Our Platform</Title>
                    <Paragraph>
                        Empower your hackathon with intelligent agents. Easily create and manage AI agents to enhance your workflow.
                    </Paragraph>
                </Col>
                <Col span={12} style={{ textAlign: 'center' }}>
                    <img src="https://plus.unsplash.com/premium_photo-1725985758251-b49c6b581d17?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="AI Visual" style={{ maxWidth: '100%', borderRadius: '10px' }} />
                </Col>
            </Row>

            <CreateAgentForm
                visible={isModalVisible}
                onCreate={handleCreate}
                onCancel={() => setIsModalVisible(false)}
            />
        </div>
    );
};

export default LandingPage;
