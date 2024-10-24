// public/app.js

class TestApp {
    constructor() {
        this.isInitialized = false;
        this.stages = ['reading', 'listening'];
        this.initializeElements();
        this.loadProgressFromLocalStorage();
        this.progressLoaded = false;
        this.submitBtn = document.getElementById('submit-btn');
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
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
    
        if (this.userNotAuthorized) {
            this.showUnavailableMessage("Пожалуйста, войдите в систему для прохождения теста.");
            return;
        }
    
        try {
            // 1. Проверка доступности теста
            await this.checkTestAvailability();
            
            // 2. Подгрузка прогресса из Airtable
            await this.loadProgressFromAirtable();
            
            // 3. Загрузка вопросов соответствующих этапу
            await this.loadQuestions();
            
            // 4. Рендеринг вопроса в зависимости от его типа
            this.loadQuestion();
        } catch (error) {
            console.error("Error during initialization:", error);
            this.showUnavailableMessage("An error occurred while initializing the test.");
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
        } else {
            console.error("Cannot show unavailable message: question container not found");
        }
        
        if (this.submitBtn) {
            this.submitBtn.style.display = 'none';
        }
    }

    async checkTestAvailability() {
        console.log("Проверка доступности теста");
        if (!this.user || !this.user.login) {
            console.error("User or user login is not defined");
            this.showUnavailableMessage("Не удалось получить данные пользователя. Пожалуйста, войдите в систему.");
            return;
        }
    
        try {
            const response = await fetch('/api/checkTestAvailability', {
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
            console.log("Результат проверки доступности:", data);

            if (!data.available) {
                this.showUnavailableMessage("Тест в данный мом��нт недоступен.");
                throw new Error("Test not available");
            }
        } catch (error) {
            console.error("Ошибка при проверке дступности теста:", error);
            this.showUnavailableMessage("Произошла ошибка при проверке доступности теста.");
            throw error;
        }
    }

    async loadProgressFromAirtable() {
        try {
            const response = await fetch('/api/getProgress', {
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
    
            if (data.error) {
                console.error("Ошибка при загрузке прогресса:", data.error);
                throw new Error(data.error);
            } else if (data.progress) {
                console.log("Прогресс получен из Airtable:", data.progress);
                this.setProgress(data.progress);
                this.saveProgressToLocalStorage(); // Сохраняем прогресс в localStorage после получения из Airtable
            } else {
                console.log("Прогресс не найден. Начинаем новый этап.");
                this.setInitialProgress();
            }
    
            console.log("Текущий этап:", this.stages[this.currentStageIndex]);
            console.log("Текущий уровень:", this.currentLevel);
    
        } catch (error) {
            console.error("Ошибка при загрузке прогресса из Airtable:", error);
            this.loadProgressFromLocalStorage(); // Загружаем из localStorage только если не удалось загрузить из Airtable
        }
    }
    setProgress(progress) {
        this.currentStageIndex = this.stages.indexOf(progress.stage);
        this.currentLevel = progress.currentLevel || 1;
        this.correctCount = progress.correctCount || 0;
        this.incorrectCount = progress.incorrectCount || 0;
        this.totalQuestions = progress.totalQuestions || 0;
        this.correctHigherLevel = progress.correctHigherLevel || 0;
        this.incorrectLowerLevel = progress.incorrectLowerLevel || 0;
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

    // Метод для сохранения прогресса в localStorage
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
            questionsOnCurrentLevel: this.questionsOnCurrentLevel
        };
        localStorage.setItem('testProgress', JSON.stringify(progress));
        console.log("Прогесс сохранён в localStorage:", progress);
    }

    // Метод для загрзки прогресса з localStorage
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
            if (!this.stages) {
                console.error("Stages are not initialized.");
                this.currentStageIndex = 0; // or handle it as needed
            } else {
                this.currentStageIndex = this.stages.indexOf(savedProgress.stage) !== -1 ? this.stages.indexOf(savedProgress.stage) : 0;
            }

            console.log("Прогресс загруен из localStorage:", savedProgress);
        } else {
            console.log("Не�� схранённого прогресса в localStorage. Начинаем новый тест.");
            this.currentStageIndex = 0;
            this.currentLevel = 1;
        }
    }

    initializeWssScale() {
        const scale = [
            { wss: 180, level: 'C2' },
            { wss: 179, level: 'C2' },
            { wss: 178, level: 'C2' },
            { wss: 177, level: 'C2' },
            { wss: 176, level: 'C2' },
            { wss: 175, level: 'C2' },
            { wss: 174, level: 'C2' },
            { wss: 173, level: 'C2' },
            { wss: 172, level: 'C2' },
            { wss: 171, level: 'C2' },
            { wss: 170, level: 'C1 High' },
            { wss: 169, level: 'C1 High' },
            { wss: 168, level: 'C1 High' },
            { wss: 167, level: 'C1 High' },
            { wss: 166, level: 'C1 High' },
            { wss: 165, level: 'C1 High' },
            { wss: 164, level: 'C1 High' },
            { wss: 163, level: 'C1 High' },
            { wss: 162, level: 'C1 High' },
            { wss: 161, level: 'C1 High' },
            { wss: 160, level: 'C1 Mid' },
            { wss: 159, level: 'C1 Mid' },
            { wss: 158, level: 'C1 Mid' },
            { wss: 157, level: 'C1 Mid' },
            { wss: 156, level: 'C1 Mid' },
            { wss: 155, level: 'C1 Mid' },
            { wss: 154, level: 'C1 Mid' },
            { wss: 153, level: 'C1 Mid' },
            { wss: 152, level: 'C1 Mid' },
            { wss: 151, level: 'C1 Mid' },
            { wss: 150, level: 'C1 Low' },
            { wss: 149, level: 'C1 Low' },
            { wss: 148, level: 'C1 Low' },
            { wss: 147, level: 'C1 Low' },
            { wss: 146, level: 'C1 Low' },
            { wss: 145, level: 'C1 Low' },
            { wss: 144, level: 'C1 Low' },
            { wss: 143, level: 'C1 Low' },
            { wss: 142, level: 'C1 Low' },
            { wss: 141, level: 'C1 Low' },
            { wss: 140, level: 'B2 High' },
            { wss: 139, level: 'B2 High' },
            { wss: 138, level: 'B2 High' },
            { wss: 137, level: 'B2 High' },
            { wss: 136, level: 'B2 High' },
            { wss: 135, level: 'B2 High' },
            { wss: 134, level: 'B2 High' },
            { wss: 133, level: 'B2 High' },
            { wss: 132, level: 'B2 High' },
            { wss: 131, level: 'B2 High' },
            { wss: 130, level: 'B2 Mid' },
            { wss: 129, level: 'B2 Mid' },
            { wss: 128, level: 'B2 Mid' },
            { wss: 127, level: 'B2 Mid' },
            { wss: 126, level: 'B2 Mid' },
            { wss: 125, level: 'B2 Mid' },
            { wss: 124, level: 'B2 Mid' },
            { wss: 123, level: 'B2 Mid' },
            { wss: 122, level: 'B2 Mid' },
            { wss: 121, level: 'B2 Mid' },
            { wss: 120, level: 'B2 Low' },
            { wss: 119, level: 'B2 Low' },
            { wss: 118, level: 'B2 Low' },
            { wss: 117, level: 'B2 Low' },
            { wss: 116, level: 'B2 Low' },
            { wss: 115, level: 'B2 Low' },
            { wss: 114, level: 'B2 Low' },
            { wss: 113, level: 'B2 Low' },
            { wss: 112, level: 'B2 Low' },
            { wss: 111, level: 'B2 Low' },
            { wss: 110, level: 'B1 High' },
            { wss: 109, level: 'B1 High' },
            { wss: 108, level: 'B1 High' },
            { wss: 107, level: 'B1 High' },
            { wss: 106, level: 'B1 High' },
            { wss: 105, level: 'B1 High' },
            { wss: 104, level: 'B1 High' },
            { wss: 103, level: 'B1 High' },
            { wss: 102, level: 'B1 High' },
            { wss: 101, level: 'B1 High' },
            { wss: 100, level: 'B1 Mid' },
            { wss: 99, level: 'B1 Mid' },
            { wss: 98, level: 'B1 Mid' },
            { wss: 97, level: 'B1 Mid' },
            { wss: 96, level: 'B1 Mid' },
            { wss: 95, level: 'B1 Mid' },
            { wss: 94, level: 'B1 Mid' },
            { wss: 93, level: 'B1 Mid' },
            { wss: 92, level: 'B1 Mid' },
            { wss: 91, level: 'B1 Mid' },
            { wss: 90, level: 'B1 Low' },
            { wss: 89, level: 'B1 Low' },
            { wss: 88, level: 'B1 Low' },
            { wss: 87, level: 'B1 Low' },
            { wss: 86, level: 'B1 Low' },
            { wss: 85, level: 'B1 Low' },
            { wss: 84, level: 'B1 Low' },
            { wss: 83, level: 'B1 Low' },
            { wss: 82, level: 'B1 Low' },
            { wss: 81, level: 'B1 Low' },
            { wss: 80, level: 'A2' },
            { wss: 79, level: 'A2' },
            { wss: 78, level: 'A2' },
            { wss: 77, level: 'A2' },
            { wss: 76, level: 'A2' },
            { wss: 75, level: 'A2' },
            { wss: 74, level: 'A2' },
            { wss: 73, level: 'A2' },
            { wss: 72, level: 'A2' },
            { wss: 71, level: 'A2' },
            { wss: 70, level: 'A2' },
            { wss: 69, level: 'A2' },
            { wss: 68, level: 'A2' },
            { wss: 67, level: 'A2' },
            { wss: 66, level: 'A2' },
            { wss: 65, level: 'A1' },
            { wss: 64, level: 'A1' },
            { wss: 63, level: 'A1' },
            { wss: 62, level: 'A1' },
            { wss: 61, level: 'A1' },
            { wss: 60, level: 'A1' },
            { wss: 59, level: 'A1' },
            { wss: 58, level: 'A1' },
            { wss: 57, level: 'A1' },
            { wss: 56, level: 'A1' },
            { wss: 55, level: 'A1' },
            { wss: 54, level: 'A1' },
            { wss: 53, level: 'A1' },
            { wss: 52, level: 'A1' },
            { wss: 51, level: 'A1' },
            { wss: 50, level: 'N/A' },
            { wss: 0, level: 'N/A' }
        ];
        return scale;
    }

    loadProgressOnce() {
        if (!this.progressLoaded) {
            this.progressLoaded = true;
            this.loadProgress();
        }
    }

    loadProgress() {
        console.log("Загрузка прогесса");
        this.loadProgressFromLocalStorage();
        this.checkTestAvailability();
    }

    async loadQuestions() {
        console.log("Начало загрузки вопросов");
        try {
            const response = await fetch('/api/questions');
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error("Некорректная структура данных вопросов");
            }
            console.log("Вопросы загружены:", data.length);
            this.questions = { reading: [], listening: [] };
            data.forEach(question => {
                const stage = (question.fields.Stage || '').toLowerCase();
                if (stage === 'reading' || stage === 'listening') {
                    this.questions[stage].push(this.formatQuestion(question));
                } else {
                    console.warn(`Неизвестный этап для вопроса ${question.id}: ${stage}`);
                }
            });
            console.log('аенные вопросы:', this.questions);
        } catch (err) {
            console.error("Ошибка при загрузке вопросов:", err);
            throw err;
        }
    }

