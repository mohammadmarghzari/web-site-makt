import { Act1Hero } from "@/components/hero/Act1Hero";
import { Act3Hero } from "@/components/hero/Act3Hero";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FlowAct, ScrollStage, StickyAct } from "@/components/scroll/ScrollStage";
import { ProgressRail } from "@/components/scroll/ProgressRail";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { Bracket } from "@/components/ui/Bracket";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";
import { catalogueProducts, sampleScenes, sampleSettings } from "@/lib/data/sample";

/*
 * The three acts.
 *
 * `length` is the wrapper height in viewports. One viewport is spent on the
 * pinned panel and one on the outgoing crossfade, so act 1 scrubs its image
 * sequence across the remaining two, and act 3 — which never exits — scrubs
 * across two of its three.
 */
const ACT1_LENGTH = 4;
const ACT3_LENGTH = 3;

export default function HomePage() {
  return (
    <>
      <FrameOverlay />

      <SmoothScroll>
        <ScrollStage>
          <StickyAct index={0} id="act-1" length={ACT1_LENGTH}>
            <Act1Hero scene={sampleScenes.act1} products={catalogueProducts} />
          </StickyAct>

          <FlowAct index={1} id="act-2">
            {/*
              Height here is structural, not decorative. One viewport is spent
              on the entry crossfade and one on the exit, so 300dvh leaves a
              100dvh stretch where the catalogue sits at full opacity.
              Within that stretch the viewer sees this act's first ~200dvh —
              hence `justify-start`: centring would park the empty half of the
              column exactly where the grid is supposed to be legible. Leading
              emptiness reads as a bug, trailing emptiness reads as the beat
              before act 3.
            */}
            <div className="flex min-h-[300dvh] flex-col justify-start gap-20 px-4 pt-[8dvh] sm:px-8 md:pe-24">
              <ProductGrid products={catalogueProducts} />

              <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line pt-8">
                <div className="max-w-sm">
                  <Bracket>دربارهٔ ساخت</Bracket>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    هر پیکره پیش از بسته‌بندی دستی بازبینی می‌شود: سفتی مفاصل، هم‌ترازی
                    رنگ و جفت‌شدن قطعات جانبی.
                  </p>
                </div>
                <span className="type-utility" dir="ltr">
                  QC — HAND CHECKED
                </span>
              </div>
            </div>
          </FlowAct>

          <StickyAct index={2} id="act-3" length={ACT3_LENGTH}>
            <Act3Hero scene={sampleScenes.act3} />
          </StickyAct>

          <ProgressRail />
        </ScrollStage>
      </SmoothScroll>

      <div className="relative z-10 bg-bg px-4 sm:px-8">
        <Footer settings={sampleSettings} />
      </div>
    </>
  );
}
