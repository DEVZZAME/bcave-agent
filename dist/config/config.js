import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const DEFAULT_CONFIG = {
    // 사내 HUB(프로덕션) 기본값. BCAVE_HUB_URL 로 override 가능.
    hubUrl: process.env.BCAVE_HUB_URL ?? "http://3.36.247.93:3000",
    accessToken: "",
    refreshToken: "",
    userEmail: "",
    userName: "",
    model: "gpt-5.5",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
};
export function getConfigDir() {
    return path.join(os.homedir(), ".bcave");
}
function getConfigPath() {
    return path.join(getConfigDir(), "config.json");
}
export function loadConfig() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_CONFIG, ...parsed };
    // 환경변수 BCAVE_HUB_URL 이 있으면 우선 적용 (사내 배포 시 일괄 지정 가능)
    if (process.env.BCAVE_HUB_URL)
        merged.hubUrl = process.env.BCAVE_HUB_URL;
    return merged;
}
export function saveConfig(partial) {
    const configDir = getConfigDir();
    fs.mkdirSync(configDir, { recursive: true });
    const existing = loadConfig();
    const merged = { ...existing, ...partial };
    fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2), "utf-8");
}
/** HUB 로그인 상태 여부 (Access Token 보유) */
export function isLoggedIn(config) {
    return !!config.accessToken;
}
/** LLM 요청에 사용할 자격 유무 (로그인 또는 레거시 키) */
export function hasCredentials(config) {
    return !!config.accessToken || !!config.apiKey;
}
