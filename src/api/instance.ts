// 작성자: 김민서

import apiClient from './apiClient';

export type NewInstance = {
  host: string;
  instance: string;   
  database: string;   
  port: number | string;
  username: string;
  password: string;   
};

// 백엔드 DTO에 맞춰 변환
const toInstanceDto = (f: NewInstance) => ({
  host: f.host,
  instanceName: f.instance,
  dbname: f.database,
  port: Number(f.port),
  username: f.username,
  secretRef: f.password,
  sslmode: 'require',
  isEnabled: true,
  slackEnabled: false,
  slackChannel: undefined,
  slackMention: undefined,
  slackWebhookUrl: undefined,
  collectionInterval: 5,
});

export async function registerInstance(form: NewInstance) {
  const payload = toInstanceDto(form);
  // 백엔드 컨트롤러: POST /api/instances  
  const res = await apiClient.post('/instances', payload);
  return res.data as { id: number };
}

export async function fetchInstances() {
  const res = await apiClient.get('/instances');
  return res.data;
}