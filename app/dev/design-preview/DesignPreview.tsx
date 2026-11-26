"use client";

import { useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/Button";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { SquadDashboard } from "@/features/squad/components/SquadDashboard";
import { PlayerStickerCard } from "@/features/player/components/PlayerStickerCard";
import { PaniniSticker } from "@/features/wheel/components/PaniniSticker";
import { ShopModal } from "@/features/wheel/components/ShopModal";
import { PveLobby } from "@/features/pve/components/PveLobby";
import { RetiredStage } from "@/features/wheel/components/RetiredStage";
import { FORMATION_SLOTS } from "@/types/squad";
import { EditorialArt, EDITORIAL_ASSETS } from "@/components/shared/EditorialArt";
import { previewPlayers, previewSessions, previewClassicSessions, previewClubStints } from "./fixtures";
import { ClassicLobbyIntro, ClassicLobbyContent } from "@/features/game/components/ClassicLobbyIntro";
import { RecapPreview } from "./RecapPreview";

const TABS = ["Đội hình", "Thẻ cầu thủ", "Cửa hàng", "PvE", "Giải nghệ", "Media", "Tổng kết", "Classic"];

export function DesignPreview({ initialTab = TABS[0] }: { initialTab?: string }) {
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : TABS[0]);
  const [shopOpen, setShopOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showOneSession, setShowOneSession] = useState(false);
  const [feedback, setFeedback] = useState("");

  const rejectPreviewPurchase = async () => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    throw new Error("Dữ liệu thử nghiệm: không thực hiện giao dịch.");
  };

  return (
    <AppShell className="football-squad-board-shell" backHref="/" backLabel="home">
      <section aria-label="Kiểm tra thiết kế" style={{ display: "grid", width: "100%", minWidth: 0, gap: 24, paddingBlock: 24 }}>
        <div>
          <h1>Kiểm tra thiết kế</h1>
          <p>Dữ liệu thử nghiệm để kiểm tra giao diện. Không lưu thay đổi vào tài khoản.</p>
        </div>
        <TabsList>
          {TABS.map((label) => (
            <TabsTrigger key={label} value={label} active={tab === label} onSelect={setTab}>{label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent active={tab === "Đội hình"}>
          <SquadDashboard managementPreview
            gameId="design-preview" formation="4-3-3" status="in_progress"
            squadRating={83} sessionName="Đội hình thử nghiệm" players={previewPlayers}
            slots={FORMATION_SLOTS["4-3-3"]}
          />
        </TabsContent>
        <TabsContent active={tab === "Media"}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24 }}>
            {EDITORIAL_ASSETS.map((asset) => <figure key={asset}><EditorialArt asset={asset} /><figcaption>{asset}</figcaption></figure>)}
          </div>
        </TabsContent>
        <TabsContent active={tab === "Classic"}><section className="football-classic-lobby"><ClassicLobbyIntro sessionCount={previewClassicSessions.length} /><ClassicLobbyContent sessions={previewClassicSessions} /></section></TabsContent>
        <TabsContent active={tab === "Tổng kết"}><RecapPreview /></TabsContent>
        <TabsContent active={tab === "Thẻ cầu thủ"}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
            {previewPlayers.map((player) => (
              <div key={player.id}>
                <h2>{player.nationality}</h2>
                <PaniniSticker
                  playerName={player.name} position={player.position} playerNationality={player.nationality}
                  currentOvr={player.peakOvr} currentAge={24} playerDebutAge={18}
                  currentContinentalCup="none" standingResult={null} domesticCupResult={null}
                  continentalCupResult={null} nationalCallupResult={null} nationalTournamentResult={null}
                  hasBallonDorWinner={false} currentStats={{ pac: 82, sho: 79, pas: 84, dri: 81, def: 70, phy: 78 }}
                  evolvedStatsThisYear={[]}
                />
                <PlayerStickerCard player={player} finalClub="CLB thử nghiệm" debutAge={18} retireAge={34} careerLength={17} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent active={tab === "Cửa hàng"}>
          <Button onClick={() => setShopOpen(true)}>Mở cửa hàng thử nghiệm</Button>
          <p role="status">{feedback}</p>
          <ShopModal
            embedded standalone walletBalance={12_000} shopInventory={[]} isProcessing={false} targetSeason={25}
            onPurchase={rejectPreviewPurchase} onPurchaseAll={rejectPreviewPurchase}
            onContinue={() => setFeedback("Đã kiểm tra nút tiếp tục. Không thay đổi mùa giải.")}
          />
        </TabsContent>
        <TabsContent active={tab === "PvE"}>
          <Button variant="outline" onClick={() => setShowEmpty((value) => !value)}>
            {showEmpty ? "Hiện đội hình thử nghiệm" : "Hiện trạng thái trống"}
          </Button>
          <Button variant="quiet" onClick={() => setShowOneSession((value) => !value)}>{showOneSession ? "Hiện hai đội hình" : "Hiện một đội hình"}</Button>
          <PveLobby sessions={showEmpty ? [] : showOneSession ? previewSessions.slice(0, 1) : previewSessions} />
        </TabsContent>
        <TabsContent active={tab === "Giải nghệ"}>
          <RetiredStage
            position="GK" playerNationality="Brazil" peakOvrValue={78}
            playerName={previewPlayers[0].name} careerTotalStats={{ apps: 420, goals: 0, assists: 3 }}
            clubStints={previewClubStints} isSaving={false}
            handleSavePlayer={() => setFeedback("Đã kiểm tra nút lưu. Không ghi dữ liệu thử nghiệm.")}
          />
          <p role="status">{feedback}</p>
        </TabsContent>
      </section>
      {shopOpen && (
        <ShopModal
          walletBalance={12_000} shopInventory={[]} isProcessing={false} targetSeason={25}
          onPurchase={rejectPreviewPurchase} onPurchaseAll={rejectPreviewPurchase}
          onContinue={() => setShopOpen(false)} onClose={() => setShopOpen(false)}
        />
      )}
    </AppShell>
  );
}
