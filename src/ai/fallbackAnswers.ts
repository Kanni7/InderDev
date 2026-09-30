import type { Interest } from "../engine/profile";

export interface WeatherContext {
  temp: number;
  feels: number;
  aqi: number;
  uv: number;
  humidity: number;
  precipChance: number;
  condition: string;
  sunrise: string;
  sunset: string;
}

/** Generate a contextual answer using real weather values when the AI API is unavailable. */
export function getFallbackAnswer(interest: Interest, lang: string, wx?: WeatherContext): string {
  if (!wx) return lang === "hi" ? "मौसम डेटा उपलब्ध नहीं है।" : "Weather data not available.";

  const hi = lang === "hi";
  const { temp, feels, aqi, uv, humidity, precipChance, condition } = wx;
  const isRainy = condition === "rainy" || condition === "storm" || precipChance > 60;
  const isHot = feels > 35;
  const isCold = temp < 16;
  const isGoodAir = aqi < 100;
  const isHighUV = uv >= 7;

  switch (interest) {
    case "fitness": {
      if (isHot && !isRainy)
        return hi
          ? `अभी ${feels}°C महसूस हो रहा है - गर्मी बहुत अधिक है। सुबह ${wx.sunrise} के बाद जल्दी दौड़ें या AQI ${aqi} की वजह से इनडोर ट्रेनिंग करें।`
          : `Feels like ${feels}°C - too hot for midday runs. Best window is just after sunrise (${wx.sunrise}) when AQI is ${aqi} and temps are lower.`;
      if (isRainy)
        return hi
          ? `${precipChance}% बारिश की संभावना है और बाहर ${temp}°C है। इनडोर ट्रेनिंग बेहतर रहेगी। बारिश रुकने के बाद ${wx.sunset} से पहले बाहर जाएं।`
          : `${precipChance}% rain chance today with ${temp}°C outside. Prefer indoor training. If rain clears, the window before ${wx.sunset} is good.`;
      return hi
        ? `मौसम ठीक है - ${temp}°C, AQI ${aqi} और ${humidity}% आर्द्रता। ${uv >= 7 ? "UV " + uv + " है, सनस्क्रीन लगाएं।" : "UV स्तर सुरक्षित है।"} सुबह जल्दी दौड़ना सबसे अच्छा रहेगा।`
        : `Good conditions - ${temp}°C, AQI ${aqi}, ${humidity}% humidity. ${uv >= 7 ? "UV is " + uv + ", apply sunscreen." : "UV is safe."} Early morning remains the best slot.`;
    }

    case "health": {
      const aqiMsg = aqi < 50 ? (hi ? "हवा साफ है" : "air is clean") : aqi < 100 ? (hi ? "हवा मध्यम है" : "air quality is moderate") : (hi ? "AQI खराब है, बाहर कम जाएं" : "AQI is poor, limit outdoor exposure");
      return hi
        ? `अभी AQI ${aqi} (${aqiMsg}), UV ${uv} और आर्द्रता ${humidity}%। ${isHighUV ? "दोपहर 11 बजे से 3 बजे तक धूप से बचें।" : ""} ${!isGoodAir ? "N95 मास्क पहनें।" : "बाहर जाना सुरक्षित है।"}`
        : `Current AQI is ${aqi} (${aqiMsg}), UV ${uv}, humidity ${humidity}%. ${isHighUV ? "Avoid direct sun between 11 AM and 3 PM." : ""} ${!isGoodAir ? "Wear an N95 mask outdoors." : "Safe to go outside."}`;
    }

    case "beach": {
      if (isRainy)
        return hi
          ? `${precipChance}% बारिश की संभावना - समुद्र तट पर जाने का सही समय नहीं। ${temp}°C तापमान है।`
          : `${precipChance}% rain chance - not ideal for the beach today. Temp is ${temp}°C, wait for a clearer day.`;
      return hi
        ? `तापमान ${temp}°C (महसूस ${feels}°C) और ${humidity}% आर्द्रता के साथ समुद्र तट ठीक है। UV ${uv} है - SPF 50 लगाएं।`
        : `Temp ${temp}°C (feels ${feels}°C) with ${humidity}% humidity - decent beach conditions. UV is ${uv}, apply SPF 50 and reapply every 2 hours.`;
    }

    case "traveler": {
      if (isRainy)
        return hi
          ? `आज ${precipChance}% बारिश की संभावना है। रेनकोट ज़रूर साथ रखें। ${temp}°C तापमान के लिए परतदार कपड़े पैक करें।`
          : `${precipChance}% rain chance today - pack a raincoat. Layer up for ${temp}°C conditions and check your destination's forecast 3 days ahead.`;
      return hi
        ? `${temp}°C तापमान और ${isGoodAir ? "साफ हवा" : "AQI " + aqi} के साथ यात्रा के लिए मौसम ठीक है। ${isHighUV ? "UV " + uv + " है, धूप से बचें।" : ""}`
        : `${temp}°C with ${isGoodAir ? "clean air" : "AQI " + aqi} - good travel conditions. ${isHighUV ? "UV is " + uv + ", cover up during midday." : "Comfortable for outdoor sightseeing."}`;
    }

    case "parent": {
      if (isRainy)
        return hi
          ? `स्कूल जाने के समय ${precipChance}% बारिश की संभावना। छाता और वाटरप्रूफ बैग ज़रूर दें। ${temp}°C तापमान है।`
          : `${precipChance}% rain chance during school hours. Pack an umbrella and waterproof bag. Temp is ${temp}°C - a light layer helps.`;
      return hi
        ? `${temp}°C और AQI ${aqi} के साथ स्कूल रूट सुरक्षित है। ${isHighUV ? "UV " + uv + " है - हैट और पानी की बोतल दें।" : "मौसम ठीक है।"}`
        : `${temp}°C and AQI ${aqi} - school commute is safe. ${isHighUV ? "UV is " + uv + " - send a hat and water bottle." : "No special precautions needed today."}`;
    }

    case "agri": {
      if (isRainy)
        return hi
          ? `${precipChance}% बारिश की संभावना के साथ आज सिंचाई टालें। ${humidity}% आर्द्रता और ${temp}°C तापमान है - फसलों के लिए पर्याप्त नमी मिलेगी।`
          : `${precipChance}% rain expected - delay irrigation today. Humidity is ${humidity}% and temp ${temp}°C, soil should get adequate moisture naturally.`;
      return hi
        ? `अभी ${humidity}% आर्द्रता और ${temp}°C तापमान - ${humidity < 40 ? "सिंचाई की ज़रूरत है।" : "मिट्टी में पर्याप्त नमी है।"} AQI ${aqi} सामान्य है।`
        : `Humidity ${humidity}%, temp ${temp}°C - ${humidity < 40 ? "fields may need irrigation." : "soil moisture looks adequate."} AQI is ${aqi}. Monitor for next 24 hours.`;
    }

    case "commuter": {
      if (condition === "fog")
        return hi
          ? `घने कोहरे की वजह से दृश्यता कम है। 20 मिनट जल्दी निकलें और फॉग लैंप इस्तेमाल करें। ${temp}°C तापमान है।`
          : `Dense fog with low visibility. Leave 20 minutes early, use fog lamps, and keep speed low. Temp is ${temp}°C.`;
      if (isRainy)
        return hi
          ? `${precipChance}% बारिश की संभावना - सड़कें गीली होंगी। यातायात में 15-30 मिनट की देरी हो सकती है। मेट्रो बेहतर विकल्प है।`
          : `${precipChance}% rain chance - expect wet roads and 15-30 min delays. Metro or alternate route recommended. Temp ${temp}°C.`;
      return hi
        ? `${temp}°C और ${condition === "sunny" ? "साफ" : "ठीक"} मौसम के साथ यातायात सामान्य रहेगा। ${isHighUV ? "UV " + uv + " है, धूप का चश्मा रखें।" : ""}`
        : `${temp}°C with ${condition === "sunny" ? "clear" : "decent"} skies - normal commute conditions expected. ${isHighUV ? "UV " + uv + ", keep sunglasses handy." : ""}`;
    }

    case "event": {
      if (isRainy)
        return hi
          ? `आज ${precipChance}% बारिश की संभावना है - आउटडोर इवेंट के लिए इनडोर बैकअप प्लान रखें। ${temp}°C तापमान है।`
          : `${precipChance}% rain chance today - have an indoor backup for outdoor events. Temp ${temp}°C, conditions may be uncomfortable.`;
      const comfort = feels < 30 && aqi < 100 && !isHighUV;
      return hi
        ? `${temp}°C (महसूस ${feels}°C), AQI ${aqi} - आउटडोर इवेंट के लिए मौसम ${comfort ? "अच्छा" : "ठीक"} है। ${isHighUV ? "UV " + uv + " है, शेड की व्यवस्था करें।" : "सूर्यास्त " + wx.sunset + " पर होगा।"}`
        : `${temp}°C (feels ${feels}°C), AQI ${aqi} - ${comfort ? "excellent" : "acceptable"} conditions for an outdoor event. ${isHighUV ? "UV " + uv + ", provide shaded seating." : "Sunset at " + wx.sunset + " for golden-hour timing."}`;
    }
  }
}
