// public/app.js
class TestApp {
    constructor() {
        this.currentLevel = 1;
        this.currentStage = 'reading';
        this.questionIndex = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.questions = { reading: [], listening: [] };

        // Добавляем счетчики для правильных и неправильных ответов на соседних уровнях
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;

        this.questionContainer = document.getElementById('question-container');
        this.submitBtn = document.getElementById('submit-btn');
        this.finishBtn = document.getElementById('finish-btn');

        this.user = JSON.parse(localStorage.getItem('tilda_members_profile10011255')) || { login: 'anonymous' };

        // Привязка методов
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.finishBtn.addEventListener('click', () => this.finishTest());

        // Шкала WSS
        this.wssScale = [
            { wss: 180, level: 'C2' }, { wss: 179, level: 'C2' }, { wss: 178, level: 'C2' },
            { wss: 177, level: 'C1 High' }, { wss: 176, level: 'C1 High' }, { wss: 175, level: 'C1 High' },
            { wss: 174, level: 'C1 Mid' }, { wss: 173, level: 'C1 Mid' }, { wss: 172, level: 'C1 Mid' },
            { wss: 171, level: 'C1 Low' }, { wss: 170, level: 'C1 Low' }, { wss: 169, level: 'C1 Low' },
            { wss: 168, level: 'B2 High' }, { wss: 167, level: 'B2 High' }, { wss: 166, level: 'B2 High' },
            { wss: 165, level: 'B2 Mid' }, { wss: 164, level: 'B2 Mid' }, { wss: 163, level: 'B2 Mid' },
            { wss: 162, level: 'B2 Low' }, { wss: 161, level: 'B2 Low' }, { wss: 160, level: 'B2 Low' },
            { wss: 159, level: 'B1 High' }, { wss: 158, level: 'B1 High' }, { wss: 157, level: 'B1 High' },
            { wss: 156, level: 'B1 Mid' }, { wss: 155, level: 'B1 Mid' }, { wss: 154, level: 'B1 Mid' },
            { wss: 153, level: 'B1 Low' }, { wss: 152, level: 'B1 Low' }, { wss: 151, level: 'B1 Low' },
            { wss: 150, level: 'A2 High' }, { wss: 149, level: 'A2 High' }, { wss: 148, level: 'A2 High' },
            { wss: 147, level: 'A2 Mid' }, { wss: 146, level: 'A2 Mid' }, { wss: 145, level: 'A2 Mid' },
            { wss: 144, level: 'A2 Low' }, { wss: 143, level: 'A2 Low' }, { wss: 142, level: 'A2 Low' },
            { wss: 141, level: 'A1 High' }, { wss: 140, level: 'A1 High' }, { wss: 139, level: 'A1 High' },
            { wss: 138, level: 'A1 Mid' }, { wss: 137, level: 'A1 Mid' }, { wss: 136, level: 'A1 Mid' },
            { wss: 135, level: 'A1 Low' }, { wss: 134, level: 'A1 Low' }, { wss: 133, level: 'A1 Low' },
            { wss: 132, level: 'pre-A1 High' }, { wss: 131, level: 'pre-A1 High' }, { wss: 130, level: 'pre-A1 High' },
            { wss: 129, level: 'pre-A1 Mid' }, { wss: 128, level: 'pre-A1 Mid' }, { wss: 127, level: 'pre-A1 Mid' },
            { wss: 126, level: 'pre-A1 Low' }, { wss: 125, level: 'pre-A1 Low' }, { wss: 124, level: 'pre-A1 Low' },
            { wss: 123, level: 'pre-A1 Low' }, { wss: 122, level: 'pre-A1 Low' }, { wss: 121, level: 'pre-A1 Low' },
            { wss: 120, level: 'pre-A1 Low' }, { wss: 119, level: 'pre-A1 Low' }, { wss: 118, level: 'pre-A1 Low' },
            { wss: 117, level: 'pre-A1 Low' }, { wss: 116, level: 'pre-A1 Low' }, { wss: 115, level: 'pre-A1 Low' },
            { wss: 114, level: 'pre-A1 Low' }, { wss: 113, level: 'pre-A1 Low' }, { wss: 112, level: 'pre-A1 Low' },
            { wss: 111, level: 'pre-A1 Low' }, { wss: 110, level: 'pre-A1 Low' }, { wss: 109, level: 'pre-A1 Low' },
            { wss: 108, level: 'pre-A1 Low' }, { wss: 107, level: 'pre-A1 Low' }, { wss: 106, level: 'pre-A1 Low' },
            { wss: 105, level: 'pre-A1 Low' }, { wss: 104, level: 'pre-A1 Low' }, { wss: 103, level: 'pre-A1 Low' },
            { wss: 102, level: 'pre-A1 Low' }, { wss: 101, level: 'pre-A1 Low' }, { wss: 100, level: 'pre-A1 Low' },
            { wss: 99, level: 'pre-A1 Low' }, { wss: 98, level: 'pre-A1 Low' }, { wss: 97, level: 'pre-A1 Low' },
            { wss: 96, level: 'pre-A1 Low' }, { wss: 95, level: 'pre-A1 Low' }, { wss: 94, level: 'pre-A1 Low' },
            { wss: 93, level: 'pre-A1 Low' }, { wss: 92, level: 'pre-A1 Low' }, { wss: 91, level: 'pre-A1 Low' },
            { wss: 90, level: 'pre-A1 Low' }, { wss: 89, level: 'pre-A1 Low' }, { wss: 88, level: 'pre-A1 Low' },
            { wss: 87, level: 'pre-A1 Low' }, { wss: 86, level: 'pre-A1 Low' }, { wss: 85, level: 'pre-A1 Low' },
            { wss: 84, level: 'pre-A1 Low' }, { wss: 83, level: 'pre-A1 Low' }, { wss: 82, level: 'pre-A1 Low' },
            { wss: 81, level: 'pre-A1 Low' }, { wss: 80, level: 'pre-A1 Low' }, { wss: 79, level: 'pre-A1 Low' },
            { wss: 78, level: 'pre-A1 Low' }, { wss: 77, level: 'pre-A1 Low' }, { wss: 76, level: 'pre-A1 Low' },
            { wss: 75, level: 'pre-A1 Low' }, { wss: 74, level: 'pre-A1 Low' }, { wss: 73, level: 'pre-A1 Low' },
            { wss: 72, level: 'pre-A1 Low' }, { wss: 71, level: 'pre-A1 Low' }, { wss: 70, level: 'pre-A1 Low' },
            { wss: 69, level: 'pre-A1 Low' }, { wss: 68, level: 'pre-A1 Low' }, { wss: 67, level: 'pre-A1 Low' },
            { wss: 66, level: 'pre-A1 Low' }, { wss: 65, level: 'pre-A1 Low' }, { wss: 64, level: 'pre-A1 Low' },
            { wss: 63, level: 'pre-A1 Low' }, { wss: 62, level: 'pre-A1 Low' }, { wss: 61, level: 'pre-A1 Low' },
            { wss: 60, level: 'pre-A1 Low' }, { wss: 59, level: 'pre-A1 Low' }, { wss: 58, level: 'pre-A1 Low' },
            { wss: 57, level: 'pre-A1 Low' }, { wss: 56, level: 'pre-A1 Low' }, { wss: 55, level: 'pre-A1 Low' },
            { wss: 54, level: 'pre-A1 Low' }, { wss: 53, level: 'pre-A1 Low' }, { wss: 52, level: 'pre-A1 Low' },
            { wss: 51, level: 'pre-A1 Low' }, { wss: 50, level: 'pre-A1 Low' }, { wss: 49, level: 'pre-A1 Low' },
            { wss: 48, level: 'pre-A1 Low' }, { wss: 47, level: 'pre-A1 Low' }, { wss: 46, level: 'pre-A1 Low' },
            { wss: 45, level: 'pre-A1 Low' }, { wss: 44, level: 'pre-A1 Low' }, { wss: 43, level: 'pre-A1 Low' },
            { wss: 42, level: 'pre-A1 Low' }, { wss: 41, level: 'pre-A1 Low' }, { wss: 40, level: 'pre-A1 Low' },
            { wss: 39, level: 'pre-A1 Low' }, { wss: 38, level: 'pre-A1 Low' }, { wss: 37, level: 'pre-A1 Low' },
            { wss: 36, level: 'pre-A1 Low' }, { wss: 35, level: 'pre-A1 Low' }, { wss: 34, level: 'pre-A1 Low' },
            { wss: 33, level: 'pre-A1 Low' }, { wss: 32, level: 'pre-A1 Low' }, { wss: 31, level: 'pre-A1 Low' },
            { wss: 30, level: 'pre-A1 Low' }, { wss: 29, level: 'pre-A1 Low' }, { wss: 28, level: 'pre-A1 Low' },
            { wss: 27, level: 'pre-A1 Low' }, { wss: 26, level: 'pre-A1 Low' }, { wss: 25, level: 'pre-A1 Low' },
            { wss: 24, level: 'pre-A1 Low' }, { wss: 23, level: 'pre-A1 Low' }, { wss: 22, level: 'pre-A1 Low' },
            { wss: 21, level: 'pre-A1 Low' }, { wss: 20, level: 'pre-A1 Low' }, { wss: 19, level: 'pre-A1 Low' },
            { wss: 18, level: 'pre-A1 Low' }, { wss: 17, level: 'pre-A1 Low' }, { wss: 16, level: 'pre-A1 Low' },
            { wss: 15, level: 'pre-A1 Low' }, { wss: 14, level: 'pre-A1 Low' }, { wss: 13, level: 'pre-A1 Low' },
            { wss: 12, level: 'pre-A1 Low' }, { wss: 11, level: 'pre-A1 Low' },
            { wss: 10, level: 'pre-A1 Low' }, { wss: 9, level: 'N/A' },
            { wss: 8, level: 'N/A' }, { wss: 7, level: 'N/A' },
            { wss: 6, level: 'N/A' }, { wss: 5, level: 'N/A' },
            { wss: 4, level: 'N/A' }, { wss: 3, level: 'N/A' },
            { wss: 2, level: 'N/A' }, { wss: 1, level: 'N/A' }, { wss: 0, level: 'N/A' }
        ];
    }

