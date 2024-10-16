// public/app.js

class TestApp {
    constructor() {
        // Извлечение объекта из localStorage
        const storedUser = JSON.parse(localStorage.getItem('tilda_members_profile10011255')) || { login: 'anonymous' };
        console.log("Инициализированный пользователь:", storedUser);

        // Сохранение только поля login
        this.user = {
            login: storedUser.login
        };

        // Инициализация параметров теста
        this.stagesResults = []; // Добавляем инициализацию массива для результатов этапов
        this.currentStageIndex = 0; // 0: reading, 1: listening
        this.stages = ['reading', 'listening'];
        this.currentLevel = 1;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.questions = { reading: [], listening: [] };
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.groupCorrectAnswers = 0; // Количество правильных ответ в текущей груп
        this.groupTotalAnswers = 0; // Количество ответов в текущей группе
        this.groupsAnswered = 0; // Количество завершённых групп

        // Шкала WSS
        this.wssScale = this.initializeWssScale();

        this.questionContainer = document.getElementById('question-container');
        this.submitBtn = document.getElementById('submit-btn');
        this.finishBtn = document.getElementById('finish-btn');

        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.finishBtn.addEventListener('click', () => this.resetProgress());
        this.loadProgressFromLocalStorage();
        this.checkTestAvailability();
        this.loadProgressFromAirtable();

        this.progressLoaded = false;
    }

