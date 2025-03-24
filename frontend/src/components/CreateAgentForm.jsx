import React, { useState } from 'react';
import { Button, Form, Input, Modal, Radio, Upload, Select, message } from 'antd';
import { UploadOutlined, PlusOutlined, MinusCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import axios from "axios";

const { Option } = Select;

const CreateAgentForm = ({ visible, onCreate, onCancel }) => {
    const [form] = Form.useForm();
    const [imageType, setImageType] = useState('DEFAULT');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFormSubmit = async (values) => {
        try {
            setLoading(true);

            const formattedTables = values.tables.map(table => ({
                tableName: table.tableName,
                columns: table.columns.map(column => ({
                    columnName: column.columnName,
                    dataType: column.dataType || "VARCHAR",
                    columnType: column.columnType || "NONE"
                }))
            }));

            const payload = {
                agentName: values.agentName,
                sqlUsername: values.sqlUsername,
                sqlDbHost: values.sqlDbHost,
                sqlDbTable: values.sqlDbTable,
                sqlPassword: values.sqlPassword,
                instructions: values.instructions,
                description: values.description || "",
                photoOption: values.photoOption,
                tables: formattedTables,
                assistantTypes: values.assistantTypes || [],
                userSelectedModel: values.userSelectedModel || "gpt-4-turbo",
                userId: values.userId
            };

            await axios.post("http://localhost:5000/api/v1/assistants", payload, {
                headers: { "Content-Type": "application/json" }
            });

            message.success("Agent created successfully!");
            form.resetFields();
            onCreate();  
            onCancel();  

        } catch (error) {
            console.error("Error submitting form:", error.response?.data || error.message);
            message.error("Failed to create agent. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Create Agent"
            open={visible}
            onCancel={onCancel}
            confirmLoading={loading}
            onOk={() => {
                form
                    .validateFields()
                    .then(handleFormSubmit)
                    .catch(info => console.log('Validation Failed:', info));
            }}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    tables: [{ tableName: '', columns: [{ columnName: '', dataType: 'VARCHAR', columnType: 'NONE' }] }]
                }}
            >
                <Form.Item name="agentName" label="Agent Name" rules={[{ required: true, message: 'Please enter agent name!' }]}>
                    <Input placeholder="Enter agent name" />
                </Form.Item>

                <Form.Item name="sqlUsername" label="SQL Username" rules={[{ required: true, message: 'Please enter your SQL username!' }]}>
                    <Input placeholder="Enter SQL username" />
                </Form.Item>

                <Form.Item name="sqlDbHost" label="SQL DB Host" rules={[{ required: true, message: 'Please enter your SQL DB Host Name!' }]}>
                    <Input placeholder="Enter SQL username" />
                </Form.Item>

                <Form.Item name="sqlDbTable" label="SQL DB Table" rules={[{ required: true, message: 'Please enter your SQL DB Table!' }]}>
                    <Input placeholder="Enter SQL username" />
                </Form.Item>

                <Form.Item name="sqlPassword" label="SQL Password" rules={[{ required: true, message: 'Please enter your SQL password!' }]}>
                    <Input.Password
                        placeholder="Enter SQL password"
                        iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }}
                    />
                </Form.Item>

                <Form.Item label="Select/Generate Image" name="photoOption">
                    <Radio.Group value={imageType} onChange={(e) => setImageType(e.target.value)}>
                        <Radio value="DEFAULT">Default Avatar</Radio>
                        <Radio value="UPLOAD">Upload</Radio>
                        <Radio value="DALLE">Dall-E</Radio>
                    </Radio.Group>
                </Form.Item>

                {imageType === 'UPLOAD' && (
                    <Form.Item label="Upload Photo" name="avatar">
                        <Upload maxCount={1} accept="image/*" beforeUpload={() => false}>
                            <Button icon={<UploadOutlined />}>Upload</Button>
                        </Upload>
                    </Form.Item>
                )}

                <Form.List name="tables">
                    {(tableFields, { add: addTable, remove: removeTable }) => (
                        <>
                            {tableFields.map(({ key: tableKey, name: tableName }) => (
                                <div key={tableKey} style={{ border: '1px solid #ddd', padding: 10, marginBottom: 10, borderRadius: 5 }}>
                                    <Form.Item
                                        name={[tableName, 'tableName']}
                                        label="Table Name"
                                        rules={[{ required: true, message: 'Please enter the table name!' }]}
                                    >
                                        <Input placeholder="Enter table name" />
                                    </Form.Item>

                                    <Form.List name={[tableName, 'columns']}>
                                        {(columnFields, { add: addColumn, remove: removeColumn }) => (
                                            <>
                                                {columnFields.map(({ key: columnKey, name: columnName }) => (
                                                    <div key={columnKey} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                                        <Form.Item
                                                            name={[columnName, 'columnName']}
                                                            rules={[{ required: true, message: 'Please enter column name!' }]}
                                                            style={{ flex: 1 }}
                                                        >
                                                            <Input placeholder="Column name" />
                                                        </Form.Item>

                                                        <Form.Item
                                                            name={[columnName, 'dataType']}
                                                            rules={[{ required: true, message: 'Select data type!' }]}
                                                            style={{ width: 140 }}
                                                        >
                                                            <Select>
                                                                <Option value="INT">INT</Option>
                                                                <Option value="VARCHAR">VARCHAR</Option>
                                                                <Option value="TEXT">TEXT</Option>
                                                                <Option value="BOOLEAN">BOOLEAN</Option>
                                                                <Option value="DATE">DATE</Option>
                                                                <Option value="FLOAT">FLOAT</Option>
                                                            </Select>
                                                        </Form.Item>

                                                        <Form.Item name={[columnName, 'columnType']} noStyle>
                                                            <Select style={{ width: 140 }}>
                                                                <Option value="NONE">None</Option>
                                                                <Option value="PRIMARY">Primary Key</Option>
                                                                <Option value="FOREIGN">Foreign Key</Option>
                                                            </Select>
                                                        </Form.Item>

                                                        <Button icon={<MinusCircleOutlined />} onClick={() => removeColumn(columnName)} danger />
                                                    </div>
                                                ))}
                                                <Form.Item>
                                                    <Button type="dashed" onClick={() => addColumn()} icon={<PlusOutlined />}>Add Column</Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>

                                    <Button type="dashed" danger onClick={() => removeTable(tableName)}>Remove Table</Button>
                                </div>
                            ))}
                            <Form.Item>
                                <Button type="dashed" onClick={() => addTable()} icon={<PlusOutlined />}>Add Table</Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            </Form>
        </Modal>
    );
};

export default CreateAgentForm;
