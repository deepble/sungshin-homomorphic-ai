import speech_recognition as sr

def extract_features_from_text(text):
    positive_words = ["열정", "성실", "책임감", "도전"]
    keywords = ["AI", "머신러닝", "프로그래밍", "데이터"]
    selflead = ["주도", "기획", "자발적", "리드"]
    teamwork = ["팀", "협업", "소통", "의사소통"]

    words = text.split()
    return [
        len(words),
        sum(w in positive_words for w in words),
        sum(w in keywords for w in words),
        sum(text.count(h) for h in ["음", "어", "그"]),
        sum(w in selflead for w in words),
        sum(w in teamwork for w in words)
    ]

def transcribe_audio_from_bytes(audio_bytes):
    with sr.AudioFile(audio_bytes) as source:
        r = sr.Recognizer()
        audio = r.record(source)
    try:
        return r.recognize_google(audio, language='ko-KR')
    except:
        return ""
