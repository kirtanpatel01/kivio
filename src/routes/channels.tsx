import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useChannelStore } from "#/stores/channel-store";
import ChannelList from "#/components/channel-list";
import ChannelDetails from "#/components/channel-details";

export const Route = createFileRoute("/channels")({
  component: RouteComponent,
});

function RouteComponent() {
  const setChannels = useChannelStore((s) => s.setChannels);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kivio-channels");
    if (saved) {
      setChannels(JSON.parse(saved));
    } else {
      setChannels([
        { id: "1", name: "@chaiaurcode" },
        { id: "2", name: "@maboroshi_and_co" },
      ]);
    }
  }, [setChannels]);

  return (
    <div className="h-[calc(100vh-3rem)] flex overflow-hidden">
      <ChannelList />
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
        <ChannelDetails />
      </div>
    </div>
  );
}
