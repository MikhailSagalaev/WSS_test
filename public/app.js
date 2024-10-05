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
        this.currentStageIndex = 0; // 0: reading, 1: listening
        this.stages = ['reading', 'listening'];
        this.currentLevel = 1;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.questions = { reading: [], listening: [] };
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.groupCorrectAnswers = 0; // Количество правильных ответов в текущей группе
        this.groupTotalAnswers = 0; // Количество ответов в текущей группе
        this.groupsAnswered = 0; // Количество завершённых групп

        // Шкала WSS
        this.wssScale = this.initializeWssScale();

        this.questionContainer = document.getElementById('question-container');
        this.submitBtn = document.getElementById('submit-btn');
        this.finishBtn = document.getElementById('finish-btn');

        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.finishBtn.addEventListener('click', () => this.resetProgress());
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
        this.loadProgress();
    }

    loadProgress() {
        // Логика загрузки вопросов и прогресса
        console.log("Загрузка прогресса");
        this.loadQuestions().then(() => {
            this.loadQuestion();
        });
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
            })
            .catch(err => {
                console.error("Ошибка при загрузке вопросов:", err);
            });
    }

    loadQuestion() {
        console.log("Загрузка следующего вопроса");
        const currentStage = this.stages[this.currentStageIndex];
        const stageQuestions = this.questions[currentStage];
        
        if (this.totalQuestions >= stageQuestions.length) {
            this.finishStage();
            return;
        }

        // Найти вопрос текущего уровня
        const currentLevelQuestions = stageQuestions.filter(q => q.level === this.currentLevel);
        if (currentLevelQuestions.length === 0) {
            console.warn(`Нет вопросов на уровне ${this.currentLevel} для этапа ${currentStage}`);
            this.finishStage();
            return;
        }

        // Текущий вопрос
        const question = currentLevelQuestions[this.totalQuestions % currentLevelQuestions.length];
        this.currentQuestion = question;
        this.renderQuestion(question);
    }

    renderQuestion(question) {
        console.log("Рендеринг вопроса:", question);
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
                zone.parentElement.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.parentElement.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.parentElement.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                zone.innerHTML = `<p>${data.text}</p>`;
                zone.setAttribute('data-image', data.image);
            });
        });
    }

    handleSubmit() {
        console.log("Обработка отправки ответа");
        const questionType = this.currentQuestion.questionType;
        let isCorrect = false;

        if (questionType === 'multiple-choice') {
            const selected = document.querySelector('input[name="answer"]:checked');
            if (selected) {
                const answerIndex = parseInt(selected.value);
                if (answerIndex === this.currentQuestion.correct) {
                    this.correctCount++;
                    isCorrect = true;
                } else {
                    this.incorrectCount++;
                }
            } else {
                alert("Пожалуйста, выберите ответ.");
                return;
            }
        } else if (questionType === 'matching') {
            const dropZones = this.questionContainer.querySelectorAll('.images .drop-zone');
            let matches = 0;
            dropZones.forEach(zone => {
                const selectedImage = zone.getAttribute('data-image');
                if (selectedImage === zone.parentElement.getAttribute('data-image')) {
                    matches++;
                }
            });

            if (matches === this.currentQuestion.matchPairs.length) {
                this.correctCount++;
                isCorrect = true;
            } else {
                this.incorrectCount++;
            }
        } else {
            console.error("Неизвестный тип вопроса при отправке ответа.");
            return;
        }

        // Обработка группы из трёх вопросов
        this.groupCorrectAnswers += isCorrect ? 1 : 0;
        this.groupTotalAnswers += 1;

        console.log(`Группа: ${this.groupCorrectAnswers} правильных из ${this.groupTotalAnswers}`);

        if (this.groupTotalAnswers === 3) {
            console.log("Группа завершена. Определение уровня.");
            this.determineNextLevel();
            this.groupCorrectAnswers = 0;
            this.groupTotalAnswers = 0;
            this.groupsAnswered += 1;
        }

        this.totalQuestions++;
        console.log(`Всего вопросов: ${this.totalQuestions}`);

        // Проверка на завершение этапа
        if (this.groupsAnswered >= 2) { // 2 группы по 3 вопроса = 6 вопросов
            this.finishStage();
        } else {
            this.sendProgress(this.stages[this.currentStageIndex]);
            this.loadQuestion();
        }
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
            userLogin: this.user.login, // Передаём только email пользователя
            stage: stage,
            level: this.currentLevel,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel,
            timestamp: new Date().toISOString()
        };

        console.log("Отправляемые данные прогресса:", progressData);

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

        this.stagesResults = this.stagesResults || [];
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
        this.currentLevel = targetLevel; // Начинаем следующий этап с текущего уровня

        // Переход к следующему этапу или завершение теста
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.loadQuestion();
        } else {
            this.finishTest();
        }

        // Отправка завершённого этапа в сервер
        this.sendFinalResults(stageResult);
    }

    sendFinalResults(stageResult) {
        console.log("Отправка результатов этапа на сервер:");

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
        console.log("Завершение всего теста");
        this.questionContainer.innerHTML = `<p>Тест завершен! Спасибо за участие.</p>`;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';
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
        this.submitBtn.style.display = 'block';
        this.finishBtn.style.display = 'none';
        this.loadQuestion();
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
        // Предполагается, что метод computeFinalWss вычисляет итоговый WSS
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
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});