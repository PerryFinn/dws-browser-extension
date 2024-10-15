import { clamp, groupBy } from "lodash-es";
import SparkMD5 from "spark-md5";

import { sendToBackground } from "@plasmohq/messaging";

import type { fetchReqBody, fetchResBody } from "@/background/messages/fetch";
import { ping, type PingReqBody, type PingResBody } from "@/background/messages/ping";
import { xhrRequest } from "@/services";

import { parseXMLtoObject } from ".";

function SHA256(a: string) {
  function b(a, b) {
    var c = (a & 65535) + (b & 65535);
    return (((a >> 16) + (b >> 16) + (c >> 16)) << 16) | (c & 65535);
  }
  function c(a, b) {
    return (a >>> b) | (a << (32 - b));
  }
  a = (function (a) {
    for (var a = a.replace(/\r\n/g, "\n"), b = "", c = 0; c < a.length; c++) {
      var h = a.charCodeAt(c);
      h < 128
        ? (b += String.fromCharCode(h))
        : (h > 127 && h < 2048
            ? (b += String.fromCharCode((h >> 6) | 192))
            : ((b += String.fromCharCode((h >> 12) | 224)), (b += String.fromCharCode(((h >> 6) & 63) | 128))),
          (b += String.fromCharCode((h & 63) | 128)));
    }
    return b;
  })(a);
  return (function (a) {
    for (var b = "", c = 0; c < a.length * 4; c++)
      b +=
        "0123456789abcdef".charAt((a[c >> 2] >> ((3 - (c % 4)) * 8 + 4)) & 15) +
        "0123456789abcdef".charAt((a[c >> 2] >> ((3 - (c % 4)) * 8)) & 15);
    return b;
  })(
    (function (a, e) {
      var g = [
          1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080,
          310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774,
          264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808,
          3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
          1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817,
          3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
          1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479,
          3329325298
        ],
        h = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225],
        f = Array(64),
        o,
        p,
        q,
        n,
        k,
        j,
        l,
        m,
        s,
        r,
        u,
        w;
      a[e >> 5] |= 128 << (24 - (e % 32));
      a[(((e + 64) >> 9) << 4) + 15] = e;
      for (s = 0; s < a.length; s += 16) {
        o = h[0];
        p = h[1];
        q = h[2];
        n = h[3];
        k = h[4];
        j = h[5];
        l = h[6];
        m = h[7];
        for (r = 0; r < 64; r++)
          (f[r] =
            r < 16
              ? a[r + s]
              : b(
                  b(
                    b(c(f[r - 2], 17) ^ c(f[r - 2], 19) ^ (f[r - 2] >>> 10), f[r - 7]),
                    c(f[r - 15], 7) ^ c(f[r - 15], 18) ^ (f[r - 15] >>> 3)
                  ),
                  f[r - 16]
                )),
            (u = b(b(b(b(m, c(k, 6) ^ c(k, 11) ^ c(k, 25)), (k & j) ^ (~k & l)), g[r]), f[r])),
            (w = b(c(o, 2) ^ c(o, 13) ^ c(o, 22), (o & p) ^ (o & q) ^ (p & q))),
            (m = l),
            (l = j),
            (j = k),
            (k = b(n, u)),
            (n = q),
            (q = p),
            (p = o),
            (o = b(u, w));
        h[0] = b(o, h[0]);
        h[1] = b(p, h[1]);
        h[2] = b(q, h[2]);
        h[3] = b(n, h[3]);
        h[4] = b(k, h[4]);
        h[5] = b(j, h[5]);
        h[6] = b(l, h[6]);
        h[7] = b(m, h[7]);
      }
      return h;
    })(
      (function (a) {
        for (var b = [], c = 0; c < a.length * 8; c += 8) b[c >> 5] |= (a.charCodeAt(c / 8) & 255) << (24 - (c % 32));
        return b;
      })(a),
      a.length * 8
    )
  );
}

/** 海康对 password 的加密方法 */
export function encodePwd(
  pwd: string,
  t: { userName: string; salt: string; challenge: string; iIterate: number },
  a = true
) {
  var n = "";
  if (a) {
    (n = SHA256(t.userName + t.salt + pwd)), (n = SHA256(n + t.challenge));
    for (var i = 2; t.iIterate > i; i++) n = SHA256(n);
  } else {
    n = SHA256(pwd) + t.challenge;
    for (var i = 1; t.iIterate > i; i++) n = SHA256(n);
  }
  return n;
}

/** 描述用户名与多个密码的关系 */
export interface UserPasswordPair {
  username: string;
  host: string;
  passwords: string[];
}

