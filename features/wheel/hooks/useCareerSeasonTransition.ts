import type { Dispatch, SetStateAction } from "react";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { AchievementRecord, ClubStint, CurrentClub } from "@/types/domain";
import {
  calculateContinentalQualification,
  getContinentalCupLabel,
  getDomesticCupName,
  getNationalTournamentName,
} from "../lib/simulation-helpers";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";

interface UseCareerSeasonTransitionProps {
  currentAge: number;
  clubStints: ClubStint[];
  currentClub: CurrentClub | null;
  currentContinentalCup: string;
  playerNationality: string;
  playerDebutAge: number;
  playerCareerLength: number;
  currentOvr: number;
  currentStats: Record<string, number>;
  setStatsTimeline: Dispatch<SetStateAction<import("@/types/domain").StatSnapshot[]>>;
  setPeakOvr: Dispatch<SetStateAction<number>>;
  setClubStints: Dispatch<SetStateAction<ClubStint[]>>;
  setCurrentContinentalCup: Dispatch<SetStateAction<string>>;
  setAchievements: Dispatch<SetStateAction<AchievementRecord>>;
  setCurrentAge: Dispatch<SetStateAction<number>>;
  setContractYearsRemaining: Dispatch<SetStateAction<number>>;
  applySimResultToRecords: (age: number, result: SimulatedSeasonResult) => void;
  finalizeSeasonRecord: (...args: [number | null, string | null, string | null, string | null, string | null, SimulatedSeasonResult | null, number | null]) => void;
}

