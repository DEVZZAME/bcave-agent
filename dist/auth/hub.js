/**
 * bcave-service-hub 인증 클라이언트.
 * 실제 사내 계정으로 로그인해 Access/Refresh 토큰을 발급받고, 만료 시 갱신한다.
 * API 응답은 { success, data, message } 형태.
 */
function base(hubUrl) {
    return hubUrl.replace(/\/+$/, "");
}
async function parse(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    }
    catch {
        return {
            success: false,
            data: null,
            message: `서버 응답을 해석할 수 없습니다 (HTTP ${res.status}).`,
            errorCode: null,
        };
    }
}
/** 로그인: 이메일/비밀번호 → 토큰 발급 */
export async function hubLogin(hubUrl, email, password) {
    let res;
    try {
        res = await fetch(`${base(hubUrl)}/api/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
    }
    catch {
        throw new Error(`HUB(${hubUrl})에 연결할 수 없습니다. 사내망/주소를 확인하세요.`);
    }
    const body = await parse(res);
    if (!body.success || !body.data) {
        throw new Error(body.message || "로그인에 실패했습니다.");
    }
    return body.data;
}
/** 토큰 재발급 (rotation) */
export async function hubRefresh(hubUrl, refreshToken) {
    const res = await fetch(`${base(hubUrl)}/api/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });
    const body = await parse(res);
    if (!body.success || !body.data) {
        throw new Error(body.message || "세션 갱신에 실패했습니다.");
    }
    return body.data;
}
/** 현재 사용자가 사용 가능한 모델 목록 (게이트웨이 RBAC 반영) */
export async function hubListModels(hubUrl, accessToken) {
    const res = await fetch(`${base(hubUrl)}/api/v1/models`, {
        headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok)
        throw new Error(`모델 목록을 불러오지 못했습니다 (HTTP ${res.status}).`);
    const body = (await res.json());
    return (body.data ?? []).map((m) => ({
        id: m.id,
        displayName: m.display_name ?? m.id,
        description: m.description ?? "",
    }));
}
/** 현재 사용자의 사용량/한도 요약 (일/주/월 추정비용) */
export async function hubUsage(hubUrl, accessToken) {
    const res = await fetch(`${base(hubUrl)}/api/v1/usage`, {
        headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok)
        throw new Error(`사용량을 불러오지 못했습니다 (HTTP ${res.status}).`);
    return (await res.json());
}
/** 로그아웃: 서버측 Refresh Token 폐기 (실패해도 로컬 토큰은 지운다) */
export async function hubLogout(hubUrl, accessToken, refreshToken) {
    try {
        await fetch(`${base(hubUrl)}/api/auth/logout`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ refreshToken }),
        });
    }
    catch {
        // 네트워크 실패는 무시 — 로컬 토큰 제거로 로그아웃 처리
    }
}
