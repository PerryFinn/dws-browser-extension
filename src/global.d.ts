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

type Config = {
  /** 是否开启项目基本信息弹窗 */
  isOpenWindowConfig: boolean;
  /** 是否开启 Gitlab 快捷访问列表 */
  isOpenGitlabProjects: boolean;
};

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.mp4" {
  const content: string;
  export default content;
}
