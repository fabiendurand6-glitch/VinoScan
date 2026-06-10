import { extractJSON } from '../utils/wineHelpers';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

export const callGemini = async (prompt, b64Data = null) => {
  const model = 'gemini-3.1-flash-lite'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt }];
  
  if (b64Data) {
    if (Array.isArray(b64Data)) {
      b64Data.forEach(img => parts.push({ inlineData: { mimeType: "image/jpeg", data: img } }));
    } else {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: b64Data } });
    }
  }
  
  const payload = { contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json" } };
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Erreur serveur (${response.status}) : ${errData.error?.message || 'Inconnue'}`);
  }
  return await response.json();
};

export const analyzeSensoryDNA = async (notes) => {
  if (!notes || notes.length < 10) return null;
  try {
    const prompt = `Analyse ces notes de dégustation : "${notes}". Évalue sur une échelle de 1 à 5 les dimensions suivantes. Réponds UNIQUEMENT en JSON pur : {"tannins": 0, "acidite": 0, "corps": 0, "fruit": 0, "boise": 0}`;
    const res = await callGemini(prompt);
    const data = extractJSON(res.candidates[0].content.parts[0].text);
    return [
      { subject: 'Tannins', A: data.tannins || 1, fullMark: 5 }, { subject: 'Acidité', A: data.acidite || 1, fullMark: 5 },
      { subject: 'Corps', A: data.corps || 1, fullMark: 5 }, { subject: 'Fruit', A: data.fruit || 1, fullMark: 5 },
      { subject: 'Boisé', A: data.boise || 1, fullMark: 5 },
    ];
  } catch(e) { return null; }
};