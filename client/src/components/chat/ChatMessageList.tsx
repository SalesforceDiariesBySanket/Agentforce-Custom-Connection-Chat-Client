import { Message } from "../../types";
import { LoadingContainer, ChatMessage } from "./index";

export const ChatMessageList = ({
  messages,
  isLoading,
  error,
  messagesEndRef,
  onQuickReply,
  quickRepliesDisabled,
}: {
  messages: Message[];
  isLoading: boolean;
  error?: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onQuickReply?: (value: string) => void;
  quickRepliesDisabled?: boolean;
}) => (
  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
    {error && (
      <div className="bg-red-50 text-red-800 p-3 text-sm">
        Failed to load messages. Please try again.
      </div>
    )}
    <>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          {...message}
          onQuickReply={onQuickReply}
          disabled={quickRepliesDisabled}
        />
      ))}
      {isLoading && <LoadingContainer align="left" />}
      <div ref={messagesEndRef} />
    </>
  </div>
);
