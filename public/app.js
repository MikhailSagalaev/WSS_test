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
                        console.error("Ошибка при парсинге отвеченных впросов:", e);
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

    // Мтод �� схрнения прогресса в localStorage
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
            currentQuestionId: this.currentQuestion?.id
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
            console.log('Загру��ен ID вопроса:', this.currentQuestionId);
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
        
        // Если это вопрос типа matchingWords, проверяем наличие необходимых данных
    if (formattedQuestion.questionType === 'matchingWords' && 
        (!formattedQuestion.wordOptions || !formattedQuestion.sentenceWithGaps)) {
        console.error('Отсутствуют необходимые данные для matchingWords:', {
            wordOptions: formattedQuestion.wordOptions,
            sentenceWithGaps: formattedQuestion.sentenceWithGaps
        });
    }
    console.log('Форматированный вопрос:', formattedQuestion);
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
            this.finishStage();
            return;
        }

        // Проверяем, есть ли сохраненный ID вопроса
        if (this.currentQuestionId && !this.answeredQuestions.has(this.currentQuestionId)) {
            const savedQuestion = this.questions[currentStage].find(q => q.id === this.currentQuestionId);
            if (savedQuestion && savedQuestion.level === currentLevel) {
                console.log("Восстановлен сохраненный вопрос:", savedQuestion);
                this.currentQuestion = savedQuestion;
            } else {
                console.warn("Сохраненный вопрос не найден или уже отвечен. Выбираем случайный.");
                this.chooseRandomQuestion(availableQuestions);
            }
        } else {
            this.chooseRandomQuestion(availableQuestions);
        }

        // Рендерим вопрос
        if (this.currentQuestion.designImage) {
            this.updateDesignImage(this.currentQuestion.designImage);
        }
        if (this.currentQuestion.instruction) {
            this.updateTaskDescription(this.currentQuestion.instruction);
        }
        this.renderQuestion(this.currentQuestion);

        this.saveProgressToLocalStorage();
        this.sendProgress();

        if (this.currentQuestion.timeLimit) {
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

        // Перемешиваем варианты ответов
        const shuffledOptions = [...question.matchPairs]
            .map(pair => pair.option)  // получаем только опции
            .sort(() => Math.random() - 0.5);  // перемешиваем

        // Создаем элементы для перемешанных вариантов
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
        console.log('Получение ответа пользователя для вопроса типа:', this.currentQuestion.questionType);
        
        let answers;  // Объявляем переменную в начале функции
        
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
                    
                // Возвращаем ответы только если все зоны заполнены
                return answers.every(answer => answer !== null) ? answers : null;                
            case 'matchingWords':
                return this.checkMatchingWordsAnswer(userAnswer);
            default:
                console.error('Тип вопроса не определен:', this.currentQuestion.questionType);
                return false;
        }
    }

    async handleSubmit(timeExpired = false) {
        if (this.submitBtn.disabled && !timeExpired) return;

        const userAnswer = this.getUserAnswer();
        console.log('Полученный ответ:', userAnswer);

        if (userAnswer === null && !timeExpired) return;

        const isCorrect = this.checkAnswer(userAnswer);
        console.log('Результат проверки:', isCorrect);

        const timeSpent = Date.now() - this.startTime;

        await this.saveAnswer(userAnswer, isCorrect, timeSpent);

        // Получаем индексы уровней для сравнения
        const questionLevelIndex = this.levels.indexOf(this.currentQuestion.level);
        const currentLevelIndex = this.levels.indexOf(this.currentLevel);

        if (isCorrect) {
            this.correctCount++;
            this.correctInCurrentSeries++;
            
            // Обновляем счетчики в зависимости от уровня вопроса
            if (questionLevelIndex === currentLevelIndex) {
                this.correctOnCurrentLevel++;
                console.log('Увеличен correctOnCurrentLevel:', this.correctOnCurrentLevel);
            } else if (questionLevelIndex > currentLevelIndex) {
                this.correctOnHigherLevel++;
                console.log('Увеличен correctOnHigherLevel:', this.correctOnHigherLevel);
            }
        } else {
            this.incorrectCount++;
            if (questionLevelIndex < currentLevelIndex) {
                this.incorrectOnLowerLevel++;
                console.log('Увеличен incorrectOnLowerLevel:', this.incorrectOnLowerLevel);
            }
        }

        this.questionsInCurrentSeries++;
        this.questionsOnCurrentLevel++;
        this.totalQuestions++;
        this.updateQuestionNumber();

        console.log('Обновлены счетчи��и:', {
            correctOnCurrentLevel: this.correctOnCurrentLevel,
            correctOnHigherLevel: this.correctOnHigherLevel,
            incorrectOnLowerLevel: this.incorrectOnLowerLevel,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel,
            totalQuestions: this.totalQuestions
        });

        // Добавляем текущий вопрос в отвеченные
        this.answeredQuestions.add(this.currentQuestion.id);

        // Увеличиваем счетчик вопросов для текущего уровня
        this.questionsCountByLevel[this.currentLevel]++;
        console.log(`Вопросов на уровне ${this.currentLevel}:`, this.questionsCountByLevel[this.currentLevel]);

        // Оцениваем серию
        this.evaluateSeries();

        // Явно вызываем загрузку следующего вопро��а
        await this.loadQuestion();
    }

    async saveAnswer(userAnswer, isCorrect, timeSpent) {
        try {
            const answerData = {
                userLogin: this.user.login,
                questionId: this.currentQuestion.id,
                stage: this.stages[this.currentStageIndex],
                level: this.levels[this.currentLevelIndex],
                questionType: this.currentQuestion.questionType,
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
                console.error("Оибка при сохранени прогресса в Airtable:", data.error);
            } else {
                console.log("Прогресс успешно сохранен в Airtable");
            }
        })
        .catch(error => {
            console.error("Ошибка при сораннии прогресс в Airtable:", error);
        });
    }

    evaluateSeries() {
        console.log('Оценка серии:', {
            correctInSeries: this.correctInCurrentSeries,
            questionsInSeries: this.questionsInCurrentSeries,
            currentLevel: this.currentLevel,
            questionsOnLevel: this.questionsCountByLevel[this.currentLevel]
        });

        // Проверяем количество вопросов на текущем уровне
        if (this.questionsCountByLevel[this.currentLevel] >= 6) {
            console.log(`Достигнут лимит в 27 вопросов на уровне ${this.currentLevel}`);
            this.finishStage();
            return;
        }

        // Существующая логика без изменений
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
        try {
            // Проверяем и форматируем данные перед отправкой
            const progressData = {
                userLogin: this.user?.login || '',
                stage: this.stages[this.currentStageIndex] || 'reading',
                level: this.levels[this.currentLevelIndex] || 'pre-A1',
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
    
    finishStage() {
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            // Сбрасываем счетчики для нового этапа
            this.questionsCountByLevel = {
                'pre-A1': 0,
                'A1': 0,
                'A2': 0,
                'B1': 0,
                'B2': 0,
                'C1': 0
            };
            this.currentLevelIndex = 0;
            this.currentLevel = this.levels[0];
            this.correctInCurrentSeries = 0;
            this.questionsInCurrentSeries = 0;
        } else {
            this.completeTest();
        }
    }

    showIntermediateScreen() {
        this.questionContainer.innerHTML = `
            <div class="intermediate-screen">
                <h2>Next Stage: Listening</h2>
                <p>You have completed the Reading section. The Listening section will begin shortly. Please ensure you have headphones or earbuds for optimal audio quality.</p>
                <p>You can review the instructions from the start screen if needed.</p>
                <button id="start-listening-btn">Start Listening Section</button>
            </div>
        `;

        // Скрываем номер вопроса и инструкцию
        document.getElementById('question-number').style.display = 'none';
        document.getElementById('task-description').style.display = 'none';

        document.getElementById('start-listening-btn').addEventListener('click', () => {
            this.currentStageIndex++;
            this.currentLevelIndex = 0;
            this.updateCurrentStage();
            this.loadQuestion();
        });
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

            // Показываем результат
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
            this.currentLevel = this.levels[0]; // Испольуем первый уровень из массива
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

    // Доплнительно, давайте изменим обработку ошибок  клиентском коде:

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
        
        // Показываем результаты для каждого этапа
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
            console.log(`Про��ерка уровня ${entry.level}:`, { wss, minWss: entry.minWss, maxWss: entry.maxWss, isWithinRange });
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
        console.log('Проверка ответа matching:', {
            userAnswer,
            matchPairs: this.currentQuestion.matchPairs
        });
    
        if (!Array.isArray(userAnswer) || userAnswer.length !== this.currentQuestion.matchPairs.length) {
            console.log('Некорректный формат ответа matching');
            return false;
        }
    
        // Проверяем каждый ответ
        return userAnswer.every((answer, index) => {
            const correctAnswer = this.currentQuestion.matchPairs[index].option;
            const isCorrect = answer === correctAnswer;
            console.log(`Проверка ответа ${index}:`, { 
                userAnswer: answer, 
                correctAnswer, 
                isCorrect 
            });
            return isCorrect;
        });
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

        // Очищаем ответы от пробелов и переносов строк
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

        // Проверяе соответствие дин массивов
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
        console.log('Получение отве��ов matchingWords');
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

    // Добавим новый метод для отключения взаимодействий
    disableInteractions() {
        // даляем бработчики соытий �� кнопки submit
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
            console.error("Ошибка ри принудите��ьном заверении теста:", error);
            this.showUnavailableMessage("Произошла ошибка при завершении теста. Пожалуйста, обратитесь к администртору.");
        }
    }

    showForcedCompletionMessage() {
        const message = `
            <div class="test-results forced-completion">
                <h2>Тест завершен</h2>
                <p>Тест был автоматически завершен из-за превышения допустимого количества перезагрузок страницы.</p>
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
    
            // Добавляем обработчики для мыши для десктопов
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

    saveProgress() {
        const progress = {
            stage: this.stages[this.currentStageIndex],
            level: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            questionsOnCurrentLevel: this.questionsOnCurrentLevel,
            // Добавляем сохранение счетчиков по уровням
            questionsCountByLevel: this.questionsCountByLevel
        };

        // Сохраняем в localStorage
        localStorage.setItem('testProgress', JSON.stringify(progress));

        // Отправляем на сервер
        return fetch(`${this.API_BASE_URL}/api/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userLogin: this.userLogin,
                ...progress,
                timestamp: new Date().toISOString()
            })
        });
    }
}   

document.addEventListener('DOMContentLoaded', () => {
    const testApp = new TestApp();
    testApp.init();
});