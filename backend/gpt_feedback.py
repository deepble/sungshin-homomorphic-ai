import openai
import os
from dotenv import load_dotenv
load_dotenv()

# API 키 설정 필요
try:
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except AttributeError:
    openai.api_key = ""
    client = None

def generate_feedback(question, breakdown, score, grade):
    prompt = f"""
당신은 민감한 사용자의 텍스트를 직접 보지 않고, 수치 기반 분석 결과만으로 AI 면접 피드백을 생성하는 전문 평가자입니다.

아래는 면접 질문과, 해당 질문에 대한 사용자의 암호화된 응답을 평가한 수치적 분석 결과입니다.
실제 텍스트는 보안상 제공되지 않으며, 다음 항목별 수치와 가중치에 따라 평가가 이루어졌습니다.

면접 질문: "{question}"

항목별 평가 결과:
"""
    for b in breakdown:
        prompt += f"- {b['label']}: 값={b['value']}, 가중치={b['weight']}, 점수 기여={b['contribution']}\n"

    prompt += f"""
- 총 점수: {round(score, 2)}
- 평가 등급: {grade}

이 정보만을 기반으로, 다음을 수행하세요:

1. 해당 질문에 대해 면접자가 강조했을 가능성이 있는 내용이나 태도를 수치 기반으로 유추하세요.
2. 수치 분석을 바탕으로 잘한 점과 개선할 점을 구체적으로 서술하세요.
3. 해당 질문에 대해 이상적인 응답에 포함되어야 할 핵심 요소나 예시를 제안하세요.
4. 특히, 다음 항목들(긍정 표현, 직무 키워드, 자기주도 키워드, 팀워크 키워드)이 사용자의 답변에서 낮거나 빠져 있더라도, 해당 질문의 맥락상 중요한 항목이라면 그 항목에 대해 신경 써서 대답할 필요가 있다는 피드백을 포함해 주세요.
5. 절대로 응답 내용을 상상하거나 생성하지 말고, 질문 맥락과 수치 해석에 기반해 평가하세요.

※ 답변 텍스트는 보안 정책상 제공되지 않았다는 점을 전제로 해야 합니다.
"""

    try:
        if client:
            res = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            return res.choices[0].message.content.strip()
        else:
            res = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            return res.choices[0].message.content.strip()
    except Exception as e:
        return f"AI 피드백 생성 실패: {str(e)}"

