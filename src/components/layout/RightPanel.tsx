"use client";

import { useState } from "react";
import { MessageCircle, Vote, ShoppingBag, Settings } from "lucide-react";
import { Chatbox } from "@/components/chat/Chatbox";
import { VoteModule } from "@/components/vote/VoteModule";
import { PenaltyShop } from "@/components/shop/PenaltyShop";
import { RecentPenaltiesCard } from "@/components/home/RecentPenaltiesCard";
import { SettingsView } from "@/components/settings/SettingsView";
import { HomeClient } from "@/app/HomeClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TabId = "chat" | "vote" | "punishments" | "settings";

type PenaltyItem = {
  id: string;
  title: string;
  teamName: string;
  buyerName: string;
  createdAt: string;
};

type RightPanelProps = {
  team1Name: string;
  team2Name: string;
  recentPenalties: PenaltyItem[];
};

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "chat", label: "Vestlus", icon: MessageCircle },
  { id: "vote", label: "Hääletus", icon: Vote },
  { id: "punishments", label: "Karistused", icon: ShoppingBag },
  { id: "settings", label: "Seaded", icon: Settings },
];

export function RightPanel({ team1Name, team2Name, recentPenalties }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-white/5 bg-card md:w-[360px] md:flex-shrink-0">
      <div className="flex shrink-0 gap-0.5 border-b border-white/5 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 gap-1.5 text-xs",
              activeTab === id && "bg-primary/15 text-primary"
            )}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden truncate sm:inline">{label}</span>
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeTab === "chat" && (
          <div className="flex h-full min-h-[300px] flex-col">
            <Chatbox embedded />
          </div>
        )}
        {activeTab === "vote" && (
          <VoteModule team1Name={team1Name} team2Name={team2Name} />
        )}
        {activeTab === "punishments" && (
          <div className="space-y-4">
            <PenaltyShop
              team1Name={team1Name}
              team2Name={team2Name}
            />
            <HomeClient
              team1Name={team1Name}
              team2Name={team2Name}
              recentPenalties={[]}
            />
            <RecentPenaltiesCard penalties={recentPenalties} />
          </div>
        )}
        {activeTab === "settings" && <SettingsView />}
      </div>
    </aside>
  );
}
