import React, { useState } from 'react';
import { Button, Form, Input, Modal, Radio, Upload, Select } from 'antd';
import { UploadOutlined, PlusOutlined, MinusCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

const CreateAgentForm = ({ visible, onCreate, onCancel }) => {
    const [form] = Form.useForm();
    const [imageType, setImageType] = useState('DEFAULT');
    const [passwordVisible, setPasswordVisible] = useState(false);

    return (
        <Modal
            title="Create Agent"
            open={visible}
            onCancel={onCancel}
            onOk={() => {
                form
                    .validateFields()
                    .then(values => {
                        const formattedTables = values.tables.map(table => ({
                            tableName: table.tableName,
                            columns: table.columns.map(column => ({
                                columnName: column.columnName,
                                columnType: column.columnType || 'NONE'
                            }))
                        }));

                        const payload = {
                            ...values,
                            tables: formattedTables,
                            avatar: imageType === 'UPLOAD' ? values.avatar : undefined,
                        };

                        onCreate(payload);
                        form.resetFields();
                    })
                    .catch(info => {
                        console.log('Validation Failed:', info);
                    });
            }}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    tables: [{ tableName: '', columns: [{ columnName: '', columnType: 'PRIMARY' }] }]
                }}
            >
                <Form.Item
                    name="agentName"
                    label="Agent Name"
                    rules={[{ required: true, message: 'Please enter agent name!' }]}
                >
                    <Input placeholder="Enter agent name" />
                </Form.Item>

                <Form.Item
                    label="SQL Username"
                    name="sqlUsername"
                    rules={[{ required: true, message: 'Please enter your SQL username!' }]}
                >
                    <Input placeholder="Enter SQL username" />
                </Form.Item>

                <Form.Item
                    label="SQL Password"
                    name="sqlPassword"
                    rules={[{ required: true, message: 'Please enter your SQL password!' }]}
                >
                    <Input.Password
                        placeholder="Enter SQL password"
                        iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                        visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }}
                    />
                </Form.Item>

                <Form.Item label="Select/Generate Image" name="photoOption">
                    <Radio.Group
                        value={imageType}
                        onChange={(e) => setImageType(e.target.value)}
                    >
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

                <Form.Item label="Instructions" name="instructions" rules={[{ required: true }]}>
                    <TextArea rows={3} placeholder="You are a helpful Agent." />
                </Form.Item>

                <Form.List name="tables">
                    {(tableFields, { add: addTable, remove: removeTable }) => (
                        <>
                            {tableFields.map(({ key: tableKey, name: tableName, ...restTable }) => (
                                <div key={tableKey} style={{ border: '1px solid #ddd', padding: 10, marginBottom: 10 }}>
                                    <Form.Item
                                        {...restTable}
                                        name={[tableName, 'tableName']}
                                        label="Table Name"
                                        rules={[{ required: true, message: 'Please enter the table name!' }]}
                                    >
                                        <Input placeholder="Enter table name" />
                                    </Form.Item>

                                    <Form.List name={[tableName, 'columns']}>
                                        {(columnFields, { add: addColumn, remove: removeColumn }) => (
                                            <>
                                                {columnFields.map(({ key: columnKey, name: columnName, ...restColumn }) => (
                                                    <Form.Item key={columnKey} {...restColumn} label={`Column ${columnKey + 1}`}>
                                                        <Input.Group compact>
                                                            <Form.Item
                                                                name={[columnName, 'columnName']}
                                                                noStyle
                                                                rules={[{ required: true, message: 'Please enter column name!' }]}
                                                            >
                                                                <Input style={{ width: '60%' }} placeholder="Column name" />
                                                            </Form.Item>
                                                            <Form.Item name={[columnName, 'columnType']} noStyle>
                                                                <Select style={{ width: '30%' }}>
                                                                    <Option value="NONE">None</Option>
                                                                    <Option value="PRIMARY">Primary Key</Option>
                                                                    <Option value="FOREIGN">Foreign Key</Option>
                                                                </Select>
                                                            </Form.Item>
                                                            <Button icon={<MinusCircleOutlined />} onClick={() => removeColumn(columnName)} danger />
                                                        </Input.Group>
                                                    </Form.Item>
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