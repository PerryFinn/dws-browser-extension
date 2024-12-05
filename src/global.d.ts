interface Window {
  config?: Partial<{
    commitInfo: Partial<{
      name: string;
      version: string;
      gis3dVersion: string;
      playerVersion: string;
      hash: string;
      shortHash: string;
      subject: string;
      date: string;
      timestamp: string;
      gis3dVersionOrigin: string;
    }>;
    isEdge: boolean;
    isLocalCstore: boolean;
    baseURL: string;
    dwsToken: string;
  }>;
}
