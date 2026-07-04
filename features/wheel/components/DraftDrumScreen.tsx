"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Dices, Award, Trophy, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, Globe, Play, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import { SpinnerWheel } from "./SpinnerWheel";
import { PaniniSticker } from "./PaniniSticker";
import { SeasonProfile } from "./SeasonProfile";
import { TimelineHistory } from "./TimelineHistory";
import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getFlagEmoji } from "@/types/squad";
import { generateFictionalName } from "@/lib/name-gen";
import { simulatePlayerSeason, type SimulatedSeasonResult } from "@/lib/simulation-engine/match-simulator";
import { saveCareerPlayer } from "@/actions/player.actions";
import {
  NATIONALITY_POOL,
  DEBUT_AGE_POOL,
  DEBUT_OVR_POOL,
  CAREER_LENGTH_POOL,
  getLeagueWeights,
  getClubWeights,
  getDebutStatWeights,
  getNationalTier,
  getNationalContinentalCup,
  calculateOvrByPosition,
} from "@/lib/wheel-engine/weight-calculator";

// ============================================================
// TYPES
// ============================================================

interface Props {
  gameId: string;
  slotIndex: number;
  position: string;
  leagues: { id: string; name: string; country: string; prestige: number }[];
  clubs: { id: string; name: string; leagueId: string; prestige: number; continentalType: string }[];
}

interface SeasonRecord {
  age: number;
  clubName: string;
  leagueName: string;
  standing: number | null;
  domesticCup: string | null;
  continentalCup: { type: string; result: string } | null;
  nationalTeam: { type: string; callup: string; result: string | null } | null;
  leagueTable?: any[];
  domesticCupJourney?: string[];
  continentalCupJourney?: string[];
  nationalTeamJourney?: string[];
}

const STEP_LABELS = [
  "Quốc Tịch",
  "Tuổi Ra Mắt",
  "Pace (PAC)",
  "Shooting (SHO)",
  "Passing (PAS)",
  "Dribbling (DRI)",
  "Defending (DEF)",
  "Physical (PHY)",
  "Thời Gian Thi Đấu",
  "Giải Đấu",
  "Câu Lạc Bộ",
];

// ============================================================
// HELPERS
// ============================================================

function calculateContinentalQualification(leagueId: string, standing: number): string {
  if (!leagueId) return "none";
  
  const id = leagueId.toUpperCase();
  
  // 1. Nhóm giải siêu cấp châu Âu (Top 4 leagues: Anh, Tây Ban Nha, Đức, Ý)
  if (["ENG1", "ESP1", "GER1", "ITA1"].includes(id)) {
    if (standing <= 4) return "UCL";
    if (standing <= 6) return "UEL";
    if (standing === 7) return "UECL";
  }
  
  // 2. Nhóm giải cấp 2 châu Âu (Pháp, Bồ Đào Nha, Hà Lan, Thổ Nhĩ Kỳ, Bỉ)
  if (["FRA1", "POR1", "NED1", "TUR1", "BEL1"].includes(id)) {
    if (standing <= 2) return "UCL";
    if (standing <= 4) return "UEL";
    if (standing === 5) return "UECL";
  }
  
  // 3. Nhóm giải cấp 3 châu Âu (Scotland...)
  if (["SCO1"].includes(id)) {
    if (standing === 1) return "UCL";
    if (standing === 2) return "UEL";
    if (standing === 3) return "UECL";
  }
  
  // 4. Nhóm Nam Mỹ (Brazil, Argentina)
  if (["BRA1", "ARG1"].includes(id)) {
    if (standing <= 6) return "Libertadores";
  }
  if (["COL1", "ECU1", "URU1", "CHI1"].includes(id)) {
    if (standing <= 2) return "Libertadores";
  }
  
  // 5. Nhóm Châu Á (Nhật Bản, Hàn Quốc, Saudi Arabia...)
  if (["JPN1", "KOR1", "KSA1"].includes(id)) {
    if (standing <= 3) return "AFC_CL";
  }
  if (["QAT1", "UAE1", "AUS1", "IND1", "CHN1"].includes(id)) {
    if (standing === 1) return "AFC_CL";
  }
  
  // 6. Nhóm Bắc Mỹ (Mỹ, Mexico)
  if (["USA1", "MEX1"].includes(id)) {
    if (standing <= 3) return "CONCACAF_CC";
  }
  
  return "none";
}

function getContinentalCupLabel(cupType: string): string {
  switch (cupType) {
    case "UCL": return "UEFA Champions League";
    case "UEL": return "UEFA Europa League";
    case "UECL": return "UEFA Conference League";
    case "Libertadores": return "Copa Libertadores";
    case "AFC_CL": return "AFC Champions League";
    case "CONCACAF_CC": return "CONCACAF Champions Cup";
    default: return "Cúp Châu Lục CLB";
  }
}

function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

// Sinh tên mock đối thủ thực tế theo giải đấu bóng đá thế giới nếu DB thiếu
function getMockOpponentsByLeagueName(leagueName: string, leagueId?: string): string[] {
  const name = leagueName.toLowerCase();
  const id = leagueId?.toUpperCase() ?? "";

  // Check giải hạng 2 trước để tránh bị nhận diện nhầm sang hạng 1 (Ví dụ: La Liga 2)
  if (name.includes("la liga 2") || name.includes("la liga 2") || id === "ESP2") {
    return ["Granada", "Málaga", "Cádiz", "Elche", "Almería", "Deportivo La Coruña", "Huesca", "Burgos", "Mirandés", "Albacete", "Castellón", "Racing Santander"];
  }
  if (name.includes("championship") || id === "ENG2") {
    return ["Leeds United", "Norwich City", "Sunderland", "Coventry City", "Burnley", "Watford", "Middlesbrough", "West Brom", "Sheffield Utd", "Luton Town", "Blackburn", "Hull City"];
  }
  if (name.includes("2. bundesliga") || id === "GER2") {
    return ["Hamburger SV", "Schalke 04", "Hertha BSC", "FC Köln", "Hannover 96", "Fortuna Düsseldorf", "Kaiserslautern", "Paderborn", "Karlsruher SC", "Nürnberg"];
  }
  if (name.includes("serie b") || id === "ITA2") {
    return ["Palermo", "Sampdoria", "Bari", "Cremonese", "Sassuolo", "Salernitana", "Frosinone", "Spezia", "Pisa", "Brescia"];
  }
  if (name.includes("ligue 2") || id === "FRA2") {
    return ["Bordeaux", "Paris FC", "Caen", "Troyes", "Metz", "Lorient", "Clermont", "Guingamp", "Grenoble", "Amiens"];
  }

  // Giải hạng 1
  if (name.includes("premier league") || name.includes("england") || name.includes("anh")) {
    return ["Arsenal", "Man City", "Liverpool", "Man United", "Chelsea", "Tottenham", "Aston Villa", "Newcastle", "Everton", "Brighton", "West Ham", "Leicester"];
  }
  if (name.includes("bundesliga") || name.includes("germany") || name.includes("đức")) {
    return ["Bayern München", "Dortmund", "Leverkusen", "RB Leipzig", "Stuttgart", "Frankfurt", "Freiburg", "Mönchengladbach", "Hoffenheim", "Werder Bremen"];
  }
  if (name.includes("la liga") || name.includes("spain") || name.includes("tây ban nha")) {
    return ["Real Madrid", "Barcelona", "Atlético Madrid", "Real Sociedad", "Real Betis", "Villarreal", "Sevilla", "Athletic Bilbao", "Girona", "Valencia"];
  }
  if (name.includes("serie a") || name.includes("italy") || name.includes("ý")) {
    return ["Inter Milan", "AC Milan", "Juventus", "Napoli", "Lazio", "AS Roma", "Atalanta", "Fiorentina", "Bologna", "Torino"];
  }
  if (name.includes("ligue 1") || name.includes("france") || name.includes("pháp")) {
    return ["PSG", "Marseille", "Monaco", "Lille", "Lens", "Rennes", "Lyon", "Nice", "Reims", "Strasbourg"];
  }
  if (name.includes("stars league") || name.includes("qatar")) {
    return ["Al-Sadd", "Al-Duhail", "Al-Rayyan", "Al-Gharafa", "Al-Arabi", "Al-Wakra", "Umm Salal", "Qatar SC", "Al-Ahli", "Al-Khor"];
  }
  if (name.includes("série a") || name.includes("série b") || name.includes("brazil")) {
    return ["Palmeiras", "Flamengo", "Atlético Mineiro", "Fluminense", "Grêmio", "São Paulo", "Botafogo", "Red Bull Bragantino", "Athletico Paranaense", "Coritiba"];
  }
  return ["FC United", "City FC", "Rangers", "Athletic", "Real Club", "FC Dynamo", "Rovers", "Town FC", "Sporting", "Inter FC"];
}

// ── HÀM TÍNH ĐỘC LẬP WEIGHTS CHO BÁNH XE THỨ HẠNG GIẢI ĐẤU (STANDING WHEEL) DYNAMIC THEO LỚN BẢNG ──
function getStandingWheelPool(clubPrestige: number, ovr: number, leagueSize: number, apps: number = 38) {
  const targetOvr = 55 + clubPrestige * 6;
  const diff = ovr - targetOvr;
  const influenceFactor = Math.min(1.0, Math.max(0.0, apps / 55));

  const pool = Array.from({ length: leagueSize }, (_, i) => {
    const pos = i + 1;
    let baseWeight = 10;

    // expectedPos co dãn theo quy mô giải đấu
    const expectedPos = Math.max(1, Math.min(leagueSize, Math.round(leagueSize - clubPrestige * (leagueSize / 5) + 1)));
    const dist = Math.abs(pos - expectedPos);
    baseWeight = Math.max(1, 40 - dist * (35 / leagueSize));

    let ovrModifier = 0;
    if (diff > 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.5 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.2 * influenceFactor;
    } else if (diff < 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.2 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.5 * influenceFactor;
    }

    const finalWeight = Math.max(1, Math.round(baseWeight + ovrModifier));
    return {
      value: pos,
      weight: finalWeight,
    };
  });

  return pool;
}

