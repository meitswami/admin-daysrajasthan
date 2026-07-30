/** Decorative parchment side rails for Theme 3 (SenduserviewData4 / bl.jpg+br.jpg).
 *  Rails are intentionally wider than the visible ink so they tuck under the
 *  centered quotation card (z-10) and merge without a cream gap between.
 */
export function Theme3SideRails() {
  return (
    <>
      <div
        aria-hidden
        className="theme3-side-rail theme3-side-rail-left pointer-events-none absolute top-0 left-0 z-0 block h-full w-[48%] bg-left bg-repeat-y"
        style={{
          backgroundImage: "url(/theme-assets/theme3/side-left.png)",
          backgroundSize: "100% auto",
        }}
      />
      <div
        aria-hidden
        className="theme3-side-rail theme3-side-rail-right pointer-events-none absolute top-0 right-0 z-0 block h-full w-[48%] bg-right bg-repeat-y"
        style={{
          backgroundImage: "url(/theme-assets/theme3/side-right.png)",
          backgroundSize: "100% auto",
        }}
      />
    </>
  );
}
