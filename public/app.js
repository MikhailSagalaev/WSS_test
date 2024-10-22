// public/app.js

import User from './modules/User.js';
import ProgressManager from './modules/ProgressManager.js';
import QuestionLoader from './modules/QuestionLoader.js';
import QuestionRenderer from './modules/QuestionRenderer.js';
import Timer from './modules/Timer.js';

class TestApp {
    constructor() {
        // Initialize user
        this.user = new User();

        // Initialize progress manager
        this.progressManager = new ProgressManager(this.user);

        // Initialize question loader
        this.questionLoader = new QuestionLoader();

        // Initialize question renderer
        this.questionRenderer = new QuestionRenderer(this);

        // Initialize timer
        this.timer = new Timer(this);

        // Application state
        this.stages = ['reading', 'listening'];
        this.currentStageIndex = 0;
        this.currentLevel = 1;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.questions = { reading: [], listening: [] };
        this.currentQuestion = null;
        this.currentQuestionNumber = 0;

        // DOM Elements
        this.questionContainer = document.getElementById('question-container');
        this.submitBtn = document.getElementById('submit-btn');
        this.finishBtn = document.getElementById('finish-btn');
        this.submitBtn.disabled = true;
        this.questionInfo = document.getElementById('question-info');
        this.timerElement = document.getElementById('timer');

        // Event Listeners
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.finishBtn.addEventListener('click', () => this.resetProgress());

        // Initialize application
        this.init();
    }

    async init() {
        console.log("Инициализация приложения");

        try {
            await this.questionLoader.loadQuestions();
            this.questions = this.questionLoader.questions;
            await this.progressManager.loadProgress();
            await this.loadQuestion();
        } catch (error) {
            console.error("Ошибка при инициализации приложения:", error);
        }
    }

    async loadQuestion() {
        if (this.currentQuestion) {
            console.log("Текущий вопрос уже загружен, пропускаем загрузку нового вопроса");
            return;
        }

        if (this.currentStageIndex === undefined || this.currentLevel === undefined) {
            console.error("currentStageIndex или currentLevel не определены");
            return;
        }

        const currentStage = this.stages[this.currentStageIndex];
        console.log(`Загрузка вопроса для этапа: ${currentStage}, уровня: ${this.currentLevel}`);

        const questionsForStage = this.questions[currentStage];
        if (!questionsForStage || !Array.isArray(questionsForStage) || questionsForStage.length === 0) {
            console.error(`Нет вопросов для этапа ${currentStage}`);
            this.finishStage();
            return;
        }
        console.log(`Всего вопросов на этапе ${currentStage}: ${questionsForStage.length}`);

        const questionsForLevel = questionsForStage.filter(q => q.level === this.currentLevel);
        console.log(`Найдено вопросов на уровне ${this.currentLevel} для этапа ${currentStage}: ${questionsForLevel.length}`);

        if (questionsForLevel.length === 0) {
            console.error(`Нет вопросов на уровне ${this.currentLevel} для этапа ${currentStage}`);
            this.finishStage();
            return;
        }

        // Shuffle questions and select the next one
        this.currentQuestion = this.shuffleArray(questionsForLevel).pop();
        console.log("Текущий вопрос:", this.currentQuestion);

        if (this.currentQuestion) {
            this.currentQuestionNumber++;
            document.getElementById('question-number').textContent = `${this.currentQuestionNumber}`;
            this.updateQuestionInfo();
            this.timer.start(this.currentQuestion.timeLimit);
            this.questionRenderer.render(this.currentQuestion);
        } else {
            console.error("Не удалось загрузить вопрос");
            this.finishStage();
        }
    }