    formatQuestion(question) {
        return {
            id: question.id,
            stage: question.fields.Stage.toLowerCase(),
            level: parseInt(question.fields.Level, 10),
            questionType: question.fields["Question Type"],
            question: question.fields.Question,
            answers: question.fields.Answers ? question.fields.Answers.split(',').map(ans => ans.trim()) : [],
            correct: question.fields.Correct,
            audio: question.fields.Audio ? question.fields.Audio[0].url : null,
            timeLimit: question.fields.TimeLimit ? parseInt(question.fields.TimeLimit, 10) : null,
            sentenceWithGaps: question.fields.SentenceWithGaps,
            wordOptions: question.fields.WordOptions,
            matchPairs: question.fields.MatchPairs
        };
    }

    loadQuestion() {
        console.log("Загрузка вопроса");
        const currentStage = this.stages[this.currentStageIndex];
        console.log(`Загрузка вопроса для этапа: ${currentStage}, уровня: ${this.currentLevel}`);
        
        const questionsForStage = this.questions[currentStage];
        if (!questionsForStage || questionsForStage.length === 0) {
            console.error(`Нет вопросов для этапа ${currentStage}`);
            this.finishStage();
            return;
        }

        const questionsForLevel = questionsForStage.filter(q => q.level === this.currentLevel);
        if (questionsForLevel.length === 0) {
            console.error(`Нет вопросов на уровне ${this.currentLevel} для этапа ${currentStage}`);
            this.finishStage();
            return;
        }

        const randomIndex = Math.floor(Math.random() * questionsForLevel.length);
        this.currentQuestion = questionsForLevel[randomIndex];
        console.log("Текущий вопрос:", this.currentQuestion);

        if (this.currentQuestion) {
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
        console.log("Рендеринг вопроса типа:", question.questionType);
        switch (question.questionType) {
            case 'multiple-choice':
                this.renderMultipleChoiceQuestion(question);
                break;
            case 'matching':
                this.renderMatchingQuestion(question);
                break;
            case 'typeImg':
                this.renderTypeImgQuestion(question);
                break;
            case 'typing':
                this.renderTypingQuestion(question);
                break;
            case 'matchingWords':
                this.renderMatchingWordsQuestion(question);
                break;
            default:
                console.error("Неизвестный тип вопроса:", question.questionType);
                this.renderMultipleChoiceQuestion(question); // Fallback to multiple-choice
        }
        this.startTimer();
        this.submitBtn.disabled = true; // Изначально кнопка неактивна для всех типов вопросов
    }

    selectAnswer(selectedElement) {
        const answerOptions = this.questionContainer.querySelectorAll('.answer-option');
        answerOptions.forEach(option => option.classList.remove('selected'));
        selectedElement.classList.add('selected');
        this.submitBtn.disabled = false;
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
        console.log("Рендеринг matching вопроса");
        
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
        this.addInputListeners();
        this.checkAllInputsFilled();
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
        if (this.inputListenersAdded) return;
        this.inputListenersAdded = true;

        const inputs = this.questionContainer.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
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
        const inputs = this.questionContainer.querySelectorAll('input[type="text"]');
        const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');
        this.submitBtn.disabled = !allFilled;
    }

    getUserAnswer() {
        switch (this.currentQuestion.questionType) {
            case 'multiple-choice':
                return this.getMultipleChoiceAnswer();
            case 'matching':
                return this.getMatchingAnswer();
            case 'typeImg':
                return this.getTypeImgAnswer();
            case 'typing':
                return this.getTypingAnswer();
            case 'matchingWords':
                return this.getMatchingWordsAnswer();
            default:
                console.error("Неизвестный тип вопроса:", this.currentQuestion.questionType);
                return null;
        }
    }

    checkAnswer(userAnswer) {
        switch (this.currentQuestion.questionType) {
            case 'multiple-choice':
                return this.checkMultipleChoiceAnswer(userAnswer);
            case 'matching':
                return this.checkMatchingAnswer(userAnswer);
            case 'typeImg':
                return this.checkTypeImgAnswer(userAnswer);
            case 'typing':
                return this.checkTypingAnswer(userAnswer);
            case 'matchingWords':
                return this.checkMatchingWordsAnswer(userAnswer);
            default:
                console.error("Неизвестный тип вопроса:", this.currentQuestion.questionType);
                return false;
        }
    }

    handleSubmit() {
        if (this.submitBtn.disabled) {
            return;
        }

        if (this.timer) {
            clearInterval(this.timer);
        }

        let userAnswer;
        try {
            userAnswer = this.getUserAnswer();
        } catch (error) {
            console.error("Ошибка при получении ответа пользователя:", error);
            return;
        }

        if (userAnswer === null) {
            return;
        }

        let isCorrect;
        try {
            isCorrect = this.checkAnswer(userAnswer);
        } catch (error) {
            console.error("Ошибка при проверке ответа:", error);
            return;
        }

        if (isCorrect) {
            this.correctCount++;
            this.groupCorrectAnswers++;
            this.correctHigherLevel += 1;
        } else {
            this.incorrectCount++;
            this.incorrectLowerLevel += 1;
        }

        this.totalQuestions++;
        this.groupTotalAnswers++;
        this.questionsOnCurrentLevel++;

        console.log(`Ответ ${isCorrect ? 'правильный' : 'неправильный'}.`);

        this.saveProgressToLocalStorage();
        this.sendProgress();

        if (this.groupTotalAnswers >= 3) {
            this.groupsAnswered++;
            this.updateLevelBasedOnGroupResults();
            this.groupCorrectAnswers = 0;
            this.groupTotalAnswers = 0;
        }

        if (this.questionsOnCurrentLevel >= 9) {
            this.finishStage();
        } else {
            this.currentQuestion = null; // Сбрасываем текущий вопрос
            this.loadQuestion();
        }

        this.submitBtn.disabled = true;
    }

    sendProgress() {
        const progressData = {
            userLogin: this.user.login,
            stage: this.stages[this.currentStageIndex],
            level: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            timestamp: new Date().toISOString()
        };

        fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(progressData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошика при отправе прогресса:", data.error);
            } else {
                console.log("Прогресс успешно отправлен", progressData);
            }
        })
        .catch(error => {
            console.error("Ошибка при отправке прогресса:", error);
        });
    }

    finishStage() {
        console.log(`Завершение этапа: ${this.stages[this.currentStageIndex]}`);
        const stage = this.stages[this.currentStageIndex];
        const targetLevel = this.currentLevel;

        // Сохранение результатов этапа
        const stageResult = {
            stage: stage,
            targetLevel: targetLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            timestamp: new Date().toISOString()
        };

        this.stagesResults.push(stageResult);

        // Очистка счетчиков для следующег этапа
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.groupCorrectAnswers = 0;
        this.groupTotalAnswers = 0;
        this.groupsAnswered = 0;
        this.questionsOnCurrentLevel = 0;

        // Сбрасываем текущий вопрос
        this.currentQuestion = null;

        // Переход к следующему этау или завершение теста
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.loadQuestion();
        } else {
            this.finishTest();
        }
        this.saveProgressToLocalStorage();
    }

    finishTest() {
        // Вычисляем финальный WSS и уровень
        const finalWss = this.computeFinalWss();
        const finalLevel = this.calculateFinalLevel(finalWss);
        
        // Формируем финальные данные
        const completionData = {
            userLogin: this.user.login,
            stagesResults: this.stagesResults,
            finishDate: new Date().toISOString(),
            finalWss: finalWss,
            finalLevel: finalLevel
        };

        // Отправляем результаты
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
                // Отправляем результаты в Airtable
                this.sendResultsToAirtable();
                // Показываем результаты пользователю
                this.showResults();
                // Сбрасываем прогресс
                this.resetProgress();
            }
        })
        .catch(err => {
            console.error("Ошибка при завершении теста:", err);
        });
    }

    resetProgress() {
        fetch('/api/resetProgress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userLogin: this.user.login })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            console.log("Прогресс успешно сброшен:", data);
            // Очстка локального хранилища
            localStorage.removeItem('testProgress');
            // Сбос локльных переменных
            this.currentStageIndex = 0;
            this.currentLevel = 1;
            this.correctCount = 0;
            this.incorrectCount = 0;
            this.totalQuestions = 0;
            this.correctHigherLevel = 0;
            this.incorrectLowerLevel = 0;
            this.groupCorrectAnswers = 0;
            this.groupTotalAnswers = 0;
            this.groupsAnswered = 0;
            this.questionsOnCurrentLevel = 0;
            this.stagesResults = [];
            this.currentQuestion = null;
            
            // Перезагрузка страницы или перезапус теста
            //this.init();
        })
        .catch(error => {
            console.error("Ошибка при сбросе прогресса:", error);
            alert("Произошла ошибка при сброс прогресса. Пожалуйста, попробуйте ещ раз.");
        });
    }

    // Мето для обновления уровня на основе результатов группы
    updateLevelBasedOnGroupResults() {
        if (this.groupCorrectAnswers === 1) {
            this.currentLevel = Math.max(1, this.currentLevel - 1);
            console.log(`Переход на уровень ниже: ${this.currentLevel}`);
        } else if (this.groupCorrectAnswers === 2) {
            console.log(`Оставляем уровень неизменным: ${this.currentLevel}`);
        } else if (this.groupCorrectAnswers === 3) {
            this.currentLevel += 1;
            console.log(`Переход на уровень выше: ${this.currentLevel}`);
        }
    }

    // Доплнительно, давайте изменим обработку ошибок в клиентском коде:

    showResults() {
        const finalResults = this.stagesResults.map(result => {
            return `
                <h3>Этап: ${result.stage}</h3>
                <p>Целевой уровень: ${result.targetLevel}</p>
                <p>Правильных отетов: ${result.correctCount}</p>
                <p>Неправильных отвтв: ${result.incorrectCount}</p>
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

    // Логика для вычисения итогового уровня на основе WSS
    calculateFinalLevel(wss) {
        for (const scale of this.wssScale) {
            if (wss >= scale.wss) {
                return scale.level;
            }
        }
        return 'Неизвестный уровень';
    }

    sendResultsToAirtable() {
        const data = {
            UserLogin: this.user.login,
            FinishDate: new Date(),
            StagesResults: this.stagesResults.map(result => ({
                Stage: result.stage,
                CorrectCount: result.correctCount,
                IncorrectCount: result.incorrectCount,
                TotalQuestions: result.totalQuestions,
                TargetLevel: result.targetLevel
            }))
        };

        fetch('/api/sendResults', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            console.log('Результаты успешно отправлены в Airtable:', result);
        })
        .catch(error => {
            console.error('Ошибка при отправке реультатов в Airtable:', error);
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
            const userProfileString = localStorage.getItem('tilda_members_profile10011255');
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
        return correctPairs.every((pair, index) => pair.option === userAnswer[index]);
    }

    getMultipleChoiceAnswer() {
        const selectedOption = this.questionContainer.querySelector('.answer-option.selected');
        return selectedOption ? selectedOption.textContent : null;
    }

    getTypeImgAnswer() {
        const inputs = this.questionContainer.querySelectorAll('.image-answer');
        return Array.from(inputs).map(input => input.value);
    }

    getTypingAnswer() {
        const inputs = this.questionContainer.querySelectorAll('.gap-answer');
        return Array.from(inputs).map(input => input.value);
    }

    getMatchingWordsAnswer() {
        const dropZones = this.questionContainer.querySelectorAll('.word-drop-zone');
        return Array.from(dropZones).map(zone => zone.textContent);
    }

    checkMultipleChoiceAnswer(userAnswer) {
        return userAnswer === this.currentQuestion.correct;
    }

    checkTypeImgAnswer(userAnswer) {
        return JSON.stringify(userAnswer) === JSON.stringify(this.currentQuestion.correct.split(','));
    }

    checkTypingAnswer(userAnswer) {
        const correctAnswers = this.currentQuestion.correct.split(',').map(ans => ans.trim().toLowerCase());
        return userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
    }

    checkMatchingWordsAnswer(userAnswer) {
        const correctAnswers = this.currentQuestion.correct.split(',').map(ans => ans.trim().toLowerCase());
        return userAnswer.every((answer, index) => answer.toLowerCase() === correctAnswers[index]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.setUser();
    if (!app.userNotAuthorized) {
        app.init().catch(error => console.error("Error initializing app:", error));
    }
});