export function useCareerSeasonTransition(props: UseCareerSeasonTransitionProps) {
  const {
    currentAge, clubStints, currentClub, currentContinentalCup, playerNationality,
    playerDebutAge, playerCareerLength, currentOvr, currentStats,
    setStatsTimeline, setPeakOvr, setClubStints, setCurrentContinentalCup,
    setAchievements, setCurrentAge, setContractYearsRemaining,
    applySimResultToRecords, finalizeSeasonRecord,
  } = props;

  function handleNextSeason(
    standingResult: number | null,
    domesticCupResult: string | null,
    continentalCupResult: string | null,
    nationalCallupResult: string | null,
    nationalTournamentResult: string | null,
    yearSimResult: SimulatedSeasonResult | null,
    ballonDorRank: number | null,
  ): { isRetire: boolean; nextContinentalCup: string } {
    const nextAge = currentAge + 1;
    const actualStint =
      clubStints.find((st) => currentAge >= st.startAge && currentAge <= st.endAge) ||
      clubStints[clubStints.length - 1];

    const actualClubName = actualStint?.clubName ?? currentClub?.name ?? "Không CLB";
    const actualLeagueName = actualStint?.leagueName ?? currentClub?.leagueName ?? "";
    const actualStintLeagueId = actualStint?.leagueId ?? currentClub?.leagueId ?? "";

    // Nếu cầu thủ đã accept transfer TRƯỚC khi bấm "mùa giải tiếp theo" (currentClub
    // đã là CLB mới, nhưng actualStint vẫn là CLB vừa thi đấu mùa này), thì KHÔNG
    // được áp vé cúp châu lục tính từ standing của CLB CŨ — vé đó thuộc về CLB cũ,
    // không đi theo cầu thủ. currentContinentalCup lúc này đã đúng theo CLB mới rồi
    // (do handleAcceptTransfer set qua setClubAndContinental).
    const hasTransferredAway = !!(
      actualStint?.clubId && currentClub?.id && actualStint.clubId !== currentClub.id
    );

    if (yearSimResult) {
      applySimResultToRecords(currentAge, yearSimResult);

      setStatsTimeline((prev) =>
        prev.map((item) =>
          item.age === currentAge
            ? {
                ...item,
                apps: yearSimResult.apps,
                goals: yearSimResult.goals,
                assists: yearSimResult.assists,
                cleanSheets: yearSimResult.cleanSheets,
                matchRating: yearSimResult.matchRating,
              }
            : item
        )
      );
    }

    // Persist the complete season outcome in one final record update before
    // currentAge advances. This prevents a placeholder created at season start
    // from replacing the wheel results in the background save snapshot.
    finalizeSeasonRecord(
      standingResult,
      domesticCupResult,
      continentalCupResult,
      nationalCallupResult,
      nationalTournamentResult,
      yearSimResult,
      ballonDorRank,
    );

    let nextContinentalCup = currentContinentalCup;
    if (standingResult !== null) {
      if (hasTransferredAway) {
        // Giữ nguyên currentContinentalCup (đã đúng theo CLB mới) — không ghi đè
        // bằng vé kiếm được ở CLB cũ.
      } else {
        nextContinentalCup = calculateContinentalQualification(
          actualStintLeagueId,
          standingResult,
          continentalCupResult,
          currentContinentalCup,
        );
        setCurrentContinentalCup(nextContinentalCup);
      }
    }

    setAchievements((prev) => {
      const trophies = [...(prev.trophies ?? [])];
      const seasonAwards = [...(prev.seasonAwards ?? [])];
      let ballonDor = prev.ballonDor ?? 0;

      if (standingResult === 1) {
        trophies.push({ type: "league", name: actualLeagueName || "Giải vô địch quốc gia", club: actualClubName, age: currentAge });
      }
      if (domesticCupResult === "Winner") {
        trophies.push({ type: "cup", name: getDomesticCupName(actualLeagueName, actualStintLeagueId), club: actualClubName, age: currentAge });
      }
      if (continentalCupResult === "Winner") {
        trophies.push({ type: "continental", name: getContinentalCupLabel(currentContinentalCup), club: actualClubName, age: currentAge });
      }
      if (nationalCallupResult === "called_up" && nationalTournamentResult === "Winner") {
        const tourney = getNationalTournamentName(
          playerNationality, currentAge, playerDebutAge, getNationalContinentalCup,
        );
        trophies.push({ type: "international", name: tourney, club: playerNationality, age: currentAge });
      }
      if (ballonDorRank !== null) {
        // top 10 nomination
        prev.ballonDorNominations = (prev.ballonDorNominations ?? 0) + 1;
      }
      if (ballonDorRank === 1) ballonDor += 1;
      if (yearSimResult) {
        yearSimResult.events.forEach((ev) => {
          if (ev.type === "individual_award") {
            seasonAwards.push({ type: "individual_award", label: ev.label, age: currentAge });
          }
        });
      }

      return { ballonDor, trophies, seasonAwards };
    });

    const retireAge = playerDebutAge + playerCareerLength;
    const isRetiring = nextAge > retireAge;

    if (isRetiring) {
      // Chốt snapshot của mùa cuối bằng OVR/stats sau cùng. Snapshot tuổi
      // retireAge được tạo từ OVR đầu mùa; nếu không cập nhật tại đây thì
      // Peak OVR của mùa cuối chỉ tồn tại trong currentOvr và bị mất khi save.
      const finalSeasonStats = yearSimResult
        ? {
            apps: yearSimResult.apps,
            goals: yearSimResult.goals,
            assists: yearSimResult.assists,
            cleanSheets: yearSimResult.cleanSheets,
            matchRating: yearSimResult.matchRating,
          }
        : {};
      setStatsTimeline((prev) => {
        const hasCurrentAge = prev.some((item) => item.age === currentAge);
        if (!hasCurrentAge) {
          return [...prev, { age: currentAge, ovr: currentOvr, ...currentStats, ...finalSeasonStats }];
        }
        return prev.map((item) =>
          item.age === currentAge
            ? { ...item, ...currentStats, ovr: currentOvr, ...finalSeasonStats }
            : item,
        );
      });
      setPeakOvr((prev) => Math.max(prev, currentOvr));

      // Không push timeline/stint tuổi retireAge+1 (entry “ma”) và bỏ stint
      // transfer chưa bao giờ đá (startAge > retireAge).
      setClubStints((prev) => {
        const played = prev.filter((st) => st.startAge <= retireAge);
        if (played.length === 0) return played;
        const updated = [...played];
        const last = { ...updated[updated.length - 1] };
        // A resumed career may still have the one-season seed as endAge. The
        // final played age is the authoritative terminal boundary.
        last.endAge = Math.max(last.startAge, currentAge);
        last.yearsAtClub = last.endAge - last.startAge + 1;
        last.ovrAtLeaving = currentOvr;
        updated[updated.length - 1] = last;
        return updated;
      });
      return { isRetire: true, nextContinentalCup };
    }

    setStatsTimeline((prev) => [
      ...prev,
      { age: nextAge, ovr: currentOvr, ...currentStats },
    ]);
    setPeakOvr((prev) => Math.max(prev, currentOvr));

    setClubStints((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.endAge = nextAge;
      last.yearsAtClub = nextAge - last.startAge + 1;
      last.ovrAtLeaving = currentOvr;
      updated[updated.length - 1] = last;
      return updated;
    });

    setCurrentAge(nextAge);
    // HĐ: mỗi mùa trừ 1 năm còn lại (sàn 0 = FA window)
    setContractYearsRemaining((prev) => Math.max(0, prev - 1));
    return { isRetire: false, nextContinentalCup };
  }

  return { handleNextSeason };
}
