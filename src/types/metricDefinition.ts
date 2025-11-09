/**
 * 백엔드 /metric/list 응답 DTO 타입 정의
 */
export interface MetricDefinition {
  name: string;                
  tableName: string;           
  columnName: string;          
  category: string;            
  level: string;               
  unit: string;               
  description: string;         
  availableChart: string[];    
  defaultChartType: string;   
}