    loadProgressFromAirtable() {
        return fetch('/api/getProgress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userLogin: this.user.login })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Ошибка при загрузке прогресса:", data.error);
            } else if (data.progress) {
                console.log("Прогресс получен из Airtable:", data.progress);
                // Обновляем локальное хранилище
                localStorage.setItem('testProgress', JSON.stringify(data.progress));
                // Загружаем прогресс
                this.loadProgressFromLocalStorage();
            }
        })
        .catch(error => {
            console.error("Ошибка при загрузке прогресса из Airtable:", error);
        });
    }

    checkTestAvailability() {
        fetch('/api/checkTestAvailability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userLogin: this.user.login })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.available) {
                this.loadProgressFromAirtable().then(() => {
                    if (!this.currentQuestion) {
                        this.loadQuestion();
                    }
                });
            } else {
                this.showUnavailableMessage();
            }
        })
        .catch(error => {
            console.error("Ошибка при проверке доступности теста:", error);
            this.showUnavailableMessage();
        });
    }
    showUnavailableMessage() {
        this.questionContainer.innerHTML = `
            <div class="unavailable-message">
                <p>Тестирование не доступно. Обратитесь к администратору.</p>
                <a href="https://t.me/@mixadev" target="_blank">Связаться с администратором</a>
            </div>
        `;
        this.submitBtn.style.display = 'none';
    }

    // Метод для сохранения прогресса в localStorage
    saveProgressToLocalStorage() {
        const progress = {
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

    // Метод для загрзки прогресса из localStorage
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
            this.stagesResults = savedProgress.stagesResults || [];

            console.log("Прогресс загружен из localStorage:", savedProgress);
        } else {
            console.log("Нет сохранённого прогресса в localStorage. Начинаем новый тест.");
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

    init() {
        console.log("Инициализация приложения");
        this.loadQuestions().then(() => {
            this.loadProgressOnce();
        });
    }

    loadProgressOnce() {
        if (!this.progressLoaded) {
            this.progressLoaded = true;
            this.loadProgress();
        }
    }

    loadProgress() {
        console.log("Загрузка прогресса");
        this.loadProgressFromLocalStorage();
        this.checkTestAvailability();
    }

    loadQuestions() {
        return fetch('/api/questions')
            .then(response => response.json())
            .then(data => {
                // Обработка полученных данных
                console.log("Вопросы загружены:", data.records.length);
                data.records.forEach(record => {
                    const fields = record.fields;
                    this.questions[fields.Stage].push({
                        id: record.id,
                        level: fields.Level,
                        questionType: fields["Question Type"],
                        question: fields.Question,
                        answers: fields.Answers ? fields.Answers.split(',').map(ans => ans.trim()) : [],
                        correct: fields.Correct,
                        audio: fields.Audio,
                        matchPairs: fields.MatchPairs ? JSON.parse(fields.MatchPairs) : []
                    });
                });
                console.log('Загруженные вопросы:', this.questions);
            })
            .catch(err => {
                console.error("Ошибка при загрузке вопросов:", err);
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
        console.log(`Загрузка вопрос для этапа: ${currentStage}, уровня: ${this.currentLevel}`);
        
        const questionsForStage = this.questions[currentStage];
        if (!questionsForStage || !Array.isArray(questionsForStage)) {
            console.error(`Нет вопросов для этапа ${currentStage}`);
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

        // Перемешиваем вопросы дя текущего уровня
        const shuffledQuestions = this.shuffleArray([...questionsForLevel]);
        this.currentQuestion = shuffledQuestions.pop();
        console.log("Текущий вопрос:", this.currentQuestion);

        if (this.currentQuestion) {
            this.questionsOnCurrentLevel++;
            this.renderQuestion(this.currentQuestion);
        } else {
            console.error("Не удалось загрузить вопрос");
            this.finishStage();
        }
    }

    renderQuestion(question) {
        console.log("Ренеринг вопроса:", question);
        this.questionContainer.innerHTML = '';

        if (question.questionType === 'multiple-choice') {
            this.renderMultipleChoiceQuestion(question);
        } else if (question.questionType === 'matching') {
            this.renderMatchingQuestion(question);
        } else {
            console.error("Неизвестный тип вопроса:", question.questionType);
        }
    }

    renderMultipleChoiceQuestion(question) {
        const html = `
            <p>${question.question}</p>
            ${question.audio ? `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>` : ''}
            <form id="question-form">
                ${question.answers.map((answer, index) => `
                    <label>
                        <input type="radio" name="answer" value="${index}">
                        ${answer}
                    </label><br>
                `).join('')}
            </form>
        `;
        this.questionContainer.innerHTML = html;
    }

    renderMatchingQuestion(question) {
        console.log("Рендеринг matching вопроса");
        const pairs = question.matchPairs;
        if (!pairs || !Array.isArray(pairs)) {
            this.questionContainer.innerHTML = `<p>Некорректные данные для сопоставления.</p>`;
            return;
        }

        // Создаём элементы для перетаскивания
        const options = pairs.map(pair => ({ text: pair.option, image: pair.image }));
        const shuffledOptions = this.shuffleArray([...options]);

        // Создаём элементы для изображений
        const images = pairs.map(pair => ({ image: pair.image }));
        const shuffledImages = this.shuffleArray([...images]);

        // HTML разметка
        let html = `<p>${question.question}</p>`;
        if (question.audio) {
            html += `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>`;
        }
        html += '<div class="matching-container">';
        html += '<div class="options"><ul>';
        shuffledOptions.forEach((option, index) => {
            html += `
                <li draggable="true" data-text="${option.text}" data-image="${option.image}">
                    ${option.text}
                </li>
            `;
        });
        html += '</ul></div>';

        html += '<div class="images"><ul>';
        shuffledImages.forEach((img, index) => {
            html += `
                <li data-image="${img.image}">
                    <img src="${img.image}" alt="Image ${index + 1}" width="100">
                    <div class="drop-zone"></div>
                </li>
            `;
        });
        html += '</ul></div>';

        html += '</div>';

        this.questionContainer.innerHTML = html;

        // Инициализация Drag-and-Drop
        this.initializeDragAndDrop();
    }

    initializeDragAndDrop() {
        const draggableElements = this.questionContainer.querySelectorAll('.options li');
        const dropZones = this.questionContainer.querySelectorAll('.images .drop-zone');
    
        draggableElements.forEach(elem => {
            elem.setAttribute('draggable', 'true');
            elem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    text: elem.getAttribute('data-text'),
                    image: elem.getAttribute('data-image')
                }));
                setTimeout(() => {
                    elem.classList.add('dragged');
                }, 0);
            });
    
            elem.addEventListener('dragend', () => {
                elem.classList.remove('dragged');
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
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                zone.innerHTML = `<p>${data.text}</p>`;
                zone.setAttribute('data-image', data.image);
                
                // Удаляем элемент из списка опций
                const optionElement = this.questionContainer.querySelector(`.options li[data-text="${data.text}"]`);
                if (optionElement) {
                    optionElement.remove();
                }
            });
        });
    }

    getUserAnswer() {
        const questionType = this.currentQuestion.questionType;
        
        if (questionType === 'multiple-choice') {
            const selectedOption = this.questionContainer.querySelector('input[name="answer"]:checked');
            if (selectedOption) {
                // Assuming the value corresponds to the index of the selected answer
                const answerIndex = parseInt(selectedOption.value, 10);
                return this.currentQuestion.answers[answerIndex];
            } else {
                alert("Пожалуйста, выберите вариант ответа.");
                return null;
            }
        } else if (questionType === 'matching') {
            const matches = this.questionContainer.querySelectorAll('.images li');
            const userMatches = {};
            let allMatched = true;
    
            matches.forEach(match => {
                const dropZone = match.querySelector('.drop-zone p');
                const image = match.getAttribute('data-image');
                if (dropZone) {
                    const userAnswer = dropZone.textContent.trim();
                    if (userAnswer) {
                        userMatches[image] = userAnswer;
                    } else {
                        allMatched = false;
                    }
                } else {
                    allMatched = false;
                }
            });
    
            if (!allMatched) {
                alert("Пожалуйста, сопоставьте все элементы.");
                return null;
            }
    
            return userMatches;
        } else {
            console.error("Неизвестный тип вопроса:", questionType);
            return null;
        }
    }

    checkAnswer(userAnswer) {
        if (!userAnswer) {
            return false;
        }
    
        const question = this.currentQuestion;
    
        console.log("Тип вопроса:", question.questionType);
        console.log("Пользовательский ответ:", userAnswer);
        console.log("Правильный ответ:", question.correct);
    
        if (question.questionType === 'multiple-choice') {
            // Преобразуем оба значения к строке для корректного сравнения
            return String(userAnswer) === String(question.correct);
        } else if (question.questionType === 'matching') {
            const correctMatches = question.correct;
            for (const image in correctMatches) {
                if (userAnswer[image] !== correctMatches[image]) {
                    return false;
                }
            }
            return true;
        } else {
            console.error("Неизвестный тип вопроса:", question.questionType);
            return false;
        }
    }

    handleSubmit() {
        const userAnswer = this.getUserAnswer();
        
        if (userAnswer === null) {
            return;
        }

        const isCorrect = this.checkAnswer(userAnswer);

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

        console.log(`Ответ ${isCorrect ? 'правильный' : 'неправильный'}.`);

        this.saveProgressToLocalStorage();
        this.sendProgress(this.stages[this.currentStageIndex]);

        if (this.groupTotalAnswers >= 3) {
            this.groupsAnswered++;
            this.updateLevelBasedOnGroupResults();
            this.groupCorrectAnswers = 0;
            this.groupTotalAnswers = 0;
        }

        if (this.questionsOnCurrentLevel >= 6) {
            this.finishStage();
        } else {
            this.currentQuestion = null; // Сбрасываем текущий вопрос
            this.loadQuestion();
        }
    }
    
    finishStage() {
        console.log(`Завершение этапа: ${this.stages[this.currentStageIndex]}`);
        const stage = this.stages[this.currentStageIndex];
        const targetLevel = this.currentLevel;
        const shift = this.correctCount + this.correctHigherLevel - this.incorrectLowerLevel;
        const minWssForLevel = this.wssScale
            .filter(item => item.level === targetLevel)
            .reduce((min, item) => item.wss < min ? item.wss : min, Infinity);
        const finalWssScore = minWssForLevel + shift;

        // Находим уровень по итоговому баллу
        const finalLevelObj = this.wssScale
            .find(item => item.wss <= finalWssScore && item.level === targetLevel);

        const finalLevel = finalLevelObj ? finalLevelObj.level : 'N/A';
        console.log(`Итоговый балл WSS: ${finalWssScore}, итоговый уровень: ${finalLevel}`);

        // Сохранение результатов этапа
        const stageResult = {
            stage: stage,
            targetLevel: targetLevel,
            finalWssScore: finalWssScore,
            finalLevel: finalLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            timestamp: new Date().toISOString()
        };

        this.stagesResults.push(stageResult);

        // Очистка счетчиков для следующего этапа
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.groupCorrectAnswers = 0;
        this.groupTotalAnswers = 0;
        this.groupsAnswered = 0;
        this.questionsOnCurrentLevel = 0;
        this.currentLevel = targetLevel; // Начинаем следующий этап с текущего уровня

        // Сбрасываем текущий вопрос
        this.currentQuestion = null;

        // Переход к следующему этапу или завершение теста
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.loadQuestion();
        } else {
            this.finishTest();
        }
        this.saveProgressToLocalStorage();
    }
    
    resetStageVariables() {
        this.totalQuestions = 0;
        this.groupsAnswered = 0;
        this.groupCorrectAnswers = 0;
        this.groupTotalAnswers = 0;
        // Сохраняем екущий уровень ежду этапами
        // this.currentLevel = 'A1'; // Закомментируйте или удалите эту строку
    }
    
    // Добавим новый метод для отправки прогресса
    sendProgress(stage) {
        const progressData = {
            userLogin: this.user.login,
            stage: stage,
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
                console.error("Оибка при сохранении прогресса:", data.error);
            } else {
                console.log("Прогресс успешно сохранен");
            }
        })
        .catch(error => {
            console.error("Ошибка при отправке прогресса:", error);
        });
    }

    determineNextLevel() {
        if (this.groupCorrectAnswers === 1) {
            this.currentLevel = Math.max(1, this.currentLevel - 1);
            console.log(`Уровень понижен до: ${this.currentLevel}`);
        } else if (this.groupCorrectAnswers === 2) {
            console.log(`Уровень остаётся: ${this.currentLevel}`);
        } else if (this.groupCorrectAnswers === 3) {
            this.currentLevel += 1;
            console.log(`Уровень повышен до: ${this.currentLevel}`);
        }
    }

    sendProgress(stage) {
        console.log(`Отправка прогресса для этапа: ${stage}`);

        if (!this.user || !this.user.login) {
            console.error("Недостаточно данных для отправки прогресса: this.user.login отсутствует");
            return;
        }

        const progressData = {
            userLogin: this.user.login, // Передаём только email пользовател
            stage: stage,
            level: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            timestamp: new Date().toISOString()
        };

        console.log("Отправяемые данные прогресса:", progressData);

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
                console.error("Ошибка при отправке прогресса:", data.error);
            } else {
                console.log("Прогресс успешно отправлен:", data);
            }
        })
        .catch(err => {
            console.error("Ошибка при отправке прогресса:", err);
        });
    }

    finishStage() {
        console.log(`Завершение этапа: ${this.stages[this.currentStageIndex]}`);
        const stage = this.stages[this.currentStageIndex];
        const targetLevel = this.currentLevel;
        const shift = this.correctCount + this.correctHigherLevel - this.incorrectLowerLevel;
        const minWssForLevel = this.wssScale
            .filter(item => item.level === targetLevel)
            .reduce((min, item) => item.wss < min ? item.wss : min, Infinity);
        const finalWssScore = minWssForLevel + shift;

        // Находим уроень п итоговому баллу
        const finalLevelObj = this.wssScale
            .find(item => item.wss <= finalWssScore && item.level === targetLevel);

        const finalLevel = finalLevelObj ? finalLevelObj.level : 'N/A';
        console.log(`Итоговый балл WSS: ${finalWssScore}, итоговый уровень: ${finalLevel}`);

        // Сохранение результатов этапа
        const stageResult = {
            stage: stage,
            targetLevel: targetLevel,
            finalWssScore: finalWssScore,
            finalLevel: finalLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            timestamp: new Date().toISOString()
        };

        this.stagesResults.push(stageResult);

        // Очистка счетчиков для следующего этапа
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.groupCorrectAnswers = 0;
        this.groupTotalAnswers = 0;
        this.groupsAnswered = 0;
        this.questionsOnCurrentLevel = 0;
        this.currentLevel = targetLevel; // Начинаем следующий этап с текущего уровня

        // Сбрасываем текущий вопрос
        this.currentQuestion = null;

        // Переход к следующему этапу или завершение теста
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.loadQuestion();
        } else {
            this.finishTest();
        }
        this.saveProgressToLocalStorage();
    }

