import OpenAI from "openai";
import { TOOL_DEFINITIONS } from "../agent/tools.js";
/** 게이트웨이(로그인) 모드에서 사용할 baseURL */
export function gatewayBaseUrl(config) {
    return `${config.hubUrl.replace(/\/+$/, "")}/api/v1`;
}
/**
 * 항상 HUB 게이트웨이를 경유한다 (로그인 필수).
 * apiKey 자리에 HUB Access Token 을 실어 보내며, 실제 OpenAI 키는 서버에만 존재한다.
 * → 직접 OpenAI 로 붙는 경로는 존재하지 않는다 (사용량 집계/쿼터/RBAC 우회 불가).
 */
export function createOpenAIClient(config) {
    return new OpenAI({
        apiKey: config.accessToken,
        baseURL: gatewayBaseUrl(config),
    });
}
export async function chat(client, messages, model, opts = {}) {
    const maxRetries = 3;
    let activeClient = client;
    let refreshed = false;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await activeClient.chat.completions.create({
                model,
                messages,
                tools: TOOL_DEFINITIONS,
                tool_choice: "auto",
            });
        }
        catch (err) {
            // 인증 만료: 토큰 갱신 후 1회 재시도
            if (err instanceof OpenAI.APIError &&
                err.status === 401 &&
                opts.onAuthError &&
                !refreshed) {
                const newClient = await opts.onAuthError();
                refreshed = true;
                if (newClient) {
                    activeClient = newClient;
                    attempt--; // 이 시도는 재시도 횟수에서 제외
                    continue;
                }
            }
            const isRetryable = err instanceof OpenAI.APIError &&
                (err.status === 429 || err.status === 500 || err.status === 503);
            if (!isRetryable || attempt === maxRetries - 1)
                throw err;
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
    }
    throw new Error("Unreachable");
}
