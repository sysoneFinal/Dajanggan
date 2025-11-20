export const intervalToMs = (interval: string): number => {
 // console.log('intervalToMs 호출됨:', interval); // 디버깅용
  
  if (!interval) return 0;
  
  const match = interval.match(/^(\d+)([msh])$/);
  if (!match) {
    console.log('매칭 실패:', interval);
    return 0;
  }
  
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  
  let result = 0;
  switch (unit) {
    case 's': result = num * 1000; break;
    case 'm': result = num * 60 * 1000; break;
    case 'h': result = num * 60 * 60 * 1000; break;
    default: result = 0;
  }
  
  //console.log('변환 결과:', interval, '->', result);
  return result;
};