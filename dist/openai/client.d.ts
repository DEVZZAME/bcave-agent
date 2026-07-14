import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";
import type { BcaveConfig } from "../config/config.js";
/** 게이트웨이(로그인) 모드에서 사용할 baseURL */
export declare function gatewayBaseUrl(config: BcaveConfig): string;
/**
 * 항상 HUB 게이트웨이를 경유한다 (로그인 필수).
 * apiKey 자리에 HUB Access Token 을 실어 보내며, 실제 OpenAI 키는 서버에만 존재한다.
 * → 직접 OpenAI 로 붙는 경로는 존재하지 않는다 (사용량 집계/쿼터/RBAC 우회 불가).
 */
export declare function createOpenAIClient(config: BcaveConfig): OpenAI;
export interface ChatOptions {
    /**
     * 401(인증 만료) 시 호출. 토큰을 갱신하고 새 client 를 반환하면 1회 재시도한다.
     * null 을 반환하면 갱신 실패로 간주하고 원래 에러를 던진다.
     */
    onAuthError?: () => Promise<OpenAI | null>;
}
export declare function chat(client: OpenAI, messages: ChatCompletionMessageParam[], model: string, opts?: ChatOptions): Promise<ChatCompletion>;
export type { ChatCompletionMessageParam, ChatCompletion };
