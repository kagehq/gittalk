<template>
  <div class="chat-container">
    <!-- Login State -->
    <div v-if="!isAuthenticated && !loading" class="login-container">
      <h2>Welcome to GitTalk</h2>
      <p style="margin: 16px 0; color: #656d76;">
        Connect with GitHub users and discuss PRs/Issues
      </p>
      <button @click="loginWithGitHub" class="login-button">
        Login with GitHub
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="loading">
      <p>Loading...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <!-- Chat Interface -->
    <div v-else class="chat-interface">
      <!-- Header with Participants -->
      <div class="chat-header">
        <div class="header-content">
          <h3>{{ chatTitle }}</h3>
          <div v-if="room && room.participants && room.participants.length > 0" class="participants-info">
            <span class="participant-count">{{ room.participants.length }} participants</span>
            <div class="participant-avatars">
              <img 
                v-for="participant in room.participants.slice(0, 3)" 
                :key="participant.user?.id || participant.user?.login || Math.random()"
                :src="participant.user?.avatarUrl || '/default-avatar.png'" 
                :alt="participant.user?.login || 'User'"
                class="participant-avatar"
                :title="participant.user?.login || 'User'"
                @error="handleAvatarError"
              />
              <span v-if="room.participants.length > 3" class="more-participants">
                +{{ room.participants.length - 3 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="message in messages" :key="message.id" class="message">
          <img 
            :src="message.sender.avatarUrl || '/default-avatar.png'" 
            :alt="message.sender.login"
            class="message-avatar"
            @error="handleAvatarError"
          />
          <div class="message-content">
            <div class="message-sender">@{{ message.sender.login }}</div>
            <div class="message-text">{{ message.body }}</div>
            <div class="message-time">{{ formatTime(message.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- Sticky Input Footer -->
      <div class="chat-input">
        <div class="input-group">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            placeholder="Type a message..."
            class="input-field"
            :disabled="!socket || !room"
          />
          <button 
            @click="sendMessage" 
            class="send-button"
            :disabled="!newMessage.trim() || !socket || !room"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

interface User {
  id: string;
  login: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: User;
}

interface Room {
  id: string;
  type: 'DM' | 'THREAD';
  contextUrl?: string;
  participants: Array<{ user: User }>;
}

const serverUrl = 'http://localhost:4000';
const isAuthenticated = ref(false);
const loading = ref(true);
const error = ref('');
const token = ref('');
const user = ref<User | null>(null);
const room = ref<Room | null>(null);
const messages = ref<Message[]>([]);
const newMessage = ref('');
const socket = ref<Socket | null>(null);
const messagesContainer = ref<HTMLDivElement>();

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const chatType = urlParams.get('type');
const context = urlParams.get('context');

const chatTitle = computed(() => {
  if (!room.value) return 'Chat';
  if (room.value.type === 'DM') {
    const otherUser = room.value.participants?.find(p => p.user?.id !== user.value?.id);
    return `DM with @${otherUser?.user?.login || 'User'}`;
  }
  return 'Thread Chat';
});

onMounted(async () => {
  // Add global error handler for debugging
  window.addEventListener('error', (event) => {
    console.error('GitTalk: Global error caught:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('GitTalk: Unhandled promise rejection:', event.reason);
  });

  // Store chat parameters for later use
  if (chatType && context) {
    await chrome.storage.local.set({ 
      gittalk_chat_type: chatType, 
      gittalk_chat_context: context 
    });
  }
  
  await checkAuth();
  if (isAuthenticated.value && chatType && context) {
    await initializeChat(chatType, context);
  }

  // Listen for authentication success from the OAuth callback
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'GITTALK_AUTH_SUCCESS') {
      console.log('GitTalk: Authentication successful, token received');
      token.value = event.data.token;
      await chrome.storage.local.set({ gittalk_token: event.data.token });
      await checkAuth();
      
      // Get chat parameters from storage or URL
      const storedParams = await chrome.storage.local.get(['gittalk_chat_type', 'gittalk_chat_context']);
      const currentChatType = chatType || storedParams.gittalk_chat_type;
      const currentContext = context || storedParams.gittalk_chat_context;
      
      if (currentChatType && currentContext) {
        await initializeChat(currentChatType, currentContext);
      }
    }
  });
});

async function checkAuth() {
  try {
    // Check for token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      token.value = urlToken;
      await chrome.storage.local.set({ gittalk_token: urlToken });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Get stored token
      const result = await chrome.storage.local.get(['gittalk_token']);
      token.value = result.gittalk_token;
    }

    if (token.value) {
      // Verify token
      const response = await axios.get(`${serverUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` }
      });
      user.value = response.data;
      isAuthenticated.value = true;
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    await chrome.storage.local.remove(['gittalk_token']);
  } finally {
    loading.value = false;
  }
}

async function initializeChat(chatTypeParam?: string, contextParam?: string) {
  try {
    const currentChatType = chatTypeParam || chatType;
    const currentContext = contextParam || context;
    
    if (!currentChatType || !currentContext) {
      console.error('GitTalk: Missing chat type or context');
      return;
    }

    // Create or get room
    if (currentChatType === 'dm') {
      const response = await axios.post(
        `${serverUrl}/rooms/dm/${currentContext}`,
        {},
        { headers: { Authorization: `Bearer ${token.value}` } }
      );
      room.value = response.data;
    } else if (currentChatType === 'thread') {
      const response = await axios.post(
        `${serverUrl}/rooms/thread`,
        { contextUrl: currentContext },
        { headers: { Authorization: `Bearer ${token.value}` } }
      );
      room.value = response.data;
    }

    if (room.value && room.value.id) {
      // Load messages
      const messagesResponse = await axios.get(
        `${serverUrl}/rooms/${room.value.id}/messages`,
        { headers: { Authorization: `Bearer ${token.value}` } }
      );
      messages.value = messagesResponse.data;

      // Connect to socket
      connectSocket();
    } else {
      console.error('GitTalk: Room creation failed or room has no ID');
      throw new Error('Failed to create room or room has no ID');
    }
  } catch (err: any) {
    console.error('Failed to initialize chat:', err);
    console.error('Error details:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      url: err.config?.url
    });
    
    // Better error message handling
    let errorMessage = 'Failed to load chat';
    if (err.response?.status) {
      errorMessage += ` (${err.response.status})`;
    }
    if (err.response?.data?.message) {
      errorMessage += `: ${err.response.data.message}`;
    } else if (err.message) {
      errorMessage += `: ${err.message}`;
    }
    
    error.value = errorMessage;
    console.error('GitTalk: Final error message:', errorMessage);
  }
}

