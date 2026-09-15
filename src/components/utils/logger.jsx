// Logger estruturado para monitoramento e debugging

export const logger = {
  error: (message, context = {}) => {
    const logData = {
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      user: window.currentUser?.email || 'unknown',
      page: window.location.pathname,
      ...context
    };
    
    console.error('[ERROR]', message, logData);
    
    // Em produção, enviar para serviço de monitoramento
    // if (process.env.NODE_ENV === 'production') {
    //   sendToMonitoring(logData);
    // }
    
    return logData;
  },
  
  warn: (message, context = {}) => {
    const logData = {
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      ...context
    };
    
    console.warn('[WARN]', message, logData);
    return logData;
  },
  
  info: (message, context = {}) => {
    const logData = {
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...context
    };
    
    console.log('[INFO]', message, logData);
    return logData;
  },
  
  debug: (message, context = {}) => {
    if (import.meta.env.DEV) {
      console.debug('[DEBUG]', message, context);
    }
  }
};

export default logger;