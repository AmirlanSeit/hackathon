# DataAnon 🇷🇺  
*Оффлайн-платформа для анонимизации данных с веб-интерфейсом и чат-помощником*

## 🚀 О проекте  
**DataAnon** позволяет без подключения к Интернету:  

1. Загружать файлы (`.txt`, `.docx`, `.pdf`).  
2. Маскировать или псевдонимизировать конфиденциальные данные.  
3. Общаться с AI-ассистентом по вопросам приватности (локально с API-ключом OpenAI).  

> *Ключевая идея*: хранить и обрабатывать всё локально, исключая утечки за счёт сторонних сервисов.

---

## ✨ Возможности
- Drag-and-Drop загрузка + индикатор прогресса  
- Два режима анонимизации  
  - **Mask**: заменяет чувствительные токены символами `████`  
  - **Pseudonymize**: подставляет фейковые данные с помощью `faker`  
- Поддержка казахстанских ИИН, паспортов, банковских реквизитов, e-mail и т.д.  
- Ограничение скорости API (100 req / 15 min)  
- Авто-удаление временных файлов  
- «Glass-morphism» UI с адаптивной версткой  
- Чат-бот на базе GPT-4 (по желанию – можно отключить)

---

## ⚙️ Требования

| Компонент | Версия |
|-----------|--------|
| Node.js   | ≥ 18.x |
| npm / pnpm| ≥ 9.x  |
| Tesseract | (для OCR PDF/изображений) |

> **Важно**: Проект использует ES-modules (`"type":"module"`).

---

# Структура проекта

```text
HACKATHON/
├─ .vscode/
│  └─ launch.json
├─ node_modules/
├─ outputs/
├─ public/
│  ├─ app.js
│  ├─ index.html
│  ├─ script.js
│  └─ style.css
├─ uploads/
├─ utils/
├─ anonymizer.js
├─ .env
├─ eng.traineddata
├─ package-lock.json
├─ package.json
└─ server.js
```
---

## 🛠️ Установка

git clone https://github.com/AmirlanSeit/hackathon.git

Создайте .env в корне:

PORT=8000

OPENAI_API_KEY=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

RATE_LIMIT_WINDOW=15    # минут

RATE_LIMIT_MAX=100      # запросов

Создайте и перейдите в каталог проекта:

mkdir hackathon

cd hackathon

Инициализируйте проект Node.js и установите зависимости:

npm init -y

npm install cors express multer dotenv openai mammoth docx pdf-lib tesseract.js @faker-js/faker companion sharp express-rate-limit

Создайте необходимые каталоги:

mkdir public

mkdir uploads

Установите права на запись для папки uploads:

icacls uploads /grant Users:F

Запустите сервер:

npm start

🔍 Как это работает

/upload — сохраняет файл во временную папку uploads/.

/anonymize —

определяет MIME;

запускает нужный парсер (TXT, DOCX, PDF, OCR);

ищет шаблоны PII через регулярки;

в зависимости от режима → mask или faker;

сохраняет результат в output/;

удаляет оригинал.

/chat — проксирует вопросы в OpenAI, добавляя дисклеймер.