/** 正确的账号信息 */
export interface AccountInfo {
  username: string;
  password: string;
  host: string;
}

/** 处理登录的信息 */
export interface TaskResult {
  success: AccountInfo[];
  failed: UserPasswordPair[];
  error: (UserPasswordPair & { message: string })[];
}

/** 用于描述从海康服务获取的加密因子 */
export interface HikSessionLoginFactor {
  challenge: string;
  iterations: number;
  salt: string;
  isIrreversible?: boolean;
  sessionID?: string;
  sessionIDVersion?: number;
}

/** 加密密码的工具类，用来接收因子和密码，生成加密后的密码 utils.js?version=V4.0.1.0build210508 */
export class HikPasswordEncryptor {
  static encrypt(username: string, password: string, factor: HikSessionLoginFactor, a = true): string {
    let hashedPassword = "";
    if (a) {
      (hashedPassword = SHA256(username + factor.salt + password)),
        (hashedPassword = SHA256(hashedPassword + factor.challenge));
      for (var i = 2; factor.iterations > i; i++) hashedPassword = SHA256(hashedPassword);
    } else {
      hashedPassword = SHA256(password) + factor.challenge;
      for (var i = 1; factor.iterations > i; i++) hashedPassword = SHA256(hashedPassword);
    }
    return hashedPassword;
  }
}

/** 与服务接口交互，负责发送和获取数据 */
export class HikSessionService {
  private host: string;

  constructor({ host }: { host: string }) {
    this.host = host;
  }

  // 获取加密所需的因子
  async getEncryptionFactors(username: string, password: string): Promise<HikSessionLoginFactor> {
    const random = this.genRandom();
    // const xmlData = await xhrRequest<string>({
    //   url: `http://${username}:${password}@${this.host}/ISAPI/Security/sessionLogin/capabilities?username=${username}&random=${random}`
    // });
    const res = await fetch(
      `http://${this.host}/ISAPI/Security/sessionLogin/capabilities?username=${username}&random=${random}`
    );
    // const res = await fetch(
    //   `http://${username}:${password}@${this.host}/ISAPI/Security/sessionLogin/capabilities?username=${username}&random=${random}`
    // );
    const xmlData = await res.text();
    // 解析 XML 并返回 HikSessionLoginFactor 对象
    return this.parseHikSessionLoginFactor(xmlData);
  }

  // 提交加密后的密码以验证
  async submitLogin(username: string, encryptedPassword: string, factor: HikSessionLoginFactor): Promise<boolean> {
    const loginPayload = `<SessionLogin>
  <userName>${HikSessionService.encodeString(username)}</userName>
  <password>${encryptedPassword}</password>
  <sessionID>${factor.sessionID}</sessionID>
  <isSessionIDValidLongTerm>false</isSessionIDValidLongTerm>
  <sessionIDVersion>${factor.sessionIDVersion}</sessionIDVersion>
</SessionLogin>`;

    // const {data} =await sendToBackground<fetchReqBody, fetchResBody>({
    //   name: "fetch",
    //   body: {
    //     url: `http://${this.host}/ISAPI/Security/sessionLogin?timeStamp=${new Date().getTime()}`,
    //     method: "POST",
    //     respType: "text",
    //     body: loginPayload,
    //     headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }
    //   }
    // });

    const response = await fetch(`http://${this.host}/ISAPI/Security/sessionLogin?timeStamp=${new Date().getTime()}`, {
      method: "POST",
      body: loginPayload,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }
    });

    const xmlData = await response.text();
    const status = this.parseLoginResponse(xmlData);
    return status === 200; // 假设 200 是登录成功的状态码
  }

  private parseHikSessionLoginFactor(xml: string): HikSessionLoginFactor {
    // 解析 XML 字符串为 HikSessionLoginFactor 对象
    const xmlDoc = parseXMLtoObject(xml);
    // 从 XML 中提取各个字段
    const sessionID = xmlDoc["sessionID"];
    const challenge = xmlDoc["challenge"];
    const iterations = parseInt(xmlDoc["iterations"], 10);
    const isIrreversible = xmlDoc["isIrreversible"] === "true";
    const salt = xmlDoc["salt"];
    const sessionIDVersion = parseInt(xmlDoc["sessionIDVersion"], 10);

    // 返回解析后的对象
    return {
      sessionID,
      challenge,
      iterations,
      isIrreversible,
      salt,
      sessionIDVersion
    };
  }

  private parseLoginResponse(xml: string): number {
    // 解析 XML，获取状态码
    const xmlDoc = parseXMLtoObject(xml);
    const statusValue = parseInt(xmlDoc["statusValue"], 10);
    return statusValue;
  }

  private genRandom(): string {
    return `${parseInt(SparkMD5.hash(`${new Date().getTime()}`).substring(0, 8).replace("#", ""), 16)}`.substring(0, 8);
  }

  static encodeString(str: string) {
    return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
  }

  static decodeString(str: string) {
    str = str.replace(/&apos;/g, "&#39;");
    var dom = document.createElement("div");
    const result = ((dom.innerHTML = str), dom.textContent || dom.innerText);
    dom.remove();
    return result;
  }
}

