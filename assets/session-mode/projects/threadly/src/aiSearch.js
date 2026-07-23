'use strict';

const { db } = require('./db');

/**
 * Threadly 지식검색 엔진.
 * - 기본: 외부 의존성 없는 오프라인 추출형 랭킹 + 답변 합성
 * - ANTHROPIC_API_KEY 가 설정되어 있으면 Claude API 로 답변 품질 업그레이드
 */

const STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '또는', '어떻게', '무엇', '어디', '언제', '누구',
  '있나요', '있어요', '인가요', '있는', '대해', '대한', '관련', '알려줘', '알려주세요',
  '방법', '어떤', '해줘', '주세요', '싶어요', '싶어', '어때', '뭐야', '뭔가요',
  'the', 'a', 'an', 'of', 'to', 'and', 'or', 'is', 'are', 'how', 'what', 'for',
  'in', 'on', 'do', 'i', 'my', 'me', 'we',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function splitSentences(text) {
  return (text || '')
    .split(/(?<=[.!?。…\n])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 문서 랭킹: 제목/태그 가중치를 둔 term-frequency 스코어.
 * @param {string} query
 * @param {number|null} departmentId  사용자 부서 (부서 문서 소폭 가산점)
 */
function rankDocuments(query, departmentId = null, limit = 6) {
  const terms = tokenize(query);
  const docs = db
    .prepare(
      `SELECT d.*, dep.name AS department_name
         FROM documents d
         LEFT JOIN departments dep ON dep.id = d.department_id`
    )
    .all();

  if (terms.length === 0) return [];

  const scored = docs.map((doc) => {
    const title = (doc.title || '').toLowerCase();
    const tags = (doc.tags || '').toLowerCase();
    const body = (doc.content || '').toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 8;
      if (tags.includes(term)) score += 5;
      const bodyMatches = body.split(term).length - 1;
      score += Math.min(bodyMatches, 6) * 1.5;
    }
    // 본인 부서 문서 약간 우대
    if (departmentId && doc.department_id === departmentId) score *= 1.15;
    // 조회수 아주 약한 가산점 (인기 문서)
    score += Math.log10((doc.views || 0) + 1) * 0.3;
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({ ...s.doc, _score: Math.round(s.score * 10) / 10 }));
}

/** 상위 문서에서 질의와 가장 관련 높은 문장들을 뽑아 근거 스니펫 구성 */
function extractSnippets(query, docs, perDoc = 2) {
  const terms = tokenize(query);
  const snippets = [];
  for (const doc of docs) {
    const sentences = splitSentences(doc.content);
    const ranked = sentences
      .map((s) => {
        const low = s.toLowerCase();
        let sc = 0;
        for (const t of terms) if (low.includes(t)) sc += 1;
        return { s, sc };
      })
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, perDoc);
    for (const r of ranked) {
      snippets.push({ docId: doc.id, docTitle: doc.title, text: r.s });
    }
  }
  return snippets;
}

/** 오프라인 답변 합성 (근거 스니펫 기반) */
function synthesizeOffline(query, docs) {
  if (docs.length === 0) {
    return {
      answer:
        '관련된 문서를 찾지 못했어요. 다른 키워드로 검색해 보시거나, 지식베이스에 문서를 등록해 주세요.',
      usedModel: 'offline',
    };
  }
  const snippets = extractSnippets(query, docs, 2);
  const top = docs[0];
  let answer = `"${query}" 관련해서 사내 문서를 찾아봤어요.\n\n`;
  if (snippets.length > 0) {
    answer += '핵심 내용을 정리하면:\n';
    const seen = new Set();
    for (const sn of snippets.slice(0, 5)) {
      const key = sn.text.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      answer += `• ${sn.text}\n`;
    }
    answer += `\n가장 관련 높은 문서는 「${top.title}」 입니다. 아래 참고 문서에서 전체 내용을 확인하세요.`;
  } else {
    answer += `가장 관련 높은 문서는 「${top.title}」 입니다. 아래 참고 문서를 확인해 주세요.`;
  }
  return { answer, usedModel: 'offline' };
}

/** Claude API 로 답변 합성 (키가 있을 때만) */
async function synthesizeWithClaude(query, docs) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const context = docs
    .map(
      (d, i) =>
        `[문서 ${i + 1}] 제목: ${d.title}\n부서: ${d.department_name || '전사'}\n내용: ${(
          d.content || ''
        ).slice(0, 1200)}`
    )
    .join('\n\n');

  const body = {
    model: process.env.THREADLY_MODEL || 'claude-opus-4-8',
    max_tokens: 700,
    system:
      '당신은 패션회사 Threadly 의 사내 지식검색 어시스턴트입니다. 제공된 사내 문서만 근거로 한국어로 간결하고 정확하게 답하세요. 문서에 없는 내용은 추측하지 말고 모른다고 하세요. 답변 끝에 근거 문서 제목을 언급하세요.',
    messages: [
      {
        role: 'user',
        content: `사내 문서:\n\n${context}\n\n질문: ${query}`,
      },
    ],
  };

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = (data.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim();
    if (!text) return null;
    return { answer: text, usedModel: body.model };
  } catch {
    return null;
  }
}

/**
 * 통합 검색 진입점.
 * @returns {Promise<{answer, usedModel, sources}>}
 */
async function answerQuery(query, user) {
  const departmentId = user ? user.departmentId : null;
  const docs = rankDocuments(query, departmentId, 6);

  // 검색 로그 기록
  try {
    db.prepare('INSERT INTO search_logs (user_id, query, hits) VALUES (?, ?, ?)').run(
      user ? user.id : null,
      query,
      docs.length
    );
  } catch {
    /* ignore */
  }

  let result = await synthesizeWithClaude(query, docs);
  if (!result) result = synthesizeOffline(query, docs);

  const sources = docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    department: d.department_name || '전사 공용',
    summary: d.summary,
    score: d._score,
  }));

  return { ...result, sources };
}

module.exports = { answerQuery, rankDocuments, tokenize };
