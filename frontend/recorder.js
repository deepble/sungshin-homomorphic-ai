document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const recordBtn = document.getElementById("record");
  const stopBtn = document.getElementById("stop-recording");
  const timerDisplay = document.getElementById("timer-display");
  let transcript = "";
  let recognition;
  let countdownInterval;
  let timer = 30;

  // Web Speech API 초기화
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
  } else if ('SpeechRecognition' in window) {
    recognition = new SpeechRecognition();
  }

  if (recognition) {
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true; // 중간 결과 수신

    recordBtn.onclick = () => {
      if (recognition) recognition.start();
      transcript = "";
      timer = 30;
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      recordBtn.innerText = "🔴 녹음 중...";
      timerDisplay.innerText = `⏱ 남은 시간: ${timer}초`;

      // 타이머 시작
      countdownInterval = setInterval(() => {
        timer--;
        timerDisplay.innerText = `⏱ 남은 시간: ${timer}초`;
        if (timer <= 0) {
          stopRecognition();  // 시간 초과 시 자동 종료
        }
      }, 1000);
    };

    stopBtn.onclick = () => {
      stopRecognition(true);  // 수동 중단
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          transcript += result[0].transcript + " ";
        }
      }
      document.querySelector("textarea[name='text']").value = transcript.trim();
    };

    recognition.onend = () => {
      stopRecognition(true);
    };

    recognition.onerror = (event) => {
      alert("음성 인식 오류: " + event.error);
      stopRecognition();
    };
  } else {
    alert("브라우저가 Web Speech API를 지원하지 않습니다.");
  }

  function stopRecognition(manual = false) {
    clearInterval(countdownInterval);
    if (recognition) recognition.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    recordBtn.innerText = "🎙️ 다시 녹음";
    timerDisplay.innerText = manual ? "✅ 음성 인식 완료" : "⏱ 시간이 초과되어 자동 종료됨";

    if (transcript.trim()) {
      alert("음성 인식이 완료되었습니다.");
    } else {
      alert("음성이 인식되지 않았습니다.");
    }
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    const text = form.querySelector("textarea[name='text']").value;
    if (!text.trim()) {
      alert("텍스트를 입력하거나 음성을 녹음해 주세요.");
      return;
    }

    formData.append("transcript", text);

    // 클라이언트에서 features 수동 추출
    const features = extractFeatures(text);
    formData.append("features_vector", JSON.stringify(features));

    const featureInputs = form.querySelectorAll("input[type=checkbox][name='features[]']");
    const weightInputs = form.querySelectorAll("input[type=range][name='weights[]']");
    featureInputs.forEach((checkbox, i) => {
      if (checkbox.checked) {
        formData.append("features[]", checkbox.value);
        formData.append("weights[]", weightInputs[i].value);
      }
    });

    formData.append("question", document.getElementById("question-input").value);

    const res = await fetch("http://127.0.0.1:5000/analyze", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    document.getElementById("transcript").innerText = data.transcript ?? "-";
    document.getElementById("score").innerText = data.score ?? "-";
    document.getElementById("grade").innerText = data.grade ?? "-";
    document.getElementById("feedback").innerText = data.feedback ?? "-";

    const breakdown = document.getElementById("breakdown");
    breakdown.innerHTML = "";
    (data.breakdown || []).forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.label}</td><td>${row.value}</td><td>${row.weight}</td><td>${row.contribution}</td>`;
      breakdown.appendChild(tr);
    });
  };

  function extractFeatures(text) {
    const positive = ["열정", "성실", "책임감", "도전"];
    const keywords = ["AI", "머신러닝", "프로그래밍", "데이터"];
    const selflead = ["주도", "기획", "자발적", "리드"];
    const teamwork = ["팀", "협업", "소통", "의사소통"];
    const hesitation = ["음", "어", "그"];

    const words = text.split(/\s+/);
    return [
      words.length,
      words.filter(w => positive.includes(w)).length,
      words.filter(w => keywords.includes(w)).length,
      hesitation.reduce((acc, h) => acc + (text.split(h).length - 1), 0),
      words.filter(w => selflead.includes(w)).length,
      words.filter(w => teamwork.includes(w)).length
    ];
  }
});
