import { describe, it, expect } from "vitest";
import { ConversationManager } from "../conversation.js";
import { PermissionManager } from "../permissions.js";

const config = {
  hubUrl: "http://localhost:3000",
  accessToken: "hub-access-token",
  refreshToken: "hub-refresh-token",
  userEmail: "user@bcave.co.kr",
  userName: "테스트",
  model: "gpt-5.4-mini",
  autoRoute: false,
  modelHeavy: "gpt-5.4-mini",
  modelLight: "gpt-5.4-mini",
  autoVerify: true,
  verifyCmds: [],
  maxVerifyRounds: 2,
  smokeTest: true,
  designSystem: "bcave",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
};

describe("ConversationManager", () => {
  it("can be instantiated", () => {
    const pm = new PermissionManager("yolo");
    const cm = new ConversationManager(
      config,
      pm,
      process.cwd()
    );
    expect(cm).toBeDefined();
  });

  it("does NOT inject design system context for app/service builds (routing loop fix)", async () => {
    // 앱 빌드는 DS 컨텍스트를 주입하지 않는다 — 주입 시 모델이 write_file에 design_system
    // 필드를 포함해 body/app_script 강제 루프에 빠지던 문제를 방지한다.
    const cm = new ConversationManager(config, new PermissionManager("yolo"), process.cwd());
    const run = cm.run("관리자 웹 서비스를 만들어줘");
    await run.next();

    const hasAppDsContext = cm.getHistory().some((message) =>
      message.role === "system" && typeof message.content === "string" &&
      message.content.includes("모든 웹 UI는 BCAVE 디자인 시스템을 반드시 사용"),
    );
    expect(hasAppDsContext).toBe(false);
    // 앱 빌드 지시(APPLICATION_CONTEXT)는 주입된다
    const hasAppContext = cm.getHistory().some((message) =>
      message.role === "system" && String(message.content).includes("APPLICATION_CONTEXT"),
    );
    expect(hasAppContext).toBe(true);
    await run.return(undefined);
  });

  it("does NOT inject design system context even with an explicit system name in app builds", async () => {
    const cm = new ConversationManager(config, new PermissionManager("yolo"), process.cwd());
    const run = cm.run("AXIS 디자인으로 관리자 서비스를 만들어줘");
    await run.next();

    const hasDsContext = cm.getHistory().some((message) =>
      message.role === "system" && String(message.content).includes("모든 웹 UI는 AXIS 디자인 시스템을 반드시 사용"),
    );
    expect(hasDsContext).toBe(false);
    await run.return(undefined);
  });

  it("uses the configured system for a UI artifact without asking again", async () => {
    const cm = new ConversationManager(config, new PermissionManager("yolo"), process.cwd());
    const run = cm.run("운영 대시보드 화면을 만들어줘");

    const first = await run.next();

    expect(first.value).toMatchObject({ type: "model" });
    expect(cm.getHistory().some((message) =>
      message.role === "system" && String(message.content).includes("BCAVE 디자인 시스템 강제 파이프라인"),
    )).toBe(true);
    await run.return(undefined);
  });

  it("does not let a stale design choice intercept a port troubleshooting request", async () => {
    const noDefault = { ...config, designSystem: "" };
    const cm = new ConversationManager(noDefault, new PermissionManager("yolo"), process.cwd());
    const choose = cm.run("운영 대시보드 화면을 만들어줘");
    expect((await choose.next()).value).toMatchObject({ type: "text" });
    await choose.return(undefined);

    const troubleshoot = cm.run("아직도 3000번 포트에서 확인이 안돼");
    const first = await troubleshoot.next();

    expect(first.value).toMatchObject({ type: "model" });
    await troubleshoot.return(undefined);
  });

  it("does NOT inject DS context for multi-turn app builds either", async () => {
    const cm = new ConversationManager(config, new PermissionManager("yolo"), process.cwd());
    const r1 = cm.run("관리자 웹 서비스를 만들어줘");
    await r1.next();
    await r1.return(undefined);

    const r2 = cm.run("AXIS 디자인시스템으로 서비스를 구현해줘");
    await r2.next();

    // 앱 빌드는 DS 컨텍스트 없음
    const dsContexts = cm.getHistory().filter((m) =>
      m.role === "system" && String(m.content).includes("[ACTIVE_DESIGN_SYSTEM:"),
    );
    expect(dsContexts).toHaveLength(0);
    await r2.return(undefined);
  });

  it("standalone dashboard request still uses DS pipeline (not affected by app build fix)", async () => {
    const cm = new ConversationManager(config, new PermissionManager("yolo"), process.cwd());
    const run = cm.run("매출 분석 대시보드를 만들어줘");
    const first = await run.next();
    // 대시보드 단독 요청은 DS 강제 파이프라인을 사용한다
    expect(first.value).toMatchObject({ type: "model" });
    expect(cm.getHistory().some((m) =>
      m.role === "system" && String(m.content).includes("BCAVE 디자인 시스템 강제 파이프라인"),
    )).toBe(true);
    await run.return(undefined);
  });
});