// ── HÀM ĐƯỢC DÙNG ĐỂ TỰ ĐỘNG SINH HÀNH TRÌNH ĐẤU CÚP DỄ HÌNH DUNG ──
function generateDomesticCupJourney(result: string): string[] {
  switch (result) {
    case "Winner":
      return ["Vòng 32: Thắng 3-0", "Vòng 16: Thắng 2-1", "Tứ Kết: Thắng 1-0", "Bán Kết: Thắng 2-0", "Chung Kết: Thắng 2-1 🏆 VÔ ĐỊCH!"];
    case "Runner-Up":
      return ["Vòng 32: Thắng 2-0", "Vòng 16: Thắng 3-1", "Tứ Kết: Thắng 1-0 (H.Phụ)", "Bán Kết: Thắng 2-1", "Chung Kết: Thua 0-1 🥈 Á QUÂN"];
    case "Semi-Finals":
      return ["Vòng 32: Thắng 4-1", "Vòng 16: Thắng 2-0", "Tứ Kết: Thắng 1-0", "Bán Kết: Thua 1-2 🥉 Hạng 3/4"];
    default:
      return ["Vòng 32: Thua 0-1 (Bị loại sớm) ❌"];
  }
}

function generateContinentalCupJourney(result: string, cupType: string): string[] {
  switch (result) {
    case "Winner":
      return ["Vòng Bảng: Đi tiếp (Đầu bảng)", "Vòng 16: Thắng 3-2 (Tổng tỉ số)", "Tứ Kết: Thắng 4-1", "Bán Kết: Thắng 2-0", `Chung Kết ${cupType}: Thắng 1-0 🏆 VÔ ĐỊCH!`];
    case "Runner-Up":
      return ["Vòng Bảng: Đi tiếp (Nhì bảng)", "Vòng 16: Thắng 2-1", "Tứ Kết: Thắng 3-0", "Bán Kết: Thắng 1-0", `Chung Kết ${cupType}: Thua 1-2 🥈 Á QUÂN`];
    case "Semi-Finals":
      return ["Vòng Bảng: Đi tiếp (Đầu bảng)", "Vòng 16: Thắng 2-0", "Tứ Kết: Thắng 1-0", "Bán Kết: Thua 2-3 (Tổng tỉ số) 🥉 Dừng bước ở Bán kết"];
    default:
      return ["Vòng Bảng: Đứng thứ 4 chung cuộc (Bị loại vòng bảng) ❌"];
  }
}

function generateNationalTeamJourney(result: string, tourneyName: string): string[] {
  switch (result) {
    case "Winner":
      return ["Vòng Bảng: Đi tiếp", "Vòng 16: Thắng 2-0", "Tứ Kết: Thắng 3-1", "Bán Kết: Thắng 1-0", `Chung Kết ${tourneyName}: Thắng 2-1 🏆 VÔ ĐỊCH QUỐC TẾ!`];
    case "Runner-Up":
      return ["Vòng Bảng: Đi tiếp", "Vòng 16: Thắng 1-0", "Tứ Kết: Thắng 2-0", "Bán Kết: Thắng 2-1", `Chung Kết ${tourneyName}: Thua 0-2 🥈 Á QUÂN`];
    case "Semi-Finals":
      return ["Vòng Bảng: Đi tiếp", "Vòng 16: Thắng 2-1", "Tứ Kết: Thắng 1-0", `Bán Kết ${tourneyName}: Thua 1-2 (Dừng bước ở Bán kết)`];
    default:
      return [`Vòng Bảng ${tourneyName}: Không thể vượt qua vòng bảng ❌`];
  }
}

function generateMockLeagueTable(playerStanding: number, clubName: string, currentLeagueClubs: any[]) {
  const sorted = [...currentLeagueClubs].sort((a, b) => b.prestige - a.prestige);
  const playerClubIndex = sorted.findIndex(c => c.name.toLowerCase() === clubName.toLowerCase());
  let playerClubObj = sorted[playerClubIndex];
  if (!playerClubObj) {
    playerClubObj = { id: "player", name: clubName, prestige: 4, continentalType: "none" };
  }

  const tempClubs = sorted.filter(c => c.name.toLowerCase() !== clubName.toLowerCase());
  const targetIdx = playerStanding - 1;
  const finalTable = [];

  let tempIdx = 0;
  const size = currentLeagueClubs.length;
  for (let i = 0; i < size; i++) {
    if (i === targetIdx) {
      finalTable.push({
        clubId: playerClubObj.id,
        name: playerClubObj.name,
        played: 38,
        won: Math.max(0, Math.round(size * 1.4) - playerStanding * 2),
        drawn: Math.floor(Math.random() * 5) + 4,
        lost: Math.max(0, playerStanding * 2 - 2),
        points: Math.max(20, Math.round(size * 4.6) - playerStanding * 4),
      });
    } else {
      const opponent = tempClubs[tempIdx] || { id: `opp_${i}`, name: `Opponent ${i}`, prestige: 3 };
      tempIdx++;
      const oppStanding = i + 1;
      finalTable.push({
        clubId: opponent.id,
        name: opponent.name,
        played: 38,
        won: Math.max(0, Math.round(size * 1.4) - oppStanding * 2),
        drawn: Math.floor(Math.random() * 5) + 4,
        lost: Math.max(0, oppStanding * 2 - 2),
        points: Math.max(15, Math.round(size * 4.6) - oppStanding * 4),
      });
    }
  }
  return finalTable;
}

// ============================================================
// COMPONENT
// ============================================================

