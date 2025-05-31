from flask import Flask, request, jsonify
from flask_cors import CORS
from encryption import create_context, encrypt_vector
from feature_extractor import extract_features_from_text, transcribe_audio_from_bytes
from gpt_feedback import generate_feedback
import io
import logging
import random
import json
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)
context = create_context()

ALL_FEATURES = ["length", "positive", "keywords", "hesitation", "selflead", "teamwork"]
LABELS = {
    "length": "단어 수",
    "positive": "긍정 표현",
    "keywords": "직무 키워드",
    "hesitation": "말더듬음",
    "selflead": "자기주도 키워드",
    "teamwork": "팀워크 키워드"
}

QUESTION_LIST = [
    # 자기소개 및 기본 정보
    "본인에 대해 간단히 소개해 주세요.",
    "우리 회사에 지원하게 된 동기는 무엇인가요?",
    "본인의 강점과 약점은 무엇이라고 생각하나요?",
    "본인의 가치관을 형성한 경험은 무엇인가요?",

    # 직무 적합성 및 경험
    "이 직무를 수행하는 데 필요한 역량은 무엇이라고 생각하나요?",
    "관련 경험 중 가장 기억에 남는 프로젝트는 무엇인가요?",
    "이 직무를 위해 어떤 준비를 해왔나요?",
    "최근 관심 있게 본 산업 이슈가 있다면 소개해 주세요.",

    # 문제 해결 능력
    "어려운 문제를 해결했던 경험을 말해 주세요.",
    "실수나 실패를 했던 경험이 있다면? 그리고 어떻게 대응했나요?",
    "갈등 상황에서 어떻게 해결했는지 설명해 주세요.",
    "시간이 부족했던 상황에서 어떻게 우선순위를 정했나요?",

    # 협업 및 대인관계
    "팀원과의 의견 충돌을 조율한 경험이 있다면?",
    "협업을 통해 성과를 낸 경험을 공유해 주세요.",
    "리더로서의 역할을 수행했던 경험이 있다면?",
    "어려운 동료를 도운 경험이 있다면 소개해 주세요.",

    # 기업/산업 이해
    "우리 회사에 대해 아는 대로 말해보세요.",
    "입사 후 기여할 수 있는 부분은 무엇인가요?",
    "우리 회사의 핵심 가치 중 가장 공감 가는 것은 무엇인가요?",
    "이 산업의 미래 방향에 대해 어떻게 생각하시나요?",

    # 인성 및 가치관
    "가장 존경하는 인물과 그 이유는?",
    "스트레스를 받을 때 어떻게 해소하나요?",
    "윤리적 딜레마를 겪은 적이 있다면?",
    "자신의 약속을 지키기 위해 노력했던 경험이 있다면?",

    # 상황 기반 질문 (SJT)
    "동료가 비윤리적인 행동을 했을 때 어떻게 하시겠습니까?",
    "팀원의 업무 성과가 떨어진다면 어떻게 하시겠습니까?",
    "상사가 비현실적인 지시를 내렸을 때 어떻게 대응하시겠습니까?",
    "고객이 무리한 요구를 한다면 어떻게 대처하시겠습니까?"
]


def get_score_grade(score):
    if score >= 26:
        return "매우 우수"
    elif score >= 18:
        return "우수"
    elif score >= 11:
        return "보통"
    else:
        return "개선 필요"

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        selected = request.form.getlist("features[]")
        weight_strings = request.form.getlist("weights[]")
        question = request.form.get("question")

        if not selected or not weight_strings:
            return jsonify({"error": "선택된 항목과 가중치가 모두 필요합니다."}), 400

        if len(selected) != len(weight_strings):
            return jsonify({"error": "선택된 항목 수와 가중치 수가 일치하지 않습니다."}), 400

        weights = [float(w) for w in weight_strings]
        # transcript = request.form["transcript"]
        feature_vector = json.loads(request.form["features_vector"])

        selected_indices = [ALL_FEATURES.index(f) for f in selected]
        selected_features = [feature_vector[i] for i in selected_indices]

        enc_vec = encrypt_vector(context, selected_features)
        score = enc_vec.dot(weights).decrypt()[0]
        grade = get_score_grade(score)

        breakdown = [
            {
                "label": LABELS[f],
                "value": feature_vector[ALL_FEATURES.index(f)],
                "weight": weights[i],
                "contribution": round(feature_vector[ALL_FEATURES.index(f)] * weights[i], 2)
            }
            for i, f in enumerate(selected)
        ]

        feedback = generate_feedback(question, breakdown, score, grade)

        return jsonify({
            # "transcript": transcript,
            "score": round(score, 2),
            "grade": grade,
            "breakdown": breakdown,
            "feedback": feedback
        })
    except Exception as e:
        app.logger.error(f"서버 오류: {str(e)}")
        return jsonify({"error": f"서버 오류가 발생했습니다: {str(e)}"}), 500


@app.route("/question", methods=["GET"])
def get_question():
    selected = random.choice(QUESTION_LIST)
    return jsonify({"question": selected})

if __name__ == "__main__":
    app.run(debug=True)

