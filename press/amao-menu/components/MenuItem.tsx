interface MenuItemProps {
  name: string;
  enName?: string;
  notes?: string;
  price: string | number;
  badge?: string;
  temp?: "hot" | "ice" | "both";
}

export default function MenuItem({
  name,
  enName,
  notes,
  price,
  badge,
  temp = "both",
}: MenuItemProps) {
  return (
    <div className="flex w-full flex-col justify-between border-b border-[#292524]/12 pb-3.5 pt-1.5 [font-family:'Noto_Serif_TC',serif]">
      {/* Top Row: Title + Tags + Price */}
      <div className="flex w-full items-baseline justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-[12.5pt] font-medium tracking-wide text-[#1c1917]">
            {name}
          </span>
          {badge && (
            <span className="rounded bg-[#ea580c]/12 px-2 py-0.5 text-[7.5pt] font-medium text-[#c2410c]">
              {badge}
            </span>
          )}
          {temp !== "both" && (
            <span className="text-[7.5pt] font-mono text-[#78716c] uppercase">
              [{temp === "hot" ? "HOT ONLY" : "ICE ONLY"}]
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-[8.5pt] text-[#78716c] font-mono font-medium">NT$</span>
          <span className="text-[14pt] font-bold text-[#1c1917] font-mono tracking-tight">
            {price}
          </span>
        </div>
      </div>

      {/* Bottom Row: English Name & Tasting Notes */}
      {(enName || notes) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[8.5pt] leading-normal text-[#57534e]">
          {enName && <span className="font-light italic text-[#44403c]">{enName}</span>}
          {notes && <span className="text-[#78716c]">· {notes}</span>}
        </div>
      )}
    </div>
  );
}
