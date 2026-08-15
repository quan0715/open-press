interface MenuCategoryProps {
  title: string;
  enTitle: string;
  description?: string;
  children?: any;
}

export default function MenuCategory({
  title,
  enTitle,
  description,
  children,
}: MenuCategoryProps) {
  return (
    <div className="mb-10 w-full min-w-full break-inside-avoid">
      {/* Category Header */}
      <div className="mb-4 w-full border-b-[1.5px] border-[#1c1917] pb-2">
        <div className="flex w-full items-baseline justify-between">
          <h3 className="m-0 [font-family:'Noto_Serif_TC',serif] text-[15pt] font-semibold tracking-[0.14em] text-[#1c1917]">
            {title}
          </h3>
          <span className="text-[8.5pt] font-mono tracking-[0.16em] text-[#78716c] uppercase">
            {enTitle}
          </span>
        </div>
        {description && (
          <p className="m-0 mt-1 text-[8.5pt] text-[#57534e] font-light leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* 1-Column Item List with generous gap */}
      <div className="flex w-full flex-col gap-3">
        {children}
      </div>
    </div>
  );
}
