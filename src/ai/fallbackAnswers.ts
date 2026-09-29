import type { Interest } from "../engine/profile";

interface FallbackAnswer {
  en: string;
  hi: string;
}

export const fallbackAnswers: Record<Interest, FallbackAnswer[]> = {
  fitness: [
    {
      en: "Best time to exercise outdoors is early morning (6-8 AM) when temperatures are cooler and air quality is better. Avoid midday heat.",
      hi: "बाहर व्यायाम करने का सबसे अच्छा समय सुबह 6-8 बजे है जब तापमान ठंडा होता है। दोपहर की गर्मी से बचें।",
    },
  ],
  health: [
    {
      en: "When AQI is above 100, limit outdoor activities. Wear an N95 mask if you must go outside. Keep windows closed during high pollen hours (10 AM - 2 PM).",
      hi: "जब AQI 100 से ऊपर हो तो बाहरी गतिविधियाँ सीमित करें। बाहर जाना हो तो N95 मास्क पहनें।",
    },
  ],
  beach: [
    {
      en: "Check tide timings before heading to the beach. Apply SPF 50 sunscreen and reapply every 2 hours. Stay hydrated in the sun.",
      hi: "समुद्र तट पर जाने से पहले ज्वार का समय जांचें। SPF 50 सनस्क्रीन लगाएं और हर 2 घंटे में दोबारा लगाएं।",
    },
  ],
  traveler: [
    {
      en: "Pack layers for temperature differences between cities. Check weather at your destination 3 days ahead. Carry a light raincoat during monsoon season.",
      hi: "शहरों के बीच तापमान अंतर के लिए परतदार कपड़े पैक करें। गंतव्य का मौसम 3 दिन पहले जांचें।",
    },
  ],
  parent: [
    {
      en: "During rain, the school commute is safest between 9-10 AM when the heaviest showers pass. Carry an umbrella and wear grippy shoes.",
      hi: "बारिश में स्कूल जाने का सबसे सुरक्षित समय 9-10 बजे है जब तेज बारिश थम जाती है। छाता और अच्छे जूते रखें।",
    },
  ],
  agri: [
    {
      en: "Delay irrigation when rain is forecast within 24 hours. Monitor soil moisture — optimal for most crops is 30-60%. Watch for frost warnings in winter.",
      hi: "24 घंटे में बारिश की संभावना हो तो सिंचाई टालें। मिट्टी की नमी 30-60% रखें। सर्दियों में पाले की चेतावनी पर ध्यान दें।",
    },
  ],
  commuter: [
    {
      en: "Fog reduces visibility below 400m — leave 20 minutes early and use fog lamps. Rain adds 15-30 minutes to most routes due to waterlogging.",
      hi: "कोहरे में दृश्यता 400m से कम — 20 मिनट पहले निकलें और फॉग लैंप इस्तेमाल करें। बारिश से अधिकतर रास्तों में 15-30 मिनट और लगते हैं।",
    },
  ],
  event: [
    {
      en: "For outdoor events, the best comfort window is late afternoon (4-7 PM) with lowest rain probability. Have a backup indoor venue during monsoon months.",
      hi: "बाहरी आयोजनों के लिए शाम 4-7 बजे सबसे अच्छा समय है। मानसून में इनडोर बैकअप रखें।",
    },
  ],
};

export function getFallbackAnswer(interest: Interest, lang: string): string {
  const answers = fallbackAnswers[interest];
  const answer = answers[Math.floor(Math.random() * answers.length)];
  return lang === "hi" ? answer.hi : answer.en;
}
