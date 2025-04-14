import { useEffect, useRef, useState } from 'react'

import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ScrollArea } from './ui/ScrollArea'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatInterfaceProps {
  className?: string
  onLoadingChange?: (loading: boolean) => void
}

export const ChatInterface = ({
  className,
  onLoadingChange,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading)
    }
  }, [loading, onLoadingChange])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prevMessages => [...prevMessages, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Get conversation history excluding the latest user message we just added
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch('http://localhost:5001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jwt')}`,
        },
        body: JSON.stringify({
          message: input,
          history: history,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.message || 'Failed to get a response from the assistant'
        )
      }

      const data = await response.json()

      if (data.success) {
        if (data.response) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response,
          }
          setMessages(prevMessages => [...prevMessages, assistantMessage])
        } else {
          throw new Error('No response content received')
        }
      } else {
        toast({
          title: 'Error',
          description:
            data.message ||
            data.error ||
            'Something went wrong. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error in chat:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to communicate with the assistant',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSendMessage()
    }
  }

  // Function to render markdown-like content
  const renderMessageContent = (content: string) => {
    // Simple markdown-like formatting
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .split('\n')
      .join('<br />')

    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
  }

  return (
    <div className={`flex flex-col h-full max-h-[600px] ${className}`}>
      <ScrollArea className="flex-grow p-4 border rounded-md mb-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center p-4 text-slate-500">
              <p>
                Ask me anything about outdoor gear, packing lists, or trip
                planning!
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 dark:text-white ml-auto'
                    : 'bg-gray-100 dark:bg-gray-800 dark:text-white'
                }`}
              >
                {renderMessageContent(message.content)}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-grow"
        />
        <Button onClick={handleSendMessage} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
