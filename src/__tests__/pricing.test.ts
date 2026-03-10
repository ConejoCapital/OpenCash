import { describe, it, expect } from "vitest";
import { priceToBaseUnits, getAcceptedPaymentOptions } from "../services/pricing.js";
import type { TokenConfig, Network } from "../types.js";

describe("priceToBaseUnits", () => {
  it("converts dollar price to 6-decimal base units", () => {
    expect(priceToBaseUnits("0.005", 6)).toBe("5000");
  });

  it("handles $-prefixed price", () => {
    expect(priceToBaseUnits("$0.001", 6)).toBe("1000");
  });

  it("handles 1 dollar", () => {
    expect(priceToBaseUnits("1.00", 6)).toBe("1000000");
  });

  it("handles very small price", () => {
    expect(priceToBaseUnits("0.000001", 6)).toBe("1");
  });

  it("handles 8-decimal tokens", () => {
    expect(priceToBaseUnits("0.01", 8)).toBe("1000000");
  });
});

describe("getAcceptedPaymentOptions", () => {
  const tokens: TokenConfig[] = [
    { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, program: "spl-token" },
    { symbol: "PYUSD", mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", decimals: 6, program: "token-2022" },
  ];
  const network = "solana:mainnet-beta" as Network;
  const payTo = "SomeRecipient123";

  it("returns one option per token", () => {
    const options = getAcceptedPaymentOptions("0.005", tokens, network, payTo, "test");
    expect(options).toHaveLength(2);
  });

  it("sets correct amount for each token", () => {
    const options = getAcceptedPaymentOptions("0.005", tokens, network, payTo, "test");
    expect(options[0].amount).toBe("5000");
    expect(options[1].amount).toBe("5000");
  });

  it("sets correct asset mint for each token", () => {
    const options = getAcceptedPaymentOptions("0.005", tokens, network, payTo, "test");
    expect(options[0].asset).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(options[1].asset).toBe("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
  });

  it("sets scheme, network, payTo, and timeout", () => {
    const options = getAcceptedPaymentOptions("0.001", tokens, network, payTo, "test");
    for (const opt of options) {
      expect(opt.scheme).toBe("exact");
      expect(opt.network).toBe(network);
      expect(opt.payTo).toBe(payTo);
      expect(opt.maxTimeoutSeconds).toBe(600);
    }
  });
});
