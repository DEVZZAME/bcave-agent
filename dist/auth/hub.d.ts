/**
 * bcave-service-hub 인증 클라이언트.
 * 실제 사내 계정으로 로그인해 Access/Refresh 토큰을 발급받고, 만료 시 갱신한다.
 * API 응답은 { success, data, message } 형태.
 */
export type HubUser = {
    id: number;
    email: string;
    name: string;
    role: string;
    services: string[];
};
export type LoginResult = {
    accessToken: string;
    refreshToken: string;
    user: HubUser;
};
/** 로그인: 이메일/비밀번호 → 토큰 발급 */
export declare function hubLogin(hubUrl: string, email: string, password: string): Promise<LoginResult>;
/** 토큰 재발급 (rotation) */
export declare function hubRefresh(hubUrl: string, refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
}>;
export type HubModel = {
    id: string;
    displayName: string;
    description: string;
};
/** 현재 사용자가 사용 가능한 모델 목록 (게이트웨이 RBAC 반영) */
export declare function hubListModels(hubUrl: string, accessToken: string): Promise<HubModel[]>;
export type UsagePeriod = {
    used: number;
    limit: number;
    reset: string;
};
export type HubUsage = {
    role: string | null;
    tierName: string | null;
    hasAccess: boolean;
    periods: {
        daily: UsagePeriod;
        weekly: UsagePeriod;
        monthly: UsagePeriod;
    };
};
/** 현재 사용자의 사용량/한도 요약 (일/주/월 추정비용) */
export declare function hubUsage(hubUrl: string, accessToken: string): Promise<HubUsage>;
/** 로그아웃: 서버측 Refresh Token 폐기 (실패해도 로컬 토큰은 지운다) */
export declare function hubLogout(hubUrl: string, accessToken: string, refreshToken: string): Promise<void>;
