interface PendoSDK {
  initialize: (config: {
    visitor: { id: string };
    account?: { id: string };
    recording?: { enabled: boolean; autoStart: boolean };
    disableSessionRecording?: boolean;
    additionalApiKeys?: string[];
  }) => void;
  track: (event: string, metadata?: Record<string, unknown>) => void;
  identify: (config: { visitor: { id: string }; account?: { id: string } }) => void;
  pageLoad: () => void;
  flushNow?: () => void;
  isReady?: () => boolean;
  getVisitorId?: () => string;
  getAccountId?: () => string;
  getVersion?: () => string;
  recording?: { start?: () => void; stop?: () => void };
  validateEnvironment?: () => unknown;
  validateInstall?: () => unknown;
  VERSION?: string;
}

declare let pendo: PendoSDK;

interface Window {
  pendo: PendoSDK;
}