function connectSocket() {
  if (!token.value || !room.value?.id) {
    console.error('GitTalk: Cannot connect socket - missing token or room ID');
    return;
  }

  socket.value = io(serverUrl, {
    auth: { token: token.value }
  });

  socket.value.on('connect', () => {
    socket.value?.emit('joinRoom', room.value?.id);
  });

  socket.value.on('connect_error', (err: any) => {
    console.error('GitTalk: Socket connection error:', err);
    error.value = 'Connection error';
  });

  socket.value.on('messageCreated', (message: Message) => {
    messages.value.push(message);
    scrollToBottom();
  });

  socket.value.on('error', (err: any) => {
    console.error('GitTalk: Socket error:', err);
    error.value = 'Connection error';
  });
}

async function sendMessage() {
  if (!newMessage.value.trim()) {
    return;
  }

  if (!room.value?.id) {
    error.value = 'Chat room not properly initialized';
    return;
  }

  if (!socket.value?.connected) {
    error.value = 'Not connected to chat server';
    return;
  }

  try {
    socket.value.emit('sendMessage', {
      roomId: room.value.id,
      body: newMessage.value.trim()
    });
    
    newMessage.value = '';
  } catch (err: any) {
    console.error('GitTalk: Failed to send message:', err);
    error.value = `Failed to send message: ${err.message}`;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value?.scrollHeight) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function handleAvatarError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2NTZkNzYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
}

// Watch for new messages and scroll to bottom
watch(messages, scrollToBottom, { deep: true });

function loginWithGitHub() {
  // Open GitHub OAuth in a new window/tab
  const authUrl = 'http://localhost:4000/auth/github';
  // Use window.open with specific dimensions for better UX
  const authWindow = window.open(authUrl, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
  
  // Focus the window if it was opened
  if (authWindow) {
    authWindow.focus();
  }
}
</script>
