/** Decorative parchment side rails for Theme 3 (SenduserviewData4). */
export function Theme3SideRails() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 sm:w-12 md:w-14"
        style={{
          backgroundImage: "url(/theme-assets/theme3/side-left.png)",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "left top",
          backgroundSize: "100% auto",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 sm:w-12 md:w-14"
        style={{
          backgroundImage: "url(/theme-assets/theme3/side-right.png)",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "right top",
          backgroundSize: "100% auto",
        }}
      />
    </>
  );
}
