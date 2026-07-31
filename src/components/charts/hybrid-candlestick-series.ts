import {
  customSeriesDefaultOptions,
  type CustomData,
  type CustomSeriesOptions,
  type CustomSeriesWhitespaceData,
  type ICustomSeriesPaneRenderer,
  type ICustomSeriesPaneView,
  type PaneRendererCustomData,
  type PriceToCoordinateConverter,
  type Time,
} from "lightweight-charts";
import type { DailyPortfolioCandle, TransactionType } from "@/types";

export const HYBRID_CANDLE_COLORS: Record<TransactionType, string> = {
  PROFIT: "#22C55E",
  LOSS: "#EF4444",
  DEPOSIT: "#F5B82E",
  WITHDRAWAL: "#8B5CF6",
};

export type HybridCandleData = Omit<DailyPortfolioCandle, "time"> &
  CustomData<Time>;

class HybridCandleRenderer implements ICustomSeriesPaneRenderer {
  private data: PaneRendererCustomData<Time, HybridCandleData> | null = null;

  update(data: PaneRendererCustomData<Time, HybridCandleData>): void {
    this.data = data;
  }

  draw(
    target: Parameters<ICustomSeriesPaneRenderer["draw"]>[0],
    priceConverter: PriceToCoordinateConverter,
  ): void {
    const data = this.data;
    const visibleRange = data?.visibleRange;
    if (!data || !visibleRange) return;

    target.useBitmapCoordinateSpace(
      ({ context, horizontalPixelRatio, verticalPixelRatio }) => {
        const effectiveSpacing =
          data.barSpacing * data.conflationFactor * horizontalPixelRatio;
        const bodyWidth = Math.max(
          2,
          Math.min(28 * horizontalPixelRatio, Math.floor(effectiveSpacing * 0.7)),
        );
        const halfBody = Math.floor(bodyWidth / 2);
        const wickWidth = Math.max(1, Math.floor(horizontalPixelRatio));
        const borderWidth = Math.max(1, Math.floor(horizontalPixelRatio));
        const tickWidth = Math.max(3, Math.floor(4 * horizontalPixelRatio));
        const firstVisible = Math.max(0, Math.floor(visibleRange.from));
        const lastVisible = Math.min(
          data.bars.length,
          Math.ceil(visibleRange.to),
        );

        const yFor = (price: number) => {
          const coordinate = priceConverter(price);
          return coordinate === null
            ? null
            : Math.round(coordinate * verticalPixelRatio);
        };

        for (
          let index = firstVisible;
          index < lastVisible;
          index += 1
        ) {
          const bar = data.bars[index];
          if (!bar) continue;

          const candle = bar.originalData;
          const x = Math.round(bar.x * horizontalPixelRatio);
          const highY = yFor(candle.high);
          const lowY = yFor(candle.low);
          const openY = yFor(candle.open);
          const closeY = yFor(candle.close);
          if (highY === null || lowY === null || openY === null || closeY === null) {
            continue;
          }

          context.fillStyle = "#64748B";
          context.fillRect(
            x - Math.floor(wickWidth / 2),
            Math.min(highY, lowY),
            wickWidth,
            Math.max(wickWidth, Math.abs(lowY - highY)),
          );

          for (const segment of candle.segments) {
            const fromY = yFor(segment.from);
            const toY = yFor(segment.to);
            if (fromY === null || toY === null) continue;

            const top = Math.min(fromY, toY);
            const height = Math.max(borderWidth * 2, Math.abs(toY - fromY));
            const left = x - halfBody;

            context.fillStyle = HYBRID_CANDLE_COLORS[segment.type];
            context.fillRect(left, top, bodyWidth, height);
            context.strokeStyle = "rgba(15, 23, 42, 0.55)";
            context.lineWidth = borderWidth;
            context.strokeRect(left, top, bodyWidth, height);
          }

          context.fillStyle = "#0F172A";
          context.fillRect(x - halfBody - tickWidth, openY, tickWidth, wickWidth);
          context.fillRect(x + halfBody, closeY, tickWidth, wickWidth);
        }
      },
    );
  }
}

export class HybridCandlestickSeries
  implements ICustomSeriesPaneView<Time, HybridCandleData, CustomSeriesOptions>
{
  private readonly candleRenderer = new HybridCandleRenderer();

  renderer(): ICustomSeriesPaneRenderer {
    return this.candleRenderer;
  }

  update(
    data: PaneRendererCustomData<Time, HybridCandleData>,
  ): void {
    this.candleRenderer.update(data);
  }

  priceValueBuilder(candle: HybridCandleData): number[] {
    return [candle.high, candle.low, candle.close];
  }

  isWhitespace(
    data: HybridCandleData | CustomSeriesWhitespaceData<Time>,
  ): data is CustomSeriesWhitespaceData<Time> {
    return !("open" in data);
  }

  defaultOptions(): CustomSeriesOptions {
    return {
      ...customSeriesDefaultOptions,
      color: "#0F172A",
      lastValueVisible: true,
      priceLineVisible: false,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    };
  }
}
