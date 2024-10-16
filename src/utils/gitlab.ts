import packageJSON from "../../package.json";

export interface GitlabFrequentProjectMeta {
  avatarUrl: string | null;
  frequency: number;
  id: number;
  lastAccessedOn: number;
  name: string;
  namespace: string;
  webUrl: string;
}

export const getGitlabEmail = async (): Promise<string> => {
  try {
    const res = await fetch("https://gitlab.gz.cvte.cn/-/user_settings/profile").then((res) => res.text());
    const parser = new DOMParser();
    const docDom = parser.parseFromString(res, "text/html");
    const inputDom = docDom.getElementById("user_email") as HTMLInputElement;
    if (!inputDom) {
      throw new Error(`${packageJSON.name}适配【gitlab】失效，请联系${packageJSON.author}进行修复`);
    }
    return inputDom.value;
  } catch (error) {
    console.error("getGitlabEmail error :>> ", error);
    return "";
  }
};