export function DraftDrumScreen({ gameId, slotIndex, position, leagues, clubs }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Quản lý chế độ (mode): "setup" | "career" | "retired"
  const [mode, setMode] = useState<"setup" | "career" | "retired">("setup");

  // 2. States quản lý setup wheel
  const [wheelItems, setWheelItems] = useState<{ label: string; value: any }[]>([]);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [tempValue, setTempValue] = useState<string | number | null>(null);

  const {
    activeStep,
    isSpinning,
    draftData,
    startSpin,
    resolveStep,
    setStep,
    resetDraft,
    stopSpin,
  } = useWheelUiStore();

  // 3. States quản lý Career Loop
  const [playerName, setPlayerName] = useState<string>("");
  const [hiddenStats, setHiddenStats] = useState<any>(null);
  const [statsTimeline, setStatsTimeline] = useState<any[]>([]);
  const [clubStints, setClubStints] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [playerNationality, setPlayerNationality] = useState<string>("");
  const [playerDebutAge, setPlayerDebutAge] = useState<number>(18);
  const [playerCareerLength, setPlayerCareerLength] = useState<number>(15);

  const [currentAge, setCurrentAge] = useState<number>(18);
  const [currentOvr, setCurrentOvr] = useState<number>(60);
  const [currentStats, setCurrentStats] = useState<Record<string, number>>({
    pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60
  });
  const [currentClub, setCurrentClub] = useState<any>(null);

  const [currentContinentalCup, setCurrentContinentalCup] = useState<string>("none");
  const [lastYearStanding, setLastYearStanding] = useState<number>(10);

  // ── STATES QUẢN LÝ CAREER STATS PANEL (CỘT GIỮA) ──
  const [seasonRecords, setSeasonRecords] = useState<Record<number, SeasonRecord>>({});
  const [selectedAgeForStats, setSelectedAgeForStats] = useState<number>(18);

  // States quản lý đóng/mở dropdown/accordion ở cột giữa
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const [isCupOpen, setIsCupOpen] = useState(false);
  const [isContinentalOpen, setIsContinentalOpen] = useState(false);
  const [isNationalOpen, setIsNationalOpen] = useState(false);

  // States vòng quay Career Loop hàng năm
  const [careerSubStep, setCareerSubStep] = useState<
    "idle" | "direction" | "count" | "selector" | "magnitude" | "standing" | "domestic_cup" | "continental_cup" | "national_callup" | "national_tournament" | "transfer" | "resolved"
  >("idle");
  const [careerSpinning, setCareerSpinning] = useState(false);
  const [careerWheelItems, setCareerWheelItems] = useState<{ label: string; value: any }[]>([]);
  const [careerTargetIndex, setCareerTargetIndex] = useState<number>(-1);
  const [careerTempValue, setCareerTempValue] = useState<string | null>(null);

  // Biến tạm để tiến hóa stats trong năm
  const [yearEvolution, setYearEvolution] = useState<{
    direction: "increase" | "decrease" | "maintain" | null;
    count: number | null;
  }>({ direction: null, count: null });

  // Theo dõi lượt quay selector và loại trừ
  const [selectorIndex, setSelectorIndex] = useState<number>(0);
  const [selectedStatsList, setSelectedStatsList] = useState<string[]>([]);
  const [tempSelectedStat, setTempSelectedStat] = useState<string | null>(null);
  const [evolvedStatsThisYear, setEvolvedStatsThisYear] = useState<{ stat: string; delta: number }[]>([]);

  // Kết quả quay các wheels tập thể trong năm thi đấu
  const [standingResult, setStandingResult] = useState<number | null>(null);
  const [domesticCupResult, setDomesticCupResult] = useState<string | null>(null);
  const [continentalCupResult, setContinentalCupResult] = useState<string | null>(null);
  const [nationalCallupResult, setNationalCallupResult] = useState<string | null>(null);
  const [nationalTournamentResult, setNationalTournamentResult] = useState<string | null>(null);

  const [yearSimResult, setYearSimResult] = useState<SimulatedSeasonResult | null>(null);
  const [transferOffer, setTransferOffer] = useState<{ clubId: string; clubName: string; leagueId: string; leagueName: string } | null>(null);
  const [hasBallonDorWinner, setHasBallonDorWinner] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    resetDraft();

    // Reset sạch sẽ tất cả state cục bộ quản lý Career Loop để tránh bị dính cache từ player cũ do Soft Navigation
    setMode("setup");
    setPlayerName("");
    setHiddenStats(null);
    setClubStints([]);
    setEvents([]);
    setStatsTimeline([]);
    setCurrentClub(null);
    setPlayerNationality("");
    setPlayerDebutAge(18);
    setPlayerCareerLength(15);
    setCurrentAge(18);
    setCurrentOvr(60);
    setCurrentStats({ pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 });
    setCurrentContinentalCup("none");
    setLastYearStanding(10);
    setSeasonRecords({});
    setSelectedAgeForStats(18);
    setCareerSubStep("idle");
    setYearEvolution({ direction: null, count: null });
    setSelectorIndex(0);
    setSelectedStatsList([]);
    setTempSelectedStat(null);
    setEvolvedStatsThisYear([]);
    setStandingResult(null);
    setDomesticCupResult(null);
    setContinentalCupResult(null);
    setNationalCallupResult(null);
    setNationalTournamentResult(null);
    setYearSimResult(null);
    setTransferOffer(null);
    setHasBallonDorWinner(false);
  }, [resetDraft]);

  const filteredClubs = clubs.filter((c) => c.leagueId === draftData.leagueId);

  // Tôn trọng dữ liệu DB: Ưu tiên lấy 100% CLB thực tế cùng giải đấu từ database
  const currentLeagueClubs = useMemo(() => {
    if (!currentClub || !currentClub.leagueId) return [];
    
    // 1. Lấy toàn bộ các CLB có trong DB cùng giải đấu với player
    let dbClubs = clubs.filter((c) => c.leagueId === currentClub.leagueId);
    
    // Đảm bảo CLB của player luôn nằm trong danh sách
    const hasPlayerClub = dbClubs.some(c => c.name.toLowerCase() === currentClub.name.toLowerCase());
    if (!hasPlayerClub) {
      dbClubs.push({
        id: currentClub.id,
        name: currentClub.name,
        leagueId: currentClub.leagueId,
        prestige: currentClub.prestige ?? 3,
        continentalType: currentClub.continentalType ?? "none"
      });
    }

    // 2. Nếu database giải đó có từ 10 CLB trở lên (Hầu hết các giải lớn GER1, ENG1, ESP1... đều có từ 18-20 CLB), lấy hoàn toàn các CLB thực tế đó từ DB!
    if (dbClubs.length >= 10) {
      return [...dbClubs].sort((a, b) => b.prestige - a.prestige);
    }
    
    // 3. Nếu database giải đấu nhỏ có ít hơn 10 CLB, lấy hết CLB thực tế từ DB và chỉ mock thêm CLB thực tế cho đủ 10
    const mockClubNames = getMockOpponentsByLeagueName(currentClub.leagueName, currentClub.leagueId);
    const list = [...dbClubs];
    const needed = 10 - list.length;
    let mockIdx = 0;
    
    for (let i = 0; i < needed; i++) {
      let chosenName = mockClubNames[mockIdx % mockClubNames.length];
      while (list.some(c => c.name.toLowerCase() === chosenName.toLowerCase()) && mockIdx < mockClubNames.length * 2) {
        mockIdx++;
        chosenName = mockClubNames[mockIdx % mockClubNames.length];
      }
      mockIdx++;
      list.push({
        id: `mock_${currentClub.leagueId}_${i}`,
        name: chosenName,
        leagueId: currentClub.leagueId,
        prestige: Math.floor(Math.random() * 2) + 2,
        continentalType: "none",
      });
    }
    
    return list.sort((a, b) => b.prestige - a.prestige);
  }, [currentClub, clubs]);

  const leagueSize = useMemo(() => {
    return currentLeagueClubs.length || 10;
  }, [currentLeagueClubs]);

  // Khởi tạo bản ghi mùa giải mới
  useEffect(() => {
    if (mode === "career" && currentClub) {
      setSeasonRecords((prev) => {
        if (prev[currentAge]) return prev;
        return {
          ...prev,
          [currentAge]: {
            age: currentAge,
            clubName: currentClub.name,
            leagueName: currentClub.leagueName,
            standing: null,
            domesticCup: "Chờ quay",
            continentalCup: currentContinentalCup !== "none" ? { type: currentContinentalCup, result: "Chờ quay" } : null,
            nationalTeam: (currentAge % 2 === 0) ? { type: currentAge % 4 === 0 ? "FIFA World Cup" : getNationalContinentalCup(playerNationality), callup: "Chờ gọi", result: null } : null,
          }
        };
      });
      setSelectedAgeForStats(currentAge);
    }
  }, [currentAge, mode, currentClub, currentContinentalCup, playerNationality]);

  // ── THIẾT LẬP MÚI BÁNH XE SETUP ──
  useEffect(() => {
    if (!isMounted || mode !== "setup") return;

    let items: { label: string; value: any }[] = [];
    switch (activeStep) {
      case 0:
        items = NATIONALITY_POOL.map((x) => ({
          label: `${getFlagEmoji(x.value)} ${x.value}`,
          value: x.value,
        }));
        break;
      case 1:
        items = DEBUT_AGE_POOL.map((x) => ({
          label: `${x.value} Tuổi`,
          value: x.value,
        }));
        break;
      case 2:
        items = getDebutStatWeights(position, "pac").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 3:
        items = getDebutStatWeights(position, "sho").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 4:
        items = getDebutStatWeights(position, "pas").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 5:
        items = getDebutStatWeights(position, "dri").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 6:
        items = getDebutStatWeights(position, "def").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 7:
        items = getDebutStatWeights(position, "phy").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 8:
        items = CAREER_LENGTH_POOL.map((x) => ({
          label: `${x.value} Năm`,
          value: x.value,
        }));
        break;
      case 9:
        const leagueWeights = getLeagueWeights(leagues);
        items = leagueWeights.map((x) => ({
          label: x.value.name,
          value: x.value,
        }));
        break;
      case 10:
        if (filteredClubs.length === 0) {
          items = [{ label: "Không có CLB", value: { id: "", name: "Không có CLB" } }];
        } else {
          const clubWeights = getClubWeights(filteredClubs);
          items = clubWeights.map((x) => ({
            label: x.value.name,
            value: x.value,
          }));
        }
        break;
    }
    setWheelItems(items);
  }, [activeStep, isMounted, leagues, filteredClubs.length, mode, position]);

  // ── THIẾT LẬP MÚI BÁNH XE CAREER LOOPS (ĐỒNG BỘ THEO DYNAMIC LEAGUE SIZE) ──
  useEffect(() => {
    if (!isMounted || mode !== "career") return;

    let items: { label: string; value: any }[] = [];
    switch (careerSubStep) {
      case "direction":
        items = [
          { label: "Tăng Chỉ Số (+)", value: "increase" },
          { label: "Giảm Chỉ Số (-)", value: "decrease" },
          { label: "Giữ Nguyên (OVR)", value: "maintain" },
        ];
        break;
      case "count":
        items = [
          { label: "1 Chỉ Số", value: 1 },
          { label: "2 Chỉ Số", value: 2 },
          { label: "3 Chỉ Số", value: 3 },
          { label: "4 Chỉ Số", value: 4 },
        ];
        break;
      case "magnitude":
        items = [
          { label: "1 Điểm", value: 1 },
          { label: "2 Điểm", value: 2 },
          { label: "3 Điểm", value: 3 },
          { label: "4 Điểm", value: 4 },
        ];
        break;
      case "selector":
        const coreStats = [
          { key: "pac", name: "Pace (PAC)" },
          { key: "sho", name: "Shooting (SHO)" },
          { key: "pas", name: "Passing (PAS)" },
          { key: "dri", name: "Dribbling (DRI)" },
          { key: "def", name: "Defending (DEF)" },
          { key: "phy", name: "Physical (PHY)" },
        ];
        const currentSelectedList = selectorIndex === 0 ? [] : selectedStatsList;
        const available = coreStats.filter(c => !currentSelectedList.includes(c.key));
        items = available.map(c => ({
          value: c.key,
          label: c.name.toUpperCase(),
        }));
        break;
      case "standing":
        const standingPool = getStandingWheelPool(currentClub?.prestige ?? 3, currentOvr, leagueSize, yearSimResult?.apps ?? 38);
        items = standingPool.map((x) => ({
          label: x.value === 1 ? "🏆 VÔ ĐỊCH (HẠNG 1)" : x.value === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG ${x.value}`,
          value: x.value,
        }));
        break;
      case "domestic_cup":
        items = [
          { label: "Vô Địch Cup", value: "Winner" },
          { label: "Á Quân Cup", value: "Runner-Up" },
          { label: "Vào Bán Kết", value: "Semi-Finals" },
          { label: "Bị Loại Sớm", value: "Early Exit" },
        ];
        break;
      case "continental_cup":
        const nameLabel = getContinentalCupLabel(currentContinentalCup);
        items = [
          { label: `Vô Địch ${nameLabel}`, value: "Winner" },
          { label: `Á Quân ${nameLabel}`, value: "Runner-Up" },
          { label: `Bán Kết ${nameLabel}`, value: "Semi-Finals" },
          { label: `Vòng Bảng ${nameLabel}`, value: "Group Stage" },
        ];
        break;
      case "national_callup":
        items = [
          { label: `Được Triệu Tập Lên ĐTQG`, value: "called_up" },
          { label: `Không Được Gọi`, value: "missed" },
        ];
        break;
      case "national_tournament":
        const nationCupName = getNationalContinentalCup(playerNationality);
        const tourneyName = currentAge % 4 === 0 ? "FIFA World Cup" : nationCupName;
        items = [
          { label: `Vô Địch ${tourneyName} 🏆`, value: "Winner" },
          { label: `Á Quân ${tourneyName}`, value: "Runner-Up" },
          { label: `Bán Kết ${tourneyName}`, value: "Semi-Finals" },
          { label: `Vòng Bảng ${tourneyName}`, value: "Group Stage" },
        ];
    }
    setCareerWheelItems(items);
  }, [careerSubStep, isMounted, mode, currentContinentalCup, currentAge, playerNationality, currentClub, currentOvr, leagueSize, selectedStatsList, position, yearSimResult, selectorIndex]);

  // ── SETUP WHEELS SPIN RESOLVER ──
  function handleSetupSpin() {
    if (isSpinning || activeStep >= 11 || wheelItems.length === 0) return;

    let result: any = null;
    let idx = -1;

    switch (activeStep) {
      case 0:
        result = resolveWeightedOutcome(NATIONALITY_POOL);
        idx = NATIONALITY_POOL.findIndex((x) => x.value === result);
        setTempValue(`${getFlagEmoji(result)} ${result}`);
        break;
      case 1:
        result = resolveWeightedOutcome(DEBUT_AGE_POOL);
        idx = DEBUT_AGE_POOL.findIndex((x) => x.value === result);
        setTempValue(`${result} Tuổi`);
        break;
      case 2:
        const pacWeights = getDebutStatWeights(position, "pac");
        result = resolveWeightedOutcome(pacWeights);
        idx = pacWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      case 3:
        const shoWeights = getDebutStatWeights(position, "sho");
        result = resolveWeightedOutcome(shoWeights);
        idx = shoWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      case 4:
        const pasWeights = getDebutStatWeights(position, "pas");
        result = resolveWeightedOutcome(pasWeights);
        idx = pasWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      case 5:
        const driWeights = getDebutStatWeights(position, "dri");
        result = resolveWeightedOutcome(driWeights);
        idx = driWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      case 6:
        const defWeights = getDebutStatWeights(position, "def");
        result = resolveWeightedOutcome(defWeights);
        idx = defWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      case 7:
        const phyWeights = getDebutStatWeights(position, "phy");
        result = resolveWeightedOutcome(phyWeights);
        idx = phyWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      case 8:
        result = resolveWeightedOutcome(CAREER_LENGTH_POOL);
        idx = CAREER_LENGTH_POOL.findIndex((x) => x.value === result);
        setTempValue(`${result} Năm`);
        break;
      case 9:
        const leagueWeights = getLeagueWeights(leagues);
        result = resolveWeightedOutcome(leagueWeights);
        idx = leagueWeights.findIndex((x) => x.value.id === result.id);
        setTempValue(result.name);
        break;
      case 10:
        if (filteredClubs.length === 0) {
          result = { id: "", name: "Không có CLB", prestige: 3, continentalType: "none" };
          idx = 0;
        } else {
          const clubWeights = getClubWeights(filteredClubs);
          result = resolveWeightedOutcome(clubWeights);
          idx = clubWeights.findIndex((x) => x.value.id === result.id);
          const fullClub = filteredClubs.find((c) => c.id === result.id);
          if (fullClub) {
            result = { id: fullClub.id, name: fullClub.name, prestige: fullClub.prestige, continentalType: fullClub.continentalType };
          }
        }
        setTempValue(result.name);
        break;
    }

    setTargetIndex(idx);
    startSpin();
    (window as any)._tempDraftResult = result;
  }

  function handleSetupSpinComplete() {
    const result = (window as any)._tempDraftResult;
    resolveStep(activeStep, result, position);
    setStep(activeStep + 1);
    setTargetIndex(-1);
    setTempValue(null);
  }

  // ── KHỞI KHỞI ĐẦU SỰ NGHIỆP ──
  function handleStartCareer() {
    const generatedName = generateFictionalName(draftData.nationality!);
    const luckRating = Math.floor(Math.random() * 20) + 1;
    const professionalism = Math.floor(Math.random() * 20) + 1;
    const personalityPool = ["Loyal", "Professional", "Ambitious", "Mercenary", "Temperamental", "Normal"];
    const personality = personalityPool[Math.floor(Math.random() * professionalism) % personalityPool.length];
    const generatedHiddenStats = { luckRating, professionalism, personality };

    const initStint = {
      clubId: draftData.clubId!,
      clubName: draftData.clubName!,
      leagueId: draftData.leagueId!,
      leagueName: draftData.leagueName!,
      startAge: draftData.debutAge!,
      endAge: draftData.debutAge!,
      yearsAtClub: 1,
      ovrAtJoining: draftData.debutOvr!,
      ovrAtLeaving: draftData.debutOvr!,
    };

    const initEvent = {
      type: "DEBUT",
      label: `Ký Hợp Đồng chuyên nghiệp đầu tiên tại CLB ${draftData.clubName} (${draftData.leagueName}) ở mùa giải 2025/26 (tuổi ${draftData.debutAge}).`,
      age: draftData.debutAge!,
      clubId: draftData.clubId!,
    };

    const initStats = {
      pac: draftData.pac!,
      sho: draftData.sho!,
      pas: draftData.pas!,
      dri: draftData.dri!,
      def: draftData.def!,
      phy: draftData.phy!,
    };

    const initTimeline = [
      {
        age: draftData.debutAge!,
        ovr: draftData.debutOvr!,
        ...initStats
      }
    ];

    setPlayerName(generatedName);
    setHiddenStats(generatedHiddenStats);
    setClubStints([initStint]);
    setEvents([initEvent]);
    setStatsTimeline(initTimeline);
    setCurrentAge(draftData.debutAge!);
    setCurrentOvr(draftData.debutOvr!);
    setCurrentStats(initStats);

    const fullClub = clubs.find((c) => c.id === draftData.clubId);
    const selectedClub = {
      id: draftData.clubId!,
      name: draftData.clubName!,
      leagueId: draftData.leagueId!,
      leagueName: draftData.leagueName!,
      prestige: fullClub?.prestige ?? 3,
      continentalType: fullClub?.continentalType ?? "none",
    };
    setCurrentClub(selectedClub);

    setPlayerNationality(draftData.nationality!);
    setPlayerDebutAge(draftData.debutAge!);
    setPlayerCareerLength(draftData.careerLength!);

    setCurrentContinentalCup(selectedClub.continentalType);
    setLastYearStanding(10);

    // Reset sạch sẽ tất cả state của mùa giải cũ (hoặc từ slot cũ bị dính cache)
    setSeasonRecords({});
    setSelectedAgeForStats(draftData.debutAge!);
    setYearEvolution({ direction: null, count: null });
    setSelectorIndex(0);
    setSelectedStatsList([]);
    setTempSelectedStat(null);
    setEvolvedStatsThisYear([]);
    setStandingResult(null);
    setDomesticCupResult(null);
    setContinentalCupResult(null);
    setNationalCallupResult(null);
    setNationalTournamentResult(null);
    setYearSimResult(null);
    setTransferOffer(null);
    setHasBallonDorWinner(false);

    setMode("career");
    setCareerSubStep("idle");
  }

  function handleStartSeason() {
    const luck = hiddenStats?.luckRating ?? 10;
    const prestige = currentClub?.prestige ?? 3;

    const simRes = simulatePlayerSeason({
      age: currentAge,
      ovr: currentOvr,
      position,
      luckRating: luck,
      clubPrestige: prestige,
      clubName: currentClub.name,
      leagueName: currentClub.leagueName,
    });
    setYearSimResult(simRes);

    let isBallonDor = false;
    if (currentOvr >= 85 && simRes.matchRating >= 7.80) {
      isBallonDor = Math.random() < 0.35;
      setHasBallonDorWinner(isBallonDor);
    } else {
      setHasBallonDorWinner(false);
    }

    setSelectorIndex(0);
    setSelectedStatsList([]);
    setTempSelectedStat(null);
    setEvolvedStatsThisYear([]);

    setCareerSubStep("standing");
  }

  // ── CAREER LOOPS SPIN RESOLVER ──
  function handleCareerSpin() {
    if (careerSpinning || careerSubStep === "idle" || careerSubStep === "resolved" || careerWheelItems.length === 0) return;

    let result: any = null;
    let idx = -1;

    if (careerSubStep === "direction") {
      let incW = 30;
      let decW = 10;
      let maiW = 35;

      if (currentAge <= 22) {
        incW += 35; decW -= 8;
      } else if (currentAge >= 30) {
        incW -= 25; decW += 30;
      }

      if (yearSimResult) {
        if (yearSimResult.matchRating >= 7.50) {
          incW += 25; decW -= 8;
        } else if (yearSimResult.matchRating <= 6.30) {
          incW -= 25; decW += 25;
        }
      }

      const pool = [
        { value: "increase", weight: Math.max(2, incW) },
        { value: "decrease", weight: Math.max(2, decW) },
        { value: "maintain", weight: Math.max(2, maiW) },
      ];
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      setCareerTempValue(result === "increase" ? "Tăng (+)" : result === "decrease" ? "Giảm (-)" : "Giữ Nguyên");
    }
    else if (careerSubStep === "count") {
      const pool = [
        { value: 1, weight: 45 },
        { value: 2, weight: 35 },
        { value: 3, weight: 15 },
        { value: 4, weight: 5 },
      ];
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      setCareerTempValue(`${result} Chỉ Số`);
    }
    else if (careerSubStep === "selector") {
      const coreStats = [
        { key: "pac", name: "Pace (PAC)" },
        { key: "sho", name: "Shooting (SHO)" },
        { key: "pas", name: "Passing (PAS)" },
        { key: "dri", name: "Dribbling (DRI)" },
        { key: "def", name: "Defending (DEF)" },
        { key: "phy", name: "Physical (PHY)" },
      ];
      const currentSelectedList = selectorIndex === 0 ? [] : selectedStatsList;
      const available = coreStats.filter(c => !currentSelectedList.includes(c.key));
      const pool = available.map(c => {
        let w = 10;
        if (["ST", "LW", "RW"].includes(position)) {
          if (["sho", "pac", "dri"].includes(c.key)) w = 25;
        } else if (["CB", "LB", "RB", "GK"].includes(position)) {
          if (["def", "phy"].includes(c.key)) w = 25;
        } else {
          if (["pas", "dri"].includes(c.key)) w = 25;
        }
        return {
          value: c.key,
          label: c.name.toUpperCase(),
          weight: w,
        };
      });
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      const matchedName = coreStats.find(c => c.key === result)?.name ?? result;
      setCareerTempValue(matchedName.toUpperCase());
    }
    else if (careerSubStep === "magnitude") {
      const rating = yearSimResult?.matchRating ?? 7.0;
      const isInc = yearEvolution.direction === "increase";
      
      let pool = [];
      if (isInc) {
        if (rating >= 7.60) {
          pool = [
            { value: 1, weight: 7 },
            { value: 2, weight: 18 },
            { value: 3, weight: 35 },
            { value: 4, weight: 40 },
          ];
        } else if (rating >= 6.80) {
          pool = [
            { value: 1, weight: 20 },
            { value: 2, weight: 45 },
            { value: 3, weight: 30 },
            { value: 4, weight: 5 },
          ];
        } else {
          pool = [
            { value: 1, weight: 60 },
            { value: 2, weight: 30 },
            { value: 3, weight: 8 },
            { value: 4, weight: 2 },
          ];
        }
      } else {
        if (rating <= 6.20) {
          pool = [
            { value: 1, weight: 7 },
            { value: 2, weight: 18 },
            { value: 3, weight: 35 },
            { value: 4, weight: 40 },
          ];
        } else if (rating < 6.80) {
          pool = [
            { value: 1, weight: 30 },
            { value: 2, weight: 45 },
            { value: 3, weight: 20 },
            { value: 4, weight: 5 },
          ];
        } else {
          pool = [
            { value: 1, weight: 65 },
            { value: 2, weight: 25 },
            { value: 3, weight: 8 },
            { value: 4, weight: 2 },
          ];
        }
      }
      
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      setCareerTempValue(`${isInc ? "+" : "-"}${result} Điểm`);
    }
    else if (careerSubStep === "standing") {
      const standingPool = getStandingWheelPool(currentClub?.prestige ?? 3, currentOvr, leagueSize, yearSimResult?.apps ?? 38);
      result = resolveWeightedOutcome(standingPool);
      idx = standingPool.findIndex((x) => x.value === result);
      setCareerTempValue(result === 1 ? "🏆 VÔ ĐỊCH! (HẠNG 1)" : result === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG #${result}`);
    }
    else if (careerSubStep === "domestic_cup") {
      const prestige = currentClub?.prestige ?? 3;
      const luck = hiddenStats?.luckRating ?? 10;

      const wWin = 5 + prestige * 3 + Math.floor(luck / 4);
      const wRun = 8 + prestige * 3;
      const wSemi = 15 + prestige * 2;
      const wExit = Math.max(10, 72 - prestige * 8);

      const pool = [
        { value: "Winner", weight: wWin },
        { value: "Runner-Up", weight: wRun },
        { value: "Semi-Finals", weight: wSemi },
        { value: "Early Exit", weight: wExit },
      ];
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      setCareerTempValue(result === "Winner" ? "Vô Địch Cup 🏆" : result === "Runner-Up" ? "Á Quân Cup" : result === "Semi-Finals" ? "Bán Kết" : "Bị Loại Sớm");
    }
    else if (careerSubStep === "continental_cup") {
      const prestige = currentClub?.prestige ?? 3;
      const luck = hiddenStats?.luckRating ?? 10;

      const wWin = 3 + prestige * 3 + Math.floor(luck / 4);
      const wRun = 7 + prestige * 2;
      const wSemi = 15 + prestige * 2;
      const wGroup = Math.max(10, 75 - prestige * 7);

      const pool = [
        { value: "Winner", weight: wWin },
        { value: "Runner-Up", weight: wRun },
        { value: "Semi-Finals", weight: wSemi },
        { value: "Group Stage", weight: wGroup },
      ];
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      
      const cupLabel = getContinentalCupLabel(currentContinentalCup);
      setCareerTempValue(result === "Winner" ? `Vô Địch ${cupLabel} 🏆` : result === "Runner-Up" ? `Á Quân ${cupLabel}` : result === "Semi-Finals" ? `Bán Kết ${cupLabel}` : `Vòng Bảng ${cupLabel}`);
    }
    else if (careerSubStep === "national_callup") {
      const tier = getNationalTier(playerNationality);
      const threshold = tier === 1 ? 80 : tier === 2 ? 75 : 70;
      
      let wCall = 50, wMiss = 50;
      if (currentOvr >= threshold + 5) {
        wCall = 85; wMiss = 15;
      }
      if (yearSimResult) {
        if (yearSimResult.matchRating >= 7.40) wCall += 20;
        else if (yearSimResult.matchRating <= 6.50) wCall -= 35;
      }

      const pool = [
        { value: "called_up", weight: Math.max(5, wCall) },
        { value: "missed", weight: Math.max(5, wMiss) },
      ];
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      setCareerTempValue(result === "called_up" ? "ĐƯỢC TRIỆU TẬP ĐTQG! 🇸🇬" : "Không được gọi");
    }
    else if (careerSubStep === "national_tournament") {
      const luck = hiddenStats?.luckRating ?? 10;
      const ovr = currentOvr;

      const wWin = 3 + Math.floor(luck / 4) + Math.floor((ovr - 70) * 0.2);
      const wRun = 7 + Math.floor((ovr - 70) * 0.2);
      const wSemi = 20;
      const wGroup = Math.max(10, 70 - Math.floor((ovr - 70) * 0.4));

      const pool = [
        { value: "Winner", weight: Math.max(1, wWin) },
        { value: "Runner-Up", weight: Math.max(1, wRun) },
        { value: "Semi-Finals", weight: wSemi },
        { value: "Group Stage", weight: wGroup },
      ];
      result = resolveWeightedOutcome(pool);
      idx = pool.findIndex((x) => x.value === result);
      
      const nationCup = getNationalContinentalCup(playerNationality);
      const tourney = currentAge % 4 === 0 ? "FIFA World Cup" : nationCup;
      setCareerTempValue(result === "Winner" ? `VÔ ĐỊCH ${tourney}! 🏆` : result === "Runner-Up" ? `Á Quân ${tourney}` : result === "Semi-Finals" ? `Bán Kết ${tourney}` : `Vòng Bảng ${tourney}`);
    }

    setCareerTargetIndex(idx);
    setCareerSpinning(true);
    (window as any)._tempCareerResult = result;
  }

  // ── CAREER LOOPS SPIN COMPLETE ──
  function handleCareerSpinComplete() {
    const result = (window as any)._tempCareerResult;
    setCareerSpinning(false);
    setCareerTargetIndex(-1);
    setCareerTempValue(null);

    if (careerSubStep === "direction") {
      setYearEvolution((prev) => ({ ...prev, direction: result }));
      if (result === "maintain") {
        checkTransferOfferTransition();
      } else {
        setCareerSubStep("count");
      }
    } 
    else if (careerSubStep === "count") {
      setYearEvolution((prev) => ({ ...prev, count: result }));
      setSelectorIndex(0);
      setSelectedStatsList([]);
      setTempSelectedStat(null);
      setCareerSubStep("selector");
    }
    else if (careerSubStep === "selector") {
      setTempSelectedStat(result);
      setSelectedStatsList((prev) => [...prev, result]);
      setCareerSubStep("magnitude");
    }
    else if (careerSubStep === "magnitude") {
      const delta = yearEvolution.direction === "increase" ? result : -result;
      applySingleStatEvolution(tempSelectedStat!, delta);

      const nextIdx = selectorIndex + 1;
      const totalNeed = yearEvolution.count ?? 1;

      if (nextIdx < totalNeed) {
        setSelectorIndex(nextIdx);
        setTempSelectedStat(null);
        setCareerSubStep("selector");
      } else {
        checkTransferOfferTransition();
      }
    }
    else if (careerSubStep === "standing") {
      setStandingResult(result);
      
      const mockTable = generateMockLeagueTable(result, currentClub.name, currentLeagueClubs);
      setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        rec.standing = result;
        rec.leagueTable = mockTable;
        return { ...prev, [currentAge]: rec };
      });

      setIsLeagueOpen(true);
      setCareerSubStep("domestic_cup");
    }
    else if (careerSubStep === "domestic_cup") {
      setDomesticCupResult(result);
      
      const journey = generateDomesticCupJourney(result);
      setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        rec.domesticCup = result;
        rec.domesticCupJourney = journey;
        return { ...prev, [currentAge]: rec };
      });

      setIsCupOpen(true);

      if (currentContinentalCup !== "none") {
        setCareerSubStep("continental_cup");
      } else {
        checkNationalCallupTransition();
      }
    }
    else if (careerSubStep === "continental_cup") {
      setContinentalCupResult(result);

      const cupLabel = getContinentalCupLabel(currentContinentalCup);
      const journey = generateContinentalCupJourney(result, cupLabel);
      setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        if (rec.continentalCup) {
          rec.continentalCup.result = result;
        }
        rec.continentalCupJourney = journey;
        return { ...prev, [currentAge]: rec };
      });

      setIsContinentalOpen(true);
      checkNationalCallupTransition();
    }
    else if (careerSubStep === "national_callup") {
      setNationalCallupResult(result);

      setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        if (rec.nationalTeam) rec.nationalTeam.callup = result === "called_up" ? "Được triệu tập" : "Không được gọi";
        return { ...prev, [currentAge]: rec };
      });

      if (result === "called_up") {
        setCareerSubStep("national_tournament");
      } else {
        setCareerSubStep("direction");
      }
    }
    else if (careerSubStep === "national_tournament") {
      setNationalTournamentResult(result);

      const nationCup = getNationalContinentalCup(playerNationality);
      const tourney = currentAge % 4 === 0 ? "FIFA World Cup" : nationCup;
      const journey = generateNationalTeamJourney(result, tourney);
      setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        if (rec.nationalTeam) rec.nationalTeam.result = result;
        rec.nationalTeamJourney = journey;
        return { ...prev, [currentAge]: rec };
      });

      setIsNationalOpen(true);
      setCareerSubStep("direction");
    }
  }

  // ── TIẾN HÀNH TIẾN HÓA STATS CÁ NHÂN THEO TỪNG STAT KEY ──
  function applySingleStatEvolution(statKey: string, delta: number) {
    const nextStats = { ...currentStats };
    nextStats[statKey] = Math.min(99, Math.max(10, nextStats[statKey] + delta));

    const nextOvr = calculateOvrByPosition(position, nextStats as any);

    setCurrentStats(nextStats);
    setCurrentOvr(nextOvr);
    setEvolvedStatsThisYear((prev) => [...prev, { stat: statKey, delta }]);
  }

  // ── ĐIỀU HƯỚNG TỚI ĐTQG VÀ TIẾN TIẾP TỚI STATS CÁ NHÂN ──
  function checkNationalCallupTransition() {
    if (currentAge % 2 === 0) {
      const tier = getNationalTier(playerNationality);
      const threshold = tier === 1 ? 80 : tier === 2 ? 75 : 70;

      if (currentOvr >= threshold) {
        setCareerSubStep("national_callup");
        return;
      } else {
        setSeasonRecords((prev) => {
          const rec = { ...prev[currentAge] };
          if (rec.nationalTeam) rec.nationalTeam.callup = "Không đủ OVR triệu tập";
          return { ...prev, [currentAge]: rec };
        });
      }
    }
    setCareerSubStep("direction");
  }

  // ── KIỂM TRA LỜI MỜI CHUYỂN NHƯỢNG ──
  function checkTransferOfferTransition() {
    if (Math.random() < 0.30) {
      const eligibleClubs = clubs.filter((c) => c.id !== currentClub.id);
      if (eligibleClubs.length > 0) {
        const randomClub = eligibleClubs[Math.floor(Math.random() * eligibleClubs.length)];
        const league = leagues.find((l) => l.id === randomClub.leagueId);
        setTransferOffer({
          clubId: randomClub.id,
          clubName: randomClub.name,
          leagueId: randomClub.leagueId,
          leagueName: league?.name ?? "Giải Vô Địch",
        });
        setCareerSubStep("transfer");
        return;
      }
    }
    setCareerSubStep("resolved");
  }

  // ── CHẤP NHẬN TRANSFER OFFER ──
  function handleAcceptTransfer(accept: boolean) {
    if (accept && transferOffer) {
      setClubStints((prevStints) => {
        const updated = [...prevStints];
        const last = { ...updated[updated.length - 1] };
        last.endAge = currentAge;
        last.yearsAtClub = last.endAge - last.startAge + 1;
        last.ovrAtLeaving = currentOvr;
        updated[updated.length - 1] = last;

        updated.push({
          clubId: transferOffer.clubId,
          clubName: transferOffer.clubName,
          leagueId: transferOffer.leagueId,
          leagueName: transferOffer.leagueName,
          startAge: currentAge + 1,
          endAge: currentAge + 1,
          yearsAtClub: 1,
          ovrAtJoining: currentOvr,
          ovrAtLeaving: currentOvr,
        });

        return updated;
      });

      setEvents((prevEvents) => [
        ...prevEvents,
        {
          type: "TRANSFER",
          label: `✈️ Chuyển nhượng sang CLB ${transferOffer.clubName} (${transferOffer.leagueName}) ở mùa giải ${getSeasonYearString(currentAge + 1, playerDebutAge)} (tuổi ${currentAge + 1}).`,
          age: currentAge,
          clubId: transferOffer.clubId,
        }
      ]);

      const fullClub = clubs.find((c) => c.id === transferOffer.clubId);
      setCurrentClub({
        id: transferOffer.clubId,
        name: transferOffer.clubName,
        leagueId: transferOffer.leagueId,
        leagueName: transferOffer.leagueName,
        prestige: fullClub?.prestige ?? 3,
        continentalType: fullClub?.continentalType ?? "none",
      });
    }

    setTransferOffer(null);
    setCareerSubStep("resolved");
  }

  // ── KẾT THÚC NĂM THI ĐẤU ──
  function handleNextSeason() {
    const nextAge = currentAge + 1;
    const latestStint = clubStints[clubStints.length - 1];
    const currentSeasonStr = getSeasonYearString(currentAge, playerDebutAge);

    if (standingResult !== null) {
      setEvents((prev) => [
        ...prev,
        {
          type: "standing",
          label: `Đứng hạng ${standingResult} giải đấu ${currentClub.leagueName} cùng CLB ${currentClub.name} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
          clubId: latestStint.clubId,
        }
      ]);
      if (standingResult === 1) {
        setEvents((prev) => [
          ...prev,
          {
            type: "trophy",
            label: `🏆 Vô Địch giải đấu vô địch quốc gia cùng CLB ${currentClub.name} ở mùa giải ${currentSeasonStr}!`,
            age: currentAge,
            clubId: latestStint.clubId,
          }
        ]);
      }
    }

    if (domesticCupResult !== null && domesticCupResult !== "Early Exit") {
      setEvents((prev) => [
        ...prev,
        {
          type: "cup",
          label: `${domesticCupResult === "Winner" ? "🏆 Vô Địch" : domesticCupResult === "Runner-Up" ? "Á Quân" : "Bán Kết"} Cup Quốc Gia cùng CLB ${currentClub.name} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
          clubId: latestStint.clubId,
        }
      ]);
    }

    if (continentalCupResult !== null && currentContinentalCup !== "none") {
      const cupLabel = getContinentalCupLabel(currentContinentalCup);
      setEvents((prev) => [
        ...prev,
        {
          type: "continental_cup",
          label: `${continentalCupResult === "Winner" ? `🏆 Vô Địch ${cupLabel} 🏆` : continentalCupResult === "Runner-Up" ? `Á Quân ${cupLabel}` : continentalCupResult === "Semi-Finals" ? `Bán Kết ${cupLabel}` : `Tham dự Vòng Bảng ${cupLabel}`} cùng CLB ${currentClub.name} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
          clubId: latestStint.clubId,
        }
      ]);
    }

    if (nationalCallupResult === "called_up" && nationalTournamentResult) {
      const nationCup = getNationalContinentalCup(playerNationality);
      const tourney = currentAge % 4 === 0 ? "FIFA World Cup" : nationCup;

      setEvents((prev) => [
        ...prev,
        {
          type: "national_team",
          label: `${nationalTournamentResult === "Winner" ? `🏆 VÔ ĐỊCH ${tourney.toUpperCase()} cùng ĐTQG! 🏆` : nationalTournamentResult === "Runner-Up" ? `Á Quân ${tourney} cùng ĐTQG` : `Đồng hành tới ${nationalTournamentResult} ${tourney} cùng ĐTQG`} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
        }
      ]);
    }

    if (yearSimResult) {
      setEvents((prev) => [
        ...prev,
        {
          type: "PERFORMANCE",
          label: `Thống kê cá nhân mùa giải ${currentSeasonStr}: Ra sân ${yearSimResult.apps} trận, ghi ${yearSimResult.goals} bàn, ${yearSimResult.assists} kiến tạo. Rating: ${yearSimResult.matchRating}.`,
          age: currentAge,
          clubId: latestStint.clubId,
        }
      ]);

      yearSimResult.events.forEach((ev) => {
        setEvents((prev) => [
          ...prev,
          {
            type: ev.type,
            label: `${ev.label} (Mùa giải ${currentSeasonStr})`,
            age: currentAge,
            clubId: latestStint.clubId,
          }
        ]);
      });
    }

    if (hasBallonDorWinner) {
      setEvents((prev) => [
        ...prev,
        {
          type: "individual_award",
          label: `🏆 ĐOẠT QUẢ BÓNG VÀNG BALLON D'OR DANH GIÁ ở mùa giải ${currentSeasonStr}! 🏆`,
          age: currentAge,
        }
      ]);
    }

    if (standingResult !== null) {
      const nextYearCup = calculateContinentalQualification(currentClub.leagueId, standingResult);
      setCurrentContinentalCup(nextYearCup);
      setLastYearStanding(standingResult);
    }

    setStatsTimeline((prev) => [
      ...prev,
      {
        age: nextAge,
        ovr: currentOvr,
        ...currentStats
      }
    ]);

    setClubStints((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.endAge = nextAge;
      last.yearsAtClub = nextAge - last.startAge + 1;
      last.ovrAtLeaving = currentOvr;
      updated[updated.length - 1] = last;
      return updated;
    });

    const retireAge = playerDebutAge + playerCareerLength;
    if (nextAge >= retireAge) {
      setMode("retired");
    } else {
      setCurrentAge(nextAge);
      setCareerSubStep("idle");
      setYearEvolution({ direction: null, count: null });
      setStandingResult(null);
      setDomesticCupResult(null);
      setContinentalCupResult(null);
      setNationalCallupResult(null);
      setNationalTournamentResult(null);
      setYearSimResult(null);
      setHasBallonDorWinner(false);
      
      setSelectorIndex(0);
      setSelectedStatsList([]);
      setTempSelectedStat(null);
      setEvolvedStatsThisYear([]);
      
      setIsLeagueOpen(false);
      setIsCupOpen(false);
      setIsContinentalOpen(false);
      setIsNationalOpen(false);
    }
  }

  // ── SAVE PLAYER ──
  async function handleSavePlayer() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const peakOvr = Math.max(...statsTimeline.map((s) => s.ovr));
      const retireAge = playerDebutAge + playerCareerLength;

      const finalEvents = [
        ...events,
        {
          type: "RETIREMENT",
          label: `🏁 Giải nghệ bóng đá chuyên nghiệp ở tuổi ${retireAge} tại CLB ${currentClub.name} ở mùa giải ${getSeasonYearString(retireAge, playerDebutAge)}.`,
          age: retireAge,
          clubId: currentClub.id,
        }
      ];

      await saveCareerPlayer({
        gameId,
        slotIndex,
        position,
        name: playerName,
        nationality: playerNationality,
        debutAge: playerDebutAge,
        retireAge,
        careerLength: playerCareerLength,
        peakOvr,
        statsTimeline,
        clubStints,
        events: finalEvents,
        hiddenStats,
      });
    } catch (err) {
      console.error("Save player error:", err);
      setIsSaving(false);
    }
  }

  const retirementAge = playerDebutAge + playerCareerLength;
  
  const careerTotalStats = useMemo(() => {
    let apps = 0;
    let goals = 0;
    let assists = 0;
    events.forEach((ev) => {
      if (ev.type === "PERFORMANCE") {
        const appsMatch = ev.label.match(/Ra sân (\d+) trận/);
        const goalsMatch = ev.label.match(/ghi (\d+) bàn/);
        const assistsMatch = ev.label.match(/(\d+) kiến tạo/);

        if (appsMatch) apps += parseInt(appsMatch[1], 10);
        if (goalsMatch) goals += parseInt(goalsMatch[1], 10);
        if (assistsMatch) assists += parseInt(assistsMatch[1], 10);
      }
    });
    return { apps, goals, assists };
  }, [events]);

  const peakOvrValue = useMemo(() => {
    if (statsTimeline.length === 0) return currentOvr;
    return Math.max(...statsTimeline.map((s) => s.ovr));
  }, [statsTimeline, currentOvr]);

  const activeRecord = useMemo(() => {
    return seasonRecords[selectedAgeForStats] || null;
  }, [seasonRecords, selectedAgeForStats]);

  if (!isMounted) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.018) 28px, rgba(0,0,0,0.018) 29px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ── */}
      <header style={{ borderBottom: "3px solid var(--charcoal)", backgroundColor: "var(--cream)", padding: "12px 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href={`/${gameId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--font-headline)",
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--charcoal)",
                textDecoration: "none",
                border: "2px solid var(--charcoal)",
                padding: "6px 12px",
                borderRadius: "3px",
                backgroundColor: "var(--white)",
                boxShadow: "2px 2px 0 var(--charcoal)",
              }}
            >
              <ArrowLeft size={14} />
              Đội Hình
            </Link>
            
            <div style={{ height: "24px", width: "1px", backgroundColor: "var(--cream-border)" }} />
            
            <div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--charcoal)" }}>
                {mode === "setup" ? "Ký Hợp Đồng Cầu Thủ" : mode === "career" ? "Sự nghiệp đang thi đấu" : "Sự nghiệp hoàn thành"}
              </div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>
                Vị Trí: {position} · Slot {slotIndex + 1}
              </div>
            </div>
          </div>

          <div style={{
            fontFamily: "var(--font-stamp)",
            fontSize: "0.6rem",
            color: "var(--ink-light)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            {mode === "setup" ? "1. GIAI ĐOẠN SETUP" : mode === "career" ? "2. GIAI ĐOẠN THI ĐẤU" : "3. GIẢI NGHỆ"}
          </div>
        </div>
      </header>

      {/* ── MODE 1: SETUP WHEELS ── */}
      {mode === "setup" && (
        <main style={{ flex: 1, maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "40px", alignItems: "flex-start", justifyContent: "center" }}>
            
            {/* CỘT TRÁI: VÒNG QUAY SETUP */}
            <div style={{ flex: "1 1 500px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", border: "2px solid var(--charcoal)", borderRadius: "4px", backgroundColor: "var(--white)", boxShadow: "2px 2px 0 var(--charcoal)", padding: "10px 12px", gap: "4px" }}>
                {STEP_LABELS.map((label, idx) => {
                  const isCurrent = idx === activeStep;
                  const isCompleted = idx < activeStep;
                  return (
                    <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", opacity: isCurrent ? 1 : isCompleted ? 0.75 : 0.4, flex: 1, textAlign: "center" }}>
                      <span style={{
                        width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid var(--charcoal)",
                        backgroundColor: isCurrent ? "var(--coral)" : isCompleted ? "var(--charcoal)" : "var(--white)",
                        color: isCurrent || isCompleted ? "var(--white)" : "var(--charcoal)",
                        fontFamily: "var(--font-headline)", fontSize: "0.62rem", fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                    {activeStep < 11 ? `VÒNG QUAY SỐ ${activeStep + 1} / 11` : "HOÀN TẤT VÒNG QUAY SETUP"}
                  </p>
                  <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", margin: 0 }}>
                    {activeStep < 11 ? STEP_LABELS[activeStep] : "BẮT ĐẦU SỰ NGHIỆP CẦU THỦ"}
                  </h3>
                </div>

                {activeStep < 11 ? (
                  <>
                    <SpinnerWheel
                      isSpinning={isSpinning}
                      items={wheelItems}
                      targetIndex={targetIndex}
                      onSpinComplete={handleSetupSpinComplete}
                    />
                    {tempValue !== null && !isSpinning && (
                      <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.35rem", fontWeight: 700, color: "var(--charcoal)", border: "2px solid var(--charcoal)", padding: "6px 20px", backgroundColor: "var(--cream)", boxShadow: "2px 2px 0 var(--charcoal)", borderRadius: "3px", textTransform: "uppercase" }}>
                        {tempValue}
                      </div>
                    )}
                    <button type="button" onClick={handleSetupSpin} disabled={isSpinning} className="btn-primary" style={{ fontSize: "1.1rem", padding: "14px 48px", opacity: isSpinning ? 0.6 : 1, cursor: isSpinning ? "not-allowed" : "pointer" }}>
                      <Dices size={18} /> BẮT ĐẦU QUAY
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={handleStartCareer} className="btn-primary" style={{ fontSize: "1.2rem", padding: "16px 48px", backgroundColor: "var(--coral)", color: "var(--white)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={20} /> BẮT ĐẦU SỰ NGHIỆP CỦA BẠN
                  </button>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: STICKER PANINI SETUP PREVIEW */}
            <div style={{ flex: "0 0 380px", width: "380px", display: "flex", flexDirection: "column", gap: "18px", margin: "0 auto" }}>
              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "16px", display: "flex", flexDirection: "column", aspectRatio: "2 / 3", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "6px", marginBottom: "12px" }}>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)", letterSpacing: "0.08em", textTransform: "uppercase" }}>RTG SETUP WHEELS</span>
                  <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.68rem", fontWeight: 700, color: "var(--coral)", textTransform: "uppercase" }}>{position}</span>
                </div>

                <div style={{ flex: "1 1 auto", backgroundColor: "var(--cream-dark)", border: "2px dashed var(--cream-border)", borderRadius: "3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", marginBottom: "12px", position: "relative" }}>
                  {draftData.nationality && (
                    <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "1.75rem" }}>{getFlagEmoji(draftData.nationality)}</div>
                  )}
                  {draftData.debutOvr && (
                    <div style={{ position: "absolute", bottom: "10px", left: "10px", fontFamily: "var(--font-headline)", fontSize: "2rem", fontWeight: 700 }}>{draftData.debutOvr}</div>
                  )}
                  <div style={{ width: "66px", height: "80px", borderRadius: "50% 50% 0 0", backgroundColor: "var(--cream-border)" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Quốc Tịch</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{draftData.nationality ? draftData.nationality.toUpperCase() : "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Tuổi Debut</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{draftData.debutAge ? `${draftData.debutAge} TUỔI` : "—"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid var(--cream-border)", padding: "4px 0", textAlign: "center", backgroundColor: "var(--cream-dark)", borderRadius: "3px" }}>
                    {[
                      { label: "PAC", val: draftData.pac },
                      { label: "SHO", val: draftData.sho },
                      { label: "PAS", val: draftData.pas },
                      { label: "DRI", val: draftData.dri },
                      { label: "DEF", val: draftData.def },
                      { label: "PHY", val: draftData.phy },
                    ].map((st) => (
                      <div key={st.label} style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-gray)" }}>{st.label}</span>
                        <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.78rem", fontWeight: 700 }}>{st.val !== null ? st.val : "—"}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Thời Gian Sự Nghiệp</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{draftData.careerLength ? `${draftData.careerLength} Năm` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "2px" }}>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>CLB Đầu Tiên</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draftData.clubName ? draftData.clubName.toUpperCase() : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* ── MODE 2: CAREER PLAYING LOOP ── */}
      {mode === "career" && (
        <main style={{ flex: 1, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "24px", alignItems: "flex-start", justifyContent: "center" }}>
            
            {/* CỘT 1 (TRÁI): CAREER ACTIONS & LUCK-BASED WHEEL SPINS */}
            <div style={{ flex: "1 1 450px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                
                <div style={{ textAlign: "center", width: "100%" }}>
                  <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--coral)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    MÙA GIẢI {getSeasonYearString(currentAge, playerDebutAge)} (TUỔI {currentAge}) · CLB: {currentClub?.name}
                  </p>
                  <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", marginTop: "4px", margin: 0, lineHeight: 1.25 }}>
                    {careerSubStep === "idle" && "SẴN SÀNG KHỞI ĐỘNG MÙA GIẢI"}
                    {careerSubStep === "direction" && "Stats: Hướng OVR (+ / - / =)"}
                    {careerSubStep === "count" && "Stats: Số Lượng Stats Ảnh Hưởng"}
                    {careerSubStep === "selector" && `Stats: Chọn Chỉ Số Ảnh Hưởng (${selectorIndex + 1} / ${yearEvolution.count})`}
                    {careerSubStep === "magnitude" && `Stats: Biên Độ Cho ${tempSelectedStat?.toUpperCase()} (${selectorIndex + 1} / ${yearEvolution.count})`}
                    {careerSubStep === "standing" && "Giải đấu: Quay Bánh Xe Thứ Hạng (League Standing)"}
                    {careerSubStep === "domestic_cup" && "Cup: Quay Kết Quả Cup Quốc Gia"}
                    {careerSubStep === "continental_cup" && `Cup Lục Địa: ${getContinentalCupLabel(currentContinentalCup)}`}
                    {careerSubStep === "national_callup" && "ĐTQG: Quay Triệu Tập Tuyển"}
                    {careerSubStep === "national_tournament" && "ĐTQG: Vòng Quay Cup Quốc Tế"}
                    {careerSubStep === "transfer" && "Lời Mời Chuyển Nhượng"}
                    {careerSubStep === "resolved" && "Mùa giải đã hoàn thành"}
                  </h3>
                </div>

                {/* Idle Mode */}
                {careerSubStep === "idle" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                    {currentContinentalCup !== "none" && (
                      <div style={{ backgroundColor: "var(--cream-dark)", border: "1px solid var(--charcoal)", padding: "6px 16px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Globe size={14} color="var(--coral)" /> Đạt vé dự {getContinentalCupLabel(currentContinentalCup)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleStartSeason}
                      className="btn-primary"
                      style={{ fontSize: "1.1rem", padding: "14px 40px", backgroundColor: "var(--coral)" }}
                    >
                      TIẾN VÀO MÙA GIẢI
                    </button>
                  </div>
                )}

                {/* Wheels Spinner */}
                {["direction", "count", "selector", "magnitude", "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament"].includes(careerSubStep) && (
                  <>
                    <SpinnerWheel
                      isSpinning={careerSpinning}
                      items={careerWheelItems}
                      targetIndex={careerTargetIndex}
                      onSpinComplete={handleCareerSpinComplete}
                    />
                    {careerTempValue !== null && !careerSpinning && (
                      <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, border: "2px solid var(--charcoal)", padding: "6px 20px", backgroundColor: "var(--cream)", boxShadow: "2px 2px 0 var(--charcoal)", borderRadius: "3px", textTransform: "uppercase" }}>
                        {careerTempValue}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleCareerSpin}
                      disabled={careerSpinning}
                      className="btn-primary"
                      style={{ fontSize: "1.1rem", padding: "12px 36px", opacity: careerSpinning ? 0.6 : 1 }}
                    >
                      QUAY BÁNH XE
                    </button>
                  </>
                )}

                {/* Transfer offer */}
                {careerSubStep === "transfer" && transferOffer && (
                  <div style={{ width: "100%", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "20px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)", margin: 0 }}>
                      ĐỀ NGHỊ CHUYỂN NHƯỢNG TỪ {transferOffer.clubName}
                    </h4>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: 1.5, margin: 0 }}>
                      CLB <strong>{transferOffer.clubName}</strong> ({transferOffer.leagueName}) muốn ký hợp đồng với bạn. Bạn có đồng ý chuyển nhượng?
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button type="button" onClick={() => handleAcceptTransfer(true)} className="btn-primary" style={{ flex: 1, padding: "10px" }}>ĐỒNG Ý</button>
                      <button type="button" onClick={() => handleAcceptTransfer(false)} className="btn-secondary" style={{ flex: 1, padding: "10px" }}>TỪ CHỐI</button>
                    </div>
                  </div>
                )}

                {/* Resolved reporting */}
                {careerSubStep === "resolved" && yearSimResult && (
                  <div style={{ width: "100%", border: "1px dashed var(--charcoal)", borderRadius: "4px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ textAlign: "center", borderBottom: "1px solid var(--cream-border)", paddingBottom: "8px" }}>
                      <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                        BÁO CÁO THÀNH TÍCH MÙA GIẢI {getSeasonYearString(currentAge, playerDebutAge)} (TUỔI {currentAge})
                      </h4>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", margin: "4px 0" }}>
                      <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "10px", boxShadow: "2px 2px 0 var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>LEAGUE</span>
                        <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 900 }}>#{standingResult ?? "—"}</div>
                      </div>
                      <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "10px", boxShadow: "2px 2px 0 var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>DOMESTIC CUP</span>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
                          {domesticCupResult === "Winner" ? "🏆 WIN" : domesticCupResult === "Runner-Up" ? "🥈 Á QUÂN" : domesticCupResult === "Semi-Finals" ? "🥉 BÁN KẾT" : "❌ LOẠI SỚM"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <div style={{ flex: "1 1 120px" }}>
                        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>THỐNG KÊ CÁ NHÂN</span>
                        <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 700, marginTop: "2px" }}>
                          {yearSimResult.apps} Trận · {yearSimResult.goals} G · {yearSimResult.assists} A
                        </div>
                      </div>
                      <div style={{ flex: "1 1 120px", textAlign: "right" }}>
                        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>DIỂM RATING</span>
                        <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 700, color: "var(--coral)", marginTop: "2px" }}>
                          ★ {yearSimResult.matchRating}
                        </div>
                      </div>
                    </div>

                    {hasBallonDorWinner && (
                      <div style={{ backgroundColor: "gold", border: "1.5px solid var(--charcoal)", padding: "6px", borderRadius: "3px", textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "var(--charcoal)", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                        🏆 ĐOẠT QUẢ BÓNG VÀNG BALLON D'OR DANH GIÁ!
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleNextSeason}
                      className="btn-primary"
                      style={{ width: "100%", fontSize: "1rem", padding: "10px", marginTop: "4px", backgroundColor: "var(--charcoal)", color: "var(--white)" }}
                    >
                      TIẾN VÀO MÙA GIẢI TIẾP THEO →
                    </button>
                  </div>
                )}

              </div>

              <TimelineHistory events={events} playerDebutAge={playerDebutAge} />
            </div>

            {/* CỘT 2 (GIỮA): HỒ SƠ MÙA GIẢI & CHI TIẾT ACCORDION DROPDOWN LIST */}
            <SeasonProfile
              seasonRecords={seasonRecords}
              currentAge={currentAge}
              playerDebutAge={playerDebutAge}
              selectedAgeForStats={selectedAgeForStats}
              setSelectedAgeForStats={setSelectedAgeForStats}
              isLeagueOpen={isLeagueOpen}
              setIsLeagueOpen={setIsLeagueOpen}
              isDomesticOpen={isCupOpen}
              setIsDomesticOpen={setIsCupOpen}
              isContinentalOpen={isContinentalOpen}
              setIsContinentalOpen={setIsContinentalOpen}
              isNationalOpen={isNationalOpen}
              setIsNationalOpen={setIsNationalOpen}
            />

            {/* CỘT 3 (PHẢI): STICKER PANINI LIVE STICKER ALBUM */}
            <PaniniSticker
              playerName={playerName}
              position={position}
              playerNationality={playerNationality}
              currentOvr={currentOvr}
              currentAge={currentAge}
              playerDebutAge={playerDebutAge}
              playerCareerLength={playerCareerLength}
              currentContinentalCup={currentContinentalCup}
              standingResult={standingResult}
              domesticCupResult={domesticCupResult}
              continentalCupResult={continentalCupResult}
              nationalCallupResult={nationalCallupResult}
              nationalTournamentResult={nationalTournamentResult}
              hasBallonDorWinner={hasBallonDorWinner}
              currentStats={currentStats}
              evolvedStatsThisYear={evolvedStatsThisYear}
              currentClubName={currentClub?.name}
            />

          </div>
        </main>
      )}

      {/* ── MODE 3: RETIRED ── */}
      {mode === "retired" && (
        <main style={{ flex: 1, maxWidth: "750px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "4px 4px 0 var(--charcoal)", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            
            <div style={{ textAlign: "center", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "12px" }}>
              <Trophy size={42} color="var(--coral)" style={{ margin: "0 auto 8px" }} />
              <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1.55rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)", margin: 0 }}>
                TỔNG KẾT HÀNH TRÌNH SỰ NGHIỆP CẦU THỦ
              </h2>
              <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.6rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "4px" }}>
                🏁 CẦU THỦ CHÍNH THỨC GIẢI NGHỆ BÓNG ĐÁ CHUYÊN NGHIỆP
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
              
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: "220px", backgroundColor: "var(--cream)", border: "2.5px solid var(--charcoal)", borderRadius: "4px", padding: "12px", boxShadow: "3px 3px 0 var(--charcoal)", display: "flex", flexDirection: "column", aspectRatio: "2 / 3" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", textTransform: "uppercase" }}>RETRO ALBUM</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.65rem", fontWeight: 700, color: "var(--coral)" }}>{position}</span>
                  </div>

                  <div style={{ flex: 1, backgroundColor: "var(--white)", border: "1.5px solid var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "8px", position: "relative" }}>
                    <span style={{ position: "absolute", top: "6px", right: "6px", fontSize: "1.25rem" }}>{getFlagEmoji(playerNationality)}</span>
                    <div style={{ fontFamily: "var(--font-headline)", fontSize: "2.4rem", fontWeight: 900, color: "var(--charcoal)" }}>{peakOvrValue}</div>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase", marginTop: "2px" }}>PEAK OVR</span>
                  </div>

                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", fontWeight: 700, textAlign: "center", textTransform: "uppercase" }}>
                    {playerName}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>THỐNG KÊ SỰ NGHIỆP XI</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "6px" }}>
                    <div style={{ border: "1px solid var(--cream-border)", padding: "8px", borderRadius: "3px", backgroundColor: "var(--cream-dark)" }}>
                      <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-light)" }}>TRẬN RA SÂN</span>
                      <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700 }}>{careerTotalStats.apps}</div>
                    </div>
                    <div style={{ border: "1px solid var(--cream-border)", padding: "8px", borderRadius: "3px", backgroundColor: "var(--cream-dark)" }}>
                      <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-light)" }}>G / A TỔNG</span>
                      <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700 }}>{careerTotalStats.goals}G / {careerTotalStats.assists}A</div>
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>CÁC CÂU LẠC BỘ THI ĐẤU</span>
                  <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {clubStints.map((st, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", borderBottom: "1px dashed var(--cream-border)", paddingBottom: "2px" }}>
                        <span>🏠 {st.clubName} ({st.leagueName})</span>
                        <span style={{ fontWeight: 700 }}>{st.yearsAtClub} Mùa</span>
                      </div>
                    ))}
                  </div>
                </div>

                {events.some(e => e.label.includes("BALLON D'OR")) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1.5px solid var(--charcoal)", padding: "8px 12px", borderRadius: "3px", backgroundColor: "gold", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                    <Trophy size={20} color="var(--charcoal)" />
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase" }}>ĐOẠT QUẢ BÓNG VÀNG BALLON D'OR!</span>
                  </div>
                )}
              </div>

            </div>

            <div style={{ borderTop: "2px solid var(--charcoal)", paddingTop: "16px", display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleSavePlayer}
                disabled={isSaving}
                className="btn-primary"
                style={{
                  fontSize: "1.1rem",
                  padding: "14px 48px",
                  backgroundColor: "var(--coral)",
                  color: "var(--white)",
                  opacity: isSaving ? 0.6 : 1,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <RefreshCw size={18} className={isSaving ? "animate-spin" : ""} />
                {isSaving ? "ĐANG LƯU DỮ LIỆU..." : "LƯU THẺ CẦU THỦ & QUAY VỀ SQUAD BOARD"}
              </button>
            </div>

          </div>
        </main>
      )}

    </div>
  );
}
