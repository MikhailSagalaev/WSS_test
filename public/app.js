const CONFIG = {
    API_BASE_URL: 'https://wss-test-five.vercel.app',
    STORAGE_KEY: 'tilda_members_profile5854123'
};

// public/app.js

class TestApp {
    constructor() {
        this.API_BASE_URL = 'https://wss-test-five.vercel.app'; // Базовый URL для всех API-запросов
        this.isInitialized = false;
        this.stages = ['reading', 'listening'];
        this.initializeElements();
        this.loadProgressFromLocalStorage();
        this.progressLoaded = false;
        this.submitBtn = document.getElementById('submit-btn');
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.questionNumber = 1;
        this.questionNumberElement = document.getElementById('question-number');
        this.stagesResults = [];
        this.levels = ['pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        this.currentLevelIndex = 0;
        this.questionsInCurrentSeries = 0;
        this.correctInCurrentSeries = 0;
        this.questionsOnCurrentLevel = 0;
        this.correctOnCurrentLevel = 0;
        this.correctOnHigherLevel = 0;
        this.incorrectOnLowerLevel = 0;
        this.targetLevel = null;
        this.updateQuestionNumber();
        this.currentQuestion = null;
        this.currentQuestionType = null;
        this.currentStageElement = document.getElementById('current-stage');
        this.answeredQuestions = new Set();
        this.currentQuestionId = null;
        this.hideTestElements();
    }

    initializeElements() {
        this.questionContainer = document.getElementById('question-container');
        this.submitBtn = document.getElementById('submit-btn');
        this.timerElement = document.getElementById('timer');
        
        if (!this.questionContainer) {
            console.error("Question container not found in the DOM");
        }
        if (!this.submitBtn) {
            console.error("Submit button not found in the DOM");
        }
        if (!this.timerElement) {
            console.error("Timer element not found in the DOM");
        }
    }

    async init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
    
        this.setUser();
    
        if (this.userNotAuthorized) {
            this.showUnavailableMessage("Пожалуйста, войдите в систему для прохождения теста.");
            return;
        }
    
        try {
            await this.checkTestAvailability();
            await this.loadProgressFromAirtable();
            await this.loadQuestions();
            
            this.showStartButton();
        } catch (error) {
            console.error("Error during initialization:", error);
            this.showUnavailableMessage("Произошла ошибка при инициализации теста. Пожалуйста, попробуйте позже или свяжитесь с администратором.");
        }
    }
    

    showUnavailableMessage(message) {
        if (this.questionContainer) {
            this.questionContainer.innerHTML = `
                <div class="unavailable-message">
                    <p>${message}</p>
                    <a href="https://t.me/@mixadev" target="_blank">Связаться с администратором</a>
                </div>
            `;
        }
        
        if (this.submitBtn) {
            this.submitBtn.style.display = 'none';
        }
    }

