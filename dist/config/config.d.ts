export interface BcaveConfig {
    hubUrl: string;
    accessToken: string;
    refreshToken: string;
    userEmail: string;
    userName: string;
    model: string;
    apiKey: string;
    baseUrl: string;
}
export declare function getConfigDir(): string;
export declare function loadConfig(): BcaveConfig;
export declare function saveConfig(partial: Partial<BcaveConfig>): void;
/** HUB 로그인 상태 여부 (Access Token 보유) */
export declare function isLoggedIn(config: BcaveConfig): boolean;
/** LLM 요청에 사용할 자격 유무 (로그인 또는 레거시 키) */
export declare function hasCredentials(config: BcaveConfig): boolean;
