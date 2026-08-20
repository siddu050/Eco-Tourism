import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  MapPin,
  Compass,
} from 'lucide-react';
import { sendAiMessage, resolveImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

const INITIAL_PROMPTS = [
  '🌴 Best beach stays in Goa',
  '☕ 3-day Munnar itinerary',
  '🏰 Royal Rajasthan route',
  '💰 Budget stays under Rs. 3000',
  '🛶 Kerala Backwaters guide',
  '❄️ Winter getaways in India',
  '✨ How do I book a stay?',
];

// Helper to format inline markdown (bold, italic, code, links)
const formatInlineMarkdown = (text) => {
  if (!text) return null;

  // Split by link syntax [text](url) or bold **text** or code `text` or italic _text_
  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining) {
    // Check for [label](url)
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      const isInternal = url.startsWith('/') || url.startsWith('#');
      if (isInternal) {
        parts.push(
          <Link key={keyIdx++} to={url} className="chat-inline-link">
            {label}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={keyIdx++}
            href={url}
            target={url.startsWith('tel:') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="chat-inline-link"
          >
            {label}
          </a>
        );
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Check for **bold**
    const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={keyIdx++} className="chat-strong">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={keyIdx++} className="chat-code">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Check for _italic_ or *italic*
    const italicMatch = remaining.match(/^[_*]([^*_]+)[_*]/);
    if (italicMatch) {
      parts.push(
        <em key={keyIdx++} className="chat-em">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Regular text up to the next special marker
    const nextSpecial = remaining.search(/(\[|\*\*|`|[*_])/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Special char is not part of a valid match, consume 1 char
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
};

// Rich Markdown Message Block Renderer
const MarkdownMessage = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let isNumberedList = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="chat-ol">
            {currentList.map((item, idx) => (
              <li key={idx} className="chat-li">
                {formatInlineMarkdown(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="chat-ul">
            {currentList.map((item, idx) => (
              <li key={idx} className="chat-li">
                {formatInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    // Bullet item (• or - or *)
    if (line.startsWith('•') || line.startsWith('- ') || line.startsWith('* ')) {
      if (isNumberedList) flushList();
      isNumberedList = false;
      const cleanItem = line.replace(/^[•\-*]\s*/, '');
      currentList.push(cleanItem);
      return;
    }

    // Numbered item (1. 2. etc.)
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!isNumberedList) flushList();
      isNumberedList = true;
      currentList.push(numMatch[2]);
      return;
    }

    // Normal paragraph line
    flushList();
    elements.push(
      <p key={`p-${index}`} className="chat-p">
        {formatInlineMarkdown(line)}
      </p>
    );
  });

  flushList();

  return <div className="chat-markdown-body">{elements}</div>;
};

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'msg-0',
      text: "Namaste! 🙏 I'm your **Indian Journeys AI Travel Assistant**.\n\nI can help you with:\n• **Destinations & Stays**: Handpicked eco-stays across 30 scenic regions in India\n• **Custom Itineraries**: 2-day, 3-day, 5-day, or 7-day paced travel routes\n• **Budget & Seasonal Timing**: Accurate night rates in INR and best months to visit\n• **Booking & Payments**: Instant UPI guidance and 100% full refund policy\n\nWhere would you like to travel?",
      isUser: false,
      time: 'Just now',
      provider: 'local-knowledge-engine',
      suggestedDestinations: [],
      followUpPrompts: INITIAL_PROMPTS.slice(0, 4),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isLoading]);

  // Clean up speech synthesis when closing or unmounting
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const getTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async (messageText) => {
    const query = (messageText || input).trim();
    if (!query || isLoading) return;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      text: query,
      isUser: true,
      time: getTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history (excluding initial greeting to keep focused context)
      const historyPayload = messages
        .filter((m) => m.id !== 'msg-0')
        .slice(-6)
        .map((m) => ({
          role: m.isUser ? 'user' : 'model',
          text: m.text,
        }));

      const response = await sendAiMessage(query, historyPayload);

      const botMsg = {
        id: `bot-${Date.now()}`,
        text: response.reply || response.text || 'I could not find a response for that. Please try asking differently!',
        isUser: false,
        time: getTimeString(),
        provider: response.provider || 'gemini',
        model: response.model,
        suggestedDestinations: response.suggestedDestinations || [],
        followUpPrompts: response.followUpPrompts || INITIAL_PROMPTS.slice(0, 3),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.detail ||
        'I am having trouble connecting to the travel guide server right now. Please try again in a moment or call our concierge at **9347466496**!';
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: errorMessage,
          isUser: false,
          time: getTimeString(),
          suggestedDestinations: [],
          followUpPrompts: ['📞 Call Concierge', '✨ How to book', '🌴 Beach escapes'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast('Voice input is not supported in this browser. Please type your query.', 'info');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        addToast('Listening... Speak your travel query now.', 'info', 2500);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          addToast('Could not recognize voice. Please check microphone permissions.', 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
      addToast('Microphone access unavailable.', 'error');
    }
  };

  const toggleSpeak = (text, messageId) => {
    if (!window.speechSynthesis) {
      addToast('Audio narration is not supported in this browser.', 'info');
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown characters for pleasant speech narration
    const cleanSpeech = text
      .replace(/[*_#`•]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/Rs\.\s*/g, 'Rupees ')
      .replace(/₹\s*/g, 'Rupees ');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyMessage = (text, idx) => {
    const cleanText = text.replace(/\*\*/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedIndex(idx);
      addToast('Travel guidance copied to clipboard!', 'success', 2000);
      setTimeout(() => setCopiedIndex(null), 2200);
    });
  };

  const handleClear = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setMessages([
      {
        id: 'msg-cleared',
        text: 'Chat history cleared. What else would you like to explore across India?',
        isUser: false,
        time: getTimeString(),
        suggestedDestinations: [],
        followUpPrompts: INITIAL_PROMPTS.slice(0, 4),
      },
    ]);
    addToast('Chat conversation reset', 'info', 1800);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`chat-toggle${isOpen ? ' chat-toggle--active' : ''}`}
        aria-label={isOpen ? 'Close AI Travel Assistant' : 'Open AI Travel Assistant'}
        title={isOpen ? 'Close AI Assistant' : 'AI Assistant'}
      >
        <span className="chat-toggle__pulse" />
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="chat-toggle__icon-wrap">
            <MessageSquare size={25} className="chat-toggle__chat-icon" />
            <Sparkles size={13} className="chat-toggle__sparkle-icon" />
          </div>
        )}
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className={`chat-window${isExpanded ? ' chat-window--expanded' : ''}`}>
          {/* Header */}
          <div className="chat-window__header">
            <div className="chat-window__header-info">
              <div className="chat-avatar">
                <Bot size={22} />
                <span className="chat-avatar__status" />
              </div>
              <div>
                <div className="chat-header-title-row">
                  <strong>Indian Journeys AI</strong>
                  <span className="chat-provider-badge">
                    <Sparkles size={11} /> 24/7 Live
                  </span>
                </div>
                <p>Curated routes, instant pricing & booking help</p>
              </div>
            </div>

            <div className="chat-window__header-actions">
              <button
                type="button"
                className="chat-header-btn"
                onClick={handleClear}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse size' : 'Expand size'}
                aria-label={isExpanded ? 'Collapse size' : 'Expand size'}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="chat-window__messages">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`chat-message-row${message.isUser ? ' chat-message-row--user' : ''}`}
              >
                {!message.isUser && (
                  <div className="chat-message-avatar">
                    <Bot size={14} />
                  </div>
                )}

                <div className="chat-message-container">
                  <div className={`chat-bubble${message.isUser ? ' chat-bubble--user' : ''}`}>
                    {message.isUser ? (
                      <p className="chat-user-text">{message.text}</p>
                    ) : (
                      <MarkdownMessage content={message.text} />
                    )}

                    {/* Interactive Destination Preview Cards */}
                    {!message.isUser &&
                      message.suggestedDestinations &&
                      message.suggestedDestinations.length > 0 && (
                        <div className="chat-destinations-carousel">
                          {message.suggestedDestinations.map((dest) => (
                            <div key={dest.id} className="chat-dest-card">
                              <img
                                src={resolveImageUrl(dest.image_url)}
                                alt={dest.name}
                                className="chat-dest-card__img"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80';
                                }}
                              />
                              <div className="chat-dest-card__body">
                                <span className="chat-dest-card__badge">{dest.state}</span>
                                <h4 className="chat-dest-card__title">{dest.name}</h4>
                                <p className="chat-dest-card__price">
                                  ₹{(dest.price_per_night || dest.price || 3000).toLocaleString('en-IN')}
                                  <span> / night</span>
                                </p>
                                <div className="chat-dest-card__actions">
                                  <Link
                                    to={`/location/${dest.id}`}
                                    className="chat-dest-btn chat-dest-btn--view"
                                  >
                                    View <ArrowRight size={12} />
                                  </Link>
                                  <Link
                                    to={`/location/${dest.id}/book`}
                                    className="chat-dest-btn chat-dest-btn--book"
                                  >
                                    Book
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Message Meta & Action Bar */}
                  <div className="chat-message-footer">
                    {message.time && <span className="chat-message-time">{message.time}</span>}

                    {!message.isUser && (
                      <div className="chat-bubble-actions">
                        <button
                          type="button"
                          className="chat-bubble-action-btn"
                          onClick={() => toggleSpeak(message.text, message.id || index)}
                          title={speakingMessageId === (message.id || index) ? 'Stop reading' : 'Read aloud'}
                        >
                          {speakingMessageId === (message.id || index) ? (
                            <VolumeX size={13} className="text-accent" />
                          ) : (
                            <Volume2 size={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="chat-bubble-action-btn"
                          onClick={() => handleCopyMessage(message.text, index)}
                          title="Copy response"
                        >
                          {copiedIndex === index ? (
                            <Check size={13} className="text-success" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contextual Follow-up Chips attached to latest response */}
                  {!message.isUser &&
                    index === messages.length - 1 &&
                    message.followUpPrompts &&
                    message.followUpPrompts.length > 0 && (
                      <div className="chat-context-prompts">
                        {message.followUpPrompts.map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            className="chat-prompt-pill"
                            onClick={() => handleSend(prompt)}
                            disabled={isLoading}
                          >
                            <Sparkles size={12} />
                            <span>{prompt}</span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {message.isUser && (
                  <div className="chat-message-avatar chat-message-avatar--user">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="chat-message-row">
                <div className="chat-message-avatar">
                  <Bot size={14} />
                </div>
                <div className="chat-bubble chat-bubble--typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar if not already in contextual chips */}
          {messages.length <= 1 && (
            <div className="chat-prompts-bar">
              <div className="chat-prompts-track">
                {INITIAL_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chat-prompt-pill"
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                  >
                    <Sparkles size={12} />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input & Voice Controls */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="chat-window__form"
          >
            <input
              ref={inputRef}
              type="text"
              className="chat-window__input"
              placeholder={isListening ? 'Listening to your voice...' : 'Ask about destinations, routes, budget, UPI...'}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading}
            />

            {/* Voice Input Microphone Button */}
            <button
              type="button"
              className={`chat-voice-btn${isListening ? ' chat-voice-btn--active' : ''}`}
              onClick={handleVoiceInput}
              title={isListening ? 'Stop listening' : 'Voice input (Speak)'}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="chat-window__submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
