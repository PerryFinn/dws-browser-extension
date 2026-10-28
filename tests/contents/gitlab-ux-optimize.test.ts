import { NodeFilter, parseHTML } from "linkedom";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { disableGitlabSearchAutocomplete, observeGitlabAbsoluteTimes } from "@/contents/gitlab-ux-optimize";

const localTimestamp = new Date(2026, 0, 2, 3, 4, 5).toISOString();
const absoluteTime = "2026-01-02 03:04:05";
let stopObserving: (() => void) | undefined;

const startObserving = () => {
  stopObserving = observeGitlabAbsoluteTimes();
};

// linkedom 会把文本变化错误地上报为观察根节点的 childList。
// 这两类更新使用浏览器规范中的记录；真实 MutationObserver 另在 Chrome 中验证。
const captureMutations = () => {
  let callback: MutationCallback;
  const observer: MutationObserver = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: () => []
  };
  vi.stubGlobal(
    "MutationObserver",
    vi.fn(function MockMutationObserver(next: MutationCallback) {
      callback = next;
      return observer;
    })
  );
  return (type: MutationRecord["type"], target: Node) => {
    callback([{ type, target, addedNodes: [] } as unknown as MutationRecord], observer);
  };
};

describe("GitLab 绝对时间", () => {
  beforeEach(() => {
    const { window } = parseHTML("<!doctype html><html><body></body></html>");
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("Element", window.Element);
    vi.stubGlobal("NodeFilter", NodeFilter);
    vi.stubGlobal("MutationObserver", window.MutationObserver);
  });

  afterEach(() => {
    stopObserving?.();
    stopObserving = undefined;
    vi.unstubAllGlobals();
  });

  it("按本地时区显示精确到秒的绝对时间，保留时间戳和悬浮提示", () => {
    document.body.innerHTML = `
      <time datetime="${localTimestamp}" title="Original date" aria-label="Original date">2 weeks ago</time>
    `;

    startObserving();

    const time = document.querySelector("time");
    expect(time?.textContent).toBe(absoluteTime);
    expect(time?.getAttribute("datetime")).toBe(localTimestamp);
    expect(time?.getAttribute("title")).toBe("Original date");
    expect(time?.getAttribute("aria-label")).toBe("Original date");
  });

  it("将带时区偏移的时间戳转换为浏览器本地时间", () => {
    const offsetTimestamp = new Date(new Date(localTimestamp).getTime() + 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+01:00");
    document.body.innerHTML = `<time datetime="${offsetTimestamp}">yesterday</time>`;

    startObserving();

    expect(document.querySelector("time")?.textContent).toBe(absoluteTime);
  });

  it("保留日期分组标题、无效时间、缺少时间戳的内容和普通文本", () => {
    document.body.innerHTML = `
      <h2><time datetime="2026-01-02">Jan 2, 2026</time></h2>
      <time datetime="invalid">unknown date</time>
      <time datetime="2026-13-99T25:00:00Z">invalid timestamp</time>
      <time>2 weeks ago</time>
      <span>2 weeks ago</span>
    `;
    const original = document.body.innerHTML;

    startObserving();

    expect(document.body.innerHTML).toBe(original);
  });

  it("转换翻页后新增容器中的时间及直接插入的时间元素", async () => {
    startObserving();

    const section = document.createElement("section");
    section.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    document.body.append(section);
    const time = document.createElement("time");
    time.setAttribute("datetime", localTimestamp);
    time.textContent = "yesterday";
    document.body.append(time);

    await vi.waitFor(() => {
      expect(Array.from(document.querySelectorAll("time"), (node) => node.textContent)).toEqual([
        absoluteTime,
        absoluteTime
      ]);
    });
  });

  it("在 GitLab 重写相对时间或更新时间戳后保持正确显示", () => {
    const notify = captureMutations();
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    startObserving();
    const time = document.querySelector("time");
    assert(time);

    time.textContent = "3 weeks ago";
    notify("childList", time);
    expect(time.textContent).toBe(absoluteTime);

    time.setAttribute("datetime", new Date(2026, 0, 3, 13, 14, 15).toISOString());
    notify("attributes", time);
    expect(time.textContent).toBe("2026-01-03 13:14:15");
  });

  it("保留 GitLab 原文本节点，关闭后恢复最新文字并允许继续更新", () => {
    const notify = captureMutations();
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    const time = document.querySelector("time");
    assert(time);
    const textNode = time.firstChild as Text;
    assert(textNode);

    startObserving();
    expect(time.firstChild).toBe(textNode);
    expect(time.textContent).toBe(absoluteTime);

    textNode.data = "3 weeks ago";
    notify("characterData", textNode);
    expect(time.firstChild).toBe(textNode);
    expect(time.textContent).toBe(absoluteTime);

    // 扩展自身写入触发的通知不能覆盖 GitLab 最近的原文。
    notify("characterData", textNode);
    stopObserving?.();
    expect(time.firstChild).toBe(textNode);
    expect(time.textContent).toBe("3 weeks ago");

    textNode.data = "4 weeks ago";
    expect(time.textContent).toBe("4 weeks ago");
  });

  it("转换嵌套时间文字时保留包装元素、注释、空白及交互", () => {
    document.body.innerHTML = `<time datetime="${localTimestamp}"> <!--time--><span title="Original tooltip">2 weeks ago</span> </time>`;
    const time = document.querySelector("time");
    const wrapper = document.querySelector("span");
    assert(time && wrapper);
    const originalChildren = Array.from(time.childNodes);
    const textNode = wrapper.firstChild;
    const onClick = vi.fn();
    wrapper.addEventListener("click", onClick);

    startObserving();

    expect(wrapper.textContent).toBe(absoluteTime);
    expect(wrapper.firstChild).toBe(textNode);
    expect(Array.from(time.childNodes)).toEqual(originalChildren);
    expect(wrapper.getAttribute("title")).toBe("Original tooltip");
    wrapper.click();
    expect(onClick).toHaveBeenCalledOnce();

    stopObserving?.();
    expect(wrapper.textContent).toBe("2 weeks ago");
    expect(wrapper.firstChild).toBe(textNode);
    expect(Array.from(time.childNodes)).toEqual(originalChildren);
    wrapper.click();
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it.each(["", " <!--empty--> ", "<span>Updated </span><strong>2 weeks ago</strong>"])(
    "保留无法唯一定位时间文字的内容：%s",
    (content) => {
      document.body.innerHTML = `<time datetime="${localTimestamp}">${content}</time>`;
      const original = document.body.innerHTML;

      startObserving();
      expect(document.body.innerHTML).toBe(original);

      stopObserving?.();
      expect(document.body.innerHTML).toBe(original);
    }
  );

  it("GitLab 替换文本节点后保留新节点，并恢复新节点的原文", () => {
    const notify = captureMutations();
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    startObserving();
    const time = document.querySelector("time");
    assert(time);
    const replacement = document.createTextNode("yesterday");

    time.replaceChildren(replacement);
    notify("childList", time);

    expect(time.firstChild).toBe(replacement);
    expect(time.textContent).toBe(absoluteTime);

    stopObserving?.();
    expect(time.firstChild).toBe(replacement);
    expect(time.textContent).toBe("yesterday");
    replacement.data = "today";
    expect(time.textContent).toBe("today");
  });

  it("关闭时保留 GitLab 刚写入且尚未被转换的新文字", () => {
    captureMutations();
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    const time = document.querySelector("time");
    assert(time);
    const textNode = time.firstChild as Text;
    startObserving();

    textNode.data = "3 weeks ago";
    stopObserving?.();

    expect(time.firstChild).toBe(textNode);
    expect(time.textContent).toBe("3 weeks ago");
  });

  it("停止观察后不再处理新增时间", async () => {
    startObserving();
    stopObserving?.();
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("time")?.textContent).toBe("2 weeks ago");
  });

  it("关闭后恢复原来的时间显示，再次开启仍能转换", () => {
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    startObserving();

    stopObserving?.();
    expect(document.querySelector("time")?.textContent).toBe("2 weeks ago");

    startObserving();
    expect(document.querySelector("time")?.textContent).toBe(absoluteTime);
  });

  it("关闭时恢复 GitLab 最近写入的文字，不把之前的绝对时间当作原文", () => {
    const notify = captureMutations();
    document.body.innerHTML = `<time datetime="${localTimestamp}">2 weeks ago</time>`;
    startObserving();
    const time = document.querySelector("time");
    assert(time);

    time.textContent = "3 weeks ago";
    notify("childList", time);
    time.setAttribute("datetime", new Date(2026, 0, 3, 13, 14, 15).toISOString());
    notify("attributes", time);
    expect(time.textContent).toBe("2026-01-03 13:14:15");

    stopObserving?.();
    expect(time.textContent).toBe("3 weeks ago");
  });

  it("保留现有搜索框自动填充优化", () => {
    document.body.innerHTML = '<input type="search" autocomplete="on"><input type="text">';

    disableGitlabSearchAutocomplete();

    expect(document.querySelector('input[type="search"]')?.getAttribute("autocomplete")).toBe("off");
    expect(document.querySelector('input[type="text"]')?.hasAttribute("autocomplete")).toBe(false);
  });
});
