import React, { useState } from 'react';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import agentGif from '../assets/agent.gif';
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
        <div style={{
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #e8f0ff, #ffffff)',
            position: 'relative',
        }}>
            {/* Glowing Background Circles */}
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'rgba(114, 46, 209, 0.2)',
                borderRadius: '50%',
                top: '10%',
                left: '5%',
                filter: 'blur(100px)',
                zIndex: 0,
            }} />
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                background: 'rgba(255, 214, 102, 0.25)',
                borderRadius: '50%',
                bottom: '10%',
                right: '10%',
                filter: 'blur(80px)',
                zIndex: 0,
            }} />

            {/* Main Content Card */}
            <div style={{
                maxWidth: '1000px',
                width: '100%',
                textAlign: 'center',
                padding: '40px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.7)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                zIndex: 1,
            }}>
                <div style={{
                    marginBottom: '40px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <img
                        src={agentGif}
                        alt="SQL Agent Animation"
                        style={{
                            width: '200px',
                            height: '200px',
                            imageRendering: 'pixelated',
                            borderRadius: '12px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
                        }}
                    />
                </div>

                <Title style={{
                    fontSize: '2.8rem',
                    fontWeight: 800,
                    color: '#1f1f1f',
                    marginBottom: 16
                }}>
                    Build Your Own SQL Agent
                </Title>
                <Paragraph style={{
                    fontSize: '1.2rem',
                    color: '#595959',
                    maxWidth: '600px',
                    margin: '0 auto 32px auto',
                }}>
                    Craft intelligent SQL-powered agents to query, automate, and supercharge your data workflows with ease.
                </Paragraph>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    flexWrap: 'wrap'
                }}>
                    <Button
                        type="primary"
                        size="large"
                        shape="round"
                        onClick={() => setIsModalVisible(true)}
                        style={{
                            background: '#722ed1',
                            borderColor: '#722ed1',
                            fontWeight: 600,
                            padding: '0 32px',
                        }}
                    >
                        🛠️ Create Agent
                    </Button>

                    <Button
                        type="default"
                        size="large"
                        shape="round"
                        onClick={() => navigate('/my-agents')}
                        style={{
                            background: '#f5f5f5',
                            border: '1px solid #d9d9d9',
                            color: '#262626',
                            fontWeight: 600,
                            padding: '0 32px'
                        }}
                    >
                        📋 View Agents
                    </Button>
                </div>
            </div>

            <CreateAgentForm
                visible={isModalVisible}
                onCreate={handleCreate}
                onCancel={() => setIsModalVisible(false)}
            />
        </div>
    );
};

export default LandingPage;