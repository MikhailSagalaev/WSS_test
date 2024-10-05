// public/app.js

class TestApp {
    constructor() {
        this.currentLevel = 1;
        this.currentStage = 'reading';
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.questions = { reading: [], listening: [] };

        // Счетчики для правильных и неправильных ответов на соседних уровнях
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

        const storedUser = JSON.parse(localStorage.getItem('tilda_members_profile10011255')) || { login: 'anonymous' };
        console.log("Инициализированный пользователь:", storedUser);

        // Сохранение только поля login
        this.user = {
            login: storedUser.login
        };

        // Привязка обработчиков событий
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.finishBtn.addEventListener('click', () => this.finishTest());
    }

    async init() {
        console.log("Инициализация приложения");
        await this.loadInitialProgress();
        await this.fetchQuestions();
    }

    async loadInitialProgress() {
        // Здесь можно реализовать загрузку начального прогресса, если необходимо
        console.log("Загрузка начального прогресса");
    }

    saveProgress(stage) {
        console.log(`Сохранение прогресса для этапа: ${stage}`);
        localStorage.setItem(`progress_${stage}`, JSON.stringify({
            currentLevel: this.currentLevel,
            currentStage: this.currentStage,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.totalQuestions,
            correctHigherLevel: this.correctHigherLevel,
            incorrectLowerLevel: this.incorrectLowerLevel
        }));
    }

    loadProgress(stage) {
        console.log(`Загрузка прогресса для этапа: ${stage}`);
        const progress = JSON.parse(localStorage.getItem(`progress_${stage}`));
        if (progress) {
            this.currentLevel = progress.currentLevel;
            this.currentStage = progress.currentStage;
            this.correctCount = progress.correctCount;
            this.incorrectCount = progress.incorrectCount;
            this.totalQuestions = progress.totalQuestions;
            this.correctHigherLevel = progress.correctHigherLevel || 0;
            this.incorrectLowerLevel = progress.incorrectLowerLevel || 0;
            console.log("Прогресс загружен:", progress);
        } else {
            console.log("Прогресс не найден, инициализация новых счетчиков");
        }
    }

    getRandomQuestion(questions) {
        return questions[Math.floor(Math.random() * questions.length)];
    }

    loadQuestion() {
        console.log(`Загрузка вопроса для уровня ${this.currentLevel}, этапа ${this.currentStage}`);
        const currentQuestions = this.questions[this.currentStage].filter(q => q.level === this.currentLevel);
        if (!currentQuestions.length) {
            console.error('Нет доступных вопросов для текущего уровня и этапа.');
            this.questionContainer.innerHTML = `<p>Нет доступных вопросов для текущего уровня и этапа.</p>`;
            return;
        }

        const question = this.getRandomQuestion(currentQuestions);
        this.currentQuestion = question; // Сохраняем текущий вопрос для последующей проверки
        console.log("Текущий вопрос:", question);

        if (question.questionType === 'multiple-choice') {
            this.renderMultipleChoice(question);
        } else if (question.questionType === 'matching') {
            this.renderMatchingQuestion(question);
        } else {
            console.warn(`Неизвестный тип вопроса: ${question.questionType}`);
            this.questionContainer.innerHTML = `<p>Неизвестный тип вопроса.</p>`;
        }
    }

