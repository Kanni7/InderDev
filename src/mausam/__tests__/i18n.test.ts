import { describe, it, expect } from "vitest";
import { makeT } from "../i18n";

describe("i18n translation engine", () => {
  const tHi = makeT("hi");
  const tTe = makeT("te");

  it("translates dynamic precipitation alert strings with numbers", () => {
    expect(tHi("0 mm expected in the next 24 hours.")).toBe("अगले 24 घंटों में 0 मिमी वर्षा अपेक्षित है।");
    expect(tHi("12.5 mm expected in the next 24 hours.")).toBe("अगले 24 घंटों में 12.5 मिमी वर्षा अपेक्षित है।");
    expect(tTe("5 mm expected in the next 24 hours.")).toBe("తదుపరి 24 గంటల్లో 5 మి.మీ వర్షం అంచనా.");
  });

  it("translates activity running logged headlines", () => {
    expect(tHi("1 hrs of running logged — great work")).toBe("1 घंटे की दौड़ दर्ज की गई — शानदार कार्य!");
    expect(tHi("2.5 hrs of running logged — great work")).toBe("2.5 घंटे की दौड़ दर्ज की गई — शानदार कार्य!");
  });

  it("translates running condition details with AQI & breeze", () => {
    const en = "26°C, 8 km/h NW breeze, AQI 55. Moderate AQI — consider a mask on long runs.";
    expect(tHi(en)).toBe("26°C, 8 किमी/घं हवा, AQI 55। मध्यम वायु गुणवत्ता — लंबी दौड़ में मास्क का प्रयोग करें।");
  });

  it("translates countdown badges for sun and moon events", () => {
    expect(tHi("in 2h 24m")).toBe("2 घंटे 24 मिनट में");
    expect(tHi("in 45m")).toBe("45 मिनट में");
    expect(tHi("in 3d")).toBe("3 दिनों में");
  });

  it("translates daylight length", () => {
    expect(tHi("12h 15m")).toBe("12घं 15मि");
  });

  it("translates static status badges and comfort labels", () => {
    expect(tHi("Active")).toBe("सक्रिय");
    expect(tHi("Dry")).toBe("शुष्क");
    expect(tHi("Humid")).toBe("नम");
    expect(tHi("Comfortable")).toBe("आरामदायक");
    expect(tHi("Oppressive")).toBe("उमस भरा");
  });

  it("handles case-insensitive and uppercase day names", () => {
    expect(tHi("TODAY")).toBe("आज");
    expect(tHi("Today")).toBe("आज");
    expect(tHi("MONDAY")).toBe("सोमवार");
    expect(tHi("Monday")).toBe("सोमवार");
  });
});
