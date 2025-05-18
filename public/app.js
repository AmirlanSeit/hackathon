document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file');
  const modeSelect = document.getElementById('mode');
  const resultContainer = document.getElementById('result');
  const messageEl = document.getElementById('message');
  const downloadLink = document.getElementById('download-link');

  fileInput.addEventListener('change', function (e) {
    const fileInfo = document.getElementById('file-info');
    if (this.files && this.files[0]) {
      fileInfo.textContent = `✅ Uploaded: ${this.files[0].name}`;
    } else {
      fileInfo.textContent = '';
    }
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    downloadLink.style.display = 'none';
    messageEl.textContent = '';
    resultContainer.classList.add('hidden');

    const file = fileInput.files[0];
    const mode = modeSelect.value;
    if (!file) {
      return alert('Please select a file.');
    }

    // 1) Upload
    const formData = new FormData();
    formData.append('file', file);
    let uploadJson;
    try {
      const uploadRes = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.filename) {
        throw new Error(uploadJson.error || 'Upload failed');
      }
    } catch (err) {
      messageEl.textContent = `Upload error: ${err.message}`;
      resultContainer.classList.remove('hidden');
      return;
    }

    // 2) Anonymize
    let anonJson;
    try {
      const anonRes = await fetch('/anonymize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          filename: uploadJson.filename,
          mode
        })
      });
      anonJson = await anonRes.json();
      if (!anonRes.ok || !anonJson.output_file) {
        throw new Error(anonJson.error || 'Anonymization failed');
      }
    } catch (err) {
      messageEl.textContent = `Anonymize error: ${err.message}`;
      resultContainer.classList.remove('hidden');
      return;
    }

    // 3) Show download link
    downloadLink.href = `/download/${encodeURIComponent(anonJson.output_file)}`;
    downloadLink.download = anonJson.output_file;
    downloadLink.textContent = 'Download Anonymized File';
    downloadLink.style.display = 'block';
    messageEl.textContent = 'Anonymization complete!';
    resultContainer.classList.remove('hidden');
  });

  // Chatbot toggle
  window.toggleChatbot = function() {
    document.getElementById('chatbot-widget').classList.toggle('open');
  };

  // Chatbot logic
  const chatbotForm = document.getElementById('chatbot-form');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotMessages = document.getElementById('chatbot-messages');

  if (chatbotForm) {
    chatbotForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const userMsg = chatbotInput.value.trim();
      if (!userMsg) return;
      appendMessage('user', userMsg);
      chatbotInput.value = '';
      appendMessage('ai', 'Thinking...');
      const aiReply = await fetchAIReply(userMsg);
      // Replace the last "Thinking..." message
      chatbotMessages.lastChild.textContent = aiReply;
      chatbotMessages.lastChild.classList.add('ai');
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    });
  }

  function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chatbot-message ${sender}`;
    msgDiv.textContent = text;
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function fetchAIReply(message) {
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }
      
      return data.reply || "Sorry, I couldn't understand that.";
    } catch (err) {
      console.error('Chat error:', err);
      return "Sorry, there was a problem connecting to the AI.";
    }
  }
});
