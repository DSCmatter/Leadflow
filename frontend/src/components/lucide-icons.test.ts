import { describe, expect, it } from "vitest";
import * as icons from "lucide-react";

describe("lucide-react icon API", () => {
  it("exposes the axis icon that replaced centerline", () => {
    expect(icons.SquareAxisDashedHorizontal).toBeDefined();
    expect(icons.SquareAxisDashedVertical).toBeDefined();
  });

  it("keeps the existing icon imports used by the app available", () => {
    expect(icons.Bell).toBeDefined();
    expect(icons.Flag).toBeDefined();
    expect(icons.Phone).toBeDefined();
    expect(icons.Pin).toBeDefined();
    expect(icons.Plus).toBeDefined();
    expect(icons.Search).toBeDefined();
    expect(icons.TrendingUp).toBeDefined();
    expect(icons.X).toBeDefined();
    expect(icons.XIcon).toBeDefined();
  });
});
