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
        this.status = 'Completed';
        this.initializeElements();
        this.progressLoaded = false;
        this.submitBtn = document.getElementById('submit-btn');
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

        this.getTimeSpent = () => {
            if (!this.currentQuestion || !this.currentQuestion.timeLimit) {
                return 0;
            }
            // Используем разницу между лимитом времени и оставшимся временем
            return this.currentQuestion.timeLimit - this.timeLeft;
        }

        this.saveAnswerToHistory = async (answerData) => {
            try {
                // Добавляем ответ в историю
                if (!this.answersHistory) {
                    this.answersHistory = [];
                }
                
                // Формируем объект с данными ответа
                const historyEntry = {
                    questionId: answerData.questionId,
                    userAnswer: answerData.userAnswer,
                    isCorrect: answerData.isCorrect,
                    timeSpent: answerData.timeSpent,
                    timestamp: new Date().toISOString(),
                    level: this.currentLevel,
                    stage: this.currentStage,
                    questionType: this.currentQuestionType
                };
                
                // Добавляем запись в историю
                this.answersHistory.push(historyEntry);
                
                // Сохраняем обновленную историю в localStorage
                localStorage.setItem('answersHistory', JSON.stringify(this.answersHistory));
                
                console.log('Ответ успешно сохранен в историю');
                return true;
            } catch (error) {
                console.error('Ошибка при сохранении ответа в историю:', error);
                return false;
            }
        }

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
                // Страница скрыта - остнавливаем таймер
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

        // Добавляем объект для хранения количества вопросов по уровням
        this.questionsCountByLevel = {
            'pre-A1': 0,
            'A1': 0,
            'A2': 0,
            'B1': 0,
            'B2': 0,
            'C1': 0
        };
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
            
            console.log("Прогресс Airtable:", data);
    
            if (data && data.progress) {
                const progress = data.progress;
                
                // Приводим значения к нижнему регистру для равнения
                this.currentStageIndex = this.stages.indexOf(progress.Stage?.toLowerCase());
                if (this.currentStageIndex === -1) this.currentStageIndex = 0;
                
                // Используем точное значение из таблицы для уровня
                this.currentLevel = progress.Level;
                this.currentLevelIndex = this.levels.indexOf(this.currentLevel);
                if (this.currentLevelIndex === -1) this.currentLevelIndex = 0;

               // Проверяем, является ли QuestionsCountByLevel строкой или объектом
            let questionsCountByLevel;
            if (typeof data.progress.QuestionsCountByLevel === 'string') {
                try {
                    questionsCountByLevel = JSON.parse(data.progress.QuestionsCountByLevel);
                } catch (e) {
                    console.error('Ошибка при парсинге QuestionsCountByLevel:', e);
                    questionsCountByLevel = {
                        'pre-A1': 0,
                        'A1': 0,
                        'A2': 0,
                        'B1': 0,
                        'B2': 0,
                        'C1': 0
                        };
                    }
                } else {
                    questionsCountByLevel = data.progress.QuestionsCountByLevel;
            }

            console.log('Распарсенный QuestionsCountByLevel:', questionsCountByLevel);

                const progressForStorage = {
                    stage: data.progress.Stage,
                    currentStageIndex: this.stages.indexOf(data.progress.Stage),
                    currentLevel: data.progress.Level,
                    correctCount: data.progress.CorrectCount,
                    incorrectCount: data.progress.IncorrectCount,
                    totalQuestions: data.progress.TotalQuestions,
                    correctHigherLevel: data.progress.CorrectHigherLevel,
                    incorrectLowerLevel: data.progress.IncorrectLowerLevel,
                    questionsOnCurrentLevel: data.progress.QuestionsOnCurrentLevel,
                    correctOnCurrentLevel: data.progress.CorrectOnCurrentLevel,
                    questionsCountByLevel: questionsCountByLevel,
                    answeredQuestions: typeof data.progress.AnsweredQuestions === 'string' 
                    ? JSON.parse(data.progress.AnsweredQuestions)
                    : data.progress.AnsweredQuestions || [],
                    currentQuestionId: data.progress.CurrentQuestionId,
                    status: data.progress.Status
                };

                localStorage.setItem('testProgress', JSON.stringify(progressForStorage));

                console.log('Восстановлен этап и уровень:', {
                    stage: this.stages[this.currentStageIndex],
                    stageIndex: this.currentStageIndex,
                    level: this.currentLevel,
                    levelIndex: this.currentLevelIndex,
                    originalStage: progress.Stage,
                    QuestionsCountByLevel: progress.QuestionsCountByLevel,
                    AnsweredQuestions: progress.AnsweredQuestions,
                    AnswersHistory: progress.AnswersHistory
                });
                
                // Используем точные имена полей из Airtable
                this.correctCount = progress.CorrectCount || 0;
                this.incorrectCount = progress.IncorrectCount || 0;
                this.totalQuestions = progress.TotalQuestions || 0;
                this.correctHigherLevel = progress.CorrectHigherLevel || 0;
                this.incorrectLowerLevel = progress.IncorrectLowerLevel || 0;
                this.questionsOnCurrentLevel = progress.QuestionsOnCurrentLevel || 0;
                this.questionsCountByLevel = progress.QuestionsCountByLevel || {
                    'pre-A1': 0,
                    'A1': 0,
                    'A2': 0,
                    'B1': 0,
                    'B2': 0,
                    'C1': 0
                };

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
                        console.error("Ошибка при парсинге отвеченных впросов:", e);
                        this.answeredQuestions = new Set();
                    }
                }

                if (progress.AnswersHistory) {
                    try {
                        const answersHistory = JSON.parse(progress.AnswersHistory);
                        localStorage.setItem('answersHistory', JSON.stringify(answersHistory));
                    } catch (e) {
                        console.error("Ошибка при парсинге истории ответов:", e);
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

    // Метод сохранения прогресса в localStorage
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
            currentQuestionId: this.currentQuestion?.id,
            correctInCurrentSeries: this.correctInCurrentSeries,
            questionsInCurrentSeries: this.questionsInCurrentSeries,
            questionsCountByLevel: this.questionsCountByLevel
        };
        localStorage.setItem('testProgress', JSON.stringify(progress));
        console.log("Прогресс сохранён в localStorage:", progress);
    }

    async loadProgressFromLocalStorage() {
        const savedProgress = JSON.parse(localStorage.getItem('testProgress'));
        if (savedProgress) {
            this.currentStageIndex = savedProgress.currentStageIndex ?? 0;
            this.currentLevel = savedProgress.currentLevel ?? 1;
            this.correctCount = savedProgress.correctCount ?? 0;
            this.incorrectCount = savedProgress.incorrectCount ?? 0;
            this.totalQuestions = savedProgress.totalQuestions ?? 0;
            this.correctHigherLevel = savedProgress.correctHigherLevel || 0;
            this.incorrectLowerLevel = savedProgress.incorrectLowerLevel || 0;
            this.groupCorrectAnswers = savedProgress.groupCorrectAnswers ?? 0;
            this.groupTotalAnswers = savedProgress.groupTotalAnswers ?? 0;
            this.groupsAnswered = savedProgress.groupsAnswered ?? 0;
            this.questionsOnCurrentLevel = savedProgress.questionsOnCurrentLevel ?? 0;
            this.currentLevelIndex = savedProgress.currentLevelIndex ?? 0;
            this.answeredQuestions = new Set(savedProgress.answeredQuestions || []);
            this.currentQuestionId = savedProgress.currentQuestionId;
            console.log('Загруен ID вопроса:', this.currentQuestionId);
            if (!this.stages) {
                console.error("Stages are not initialized.");
                this.currentStageIndex = 0; 
            } else {
                this.currentStageIndex = this.stages.indexOf(savedProgress.stage) !== -1 ? this.stages.indexOf(savedProgress.stage) : 0;
            }

            this.correctInCurrentSeries = savedProgress.correctInCurrentSeries || 0;
            this.questionsInCurrentSeries = savedProgress.questionsInCurrentSeries || 0;
            this.questionsCountByLevel = typeof savedProgress.questionsCountByLevel === 'string' 
            ? JSON.parse(savedProgress.questionsCountByLevel)
            : savedProgress.questionsCountByLevel || {
                'pre-A1': 0,
                'A1': 0,
                'A2': 0,
                'B1': 0,
                'B2': 0,
                'C1': 0
            };

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

    async loadProgress() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/getProgress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userLogin: this.userLogin })
            });

            const data = await response.json();
            
            if (data.progress) {
                this.currentStageIndex = this.stages.indexOf(data.progress.Stage);
                this.currentLevel = data.progress.Level;
                this.correctCount = data.progress.CorrectCount || 0;
                this.incorrectCount = data.progress.IncorrectCount || 0;
                this.totalQuestions = data.progress.TotalQuestions || 0;
                this.correctHigherLevel = data.progress.CorrectHigherLevel || 0;
                this.incorrectLowerLevel = data.progress.IncorrectLowerLevel || 0;
                this.questionsOnCurrentLevel = data.progress.QuestionsOnCurrentLevel || 0;
                // Загружаем счетчики по уровням
                this.questionsCountByLevel = data.progress.QuestionsCountByLevel 
                    ? JSON.parse(data.progress.QuestionsCountByLevel)
                    : {
                        'pre-A1': 0,
                        'A1': 0,
                        'A2': 0,
                        'B1': 0,
                        'B2': 0,
                        'C1': 0
                    };
            }
        } catch (error) {
            console.error('Ошибка при загрузке прогресса:', error);
        }
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
            designImage: question.fields.DesignImg || null,
            wordOptions: question.fields.WordOptions ? question.fields.WordOptions.split(';').map(word => word.trim()) : [],
            matchPairs: typeof question.fields.MatchPairs === 'string' ? JSON.parse(question.fields.MatchPairs) : question.fields.MatchPairs || []
        };

        // Безопасная обработка MatchPairs
        if (question.fields.MatchPairs) {
            try {
                const pairs = typeof question.fields.MatchPairs === 'string' 
                    ? JSON.parse(question.fields.MatchPairs)
                    : question.fields.MatchPairs;
                formattedQuestion.matchPairs = Array.isArray(pairs) ? pairs : [];
            } catch (error) {
                console.error('Ошибка при парсинге MatchPairs:', error);
                formattedQuestion.matchPairs = [];
            }
        } else {
            formattedQuestion.matchPairs = [];
        }
        
        // Если это вопрос типа matchingWords, проверям наличие необходимых данных
    if (formattedQuestion.questionType === 'matchingWords' && 
        (!formattedQuestion.wordOptions || !formattedQuestion.sentenceWithGaps)) {
        console.error('Отсутствуют необходимые данные для matchingWords:', {
            wordOptions: formattedQuestion.wordOptions,
            sentenceWithGaps: formattedQuestion.sentenceWithGaps
        });
    }
    //console.log('Форматированный вопрос:', formattedQuestion);
        return formattedQuestion;
    }

    loadQuestion() {
        console.log(`Загрузка вопроса для этапа: ${this.stages[this.currentStageIndex]}, уровня: ${this.levels[this.currentLevelIndex]}`);
        const currentStage = this.stages[this.currentStageIndex];
        const currentLevel = this.levels[this.currentLevelIndex];
        
        const availableQuestions = this.questions[currentStage].filter(q => 
            q.level === currentLevel && !this.answeredQuestions.has(q.id)
        );

        console.log('Доступные вопросы:', availableQuestions.length, availableQuestions);
        console.log('Текущий ID вопроса:', this.currentQuestionId);
        console.log('Текущий уровень:', currentLevel);

        if (availableQuestions.length === 0) {
            console.log('Нет доступных вопросов. Завершаем этап.');
            this.finishStage();
            return;
        }

        // Проверяем, ест ли сохран��нный ID вопроса
        if (this.currentQuestionId && !this.answeredQuestions.has(this.currentQuestionId)) {
            const savedQuestion = this.questions[currentStage].find(q => q.id === this.currentQuestionId);
            if (savedQuestion && savedQuestion.level === currentLevel) {
                console.log("Восстановлен сохраненный вопрос:", savedQuestion);
                this.currentQuestion = savedQuestion;
            } else {
                console.warn("Сохраненный вопрос не найден или уже отвечен. Выбирем случайный.");
                this.chooseRandomQuestion(availableQuestions);
            }
        } else {
            this.chooseRandomQuestion(availableQuestions);
        }

        // Рендерим вопрос
        if (this.currentQuestion) {
            this.renderQuestion(this.currentQuestion);
            console.log('Вопрос отрендерен');
        } else {
            console.error('Вопрос не выбран');
        }

        this.saveProgressToLocalStorage();
        this.sendProgress();

        if (this.currentQuestion && this.currentQuestion.timeLimit) {
            this.startTimer(this.currentQuestion.timeLimit);
        }
    }

    chooseRandomQuestion(availableQuestions) {
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        this.currentQuestion = availableQuestions[randomIndex];
        this.currentQuestionId = this.currentQuestion.id;
        console.log("Выбран случайный вопрос:", this.currentQuestion);
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

    startTimer(duration) {
        if (this.timer) {
            clearInterval(this.timer);
        }

        const timeLimit = duration;
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
                this.handleSubmit({ timeExpired: true });
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
        console.log("ендеринг вопроса типа:", question.questionType);
        
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

        const submitButton = document.createElement('div');
        submitButton.className = 'submit-button';

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.id = 'submit-btn';
        submitBtn.textContent = 'NEXT';
        submitBtn.disabled = true; // Кнопка изначально неактивна

        submitButton.appendChild(submitBtn);
        this.questionContainer.appendChild(submitButton); // Добавляем кнопку в DOM
        this.submitBtn = submitBtn;

        // Добавляем обработчик события после того, как кнопка добавлена в DOM
        this.submitBtn.addEventListener('click', () => this.debouncedHandleSubmit());

        this.updateTaskDescription(question.instruction);
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

        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.debouncedHandleSubmit(e);
        });

        const submitButton = document.createElement('div');
    submitButton.className = 'submit-button';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.id = 'submit-btn';
    submitBtn.textContent = 'NEXT';
    submitBtn.style.display = 'none'; // Изначально скрыта

    submitButton.appendChild(submitBtn);
    form.appendChild(submitButton);
    
    this.submitBtn = submitBtn;
    submitBtn.addEventListener('click', () => this.handleSubmit());

    return form;
    }

    renderMatchingQuestion(question) {
        if (!question.matchPairs || !Array.isArray(question.matchPairs)) {
            console.error('Некорректные данные для matching вопроса:', question);
            return;
        }

        const container = document.createElement('div');
        container.className = 'matching-question';

        // Контейнер для изображений
        const imagesRow = document.createElement('div');
        imagesRow.className = 'images-row';

        // Контейнер для drop-зон
        const dropZonesRow = document.createElement('div');
        dropZonesRow.className = 'drop-zones-row';

        question.matchPairs.forEach((pair, index) => {
            // Изображение
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            
            const img = document.createElement('img');
            img.src = pair.image;
            img.alt = pair.option;
            imageWrapper.appendChild(img);
            imagesRow.appendChild(imageWrapper);

            // Drop-зона
            const dropZone = document.createElement('div');
            dropZone.className = 'drop-zone';
            dropZone.setAttribute('data-index', index);
            dropZonesRow.appendChild(dropZone);
        });

        // Контейнер для вариантов ответов
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        // Перемешиваем вариаты ответов
        const shuffledOptions = [...question.matchPairs]
            .map(pair => pair.option)  // получаем только опции
            .sort(() => Math.random() - 0.5);  // перемешиваем

        // Создем элеенты для перемешанных вариантов
        shuffledOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.draggable = true;
            optionElement.setAttribute('data-word', option);
            optionsContainer.appendChild(optionElement);
        });

        container.appendChild(imagesRow);
        container.appendChild(dropZonesRow);
        container.appendChild(optionsContainer);

        this.questionContainer.innerHTML = '';
        this.questionContainer.appendChild(container);

        // Добавляем обработчики drag and drop
        this.initMatchingDragAndDrop();

        const form = document.createElement('form');
        
        // ... код для создания drag-and-drop элементов ...

        const submitBtn = document.createElement('button');