    renderMultipleChoice(question) {
        console.log("Рендеринг вопроса типа 'multiple-choice'");
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
        console.log("Рендеринг вопроса типа 'matching'");
        const pairs = question.matchPairs;
        if (!pairs || !Array.isArray(pairs)) {
            console.error("Некорректные данные для сопоставления:", pairs);
            this.questionContainer.innerHTML = `<p>Некорректные данные для сопоставления.</p>`;
            return;
        }

        // Создаём элементы для вариантов и изображений
        const options = pairs.map(pair => pair.option);
        const images = pairs.map(pair => pair.image);

        // Перемешиваем варианты и изображения
        const shuffledOptions = this.shuffleArray(options.slice());
        const shuffledImages = this.shuffleArray(images.slice());

        console.log("Перемешанные опции:", shuffledOptions);
        console.log("Перемешанные изображения:", shuffledImages);

        let html = `<p>${question.question}</p>`;
        if (question.audio) {
            html += `<audio controls><source src="${question.audio}" type="audio/mpeg"></audio>`;
        }
        html += '<div class="matching-container">';
        
        // Блок вариантов
        html += '<div class="options"><ul>';
        shuffledOptions.forEach((option, index) => {
            html += `
                <li draggable="true" data-option="${option}" id="option-${index}">
                    ${option}
                </li>
            `;
        });
        html += '</ul></div>';
        
        // Блок изображений (допустимые зоны для дропа)
        html += '<div class="images"><ul>';
        shuffledImages.forEach((img, index) => {
            html += `
                <li id="drop-zone-${index}" data-image="${img}">
                    <img src="${img}" alt="Image ${index + 1}" width="100">
                    <div class="drop-here">Drop here</div>
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
        console.log("Инициализация Drag-and-Drop функциональности");
        const draggableItems = this.questionContainer.querySelectorAll('.options li');
        const dropZones = this.questionContainer.querySelectorAll('.images li');

        draggableItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                console.log(`Начало перетаскивания: ${item.textContent}`);
                e.dataTransfer.setData('text/plain', item.dataset.option);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => {
                    item.classList.add('dragged');
                }, 0);
            });

            item.addEventListener('dragend', () => {
                console.log(`Завершение перетаскивания: ${item.textContent}`);
                item.classList.remove('dragged');
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const option = e.dataTransfer.getData('text/plain');
                console.log(`Перетащено значение "${option}" в зону с изображением "${zone.dataset.image}"`);

                // Проверяем, нет ли уже другого элемента, перетащенного в эту зону
                const existingOption = zone.querySelector('.assigned-option');
                if (existingOption) {
                    console.log(`Удаление ранее назначенного варианта: ${existingOption.textContent}`);
                    existingOption.classList.remove('assigned-option');
                    existingOption.style.backgroundColor = '';
                }

                // Назначаем новый вариант
                const optionElement = this.questionContainer.querySelector(`li[data-option="${option}"]`);
                if (optionElement) {
                    zone.innerHTML = `<img src="${zone.dataset.image}" alt="Image" width="100"><div class="drop-here">Dropped: ${option}</div>`;
                    optionElement.classList.add('assigned-option');
                }
            });
        });
    }

    shuffleArray(array) {
        // Функция для перемешивания массива
        console.log("Перемешивание массива:", array);
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        console.log("Перемешанный массив:", array);
        return array;
    }

    async fetchQuestions() {
        console.log("Получение вопросов с сервера");
        try {
            const response = await fetch('/api/questions');
            const data = await response.json();
            if (response.ok) {
                console.log(`Получено ${data.records.length} вопросов`);
                data.records.forEach(record => {
                    const question = {
                        level: parseInt(record.fields['Level']),
                        stage: record.fields['Stage'],
                        questionType: record.fields['Question Type'],
                        question: record.fields['Question'],
                        answers: record.fields['Answers'] ? record.fields['Answers'].split(',').map(ans => ans.trim()) : [],
                        correct: record.fields['Correct'] !== undefined ? parseInt(record.fields['Correct']) : null,
                        audio: record.fields['Audio'], // URL аудио, если есть
                        matchPairs: record.fields['MatchPairs'] ? JSON.parse(record.fields['MatchPairs']) : []
                    };

                    if (question.stage === 'reading') {
                        this.questions.reading.push(question);
                    } else if (question.stage === 'listening') {
                        this.questions.listening.push(question);
                    }

                    console.log("Добавлен вопрос:", question);
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
        console.log(`Получение минимального WSS для уровня: ${level}`);
        // Находим минимальный WSS для заданного уровня
        const minWss = this.wssScale
            .filter(item => item.level === level)
            .reduce((min, item) => item.wss < min ? item.wss : min, Infinity);

        console.log(`Минимальный WSS для уровня ${level}: ${minWss !== Infinity ? minWss : 0}`);
        return minWss !== Infinity ? minWss : 0;
    }

    getLevelByWss(wss) {
        console.log(`Получение уровня по WSS: ${wss}`);
        const levelItem = this.wssScale.find(item => item.wss === wss);
        if (levelItem) {
            console.log(`Уровень для WSS ${wss}: ${levelItem.level}`);
            return levelItem.level;
        }
        console.warn(`Уровень не найден для WSS: ${wss}`);
        return 'N/A';
    }

    getMaxLevel() {
        // Определяем максимальный уровень на основе шкалы WSS
        const levelsOrder = [
            'pre-A1 Low', 'pre-A1 Mid', 'pre-A1 High',
            'A1 Low', 'A1 Mid', 'A1 High',
            'A2 Low', 'A2 Mid', 'A2 High',
            'B1 Low', 'B1 Mid', 'B1 High',
            'B2 Low', 'B2 Mid', 'B2 High',
            'C1 Low', 'C1 Mid', 'C1 High',
            'C2'
        ];
        const maxLevel = levelsOrder[levelsOrder.length - 1]; // 'C2'
        console.log(`Максимальный уровень: ${maxLevel}`);
        return maxLevel;
    }

    handleSubmit() {
        console.log("Обработка отправки ответа");
        const questionType = this.currentQuestion.questionType;
        let isCorrect = false;

        console.log(`Тип текущего вопроса: ${questionType}`);

        if (questionType === 'multiple-choice') {
            const selected = document.querySelector('input[name="answer"]:checked');
            if (selected) {
                const answerIndex = parseInt(selected.value);
                console.log(`Выбранный ответ индекс: ${answerIndex}`);
                if (answerIndex === this.currentQuestion.correct) {
                    this.correctCount++;
                    isCorrect = true;
                    console.log("Ответ правильный");
                } else {
                    this.incorrectCount++;
                    console.log("Ответ неправильный");
                }
            } else {
                alert("Пожалуйста, выберите ответ.");
                return;
            }
        } else if (questionType === 'matching') {
            const pairs = this.currentQuestion.matchPairs;
            if (!pairs || !Array.isArray(pairs)) {
                console.error("Некорректные данные для сопоставления при обработке ответа");
                alert("Некорректные данные для сопоставления.");
                return;
            }

            let correctMatches = 0;
            pairs.forEach((pair) => {
                const dropZone = this.questionContainer.querySelector(`li[data-image="${pair.image}"]`);
                if (dropZone) {
                    const droppedText = dropZone.querySelector('div.drop-here').textContent.replace('Dropped: ', '').trim();
                    if (droppedText === pair.option) {
                        correctMatches++;
                        console.log(`Сопоставление верное: ${droppedText} - ${pair.image}`);
                    } else {
                        console.log(`Сопоставление неверное: ${droppedText} - ${pair.image}`);
                    }
                }
            });

            if (correctMatches === pairs.length) {
                this.correctCount++;
                isCorrect = true;
                console.log("Все сопоставления правильные");
            } else {
                this.incorrectCount++;
                console.log(`Неправильных сопоставлений: ${pairs.length - correctMatches}`);
            }
        } else {
            console.warn(`Неизвестный тип вопроса при обработке ответа: ${questionType}`);
            alert("Неизвестный тип вопроса.");
            return;
        }

        // Обновляем счетчики для WSS
        if (isCorrect) {
            this.correctHigherLevel++;
            console.log("Увеличено correctHigherLevel");
        } else {
            this.incorrectLowerLevel++;
            console.log("Увеличено incorrectLowerLevel");
        }

        this.totalQuestions++;
        console.log(`Всего вопросов отвечено: ${this.totalQuestions}`);

        if (this.totalQuestions >= 6) {
            console.log("Достигнуто 6 вопросов, завершение этапа");
            this.finishTest();
        } else {
            console.log("Загрузка следующего вопроса");
            this.loadQuestion();
            this.saveProgress(this.currentStage);
            this.sendProgress(this.currentStage);
        }
    }

    finishTest() {
        console.log("Выполнение завершения этапа");
        const targetLevel = this.currentLevel;
        console.log(`Целевой уровень: ${targetLevel}`);

        const correctTarget = this.correctCount;
        const correctHigher = this.correctHigherLevel;
        const incorrectLower = this.incorrectLowerLevel;

        console.log(`Замена на WSS: correctCount=${correctTarget}, correctHigherLevel=${correctHigher}, incorrectLowerLevel=${incorrectLower}`);

        const shift = correctTarget + correctHigher - incorrectLower;
        console.log(`Сдвиг по шкале WSS: ${shift}`);

        const minWss = this.getMinWssForLevel(targetLevel);
        const finalWss = Math.min(Math.max(minWss + shift, 0), 180); // Ограничение от 0 до 180
        console.log(`Итоговый WSS: ${finalWss}`);

        const finalLevel = this.getLevelByWss(finalWss);
        console.log(`Итоговый уровень: ${finalLevel}`);

        alert(`Ваш уровень: ${finalLevel}`);

        // Сброс прогресса
        this.resetProgress();
    }

    resetProgress() {
        console.log("Сброс прогресса");
        this.currentLevel = 1;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.totalQuestions = 0;
        this.correctHigherLevel = 0;
        this.incorrectLowerLevel = 0;
        this.saveProgress(this.currentStage);
        this.loadQuestion();
    }

    sendProgress(stage) {
        console.log(`Отправка прогресса для этапа: ${stage}`);
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
                console.error("Ошибка при отправке прогресса:", data.error);
            } else {
                console.log("Прогресс успешно отправлен:", data);
            }
        })
        .catch(err => {
            console.error("Ошибка при отправке прогресса:", err);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TestApp();
    app.init();
});