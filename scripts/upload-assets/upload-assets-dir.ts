import { resolve } from "pathe";
import packageJson from "../../package.json";
import { CdnUploader } from "../upload-dist/index";

/**
 * 上传资源目录中的所有文件
 */
export async function uploadAssetsDir(): Promise<void> {
  // 读取版本号配置文件，获取版本号
  const version = packageJson.version;
  // cdn配置项
  const cdnPath = "https://s0.seewo.com/cloud-static";
  const subpath = "/kdl-gis3d";
  const cdnSubPath = `${subpath}/v${version}/assets`;
  const resourcePath = resolve(__dirname, "../..", "assets");
  const cdnFilePath = `${cdnPath}${cdnSubPath}/hdr/sky6.webp`;
  console.log("正在部署到cdn...", resourcePath);
  const cdnUploader = new CdnUploader({
    cdnSubPath, // cdn 上传目录，若未创建，后台会自动创建。建议路径格式是  /{产品名称}/{应用名称}/[版本号],
    resourcePath, // 可选参数，支持上传指定文件夹 & 单个文件。默认设置为 webpack output.path 选项指定的目录。
    ignoreUploadFail: false, // 可选参数， 默认值为false, 即如果出现上传异常，会中断webpack打包进程
    removeFiles: false // 可选参数， 默认值为false, 是否在上传了cdn后，删除已上传的资源，这样可以有效减小镜像大小和推包时间，而且也能有效减小流量费用
  });
  return cdnUploader
    .zipAndUpload()
    .then(() => {
      console.log("请通过浏览器访问验证是否上传成功：\n", cdnFilePath);
    })
    .catch(console.error);
}