export class LoginManager {
  private users: UserPasswordPair[];
  static delay = 500; // ms
  private task: { username: string; password: string; host: string }[] = [];
  private groupUsers: { [host: string]: UserPasswordPair[] } = {};

  constructor(users: UserPasswordPair[]) {
    this.users = users;
    this.initTask(users);
    this.groupUsers = groupBy(users, (item) => item.host);
  }

  private initTask(users: UserPasswordPair[]) {
    for (const user of users) {
      for (const password of user.passwords) {
        this.task.push({ username: user.username, password, host: user.host });
      }
    }
  }

  public async processLogins() {
    // 一个 ProcessInfo 对象，包含成功和失败的原账户信息
    const result: TaskResult = { success: [], failed: [], error: [] };

    for (const [host, users] of Object.entries(this.groupUsers)) {
      console.log(`开始验证 host 为【${host}】的账号`);
      const res = await this.processLoginsByIp(host, users);
      result.success.push(...res.success);
      result.failed.push(...res.failed);
      result.error.push(...res.error);
    }
    return result;
  }

  public async processLoginsByIp(host: string, users: UserPasswordPair[]) {
    // 一个 ProcessInfo 对象，包含成功和失败的原账户信息
    const result: TaskResult = { success: [], failed: [], error: [] };

    const { success, message } = await this.validateAccessible(host);
    if (!success) {
      result.error.push({ username: "all", host: host, passwords: ["all"], message });
      return result;
    }
    const validatePlatform = await this.validatePlatform(host);
    if (!validatePlatform.success) {
      result.error.push({ username: "all", host: host, passwords: ["all"], message: validatePlatform.message });
      return result;
    }

    for (const user of users) {
      // 每次验证一个 username 后等待 this.delay 秒
      // await new Promise((resolve) => setTimeout(resolve, this.delay));
      forPassword: for (const password of user.passwords) {
        console.log(`尝试账号密码组合 [${user.username}]-[${password}]`);
        const username = user.username;
        try {
          if (!username || !password) {
            throw new Error("用户名或密码为空");
          }
          const hikSessionService = new HikSessionService({ host });
          const factor = await hikSessionService.getEncryptionFactors(username, password);
          const encryptedPassword = HikPasswordEncryptor.encrypt(username, password, factor);
          const isSuccess = await hikSessionService.submitLogin(username, encryptedPassword, factor);

          if (isSuccess) {
            result.success.push({ username, password, host: user.host });
            break forPassword;
          } else {
            const target = result.failed.find((u) => u.username === username && u.host === user.host);
            if (target) {
              target.passwords.push(password);
            } else {
              result.failed.push({ username, host: user.host, passwords: [password] });
            }
          }
        } catch (error) {
          console.error(`Error processing login for user ${username} with password ${password}`, error);
          const target = result.error.find((u) => u.username === username && u.host === user.host);
          if (target) {
            target.passwords.push(password);
          } else {
            result.error.push({ username, host: user.host, passwords: [password], message: error.message });
          }
        } finally {
          // 每次验证一个 password 后等待 this.delay 秒
          await new Promise((resolve) => setTimeout(resolve, LoginManager.delay));
        }
      }
    }
    return result;
  }

  /** 验证网站是否能够正常访问 */
  private async validateAccessible(host: string) {
    const message = `无法正常访问`;
    try {
      const success = await ping(host);
      return { success, message };
    } catch (error) {
      console.error(`validateAccessible 【${host}】 error :>> `, error);
      return { success: false, message };
    }
  }

  /** 验证插件的运行是否支持到了该平台 */
  private async validatePlatform(host: string) {
    const message = `浏览器插件测试暂不支持该平台，联系 chenpengfei@cvte.com 进行适配`;
    try {
      // 是否支持海康平台
      const success = await ping(`http://${host}/SDK/language`);
      return { success, message };
    } catch (error) {
      console.error(`validatePlatform 【${host}】 error :>> `, error);
      return { success: false, message };
    }
  }
}
