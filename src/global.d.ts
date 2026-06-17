interface PendoSDK {
  initialize: (config: {
    visitor: { id: string };
    account?: { id: string };
    recording?: { enabled: boolean; autoStart: boolean };
  }) => void;
  track: (event: string, metadata?: Record<string, unknown>) => void;
  identify: (config: { visitor: { id: string } }) => void;
  pageLoad: () => void;
}

declare let pendo: PendoSDK;

interface Window {
  pendo: PendoSDK;
}