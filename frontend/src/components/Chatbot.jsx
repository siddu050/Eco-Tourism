import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { sendAiMessage } from '../services/api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your AI Travel Assistant. How can I help you plan your incredible trip to India?", isUser: false },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!input.trim()) {
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);

    setIsLoading(true);
    try {
      const response = await sendAiMessage(userMessage);
      setMessages((prev) => [...prev, { text: response.reply, isUser: false }]);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.detail ||
        'Sorry, I am having trouble connecting right now.';
      setMessages((prev) => [...prev, { text: errorMessage, isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="chat-toggle">
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-window__header">
            <Bot size={22} />
            <div>
              <strong>AI Travel Assistant</strong>
              <p>Ask for ideas, routes, or booking help</p>
            </div>
          </div>

          <div className="chat-window__messages">
            {messages.map((message, index) => (
              <div
                key={`${message.text}-${index}`}
                className={`chat-bubble${message.isUser ? ' chat-bubble--user' : ''}`}
              >
                {message.text}
              </div>
            ))}

            {isLoading && <div className="chat-bubble">Thinking...</div>}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="chat-window__form">
            <input
              ref={inputRef}
              type="text"
              className="input-field"
              placeholder="Type your message..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className="btn-primary chat-window__submit" disabled={isLoading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