    shuffleArray(array) {
        // Fisher-Yates Shuffle
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    updateQuestionInfo() {
        const stage = this.stages[this.currentStageIndex];
        const questionType = this.currentQuestion.questionType;
        this.questionInfo.innerHTML = `
            <p><strong>Этап:</strong> ${stage}</p>
            <p><strong>Тип вопроса:</strong> ${questionType}</p>
        `;
    }

    getUserAnswer() {
        return this.questionRenderer.getUserAnswer();
    }

    checkAnswer(userAnswer) {
        return this.questionRenderer.checkAnswer(userAnswer);
    }

    handleSubmit(timeExpired = false) {
        if (this.timer) {
            this.timer.stop();
        }

        let isCorrect = false;

        if (!timeExpired) {
            const userAnswer = this.getUserAnswer();
            if (userAnswer === null) {
                return;
            }
            isCorrect = this.checkAnswer(userAnswer);
        }

        if (isCorrect) {
            this.correctCount++;
        } else {
            this.incorrectCount++;
        }

        this.totalQuestions++;

        console.log(`Ответ ${isCorrect ? 'правильный' : 'неправильный'}.`);

        this.progressManager.saveProgress({
            currentStageIndex: this.currentStageIndex,
            currentLevel: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions
        });

        if (this.totalQuestions >= 10) { // Example condition
            this.finishStage();
        } else {
            this.loadQuestion();
        }

        this.submitBtn.disabled = true;
    }

    async finishStage() {
        console.log(`Завершение этапа: ${this.stages[this.currentStageIndex]}`);

        // Reset counters for the next stage
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;

        // Move to the next stage or finish the test
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.progressManager.saveProgress({
                currentStageIndex: this.currentStageIndex,
                currentLevel: this.currentLevel
            });
            await this.loadQuestion();
        } else {
            this.finishTest();
        }
    }

    async finishTest() {
        // Send final results to the server
        await this.progressManager.sendFinalResults();

        this.showResults();

        this.resetProgress();
    }

    showResults() {
        this.questionContainer.innerHTML = `
            <h2>Результаты теста</h2>
            <p>Правильных ответов: ${this.correctCount}</p>
            <p>Неправильных ответов: ${this.incorrectCount}</p>
        `;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
    }

