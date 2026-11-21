"use client";

import { PageGuide } from "@/features/onboarding/GuideProvider";
import { CoachMark } from "@/features/onboarding/CoachMark";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { ActivityLine } from "@/components/ui/ActivityLine";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchField } from "@/components/ui/SearchField";
import { OfferCard, ShortlistCard } from "./TransferClubRows";
import { TransferNegotiationPanel } from "./TransferNegotiationPanel";
import {
  formatEuroThousands,
  type TransferFeeDealOption,
} from "@/lib/transfer-economy";
import { type WageDealOption } from "@/lib/salary-negotiation";
import type { ContractOfferCard, PendingTransferNegotiation, ShortlistClubCard, TransferDealAttemptResult, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { ApproachRejectState } from "@/features/transfer/services/transfer.service";

interface SearchResult {
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}

export interface PersistentTransferSectionProps {
  market: TransferMarketResult;
  currentClubId?: string | null;
  currentClubName?: string;
  isProcessing: boolean;
  onAcceptOffer: (offer: ContractOfferCard, wageOption?: WageDealOption) => Promise<TransferDealAttemptResult> | TransferDealAttemptResult;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard, feeOption?: TransferFeeDealOption) => Promise<boolean> | void;
  onSearchClubs: (params: {
    currentClubId?: string | null;
    query?: string;
    leagueId?: string;
    prestigeMin?: number;
    prestigeMax?: number;
    page: number;
  }) => Promise<SearchResult>;
  approachRejects: ApproachRejectState;
  approachBanner: string | null;
  onClose?: () => void;
  acceptedOffer?: ContractOfferCard | null;
  onClearAcceptedOffer?: (offer?: ContractOfferCard, state?: { failedWageOptions: WageDealOption[] }) => Promise<void> | void;
  onSelectOffer?: (offer: ContractOfferCard) => Promise<PendingTransferNegotiation | null> | PendingTransferNegotiation | null;
}

