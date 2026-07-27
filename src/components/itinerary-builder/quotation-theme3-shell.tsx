/** Decorative parchment side rails for Theme 3 (SenduserviewData4 / bl.jpg+br.jpg).
 *  Match reference: full-page absolute rails at z-0, 30% width, background-size contain.
 *  Content must sit above these (relative z-10) so nothing is covered.
 */
export function Theme3SideRails() {
  return (
    <>
      <div
        aria-hidden
        className="theme3-side-rail theme3-side-rail-left pointer-events-none absolute top-0 left-0 z-0 block h-full w-[30%] bg-left bg-repeat-y"
        style={{
          backgroundImage: "url(/theme-assets/theme3/side-left.png)",
          backgroundSize: "contain",
        }}
      />
      <div
        aria-hidden
        className="theme3-side-rail theme3-side-rail-right pointer-events-none absolute top-0 right-0 z-0 block h-full w-[30%] bg-right bg-repeat-y"
        style={{
          backgroundImage: "url(/theme-assets/theme3/side-right.png)",
          backgroundSize: "contain",
        }}
      />
    </>
  );
}
