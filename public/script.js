// Chatbot Constants
const API_MOCK_DELAY = 800;
const messageHistory = [];

// DOM Elements
let chatbotForm, chatbotInput, chatbotMessages;

// Initialize Chatbot
async function initChatbot() {
  try {
    initializeElements();
    setupEventListeners();
    loadMessageHistory(); // Load previous messages
    if (messageHistory.length === 0) {
        appendMessage('ai', 'Hello! How can I assist you today?');
    }
  } catch (error) {
    handleError('Chatbot initialization failed', error);
  }
}

function initializeElements() {
  chatbotForm = document.getElementById('chatbot-form');
  chatbotInput = document.getElementById('chatbot-input');
  chatbotMessages = document.getElementById('chatbot-messages');
}

function setupEventListeners() {
  // Chatbot toggle
  document.querySelector('.chatbot-header').addEventListener('click', toggleChatbot);
  
  // Form submission
  chatbotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatbotInput.value.trim();

    if (message) {
        chatbotInput.value = ''; // Clear input before sending
        chatbotInput.disabled = true; // Disable input while processing
        
        try {
            await handleUserMessage(message);
        } catch (error) {
            handleError('Message handling failed', error);
        } finally {
            chatbotInput.disabled = false; // Re-enable input
            chatbotInput.focus(); // Return focus to input
        }
    }
  });
}

// Chatbot visibility toggle
function toggleChatbot() {
  const body = document.getElementById('chatbot-body');
  body.classList.toggle('open');
  document.querySelector('.chatbot-widget').style.transform = 
    body.classList.contains('open') ? 'translateY(0)' : 'translateY(5%)';
}

// Remove Markdown formatting from text
function stripMarkdown(text) {
    // Remove Markdown bold syntax
    return text.replace(/\*\*(.*?)\*\*/g, '$1')
               // Add more Markdown syntax removal if needed
               .replace(/\*(.*?)\*/g, '$1')  // Remove italics
               .replace(/\`(.*?)\`/g, '$1'); // Remove code blocks
}

// Replace the mockApiCall function with real API call
async function sendMessage(message) {
    try {
        const loadingId = appendMessage('assistant', 'Processing...', true);
        
        // Create context from previous messages
        const context = messageHistory
            .slice(-5)
            .map(msg => `${msg.sender}: ${msg.message}`)
            .join('\n');

        const response = await puter.ai.chat(
            `Previous conversation:\n${context}\n\nUser: ${message}\n\nPlease respond without using Markdown formatting.`,
            { model: "gpt-4.1" }
        );

        removeMessage(loadingId);
        // Convert response to string and clean it before displaying
        const responseText = String(response || ''); // Ensure we have a string
        appendMessage('assistant', stripMarkdown(responseText));

    } catch (error) {
        handleError('Chat request failed', error);
    }
}

// Update handleUserMessage function
async function handleUserMessage(message) {
    appendMessage('user', message);
    await sendMessage(message);
}

// UI Utilities
function appendMessage(sender, message, isLoading = false) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageElement = document.createElement('div');
    const messageId = `message-${Date.now()}`;
    
    messageElement.id = messageId;
    messageElement.classList.add('message');
    messageElement.classList.add(sender === 'user' ? 'user-message' : 'assistant-message');
    
    if (isLoading) {
        messageElement.classList.add('loading');
    } else {
        // Only store non-loading messages in history
        messageHistory.push({
            id: messageId,
            sender: sender,
            message: message,
            timestamp: Date.now()
        });
    }
    
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    
    // Auto scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
}

function removeMessage(messageId) {
  const element = document.getElementById(`message-${messageId}`);
  element?.remove();
}

function handleError(context, error) {
  console.error(`${context}:`, error);
  appendMessage('system', `⚠️ Error: ${error.message}`);
}

// Add these functions for persistence
function saveMessageHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(messageHistory));
}

function loadMessageHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        const messages = JSON.parse(saved);
        messages.forEach(msg => {
            appendMessage(msg.sender, msg.message);
        });
    }
}

// Chatbot toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const chatbotHeader = document.querySelector('.chatbot-header');
    const chatbotBody = document.querySelector('.chatbot-body');
    const toggleIcon = document.querySelector('.toggle-icon');

    chatbotHeader.addEventListener('click', () => {
        chatbotBody.classList.toggle('closed');
        toggleIcon.textContent = chatbotBody.classList.contains('closed') ? '▼' : '▲';
    });
});

// File handling functions
function handleFileUpload() {
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    
    // Handle drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) {
            processFile(files[0]);
        }
    });
    
    // Handle click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            processFile(e.target.files[0]);
        }
    });
}

function processFile(file) {
    // Handle the file processing here
    console.log('Processing file:', file.name);
    // Add your anonymization logic here
}

// Prevent form submission
document.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Handle the anonymization process here
    const selectedMode = document.querySelector('select').value;
    // Add your anonymization logic based on the selected mode
});

function initializeFileUpload() {
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Handle drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Handle drop zone highlighting
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        });
    });

    // Handle file selection
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files);
    });
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        // Update UI to show selected file
        document.querySelector('.file-drop-zone').innerHTML = `
            <div>Selected file: ${file.name}</div>
            <div style="font-size: 0.9rem; color: var(--text-light);">Click to change file</div>
        `;
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    initChatbot();
    handleFileUpload();
    initializeFileUpload();
});