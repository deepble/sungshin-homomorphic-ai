document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form");
    const recordBtn = document.getElementById("record");
    const stopBtn = document.getElementById("stop-recording");
    const timerLabel = document.querySelector("#timer-text-overlay .timer-label");
    const timerSecondsDisplay = document.getElementById("timer-seconds");
    const circularProgress = document.querySelector(".circular-chart .circle");
    const scoreCircle = document.querySelector(".circular-chart .score-circle");
    const scoreValueDisplay = document.getElementById("score");
    const gradeCircle = document.querySelector(".circular-chart .grade-circle");
    const gradeValueDisplay = document.getElementById("grade");

    let featureRadarChart = null;
    const ALL_FEATURE_LABELS = ["단어 수", "긍정 표현", "직무 키워드", "말더듬", "자기 주도 키워드", "팀워크 키워드"];

    let transcript = "";
    let recognition;
    let countdownInterval;
    const initialTimer = 30;
    let timer = initialTimer;
    const circumference = 2 * Math.PI * 20;

    const updateCircularTimer = () => {
        const progress = (timer / initialTimer);
        const offset = circumference - (progress * circumference);

        circularProgress.style.strokeDasharray = `${circumference} ${circumference}`;
        circularProgress.style.strokeDashoffset = offset;
        timerSecondsDisplay.textContent = timer;

        timerLabel.textContent = timer <= 0 ? "⏱ 시간 초과" : "⏱ 남은 시간";
    };

    const updateScoreCircularGraph = (score) => {
        const maxScore = 100;
        const normalizedScore = Math.max(0, Math.min(score, maxScore));
        const progress = normalizedScore / maxScore;
        const offset = circumference - (progress * circumference);

        scoreCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        scoreCircle.style.strokeDashoffset = offset;
        scoreValueDisplay.textContent = Math.round(score);
    };

    const updateGradeCircularGraph = (grade) => {
        let progress = 0;
        let gradeColor = "var(--gray-dark)";
        switch (grade) {
            case "매우 우수": progress = 1.0; gradeColor = "#28a745"; break;
            case "우수": progress = 0.75; gradeColor = "#17a2b8"; break;
            case "보통": progress = 0.5; gradeColor = "#ffc107"; break;
            case "개선 필요": progress = 0.25; gradeColor = "#dc3545"; break;
        }

        const offset = circumference - (progress * circumference);
        gradeCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        gradeCircle.style.strokeDashoffset = offset;
        gradeCircle.style.stroke = gradeColor;
        gradeValueDisplay.textContent = grade;
    };

    const createOrUpdateRadarChart = (breakdownData) => {
        const ctx = document.getElementById('featureRadarChart').getContext('2d');
        const chartData = ALL_FEATURE_LABELS.map(label => {
            const item = breakdownData.find(b => b.label === label);
            return item ? item.contribution : 0;
        });

        const maxContribution = Math.max(...chartData.map(Math.abs));
        const suggestedMax = maxContribution > 0 ? maxContribution * 2 : 10;

        if (featureRadarChart) {
            featureRadarChart.data.datasets[0].data = chartData;
            featureRadarChart.options.scales.r.max = suggestedMax;
            featureRadarChart.update();
        } else {
            featureRadarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ALL_FEATURE_LABELS,
                    datasets: [{
                        label: '기여 점수',
                        data: chartData,
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        borderColor: 'rgba(37, 99, 235, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                        r: {
                            suggestedMin: 0,
                            suggestedMax: suggestedMax,
                            ticks: { display: false }
                        }
                    }
                }
            });
        }
    };

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    }

    if (recognition) {
        recognition.lang = "ko-KR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recordBtn.onclick = () => {
            recognition.start();
            transcript = "";
            timer = initialTimer;
            updateCircularTimer();
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            recordBtn.innerText = "🔴 녹음 중...";
            countdownInterval = setInterval(() => {
                timer--;
                updateCircularTimer();
                if (timer <= 0) stopRecognition();
            }, 1000);
        };

        stopBtn.onclick = () => stopRecognition(true);

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript + " ";
                }
            }
            document.querySelector("textarea[name='text']").value = transcript.trim();
        };

        recognition.onend = () => stopRecognition(true);
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
        timerLabel.textContent = manual ? "✅ 인식 완료" : "⏱ 시간 초과";
        timerSecondsDisplay.textContent = "";

        if (transcript.trim()) {
            alert("음성 인식이 완료되었습니다.");
        } else {
            alert("음성이 인식되지 않았습니다.");
        }
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        const text = form.querySelector("textarea[name='text']").value.trim();

        if (!text) {
            alert("텍스트를 입력하거나 음성을 녹음해 주세요.");
            return;
        }

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
        document.getElementById("transcript").innerText = text;
        updateScoreCircularGraph(data.score ?? 0);
        updateGradeCircularGraph(data.grade ?? "N/A");
        document.getElementById("feedback").innerText = data.feedback ?? "-";
        createOrUpdateRadarChart(data.breakdown || []);

        const breakdown = document.getElementById("breakdown");
        breakdown.innerHTML = "";
        (data.breakdown || []).forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${row.label}</td><td>${row.value}</td><td>${row.weight}</td><td>${row.contribution.toFixed(2)}</td>`;
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

    // ✅ 슬라이더 값 위치, 색상, 텍스트 표시
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        const sliderWrapper = input.closest('.slider-wrapper');
        const valueDisplay = sliderWrapper.querySelector('.slider-value');

        const updateSlider = () => {
            const value = parseFloat(input.value);
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);
            const percent = ((value - min) / (max - min)) * 100;

            valueDisplay.textContent = value.toFixed(1);
            input.style.setProperty('--range-progress', `${percent}%`);

            const inputWidth = input.offsetWidth;
            const displayWidth = valueDisplay.offsetWidth;
            const thumbWidth = 18;
            const offset = (inputWidth - thumbWidth) * percent / 100 - displayWidth / 2 + thumbWidth / 2;
            valueDisplay.style.left = `${Math.min(Math.max(0, offset), inputWidth - displayWidth)}px`;
        };

        updateSlider();
        input.addEventListener('input', updateSlider);
        window.addEventListener('resize', updateSlider);
    });

    // ✅ 슬라이더 활성/비활성 토글에 따라 스타일 변경
    const featureToggles = document.querySelectorAll('input.feature-toggle');
    featureToggles.forEach(toggle => {
        const sliderGroup = toggle.closest('.slider-group');
        const sliderWrapper = sliderGroup.querySelector('.slider-wrapper');
        const slider = sliderWrapper.querySelector('input[type="range"]');
        const valueDisplay = sliderWrapper.querySelector('.slider-value');

        const setState = (active) => {
            slider.disabled = !active;
            sliderWrapper.classList.toggle('disabled', !active);
            sliderGroup.style.backgroundColor = active ? 'var(--highlight-color)' : 'var(--gray-light)';

            const value = parseFloat(slider.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const percent = ((value - min) / (max - min)) * 100;
            slider.style.setProperty('--range-progress', active ? `${percent}%` : `0%`);

            const inputWidth = slider.offsetWidth;
            const displayWidth = valueDisplay.offsetWidth;
            const thumbWidth = 18;
            const offset = (inputWidth - thumbWidth) * percent / 100 - displayWidth / 2 + thumbWidth / 2;
            valueDisplay.style.left = `${Math.min(Math.max(0, offset), inputWidth - displayWidth)}px`;
        };

        setState(toggle.checked);
        toggle.addEventListener('change', () => {
            setState(toggle.checked);
        });
    });

    // 초기 설정
    updateCircularTimer();
    updateScoreCircularGraph(0);
    updateGradeCircularGraph("N/A");
    createOrUpdateRadarChart([]);
});
