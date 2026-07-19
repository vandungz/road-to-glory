"use client";

import React from "react";
import { Trophy } from "lucide-react";
import type { ClientSafePlayer } from "@/types/squad";
import { getFlagEmoji } from "@/types/squad";

interface PlayerStickerCardProps {
  player: ClientSafePlayer;
  finalClub: string;
  debutAge: number;
  retireAge: number;
  careerLength: number;
  rarityColor: string;
}

export function PlayerStickerCard({
  player,
  finalClub,
  debutAge,
  retireAge,
  careerLength,
  rarityColor,
}: PlayerStickerCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
      }}
    >
      {/* Sticker Panini cách điệu cực đẹp */}
      <div
        style={{
          width: "180px",
          margin: "0 auto",
          backgroundColor: "var(--white)",
          border: "2.5px solid var(--charcoal)",
          borderRadius: "4px",
          boxShadow: "4px 4px 0 var(--charcoal)",
          padding: "10px 10px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.015) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      >
        {/* Rarity Stripe Badge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "6px",
            backgroundColor: rarityColor,
            borderBottom: "1.5px solid var(--charcoal)",
          }}
        />

        {/* OVR & POS Header */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.7rem", fontWeight: 700, color: "var(--charcoal)", lineHeight: 1 }}>
            {player.peakOvr}
          </div>
          <div style={{
            fontFamily: "var(--font-headline)",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--white)",
            backgroundColor: rarityColor,
            border: "1.5px solid var(--charcoal)",
            borderRadius: "3px",
            padding: "1px 6px",
            lineHeight: 1.1,
          }}>
            {player.position}
          </div>
        </div>

        {/* Retro Soccer Player Illustration Outline */}
        <div
          style={{
            width: "100%",
            height: "105px",
            border: "1.5px solid var(--charcoal)",
            backgroundColor: "var(--cream)",
            margin: "8px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Retro Stadium light beam or stripes background */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "linear-gradient(45deg, var(--charcoal) 25%, transparent 25%, transparent 75%, var(--charcoal) 75%, var(--charcoal)), linear-gradient(45deg, var(--charcoal) 25%, transparent 25%, transparent 75%, var(--charcoal) 75%, var(--charcoal))", backgroundSize: "20px 20px", backgroundPosition: "0 0, 10px 10px" }} />
          
          {/* Graphic Shirt Icon */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
            <Trophy size={48} color={rarityColor} strokeWidth={1.5} />
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", marginTop: "4px" }}>
              EDITION 2025/26
            </div>
          </div>
        </div>

        {/* Sticker Bio Info (Nationality & Name) */}
        <div style={{ width: "100%", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ fontSize: "1.1rem" }}>{getFlagEmoji(player.nationality)}</span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", color: "var(--ink-gray)", letterSpacing: "0.05em" }}>
              {player.nationality.toUpperCase()}
            </span>
          </div>
          <h3 style={{
            fontFamily: "var(--font-headline)",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--charcoal)",
            lineHeight: 1.1,
            margin: "4px 0 2px",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}>
            {player.name}
          </h3>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--ink-gray)", fontStyle: "italic" }}>
            {finalClub}
          </div>
        </div>
      </div>

      {/* Bio Info Table */}
      <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "12px 14px", boxShadow: "2px 2px 0 var(--charcoal)" }}>
        <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", color: "var(--charcoal)", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", marginBottom: "8px" }}>
          HỒ SƠ CÁ NHÂN
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { label: "Chiều cao", value: `${player.height ?? 180} cm` },
            { label: "Cân nặng", value: `${player.weight ?? 75} kg` },
            { label: "Chân thuận", value: player.preferredFoot === "Right" ? "Phải" : player.preferredFoot === "Left" ? "Trái" : "Hai chân" },
            { label: "Tuổi ra mắt", value: `${debutAge} tuổi` },
            { label: "Tuổi giải nghệ", value: `${retireAge} tuổi` },
            { label: "Thời gian thi đấu", value: `${careerLength} năm` },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontFamily: "var(--font-body)" }}>
              <span style={{ color: "var(--ink-gray)" }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: "var(--charcoal)" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
