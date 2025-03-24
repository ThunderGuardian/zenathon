import React, { useState } from 'react';
import { Modal, Input, Button } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';

export const generateEmbedCode = (record, baseURL) => {
    return `<script src="http://localhost:572/embed-code.js" 
            data-assistant-name="${record?.name?.replace(/\s+/g, '-') || 'assistant-name'}" 
            data-assistant-id="${record?.assistant_id || 'assistant-id'}" 
            data-base-url="${baseURL}"
            async></script>`;
};

const EmbedCode = ({ isModalVisible, setIsModalVisible, selectedRecord, baseURL }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal
            title="Full Embed Code"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
        >
            {selectedRecord && (
                <>
                    <Input.TextArea
                        value={generateEmbedCode(selectedRecord, baseURL)}
                        readOnly
                        autoSize={{ minRows: 3, maxRows: 6 }}
                    />
                    <CopyToClipboard text={generateEmbedCode(selectedRecord, baseURL)} onCopy={handleCopy}>
                        <Button type="primary" style={{ marginTop: "10px", width: "100%" }}>
                            {copied ? "Copied!" : "Copy Embed Code"}
                        </Button>
                    </CopyToClipboard>
                </>
            )}
        </Modal>
    );
};

export default EmbedCode;