export function PersistentTransferSection({ market, currentClubId, currentClubName, isProcessing, onAcceptOffer, onRejectAll, onApproachShortlist, onSearchClubs, approachRejects, approachBanner, onClose, acceptedOffer, onClearAcceptedOffer, onSelectOffer }: PersistentTransferSectionProps) {
  const ui = useTranslations("ui");
  const t = useTranslations("transfer");
  const { contract, inbound, shortlist, isUnemployedMarket } = market;
  const renewal = market.renewal ?? (acceptedOffer?.kind === "renewal" ? acceptedOffer : null);
  const visibleRenewal = renewal;
  const [activeTab, setActiveTab] = useState<"renewal" | "inbound" | "shortlist">(visibleRenewal ? "renewal" : inbound.length > 0 ? "inbound" : "renewal");
  const [pendingClubId, setPendingClubId] = useState<string | null>(null);
  const [feeDeals, setFeeDeals] = useState<Record<string, TransferFeeDealOption>>({});
  const [wageDeal, setWageDeal] = useState<WageDealOption>("standard");
  const [failedWageOptions, setFailedWageOptions] = useState<WageDealOption[]>([]);
  const [cancelledOffer, setCancelledOffer] = useState<ContractOfferCard | null>(null);
  const [excludedClubIds, setExcludedClubIds] = useState<Set<string>>(new Set());
  const [pendingOffer, setPendingOffer] = useState<ContractOfferCard | null>(acceptedOffer?.kind === "renewal" ? null : acceptedOffer ?? null);
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("all");
  const [prestige, setPrestige] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<SearchResult>({ clubs: shortlist, totalCount: shortlist.length, leagues: [] });
  const [settledSearch, setSettledSearch] = useState<{ key: string; failed: boolean }>();
  const [retryKey, setRetryKey] = useState(0);
  const searchRef = useRef(onSearchClubs);
  const lastRequestedQuery = useRef("");
  const searchQuery = query.trim();
  const searchKey = JSON.stringify([currentClubId, searchQuery, league, prestige, page, retryKey]);
  const isSearching = settledSearch?.key !== searchKey;
  const searchError = !isSearching && settledSearch?.failed;

  useEffect(() => { searchRef.current = onSearchClubs; }, [onSearchClubs]);
  useEffect(() => {
    if (activeTab !== "shortlist" || !isSearching) return;
    let active = true;

    async function fetchClubs() {
      lastRequestedQuery.current = searchQuery;
      try {
        const result = await searchRef.current({
          currentClubId,
          query: searchQuery || undefined,
          leagueId: league === "all" ? undefined : league,
          prestigeMin: prestige === "all" ? undefined : Number(prestige),
          prestigeMax: prestige === "all" ? undefined : Number(prestige),
          page,
        });
        if (active) {
          setSearch(result);
          setSettledSearch({ key: searchKey, failed: false });
        }
      } catch {
        if (active) setSettledSearch({ key: searchKey, failed: true });
      }
    }

    // Debounce typing. Opening the list, changing filters and paging start immediately.
    let timer: number | undefined;
    if (lastRequestedQuery.current === searchQuery) void fetchClubs();
    else timer = window.setTimeout(fetchClubs, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeTab, currentClubId, isSearching, searchQuery, searchKey, league, prestige, page]);

  const isFreeAgent = contract.yearsRemaining <= 0 || isUnemployedMarket;
  const currentClub = currentClubName ?? (visibleRenewal?.clubName || ui("currentClub3"));
  const visibleInbound = inbound.filter((offer) => !excludedClubIds.has(offer.clubId));
  const visibleSearchClubs = search.clubs.filter((club) => club.clubId !== currentClubId && !excludedClubIds.has(club.clubId));
  const totalPages = Math.max(1, Math.ceil(search.totalCount / 8));
  async function runClubAction(clubId: string, action: () => Promise<unknown> | void) {
    setPendingClubId(clubId);
    try { await action(); }
    finally { setPendingClubId(null); }
  }

  async function beginWageNegotiation(offer: ContractOfferCard) {
    if (offer.kind === "renewal") { await onAcceptOffer(offer, "standard"); return; }
    const persistedSelection = onSelectOffer
      ? await onSelectOffer(offer)
      : { offer, failedWageOptions: [] };
    if (!persistedSelection) return;
    setPendingOffer(persistedSelection.offer);
    setCancelledOffer(null);
    setFailedWageOptions(persistedSelection.failedWageOptions);
    const nextWageOption = (["lower", "standard", "higher"] as WageDealOption[]).find((option) => !persistedSelection.failedWageOptions.includes(option));
    setWageDeal(nextWageOption ?? "standard");
  }
  useEffect(() => {
    if (acceptedOffer && acceptedOffer.kind !== "renewal") {
      setPendingOffer(acceptedOffer);
      setCancelledOffer(null);
      setFailedWageOptions([]);
      setWageDeal("standard");
    }
  }, [acceptedOffer]);
  useEffect(() => {
    if (failedWageOptions.includes(wageDeal)) {
      const nextOption = (["lower", "standard", "higher"] as WageDealOption[]).find((option) => !failedWageOptions.includes(option));
      if (nextOption) setWageDeal(nextOption);
    }
  }, [failedWageOptions, wageDeal]);
  const pendingContent = pendingOffer ? <TransferNegotiationPanel offer={pendingOffer} selected={wageDeal} failed={failedWageOptions} processing={isProcessing}
    onSelect={setWageDeal}
    onBack={() => { setPendingOffer(null); void onClearAcceptedOffer?.(pendingOffer, { failedWageOptions }); }}
    onSubmit={async () => {
      const result = await onAcceptOffer(pendingOffer, wageDeal);
      if (result.resolution === "accepted") { setPendingOffer(null); onClearAcceptedOffer?.(); }
      else if (result.resolution === "rejected") setFailedWageOptions(result.failedWageOptions ?? [...new Set([...failedWageOptions, wageDeal])]);
      else if (result.resolution === "cancelled") { setExcludedClubIds((previous) => new Set(previous).add(pendingOffer.clubId)); setPendingOffer(null); onClearAcceptedOffer?.(); setCancelledOffer(pendingOffer); }
    }} /> : null;
  const cancelledContent = cancelledOffer ? (
    <section className="football-transfer-panel football-transfer-negotiation football-transfer-negotiation--cancelled">
      <span className="football-eyebrow">{ui("talksEnded")}</span>
      <h2>{t("moveCancelled", { club: cancelledOffer.clubName })}</h2>
      <p>{ui("theClubRejectedTwoWageProposalsAndWithdrewItsOfferForThisSeason")}</p>
      <Button size="lg" fullWidth onClick={() => { setCancelledOffer(null); setActiveTab("shortlist"); setPage(1); }}>{ui("backToClubs")}</Button>
    </section>
  ) : null;
  const content = (
    <section className="football-transfer-window">
      {!onClose && <PageGuide id="transfer" paused={isProcessing || pendingClubId !== null} />}
      <div className="football-transfer-window__overview">
      <header className="football-transfer-window__header"><div><span className="football-eyebrow">{t("windowTiming", { count: contract.seasonsLeftInCareer })}</span><h1>{inbound.length > 1 ? ui("transferOfferCount", { count: inbound.length }) : ui("transferWindow2")} <CoachMark target="transfer-tabs" /></h1><p>{ui("reviewYourContractAndTransferOptions")}</p></div>{onClose && <button type="button" className="football-icon-button" onClick={onClose} aria-label={ui("closeTransferWindow")}><X aria-hidden="true" size={18} /></button>}</header>
      <div className="football-transfer-window__context" data-guide="transfer-context"><span><small>{ui("currentClub")}</small><strong>{isUnemployedMarket ? ui("freeAgent2") : currentClub}</strong></span><span><small>{ui("currentWage")}</small><strong>{formatEuroThousands(contract.currentWageAnnual)}{ui("yr")}</strong></span><span><small>{ui("contractRemaining")}</small><strong>{isUnemployedMarket ? ui("noContract") : ui("seasons2", { v0: String(contract.yearsRemaining), v1: String(contract.yearsTotal) })}</strong></span><span><small>{ui("marketValue")}</small><strong>{formatEuroThousands(contract.marketValue)}</strong></span></div>
      </div>
      {approachBanner && <p className="football-transfer-feedback is-banner" role="status">{approachBanner}</p>}
      <nav className="football-transfer-tabs" data-guide="transfer-tabs" aria-label={ui("transferOptions")}><button type="button" className={activeTab === "renewal" ? "is-active" : ""} onClick={() => setActiveTab("renewal")}>{ui("stay")} {visibleRenewal ? ui("offer") : ""}</button><button type="button" className={activeTab === "inbound" ? "is-active" : ""} onClick={() => setActiveTab("inbound")}>{ui("offers")} <b>{visibleInbound.length}</b></button><button type="button" className={activeTab === "shortlist" ? "is-active" : ""} onClick={() => setActiveTab("shortlist")}>{ui("findAClub")} <b>{search.totalCount}</b></button></nav>

      <div className="football-transfer-window__body" data-guide="transfer-offers">
        {activeTab === "renewal" && <div className="football-transfer-panel"><div className="football-transfer-panel__heading"><h2>{t("stayAtClub", { club: currentClub })}</h2><p>{ui("stayWithYourCurrentClubNextSeason")}</p></div>{visibleRenewal ? <div className="football-transfer-renewal"><div><span>{ui("extensionOffer")}</span><strong>{ui("seasonCount", { count: visibleRenewal.contractYears })}</strong></div><div><span>{ui("newWage")}</span><strong>{formatEuroThousands(visibleRenewal.wageAnnual)}{ui("yr")}</strong></div><div><span>{ui("expectedRole")}</span><div className="football-transfer-renewal__role"><strong>{visibleRenewal.expectedLeagueApps >= 25 ? ui("starter") : ui("rotation")}</strong><small>Â· {t("seasonApps", { count: visibleRenewal.expectedLeagueApps })}</small></div></div><Button size="lg" disabled={isProcessing} loading={pendingClubId === visibleRenewal.clubId} onClick={() => void runClubAction(visibleRenewal.clubId, async () => { await onAcceptOffer(visibleRenewal, "standard"); })}>{ui("acceptExtension")}</Button></div> : <p className="football-transfer-empty">{ui("yourClubHasNotOfferedAnExtension")}</p>}</div>}
        {activeTab === "inbound" && <div className="football-transfer-panel"><div className="football-transfer-panel__heading"><p>{ui("selectAnOfferToNegotiateWages")}</p></div><div className="football-transfer-offers" role="region" aria-label={ui("transferOffers")} tabIndex={0}>{visibleInbound.length > 0 ? visibleInbound.map((offer) => <OfferCard key={`${offer.clubId}-${offer.kind}`} offer={offer} isProcessing={isProcessing || pendingClubId !== null} pending={pendingClubId === offer.clubId} onAccept={() => runClubAction(offer.clubId, () => beginWageNegotiation(offer))} />) : <p className="football-transfer-empty">{ui("noOffersThisSeason")}</p>}</div></div>}
        {activeTab === "shortlist" && <div className="football-transfer-panel"><div className="football-transfer-panel__heading"><p>{ui("setTheTransferFeeToOpenTalksDiscussWagesIfTheClubAgrees")}</p></div><div className="football-transfer-search">
          <SearchField label={ui("clubName")} value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder={ui("searchByClubName")} maxLength={80} />
          <FilterSelect label={ui("filterByLeague")} value={league} searchable onChange={(value) => { setLeague(value); setPage(1); }} options={[{ value: "all", label: ui("allLeagues") }, ...search.leagues.map((item) => ({ value: item.id, label: item.name, description: t("leagueTier", { tier: item.tier }), keywords: `tier ${item.tier}` }))]} />
          <FilterSelect label={ui("filterByPrestige")} value={prestige} onChange={(value) => { setPrestige(value); setPage(1); }} options={[{ value: "all", label: ui("anyPrestige") }, ...[5,4,3,2,1].map((item) => ({ value: String(item), label: t("prestigeStars", { count: item }) }))]} />
        </div>
        <div className="football-transfer-search-status" data-search-error={Boolean(searchError)}><span role="status">{isSearching ? ui("searchingForClubs") : searchError ? ui("couldNotLoadClubs") : `${search.totalCount} CLB`}</span>{searchError && <button type="button" className="football-text-button" onClick={() => setRetryKey((previous) => previous + 1)}>{ui("retry")}</button>}{(query || league !== "all" || prestige !== "all") && <button type="button" className="football-text-button" onClick={() => { setQuery(""); setLeague("all"); setPrestige("all"); setPage(1); }}>{ui("clearFilters")}</button>}</div><div className="football-transfer-targets" role="region" aria-label={ui("clubSearchResults")} tabIndex={0} aria-busy={isSearching}>
          {isSearching && <div className="football-transfer-targets__activity"><ActivityLine /></div>}
          {visibleSearchClubs.length > 0 ? visibleSearchClubs.map((club) => <ShortlistCard key={club.clubId} club={club} selectedDeal={feeDeals[club.clubId] ?? "standard"} isProcessing={isProcessing || pendingClubId !== null || isSearching || Boolean(searchError)} pending={pendingClubId === club.clubId} rejected={approachRejects[club.clubId]} onDealChange={(option) => setFeeDeals((previous) => ({ ...previous, [club.clubId]: option }))} onApproach={() => void runClubAction(club.clubId, () => onApproachShortlist(club, feeDeals[club.clubId] ?? "standard"))} />) : !isSearching && !searchError && <p className="football-transfer-empty">{ui("noClubsMatchYourFilters")}</p>}
        </div>{totalPages > 1 && <div className="football-transfer-pagination"><Button size="sm" variant="quiet" disabled={page <= 1 || isSearching || searchError} onClick={() => setPage((value) => value - 1)}>{ui("previous")}</Button><span>{ui("pagination", { page, total: totalPages })}</span><Button size="sm" variant="quiet" disabled={page >= totalPages || isSearching || searchError} onClick={() => setPage((value) => value + 1)}>{ui("next")}</Button></div>}</div>}
      </div>
      <footer className="football-transfer-window__footer" data-guide="transfer-continue"><span>{isFreeAgent ? ui("youAreAFreeAgent") : ui("youCanStayWithYourCurrentClub")}</span><Button variant="outline" disabled={isProcessing} onClick={onRejectAll}>{isFreeAgent ? ui("signAsAFreeAgent") : ui("skipAndStay")}</Button></footer>
    </section>
  );

  if (pendingContent || cancelledContent) {
    const negotiationContent = pendingContent ?? cancelledContent;
    return onClose ? <Modal open title={ui("contractTalks")} onClose={onClose} size="lg" className="football-transfer-modal"><ModalHeader className="sr-only">{ui("contractTalks")}</ModalHeader>{negotiationContent}</Modal> : negotiationContent;
  }
  if (!onClose) return content;
  return <Modal open title={ui("transferWindow2")} onClose={onClose} size="lg" className="football-transfer-modal"><ModalHeader className="sr-only">{ui("transferWindow2")}</ModalHeader>{content}</Modal>;
}