    async checkTestAvailability() {
        console.log("Проверка доступности теста");
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/checkTestAvailability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userLogin: this.user.login })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Ошибка от сервера:", errorData);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Результат проверки доступности:", data);

            if (!data.available) {
                this.showUnavailableMessage("Тест в данный момент недоступен.");
                throw new Error("Test not available");
            }
        } catch (error) {
            console.error("Ошибка при проверке доступности теста:", error);
            throw error;
        }
    }

    async loadProgressFromAirtable() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/progress?userLogin=${encodeURIComponent(this.user.login)}`);
            const data = await response.json();
            
            console.log("Прогресс получен из Airtable:", data);

            if (data && data.progress) {
                const progress = data.progress;
                
                // Проверяем статус теста
                if (progress.Status === 'Completed') {
                    // Если тест был завершен, начинаем новый
                    this.correctCount = 0;
                    this.incorrectCount = 0;
                    this.totalQuestions = 0;
                    this.correctHigherLevel = 0;
                    this.incorrectLowerLevel = 0;
                    this.questionsOnCurrentLevel = 0;
                    this.currentStageIndex = 0;
                    this.currentLevelIndex = 0;
                    this.answeredQuestions = new Set();
                    this.currentQuestionId = null;
                    
                    console.log("Предыдущий тест был завершен, начинаем новый");
                    return true;
                }
                
                // Если тест не был завершен (Status = 'In Progress'), восстанавливаем прогресс
                this.correctCount = progress.CorrectCount || 0;
                this.incorrectCount = progress.IncorrectCount || 0;
                this.totalQuestions = progress.TotalQuestions || 0;
                this.correctHigherLevel = progress.CorrectHigherLevel || 0;
                this.incorrectLowerLevel = progress.IncorrectLowerLevel || 0;
                this.questionsOnCurrentLevel = progress.QuestionsOnCurrentLevel || 0;
                this.currentStageIndex = this.stages.indexOf(progress.Stage);
                this.currentLevelIndex = this.levels.indexOf(progress.Level);
                
                this.questionNumber = this.totalQuestions + 1;
                this.updateQuestionNumber();
                
                if (progress.CurrentQuestionId) {
                    this.currentQuestionId = progress.CurrentQuestionId;
                    console.log("Восстановлен ID вопроса:", this.currentQuestionId);
                }
                
                if (progress.AnsweredQuestions) {
                    this.answeredQuestions = new Set(progress.AnsweredQuestions ? JSON.parse(progress.AnsweredQuestions) : []);
                    console.log("Восстановлены отвеченные вопросы:", this.answeredQuestions);
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error("Ошибка при загрузке прогресса:", error);
            return false;
        }
    }

    setProgress(progress) {
        this.currentStageIndex = this.stages.indexOf(progress.stage);
        this.currentLevel = progress.currentLevel;
        this.currentLevelIndex = this.levels.indexOf(progress.currentLevel);
        this.correctCount = progress.correctCount || 0;
        this.incorrectCount = progress.incorrectCount || 0;
        this.totalQuestions = progress.totalQuestions || 0;
        this.correctHigherLevel = progress.correctHigherLevel || 0;
        this.incorrectLowerLevel = progress.incorrectLowerLevel || 0;
        this.questionsOnCurrentLevel = progress.questionsOnCurrentLevel || 0;
        this.currentQuestionId = progress.currentQuestionId;
        this.answeredQuestions = new Set(progress.answeredQuestions || []);
    }

    setInitialProgress() {
        this.currentStageIndex = 0;
        this.currentLevel = 1;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
    }

    // Метод дя схранения прогресса в localStorage
    saveProgressToLocalStorage() {
        const progress = {
            stage: this.stages[this.currentStageIndex],
            currentStageIndex: this.currentStageIndex,
            currentLevel: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            groupCorrectAnswers: this.groupCorrectAnswers,
            groupTotalAnswers: this.groupTotalAnswers,
            groupsAnswered: this.groupsAnswered,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel,
            currentLevelIndex: this.currentLevelIndex,
            answeredQuestions: Array.from(this.answeredQuestions),
            currentQuestionId: this.currentQuestionId
        };
        localStorage.setItem('testProgress', JSON.stringify(progress));
        console.log("Прогресс сохранён в localStorage:", progress);
    }

    loadProgressFromLocalStorage() {
        const savedProgress = JSON.parse(localStorage.getItem('testProgress'));
        if (savedProgress) {
            this.currentStageIndex = savedProgress.currentStageIndex ?? 0;
            this.currentLevel = savedProgress.currentLevel ?? 1;
            this.correctCount = savedProgress.correctCount ?? 0;
            this.incorrectCount = savedProgress.incorrectCount ?? 0;
            this.totalQuestions = savedProgress.totalQuestions ?? 0;
            this.correctHigherLevel = savedProgress.correctHigherLevel ?? 0;
            this.incorrectLowerLevel = savedProgress.incorrectLowerLevel ?? 0;
            this.groupCorrectAnswers = savedProgress.groupCorrectAnswers ?? 0;
            this.groupTotalAnswers = savedProgress.groupTotalAnswers ?? 0;
            this.groupsAnswered = savedProgress.groupsAnswered ?? 0;
            this.questionsOnCurrentLevel = savedProgress.questionsOnCurrentLevel ?? 0;
            this.currentLevelIndex = savedProgress.currentLevelIndex ?? 0;
            this.answeredQuestions = new Set(savedProgress.answeredQuestions || []);
            this.currentQuestionId = savedProgress.currentQuestionId;
            if (!this.stages) {
                console.error("Stages are not initialized.");
                this.currentStageIndex = 0; 
            } else {
                this.currentStageIndex = this.stages.indexOf(savedProgress.stage) !== -1 ? this.stages.indexOf(savedProgress.stage) : 0;
            }

            console.log("Прогресс загружен из localStorage:", savedProgress);
        } else {
            console.log("Нет сохранённого прогресса в localStorage. Начинаем новый тест.");
            this.currentStageIndex = 0;
            this.currentLevel = 1;
        }
    }

    initializeWssScale() {
        return [
            { level: 'C2', minWss: 172, maxWss: 180 },
            { level: 'C1 High', minWss: 163, maxWss: 171 },
            { level: 'C1 Mid', minWss: 154, maxWss: 162 },
            { level: 'C1 Low', minWss: 145, maxWss: 153 },
            { level: 'B2 High', minWss: 136, maxWss: 144 },
            { level: 'B2 Mid', minWss: 127, maxWss: 135 },
            { level: 'B2 Low', minWss: 118, maxWss: 126 },
            { level: 'B1 High', minWss: 109, maxWss: 117 },
            { level: 'B1 Mid', minWss: 100, maxWss: 108 },
            { level: 'B1 Low', minWss: 91, maxWss: 99 },
            { level: 'A2 High', minWss: 82, maxWss: 90 },
            { level: 'A2 Mid', minWss: 73, maxWss: 81 },
            { level: 'A2 Low', minWss: 64, maxWss: 72 },
            { level: 'A1 High', minWss: 55, maxWss: 63 },
            { level: 'A1 Mid', minWss: 46, maxWss: 54 },
            { level: 'A1 Low', minWss: 37, maxWss: 45 },
            { level: 'pre-A1 High', minWss: 28, maxWss: 36 },
            { level: 'pre-A1 Mid', minWss: 19, maxWss: 27 },
            { level: 'pre-A1 Low', minWss: 10, maxWss: 18 },
            { level: 'N/A', minWss: 0, maxWss: 9 }
        ];
    }

    loadProgressOnce() {
        if (!this.progressLoaded) {
            this.progressLoaded = true;
            this.loadProgress();
        }
    }

    loadProgress() {
        console.log("грузка прогеса");
        this.loadProgressFromLocalStorage();
        this.checkTestAvailability();
    }

    async loadQuestions() {
        console.log("Начало загрузки вопросов");
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/questions`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Вопросы загружены:", data.length);

            this.questions = { reading: [], listening: [] };

            data.forEach(question => {
                if (!question.fields) {
                    console.warn('Пропущен вопрос без полей:', question);
                    return;
                }

                const stage = question.fields.Stage?.toLowerCase();
                if (!stage || !this.questions[stage]) {
                    console.warn('Пропущен вопрос с неверным этапом:', question);
                    return;
                }

                const formattedQuestion = this.formatQuestion(question);
                this.questions[stage].push(formattedQuestion);
            });

            console.log("Отформатированные вопросы:", this.questions);

        } catch (error) {
            console.error("Ошибка при загрузке вопросов:", error);
            throw error;
        }
    }

    formatQuestion(question) {
        const formattedQuestion = {
            id: question.id,
            stage: question.fields.Stage?.toLowerCase() || '',
            level: question.fields.Level || '',
            questionType: question.fields["Question Type"] || '',
            question: question.fields.Instruction || '',
            answers: question.fields.Answers ? question.fields.Answers.split(',').map(ans => ans.trim()) : [],
            correct: question.fields.Correct || '',
            audio: question.fields.Audio || null,
            timeLimit: question.fields.TimeLimit ? parseInt(question.fields.TimeLimit, 10) : null,
            sentenceWithGaps: question.fields.SentenceWithGaps || '',
            wordOptions: question.fields.WordOptions || '',
            matchPairs: question.fields.MatchPairs || '',
            task: question.fields.Task || '',
            designImage: question.fields.DesignImg || ''
        };

        // Добавляем логирование для отладки
        //console.log('Форматированный вопрос:', formattedQuestion);
        
        return formattedQuestion;
    }

    loadQuestion() {
        console.log(`Загрузка вопроса для этапа: ${this.stages[this.currentStageIndex]}, уровня: ${this.levels[this.currentLevelIndex]}`);
        const currentStage = this.stages[this.currentStageIndex];
        const currentLevel = this.levels[this.currentLevelIndex];
        
        console.log(`Всего вопросов на этапе ${currentStage}: ${this.questions[currentStage].length}`);
        console.log('Отвеченные вопросы:', Array.from(this.answeredQuestions));
        
        const availableQuestions = this.questions[currentStage].filter(q => 
            q.level === currentLevel && !this.answeredQuestions.has(q.id)
        );

        console.log('Доступные вопросы:', availableQuestions.length);

        if (availableQuestions.length === 0) {
            this.finishStage();
            return;
        }

        // Выбираем случайный вопрос из доступных
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        this.currentQuestion = availableQuestions[randomIndex];
        this.currentQuestionId = this.currentQuestion.id;
        this.currentQuestionType = this.currentQuestion.questionType;

        console.log("Текущий вопрос:", this.currentQuestion);
        console.log("Тип текущего вопроса:", this.currentQuestionType);
        
        this.questionStartTime = new Date();
        this.updateDesignImage(this.currentQuestion);
        this.updateTaskDescription(this.currentQuestion);
        this.renderQuestion(this.currentQuestion);
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
                // Автоматически отправляем ответ при истечении времени
                this.handleSubmit(true);
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
        console.log("Рендеринг вопроса типа:", question.questionType);
        
        if (!question.questionType) {
            console.error('Тип вопроса не определен:', question);
            this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
            return;
        }

        switch (question.questionType) {
            case 'single':
            case 'multiple-choice':
                this.renderMultipleChoiceQuestion(question);
                break;
            case 'typing':
                this.renderTypingQuestion(question);
                break;
            case 'matching':
                this.renderMatchingQuestion(question);
                break;
            case 'matchingWords':
                this.renderMatchingWordsQuestion(question);
                break;
            case 'typeImg':
                this.renderTypeImgQuestion(question);
                break;
            default:
                console.error('Неизвестный тип вопроса:', question.questionType);
                this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
        }
        this.startTimer();
        this.submitBtn.disabled = true; // Изначальн кнопка неактивна для всех типо вопросов
    }

    selectAnswer(selectedElement) {
        const answerOptions = this.questionContainer.querySelectorAll('.answer-option');
        answerOptions.forEach(option => option.classList.remove('selected'));
        selectedElement.classList.add('selected');
        this.submitBtn.disabled = false;
    }

    renderMultipleChoiceQuestion(question) {
        const shuffledAnswers = this.shuffleArray([...question.answers]);
        const html = `
            <h2 class="question-title">${question.question}</h2>
            ${question.audio ? `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>` : ''}
            <div class="answers-container">
                ${shuffledAnswers.map((answer, index) => `
                    <div class="answer-option" data-index="${index}">
                        ${answer}
                    </div>
                `).join('')}
            </div>
        `;
        this.questionContainer.innerHTML = html;

        const answerOptions = this.questionContainer.querySelectorAll('.answer-option');
        answerOptions.forEach(option => {
            option.addEventListener('click', () => this.selectAnswer(option));
        });
    }

    renderMatchingQuestion(question) {
        console.log("Рендеринг matching вопроса");
        
        let pairs;
        try {
            pairs = typeof question.matchPairs === 'string' ? JSON.parse(question.matchPairs) : question.matchPairs;
        } catch (error) {
            console.error("Ошибка при парсинге matchPairs:", error);
            pairs = [];
        }

        if (!Array.isArray(pairs) || pairs.length === 0) {
            this.questionContainer.innerHTML = `<p>Некорректные данные дл сопоставления.</p>`;
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
        this.initializeDragAndDrop();
        this.checkAllMatchesMade();
    }

    initializeDragAndDrop() {
        const draggableElements = this.questionContainer.querySelectorAll('.word-item');
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');

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
                    this.checkAllMatchesMade();
                }
            });
        });
    }

    checkAllMatchesMade() {
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
        const allMatched = Array.from(dropZones).every(zone => zone.querySelector('.word-item'));
        this.submitBtn.disabled = !allMatched;
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
        console.log('Рендеринг вопроса typing:', question);
        
        if (!question.sentenceWithGaps) {
            console.error('Отсутствует sentenceWithGaps для вопроса typing:', question);
            this.showUnavailableMessage("Ошибка при загузке вопроса. ожалуйста, обратитесь  администратоу.");
            return;
        }

        try {
            const words = question.sentenceWithGaps.split('_');
            let html = `
                <div class="typing-question">
                    <h3>${question.question || ''}</h3>
            `;

            words.forEach((word, index) => {
                html += word;
                if (index < words.length - 1) {
                    html += `<input type="text" class="gap-answer" data-index="${index}">`;
                }
            });

            html += `</div>`;
            this.questionContainer.innerHTML = html;
            this.addInputListeners();
            this.checkAllInputsFilled();
        } catch (error) {
            console.error('Ошибка при рендеринге вопроса typing:', error);
            this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
        }
    }

    renderMatchingWordsQuestion(question) {
        console.log("Полные данные вопроса matchingWords:", JSON.stringify(question, null, 2));
        
        if (!question.sentenceWithGaps || !question.wordOptions) {
            console.error("Отсутствуют необходимые данные для вопроса типа matchingWords:", question);
            this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
            return;
        }

        const words = question.sentenceWithGaps.split('_');
        const wordOptions = question.wordOptions.split(',').map(word => word.trim());

        let html = `
            <div class="matching-words-question">
                <h2>${question.question}</h2>
                <div class="sentence-with-gaps">
        `;
        words.forEach((word, index) => {
            html += word;
            if (index < words.length - 1) {
                html += `<div class="word-drop-zone" data-index="${index}"></div>`;
            }
        });
        html += `
                </div>
                <div class="word-options">
        `;
        wordOptions.forEach(word => {
            html += `<div class="word-option" draggable="true">${word}</div>`;
        });
        html += `
                </div>
            </div>
        `;
        this.questionContainer.innerHTML = html;
        this.initializeWordDragAndDrop();
        this.checkAllWordsFilled();
    }

    initializeWordDragAndDrop() {
        const wordOptions = this.questionContainer.querySelectorAll('.word-option');
        const dropZones = this.questionContainer.querySelectorAll('.word-drop-zone');

        wordOptions.forEach(word => {
            word.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', word.textContent);
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => e.preventDefault());
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                const word = e.dataTransfer.getData('text/plain');
                zone.textContent = word;
                // Удаляем использованный вариант ответа
                const usedOption = Array.from(wordOptions).find(option => option.textContent === word);
                if (usedOption) {
                    usedOption.remove();
                }
                this.checkAllWordsFilled();
            });
        });
    }

    checkAllWordsFilled() {
        const dropZones = this.questionContainer.querySelectorAll('.word-drop-zone');
        const allFilled = Array.from(dropZones).every(zone => zone.textContent.trim() !== '');
        this.submitBtn.disabled = !allFilled;
    }

    addInputListeners() {
        const inputs = this.questionContainer.querySelectorAll('.gap-answer');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                // Разрешаем только латинские буквы
                if (!this.isLatinInput(e.target.value)) {
                    e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '');
                }
                this.checkAllInputsFilled();
            });
        });
    }

    isLatinInput(input) {
        return /^[a-zA-Z]*$/.test(input);
    }

    checkAllInputsFilled() {
        const inputs = this.questionContainer.querySelectorAll('.gap-answer');
        const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');
        if (this.submitBtn) {
            this.submitBtn.disabled = !allFilled;
        }
    }

    getUserAnswer() {
        console.log('Получение ответа поьзователя для впроса типа:', this.currentQuestionType);
        
        if (!this.currentQuestionType) {
            console.error('Тип вопроса не определен');
            return null;
        }

        switch (this.currentQuestionType) {
            case 'single':
            case 'multiple-choice':
                return this.getMultipleChoiceAnswer();
            case 'typing':
                return this.getTypingAnswer();
            case 'matching':
                return this.getMatchingAnswer();
            case 'matchingWords':
                return this.getMatchingWordsAnswer();
            case 'typeImg':
                return this.getTypeImgAnswer();
            default:
                console.error('Неизвестный тип вопроса:', this.currentQuestionType);
                return null;
        }
    }

    checkAnswer(userAnswer) {
        if (!this.currentQuestionType) {
            console.error('Тип вопроса не определен');
            return false;
        }

        switch (this.currentQuestionType) {
            case 'single':
            case 'multiple-choice':
                return this.checkMultipleChoiceAnswer(userAnswer);
            case 'typing':
                return this.checkTypingAnswer(userAnswer);
            case 'matching':
                return this.checkMatchingAnswer(userAnswer);
            case 'matchingWords':
                return this.checkMatchingWordsAnswer(userAnswer);
            case 'typeImg':
                return this.checkTypeImgAnswer(userAnswer);
            default:
                console.error('Неизвестный тип вопроса:', this.currentQuestionType);
                return false;
        }
    }

    handleSubmit(timeExpired = false) {
        if (this.submitBtn.disabled && !timeExpired) return;

        const startTime = this.questionStartTime || new Date();
        const timeSpent = new Date() - startTime;

        const userAnswer = timeExpired ? null : this.getUserAnswer();
        if (userAnswer === null && !timeExpired) return;

        const isCorrect = timeExpired ? false : this.checkAnswer(userAnswer);

        // Добавляем текущий вопрос в отвеченные ПЕРЕД обновлением статистики
        console.log('Добавляем вопрос в отвеченные:', this.currentQuestionId);
        this.answeredQuestions.add(this.currentQuestionId);

        this.questionsInCurrentSeries++;
        this.totalQuestions++;
        this.questionsOnCurrentLevel++;

        if (isCorrect) {
            this.correctInCurrentSeries++;
            this.correctOnCurrentLevel++;
            this.correctCount++;
            if (this.currentLevelIndex > this.initialLevelIndex) {
                this.correctHigherLevel++;
            }
        } else {
            this.incorrectCount++;
            if (this.currentLevelIndex < this.initialLevelIndex) {
                this.incorrectLowerLevel++;
            }
        }

        this.questionNumber++;
        this.updateQuestionNumber();
        
        // Сохраняем прогресс
        this.saveProgressToLocalStorage();
        this.sendProgress();

        // Сохраняем историю ответа
        this.saveAnswerHistory({
            userAnswer,
            isCorrect,
            timeSpent
        });

        // Проверяем серию из трех вопросов
        if (this.questionsInCurrentSeries === 3) {
            this.evaluateSeries();
        }

        // Проверяем общее количество вопросов на уровне
        if (this.questionsOnCurrentLevel >= 27) {
            this.finishStage();
        } else {
            this.loadQuestion();
        }
    }

    async saveAnswerHistory({ userAnswer, isCorrect, timeSpent }) {
        try {
            const answerData = {
                userLogin: this.user.login,
                questionId: this.currentQuestion.id,
                stage: this.stages[this.currentStageIndex],
                level: this.levels[this.currentLevelIndex],
                questionType: this.currentQuestionType,
                userAnswer: typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : userAnswer,
                isCorrect,
                timeSpent: Math.round(timeSpent / 1000), // Конвертируем в секунды
                timestamp: new Date().toISOString()
            };

            console.log('Отправка данных ответа:', answerData);
            
            const response = await fetch(`${this.API_BASE_URL}/api/saveAnswer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify(answerData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Ответ успешно сохранен в историю');
        } catch (error) {
            console.error('Ошибка при сохранении ответа в историю:', error);
        }
    }

    saveProgressToAirtable() {
        const progress = {
            userLogin: this.user.login,
            stage: this.stages[this.currentStageIndex],
            currentLevel: this.levels[this.currentLevelIndex],
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctOnCurrentLevel: this.correctOnCurrentLevel,
            correctOnHigherLevel: this.correctHigherLevel,
            incorrectOnLowerLevel: this.incorrectLowerLevel
        };

        fetch('/api/saveProgress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(progress)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошибка при сохранении прогресса в Airtable:", data.error);
            } else {
                console.log("Прогресс успешно сохранен в Airtable");
            }
        })
        .catch(error => {
            console.error("Ошибка при сохраннии прогресса в Airtable:", error);
        });
    }

    evaluateSeries() {
        if (this.correctInCurrentSeries === 3) {
            this.moveToNextLevel();
        } else if (this.correctInCurrentSeries <= 1) {
            this.moveToPreviousLevel();
        }
        // Если 2 правильных ответа, остаемся на текущем уовне

        this.questionsInCurrentSeries = 0;
        this.correctInCurrentSeries = 0;
    }

    moveToNextLevel() {
        if (this.currentLevelIndex < this.levels.length - 1) {
            this.correctOnHigherLevel += this.correctOnCurrentLevel;
            this.currentLevelIndex++;
            this.questionsOnCurrentLevel = 0;
            this.correctOnCurrentLevel = 0;
            console.log(`Переход на следующий уровень: ${this.levels[this.currentLevelIndex]}`);
        }
    }

    moveToPreviousLevel() {
        if (this.currentLevelIndex > 0) {
            this.incorrectOnLowerLevel += (3 - this.correctInCurrentSeries);
            this.currentLevelIndex--;
            this.questionsOnCurrentLevel = 0;
            this.correctOnCurrentLevel = 0;
            console.log(`Переход на предыдущий уровень: ${this.levels[this.currentLevelIndex]}`);
        }
    }

    async sendProgress() {
        const progressData = {
            userLogin: this.user.login,
            stage: this.stages[this.currentStageIndex],
            level: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel,
            currentQuestionId: this.currentQuestionId,
            answeredQuestions: Array.from(this.answeredQuestions),
            timestamp: new Date().toISOString()
        };

        console.log("Отправляемые данные прогресса:", progressData);

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(progressData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Прогресс успешно отправлен", data);
        } catch (error) {
            console.error("Ошибка при отправке прогресса:", error);
        }
    }
    
    finishStage() {
        console.log(`Завершение этапа: ${this.stages[this.currentStageIndex]}`);
        const stage = this.stages[this.currentStageIndex];
        this.targetLevel = this.levels[this.currentLevelIndex];
    
        const finalWss = this.computeFinalWss();
        const finalLevel = this.calculateFinalLevel(finalWss);
    
        // Сохранение результатов этапа
        const stageResult = {
            stage: stage,
            targetLevel: this.targetLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            finalWss: finalWss,
            finalLevel: finalLevel,
            timestamp: new Date().toISOString()
        };
    
        this.stagesResults.push(stageResult);
    
        // Очиста счетчиков для следующего этапа
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.questionsOnCurrentLevel = 0;
        this.questionsInCurrentSeries = 0;
        this.correctInCurrentSeries = 0;
    
        // Переход к следующему этапу или завершение теста
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.currentLevelIndex = 0; // Сбрасываем уровень на начальный для нового этапа
            this.updateCurrentStage(); // Обновляем отображение этапа
            this.loadQuestion();
        } else {
            this.finishTest();
        }
    }

    async finishTest() {
        const finalWss = this.computeFinalWss();
        const finalLevel = this.calculateFinalLevel(finalWss);
        
        const completionData = {
            userLogin: this.user.login,
            stagesResults: this.stagesResults,
            finalWss: finalWss,
            finalLevel: finalLevel,
            timestamp: new Date().toISOString(),
            status: 'Completed', // Используем Status из Airtable
            stage: this.stages[this.currentStageIndex],
            level: this.levels[this.currentLevelIndex],
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel
        };

        console.log("Отправляемые данные завершения теста:", completionData);

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(completionData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Тест успешно завершён:", data);
            
            this.showResults(finalLevel, finalWss);
            await this.resetProgress();
            this.disableInteractions();
        } catch (error) {
            console.error("Ошибка при завершении теста:", error);
            alert("Произошла ошибка при завершении теста. Пожалуйста, попробуйте еще раз или свяжитесь с администратором.");
        }
    }

    async resetProgress() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/resetProgress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userLogin: this.user.login })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Прогресс успешно сброшен:", data);
            
            // Очистка локального хранилища
            localStorage.removeItem('testProgress');
            
            // Срос лкальных переменных
            this.currentStageIndex = 0;
            this.currentLevel = this.levels[0]; // Используем первый уровень из массива
            this.correctCount = 0;
            this.incorrectCount = 0;
            this.totalQuestions = 0;
            this.correctHigherLevel = 0;
            this.incorrectLowerLevel = 0;
            this.questionsOnCurrentLevel = 0;
            this.stagesResults = [];
            this.currentQuestion = null;
            
            // Показываем кнопку START
            this.showStartButton();
        } catch (error) {
            console.error("Ошибка при сбросе прогресса:", error);
            alert("Произошла ошибка при сбросе прогресса. Пожалуйста, попробуйте еще раз.");
        }
    }

    // Мето для обновленя уровня на основе резуьтато групп
    updateLevelBasedOnGroupResults() {
        if (this.groupCorrectAnswers === 1) {
            this.currentLevel = Math.max(1, this.currentLevel - 1);
            console.log(`Пеход на уровень ниже: ${this.currentLevel}`);
        } else if (this.groupCorrectAnswers === 2) {
            console.log(`Оставляем уровень неизменным: ${this.currentLevel}`);
        } else if (this.groupCorrectAnswers === 3) {
            this.currentLevel += 1;
            console.log(`Переход на уровень выше: ${this.currentLevel}`);
        }
    }

    // Доплнительно, давайте изменим обработку ошибок в клиентском коде:

    showResults(finalLevel, finalWss) {
        const resultMessage = `
            <div class="test-results">
                <h2>Test Completed!</h2>
                <p>Your level: ${finalLevel}</p>
                <p>Your WSS score: ${finalWss}</p>
                <p>Correct answers: ${this.correctCount}</p>
                <p>Total questions: ${this.totalQuestions}</p>
                <p>Thank you for completing the test! View your detailed results in your personal account.</p>
                <a href="https://wiseman-skills.com/lk" class="results-link">Go to Personal Account</a>
            </div>
        `;
        
        this.questionContainer.innerHTML = resultMessage;
        this.submitBtn.style.display = 'none';

        // Скрываем ненужные элементы
        const elementsToHide = [
            'timer',
            'current-stage',
            'task-description',
            'question-number'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'question-number') {
                    element.parentElement.style.display = 'none';
                } else {
                    element.style.display = 'none';
                }
            }
        });
    }

    shuffleArray(array) {
        // Фунция для перемешивания массива
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Логика для вычисения иогового уровн на основе WSS
    calculateFinalLevel(wss) {
        const wssScale = this.initializeWssScale();
        for (let i = 0; i < wssScale.length - 1; i++) {
            if (wss >= wssScale[i].minWss && wss < wssScale[i + 1].minWss) {
                return wssScale[i].level;
            }
        }
        // Проверка для оследнего урвня
        if (wss >= wssScale[wssScale.length - 1].minWss) {
            return wssScale[wssScale.length - 1].level;
        }
        // Если WSS меньше минимального значения в шкале, возвращаем первый уровень
        return wssScale[0].level;
    }

    sendResultsToAirtable() {
        const data = {
            UserLogin: this.user.login,
            FinishDate: new Date().toISOString(),
            StagesResults: JSON.stringify(this.stagesResults)
        };

        fetch('/api/sendResults', {
            method: 'POST',
            headers: {
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
            console.log('Резуьтаты успешно отправлены в Airtable:', result);
        })
        .catch(error => {
            console.error('Ошибка при отправке результтов в Airtable:', error);
        });
    }

    showLoading() {
        document.getElementById('loading-indicator').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading-indicator').style.display = 'none';
    }

    updateProgress(isCorrect) {
        if (isCorrect) {
            this.correctCount++;
            this.groupCorrectAnswers++;
            this.correctHigherLevel++;
        } else {
            this.incorrectCount++;
            this.incorrectLowerLevel++;
        }
        this.totalQuestions++;
        this.groupTotalAnswers++;
        this.questionsOnCurrentLevel++;

        this.saveProgressToLocalStorage();
        this.sendProgress();

        if (this.groupTotalAnswers >= 3) {
            this.updateLevelBasedOnGroupResults();
        }

        if (this.questionsOnCurrentLevel >= 9) {
            this.finishStage();
        } else {
            this.loadNextQuestion();
        }
    }

    setUser() {
        try {
            const userProfileString = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (userProfileString) {
                const userProfile = JSON.parse(userProfileString);
                if (userProfile && userProfile.login) {
                    this.user = { login: userProfile.login };
                    console.log("User email set:", this.user.login);
                } else {
                    throw new Error("User login not found in profile");
                }
            } else {
                throw new Error("User profile not found in localStorage");
            }
        } catch (error) {
            console.error("Error setting user:", error);
            this.userNotAuthorized = true;
        }
    }

    getMatchingAnswer() {
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
        const answers = Array.from(dropZones).map(zone => {
            const wordItem = zone.querySelector('.word-item');
            return wordItem ? wordItem.getAttribute('data-word') : null;
        });
        return answers;
    }

    checkMatchingAnswer(userAnswer) {
        const correctPairs = JSON.parse(this.currentQuestion.matchPairs);
        return correctPairs.every((pair, index) => 
            pair.option.toLowerCase() === userAnswer[index].toLowerCase()
        );
    }

    getMultipleChoiceAnswer() {
        const selectedOption = this.questionContainer.querySelector('.answer-option.selected');
        return selectedOption ? selectedOption.textContent.trim() : null;
    }

    getTypeImgAnswer() {
        const inputs = this.questionContainer.querySelectorAll('.image-answer');
        return Array.from(inputs).map(input => input.value);
    }

    getTypingAnswer() {
        const inputs = this.questionContainer.querySelectorAll('.gap-answer');
        return Array.from(inputs).map(input => input.value.trim());
    }

    checkMultipleChoiceAnswer(userAnswer) {
        return userAnswer.toLowerCase() === this.currentQuestion.correct.toLowerCase();
    }

    checkTypeImgAnswer(userAnswer) {
        const correctAnswers = this.currentQuestion.correct.split(',').map(ans => ans.trim().toLowerCase());
        return userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
    }

    checkTypingAnswer(userAnswer) {
        if (!this.currentQuestion.correct) {
            console.error('Отсутствует correct для вопроса typing:', this.currentQuestion);
            return false;
        }

        const correctAnswers = this.currentQuestion.correct.split(',').map(ans => ans.trim().toLowerCase());
        return userAnswer.every((answer, index) => 
            answer.toLowerCase() === correctAnswers[index]
        );
    }

    checkMatchingWordsAnswer(userAnswer) {
        console.log('Проверка ответа для вопроса типа matchingWords');
        console.log('Ответ пользователя:', userAnswer);
        console.log('Правильный ответ:', this.currentQuestion.wordOptions);
        
        const correctAnswers = this.currentQuestion.wordOptions.split(',').map(word => word.trim().toLowerCase());
        const isCorrect = userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
        
        console.log('Результат проверки:', isCorrect);
        return isCorrect;
    }

    updateQuestionNumber() {
        const questionNumberElement = document.getElementById('question-number');
        if (questionNumberElement) {
            questionNumberElement.textContent = this.questionNumber;
        }
    }

    computeFinalWss() {
        const minWss = this.getMinWssForLevel(this.targetLevel);
        const wssShift = this.correctOnCurrentLevel + this.correctHigherLevel - this.incorrectLowerLevel;
        const finalWss = minWss + wssShift;
        
        console.log('Расчет finalWss:', {
            targetLevel: this.targetLevel,
            minWss,
            correctOnCurrentLevel: this.correctOnCurrentLevel,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            wssShift,
            finalWss
        });
        
        return finalWss;
    }

    getMinWssForLevel(level) {
        const wssScale = this.initializeWssScale();
        const levelEntry = wssScale.find(entry => entry.level.startsWith(level));
        if (!levelEntry) {
            console.error(`Уровень ${level} не найден в шкале WSS`);
            return 0;
        }
        return levelEntry.minWss;
    }

    showStartButton() {
        this.questionContainer.innerHTML = `
            <div class="test-instructions">
                <h3>Instructions</h3>
                <p>Welcome to the English Proficiency Test! Here's how it works:</p>
                <ul>
                    <li>The test consists of reading and listening sections</li>
                    <li>Answer questions carefully - your level adjusts based on performance</li>
                    <li>Some questions have time limits</li>
                    <li>You can't go back to previous questions</li>
                    <li>The test takes approximately 30-40 minutes</li>
                </ul>
                <button id="start-test-btn" class="start-button">START</button>
            </div>
        `;
        
        document.getElementById('start-test-btn').addEventListener('click', () => {
            this.showTestElements();
            this.startTest();
        });
    }

    startTest() {
        if (!this.totalQuestions) {
            this.questionNumber = 1;
            this.totalQuestions = 0;
        } else {
            this.questionNumber = this.totalQuestions + 1;
        }
        
        this.initialLevelIndex = 0;
        this.currentLevelIndex = this.initialLevelIndex;
        this.currentLevel = this.levels[this.currentLevelIndex];
        
        this.currentQuestionId = null;
        
        this.updateQuestionNumber();
        this.updateCurrentStage();
        this.loadQuestion();
        
        if (this.submitBtn) {
            this.submitBtn.style.display = 'block';
        }
    }

    getMatchingWordsAnswer() {
        console.log('Получение ответа для вопроса типа matchingWords');
        const dropZones = this.questionContainer.querySelectorAll('.word-drop-zone');
        const answer = Array.from(dropZones).map(zone => zone.textContent.trim());
        console.log('Ответ пользователя:', answer);
        return answer;
    }

    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    }

    updateDesignImage(question) {
        const designImageContainer = document.getElementById('design-image');
        if (designImageContainer) {
            if (question.designImage) {
                console.log('Загрузка изображения:', question.designImage);
                designImageContainer.innerHTML = `<img src="${question.designImage}" alt="Design">`;
            } else {
                console.log('Изображение не найдено для вопроса');
                designImageContainer.innerHTML = '';
            }
        } else {
            console.error('Контейнер для и��ображения не найден');
        }
    }

    updateTaskDescription(question) {
        const taskDescriptionElement = document.getElementById('task-description');
        if (taskDescriptionElement) {
            if (question.instruction) {
                taskDescriptionElement.innerHTML = `
                    <div class="instruction">${question.instruction}</div>
                    <div class="task">${question.task}</div>
                `;
                taskDescriptionElement.style.display = 'block';
            } else {
                taskDescriptionElement.style.display = 'none';
            }
        }
    }

    updateCurrentStage() {
        if (this.currentStageElement) {
            const stageName = this.stages[this.currentStageIndex];
            this.currentStageElement.textContent = stageName.charAt(0).toUpperCase() + stageName.slice(1);
        }
    }

    hideTestElements() {
        // Скрываем элементы при инициализации
        const elementsToHide = [
            'question-number',
            'timer',
            'current-stage',
            'task-description'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'question-number') {
                    element.parentElement.style.display = 'none';
                } else {
                    element.style.display = 'none';
                }
            }
        });
    }

    showTestElements() {
        // Показываем элементы при начале теста
        const elementsToShow = [
            'question-number',
            'timer',
            'current-stage',
            'task-description'
        ];
        
        elementsToShow.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'question-number') {
                    element.parentElement.style.display = 'block';
                } else {
                    element.style.display = 'block';
                }
            }
        });
    }

    // Добавим новый метод для отключения взаимодействий
    disableInteractions() {
        // Удаляем обработчики событий с кнопки submit
        if (this.submitBtn) {
            this.submitBtn.style.display = 'none';
        }

        // Очищаем таймер если он есть
        if (this.timer) {
            clearInterval(this.timer);
        }

        // Удаляем все интерактивные элементы
        const interactiveElements = document.querySelectorAll('.answer-option, .word-item, input');
        interactiveElements.forEach(element => {
            element.disabled = true;
            element.style.pointerEvents = 'none';
        });

        // Отключаем обработчики drag and drop если они есть
        const draggableElements = document.querySelectorAll('[draggable]');
        draggableElements.forEach(elem => {
            elem.draggable = false;
            elem.style.cursor = 'default';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init().catch(error => console.error("Error initializing app:", error));
});