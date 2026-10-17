const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function fallbackFortune(concern, detail) {
  const topic = (concern || "현재 고민").trim();
  return [
    `[기회] ${topic} 쪽이 눈에 밟히는 건, 지금은 “정보만 모으는 때”가 아니라 “한 가지를 시험해볼 때”에 가깝습니다.`,
    `[주의] 다만 결과가 바로 나오지 않는다고 전체를 뒤집으면, 같은 고민이 더 커집니다. ${detail ? "적어주신 상황도 하루아침에 정리될 성격은 아닙니다." : "속도보다 방향이 먼저입니다."}`,
    `[오늘] ${topic}과 관련해, 오늘 할 수 있는 일 하나만 고르세요. 메시지 한 통, 자료 한 페이지, 질문 하나면 충분합니다.`,
  ].join("\n\n");
}

async function generateFortune(env, concern, detail) {
  if (!env.AI) return fallbackFortune(concern, detail);

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "너는 현재운세 해석가다. 미래를 단정하지 말고, 기회/주의/오늘 할 일 세 단락으로만 한국어로 답한다. 무조건 긍정하거나 무조건 부정하지 마라. 의료·법률·투자 단정은 하지 마라.",
      },
      {
        role: "user",
        content: `고민: ${concern}\n상세: ${detail || "(없음)"}`,
      },
    ],
    max_tokens: 400,
  });

  const text = (result && (result.response || result.text)) || "";
  return text.trim() || fallbackFortune(concern, detail);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const isFortuneApi =
      request.method === "POST" &&
      (url.pathname === "/" || url.pathname === "/api/fortune");

    if (isFortuneApi) {
      try {
        const body = await request.json().catch(() => ({}));
        const concern = (body.concern || "").trim();
        const detail = (body.detail || "").trim();

        if (!concern) {
          return json({ error: "고민을 입력해주세요." }, 400);
        }

        const fortune = await generateFortune(env, concern, detail);
        return json({ fortune });
      } catch (err) {
        return json({ error: err.message || "운세 생성에 실패했습니다." }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json({ error: "Not found" }, 404);
  },
};
