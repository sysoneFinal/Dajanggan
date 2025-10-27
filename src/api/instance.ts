import apiClient from './apiClient';

export type NewInstance = {
  host: string;
  instance: string;   // → instanceName
  database: string;   // → dbname
  port: number | string;
  username: string;
  password: string;   // → secretRef
};

// 백엔드 DTO에 맞춰 변환
const toInstanceDto = (f: NewInstance) => ({
  host: f.host,
  instanceName: f.instance,
  dbname: f.database,
  port: Number(f.port),
  username: f.username,
  secretRef: f.password,
  // 옵션 필드 기본값(백엔드 default와 맞추거나 필요 시 조정)
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
  // 백엔드 컨트롤러: POST /api/instances  (201 Created + { id })
  const res = await apiClient.post('/instances', payload);
  return res.data as { id: number };
}

export async function fetchInstances() {
  const res = await apiClient.get('/instances');
  return res.data; // Instance[]
}