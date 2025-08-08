// Simple dev-only logger. Logs only when REACT_APP_BUILD_ENV is 'development'.

const isDevelopmentEnv = (() => {
  try {
    // These are inlined by webpack DefinePlugin / CRA during build
    const be = (process as any)?.env?.REACT_APP_BUILD_ENV;
    return be === 'development';
  } catch {
    return false;
  }
})();

type LogFn = (message?: any, ...optionalParams: any[]) => void;

function makeLogger(fn: LogFn): LogFn {
  return (...args: any[]) => {
    if (isDevelopmentEnv) {
      try {
        fn(...args);
      } catch {
        // ignore
      }
    }
  };
}

export const logger = {
  debug: makeLogger(console.debug ? console.debug.bind(console) : console.log.bind(console)),
  info: makeLogger(console.info ? console.info.bind(console) : console.log.bind(console)),
  warn: makeLogger(console.warn.bind(console)),
  error: makeLogger(console.error.bind(console)),
};

export default logger;