    async init() {
        await this.loadInitialProgress();
        await this.fetchQuestions();
    }

    async loadInitialProgress() {
        // Здесь можно реализовать загрузку начального прогресса, если необходимо
    }

    saveProgress(stage) {
        localStorage.setItem(`progress_${stage}`, JSON.stringify({
            currentLevel: this.currentLevel,
            currentStage: this.currentStage,
            questionIndex: this.questionIndex,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel
        }));
    }

    loadProgress(stage) {
        const progress = JSON.parse(localStorage.getItem(`progress_${stage}`));
        if (progress) {
            this.currentLevel = progress.currentLevel;
            this.currentStage = progress.currentStage;
            this.questionIndex = progress.questionIndex;
            this.correctCount = progress.correctCount;
            this.incorrectCount = progress.incorrectCount;
            this.totalQuestions = progress.totalQuestions;
            this.correctHigherLevel = progress.correctHigherLevel || 0;
            this.incorrectLowerLevel = progress.incorrectLowerLevel || 0;
        }
    }

    getRandomQuestion(questions) {
        return questions[Math.floor(Math.random() * questions.length)];
    }

    loadQuestion() {
        const currentQuestions = this.questions[this.currentStage].filter(q => q.level === this.currentLevel);
        if (!currentQuestions.length) {
            console.error('Нет доступных вопросов для текущего уровня и этапа.');
            this.questionContainer.innerHTML = `<p>Нет доступных вопросов для текущего уровня и этапа.</p>`;
            return;
        }

        const question = this.getRandomQuestion(currentQuestions);
        this.questionContainer.innerHTML =
            `<p>${question.question}</p>
            ${question.audio ? `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>` : ''}
            <ul>
                ${question.answers.map((answer, index) => `<li><label><input type="radio" name="answer" value="${index}"> ${answer}</label></li>`).join('')}
            </ul>`;

        if (this.totalQuestions === 6) {
            this.submitBtn.style.display = 'none';
            this.finishBtn.style.display = 'block';
        } else {
            this.submitBtn.style.display = 'block';
            this.finishBtn.style.display = 'none';
        }
    }

