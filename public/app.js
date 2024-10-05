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

        // Остальная инициализация
        this.currentLevel = 1;
        this.currentStage = 'reading';
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.questions = { reading: [], listening: [] };
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;

// Шкала WSS
this.wssScale = [
    { wss: 180, level: 'C2' }, { wss: 179, level: 'C2' }, { wss: 178, level: 'C2' },
    { wss: 177, level: 'C2' }, { wss: 176, level: 'C2' }, { wss: 175, level: 'C2' },
    { wss: 174, level: 'C2' }, { wss: 173, level: 'C2' }, { wss: 172, level: 'C2' },
    { wss: 171, level: 'C1 High' }, { wss: 170, level: 'C1 High' }, { wss: 169, level: 'C1 High' },
    { wss: 168, level: 'C1 High' }, { wss: 167, level: 'C1 High' }, { wss: 166, level: 'C1 High' },
    { wss: 165, level: 'C1 High' }, { wss: 164, level: 'C1 High' }, { wss: 163, level: 'C1 High' },
    { wss: 162, level: 'C1 Mid' }, { wss: 161, level: 'C1 Mid' }, { wss: 160, level: 'C1 Mid' },
    { wss: 159, level: 'C1 Mid' }, { wss: 158, level: 'C1 Mid' }, { wss: 157, level: 'C1 Mid' },
    { wss: 156, level: 'C1 Mid' }, { wss: 155, level: 'C1 Mid' }, { wss: 154, level: 'C1 Mid' },
    { wss: 153, level: 'C1 Low' }, { wss: 152, level: 'C1 Low' }, { wss: 151, level: 'C1 Low' },
    { wss: 150, level: 'C1 Low' }, { wss: 149, level: 'C1 Low' }, { wss: 148, level: 'C1 Low' },
    { wss: 147, level: 'C1 Low' }, { wss: 146, level: 'C1 Low' }, { wss: 145, level: 'C1 Low' },
    { wss: 144, level: 'B2 High' }, { wss: 143, level: 'B2 High' }, { wss: 142, level: 'B2 High' },
    { wss: 141, level: 'B2 High' }, { wss: 140, level: 'B2 High' }, { wss: 139, level: 'B2 High' },
    { wss: 138, level: 'B2 High' }, { wss: 137, level: 'B2 High' }, { wss: 136, level: 'B2 High' },
    { wss: 135, level: 'B2 Mid' }, { wss: 134, level: 'B2 Mid' }, { wss: 133, level: 'B2 Mid' },
    { wss: 132, level: 'B2 Mid' }, { wss: 131, level: 'B2 Mid' }, { wss: 130, level: 'B2 Mid' },
    { wss: 129, level: 'B2 Mid' }, { wss: 128, level: 'B2 Mid' }, { wss: 127, level: 'B2 Mid' },
    { wss: 126, level: 'B2 Low' }, { wss: 125, level: 'B2 Low' }, { wss: 124, level: 'B2 Low' },
    { wss: 123, level: 'B2 Low' }, { wss: 122, level: 'B2 Low' }, { wss: 121, level: 'B2 Low' },
    { wss: 120, level: 'B2 Low' }, { wss: 119, level: 'B2 Low' }, { wss: 118, level: 'B2 Low' },
    { wss: 117, level: 'B1 High' }, { wss: 116, level: 'B1 High' }, { wss: 115, level: 'B1 High' },
    { wss: 114, level: 'B1 High' }, { wss: 113, level: 'B1 High' }, { wss: 112, level: 'B1 High' },
    { wss: 111, level: 'B1 High' }, { wss: 110, level: 'B1 High' }, { wss: 109, level: 'B1 High' },
    { wss: 108, level: 'B1 Mid' }, { wss: 107, level: 'B1 Mid' }, { wss: 106, level: 'B1 Mid' },
    { wss: 105, level: 'B1 Mid' }, { wss: 104, level: 'B1 Mid' }, { wss: 103, level: 'B1 Mid' },
    { wss: 102, level: 'B1 Mid' }, { wss: 101, level: 'B1 Mid' }, { wss: 100, level: 'B1 Mid' },
    { wss: 99, level: 'B1 Low' }, { wss: 98, level: 'B1 Low' }, { wss: 97, level: 'B1 Low' },
    { wss: 96, level: 'B1 Low' }, { wss: 95, level: 'B1 Low' }, { wss: 94, level: 'B1 Low' },
    { wss: 93, level: 'B1 Low' }, { wss: 92, level: 'B1 Low' }, { wss: 91, level: 'B1 Low' },
    { wss: 90, level: 'A2 High' }, { wss: 89, level: 'A2 High' }, { wss: 88, level: 'A2 High' },
    { wss: 87, level: 'A2 High' }, { wss: 86, level: 'A2 High' }, { wss: 85, level: 'A2 High' },
    { wss: 84, level: 'A2 High' }, { wss: 83, level: 'A2 High' }, { wss: 82, level: 'A2 High' },
    { wss: 81, level: 'A2 Mid' }, { wss: 80, level: 'A2 Mid' }, { wss: 79, level: 'A2 Mid' },
    { wss: 78, level: 'A2 Mid' }, { wss: 77, level: 'A2 Mid' }, { wss: 76, level: 'A2 Mid' },
    { wss: 75, level: 'A2 Mid' }, { wss: 74, level: 'A2 Mid' }, { wss: 73, level: 'A2 Mid' },
    { wss: 72, level: 'A2 Low' }, { wss: 71, level: 'A2 Low' }, { wss: 70, level: 'A2 Low' },
    { wss: 69, level: 'A2 Low' }, { wss: 68, level: 'A2 Low' }, { wss: 67, level: 'A2 Low' },
    { wss: 66, level: 'A2 Low' }, { wss: 65, level: 'A2 Low' }, { wss: 64, level: 'A2 Low' },
    { wss: 63, level: 'A1 High' }, { wss: 62, level: 'A1 High' }, { wss: 61, level: 'A1 High' },
    { wss: 60, level: 'A1 High' }, { wss: 59, level: 'A1 High' }, { wss: 58, level: 'A1 High' },
    { wss: 57, level: 'A1 High' }, { wss: 56, level: 'A1 High' }, { wss: 55, level: 'A1 High' },
    { wss: 54, level: 'A1 Mid' }, { wss: 53, level: 'A1 Mid' }, { wss: 52, level: 'A1 Mid' },
    { wss: 51, level: 'A1 Mid' }, { wss: 50, level: 'A1 Mid' }, { wss: 49, level: 'A1 Mid' },
    { wss: 48, level: 'A1 Mid' }, { wss: 47, level: 'A1 Mid' }, { wss: 46, level: 'A1 Mid' },
    { wss: 45, level: 'A1 Low' }, { wss: 44, level: 'A1 Low' }, { wss: 43, level: 'A1 Low' },
    { wss: 42, level: 'A1 Low' }, { wss: 41, level: 'A1 Low' }, { wss: 40, level: 'A1 Low' },
    { wss: 39, level: 'A1 Low' }, { wss: 38, level: 'A1 Low' }, { wss: 37, level: 'A1 Low' },
    { wss: 36, level: 'pre-A1 High' }, { wss: 35, level: 'pre-A1 High' }, { wss: 34, level: 'pre-A1 High' },
    { wss: 33, level: 'pre-A1 High' }, { wss: 32, level: 'pre-A1 High' }, { wss: 31, level: 'pre-A1 High' },
    { wss: 30, level: 'pre-A1 High' }, { wss: 29, level: 'pre-A1 High' }, { wss: 28, level: 'pre-A1 High' },
    { wss: 27, level: 'pre-A1 Mid' }, { wss: 26, level: 'pre-A1 Mid' }, { wss: 25, level: 'pre-A1 Mid' },
    { wss: 24, level: 'pre-A1 Mid' }, { wss: 23, level: 'pre-A1 Mid' }, { wss: 22, level: 'pre-A1 Mid' },
    { wss: 21, level: 'pre-A1 Mid' }, { wss: 20, level: 'pre-A1 Mid' }, { wss: 19, level: 'pre-A1 Mid' },
    { wss: 18, level: 'pre-A1 Low' }, { wss: 17, level: 'pre-A1 Low' }, { wss: 16, level: 'pre-A1 Low' },
    { wss: 15, level: 'pre-A1 Low' }, { wss: 14, level: 'pre-A1 Low' }, { wss: 13, level: 'pre-A1 Low' },
    { wss: 12, level: 'pre-A1 Low' }, { wss: 11, level: 'pre-A1 Low' }, { wss: 10, level: 'pre-A1 Low' },
    { wss: 9, level: 'N/A' }, { wss: 8, level: 'N/A' }, { wss: 7, level: 'N/A' },
    { wss: 6, level: 'N/A' }, { wss: 5, level: 'N/A' }, { wss: 4, level: 'N/A' },
    { wss: 3, level: 'N/A' }, { wss: 2, level: 'N/A' }, { wss: 1, level: 'N/A' },
    { wss: 0, level: 'N/A' }
];

        this.questionContainer = document.getElementById('question-container');
        this.submitBtn = document.getElementById('submit-btn');
        this.finishBtn = document.getElementById('finish-btn');

        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.finishBtn.addEventListener('click', () => this.resetProgress());

        // Обработка завершения страницы
        this.finished = false;
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
        const stageQuestions = this.questions[this.currentStage];
        if (this.totalQuestions >= stageQuestions.length) {
            this.finishTest();
            return;
        }

        const question = stageQuestions[this.totalQuestions];
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
            this.questionContainer.innerHTML = `<p>Неизвестный тип вопроса.</p>`;
        }
    }

    renderMultipleChoiceQuestion(question) {
        let html = `<p>${question.question}</p>`;
        if (question.audio) {
            html += `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>`;
        }
        html += '<ul>';
        question.answers.forEach((answer, index) => {
            html += `
                <li>
                    <label>
                        <input type="radio" name="answer" value="${index}">
                        ${answer}
                    </label>
                </li>
            `;
        });
        html += '</ul>';
        this.questionContainer.innerHTML = html;
    }

    renderMatchingQuestion(question) {
        console.log("Рендерим вопрос типа 'matching':", question);
        const pairs = question.matchPairs;
        if (!pairs || !Array.isArray(pairs)) {
            console.error("Некорректные данные для сопоставления:", pairs);
            this.questionContainer.innerHTML = `<p>Некорректные данные для сопоставления.</p>`;
            return;
        }

        // Создание элементов для перетаскивания
        const options = pairs.map(pair => pair.option);
        const images = pairs.map(pair => pair.image);

        // Перемешивание вариантов и изображений
        const shuffledOptions = options.sort(() => Math.random() - 0.5);
        const shuffledImages = images.sort(() => Math.random() - 0.5);

        let html = `<p>${question.question}</p>`;
        if (question.audio) {
            html += `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>`;
        }
        html += '<div class="matching-container">';
        html += '<div class="options"><ul>';

        shuffledOptions.forEach((option, index) => {
            html += `
                <li draggable="true" id="option-${index}" class="draggable">
                    ${option}
                </li>
            `;
        });

        html += '</ul></div>';

        html += '<div class="images"><ul>';

        shuffledImages.forEach((img, index) => {
            html += `
                <li class="dropzone" data-image="${img}">
                    <img src="${img}" alt="Image ${index + 1}" width="100">
                    <div class="drop-here">Drop here</div>
                </li>
            `;
        });
        html += '</ul></div>';

        html += '</div>';

        this.questionContainer.innerHTML = html;

        // Добавление обработчиков событий для Drag-and-Drop
        const draggables = this.questionContainer.querySelectorAll('.draggable');
        const dropzones = this.questionContainer.querySelectorAll('.dropzone');

        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', this.handleDragStart.bind(this));
            draggable.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        dropzones.forEach(dropzone => {
            dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
            dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            dropzone.addEventListener('drop', this.handleDrop.bind(this));
        });

        // Сброс предыдущих сопоставлений
        this.matches = {};
    }

    handleDragStart(event) {
        console.log("Начато перетаскивание:", event.target.id);
        event.dataTransfer.setData('text/plain', event.target.id);
        setTimeout(() => {
            event.target.classList.add('dragged');
        }, 0);
    }

    handleDragEnd(event) {
        console.log("Завершено перетаскивание:", event.target.id);
        event.target.classList.remove('dragged');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        const draggableId = event.dataTransfer.getData('text/plain');
        const draggableElement = document.getElementById(draggableId);
        const dropzone = event.currentTarget;

        if (dropzone.dataset.image) {
            // Проверка, не занят ли уже этот dropzone
            if (dropzone.querySelector('.matched')) {
                console.warn("Этот dropzone уже занят.");
                return;
            }

            // Перемещение элемента
            dropzone.appendChild(draggableElement);
            draggableElement.classList.add('matched');
            this.matches[draggableId] = dropzone.dataset.image;
            console.log(`Сопоставлено ${draggableId} с ${dropzone.dataset.image}`);
        }
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
                console.log(`Multiple-choice ответ: ${selected.value} | Корректный: ${isCorrect}`);
            } else {
                console.warn("Нет выбранного ответа.");
            }
        } else if (questionType === 'matching') {
            const pairs = this.currentQuestion.matchPairs;
            if (!pairs || pairs.length === 0) {
                console.error("Нет данных для сопоставления.");
                return;
            }

            let correctMatches = 0;

            pairs.forEach((pair, index) => {
                const draggableId = `option-${index}`;
                const userMatch = this.matches[draggableId];
                if (userMatch && userMatch === pair.image) {
                    correctMatches++;
                }
            });

            if (correctMatches === pairs.length) {
                this.correctCount++;
                isCorrect = true;
                console.log(`Все сопоставления верны. Правильных: ${correctMatches}`);
            } else {
                this.incorrectCount++;
                console.warn(`Некорректных сопоставлений: ${pairs.length - correctMatches}`);
            }
        } else {
            console.error("Неизвестный тип вопроса при отправке ответа.");
        }

        // Обновляем счетчики
        if (isCorrect) {
            this.correctHigherLevel += 1; // Можно настроить логику по необходимости
            console.log("Увеличен счетчик корректных ответов на соседнем уровне.");
        } else {
            this.incorrectLowerLevel += 1; // Можно настроить логику по необходимости
            console.log("Увеличен счетчик некорректных ответов на соседнем уровне.");
        }

        this.totalQuestions++;
        console.log(`Всего вопросов: ${this.totalQuestions}`);

        if (this.totalQuestions >= 6) {
            this.finishTest();
        } else {
            this.loadQuestion();
            this.saveProgress(this.currentStage);
            this.sendProgress(this.currentStage);
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

    finishTest() {
        console.log("Завершение теста");
        this.questionContainer.innerHTML = `<p>Тест завершен! Спасибо за участие.</p>`;
        this.submitBtn.style.display = 'none';
        this.finishBtn.style.display = 'block';

        // Здесь можно добавить дополнительные действия, например, отображение результатов
    }

    resetProgress() {
        console.log("Сброс прогресса");
        this.currentLevel = 1;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.submitBtn.style.display = 'block';
        this.finishBtn.style.display = 'none';
        this.loadQuestion();
        // Возможно, также нужно сбросить прогресс на сервере
    }

    saveProgress(stage) {
        // Если необходимо сохранять промежуточный прогресс
        console.log(`Сохранение прогресса для этапа: ${stage}`);
        // Реализуйте при необходимости
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});