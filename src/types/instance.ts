export interface Instance {
  instanceId: number;
  instanceName: string;
  host?: string;
  dbname?: string;
  port?: number;
  username?: string;
  isEnabled?: boolean;
  status?: "normal" | "warning";
}