    startListeningStage() {
        this.currentStage = 'listening';
        this.currentLevel = 1;
        this.questionIndex = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.saveProgress('listening');
        this.loadQuestion();
    }

    async sendProgress(stage) {
        try {
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stage: stage,
                    currentLevel: this.currentLevel,
                    questionIndex: this.questionIndex,
                    correctCount: this.correctCount,
                    totalQuestions: this.totalQuestions,
                    userLogin: this.user.login
                })
            });
            const data = await response.json();
            if (response.ok) {
                console.log('Прогресс обновлен:', data);
            } else {
                console.error('Ошибка при обновлении прогресса:', data);
            }
        } catch (err) {
            console.error('Ошибка при отправке прогресса:', err);
        }
    }

    finishTest() {
        // Определяем целевой уровень
        const targetLevel = this.currentLevel;

        // Вычисляем сдвиг по шкале WSS
        const shift = this.correctCount + this.correctHigherLevel - this.incorrectLowerLevel;

        // Находим минимальное значение WSS для целевого уровня
        const minWssForTargetLevel = this.getMinWssForLevel(targetLevel);

        // Расчет итогового балла
        let finalWss = minWssForTargetLevel + shift;

        // Ограничиваем итоговый балл в пределах шкалы
        finalWss = Math.max(0, Math.min(180, finalWss));

        // Находим уровень по итоговому баллу
        const finalLevel = this.getLevelByWss(finalWss);

        alert(`Ваш результат: ${finalLevel} (WSS: ${finalWss})`);

        if (this.currentStage === 'reading') {
            this.startListeningStage();
        } else {
            // Тест завершен на обоих этапах
            alert('Тест завершен. Спасибо за прохождение!');
        }
    }

    handleSubmit() {
        const selectedAnswer = document.querySelector('input[name="answer"]:checked');
        if (!selectedAnswer) {
            alert('Пожалуйста, выберите ответ.');
            return;
        }

        const currentQuestions = this.questions[this.currentStage].filter(q => q.level === this.currentLevel);
        const question = this.getRandomQuestion(currentQuestions);

        if (!question) {
            alert('Вопрос не найден.');
            return;
        }

        if (parseInt(selectedAnswer.value) === question.correct) {
            this.correctCount++;
            // Если есть уровень выше, увеличиваем счетчик правильных ответов на уровне выше
            if (this.currentLevel < this.getMaxLevel()) {
                this.correctHigherLevel++;
            }
        } else {
            this.incorrectCount++;
            // Если есть уровень ниже, увеличиваем счетчик неправильных ответов на уровне ниже
            if (this.currentLevel > 1) {
                this.incorrectLowerLevel++;
            }
        }

        this.totalQuestions++;

        // Проверяем, достигли ли мы 6 вопросов
        if (this.totalQuestions >= 6) {
            this.finishTest();
            return;
        }

        this.loadQuestion();
        this.saveProgress(this.currentStage);
        this.sendProgress(this.currentStage);
    }

    async fetchQuestions() {
        try {
            const response = await fetch('/api/questions');
            const data = await response.json();
            if (response.ok) {
                data.records.forEach(record => {
                    const question = {
                        level: parseInt(record.fields['Level']),
                        question: record.fields['Question'],
                        answers: record.fields['Answers'].split(',').map(ans => ans.trim()),
                        correct: parseInt(record.fields['Correct']),
                        audio: record.fields['Audio'] // URL аудио, если есть
                    };

                    if (record.fields['Stage'] === 'reading') {
                        this.questions.reading.push(question);
                    } else if (record.fields['Stage'] === 'listening') {
                        this.questions.listening.push(question);
                    }
                });

                this.loadProgress(this.currentStage);
                this.loadQuestion();
            } else {
                console.error('Ошибка при получении вопросов:', data.error);
                this.questionContainer.innerHTML = `<p>Не удалось загрузить вопросы. Пожалуйста, попробуйте позже.</p>`;
            }
        } catch (err) {
            console.error('Ошибка при получении вопросов:', err);
            this.questionContainer.innerHTML = `<p>Не удалось загрузить вопросы. Пожалуйста, попробуйте позже.</p>`;
        }
    }

    getMinWssForLevel(level) {
        const levels = ['pre-A1 Low', 'pre-A1 Mid', 'pre-A1 High', 'A1 Low', 'A1 Mid', 'A1 High',
            'A2 Low', 'A2 Mid', 'A2 High', 'B1 Low', 'B1 Mid', 'B1 High', 'B2 Low', 'B2 Mid',
            'B2 High', 'C1 Low', 'C1 Mid', 'C1 High', 'C2'];

        // Находим минимальный WSS для заданного уровня
        for (let i = 0; i < this.wssScale.length; i++) {
            if (this.wssScale[i].level === level) {
                return this.wssScale[i].wss;
            }
        }

        // Если уровень не найден, возвращаем 0
        return 0;
    }

    getLevelByWss(wss) {
        for (let i = 0; i < this.wssScale.length; i++) {
            if (this.wssScale[i].wss === wss) {
                return this.wssScale[i].level;
            }
        }
        return 'N/A';
    }

    getMaxLevel() {
        // Определяем максимальный уровень на основе шкалы WSS
        let maxLevel = 'pre-A1 Low';
        for (let i = 0; i < this.wssScale.length; i++) {
            if (['C2', 'C1 High', 'C1 Mid', 'C1 Low'].includes(this.wssScale[i].level)) {
                maxLevel = this.wssScale[i].level;
                break;
            }
        }
        return maxLevel;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});