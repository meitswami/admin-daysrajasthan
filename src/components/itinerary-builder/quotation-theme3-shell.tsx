/** Decorative parchment side rails for Theme 3 (SenduserviewData4).
 *  Full asset width (338px), pinned to the true left/right extremes of the
 *  page, spanning the full document height. Below sticky chrome (z-40).
 */
export function Theme3SideRails() {
  return (
    <>
      <div
        aria-hidden
        className="theme3-side-rail theme3-side-rail-left pointer-events-none absolute inset-y-0 z-[3] w-[min(338px,28vw)] print:w-[7.5rem]"
        style={{
          left: "calc(50% - 50vw)",
          backgroundImage: "url(/theme-assets/theme3/side-left.png)",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "left top",
          backgroundSize: "100% auto",
        }}
      />
      <div
        aria-hidden
        className="theme3-side-rail theme3-side-rail-right pointer-events-none absolute inset-y-0 z-[3] w-[min(338px,28vw)] print:w-[7.5rem]"
        style={{
          left: "auto",
          right: "calc(50% - 50vw)",
          backgroundImage: "url(/theme-assets/theme3/side-right.png)",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "right top",
          backgroundSize: "100% auto",
        }}
      />
    </>
  );
}