submitBtn.type = 'button';
submitBtn.id = 'submit-btn';
submitBtn.textContent = 'Next';
submitBtn.addEventListener('click', () => this.handleSubmit());
        
        // Добавляем обработчик события на форму
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.debouncedHandleSubmit(e);
        });
        
        form.appendChild(submitBtn);
        this.submitBtn = submitBtn;

        return form;
    }

    initMatchingDragAndDrop() {
        const options = this.questionContainer.querySelectorAll('.option');
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');

        options.forEach(option => {
            option.addEventListener('dragstart', (e) => {
                option.classList.add('dragging');
                e.dataTransfer.setData('text/plain', option.getAttribute('data-word'));
            });

            option.addEventListener('dragend', () => {
                option.classList.remove('dragging');
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
                const option = this.questionContainer.querySelector(`.option[data-word="${word}"]`);
                
                if (option) {
                    // Если в зоне уже есть элемент, меняем их местами
                    const existingOption = zone.querySelector('.option');
                    if (existingOption) {
                        const sourceZone = option.parentElement;
                        if (sourceZone.classList.contains('drop-zone')) {
                            sourceZone.appendChild(existingOption);
                        } else {
                            const optionsContainer = this.questionContainer.querySelector('.options-container');
                            optionsContainer.appendChild(existingOption);
                        }
                    }
                    zone.appendChild(option);
                    this.checkAllMatchingAnswersFilled();
                }
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
        // ... остальной код ...
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

        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.debouncedHandleSubmit(e);
        });

        const submitBtn = document.createElement('button');
submitBtn.type = 'button';
submitBtn.id = 'submit-btn';
submitBtn.textContent = 'Next';
submitBtn.addEventListener('click', () => this.handleSubmit());
        
        form.appendChild(submitBtn);
        this.submitBtn = submitBtn;

        return form;
    }

    renderMatchingWordsQuestion(question) {
        console.log('Рендеринг matchingWords вопроса:', question);

        const container = document.createElement('div');
        container.className = 'matching-words-container';

        // Создаем контейнер для предложения с пропусками
        const sentenceContainer = document.createElement('div');
        sentenceContainer.className = 'matchingWords-question matching-words';

        // Создаем drop zones для пропусков
        const parts = question.sentenceWithGaps.split('_');
        parts.forEach((part, index) => {
            sentenceContainer.appendChild(document.createTextNode(part));
            
            if (index < parts.length - 1) {
                const dropZone = document.createElement('div');
                dropZone.className = 'drop-zone';
                dropZone.setAttribute('data-index', index);

                // Добавляем обработчики drop событий
                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.classList.add('drag-over');
                });

                dropZone.addEventListener('dragleave', () => {
                    dropZone.classList.remove('drag-over');
                });

                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('drag-over');
                    const option = document.querySelector('.option.dragging');
                    if (option) {
                        // Если в зоне уже есть элемент, меняем их местами
                        const existingOption = dropZone.querySelector('.option');
                        if (existingOption) {
                            const sourceZone = option.parentElement;
                            if (sourceZone.classList.contains('drop-zone')) {
                                sourceZone.appendChild(existingOption);
                            } else {
                                const optionsContainer = document.querySelector('.options-container');
                                optionsContainer.appendChild(existingOption);
                            }
                        }
                        dropZone.appendChild(option);
                        this.checkAllMatchingAnswersFilled();
                    }
                });

                sentenceContainer.appendChild(dropZone);
            }
        });

        // Перемешиваем варианты ответов для отображения
        const shuffledOptions = [...question.wordOptions].sort(() => Math.random() - 0.5);

        // Создаем контейнер для вариантов ответов
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        shuffledOptions.forEach((word, index) => {
            const option = document.createElement('div');
            option.className = 'option';
            option.textContent = word;
            option.draggable = true;
            option.setAttribute('data-word', word);
            
            option.addEventListener('dragstart', () => {
                option.classList.add('dragging');
            });

            option.addEventListener('dragend', () => {
                option.classList.remove('dragging');
            });

            optionsContainer.appendChild(option);
        });

        container.appendChild(sentenceContainer);
        container.appendChild(optionsContainer);

        this.questionContainer.innerHTML = '';
        this.questionContainer.appendChild(container);

        if (this.submitBtn) {
            this.submitBtn.disabled = true;
        }

        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.debouncedHandleSubmit(e);
        });
        return form;
    }

    // Добавляем вспомогательные методы
    returnWordToOptions(word) {
        const optionsContainer = this.questionContainer.querySelector('.word-options');
        if (optionsContainer) {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = word;
            wordItem.draggable = true;
            wordItem.setAttribute('data-word', word);
            
            wordItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', word);
                wordItem.classList.add('dragging');
            });

            wordItem.addEventListener('dragend', () => {
                wordItem.classList.remove('dragging');
            });

            optionsContainer.appendChild(wordItem);
        }
    }

    checkAllWordsFilled() {
        const dropZones = this.questionContainer.querySelectorAll('.word-drop-zone');
        const allFilled = Array.from(dropZones).every(zone => zone.firstChild);
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !allFilled;
        }
    }

    addInputListeners() {
        const inputs = this.questionContainer.querySelectorAll('.gap-answer');
        inputs.forEach(input => {
            // Убираем placeholder
            input.removeAttribute('placeholder');
            
            input.addEventListener('input', (e) => {
                // азрешаем латинские и русские буквы
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
        console.log('Получеие ответа пльзователя для вопроса типа:', this.currentQuestion.questionType);
        
        let answers;  // Объявляем переменную в начале функци
        
        switch(this.currentQuestion.questionType) {
            case 'multiple-choice':
                const selectedOption = this.questionContainer.querySelector('.answer-option.selected');
                return selectedOption ? selectedOption.textContent : null;                
            case 'typing':
                const inputs = this.questionContainer.querySelectorAll('.gap-answer');
                answers = Array.from(inputs).map(input => input.value.trim());
                console.log('Собранные ответы typing:', answers);
                return answers.every(answer => answer !== '') ? answers : null;                         
            case 'matchingWords':
                const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
                answers = Array.from(dropZones).map(zone => {
                    const option = zone.querySelector('.option');
                    return option ? option.getAttribute('data-word') : null;
                });
                console.log('Собранные ответы:', answers);
                return answers.every(answer => answer !== null) ? answers : null;                
            case 'matching':
                const matchingDropZones = this.questionContainer.querySelectorAll('.drop-zone');
                answers = Array.from(matchingDropZones).map(zone => {
                    const option = zone.querySelector('.option');
                    return option ? option.getAttribute('data-word') : null;
                });
                console.log('Собранные ответы matching:', answers);
                return answers.every(answer => answer !== null) ? answers : null;
                
            default:
                console.error('Неизвестный тип вопроса:', this.currentQuestion.questionType);
                return null;
        }
    }

    checkAnswer(userAnswer) {
        console.log('Проверка ответа для типа:', this.currentQuestion.questionType);
        
        switch(this.currentQuestion.questionType) {
            case 'multiple-choice':
                return this.checkMultipleChoiceAnswer(userAnswer);
            case 'typing':
                return this.checkTypingAnswer(userAnswer);
            case 'matching':
                const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
                const answers = Array.from(dropZones).map(zone => {
                        const option = zone.querySelector('.option');
                        return option ? option.getAttribute('data-word') : null;
                    });
                    
                    console.log('Собранные ответы matching:', answers);
                    
                // Возвращаем ответы только если все зон заполнены
                return answers.every(answer => answer !== null) ? answers : null;                
            case 'matchingWords':
                return this.checkMatchingWordsAnswer(userAnswer);
            default:
                console.error('Тип вопроса не определен:', this.currentQuestion.questionType);
                return false;
        }
    }

    async handleSubmit(event) {
        console.log('handleSubmit вызван', event);
        
        let isCorrect = false;
        let questionType = this.currentQuestion.questionType;
        let userAnswer = null;

        // Проверяем, истекло ли время
        if (event && event.timeExpired) {
            console.log('Время истекло, переход к следующему вопросу');
            
            const answerData = {
                questionId: this.currentQuestion.id,
                userAnswer: null,
                isCorrect: false,
                timeSpent: this.currentQuestion.timeLimit || 0
            };

            // Добавляем вопрос в отвеченные
            this.answeredQuestions.add(this.currentQuestion.id);

            await this.saveAnswerToHistory(answerData);
            await this.saveAnswer(answerData);

            await this.evaluateSeries(false);
        } else {
            // Проверяем ответ в зависимости от типа вопроса
            switch (questionType) {
                case 'multiple-choice':
                    userAnswer = this.getMultipleChoiceAnswer();
                    if (userAnswer === null) {
                        console.log('Ответ не выбран');
                        return;
                    }
                    isCorrect = this.checkMultipleChoiceAnswer(userAnswer);
                    break;

                case 'matching':
                    userAnswer = this.getMatchingAnswer();
                    if (!userAnswer) {
                        console.log('Не все элементы спарены');
                        return;
                    }
                    isCorrect = this.checkMatchingAnswer(userAnswer);
                    break;

                case 'type-img':
                    userAnswer = this.getTypeImgAnswer();
                    if (!userAnswer.every(answer => answer.trim())) {
                        console.log('Не все поля заполнены');
                        return;
                    }
                    isCorrect = this.checkTypeImgAnswer(userAnswer);
                    break;

                case 'typing':
                    userAnswer = this.getTypingAnswer();
                    if (!userAnswer.every(answer => answer.trim())) {
                        console.log('Не все поля заполнены');
                        return;
                    }
                    isCorrect = this.checkTypingAnswer(userAnswer);
                    break;

                case 'matchingWords':
                    userAnswer = this.getMatchingAnswers();
                    if (!userAnswer.every(answer => answer)) {
                        console.log('Не все слова сопоставлены');
                        return;
                    }
                    isCorrect = this.checkMatchingAnswer(userAnswer);
                    break;
            }

            const answerData = {
                questionId: this.currentQuestion.id,
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                timeSpent: this.getTimeSpent()
            };

            // Добавляем вопрос в отвеченные
            this.answeredQuestions.add(this.currentQuestion.id);

            await this.saveAnswerToHistory(answerData);
            await this.saveAnswer(answerData);

            await this.evaluateSeries(isCorrect);
        }

        await this.loadQuestion();
    }

    async saveAnswer(answerData) {
        try {
            const data = {
                userLogin: this.user.login,
                questionId: this.currentQuestion.id,
                stage: this.stages[this.currentStageIndex],
                level: this.levels[this.currentLevelIndex],
                questionType: this.currentQuestion.questionType,
                timestamp: new Date().toISOString(),
                isCorrect: answerData.isCorrect
            };

            // обавляем сецифичные для типа вопроса данные
            switch (this.currentQuestion.questionType) {
                case 'multiple-choice':
                    data.userAnswer = answerData.userAnswer;
                    break;
                case 'typing':
                    data.userAnswer = JSON.stringify(answerData.userAnswer);
                    data.gapAnswers = JSON.stringify(answerData.gapAnswers);
                    data.correct = this.currentQuestion.correct;
                    break;
                case 'matching':
                    data.userAnswer = JSON.stringify(answerData.userAnswer);
                    data.correct = JSON.stringify(this.currentQuestion.matchPairs.map(pair => pair.option));
                    break;
                case 'matchingWords':
                    data.userAnswer = JSON.stringify(answerData.userAnswer);
                    data.correct = JSON.stringify(this.currentQuestion.matchPairs.map(pair => pair.option));
                    break;
                default:
                    console.warn('Unknown question type:', this.currentQuestion.questionType);
                    break;
            }

            const response = await fetch(`${this.API_BASE_URL}/api/saveAnswer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
            }

            console.log('Ответ успешно сохранен в историю');
        } catch (error) {
            console.error('Ошибка при сохранении ответ в историю:', error);
            throw error;
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
                console.error("Оибка при сохранени прогресса в Airtable:", data.error);
            } else {
                console.log("Прогресс успешно сохранен в Airtable");
            }
        })
        .catch(error => {
            console.error("Ошибка при сораннии прогресс в Airtable:", error);
        });
    }

    async evaluateSeries(isCorrect) {
        // Добавляем проверку на наличие currentQuestion и levels
        if (!this.currentQuestion || !this.levels) {
            console.error("Error: this.currentQuestion or this.levels is undefined!");
            return;
        }
        
        console.log('Оенка серии:', {
            correctInSeries: this.correctInCurrentSeries,
            questionsInSeries: this.questionsInCurrentSeries,
            currentLevel: this.currentLevel,
            questionsOnLevel: this.questionsCountByLevel[this.currentLevel]
        });
        // Проверяем, что questionsCountByLevel является объектом
    if (typeof this.questionsCountByLevel === 'string') {
        this.questionsCountByLevel = JSON.parse(this.questionsCountByLevel);
    }

    // Обновляем счетчики
    if (!this.questionsCountByLevel[this.currentLevel]) {
        this.questionsCountByLevel[this.currentLevel] = 0;
    }
    this.questionsCountByLevel[this.currentLevel]++;

    console.log(`Обновлен счетчик вопросов для уровня ${this.currentLevel}:`, 
        this.questionsCountByLevel[this.currentLevel]);

        // Определяем индекс уровня вопроса
        const questionLevelIndex = this.levels.findIndex(level => level === this.currentQuestion.level);
        const targetLevelIndex = this.levels.indexOf(this.currentLevel);

        if (isCorrect) {
            this.correctCount++;
            this.correctInCurrentSeries++;
            if (questionLevelIndex === targetLevelIndex) {
                this.correctOnCurrentLevel++;
            } else if (questionLevelIndex > targetLevelIndex) {
                this.correctHigherLevel++;
            }
        } else {
            this.incorrectCount++;
            if (questionLevelIndex < targetLevelIndex) {
                this.incorrectLowerLevel++;
            }
        }

        // Обновляем счетчики
        this.questionsInCurrentSeries++;
        this.questionsOnCurrentLevel++;
        this.totalQuestions++;

        // Проверяем общее количество вопросов на уровне
        if (this.questionsCountByLevel[this.currentLevel] >= 27) {
            console.log(`Достигнут лимит в 27 вопросов на уровне ${this.currentLevel}`);
            await this.finishStage();
            return;
        }

        // Проверяем серию из 3 вопросов
        if (this.questionsInCurrentSeries === 3) {
            if (this.correctInCurrentSeries === 3 && this.currentLevelIndex < this.levels.length - 1) {
                this.currentLevelIndex++;
                this.currentLevel = this.levels[this.currentLevelIndex];
            } else if (this.correctInCurrentSeries === 0 && this.currentLevelIndex > 0) {
                this.currentLevelIndex--;
                this.currentLevel = this.levels[this.currentLevelIndex];
            }
            
            // Сбрасываем счетчики только после 3-х вопросов
            this.questionsInCurrentSeries = 0;
            this.correctInCurrentSeries = 0;
        }

        await this.saveProgress();
        this.updateQuestionNumber();
        await this.saveProgressToLocalStorage();
    }

    moveToNextLevel() {
        if (this.currentLevelIndex < this.levels.length - 1) {
            this.correctOnHigherLevel += this.correctOnCurrentLevel;
            this.currentLevelIndex++;
            this.questionsOnCurrentLevel = 0;
            this.correctOnCurrentLevel = 0;
            console.log(`Перехд на следующий уровень: ${this.levels[this.currentLevelIndex]}`);
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
        try {
            // Проверяем и форматируем данные перед отправкой
            const progressData = {
                userLogin: this.user?.login || '',
                stage: this.stages[this.currentStageIndex] || 'reading',
                level: this.levels[this.currentLevelIndex] || 'pre-A1',
                status: 'In Progress', 
                correctCount: this.correctCount || 0,
                incorrectCount: this.incorrectCount || 0,
                totalQuestions: this.totalQuestions || 0,
                correctHigherLevel: this.correctHigherLevel || 0,
                incorrectLowerLevel: this.incorrectLowerLevel || 0,
                questionsOnCurrentLevel: this.questionsOnCurrentLevel || 0,
                currentQuestionId: this.currentQuestionId || null,
                // Преобразуем Set в массив и фильтруем null значения
                answeredQuestions: Array.from(this.answeredQuestions || []).filter(Boolean),
                timestamp: new Date().toISOString(),
                // Добавляем текущий уровень как отдельное поле
                currentLevel: this.currentLevel || 'pre-A1'
            };

            console.log("Отправляемые данные прогресса:", progressData);

            const response = await fetch(`${this.API_BASE_URL}/api/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(progressData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log("Прогресс успешно отправлен:", data);
            return data;
        } catch (error) {
            console.error("Ошибка при отправке прогресса:", error);
            // Можно добавить повторную попытку отправки
            throw error;
        }
    }
    
    async finishStage() {
        console.log(`Завершение этапа ${this.stages[this.currentStageIndex]}`);
        
        // Сохраняем результаты текущего этапа
        const stageResult = {
            stage: this.stages[this.currentStageIndex],
            level: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions
        };
        
        this.stagesResults.push(stageResult);
        
        // Определяем следующий этап
        const currentStage = this.stages[this.currentStageIndex];
        let nextStage;
        
        if (currentStage === 'reading') {
            nextStage = 'listening';
        } else if (currentStage === 'listening') {
            nextStage = 'writing';
        }
        
        if (nextStage) {
            console.log('Переход к этапу:', nextStage);
            
            // Сбрасываем текущий вопрос
            this.currentQuestion = null;
            
            // Обновляем индекс этапа
            const nextStageIndex = this.stages.indexOf(nextStage);
            if (nextStageIndex === -1) {
                console.error('Invalid next stage:', nextStage);
                return;
            }
            this.currentStageIndex = nextStageIndex;
            
            // Сбрасываем счетчики для нового этапа
            this.correctCount = 0;
            this.incorrectCount = 0;
            this.totalQuestions = 0;
            this.correctHigherLevel = 0;
            this.incorrectLowerLevel = 0;
            this.questionsOnCurrentLevel = 0;
            this.correctOnCurrentLevel = 0;
            this.correctInCurrentSeries = 0;
            this.questionsInCurrentSeries = 0;
            this.questionsCountByLevel = {
                'pre-A1': 0,
                'A1': 0,
                'A2': 0,
                'B1': 0,
                'B2': 0,
                'C1': 0
            };
            
            // Сохраняем прогресс перед загрузкой нового вопроса
            await this.saveProgress();
            
            // Показываем промежуточный экран и ждем нажатия кнопки
            await this.showIntermediateScreen();
            // loadQuestion будет вызван в обработчике кнопки
        } else {
            console.log('Все этапы завершены');
            await this.finishTest();
        }
    }

    // Также проверим метод updateCurrentStage
    updateCurrentStage(stage) {
        if (!this.stages.includes(stage)) {
            console.error('Invalid stage:', stage);
            return false;
        }
        
        this.currentStageIndex = this.stages.indexOf(stage);
        return true;
    }

    async showIntermediateScreen() {
        this.questionContainer.innerHTML = `
            <div class="intermediate-screen">
                <h2>Next Stage: Listening</h2>
                <p>You have completed the Reading section. The Listening section will begin shortly. Please put on your headphones or earbuds for optimal audio quality.</p>
                <p>You can review the instructions from the start screen if needed.</p>
                <button id="start-listening-btn">Start Listening Section</button>
            </div>
        `;

        this.hideTestElements();

        return new Promise((resolve) => {
            document.getElementById('start-listening-btn').addEventListener('click', async () => {
                await this.loadQuestion(); // Загружаем вопрос только после нажатия кнопки
                resolve();
            });
        });
    }

    async finishTest() {
        const finalWss = this.computeFinalWss();
        const finalLevel = this.calculateFinalLevel(finalWss);
        
        // Получаем резульаты по этапам
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

            // Показываем результат
            this.showResults();
            this.disableInteractions();
            
            // Очищаем локальный прогресс
            localStorage.removeItem('reloadCount');
            localStorage.removeItem('testProgress');

            this.sendResultsToAirtable(); // Отпрвка результатов

            await this.resetProgress(); // Добавлено: сброс прогресса
        } catch (error) {
            console.error("Ошибка ри завершении теста:", error);
            alert("Произошла ошибка при завершении теста. Пожалуйста, попробуйте еще раз или свяжитесь с администратором.");
        }
        this.showResultsScreen();

        localStorage.removeItem('answersHistory'); // Очищаем историю ответов
        
        // Отправляем финальные результаты
        const results = {
            userLogin: this.user.login,
            finalLevel: this.currentLevel,
            finalWss: this.calculateFinalWSS(),
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            timestamp: new Date().toISOString(),
            stagesResults: this.stagesResults
        };

        await this.sendResultsToAirtable(results);
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
            localStorage.removeItem('answersHistory'); // Добавляем очистку истории ответов
            
            // Сброс локальных переменных
            this.currentStageIndex = 0;
            this.currentLevel = this.levels[0];
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
            console.error("Ошибка при сбросе погресса:", error);
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

    // Доплнительно, давайте изменим обработку ошиок  клиенском коде:

    showResults() {
        const container = document.getElementById('question-container');
        if (!container) {
            console.error('Не найден контейнер для отображения результатов');
            return;
        }
        if (this.timerElement) {
            this.timerElement.style.display = 'none';
        }
        let resultsHTML = '<div class="results-container">';
        
        // Показываем результаты для каждого этап
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

    // Логика для вычисения иоговоо уровн на основе WSS
    calculateFinalLevel(wss) {
        const wssScale = this.initializeWssScale();
        for (let i = 0; i < wssScale.length; i++) {
            const entry = wssScale[i];
            const isWithinRange = wss >= entry.minWss && wss <= entry.maxWss;
            console.log(`Проерка уровня ${entry.level}:`, { wss, minWss: entry.minWss, maxWss: entry.maxWss, isWithinRange });
            if (isWithinRange) {
                console.log('Определен уровень:', entry.level);
                return entry.level;
            }
        }
        // Проверка для последнего урвня
        if (wss >= wssScale[wssScale.length - 1].minWss) {
            return wssScale[wssScale.length - 1].level;
        }
        // Если WSS меньше минимального значения в шале, возвращаем первый уровень
        return wssScale[0].level;
    }

    async sendResultsToAirtable(results) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(results)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Результаты успешно отправлены:', data);
            return data;
        } catch (error) {
            console.error('Ошибка при отправке результтов в Airtable:', error);
            throw error;
        }
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
            //this.correctCount++;
            this.groupCorrectAnswers++;
            this.correctHigherLevel++;
        } else {
            //this.incorrectCount++;
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
        const correctAnswer = this.currentQuestion.matchPairs.map(pair => pair.option);
        return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
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
        // Если время истекло и ответ не был выбран
    if (!userAnswer) {
        return false;
    }
    
        console.log('Проверка ответа multiple-choice:', {
            userAnswer,
            correctAnswer: this.currentQuestion.correct
        });

        // Оищаем ответы от пробелов и переносов строк
        const cleanUserAnswer = userAnswer.trim().replace(/\s+/g, '');
        const cleanCorrectAnswer = this.currentQuestion.correct.trim().replace(/\s+/g, '');

        const isCorrect = cleanUserAnswer === cleanCorrectAnswer;

        console.log('Результат проверки multiple-choice:', {
            userAnswer: cleanUserAnswer,
            correctAnswer: cleanCorrectAnswer,
            isCorrect
        });

        return isCorrect;
    }

    checkTypeImgAnswer(userAnswer) {
        const correctAnswers = this.currentQuestion.correct.split(';').map(ans => ans.trim().toLowerCase());
        return userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
    }

    checkTypingAnswer(userAnswer) {
        console.log('Прверка ответа typing:', {
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

        // Проверяе соответствие дин массивов
        if (userAnswer.length !== correctAnswers.length) {
            console.error('Количество тветов не совпадает:', {
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
        console.log('Проверка ответа matchingWords:', {
            userAnswer,
            correctAnswers: this.currentQuestion.wordOptions
        });
    
        if (!Array.isArray(userAnswer) || !Array.isArray(this.currentQuestion.wordOptions)) {
            console.log('Неверный формат ответов');
            return false;
        }
    
        if (userAnswer.length !== this.currentQuestion.wordOptions.length) {
            console.log('Разное количество ответов');
            return false;
        }
    
        const isCorrect = userAnswer.every((answer, index) => {
            const correct = this.currentQuestion.wordOptions[index];
            console.log(`Проверка ответа ${index}:`, {
                userAnswer: answer,
                correctAnswer: correct,
                isMatch: answer === correct
            });
            return answer === correct;
        });
    
        console.log('Результат проверки:', isCorrect);
        return isCorrect;
    }

    updateQuestionNumber() {
        const questionNumberElement = document.getElementById('question-number');
        if (questionNumberElement) {
            const progress = JSON.parse(localStorage.getItem('testProgress') || '{}');
            questionNumberElement.textContent = `${this.totalQuestions + 1}`;
        }
    }

    computeFinalWss() {
        // Убеждаемся, что у нас есть текущий уровень
        const targetLevel = this.currentLevel || 'A1';
        
        const result = {
            targetLevel: targetLevel,
            correctOnCurrentLevel: this.correctOnCurrentLevel,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel
        };

        console.log('Расчет finalWss:', result);

        const minWss = this.getMinWssForLevel(targetLevel);
        const wssShift = this.correctOnCurrentLevel + this.correctHigherLevel - this.incorrectLowerLevel;
        const finalWss = minWss + wssShift;

        return {
            ...result,
            finalWss: finalWss
        };
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
        
        // Устанавливаем статус "in progress" при старте теста
        this.status = 'In Progress';
        this.saveProgress();
    }

    getMatchingWordsAnswer() {
        console.log('Получение отвеов matchingWords');
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
        const answers = Array.from(dropZones).map(zone => {
            const option = zone.querySelector('.option');
            const answer = option ? option.getAttribute('data-word') : null;
            console.log('Ответ из зоны:', answer);
            return answer;
        }).filter(answer => answer !== null); // Фильтруем null значения

        console.log('Собранные ответы matchingWords:', answers);
        return answers.length === dropZones.length ? answers : null;
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

    updateDesignImage(imageUrl) {
        const designImageContainer = document.getElementById('design-image');
        if (designImageContainer) {
            if (imageUrl) {
                designImageContainer.innerHTML = `<img src="${imageUrl}" alt="Design Image">`;
            } else {
                designImageContainer.innerHTML = '';
            }
        } else {
            console.error('Контейнер design-image не найден');
        }
    }

    updateTaskDescription(instruction) {
        const taskDescriptionElement = document.getElementById('task-description');
        if (taskDescriptionElement) {
            if (instruction) {
                taskDescriptionElement.innerHTML = `<div class="instruction">${instruction}</div>`;
                taskDescriptionElement.style.display = 'block';
            } else {
                taskDescriptionElement.style.display = 'none';
            }
        } else {
            console.error('Элемент task-description не найден');
        }
    }

    hideTestElements() {
        // элементы при инициализации
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

    // Дбавим новый метод для отключения взаимодействий
    disableInteractions() {
        // даляем бработчики соытий  кнопки submit
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
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !allFilled;
            console.log('Все пропуски заполнены:', allFilled);
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
            console.error("Ошибка ри принудтеьном заверении теста:", error);
            this.showUnavailableMessage("Произошла ошибка при завершении теста. Пожалуйста, обратитесь к администртору.");
        }
    }

    showForcedCompletionMessage() {
        const message = `
            <div class="test-results forced-completion">
                <h2>Тест завершен</h2>
                <p>Тест был автоматически завершен из-за превышения допустмого количества перезагрузок страницы.</p>
                <p>Результат: Не засчитан</p>
                <p>Пожалуйста, свяжитесь с адмнистратоом для получения новой ппытки.</p>
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

    initDragAndDrop() {
        const options = this.questionContainer.querySelectorAll('.option');
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
    
        let draggedElement = null;
        let initialX = 0;
        let initialY = 0;
    
        options.forEach(option => {
            option.addEventListener('touchstart', (e) => {
                draggedElement = option;
                initialX = e.touches[0].clientX - option.offsetLeft;
                initialY = e.touches[0].clientY - option.offsetTop;
            });
    
            option.addEventListener('touchmove', (e) => {
                if (draggedElement) {
                    e.preventDefault();
                    const x = e.touches[0].clientX - initialX;
                    const y = e.touches[0].clientY - initialY;
                    draggedElement.style.transform = `translate(${x}px, ${y}px)`;
                }
            });
    
            option.addEventListener('touchend', (e) => {
                if (draggedElement) {
                    const x = e.changedTouches[0].clientX - initialX;
                    const y = e.changedTouches[0].clientY - initialY;
                    draggedElement.style.transform = '';
    
                    dropZones.forEach(zone => {
                        const rect = zone.getBoundingClientRect();
                        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                            zone.appendChild(draggedElement);
                            this.checkAllMatchingAnswersFilled();
                        }
                    });
                    draggedElement = null;
                }
            });
    
            // Добавляем обработчики для мыши для десктопо
            option.addEventListener('mousedown', (e) => {
                draggedElement = option;
                initialX = e.clientX - option.offsetLeft;
                initialY = e.clientY - option.offsetTop;
            });
    
            option.addEventListener('mousemove', (e) => {
                if (draggedElement) {
                    const x = e.clientX - initialX;
                    const y = e.clientY - initialY;
                    draggedElement.style.transform = `translate(${x}px, ${y}px)`;
                }
            });
    
            option.addEventListener('mouseup', (e) => {
                if (draggedElement) {
                    const x = e.clientX - initialX;
                    const y = e.clientY - initialY;
                    draggedElement.style.transform = '';
    
                    dropZones.forEach(zone => {
                        const rect = zone.getBoundingClientRect();
                        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                            zone.appendChild(draggedElement);
                            this.checkAllMatchingAnswersFilled();
                        }
                    });
                    draggedElement = null;
                }
            });
        });
    }

    async saveProgress() {
        try {
            // Сохраняем в localStorage
            const progress = {
                stage: this.stages[this.currentStageIndex],
                currentStageIndex: this.currentStageIndex,
                currentLevel: this.currentLevel,
                correctCount: this.correctCount,
                incorrectCount: this.incorrectCount,
                totalQuestions: this.totalQuestions,
                correctHigherLevel: this.correctHigherLevel,
                incorrectLowerLevel: this.incorrectLowerLevel,
                questionsOnCurrentLevel: this.questionsOnCurrentLevel,
                correctOnCurrentLevel: this.correctOnCurrentLevel,
                correctInCurrentSeries: this.correctInCurrentSeries,
                questionsInCurrentSeries: this.questionsInCurrentSeries,
                answeredQuestions: Array.from(this.answeredQuestions),
                currentQuestionId: this.currentQuestion?.id,
                QuestionsCountByLevel: this.questionsCountByLevel,
                status: this.status || 'In Progress',
                answersHistory: this.answersHistory

            };

            localStorage.setItem('testProgress', JSON.stringify(progress));
            console.log('Прогресс сохранён в localStorage:', progress);

            // Получаем историю ответов из localStorage
            const answersHistory = localStorage.getItem('answersHistory');

            // Подготавливаем данные для отправки на сервер
            const progressData = {
                userLogin: this.user.login,
                stage: progress.stage,
                level: progress.currentLevel,
                correctCount: progress.correctCount,
                incorrectCount: progress.incorrectCount,
                questionsCountByLevel: JSON.stringify(this.questionsCountByLevel || {
                    'pre-A1': 0,
                    'A1': 0,
                    'A2': 0,
                    'B1': 0,
                    'B2': 0,
                    'C1': 0
                }),
                totalQuestions: progress.totalQuestions,
                correctHigherLevel: progress.correctHigherLevel,
                incorrectLowerLevel: progress.incorrectLowerLevel,
                questionsOnCurrentLevel: progress.questionsOnCurrentLevel,
                correctOnCurrentLevel: progress.correctOnCurrentLevel,
                timestamp: new Date().toISOString(),
                answersHistory: JSON.stringify(this.answersHistory || [])
            };

            // Отправляем на сервер
            const response = await fetch(`${this.API_BASE_URL}/api/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(progressData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка при сохранении прогресса:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                return null;
            }

            const result = await response.json();
            console.log('Прогресс успешно отправлен:', result);
            return result;

        } catch (error) {
            console.error('Ошибка при сохранении прогресса:', error);
            return null;
        }
    }

    getMatchingAnswers() {
        const dropZones = this.questionContainer.querySelectorAll('.drop-zone');
        const answers = Array.from(dropZones).map(zone => {
            const option = zone.querySelector('.option');
            return option ? option.textContent.trim() : null;
        });
        return answers;
    }

    getTypingAnswers() {
        const inputs = this.questionContainer.querySelectorAll('input.gap-answer');
        return Array.from(inputs).map(input => input.value.trim());
    }

    showResultsScreen() {
        let resultsHTML = '<div class="results-container">';
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
        this.questionContainer.innerHTML = resultsHTML;
    }
}   

document.addEventListener('DOMContentLoaded', () => {
    const testApp = new TestApp();
    testApp.init();
});