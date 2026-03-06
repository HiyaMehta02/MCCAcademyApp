import { Platform } from 'react-native';

const LOCAL_IP = '192.168.68.60'; 

export const BASE_URL = Platform.select({
  ios: 'http://localhost:3000',       
  android: 'http://10.0.2.2:3000',    
  default: `http://10.0.2.2:3000`, 
});
