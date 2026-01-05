document.addEventListener('DOMContentLoaded', () => {
    const chatBody = document.querySelector('.chat-body');
    const messageInput = document.querySelector('.message-input');
    const sendMessageButton = document.querySelector('#send-message');
    const chatForm = document.querySelector('.chat-form');


    //emoji picker
    const emojiButton = document.querySelector('#emoji-picker');
    let emojiPicker = null;
    let emojiPickerContainer = null;
    let isEmojiPickerVisible = false;

    // Initialize emoji picker
    const initEmojiPicker = () => {
        // Check for different possible library exports
        const PickerClass = window.EmojiMart?.Picker || 
                           (typeof EmojiMart !== 'undefined' ? EmojiMart.Picker : null);

        if (!PickerClass) {
            console.log('EmojiMart library not yet loaded, will retry...');
            return false;
        }

        try {
            // Create container for picker
            emojiPickerContainer = document.createElement('div');
            emojiPickerContainer.className = 'emoji-picker-container';
            chatForm.appendChild(emojiPickerContainer);
            
            emojiPicker = new PickerClass({
                theme: 'light',
                skinTonePosition: 'none',   
                previewPosition: 'none',
                onEmojiSelect: (emoji) => {
                    const start = messageInput.selectionStart || messageInput.value.length;
                    const end = messageInput.selectionEnd || messageInput.value.length;
                    const textBefore = messageInput.value.substring(0, start);
                    const textAfter = messageInput.value.substring(end);
                    messageInput.value = textBefore + emoji.native + textAfter;
                    messageInput.focus();
                    // Set cursor position after inserted emoji
                    const newPosition = start + emoji.native.length;
                    messageInput.setSelectionRange(newPosition, newPosition);
                    // Keep picker open for multiple emoji selection
                }
            });

            // Append picker to container
            emojiPickerContainer.appendChild(emojiPicker);
            
            // Initially hide the picker
            emojiPickerContainer.style.display = 'none';
            return true;
        } catch (error) {
            console.error('Error initializing emoji picker:', error);
            if (emojiPickerContainer) {
                emojiPickerContainer.remove();
                emojiPickerContainer = null;
            }
            return false;
        }
    };

    // Toggle emoji picker visibility
    const toggleEmojiPicker = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!emojiPicker) {
            const initialized = initEmojiPicker();
            if (!initialized || !emojiPicker) {
                // Retry after a short delay
                setTimeout(() => {
                    if (!emojiPicker) {
                        const retryInitialized = initEmojiPicker();
                        if (!retryInitialized || !emojiPicker) {
                            alert('Emoji picker is loading. Please try again in a moment.');
                            return;
                        }
                        // If successful, show it
                        isEmojiPickerVisible = true;
                        emojiPickerContainer.style.display = 'block';
                        document.body.classList.add('show-emoji-picker');
                    }
                }, 300);
                return;
            }
        }

        isEmojiPickerVisible = !isEmojiPickerVisible;
        
        if (isEmojiPickerVisible) {
            emojiPickerContainer.style.display = 'block';
            document.body.classList.add('show-emoji-picker');
        } else {
            emojiPickerContainer.style.display = 'none';
            document.body.classList.remove('show-emoji-picker');
        }
    };

    // Close emoji picker when clicking outside
    const handleClickOutside = (e) => {
        if (isEmojiPickerVisible && emojiPickerContainer) {
            // Check if click is outside the picker and not on the emoji button
            const clickedOnPicker = emojiPickerContainer.contains(e.target);
            const clickedOnButton = e.target.id === 'emoji-picker' || 
                                   e.target.closest('#emoji-picker') ||
                                   (emojiButton && emojiButton.contains(e.target));
            
            if (!clickedOnPicker && !clickedOnButton) {
                emojiPickerContainer.style.display = 'none';
                document.body.classList.remove('show-emoji-picker');
                isEmojiPickerVisible = false;
            }
        }
    };

    // Try to initialize emoji picker
    const tryInitEmojiPicker = () => {
        // Try immediately
        if (initEmojiPicker()) {
            return;
        }
        
        // Retry after library loads
        const checkInterval = setInterval(() => {
            if (initEmojiPicker()) {
                clearInterval(checkInterval);
            }
        }, 200);
        
        // Stop trying after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!emojiPicker) {
                console.warn('Emoji picker library did not load within timeout period');
            }
        }, 5000);
    };

    // Try to initialize when DOM is ready
    tryInitEmojiPicker();

    // Also try on window load
    window.addEventListener('load', () => {
        if (!emojiPicker) {
            tryInitEmojiPicker();
        }
    });

    // Add click event to emoji button
    if (emojiButton) {
        emojiButton.addEventListener('click', toggleEmojiPicker);
    }

    // Add click outside handler
    document.addEventListener('click', handleClickOutside);
    // file upload system
    const fileInput = document.querySelector('#file-input');
    let selectedFile = null;
    let selectedFileData = null;

    const API_KEY = ""; // Replace with your actual API key
    const API_URL =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const scrollToBottom = () => {
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const createMessageElement = (content, ...classes) => {
        const div = document.createElement('div');
        div.classList.add('message', ...classes);
        div.innerHTML = content;
        return div;
    };

    // Convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Handle file selection
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            fileInput.value = '';
            return;
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            alert('File size must be less than 20MB');
            fileInput.value = '';
            return;
        }

        try {
            selectedFile = file;
            selectedFileData = await fileToBase64(file);
            
            // Show preview in chat
            const previewDiv = createMessageElement(
                `<div class="message-text">
                    <div class="image-preview-container">
                        <img src="${selectedFileData}" alt="Selected image" class="image-preview">
                        <div class="image-info">${file.name}</div>
                        <button type="button" class="remove-image-btn" title="Remove image">×</button>
                    </div>
                </div>`,
                'user-message', 'image-preview-message'
            );
            chatBody.appendChild(previewDiv);
            scrollToBottom();

            // Add remove button functionality
            const removeBtn = previewDiv.querySelector('.remove-image-btn');
            removeBtn.addEventListener('click', () => {
                previewDiv.remove();
                selectedFile = null;
                selectedFileData = null;
                fileInput.value = '';
            });

        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please try again.');
            fileInput.value = '';
        }
    };

    // Attach file input change handler
    fileInput.addEventListener('change', handleFileSelect);

    const createBotAvatar = () => `
        <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9z"></path>
        </svg>
    `;

    const createThinkingIndicator = () => `
        <div class="thinking-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    // ✅ UPDATED: Gemini API call with image support
    const generateBotResponse = async (message, imageData = null) => {
        const thinkingDiv = createMessageElement(
            `${createBotAvatar()}<div class="message-text">${createThinkingIndicator()}</div>`,
            'bot-message', 'thinking'
        );
        chatBody.appendChild(thinkingDiv);
        scrollToBottom();

        try {
            // Prepare parts array
            const parts = [];
            
            // Add image if present
            if (imageData) {
                // Extract base64 data (remove data:image/...;base64, prefix)
                const base64Data = imageData.split(',')[1];
                const mimeType = imageData.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
                
                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }
            
            // Add text message
            if (message) {
                parts.push({ text: message });
            }

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: parts
                        }
                    ]
                })
            });

            const data = await response.json();
            thinkingDiv.remove();

            if (!response.ok) {
                throw new Error(data.error?.message || "API error");
            }

            const botReply =
                data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!botReply) {
                throw new Error("No response from Gemini");
            }

            const botMessageDiv = createMessageElement(
                `${createBotAvatar()}<div class="message-text">${botReply}</div>`,
                'bot-message'
            );
            chatBody.appendChild(botMessageDiv);
            scrollToBottom();

        } catch (error) {
            thinkingDiv.remove();
            const errorDiv = createMessageElement(
                `${createBotAvatar()}<div class="message-text">Sorry, I encountered an error: ${error.message}</div>`,
                'bot-message', 'error'
            );
            chatBody.appendChild(errorDiv);
            scrollToBottom();
            console.error(error);
        }
    };

    const handleOutgoingMessage = (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        const hasImage = selectedFileData !== null;
        
        // Require either message or image
        if (!message && !hasImage) return;

        // Store current file data before clearing
        const currentImageData = selectedFileData;
        const currentFile = selectedFile;

        // Clear inputs
        messageInput.value = '';
        fileInput.value = '';
        selectedFile = null;
        selectedFileData = null;

        // Remove preview message if exists
        const previewMessage = chatBody.querySelector('.image-preview-message');
        if (previewMessage) {
            previewMessage.remove();
        }

        // Create user message display
        let userMessageContent = '';
        if (currentImageData) {
            userMessageContent += `<div class="message-text image-message">
                <div class="image-preview-container">
                    <img src="${currentImageData}" alt="Uploaded image" class="image-preview">
                </div>
            </div>`;
        }
        if (message) {
            userMessageContent += `<div class="message-text">${message}</div>`;
        }

        const userMessageDiv = createMessageElement(
            userMessageContent,
            'user-message'
        );
        chatBody.appendChild(userMessageDiv);
        scrollToBottom();

        // Generate bot response with image if available
        setTimeout(() => generateBotResponse(message || 'What is in this image?', currentImageData), 300);
    };

    chatForm.addEventListener('submit', handleOutgoingMessage);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleOutgoingMessage(e);
        }
    });

    sendMessageButton.addEventListener('click', handleOutgoingMessage);

    // File upload button click handler
    document.querySelector('#file-upload').addEventListener('click', () => {
        fileInput.click();
    });

    scrollToBottom();
});
