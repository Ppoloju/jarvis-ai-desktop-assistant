import ChatBox from "../../components/Chat/ChatBox";
import SystemInfo from "../../components/SystemInfo";
import { PageHeader } from "../../components/ui";

export default function Home() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="A local assistant for your desktop: conversation, automation, files and reminders."
      />
      <div className="space-y-6">
        <SystemInfo />
        <ChatBox />
      </div>
    </>
  );
}
