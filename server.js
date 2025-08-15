// =================================================================
// РОЗДІЛ 1: ПІДКЛЮЧЕННЯ ІНСТРУМЕНТІВ
// =================================================================
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
require('dotenv').config();

// =================================================================
// РОЗДІЛ 2: НАЛАШТУВАННЯ
// =================================================================
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const app = express();

// =================================================================
// РОЗДІЛ 3: НАЛАШТУВАННЯ СЕРВЕРА
// =================================================================

// Створюємо список дозволених "гостей" (адрес)
const corsOptions = {
  // !!! ВАЖЛИВО: Вставте сюди вашу реальну адресу з Netlify !!!
  origin: 'https://mi-vocabulario.netlify.app' 
};
app.use(cors(corsOptions));

// Дозволяємо серверу читати JSON з тіла запиту
app.use(express.json());

// =================================================================
// МАРШРУТ ДЛЯ "ПЕРЕВІРКИ ЗДОРОВ'Я" ВІД RENDER
// =================================================================
app.get('/', (req, res) => {
    res.send('Health check OK. Server is running.');
});

// =================================================================
// РОЗДІЛ 4: ГОЛОВНИЙ "РЕЦЕПТ" ДЛЯ ГЕНЕРАЦІЇ ТЕМИ
// =================================================================
app.post('/generate-topic', async (req, res) => {
    const { topic } = req.body;
    const prompt = `
        Створи урок іспанської мови для рівня A1-A2 на тему "${topic}".
        Поверни відповідь у вигляді валідного JSON-об'єкта.
        Структура JSON має бути наступною:
        {
          "topic": "Назва теми українською",
          "level": "A1-A2",
          "words": [
            {
              "word": "слово іспанською з артиклем",
              "translation": "переклад українською",
              "examples": [
                { "spa": "просте речення-приклад іспанською", "ukr": "точний переклад цього речення українською" }
              ]
            }
          ]
        }
        Згенеруй від 10 до 15 слів.
        У твоїй відповіді не повинно бути жодного тексту, окрім самого JSON-об'єкта. Починай відповідь з символу { і закінчуй символом }.
    `;

    try {
        console.log(`Отримано запит на тему: ${topic}. Відправляю промпт до Google Gemini...`);
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        const responseText = response.text();
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1) {
            const jsonString = responseText.substring(startIndex, endIndex + 1);
            const generatedData = JSON.parse(jsonString);
            console.log("Успішно отримано та розпарсено дані від Google Gemini.");
            res.json(generatedData);
        } else {
            throw new Error("Не вдалося знайти валідний JSON у відповіді від ШІ.");
        }

    } catch (error) {
        console.error("Виникла помилка при зверненні до Google Gemini:", error);
        res.status(500).json({ error: "Не вдалося згенерувати урок. Спробуйте іншу тему." });
    }
});

// =================================================================
// РОЗДІЛ 5: ЗАПУСК СЕРВЕРА
// =================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер успішно запущено на порту ${PORT}`);
});