// Мето для обновления уровня на основе результатов группы
updateLevelBasedOnGroupResults() {
    if (this.groupCorrectAnswers === 1) {
        this.currentLevel = Math.max(1, this.currentLevel - 1);
        console.log(`Переход на уровень ниже: ${this.currentLevel}`);
    } else if (this.groupCorrectAnswers === 2) {
        console.log(`Оставляем уровень неизменным: ${this.currentLevel}`);
        // Уровень остаётся тем же
    } else if (this.groupCorrectAnswers === 3) {
        this.currentLevel += 1;
        console.log(`Переход на уровень выше: ${this.currentLevel}`);
    }
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

finishTest() {
    this.sendFinalResults();
    this.showResults();
    this.decreaseTestAttempts();
}
decreaseTestAttempts() {
    fetch('/api/decreaseTestAttempts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userLogin: this.user.login })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error("Ошибка при уменьшении количества попыток:", data.error);
        } else {
            console.log("Количество попыток успешно уменьшено");
        }
    })
    .catch(error => {
        console.error("Ошибка при отправке запроса на уменьшение попыток:", error);
    });
}
    resetProgress() {
        console.log("Сброс прогресса");
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
        this.stagesResults = [];
        this.currentQuestion = null;
        this.submitBtn.style.display = 'block';
        this.finishBtn.style.display = 'none';
        this.loadQuestion();

        // Очищаем прогресс из localStorage при сбросе
        localStorage.removeItem('testProgress');
        console.log("Прогресс сброшен и удалён из localStorage.");
    }
    shuffleArray(array) {
        // Функция для перемешивания массива
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
        // Предполагается, что метод computeFinalWss выисляет итоговый WSS
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

    // Дополнительные методы для управления логикой теста могут быть добавлены здесь

    showResults() {
        const finalResults = this.stagesResults.map(result => {
            return `
                <h3>Этап: ${result.stage}</h3>
                <p>Целевой уровень: ${result.targetLevel}</p>
                <p>Итоговый балл WSS: ${result.finalWssScore}</p>
                <p>Итоговый уровень: ${result.finalLevel}</p>
                <p>Правильных ответов: ${result.correctCount}</p>
                <p>Неправильных ответов: ${result.incorrectCount}</p>
            `;
        }).join('');

        this.questionContainer.innerHTML = `
            <h2>Результаты теста</h2>
            ${finalResults}
        `;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});