    resetProgress() {
        this.progressManager.resetProgress()
            .then(() => {
                // Reset local state
                this.currentStageIndex = 0;
                this.currentLevel = 1;
                this.correctCount = 0;
                this.incorrectCount = 0;
                this.totalQuestions = 0;
                this.currentQuestion = null;
                this.currentQuestionNumber = 0;

                // Reload the test
                this.init();
            })
            .catch(error => {
                console.error("Ошибка при сбросе прогресса:", error);
                alert("Произошла ошибка при сбросе прогресса. Пожалуйста, попробуйте ещё раз.");
            });
    }
}

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
});

    loadQuestions() {
        fetch('/api/questions')
        .then(response => response.json())
        .then(data => {
            console.log("Полученные данные вопросов:", JSON.stringify(data, null, 2));
            if (!Array.isArray(data)) {
                console.error("Некорректная структура данных вопросов:", data);
                return;
            }
            console.log("Вопросы загружены:", data.length);
            data.forEach(question => {
                const stage = question.fields.Stage || 'undefined';
                if (!this.questions[stage]) {
                    this.questions[stage] = [];
                }
                const audioUrl = question.fields.Audio;
                console.log(`Вопрос ${question.id}: Audio URL - ${audioUrl}`);
                this.questions[stage].push({
                    id: question.id,
                    stage: stage,
                    level: parseInt(question.fields.Level, 10),
                    questionType: question.fields["Question Type"],
                    question: question.fields.Question,
                    answers: question.fields.Answers ? question.fields.Answers.split(',').map(ans => ans.trim()) : [],
                    correct: question.fields.Correct,
                    audio: audioUrl,
                    matchPairs: question.fields.MatchPairs ? JSON.parse(question.fields.MatchPairs) : [],
                    timeLimit: question.fields.TimeLimit ? parseInt(question.fields.TimeLimit, 10) : null,
                    images: question.fields.Images ? question.fields.Images.map(img => img.url) : [],
                    imageAnswers: question.fields.ImageAnswers ? question.fields.ImageAnswers.split(',').map(ans => ans.trim()) : [],
                    sentenceWithGaps: question.fields.SentenceWithGaps || '',
                    gapAnswers: question.fields.GapAnswers ? question.fields.GapAnswers.split(',').map(ans => ans.trim()) : [],
                    wordOptions: question.fields.WordOptions ? question.fields.WordOptions.split(',').map(word => word.trim()) : []
                });
            });
            console.log("Загруженные вопросы:", this.questions);
        })
        .catch(error => {
            console.error("Ошибка при загрузке вопросов:", error);
        });
    }

    loadQuestion() {
        if (this.currentQuestion) {
            console.log("Текущий вопрос уже загружен, пропускаем загрузку нового вопроса");
            return;
        }

        if (this.currentStageIndex === undefined || this.currentLevel === undefined) {
            console.error("currentStageIndex или currentLevel не определены");
            return;
        }

        const currentStage = this.stages[this.currentStageIndex];
        console.log(`Загрузка вопроса для этапа: ${currentStage}, уровня: ${this.currentLevel}`);
        
        const questionsForStage = this.questions[currentStage];
        if (!questionsForStage || !Array.isArray(questionsForStage) || questionsForStage.length === 0) {
            console.error(`Нет вопросов для этапа ${currentStage}`);
            this.finishStage();
            return;
        }
        console.log(`Всего вопросов на этапе ${currentStage}: ${questionsForStage.length}`);

        const questionsForLevel = questionsForStage.filter(q => {
            const questionLevel = typeof q.level === 'string' ? parseInt(q.level, 10) : q.level;
            return questionLevel === this.currentLevel;
        });
        console.log(`Найдено вопросов на уровне ${this.currentLevel} для этапа ${currentStage}: ${questionsForLevel.length}`);

        if (questionsForLevel.length === 0) {
            console.error(`Нет вопросов на уровне ${this.currentLevel} для этапа ${currentStage}`);
            this.finishStage();
            return;
        }

        // Перемешаем вопросы для текущего уровня
        const shuffledQuestions = this.shuffleArray([...questionsForLevel]);
        this.currentQuestion = shuffledQuestions.pop();
        console.log("Текущий вопрос:", this.currentQuestion);

        if (this.currentQuestion) {
            this.currentQuestionNumber++;
            document.getElementById('question-number').textContent = `${this.currentQuestionNumber}`;
            this.updateQuestionInfo();
            this.startTimer();
            this.renderQuestion(this.currentQuestion);
        } else {
            console.error("Не удалось загрузить вопрос");
            this.finishStage();
        }
    }

    updateQuestionInfo() {
        const questionInfoElement = document.getElementById('question-info');
        if (!questionInfoElement) {
            console.error("Элемент question-info не найден");
            return;
        }
        const stage = this.stages[this.currentStageIndex];
        const questionType = this.currentQuestion.questionType;
        questionInfoElement.innerHTML = `
            <p><strong>Этап:</strong> ${stage}</p>
            <p><strong>Тип вороса:</strong> ${questionType}</p>
        `;
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        const timeLimit = this.currentQuestion.timeLimit;
        if (!timeLimit) {
            this.timerElement.textContent = '';
            return;
        }

        this.timeLeft = timeLimit;
        this.updateTimerDisplay();

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleSubmit(true); // true означает, что время истекло
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    renderQuestion(question) {
        console.log("Рендеринг вопроса:", question);
        if (!this.questionContainer) {
            console.error("Элемент questionContainer не найден");
            return;
        }
        this.questionContainer.innerHTML = '';

        // Обновляем номер вопроса
        const totalQuestions = JSON.parse(localStorage.getItem('testProgress'))?.totalQuestions || 0;
        document.getElementById('question-number').textContent = `${totalQuestions + 1}`;

        // Добавляем аудио, если оно есть
        if (question.fields.Audio) {
            const audioElement = document.createElement('audio');
            audioElement.src = question.fields.Audio;
            audioElement.controls = true;
            this.questionContainer.appendChild(audioElement);
        } else {
            // Скрываем аудио-плеер или показываем альтернативный контент
            console.log("Аудио отсутствует для данного вопроса.");
        }

        // Добавляем текст вопроса
        const questionTitle = document.createElement('h3');
        questionTitle.className = 'question-title';
        questionTitle.textContent = question.fields.Question; // Убедитесь, что используете правильное поле
        this.questionContainer.appendChild(questionTitle);

        // Обработка типа вопроса
        if (question.fields["Question Type"] === 'multiple-choice') {
            this.renderMultipleChoiceQuestion(question);
        } else if (question.fields["Question Type"] === 'matching') {
            this.renderMatchingQuestion(question);
        } else if (question.fields["Question Type"] === 'typeImg') {
            this.renderTypeImgQuestion(question);
        } else if (question.fields["Question Type"] === 'typing') {
            this.renderTypingQuestion(question);
        } else if (question.fields["Question Type"] === 'matchingWords') {
            this.renderMatchingWordsQuestion(question);
        } else {
            console.error("Неизвестный тип вопроса:", question.fields["Question Type"]);
        }

        // Обновление информации о вопросе
        this.updateQuestionInfo();
    }

    renderMultipleChoiceQuestion(question) {
        const html = `
            <h2 class="question-title">${question.question}</h2>
            ${question.audio ? `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>` : ''}
            <div class="answers-container">
                ${question.answers.map((answer, index) => `
                    <div class="answer-option" data-index="${index}">
                        ${answer}
                    </div>
                `).join('')}
            </div>
        `;
        this.questionContainer.innerHTML = html;

        const answerOptions = this.questionContainer.querySelectorAll('.answer-option');
        answerOptions.forEach(option => {
            option.addEventListener('click', () => {
                answerOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.submitBtn.disabled = false;
            });
        });
    }

    renderMatchingQuestion(question) {
        console.log("Рендеринг matching вопроа");
        
        let pairs;
        try {
            pairs = typeof question.matchPairs === 'string' ? JSON.parse(question.matchPairs) : question.matchPairs;
        } catch (error) {
            console.error("Ошибка при парсинге matchPairs:", error);
            pairs = [];
        }

        if (!Array.isArray(pairs) || pairs.length === 0) {
            this.questionContainer.innerHTML = `<p>Некорректные данные для сопоставления.</p>`;
            return;
        }

        let html = `
            <div class="matching-question">
                <div class="images-column">
                    ${pairs.map((pair, index) => `
                        <div class="image-item">
                            <img src="${pair.image}" alt="Image ${index + 1}">
                            <div class="drop-zone" data-image="${pair.image}"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="words-column">
                    <div class="words-list">
                        ${pairs.map(pair => `
                            <div class="word-item" draggable="true" data-word="${pair.option}">${pair.option}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.questionContainer.innerHTML = html;

        // Инициализация Drag-and-Drop
        this.initializeDragAndDrop();
    }

    initializeDragAndDrop() {
        const draggableElements = this.questionContainer.querySelectorAll('.word-item');
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');

        // Добавим эту функцию внутри initializeDragAndDrop
        const checkAllMatched = () => {
            const allDropZones = this.questionContainer.querySelectorAll('.drop-zone');
            const allMatched = Array.from(allDropZones).every(zone => zone.querySelector('.word-item'));
            this.submitBtn.disabled = !allMatched;
        };

        draggableElements.forEach(elem => {
            elem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', elem.getAttribute('data-word'));
                elem.classList.add('dragging');
            });

            elem.addEventListener('dragend', () => {
                elem.classList.remove('dragging');
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const word = e.dataTransfer.getData('text/plain');
                const wordElement = this.questionContainer.querySelector(`.word-item[data-word="${word}"]`);
                
                if (wordElement && !zone.querySelector('.word-item')) {
                    zone.appendChild(wordElement);
                    wordElement.setAttribute('draggable', 'false');
                    wordElement.style.cursor = 'default';
                    checkAllMatched(); // Проверяем, все ли сопоставлено
                }
            });
        });

        // Вызовем функцию в конце initializeDragAndDrop
        checkAllMatched();
    }

    renderTypeImgQuestion(question) {
        let html = `<div class="type-img-question">`;
        question.images.forEach((img, index) => {
            html += `
                <div class="image-answer-pair">
                    <img src="${img}" alt="Image ${index + 1}">
                    <input type="text" class="image-answer" data-index="${index}">
                </div>
            `;
        });
        html += `</div>`;
        this.questionContainer.innerHTML = html;
        this.checkAllInputsFilled();
    }

    renderTypingQuestion(question) {
        const words = question.sentenceWithGaps.split('_');
        let html = `<div class="typing-question">`;
        words.forEach((word, index) => {
            html += word;
            if (index < words.length - 1) {
                html += `<input type="text" class="gap-answer" data-index="${index}">`;
            }
        });
        html += `</div>`;
        this.questionContainer.innerHTML = html;
        this.checkAllInputsFilled();
    }

    // Метод для отправки финальных результатов на сервер
    sendFinalResults() {
        if (!this.stagesResults) {
            this.stagesResults = [];
        }

        const stageResult = {
            stage: this.stages[this.currentStageIndex],
            targetLevel: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel
            // Добавьте дополнительные поля, если необходимо
        };

        this.stagesResults.push(stageResult);

        console.log("Отправка финальных результатов:", stageResult);

        // Пример отправки результатов на сервер
        const completionData = {
            userLogin: this.user.login,
            stagesResults: this.stagesResults,
            finishDate: new Date().toISOString()
        };

        console.log("Отправляемые данные завершения:", completionData);

        fetch('/api/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошибка при завершении теста:", data.error);
            } else {
                console.log("Тест успешно завершён:", data);
            }
        })
        .catch(err => {
            console.error("Ошибка при завершении теста:", err);
        });
    }

    // Доплнительно, давайте изменим обработку ошибок в клиентском коде:

    showResults() {
        const finalResults = this.stagesResults.map(result => {
            return `
                <h3>Этап: ${result.stage}</h3>
                <p>Целевой уровень: ${result.targetLevel}</p>
                <p>Правильных ответов: ${result.correctCount}</p>
                <p>Неправильных отвтов: ${result.incorrectCount}</p>
            `;
        }).join('');

        this.questionContainer.innerHTML = `
            <h2>Резултаты теста</h2>
            ${finalResults}
        `;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
    }

    shuffleArray(array) {
        // Фунция для перемешивания массива
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Логика для вычисления итогового уровня на основе WSS
    calculateFinalLevel(wss) {
        for (const scale of this.wssScale) {
            if (wss >= scale.wss) {
                return scale.level;
            }
        }
        return 'Неизвестный уровень';
    }

    finalizeTest() {
        // Предполагается, что метод computeFinalWss выисляет итогоый WSS
        const finalWss = this.computeFinalWss();
        const finalLevel = this.calculateFinalLevel(finalWss);
        console.log(`Итоговый WSS: ${finalWss}, Уровень: ${finalLevel}`);
        this.questionContainer.innerHTML = `<p>Ваш итоговый уровень: ${finalLevel}</p>`;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
        
        // Отправка результатов на сервер
        const completionData = {
            userLogin: this.user.login,
            stagesResults: this.stagesResults,
            finishDate: new Date().toISOString(),
            finalWss: finalWss,
            finalLevel: finalLevel
        };

        fetch('/api/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошибка при завершении теста:", data.error);
            } else {
                console.log("Тест успешно завершён:", data);
            }
        })
        .catch(err => {
            console.error("Ошибка при завершении теста:", err);
        });
    }

    sendResultsToAirtable() {
        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_STORY_TABLE } = process.env;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

        const stagesResults = this.stages.map((stage, index) => ({
            Stage: stage,
            CorrectCount: this.stagesResults[index].correctCount,
            IncorrectCount: this.stagesResults[index].incorrectCount,
            TotalQuestions: this.stagesResults[index].totalQuestions,
            TargetLevel: this.currentLevel
        }));

        const data = {
            fields: {
                UserLogin: this.user.login,
                FinishDate: new Date(),
                StagesResults: stagesResults.map(result => ({id: result.Stage})) // Only send IDs for linked records
            }
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Результаты успешно отправлены в Airtable:', result);
        })
        .catch(error => {
            console.error('Ошибка при отправке результатов в Airtable:', error);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});

    // Метод для отправки финальных результатов на сервер
    sendFinalResults() {
        if (!this.stagesResults) {
            this.stagesResults = [];
        }

        const stageResult = {
            stage: this.stages[this.currentStageIndex],
            targetLevel: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel
            // Добавьте дополнительные поля, если необходимо
        };

        this.stagesResults.push(stageResult);

        console.log("Отправка финальных результатов:", stageResult);

        // Пример отправки результатов на сервер
        const completionData = {
            userLogin: this.user.login,
            stagesResults: this.stagesResults,
            finishDate: new Date().toISOString()
        };

        console.log("Отправляемые данные завершения:", completionData);

        fetch('/api/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошибка при завершении теста:", data.error);
            } else {
                console.log("Тест успешно завершён:", data);
            }
        })
        .catch(err => {
            console.error("Ошибка при завершении теста:", err);
        });
    }

    // Доплнительно, давайте изменим обработку ошибок в клиентском коде:

    showResults() {
        const finalResults = this.stagesResults.map(result => {
            return `
                <h3>Этап: ${result.stage}</h3>
                <p>Целевой уровень: ${result.targetLevel}</p>
                <p>Правильных ответов: ${result.correctCount}</p>
                <p>Неправильных отвтов: ${result.incorrectCount}</p>
            `;
        }).join('');

        this.questionContainer.innerHTML = `
            <h2>Резултаты теста</h2>
            ${finalResults}
        `;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
    }

    shuffleArray(array) {
        // Фунция для перемешивания массива
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Логика для вычисления итогового уровня на основе WSS
    calculateFinalLevel(wss) {
        for (const scale of this.wssScale) {
            if (wss >= scale.wss) {
                return scale.level;
            }
        }
        return 'Неизвестный уровень';
    }

    finalizeTest() {
        // Предполагается, что метод computeFinalWss выисляет итогоый WSS
        const finalWss = this.computeFinalWss();
        const finalLevel = this.calculateFinalLevel(finalWss);
        console.log(`Итоговый WSS: ${finalWss}, Уровень: ${finalLevel}`);
        this.questionContainer.innerHTML = `<p>Ваш итоговый уровень: ${finalLevel}</p>`;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
        
        // Отправка результатов на сервер
        const completionData = {
            userLogin: this.user.login,
            stagesResults: this.stagesResults,
            finishDate: new Date().toISOString(),
            finalWss: finalWss,
            finalLevel: finalLevel
        };

        fetch('/api/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошибка при завершении теста:", data.error);
            } else {
                console.log("Тест успешно завершён:", data);
            }
        })
        .catch(err => {
            console.error("Ошибка при завершении теста:", err);
        });
    }

    sendResultsToAirtable() {
        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_STORY_TABLE } = process.env;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

        const stagesResults = this.stages.map((stage, index) => ({
            Stage: stage,
            CorrectCount: this.stagesResults[index].correctCount,
            IncorrectCount: this.stagesResults[index].incorrectCount,
            TotalQuestions: this.stagesResults[index].totalQuestions,
            TargetLevel: this.currentLevel
        }));

        const data = {
            fields: {
                UserLogin: this.user.login,
                FinishDate: new Date(),
                StagesResults: stagesResults.map(result => ({id: result.Stage})) // Only send IDs for linked records
            }
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Результаты успешно отправлены в Airtable:', result);
        })
        .catch(error => {
            console.error('Ошибка при отправке результатов в Airtable:', error);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});

