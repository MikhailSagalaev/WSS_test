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

        // Кэширование DOM элементов
        this.elements = {
            questionContainer: document.getElementById('question-container'),
            submitBtn: document.getElementById('submit-btn'),
            timer: document.getElementById('timer'),
            currentStage: document.getElementById('current-stage'),
            taskDescription: document.getElementById('task-description'),
            questionNumber: document.getElementById('question-number')
        };

        // Добавить debounce для обработчиков событий
        this.debouncedHandleSubmit = this.debounce(this.handleSubmit.bind(this), 300);
        this.loadingOverlay = document.getElementById('loading-overlay');

        this.reloadCount = parseInt(localStorage.getItem('reloadCount') || '0');
        this.maxReloads = 3; // максимальное количество перезагрузок

        // Добавляем обработку видимости страниы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Страница скрыта - останавливаем таймер
                if (this.timer) {
                    clearInterval(this.timer);
                }
            } else {
                // Страница снова видима - возобновляем таймер
                if (this.currentQuestion && this.currentQuestion.timeLimit) {
                    this.startTimer();
                }
            }
        });
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
        
        try {
            this.showLoading();
            
            // Add timeout
            const timeout = 30000; // 30 seconds
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            // Set user with proper error handling
            await this.setUser();
            
            if (this.userNotAuthorized) {
                this.showUnavailableMessage("Please login to take the test.");
                return;
            }
            
            // Handle reload count
            this.reloadCount++;
            localStorage.setItem('reloadCount', this.reloadCount.toString());
            
            if (this.reloadCount > this.maxReloads) {
                await this.handleForcedCompletion();
                return;
            }
            
            // Initialize with retry mechanism
            await this.initializeWithRetry();
            
            this.isInitialized = true;
            this.hideLoading();
            this.showStartButton();
            
        } catch (error) {
            console.error("Initialization error:", error);
            this.hideLoading();
            this.showUnavailableMessage("Test initialization failed. Please try again or contact support.");
        }
    }

    async initializeWithRetry(retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                await this.checkTestAvailability();
                await this.loadProgressFromAirtable();
                await this.loadQuestions();
                return;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
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

    addLeaveConfirmation() {
        window.addEventListener('beforeunload', (e) => {
            if (this.state.isTestStarted && !this.state.isTestCompleted) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    async loadProgressFromAirtable() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/progress?userLogin=${encodeURIComponent(this.user.login)}`);
            const data = await response.json();
            
            console.log("Прогресс получен из Airtable:", data);
    
            if (data && data.progress) {
                const progress = data.progress;
                
                // Приводим значения к нижнему регистру для равнения
                this.currentStageIndex = this.stages.indexOf(progress.Stage?.toLowerCase());
                if (this.currentStageIndex === -1) this.currentStageIndex = 0;
                
                // Используем точное значение из таблицы для уровня
                this.currentLevel = progress.Level;
                this.currentLevelIndex = this.levels.indexOf(this.currentLevel);
                if (this.currentLevelIndex === -1) this.currentLevelIndex = 0;

                console.log('Восстановлен этап и уровень:', {
                    stage: this.stages[this.currentStageIndex],
                    stageIndex: this.currentStageIndex,
                    level: this.currentLevel,
                    levelIndex: this.currentLevelIndex,
                    originalStage: progress.Stage,
                    originalLevel: progress.Level
                });
                
                // Используем точные имена полей из Airtable
                this.correctCount = progress.CorrectCount || 0;
                this.incorrectCount = progress.IncorrectCount || 0;
                this.totalQuestions = progress.TotalQuestions || 0;
                this.correctHigherLevel = progress.CorrectHigherLevel || 0;
                this.incorrectLowerLevel = progress.IncorrectLowerLevel || 0;
                this.questionsOnCurrentLevel = progress.QuestionsOnCurrentLevel || 0;
                
                if (progress.CurrentQuestionId) {
                    this.currentQuestionId = progress.CurrentQuestionId;
                    console.log("Восстановлен ID вопроса:", this.currentQuestionId);
                }
                
                if (progress.AnsweredQuestions) {
                    try {
                        const answeredQuestions = JSON.parse(progress.AnsweredQuestions);
                        this.answeredQuestions = new Set(answeredQuestions);
                        console.log("Восстановлены отвеченные вопросы:", this.answeredQuestions);
                    } catch (e) {
                        console.error("Ошибка при парсинге отвеченных вопросов:", e);
                        this.answeredQuestions = new Set();
                    }
                }

                this.questionNumber = this.totalQuestions + 1;
                this.updateQuestionNumber();

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

            console.log("Прогресс загужен из localStorage:", savedProgress);
        } else {
            console.log("ет сохранённого прогресса в localStorage. Начинаем новый тест.");
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
        try {
            this.showLoading();
            console.log("Начало загрузи вопросов");
            const response = await fetch(`${this.API_BASE_URL}/api/questions`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Вопросы агржены:", data.length);

            this.questions = { reading: [], listening: [] };

            data.forEach(question => {
                if (!question.fields) {
                    console.warn('ропущен вопрс без полей:', question);
                    return;
                }

                const stage = question.fields.Stage?.toLowerCase();
                if (!stage || !this.questions[stage]) {
                    console.warn('Пропущен опрос с неверным этапом:', question);
                    return;
                }

                const formattedQuestion = this.formatQuestion(question);
                this.questions[stage].push(formattedQuestion);
            });

            console.log("Отформатированные вопросы:", this.questions);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error("Ошибка при заузке вопросов:", error);
            throw error;
        }
    }

    formatQuestion(question) {
        const formattedQuestion = {
            id: question.id,
            stage: question.fields.Stage?.toLowerCase() || '',
            level: question.fields.Level || '',
            questionType: question.fields["Question Type"] || '',
            task: question.fields.Task || '',
            instruction: question.fields.Instruction || '',
            answers: question.fields.Answers ? question.fields.Answers.split(';').map(ans => ans.trim()) : [],
            correct: question.fields.Correct || '',
            gapAnswers: question.fields.GapAnswers ? question.fields.GapAnswers.split(';').map(ans => ans.trim()) : [],
            sentenceWithGaps: question.fields.SentenceWithGaps || '',
            audio: question.fields.Audio || null,
            timeLimit: question.fields.TimeLimit ? parseInt(question.fields.TimeLimit, 10) : null,
            matchPairs: question.fields.MatchPairs || '',
            designImage: question.fields.DesignImg || ''
        };
        
        console.log('Форматированный вопрос:', formattedQuestion);
        
        if (question.fields.MatchPairs) {
            const pairs = question.fields.MatchPairs.split(';').map(pair => {
                const [option, image] = pair.split('=');
                return {
                    option: option.trim(),
                    image: image.trim()
                };
            });
            formattedQuestion.matchPairs = pairs;
        }
        
        return formattedQuestion;
    }

    loadQuestion() {
        console.log(`Загрузка вопроса для этапа: ${this.stages[this.currentStageIndex]}, уровня: ${this.levels[this.currentLevelIndex]}`);
        const currentStage = this.stages[this.currentStageIndex];
        const currentLevel = this.levels[this.currentLevelIndex];
        
        // Фильтруем вопросы текущего уровня
        const availableQuestions = this.questions[currentStage].filter(q => 
            q.level === currentLevel && !this.answeredQuestions.has(q.id)
        );

        console.log('Доступные вопросы:', availableQuestions.length);
        console.log('Текущий ID вопроса:', this.currentQuestionId);
        console.log('Текущий уровень:', currentLevel);

        if (availableQuestions.length === 0) {
            this.finishStage();
            return;
        }

        // Проверяем наличие сохраненного вопроса при первой загрузке
        if (this.currentQuestionId && this.totalQuestions === 0) {
            const savedQuestion = this.questions[currentStage].find(q => 
                q.id === this.currentQuestionId && 
                q.level === currentLevel &&
                !this.answeredQuestions.has(q.id)
            );
            
            if (savedQuestion) {
                console.log("Восстановлен сохраненный вопрос:", savedQuestion);
                this.currentQuestion = savedQuestion;
            } else {
                const randomIndex = Math.floor(Math.random() * availableQuestions.length);
                this.currentQuestion = availableQuestions[randomIndex];
                console.log("Выбран случайный вопрос (сохраненный не подходит):", this.currentQuestion);
            }
        } else {
            const randomIndex = Math.floor(Math.random() * availableQuestions.length);
            this.currentQuestion = availableQuestions[randomIndex];
            console.log("Выбран случайный вопрос:", this.currentQuestion);
        }

        this.currentQuestionId = this.currentQuestion.id;
        this.currentQuestionType = this.currentQuestion.questionType;
        
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
            console.error('Тп вопроса не определен:', question);
            this.showUnavailableMessage("Ошибка при загрузке вопрос. Пожалуйста, обратитесь к администратору.");
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
                this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, братитесь к администратору.");
        }
        this.startTimer();
        this.submitBtn.disabled = true; // Изначальн кнопка неактивна для всех типо вопросов
    }

    selectAnswer(option) {
        // Убираем выделение со всех опций
        const options = this.questionContainer.querySelectorAll('.answer-option');
        options.forEach(opt => opt.classList.remove('selected'));
        
        // Добавляем выделение выбранной опции
        option.classList.add('selected');
        
        // Активируем кнопку submit
        if (this.submitBtn) {
            this.submitBtn.disabled = false;
        }
    }

    renderMultipleChoiceQuestion(question) {
        const shuffledAnswers = this.shuffleArray([...question.answers]);
        const html = `
            <div class="task">${question.task}</div>
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
        try {
            const matchPairs = JSON.parse(question.matchPairs);
            if (!Array.isArray(matchPairs)) {
                throw new Error('matchPairs должен быть массивом');
            }

            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            
            // Создаем перемешанную копию вариантов ответов
            const shuffledOptions = this.shuffleArray([...matchPairs]);

            let html = `
                <div class="matching-question">
                    <div class="task">${question.task}</div>
                    <div class="matching-container">
                        <div class="targets-container">
                            ${matchPairs.map((pair, index) => `
                                <div class="target" data-index="${index}">
                                    <img src="${pair.image}" alt="Target ${index + 1}">
                                </div>
                            `).join('')}
                        </div>
                        <div class="drop-zones-container">
                            ${matchPairs.map((pair, index) => `
                                <div class="drop-zone" data-index="${index}">
                                    <span class="drop-zone-letter">${letters[index]}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="options-container">
                            ${shuffledOptions.map((pair, shuffledIndex) => `
                                <div class="option" draggable="true" 
                                    data-index="${shuffledIndex}" 
                                    data-original-index="${matchPairs.findIndex(p => p.option === pair.option)}">
                                    ${pair.option}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            this.questionContainer.innerHTML = html;
            this.initDragAndDrop();
        } catch (error) {
            console.error('Ошибка при рендеринге matching вопроса:', error);
            this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
        }
    }

    initDragAndDrop() {
        const options = this.questionContainer.querySelectorAll('.option');
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');

        options.forEach(option => {
            option.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', option.dataset.index);
                option.classList.add('dragging');
            });

            option.addEventListener('dragend', () => {
                option.classList.remove('dragging');
                this.checkAllMatchingAnswersFilled();
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
                const optionIndex = e.dataTransfer.getData('text/plain');
                const option = this.questionContainer.querySelector(`.option[data-index="${optionIndex}"]`);
                
                // Если в текущей зоне уже есть элемент
                const existingOption = zone.querySelector('.option');
                if (existingOption) {
                    // Если перетаскиваем из другой зоны
                    const sourceZone = option.parentElement;
                    if (sourceZone && sourceZone.classList.contains('drop-zone')) {
                        // Меняем элементы местами
                        sourceZone.appendChild(existingOption);
                        existingOption.setAttribute('draggable', 'true');
                    } else {
                        // Возвращаем существующий элемент в контейнер options
                        const optionsContainer = this.questionContainer.querySelector('.options-container');
                        existingOption.setAttribute('draggable', 'true');
                        optionsContainer.appendChild(existingOption);
                    }
                }

                // Перемещаем новый элемент в drop zone
                zone.appendChild(option);
                option.setAttribute('draggable', 'true'); // Оставляем возможность перетаскивать

                // Проверяем заполнение всех зон
                this.checkAllMatchingAnswersFilled();
            });
        });
    }

    renderTypeImgQuestion(question) {
        let html = `
            <div class="type-img-question">
                <div class="task">${question.task}</div>
                <!-- Остальной код для type-img -->
            </div>
        `;
        // ... осальной код ...
    }

    renderTypingQuestion(question) {
        console.log('Рендеринг вопроса typing:', question);
        
        try {
            if (!question.sentenceWithGaps) {
                console.error('Отсуствует sentenceWithGaps для вопроса typing:', question);
                this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
                return;
            }

            const words = question.sentenceWithGaps.split('_');
            let html = `
                <div class="typing-question">
                    <div class="task">${question.task}</div>
                    <div class="sentence-container">
            `;

            words.forEach((word, index) => {
                html += word;
                if (index < words.length - 1) {
                    html += `<input type="text" class="gap-answer" data-index="${index}">`;
                }
            });

            html += `
                    </div>
                </div>
            `;
            
            this.questionContainer.innerHTML = html;
            this.addInputListeners();
            this.checkAllInputsFilled();
        } catch (error) {
            console.error('Ошибка при рендеринге вопроса typing:', error);
            this.showUnavailableMessage("Ошибка при загрузке вопроса. Пожалуйста, обратитесь к администратору.");
        }
    }

    renderMatchingWordsQuestion(question) {
        const html = `
            <div class="matching-words-question">
                <div class="task">${question.task}</div>
                <!-- Остальной код для matching words -->
            </div>
        `;
        // ... остальной код ...
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
            // Убираем placeholder
            input.removeAttribute('placeholder');
            
            input.addEventListener('input', (e) => {
                // Разрешаем латинские и русские буквы
                if (!/^[a-zA-Zа-яА-ЯёЁ]*$/.test(e.target.value)) {
                    e.target.value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
                }
                this.checkAllInputsFilled();
            });
        });
    }

    isValidInput(input) {
        return /^[a-zA-Zа-яА-ЯёЁ]*$/.test(input);
    }

    checkAllInputsFilled() {
        const inputs = this.questionContainer.querySelectorAll('.gap-answer');
        const allFilled = Array.from(inputs).every(input => {
            const value = input.value.trim();
            return value !== '' && this.isValidInput(value);
        });
        if (this.submitBtn) {
            this.submitBtn.disabled = !allFilled;
        }
    }

    getUserAnswer() {
        console.log('Получение ответа пользователя для вопроса типа:', this.currentQuestionType);
        
        switch (this.currentQuestionType.toLowerCase()) {
            case 'multiple-choice':
                const selectedOption = this.questionContainer.querySelector('.answer-option.selected');
                if (!selectedOption) {
                    console.log('Не выбран вариант ответа');
                    return null;
                }
                const answer = selectedOption.textContent.trim();
                console.log('Выбранный ответ:', answer);
                return answer;
                
            case 'typing':
                const inputs = this.questionContainer.querySelectorAll('.gap-answer');
                if (!inputs || inputs.length === 0) {
                    console.log('Не найдены поля для ввода');
                    return null;
                }
                const answers = Array.from(inputs).map(input => input.value.trim());
                if (answers.some(answer => !answer)) {
                    console.log('Не все поля заполнены');
                    return null;
                }
                console.log('Полученные ответы typing:', answers);
                return answers;
                
            case 'matching':
                const matchingAnswers = [];
                const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
                
                dropZones.forEach(zone => {
                    const option = zone.querySelector('.option');
                    if (option) {
                        matchingAnswers.push({
                            targetIndex: parseInt(zone.dataset.index),
                            optionIndex: parseInt(option.dataset.originalIndex)
                        });
                    }
                });

                if (matchingAnswers.length !== dropZones.length) {
                    console.log('Не все зоны заполнены');
                    return null;
                }

                console.log('Полученные ответы matching:', matchingAnswers);
                return matchingAnswers;
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

    async handleSubmit(timeExpired = false) {
        if (this.submitBtn.disabled && !timeExpired) return;

        const startTime = this.questionStartTime || new Date();
        const timeSpent = new Date() - startTime;

        const userAnswer = timeExpired ? null : this.getUserAnswer();
        if (userAnswer === null && !timeExpired) return;

        const isCorrect = timeExpired ? false : this.checkAnswer(userAnswer);

        // Сохраняем ответ в историю только один раз
        await this.saveAnswerHistory({
            userAnswer,
            isCorrect,
            timeSpent
        });

        // Добавляем текущий вопрос в отвеченные
        this.answeredQuestions.add(this.currentQuestion.id);

        // Обновляем счетчики
        this.totalQuestions++;
        this.questionNumber = this.totalQuestions + 1;
        this.updateQuestionNumber();

        // Проверяем серию из трех вопросов
        if (this.questionsInCurrentSeries === 3) {
            this.evaluateSeries();
        }

        // Проверяем общее количество вопросов на уровне
        if (this.questionsOnCurrentLevel >= 27) {
            this.finishStage();
        }

        // Загружаем следующий вопрос
        await this.loadQuestion();

        // Сохраняем прогресс с новым вопросом
        this.saveProgressToLocalStorage();
        await this.sendProgress();
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
                console.error("Оибка при сохранении прогресса в Airtable:", data.error);
            } else {
                console.log("Прогресс успешно сохранен в Airtable");
            }
        })
        .catch(error => {
            console.error("Ошибка при сораннии прогресса в Airtable:", error);
        });
    }

    evaluateSeries() {
        console.log('Оценка серии:', {
            correctInSeries: this.correctInCurrentSeries,
            questionsInSeries: this.questionsInCurrentSeries,
            currentLevel: this.currentLevel
        });

        if (this.correctInCurrentSeries === 3 && this.questionsInCurrentSeries === 3 && 
            this.currentLevelIndex < this.levels.length - 1) {
            this.currentLevelIndex++;
            this.currentLevel = this.levels[this.currentLevelIndex];
            console.log('Повышение уровня до:', this.currentLevel);
            
            // Сбрасываем счетчики для нового уровня
            this.questionsOnCurrentLevel = 0;
            this.correctOnCurrentLevel = 0;
        } else if (this.correctInCurrentSeries === 0 && this.currentLevelIndex > 0) {
            this.currentLevelIndex--;
            this.currentLevel = this.levels[this.currentLevelIndex];
            console.log('Пониение уровня до:', this.currentLevel);
            
            // Сбрасываем счетчики для нового уровня
            this.questionsOnCurrentLevel = 0;
            this.correctOnCurrentLevel = 0;
        }

        // Сбрасываем счетчики серии
        this.questionsInCurrentSeries = 0;
        this.correctInCurrentSeries = 0;

        // Сохраняем прогресс после изменения уровня
        this.saveProgressToLocalStorage();
        this.sendProgress();
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
            console.log(`Перехо на предыдущий уровень: ${this.levels[this.currentLevelIndex]}`);
        }
    }

    async sendProgress() {
        const progressData = {
            userLogin: this.user.login,
            stage: this.stages[this.currentStageIndex],
            level: this.levels[this.currentLevelIndex],
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel,
            currentQuestionId: this.currentQuestionId, // Добавляем текущий ID вопроса
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
    
        // Очита счетчиков для следующего этапа
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
        
        // Получаем результаты по этапам
        const readingResults = this.stagesResults.find(r => r.stage === 'reading') || {};
        const listeningResults = this.stagesResults.find(r => r.stage === 'listening') || {};
        
        try {
            const completeResponse = await fetch(`${this.API_BASE_URL}/api/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userLogin: this.user.login,
                    finalLevel,
                    finalWss,
                    correctCount: this.correctCount,
                    incorrectCount: this.incorrectCount,
                    totalQuestions: this.totalQuestions,
                    timestamp: new Date().toISOString(),
                    // Добавляем данные по этапам
                    readingLevel: readingResults.finalLevel,
                    readingWss: readingResults.finalWss,
                    readingCorrectCount: readingResults.correctCount,
                    readingIncorrectCount: readingResults.incorrectCount,
                    listeningLevel: listeningResults.finalLevel,
                    listeningWss: listeningResults.finalWss,
                    listeningCorrectCount: listeningResults.correctCount,
                    listeningIncorrectCount: listeningResults.incorrectCount,
                    stagesResults: this.stagesResults
                })
            });

            if (!completeResponse.ok) {
                throw new Error(`HTTP error! status: ${completeResponse.status}`);
            }

            // Показываем результаты
            this.showResults();
            this.disableInteractions();
            
            // Очищаем локальный прогресс
            localStorage.removeItem('reloadCount');
            localStorage.removeItem('testProgress');
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
            console.log("Проресс успешно сброшн:", data);
            
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

    // Доплнительно, давайте изменим обработку ошибок  клиентском коде:

    showResults() {
        const container = document.querySelector('.question-container');
        let resultsHTML = '<div class="results-container">';

        // Проходим по всем этапам в stagesResults
        this.stagesResults.forEach(result => {
            const correctPercentage = ((result.correctCount / (result.correctCount + result.incorrectCount)) * 100).toFixed(1);
            
            resultsHTML += `
                <div class="stage-result">
                    <h3>${result.stage.toUpperCase()}</h3>
                    <p>Correct answers: ${result.correctCount}</p>
                    <p>Incorrect answers: ${result.incorrectCount}</p>
                    <p>Score: ${correctPercentage}%</p>
                    <p>Final level: ${result.finalLevel}</p>
                </div>
            `;
        });

        resultsHTML += '</div>';
        container.innerHTML = resultsHTML;
    }

    shuffleArray(array) {
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
        // Если WSS меньше минимального значения в шале, возвращаем первый уровень
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
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
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
        try {
            console.log('Проверка ответа matching:', {
                userAnswer,
                matchPairs: this.currentQuestion.matchPairs
            });

            if (!userAnswer || !Array.isArray(userAnswer) || userAnswer.length === 0) {
                console.error('Некорректный формат ответа matching');
                return false;
            }

            const matchPairs = JSON.parse(this.currentQuestion.matchPairs);
            if (!Array.isArray(matchPairs)) {
                console.error('Некорректный формат matchPairs');
                return false;
            }

            // Проверяем все пары
            const isCorrect = userAnswer.every(answer => {
                const targetIndex = parseInt(answer.targetIndex);
                const optionIndex = parseInt(answer.optionIndex);
                
                if (isNaN(targetIndex) || isNaN(optionIndex)) {
                    console.error('Некорректные индексы:', { targetIndex, optionIndex });
                    return false;
                }

                console.log('Проверка пары:', {
                    targetIndex,
                    optionIndex,
                    isMatch: targetIndex === optionIndex
                });

                return targetIndex === optionIndex;
            });

            console.log('Результат проверки matching:', isCorrect);
            return isCorrect;

        } catch (error) {
            console.error('Ошибка при проверке ответа matching:', error);
            return false;
        }
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
        console.log('Проверка ответа multiple-choice:', {
            userAnswer,
            correctAnswer: this.currentQuestion.correct
        });

        if (!userAnswer || !this.currentQuestion.correct) {
            console.error('Отсутствует ответ пользователя или правильны ответ');
            return false;
        }

        // Точное сравнение без изменения регистра
        const isCorrect = userAnswer === this.currentQuestion.correct;
        
        console.log('Результат проверки multiple-choice:', {
            userAnswer,
            correctAnswer: this.currentQuestion.correct,
            isCorrect
        });

        return isCorrect;
    }

    checkTypeImgAnswer(userAnswer) {
        const correctAnswers = this.currentQuestion.correct.split(';').map(ans => ans.trim().toLowerCase());
        return userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
    }

    checkTypingAnswer(userAnswer) {
        console.log('Проверка ответа typing:', {
            userAnswer,
            gapAnswers: this.currentQuestion.gapAnswers,
            correct: this.currentQuestion.correct
        });

        // Проверяем наличие и непустоту gapAnswers
        if (!this.currentQuestion.gapAnswers || 
            (Array.isArray(this.currentQuestion.gapAnswers) && this.currentQuestion.gapAnswers.length === 0)) {
            console.error('gapAnswers отсутствует или пуст:', this.currentQuestion.gapAnswers);
            return false;
        }

        if (!Array.isArray(userAnswer)) {
            return false;
        }

        const correctAnswers = Array.isArray(this.currentQuestion.gapAnswers) 
            ? this.currentQuestion.gapAnswers 
            : [this.currentQuestion.gapAnswers];

        // Проверяе соответствие длин массивов
        if (userAnswer.length !== correctAnswers.length) {
            console.error('Количество ответов не совпадает:', {
                userAnswerLength: userAnswer.length,
                correctAnswersLength: correctAnswers.length
            });
            return false;
        }

        return userAnswer.every((answer, index) => {
            if (!correctAnswers[index]) return false;
            const userAns = answer.trim().toLowerCase();
            const correctAns = correctAnswers[index].trim().toLowerCase();
            return correctAns === userAns;
        });
    }

    checkMatchingWordsAnswer(userAnswer) {
        console.log('Проверка ответа для вопроса тпа matchingWords');
        console.log('Ответ польователя:', userAnswer);
        console.log('Правильный ответ:', this.currentQuestion.wordOptions);
        
        const correctAnswers = this.currentQuestion.wordOptions.split(';').map(word => word.trim().toLowerCase());
        const isCorrect = userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
        
        console.log('Результат проверки:', isCorrect);
        return isCorrect;
    }

    updateQuestionNumber() {
        if (this.questionNumberElement) {
            this.questionNumberElement.textContent = `${this.totalQuestions}`;
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
        if (this.currentStageIndex === -1) {
            console.error('Invalid stage index:', this.currentStageIndex);
            this.currentStageIndex = 0;
        }
    
        console.log('Starting test with stage:', this.stages[this.currentStageIndex]);
    
        if (!this.totalQuestions) {
            this.questionNumber = 1;
            this.totalQuestions = 0;
        } else {
            this.questionNumber = this.totalQuestions + 1;
        }
        
        this.updateQuestionNumber();
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

    async fetchWithRetry(url, options = {}, retries = 10) {
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
            console.error('Контейнер для иображения не найден');
        }
    }

    updateTaskDescription(question) {
        const taskDescriptionElement = document.getElementById('task-description');
        if (taskDescriptionElement) {
            let content = '';
            
            // Добавляем instruction если оно есть
            if (question.instruction) {
                content += `<div class="instruction">${question.instruction}</div>`;
            }
            
            // Обновляем содержимое и отображение
            if (content) {
                taskDescriptionElement.innerHTML = content;
                taskDescriptionElement.style.display = 'block';
                console.log('Обновлен task-description:', content);
            } else {
                taskDescriptionElement.style.display = 'none';
                console.log('task-description скрыт (нет контента)');
            }
        } else {
            console.error('Элемент task-description не найден');
        }
    }

    updateCurrentStage() {
        const currentStageElement = document.getElementById('current-stage');
        if (currentStageElement) {
            const currentStage = this.stages[this.currentStageIndex];
            if (currentStage) {
                // Преобразуем первую букву в заглавную
                const formattedStage = currentStage.charAt(0).toUpperCase() + currentStage.slice(1);
                currentStageElement.textContent = formattedStage;
            } else {
                console.error('Invalid stage index:', this.currentStageIndex);
                currentStageElement.textContent = 'Reading'; // значение по умолчанию
            }
        }
    }

    hideTestElements() {
        // Скрваем элементы при инициализации
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
        // даляем бработчики соытий с кнопки submit
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

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    checkAllMatchingAnswersFilled() {
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
        const allFilled = Array.from(dropZones).every(zone => zone.querySelector('.option'));
        
        console.log('Проверка заполнения matching вопроса:', allFilled);
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !allFilled;
        }
    }

    async handleForcedCompletion() {
        try {
            if (!this.user || !this.user.login) {
                throw new Error('User not initialized');
            }

            this.showLoading();

            const completeResponse = await fetch(`${this.API_BASE_URL}/api/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userLogin: this.user.login,
                    finalLevel: 'N/A',
                    finalWss: 28,
                    correctCount: 0,
                    incorrectCount: 0,
                    totalQuestions: 0,
                    timestamp: new Date().toISOString(),
                    forcedCompletion: true
                })
            });

            if (!completeResponse.ok) {
                throw new Error(`HTTP error! status: ${completeResponse.status}`);
            }

            this.hideLoading();
            this.showForcedCompletionMessage();

            // Очищаем все данные
            console.log('Очищаем все данные из localStorage');
            localStorage.clear(); // Очищаем весь localStorage

            this.disableInteractions();
        } catch (error) {
            this.hideLoading();
            console.error("Ошибка ри принудительном завершении теста:", error);
            this.showUnavailableMessage("Произошла ошибка. Пожалуйста, обратитесь к администртору.");
        }
    }

    showForcedCompletionMessage() {
        const message = `
            <div class="test-results forced-completion">
                <h2>Тест завершен</h2>
                <p>Тест был автоматически завершен из-за превышения допустимого количества перезагрузок страницы.</p>
                <p>Результат: Не засчитан</p>
                <p>Пожалуйста, свяжитесь с администратором для получения новой ппытки.</p>
                <a href="https://wiseman-skills.com/lk" class="results-link">Перейти в личный кабинет</a>
            </div>
        `;
        
        this.questionContainer.innerHTML = message;
        
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
}
document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init().catch(error => console.error("Error initializing app:", error));
});

