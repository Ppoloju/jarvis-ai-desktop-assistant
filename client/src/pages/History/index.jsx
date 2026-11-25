import { useEffect, useState } from "react";
import {
  getChatHistory,
  clearChatHistory,
  onChatHistoryCleared,
} from "../../utils/history";
import { Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { pluralize } from "../../utils/format";
import { Icon } from "../../components/ui/Icons";

export default function History() {
  const [chat, setChat] = useState(() => getChatHistory());

  useEffect(() => {
    const refresh = () => setChat(getChatHistory());

    const unsubscribe = onChatHistoryCleared(refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <>
      <PageHeader
        title="History"
        description="Conversations are stored in this browser only."
        action={
          chat.length > 0 && (
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                clearChatHistory();
                setChat([]);
              }}
            >
              Clear history
            </Button>
          )
        }
      />

      <Card title="Conversations" description={`${pluralize(chat.length, "message")} stored`}>
        {chat.length === 0 ? (
          <EmptyState
            icon="history"
            title="No conversations yet"
            description="Messages you exchange with the assistant appear here."
          />
        ) : (
          <ul className="space-y-4">
            {chat.map((entry, index) => (
              <li key={index} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                    <Icon name="user" className="h-3 w-3" />
                  </span>
                  <p className="text-sm font-medium text-slate-800">{entry.user}</p>
                </div>
                <div className="mt-2 flex items-start gap-2 pl-8">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icon name="sparkles" className="h-3 w-3" />
                  </span>
                  <p className="whitespace-pre-line text-sm text-slate-600">{entry.bot}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
